import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { bad, id, isError, runEstimate, safeSessionId } from "@/lib/api";
import { compareQuotes, type QuoteInput } from "@/lib/engine/quote";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "quoteCompare");
  if (limited) return limited;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad("Invalid JSON body"); }

  const raw = Array.isArray(body.quotes) ? body.quotes : [];
  if (raw.length < 2) return bad("Add at least two quotes to compare", 422);
  if (raw.length > 6) return bad("Compare up to six quotes at a time", 422);

  const quotes: QuoteInput[] = raw.map((q, i) => {
    const item = q as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : `q${i}`,
      label: typeof item.label === "string" && item.label.trim()
        ? item.label.trim().slice(0, 60)
        : `Contractor ${String.fromCharCode(65 + i)}`,
      totalPrice: Number(item.totalPrice) || 0,
      materialSlug: typeof item.materialSlug === "string" ? item.materialSlug : undefined,
      warrantyWorkmanshipYears: Number.isFinite(Number(item.warrantyWorkmanshipYears))
        ? Number(item.warrantyWorkmanshipYears) : undefined,
      warrantyMaterialYears: Number.isFinite(Number(item.warrantyMaterialYears))
        ? Number(item.warrantyMaterialYears) : undefined,
      scope: (item.scope && typeof item.scope === "object" ? item.scope : {}) as QuoteInput["scope"],
      notes: typeof item.notes === "string" ? item.notes.slice(0, 500) : undefined,
    };
  });

  if (quotes.some((q) => q.totalPrice <= 0)) return bad("Every quote needs a total price", 422);

  const result = await runEstimate(body);
  if (isError(result)) return bad(result.error, result.status);
  const { estimate, parsedInput } = result;

  const comparison = compareQuotes(quotes, estimate);

  const store = await getStore();
  const setId = id("qs");
  await store.saveQuoteSet({
    id: setId,
    sessionId: safeSessionId(body.sessionId),
    serviceId: estimate.serviceId,
    zip: String(parsedInput.zip),
    createdAt: new Date().toISOString(),
    quotes: quotes.map((q) => ({
      id: id("cq"), setId, label: q.label, totalPrice: q.totalPrice,
      warrantyWorkmanshipYears: q.warrantyWorkmanshipYears,
      warrantyMaterialYears: q.warrantyMaterialYears,
      scope: q.scope as Record<string, boolean>, notes: q.notes,
    })),
  });

  return NextResponse.json({ estimate, comparison });
}
