import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { bad, id, isError, runEstimate, safeSessionId } from "@/lib/api";
import { assessQuote } from "@/lib/engine/quote";
import { explainVariance } from "@/lib/engine/roofing/explain";
import type { RoofingInput } from "@/lib/engine/roofing/schema";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "quoteCheck");
  if (limited) return limited;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad("Invalid JSON body"); }

  const quotedPrice = Number(body.quotedPrice);
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
    return bad("Enter the contractor's quoted total as a positive number", 422);
  }
  if (quotedPrice > 5_000_000) return bad("That quote looks out of range for a residential roof", 422);

  const result = await runEstimate(body);
  if (isError(result)) return bad(result.error, result.status);
  const { estimate, ctx, parsedInput } = result;

  const assessment = assessQuote(quotedPrice, estimate);

  // Sensitivity analysis: which single assumption, if wrong, would account for
  // the gap. Roofing-specific for now; other engines opt in as they are added.
  const variance = estimate.serviceSlug === "roofing"
    ? explainVariance(parsedInput as unknown as RoofingInput, ctx, quotedPrice, estimate)
    : null;

  const store = await getStore();
  await store.saveQuoteCheck({
    id: id("qc"),
    sessionId: safeSessionId(body.sessionId),
    serviceId: estimate.serviceId,
    zip: String(parsedInput.zip),
    quotedPrice,
    verdict: assessment.verdict,
    deltaPct: assessment.deltaVsTypicalPct,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ estimate, assessment, variance });
}
