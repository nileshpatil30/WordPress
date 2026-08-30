import type { PricingSource } from "@/lib/types";
import type { ConfidenceBreakdown, ConfidenceResult, GeoLevel, PriceTriple } from "./types";
import type { PriceLookupHit } from "./geo";

const GEO_POINTS: Record<GeoLevel, number> = {
  zip: 32, city: 27, metro: 21, state: 14, country: 9, global: 5,
};

const GEO_LABEL: Record<GeoLevel, string> = {
  zip: "ZIP-level pricing data available",
  city: "City-level pricing data available",
  metro: "Metro-level pricing data available",
  state: "State-level data only",
  country: "National data only",
  global: "Global fallback only",
};

export interface ConfidenceInput {
  bestLevel: GeoLevel;
  /** Months since the newest pricing record's effective date. */
  dataAgeMonths: number;
  /** 0-1: share of the optional, materially useful inputs the user supplied. */
  inputCompleteness: number;
  /** Which inputs are still assumed rather than supplied. */
  missingInputs: string[];
  hits: PriceLookupHit[];
  sources: PricingSource[];
  range: PriceTriple;
  geoIsFallback: boolean;
}

/**
 * A confidence score that can go down.
 *
 * The hard rule: if any price feeding the estimate is sample or internally
 * modelled data, the score is capped. We would rather show 55/100 with an
 * explanation than 90/100 built on numbers nobody has verified.
 */
export function scoreConfidence(input: ConfidenceInput): ConfidenceResult {
  const breakdown: ConfidenceBreakdown[] = [];
  const caveats: string[] = [];

  // 1. Geographic granularity
  const geoEarned = GEO_POINTS[input.bestLevel];
  breakdown.push({
    key: "geo", label: "Local data coverage", earned: geoEarned, max: 32,
    detail: input.geoIsFallback
      ? "This ZIP code is not yet in our geography table, so the estimate uses national figures."
      : GEO_LABEL[input.bestLevel],
  });
  if (input.geoIsFallback) {
    caveats.push("We do not have this ZIP code mapped yet, so local labour, permit and disposal costs are national averages.");
  }

  // 2. Recency
  const m = input.dataAgeMonths;
  const recency = m <= 3 ? 20 : m <= 6 ? 17 : m <= 12 ? 12 : m <= 24 ? 6 : 2;
  breakdown.push({
    key: "recency", label: "Data recency", earned: recency, max: 20,
    detail: m <= 1 ? "Pricing data is current this month."
      : `Newest pricing data is about ${Math.round(m)} month${Math.round(m) === 1 ? "" : "s"} old.`,
  });
  if (m > 12) caveats.push("The underlying pricing data is more than a year old. Material costs move faster than that.");

  // 3. How much the user actually told us
  const completeness = Math.round(input.inputCompleteness * 22);
  breakdown.push({
    key: "inputs", label: "Project detail supplied", earned: completeness, max: 22,
    detail: input.missingInputs.length
      ? `Still assumed: ${input.missingInputs.slice(0, 4).join(", ")}${input.missingInputs.length > 4 ? "..." : ""}.`
      : "You supplied every input the model uses.",
  });

  // 4. Source quality
  const usedSourceIds = new Set(input.hits.map((h) => h.record.sourceId));
  const used = input.sources.filter((s) => usedSourceIds.has(s.id));
  const avgWeight = used.length
    ? used.reduce((a, s) => a + s.reliabilityWeight, 0) / used.length
    : 0.3;
  const sourceEarned = Math.round(avgWeight * 16);
  breakdown.push({
    key: "sources", label: "Source quality", earned: sourceEarned, max: 16,
    detail: used.length
      ? `Based on ${used.length} source${used.length === 1 ? "" : "s"}: ${used.map((s) => s.name).join(", ")}.`
      : "No source metadata attached to the prices used.",
  });

  // 5. How tight the resulting range is
  const spreadPct = input.range.typical > 0
    ? (input.range.high - input.range.low) / input.range.typical
    : 1;
  const spreadEarned = spreadPct <= 0.2 ? 10 : spreadPct <= 0.32 ? 8 : spreadPct <= 0.45 ? 6 : spreadPct <= 0.6 ? 3 : 1;
  breakdown.push({
    key: "spread", label: "Range tightness", earned: spreadEarned, max: 10,
    detail: `The modelled range spans about ${Math.round(spreadPct * 100)}% of the typical price.`,
  });

  let score = breakdown.reduce((a, b) => a + b.earned, 0);

  // The cap. Non-negotiable while sample data is in the mix.
  const hasUnverified = input.hits.some(
    (h) => h.record.dataStatus === "sample" || h.record.dataStatus === "modeled");
  const hasSample = input.hits.some((h) => h.record.dataStatus === "sample");
  if (hasSample) {
    if (score > 60) score = 60;
    caveats.push("Some prices in this estimate are sample data shipped for development, not observed market pricing. The score is capped at 60 until verified sources are connected.");
  } else if (hasUnverified && score > 78) {
    score = 78;
    caveats.push("Part of this estimate is modelled rather than directly observed, so the score is capped at 78.");
  }

  const band: ConfidenceResult["band"] =
    score >= 80 ? "High" : score >= 60 ? "Moderate" : score >= 40 ? "Limited" : "Indicative";

  return { score: Math.max(0, Math.min(100, Math.round(score))), band, breakdown, caveats };
}
