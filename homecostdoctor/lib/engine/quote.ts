import type { EstimateResult, PriceTriple } from "./types";

export type QuoteVerdict =
  | "well-below" | "below" | "within" | "above" | "well-above";

export interface QuoteAssessment {
  quotedPrice: number;
  range: PriceTriple;
  verdict: QuoteVerdict;
  headline: string;
  summary: string;
  /** Signed % difference from the modelled typical price. */
  deltaVsTypicalPct: number;
  /** Where the quote sits on the modelled range, 0 = low, 1 = high. */
  positionInRange: number;
  /** Things that plausibly explain a gap. Never accusations. */
  considerations: string[];
  disclaimer: string;
}

const DISCLAIMER =
  "This is a modelled comparison, not a professional inspection or a binding quote. " +
  "It cannot see your roof, your deck condition, your site, or the specification behind the contractor's number. " +
  "A quote outside our range is not evidence of anything by itself - it is a prompt to ask better questions.";

/**
 * Compare a real contractor quote against the modelled range.
 *
 * Deliberate language rules, applied throughout:
 *   - never assert that a contractor is overcharging or underbidding
 *   - always describe the model, not the contractor ("higher than our modelled
 *     range", never "too expensive")
 *   - a low quote is treated as a risk signal, not a win
 */
export function assessQuote(quotedPrice: number, estimate: EstimateResult): QuoteAssessment {
  const { range } = estimate;
  const verdict: QuoteVerdict =
    quotedPrice < range.low * 0.85 ? "well-below"
      : quotedPrice < range.low ? "below"
        : quotedPrice <= range.high ? "within"
          : quotedPrice <= range.high * 1.15 ? "above"
            : "well-above";

  const deltaVsTypicalPct = ((quotedPrice - range.typical) / range.typical) * 100;
  const positionInRange = (quotedPrice - range.low) / Math.max(1, range.high - range.low);

  const headline = {
    "well-below": "Well below our modelled range",
    below: "Below our modelled range",
    within: "Within our modelled range",
    above: "Above our modelled range",
    "well-above": "Well above our modelled range",
  }[verdict];

  const summary = {
    "well-below":
      "A quote this far below the modelled cost of the work usually means the scope is different, not that you have found a bargain. Before anything else, check what is excluded: tear-off, disposal, permit, decking allowance, flashing and warranty are the usual omissions.",
    below:
      "Slightly below our modelled range. That is entirely normal for an efficient contractor in a soft market, but it is worth confirming the scope matches the other quotes line for line.",
    within:
      "This sits inside the range our model expects for a project with these characteristics. That does not make it the right quote for you - scope, warranty and the contractor themselves still matter more than the number.",
    above:
      "Somewhat above our modelled range. There are many legitimate reasons for that, listed below. Ask the contractor which of them apply before drawing any conclusion.",
    "well-above":
      "Materially above our modelled range. That can be entirely justified - premium materials, a difficult roof, or work our model does not know about - but you should be able to point to a specific reason. Ask for a line-item breakdown.",
  }[verdict];

  const considerations = buildConsiderations(verdict, estimate);

  return {
    quotedPrice, range, verdict, headline, summary,
    deltaVsTypicalPct: Number(deltaVsTypicalPct.toFixed(1)),
    positionInRange: Number(Math.max(-0.5, Math.min(1.5, positionInRange)).toFixed(3)),
    considerations, disclaimer: DISCLAIMER,
  };
}

