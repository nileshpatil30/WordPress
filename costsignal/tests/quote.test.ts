import { describe, expect, it } from "vitest";
import { JsonStore } from "@/lib/data/json-store";
import { buildEngineContext } from "@/lib/engine/context";
import { getEngine } from "@/lib/engine/registry";
import { assessQuote, compareQuotes, type QuoteInput } from "@/lib/engine/quote";
import { explainVariance } from "@/lib/engine/roofing/explain";
import { buildFinanceScenarios, monthlyPayment } from "@/lib/engine/finance";
import type { RoofingInput } from "@/lib/engine/roofing/schema";

const store = new JsonStore();
const engine = getEngine("roofing")!;

const input = {
  zip: "85018", areaMode: "roof" as const, roofAreaSqft: 2000, stories: 2,
  material: "asphalt-architectural", pitch: "moderate" as const,
  complexity: "moderate" as const, existingLayers: 1 as const,
};

async function baseline() {
  const ctx = (await buildEngineContext(store, "roofing", input.zip))!;
  const parsed = engine.parse(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return { ctx, parsed: parsed.value as unknown as RoofingInput, estimate: engine.estimate(parsed.value, ctx) };
}

describe("quote assessment", () => {
  it("classifies quotes against the modelled range", async () => {
    const { estimate } = await baseline();
    const { low, typical, high } = estimate.range;

    expect(assessQuote(typical, estimate).verdict).toBe("within");
    expect(assessQuote(low * 0.7, estimate).verdict).toBe("well-below");
    expect(assessQuote(high * 1.5, estimate).verdict).toBe("well-above");
    expect(assessQuote(low * 0.95, estimate).verdict).toBe("below");
    expect(assessQuote(high * 1.05, estimate).verdict).toBe("above");
  });

  it("never accuses the contractor of anything", async () => {
    const { estimate } = await baseline();
    for (const price of [estimate.range.low * 0.5, estimate.range.typical, estimate.range.high * 2]) {
      const a = assessQuote(price, estimate);
      const text = [a.headline, a.summary, ...a.considerations].join(" ").toLowerCase();
      for (const banned of ["ripping you off", "overcharging", "scam", "rip-off", "cheating", "too expensive"]) {
        expect(text).not.toContain(banned);
      }
    }
  });

  it("treats a suspiciously low quote as a risk, not a win", async () => {
    const { estimate } = await baseline();
    const a = assessQuote(estimate.range.low * 0.6, estimate);
    expect(a.summary.toLowerCase()).toMatch(/scope|excluded/);
  });

  it("always attaches a disclaimer", async () => {
    const { estimate } = await baseline();
    expect(assessQuote(estimate.range.typical, estimate).disclaimer).toMatch(/not a professional inspection/i);
  });
});

describe("variance explanation", () => {
  it("finds single changes that account for a moderately high quote", async () => {
    const { ctx, parsed, estimate } = await baseline();
    const quoted = estimate.range.high * 1.08;
    const v = explainVariance(parsed, ctx, quoted, estimate);
    expect(v.explains.length).toBeGreaterThan(0);
    // Every explanation must actually contain the quote when applied.
    for (const c of v.explains) {
      expect(quoted).toBeGreaterThanOrEqual(c.newRange.low);
      expect(quoted).toBeLessThanOrEqual(c.newRange.high);
      expect(c.impactPct).toBeGreaterThan(0);
    }
  });

  it("admits when no single change explains the gap", async () => {
    const { ctx, parsed, estimate } = await baseline();
    const v = explainVariance(parsed, ctx, estimate.range.high * 3, estimate);
    expect(v.explains).toHaveLength(0);
    expect(v.conclusion).toMatch(/no single assumption/i);
  });

  it("ranks roof area as the largest single lever", async () => {
    const { ctx, parsed, estimate } = await baseline();
    const v = explainVariance(parsed, ctx, estimate.range.typical, estimate);
    expect(v.sensitivities[0].field).toMatch(/roofAreaSqft|houseSqft/);
  });
});

describe("quote comparison", () => {
  const quotes: QuoteInput[] = [
    { id: "a", label: "A", totalPrice: 13900, scope: { underlayment: true } },
    {
      id: "b", label: "B", totalPrice: 16800, warrantyWorkmanshipYears: 10,
      scope: {
        tearOff: true, disposal: true, permit: true, underlayment: true, flashing: true,
        ventilation: true, deckAllowance: true, cleanup: true, licensedInsured: true,
      },
    },
    {
      id: "c", label: "C", totalPrice: 15400, warrantyWorkmanshipYears: 2,
      scope: { tearOff: true, disposal: true, underlayment: true, licensedInsured: true },
    },
  ];

  it("does not let the cheapest sticker price win once scope is priced in", async () => {
    const { estimate } = await baseline();
    const result = compareQuotes(quotes, estimate);

    const a = result.quotes.find((q) => q.id === "a")!;
    const b = result.quotes.find((q) => q.id === "b")!;

    expect(a.isLowestSticker).toBe(true);
    expect(a.isLowestAdjusted).toBe(false);
    expect(b.isLowestAdjusted).toBe(true);
    expect(a.adjustedComparable).toBeGreaterThan(b.adjustedComparable);
    expect(result.narrative.join(" ")).toMatch(/lowest sticker price/i);
  });

  it("flags missing permit, missing decking allowance and short warranties", async () => {
    const { estimate } = await baseline();
    const result = compareQuotes(quotes, estimate);
    const c = result.quotes.find((q) => q.id === "c")!;
    const text = c.flags.map((f) => f.text).join(" ");
    expect(text).toMatch(/permit/i);
    expect(text).toMatch(/decking/i);
    expect(text).toMatch(/workmanship warranty/i);
  });

  it("gives a full-scope quote no adjustment", async () => {
    const { estimate } = await baseline();
    const b = compareQuotes(quotes, estimate).quotes.find((q) => q.id === "b")!;
    expect(b.adjustedComparable).toBe(b.totalPrice);
    expect(b.scopeCoveragePct).toBe(100);
  });
});

describe("finance arithmetic", () => {
  it("computes a standard amortised payment", () => {
    // 10,000 at 12% over 12 months is a well-known ~888.49
    expect(monthlyPayment(10_000, 12, 12)).toBeCloseTo(888.49, 1);
    expect(monthlyPayment(12_000, 0, 12)).toBe(1000);
  });

  it("shows that a longer term costs more in total", () => {
    const r = buildFinanceScenarios(20_000, 2_000, [
      { label: "short", apr: 10, termMonths: 36 },
      { label: "long", apr: 10, termMonths: 120 },
    ]);
    const [short, long] = r.scenarios;
    expect(long.monthlyPayment).toBeLessThan(short.monthlyPayment);
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest);
    expect(r.amountFinanced).toBe(18_000);
  });

  it("states plainly that we are not a lender", () => {
    const r = buildFinanceScenarios(1000, 0, [{ label: "x", apr: 5, termMonths: 12 }]);
    expect(r.disclaimer).toMatch(/not a lender/i);
  });
});
