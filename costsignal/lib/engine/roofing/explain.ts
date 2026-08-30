import type { EngineContext, EstimateResult } from "../types";
import { estimateRoofing } from "./model";
import type { RoofingInput } from "./schema";

export interface VarianceCandidate {
  /** What single change was tested. */
  change: string;
  field: keyof RoofingInput;
  detail: string;
  newRange: { low: number; typical: number; high: number };
  /** Does this single change make the quote fall inside the modelled range? */
  explainsQuote: boolean;
  /** Signed % move in the typical price caused by this change alone. */
  impactPct: number;
}

export interface VarianceExplanation {
  quotedPrice: number;
  baseRange: { low: number; typical: number; high: number };
  /** Changes that on their own would account for the gap. */
  explains: VarianceCandidate[];
  /** The biggest levers, whether or not they close the gap. */
  sensitivities: VarianceCandidate[];
  conclusion: string;
}

/**
 * Sensitivity analysis, not hand-waving.
 *
 * When a quote sits outside the modelled range, the useful question is not "is
 * it fair" but "what would have to be true for it to be fair". We re-run the
 * model changing exactly one input at a time and report which single change
 * puts the quote inside the range. That converts a verdict into a list of
 * specific questions the homeowner can put to the contractor.
 */
export function explainVariance(
  input: RoofingInput, ctx: EngineContext, quotedPrice: number, base?: EstimateResult,
): VarianceExplanation {
  const baseline = base ?? estimateRoofing(input, ctx, ctx.sources ?? []);
  const baseRange = baseline.range;

  const area = input.areaMode === "roof"
    ? (input.roofAreaSqft ?? 2000)
    : (input.houseSqft ?? 2000);

  const variants: { change: string; field: keyof RoofingInput; detail: string; patch: Partial<RoofingInput> }[] = [
    {
      change: "The roof is 25% larger than modelled",
      field: input.areaMode === "roof" ? "roofAreaSqft" : "houseSqft",
      detail: "Measured roof area is the single biggest driver. Aerial measurement and on-site measurement routinely differ on cut-up roofs. Ask each contractor for their measured square count.",
      patch: input.areaMode === "roof"
        ? { roofAreaSqft: Math.round(area * 1.25) }
        : { houseSqft: Math.round(area * 1.25) },
    },
    {
      change: "The roof is 20% smaller than modelled",
      field: input.areaMode === "roof" ? "roofAreaSqft" : "houseSqft",
      detail: "If the contractor measured less roof than we assumed, the price falls accordingly.",
      patch: input.areaMode === "roof"
        ? { roofAreaSqft: Math.round(area * 0.8) }
        : { houseSqft: Math.round(area * 0.8) },
    },
    {
      change: "The roofline is more complex than modelled",
      field: "complexity",
      detail: "More planes, valleys and dormers mean more waste and far more labour hours. Count the roof planes from the ground.",
      patch: { complexity: nextComplexity(input.complexity) },
    },
    {
      change: "The pitch is steeper than modelled",
      field: "pitch",
      detail: "Steep roofs need staging and fall protection, which is the largest single labour multiplier on a residential roof.",
      patch: { pitch: nextPitch(input.pitch) },
    },
    {
      change: "There is a second existing layer to remove",
      field: "existingLayers",
      detail: "Two layers roughly doubles tear-off labour and disposal tonnage. Ask the contractor how many layers they found.",
      patch: { existingLayers: 2 },
    },
    {
      change: "A premium grade of the same material was quoted",
      field: "quality",
      detail: "Product grade within a family varies substantially. Ask for the specific product name and weight, not just 'architectural shingle'.",
      patch: { quality: "premium" },
    },
    {
      change: "A full manufacturer system warranty is included",
      field: "warranty",
      detail: "System warranties require a certified installer and a complete single-brand assembly, which costs more than a mixed-brand roof.",
      patch: { warranty: "system" },
    },
    {
      change: "Site access is difficult",
      field: "access",
      detail: "Hillside lots, narrow streets and no staging space add real crew hours that a satellite-measured quote will not have priced.",
      patch: { access: "difficult" },
    },
    {
      change: "Significant decking replacement is included",
      field: "deckSheets",
      detail: "We modelled a small allowance. Extensive rot or old skip sheathing can add a full deck of new sheathing.",
      patch: { deckSheets: Math.max(12, input.deckSheets + 10) },
    },
    {
      change: "Full flashing replacement and self-adhered underlayment",
      field: "flashing",
      detail: "A complete flashing rebuild plus a fully self-adhered secondary water barrier is a materially better roof, and costs more.",
      patch: { flashing: "full-replacement", underlayment: "peel-stick" },
    },
  ];

  const candidates: VarianceCandidate[] = variants.map((v) => {
    const r = estimateRoofing({ ...input, ...v.patch }, ctx, ctx.sources ?? []);
    return {
      change: v.change,
      field: v.field,
      detail: v.detail,
      newRange: r.range,
      explainsQuote: quotedPrice >= r.range.low && quotedPrice <= r.range.high,
      impactPct: Number((((r.range.typical - baseRange.typical) / baseRange.typical) * 100).toFixed(1)),
    };
  });

  const quoteIsHigh = quotedPrice > baseRange.high;
  const quoteIsLow = quotedPrice < baseRange.low;

  const explains = candidates
    .filter((c) => c.explainsQuote)
    .filter((c) => (quoteIsHigh ? c.impactPct > 0 : quoteIsLow ? c.impactPct < 0 : true))
    .sort((a, b) => Math.abs(a.impactPct) - Math.abs(b.impactPct));

  const sensitivities = [...candidates]
    .sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct))
    .slice(0, 5);

  let conclusion: string;
  if (!quoteIsHigh && !quoteIsLow) {
    conclusion = "The quote already sits inside the modelled range, so no single assumption needs to change to account for it.";
  } else if (explains.length) {
    conclusion = `Any one of these ${explains.length} change${explains.length === 1 ? "" : "s"} would, on its own, bring our modelled range to include this quote. Each one is a specific question to put to the contractor rather than a conclusion about them.`;
  } else {
    conclusion = quoteIsHigh
      ? "No single assumption we tested accounts for the whole gap. That usually means either several factors combine, or the quote includes work our model does not know about. Ask for a line-item breakdown."
      : "No single assumption we tested accounts for the gap. A quote this far below the modelled cost of the work is most often a scope difference. Ask what is excluded, in writing.";
  }

  return { quotedPrice, baseRange, explains, sensitivities, conclusion };
}

function nextComplexity(c: RoofingInput["complexity"]): RoofingInput["complexity"] {
  const order: RoofingInput["complexity"][] = ["simple", "moderate", "complex", "very-complex"];
  return order[Math.min(order.length - 1, order.indexOf(c) + 1)];
}

function nextPitch(p: RoofingInput["pitch"]): RoofingInput["pitch"] {
  const order: RoofingInput["pitch"][] = ["flat", "low", "moderate", "steep", "very-steep"];
  return order[Math.min(order.length - 1, order.indexOf(p) + 1)];
}