function buildConsiderations(verdict: QuoteVerdict, e: EstimateResult): string[] {
  const out: string[] = [];
  const d = e.derived;

  if (verdict === "above" || verdict === "well-above") {
    out.push("The roof may be larger than the figure we modelled. Roof area is the single biggest driver, and satellite measurement and on-site measurement often differ on cut-up roofs.");
    out.push("A higher product grade or a full manufacturer system warranty adds cost that a like-for-like comparison will not show.");
    out.push("Deck replacement beyond the allowance we assumed. We modelled a small allowance; extensive rot is a real and common overrun.");
    out.push("Steeper pitch, more roof planes, or harder site access than we assumed - all of which raise crew hours rather than materials.");
    out.push("Additional work bundled in: gutters, fascia, ventilation upgrades, skylight replacement, or code upgrades triggered by the permit.");
    if (e.geo.isFallback) {
      out.push("We do not have local data for this ZIP code, so the estimate uses national costs. Local labour and disposal costs may simply be higher than the national average.");
    }
  } else if (verdict === "below" || verdict === "well-below") {
    out.push("Confirm tear-off and disposal are included. Leaving out the tear-off is the most common way a quote becomes cheaper than the work.");
    out.push("Confirm the permit is included and that the contractor - not you - is pulling it.");
    out.push("Confirm the decking allowance and the per-sheet price beyond it, in writing.");
    out.push("Check the warranty: a shorter workmanship warranty is a genuine cost saving for the contractor and a genuine risk transfer to you.");
    out.push("Verify licensing and insurance directly with the issuing authority and insurer, not from a number on the proposal.");
  } else {
    out.push("Compare the line items, not the totals. Two quotes at the same price can carry very different scope.");
    out.push("Confirm the decking allowance, the permit and the disposal are all explicitly stated.");
  }

  out.push(`For reference, our model assumed ${d.squares} roofing squares (${Number(d.roofSurfaceSqft).toLocaleString()} sq ft of roof surface) and about ${d.laborHours} crew hours.`);
  return out;
}

// ---------------------------------------------------------------------------
// Multi-quote comparison
// ---------------------------------------------------------------------------

export const SCOPE_ITEMS = [
  { key: "tearOff", label: "Tear-off of the existing roof", lineKeys: ["labor.tearoff"], weight: 3 },
  { key: "disposal", label: "Debris removal and disposal", lineKeys: ["equipment.container", "disposal.tipping"], weight: 2 },
  { key: "permit", label: "Permit pulled by the contractor", lineKeys: ["permit.allowance"], weight: 2 },
  { key: "underlayment", label: "New underlayment", lineKeys: ["material.underlayment"], weight: 3 },
  { key: "flashing", label: "New flashing", lineKeys: ["material.flashing"], weight: 2 },
  { key: "ventilation", label: "Ventilation work", lineKeys: ["material.ventilation"], weight: 1 },
  { key: "deckAllowance", label: "Stated decking allowance", lineKeys: ["material.decking"], weight: 2 },
  { key: "cleanup", label: "Site clean-up and magnet sweep", lineKeys: [], weight: 1 },
  { key: "licensedInsured", label: "Licence and insurance evidenced", lineKeys: [], weight: 3 },
] as const;

export type ScopeKey = (typeof SCOPE_ITEMS)[number]["key"];

export interface QuoteInput {
  id: string;
  label: string;
  totalPrice: number;
  materialSlug?: string;
  warrantyWorkmanshipYears?: number;
  warrantyMaterialYears?: number;
  scope: Partial<Record<ScopeKey, boolean>>;
  notes?: string;
}

export interface ComparedQuote extends QuoteInput {
  /** Quote price plus our modelled cost of everything it leaves out. */
  adjustedComparable: number;
  missingScope: { key: ScopeKey; label: string; estimatedCost: number | null }[];
  scopeCoveragePct: number;
  vsRange: QuoteVerdict;
  flags: { level: "info" | "caution"; text: string }[];
  isLowestSticker: boolean;
  isLowestAdjusted: boolean;
  isMostComplete: boolean;
}

export interface ComparisonResult {
  quotes: ComparedQuote[];
  range: PriceTriple;
  spreadPct: number;
  /** Deliberately not called "best" - the reader decides. */
  narrative: string[];
  disclaimer: string;
}

/**
 * Normalise quotes to a like-for-like basis before comparing them.
 *
 * The cheapest sticker price is never presented as the winner. What we surface
 * is the adjusted comparable: the quote plus our modelled cost of the work it
 * excludes. A quote that is cheapest because it omits the tear-off stops
 * looking cheapest the moment the tear-off is priced back in.
 */
