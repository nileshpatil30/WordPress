import { SCOPE_ITEMS, type QuoteVerdict, type ScopeKey } from "./quote";
import type { EstimateResult } from "./types";

export type QuestionPriority = "critical" | "important" | "worth-asking";

export interface PersonalQuestion {
  id: string;
  question: string;
  /** Why it matters for *this* quote, not in general. */
  why: string;
  priority: QuestionPriority;
  /** What in the document (or its silence) produced this question. */
  trigger: string;
  /** Modelled money at stake, where we can compute it. */
  amountAtStake?: number;
  /**
   * Sorts above the money-weighted questions in the same band. A contractor
   * offering to waive a deductible outranks a $500 flashing question even
   * though it carries no figure of its own.
   */
  leadsBand?: boolean;
}

/** Tri-state as returned by extraction. */
export type ScopeState = "included" | "excluded" | "not_stated";

export interface QuestionInput {
  estimate: EstimateResult;
  /** From an uploaded quote. Omit when the user typed their figures instead. */
  scope?: Partial<Record<ScopeKey, ScopeState>>;
  exclusions?: string[];
  redFlags?: { issue: string; quotedText: string }[];
  warrantyWorkmanshipYears?: number | null;
  deckSheetsIncluded?: number | null;
  measuredSquares?: number | null;
  verdict?: QuoteVerdict;
}

const PRIORITY_RANK: Record<QuestionPriority, number> = {
  critical: 0, important: 1, "worth-asking": 2,
};

/**
 * Turn one specific quote into the questions worth asking about it.
 *
 * The generic version of this list is a blog post, and it is worthless: every
 * roofing site has one, and it tells a homeowner to "ask about the warranty"
 * with no idea whether their quote already covers it. This version reads the
 * gaps in *their* document and attaches the money at stake from our own line
 * items - so "ask whether tear-off is included" becomes "ask whether tear-off
 * is included; we model it at $1,300 on a roof this size".
 *
 * That is also why this stays useful when the estimate itself is uncertain. A
 * range built on sample pricing may be wide, but "your quote does not mention
 * the decking allowance" is true regardless of what the range says.
 */
