import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { bad, id, isError, runEstimate, safeSessionId } from "@/lib/api";
import { assessQuote } from "@/lib/engine/quote";
import { buildQuestions, type ScopeState } from "@/lib/engine/questions";
import type { ScopeKey } from "@/lib/engine/quote";
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

  // Questions are generated from the gaps in this specific quote. They stay
  // useful even when the range itself is uncertain: "your quote does not
  // mention the decking allowance" is true regardless of what the range says.
  const extraction = (body.extraction ?? {}) as Record<string, unknown>;
  const questions = buildQuestions({
    estimate,
    scope: extraction.scope as Partial<Record<ScopeKey, ScopeState>> | undefined,
    exclusions: Array.isArray(extraction.exclusions)
      ? (extraction.exclusions as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 10)
      : undefined,
    redFlags: Array.isArray(extraction.redFlags)
      ? (extraction.redFlags as { issue: string; quotedText: string }[]).slice(0, 5)
      : undefined,
    warrantyWorkmanshipYears: numberOrNull(extraction.warrantyWorkmanshipYears),
    deckSheetsIncluded: numberOrNull(extraction.deckSheetsIncluded),
    measuredSquares: numberOrNull(extraction.measuredSquares),
    verdict: assessment.verdict,
  });

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

  return NextResponse.json({ estimate, assessment, variance, questions });
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