export function compareQuotes(quotes: QuoteInput[], estimate: EstimateResult): ComparisonResult {
  const costOf = (lineKeys: readonly string[]) => {
    if (!lineKeys.length) return null;
    const items = estimate.lineItems.filter((l) => lineKeys.includes(l.key));
    if (!items.length) return null;
    // Include this component's share of overhead so the adjustment is
    // comparable with a retail quote, not with our internal direct cost.
    const ohRatio = estimate.range.typical / Math.max(1, estimate.directCost.typical);
    return Math.round(items.reduce((a, l) => a + l.typical, 0) * ohRatio);
  };

  const scored = quotes.map((q) => {
    const missing = SCOPE_ITEMS
      .filter((s) => q.scope[s.key] !== true)
      .map((s) => ({ key: s.key, label: s.label, estimatedCost: costOf(s.lineKeys) }));

    const adjustedComparable = q.totalPrice
      + missing.reduce((a, m) => a + (m.estimatedCost ?? 0), 0);

    const totalWeight = SCOPE_ITEMS.reduce((a, s) => a + s.weight, 0);
    const covered = SCOPE_ITEMS.reduce((a, s) => a + (q.scope[s.key] === true ? s.weight : 0), 0);

    const flags: ComparedQuote["flags"] = [];
    if (q.scope.licensedInsured !== true) {
      flags.push({ level: "caution", text: "Licence and insurance not confirmed. Verify both directly with the issuing authority and the insurer before signing." });
    }
    if (q.scope.permit !== true) {
      flags.push({ level: "caution", text: "No permit included. An unpermitted re-roof can cause problems at resale and at claim time." });
    }
    if (q.scope.deckAllowance !== true) {
      flags.push({ level: "caution", text: "No stated decking allowance. This is the most common source of mid-job change orders." });
    }
    if (q.totalPrice < estimate.range.low * 0.8) {
      flags.push({ level: "caution", text: "More than 20% below our modelled range. Treat this as a scope question before treating it as a saving." });
    }
    if ((q.warrantyWorkmanshipYears ?? 0) >= 10) {
      flags.push({ level: "info", text: `${q.warrantyWorkmanshipYears}-year workmanship warranty, which is above typical.` });
    } else if (q.warrantyWorkmanshipYears != null && q.warrantyWorkmanshipYears < 5) {
      flags.push({ level: "caution", text: `Only a ${q.warrantyWorkmanshipYears}-year workmanship warranty. Labour defects usually appear later than that.` });
    }

    return {
      ...q,
      adjustedComparable,
      missingScope: missing,
      scopeCoveragePct: Math.round((covered / totalWeight) * 100),
      vsRange: assessQuote(q.totalPrice, estimate).verdict,
      flags,
      isLowestSticker: false, isLowestAdjusted: false, isMostComplete: false,
    } as ComparedQuote;
  });

  if (scored.length) {
    const minSticker = Math.min(...scored.map((q) => q.totalPrice));
    const minAdjusted = Math.min(...scored.map((q) => q.adjustedComparable));
    const maxScope = Math.max(...scored.map((q) => q.scopeCoveragePct));
    for (const q of scored) {
      q.isLowestSticker = q.totalPrice === minSticker;
      q.isLowestAdjusted = q.adjustedComparable === minAdjusted;
      q.isMostComplete = q.scopeCoveragePct === maxScope;
    }
  }

  const prices = scored.map((q) => q.totalPrice);
  const spreadPct = prices.length > 1
    ? ((Math.max(...prices) - Math.min(...prices)) / Math.min(...prices)) * 100
    : 0;

  const narrative: string[] = [];
  const cheapest = scored.find((q) => q.isLowestSticker);
  const cheapestAdjusted = scored.find((q) => q.isLowestAdjusted);
  if (cheapest && cheapestAdjusted && cheapest.id !== cheapestAdjusted.id) {
    narrative.push(`${cheapest.label} has the lowest sticker price, but once the work it excludes is priced back in, ${cheapestAdjusted.label} is the lower total cost of getting the same job done.`);
  } else if (cheapest) {
    narrative.push(`${cheapest.label} is lowest both on sticker price and after adjusting for scope differences.`);
  }
  if (spreadPct > 40) {
    narrative.push(`These quotes differ by ${Math.round(spreadPct)}%. A spread that wide almost always means they are not quoting the same job. Compare the scope table below before comparing the totals.`);
  } else if (spreadPct > 0) {
    narrative.push(`These quotes differ by ${Math.round(spreadPct)}%, which is a normal spread for the same scope of work.`);
  }
  const mostComplete = scored.find((q) => q.isMostComplete);
  if (mostComplete && !mostComplete.isLowestSticker) {
    narrative.push(`${mostComplete.label} has the most complete stated scope. That is not the same as being the best choice, but it is the quote you can compare the others against.`);
  }

  return {
    quotes: scored, range: estimate.range, spreadPct: Number(spreadPct.toFixed(1)),
    narrative,
    disclaimer:
      "Scope adjustments use our modelled cost of each missing item, not the contractor's price for it. They are a comparison aid, not a substitute for asking each contractor to quote the same written scope.",
  };
}