export function buildQuestions(input: QuestionInput): PersonalQuestion[] {
  const { estimate } = input;
  const questions: PersonalQuestion[] = [];

  // Retail cost of a component, so figures are comparable with a quote rather
  // than with our internal direct cost.
  const overheadRatio = estimate.range.typical / Math.max(1, estimate.directCost.typical);
  const costOf = (lineKeys: readonly string[]): number | undefined => {
    const items = estimate.lineItems.filter((l) => lineKeys.includes(l.key));
    if (!items.length) return undefined;
    return Math.round(items.reduce((a, l) => a + l.typical, 0) * overheadRatio);
  };

  // ---- Red flags first. These are not scope questions, they are warnings. ----
  for (const flag of input.redFlags ?? []) {
    questions.push({
      id: `flag-${slug(flag.issue)}`,
      question: `Ask them to explain this in writing: "${flag.quotedText}"`,
      why: `${flag.issue}. Get the explanation in the contract, not over the phone. If they will not put it in writing, that is your answer.`,
      priority: "critical",
      trigger: "Wording found in your quote",
      leadsBand: true,
    });
  }

  // ---- Scope gaps, driven by what the document actually says ----
  for (const item of SCOPE_ITEMS) {
    const state = input.scope?.[item.key] ?? "not_stated";
    if (state === "included") continue;

    const amount = costOf(item.lineKeys);
    const spec = SCOPE_QUESTION[item.key];
    questions.push({
      id: `scope-${item.key}`,
      question: state === "excluded" ? spec.excludedQuestion : spec.missingQuestion,
      why: state === "excluded"
        ? `${spec.why} Your quote explicitly excludes it, so someone else is doing it, or nobody is.`
        : spec.why,
      priority: state === "excluded" ? "critical" : spec.priority,
      trigger: state === "excluded"
        ? "Explicitly excluded in your quote"
        : "Not mentioned in your quote",
      amountAtStake: amount,
    });
  }

  // ---- Decking: the single most common source of change orders ----
  // Only when the quote SAYS there is an allowance but never says how big it
  // is. Total silence is already covered by the scope question above, and
  // asking twice makes the list look automated rather than considered.
  if (input.deckSheetsIncluded == null && input.scope?.deckAllowance === "included") {
    questions.push({
      id: "deck-per-sheet",
      question: "What is the price per sheet for replacement decking, and how many sheets are included?",
      why: "Deck condition cannot be known until the old roof is off. A stated allowance plus a stated unit price turns the most common mid-job dispute into a number you already agreed. This one question prevents more arguments than any other on this list.",
      priority: "critical",
      trigger: "No decking allowance found in your quote",
      amountAtStake: costOf(["material.decking"]),
    });
  }

  // ---- Measurement: the largest driver of the price ----
  if (input.measuredSquares == null) {
    questions.push({
      id: "measured-squares",
      question: "How many squares did you measure, and did you measure on site or from aerial imagery?",
      why: `Roof area drives the price more than anything else. We modelled ${estimate.derived.squares} squares from what you told us; an on-site measurement and a satellite estimate can differ by ten percent or more on a cut-up roof, and that difference flows straight into what you pay.`,
      priority: "important",
      trigger: "No square count stated in your quote",
    });
  }

  // ---- Warranty ----
  const warranty = input.warrantyWorkmanshipYears;
  if (warranty == null) {
    questions.push({
      id: "warranty-missing",
      question: "How long is your workmanship warranty, separately from the manufacturer's material warranty?",
      why: "These are two different warranties that fail in different ways. The manufacturer covers the product; the contractor covers the installation. Most leaks are installation, and installation problems usually appear after year five.",
      priority: "important",
      trigger: "No workmanship warranty found in your quote",
    });
  } else if (warranty < 5) {
    questions.push({
      id: "warranty-short",
      question: `Your workmanship warranty is ${warranty} year${warranty === 1 ? "" : "s"}. What happens if a leak appears in year six?`,
      why: "Installation defects typically surface after year five, which is exactly when a short workmanship warranty has expired. Ten years or more is meaningfully better, and it is worth asking what a longer term would cost.",
      priority: "important",
      trigger: `Workmanship warranty of only ${warranty} year${warranty === 1 ? "" : "s"}`,
    });
  }

  // ---- Anything the quote explicitly excludes ----
  for (const exclusion of (input.exclusions ?? []).slice(0, 5)) {
    questions.push({
      id: `exclusion-${slug(exclusion)}`,
      question: `Your quote excludes "${exclusion}". Who is responsible for it, and what will it cost?`,
      why: "An exclusion is not a saving. It is work that still has to happen, priced later or by someone else.",
      priority: "important",
      trigger: "Listed as an exclusion in your quote",
    });
  }

  // ---- Questions driven by where the quote sits against the range ----
  if (input.verdict === "well-below" || input.verdict === "below") {
    questions.push({
      id: "verdict-low",
      question: "Can you give me a line-item breakdown showing labour, materials, tear-off and disposal separately?",
      why: `This quote sits below our modelled range. That can be a lean operation in a soft market, and it can also be a scope that is missing something. A line-item breakdown settles which, and costs the contractor nothing to produce.`,
      priority: "important",
      trigger: "Quote is below the modelled range",
    });
  }
  if (input.verdict === "well-above") {
    questions.push({
      id: "verdict-high",
      question: "What is included here that a standard replacement would not include?",
      why: `This quote sits well above our modelled range of ${money(estimate.range.low)} to ${money(estimate.range.high)}. There are many legitimate answers - a larger measured roof, a second layer, extensive decking, a premium product, a full system warranty. Ask which applies before drawing any conclusion.`,
      priority: "important",
      trigger: "Quote is well above the modelled range",
    });
  }

  // ---- Always worth asking, regardless of the document ----
  questions.push({
    id: "payment-schedule",
    question: "What is the payment schedule, and will you provide a lien waiver on final payment?",
    why: "A modest deposit then payment on completion is normal. Most or all of the money up front is not. A lien waiver protects you if the contractor does not pay their own supplier - without it, a lien can attach to your property even though you paid in full.",
    priority: "worth-asking",
    trigger: "Standard question for any contract of this size",
  });

  return questions.sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    // Red flags lead their band; then the questions worth the most money.
    const byLead = Number(b.leadsBand ?? false) - Number(a.leadsBand ?? false);
    if (byLead !== 0) return byLead;
    return (b.amountAtStake ?? 0) - (a.amountAtStake ?? 0);
  });
}

const SCOPE_QUESTION: Record<ScopeKey, {
  missingQuestion: string; excludedQuestion: string; why: string; priority: QuestionPriority;
}> = {
  tearOff: {
    missingQuestion: "Does this price include tearing off the existing roof, and how many layers?",
    excludedQuestion: "Tear-off is excluded. Who is removing the old roof, and what does that cost?",
    why: "Leaving out the tear-off is the most common way a quote becomes cheaper than the work. Two layers roughly doubles both the labour and the disposal tonnage.",
    priority: "critical",
  },
  disposal: {
    missingQuestion: "Is debris removal and disposal included, or will I be arranging that?",
    excludedQuestion: "Disposal is excluded. Am I responsible for the container and the tipping fees?",
    why: "A roof tear-off produces several tons of debris. Someone is paying to haul and dump it.",
    priority: "critical",
  },
  permit: {
    missingQuestion: "Are you pulling the permit, and is the fee included in this price?",
    excludedQuestion: "The permit is excluded. Am I expected to pull it myself?",
    why: "The contractor should pull it. A homeowner-pulled permit can shift responsibility for code compliance onto you, and an unpermitted roof causes problems at resale and at claim time.",
    priority: "critical",
  },
  licensedInsured: {
    missingQuestion: "Can your insurer send me a certificate of insurance directly, and what is your licence number?",
    excludedQuestion: "Please confirm your licence and insurance in writing before we go further.",
    why: "Verify both independently - the licence with the issuing board, and the insurance with the insurer naming you as certificate holder. An uninsured injury on your roof can become your problem.",
    priority: "critical",
  },
  underlayment: {
    missingQuestion: "Which underlayment are you installing, and is a secondary water barrier included?",
    excludedQuestion: "Underlayment is excluded. Is the existing layer being reused?",
    why: "Underlayment is the actual waterproof layer; the covering is a rain shield. Felt, synthetic and fully self-adhered are three different products at three different prices.",
    priority: "important",
  },
  flashing: {
    missingQuestion: "Is all flashing being replaced, or reused where it looks serviceable?",
    excludedQuestion: "Flashing replacement is excluded. Which flashings are being reused?",
    why: "Reused flashing around chimneys, walls and valleys is a common way to make a quote cheaper. It is also where roofs leak first.",
    priority: "important",
  },
  ventilation: {
    missingQuestion: "What ventilation is being installed, and is the existing intake adequate for it?",
    excludedQuestion: "Ventilation work is excluded. Is the existing ventilation being reused as is?",
    why: "Exhaust without matching intake does nothing. Inadequate ventilation shortens roof life, and replacement is by far the cheapest moment to fix it.",
    priority: "worth-asking",
  },
  deckAllowance: {
    missingQuestion: "How many sheets of replacement decking are included, and what is the price per sheet beyond that?",
    excludedQuestion: "Decking replacement is excluded. What happens if the deck is rotten underneath?",
    why: "Deck condition is unknown until the old roof comes off. Without a stated allowance and unit price, this becomes a mid-job negotiation with no leverage on your side.",
    priority: "critical",
  },
  cleanup: {
    missingQuestion: "What does clean-up include, and will you run a magnet over the property and the lawn?",
    excludedQuestion: "Clean-up is excluded. Am I clearing the site myself?",
    why: "Roofing nails end up in driveways, lawns and tyres. A magnet sweep is standard practice and costs the contractor very little to commit to.",
    priority: "worth-asking",
  },
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
