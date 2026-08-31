import { describe, expect, it } from "vitest";
import { JsonStore } from "@/lib/data/json-store";
import { buildEngineContext } from "@/lib/engine/context";
import { getEngine } from "@/lib/engine/registry";
import { buildQuestions, type ScopeState } from "@/lib/engine/questions";
import type { ScopeKey } from "@/lib/engine/quote";
import type { EstimateResult } from "@/lib/engine/types";

const store = new JsonStore();
const engine = getEngine("roofing")!;

let cached: EstimateResult | null = null;
async function estimate(): Promise<EstimateResult> {
  if (cached) return cached;
  const ctx = (await buildEngineContext(store, "roofing", "85018"))!;
  const parsed = engine.parse({
    zip: "85018", areaMode: "roof", roofAreaSqft: 2000, stories: 2,
    material: "asphalt-architectural", pitch: "moderate", complexity: "moderate",
    existingLayers: 1,
  });
  if (!parsed.ok) throw new Error(parsed.error);
  cached = engine.estimate(parsed.value, ctx);
  return cached;
}

const allIncluded: Record<ScopeKey, ScopeState> = {
  tearOff: "included", disposal: "included", permit: "included",
  underlayment: "included", flashing: "included", ventilation: "included",
  deckAllowance: "included", cleanup: "included", licensedInsured: "included",
};

describe("personalised contractor questions", () => {
  it("asks nothing about scope a quote already covers", async () => {
    const qs = buildQuestions({
      estimate: await estimate(), scope: allIncluded,
      deckSheetsIncluded: 5, measuredSquares: 20, warrantyWorkmanshipYears: 10,
    });
    expect(qs.some((q) => q.id.startsWith("scope-"))).toBe(false);
    // The payment/lien question always applies, whatever the document says.
    expect(qs.map((q) => q.id)).toContain("payment-schedule");
  });

  it("asks about every item the quote is silent on", async () => {
    const qs = buildQuestions({ estimate: await estimate() });
    for (const key of ["tearOff", "disposal", "permit", "deckAllowance"]) {
      expect(qs.map((q) => q.id)).toContain(`scope-${key}`);
    }
  });

  it("attaches the money at stake from the estimate's own line items", async () => {
    const qs = buildQuestions({ estimate: await estimate() });
    const tearOff = qs.find((q) => q.id === "scope-tearOff")!;
    expect(tearOff.amountAtStake).toBeGreaterThan(0);
    // Retail-comparable, so it must exceed the bare direct cost of the line.
    const est = await estimate();
    const direct = est.lineItems.find((l) => l.key === "labor.tearoff")!.typical;
    expect(tearOff.amountAtStake!).toBeGreaterThan(direct);
  });

  it("treats an explicit exclusion more seriously than silence", async () => {
    const silent = buildQuestions({ estimate: await estimate() })
      .find((q) => q.id === "scope-ventilation")!;
    const excluded = buildQuestions({
      estimate: await estimate(),
      scope: { ...allIncluded, ventilation: "excluded" },
    }).find((q) => q.id === "scope-ventilation")!;

    expect(silent.priority).toBe("worth-asking");
    expect(excluded.priority).toBe("critical");
    expect(excluded.why).toMatch(/explicitly excludes/i);
  });

  it("puts red flags first and quotes the document back", async () => {
    const qs = buildQuestions({
      estimate: await estimate(), scope: allIncluded,
      deckSheetsIncluded: 4, measuredSquares: 20, warrantyWorkmanshipYears: 10,
      redFlags: [{ issue: "Offers to cover the deductible", quotedText: "we will waive your deductible" }],
    });
    expect(qs[0].priority).toBe("critical");
    expect(qs[0].question).toMatch(/waive your deductible/);
  });

  it("leads with a red flag even when other critical questions carry money", async () => {
    const qs = buildQuestions({
      estimate: await estimate(),
      scope: { ...allIncluded, flashing: "excluded" },
      redFlags: [{ issue: "Offers to cover the deductible", quotedText: "we will take care of it" }],
    });
    expect(qs[0].id).toMatch(/^flag-/);
    expect(qs[1].amountAtStake).toBeGreaterThan(0);
  });

  it("never asks about decking twice", async () => {
    // Silence is covered by the scope question; a stated-but-unsized allowance
    // is the only case that needs the follow-up.
    const silent = buildQuestions({ estimate: await estimate() });
    const deckQuestions = silent.filter((q) => q.id === "scope-deckAllowance" || q.id === "deck-per-sheet");
    expect(deckQuestions).toHaveLength(1);

    const statedButUnsized = buildQuestions({
      estimate: await estimate(), scope: allIncluded, deckSheetsIncluded: null,
    });
    expect(statedButUnsized.map((q) => q.id)).toContain("deck-per-sheet");
  });

  it("ranks critical before important before worth-asking", async () => {
    const qs = buildQuestions({ estimate: await estimate() });
    const rank = { critical: 0, important: 1, "worth-asking": 2 } as const;
    for (let i = 1; i < qs.length; i++) {
      expect(rank[qs[i].priority]).toBeGreaterThanOrEqual(rank[qs[i - 1].priority]);
    }
  });

  it("leads with the most expensive question within a priority band", async () => {
    const qs = buildQuestions({ estimate: await estimate() })
      .filter((q) => q.priority === "critical" && q.amountAtStake != null);
    for (let i = 1; i < qs.length; i++) {
      expect(qs[i].amountAtStake!).toBeLessThanOrEqual(qs[i - 1].amountAtStake!);
    }
  });

  it("challenges a short warranty but not a long one", async () => {
    const short = buildQuestions({ estimate: await estimate(), warrantyWorkmanshipYears: 2 });
    expect(short.map((q) => q.id)).toContain("warranty-short");

    const long = buildQuestions({ estimate: await estimate(), warrantyWorkmanshipYears: 15 });
    expect(long.map((q) => q.id)).not.toContain("warranty-short");
    expect(long.map((q) => q.id)).not.toContain("warranty-missing");
  });

  it("asks a different question depending on where the quote sits", async () => {
    const low = buildQuestions({ estimate: await estimate(), verdict: "well-below" });
    const high = buildQuestions({ estimate: await estimate(), verdict: "well-above" });
    expect(low.map((q) => q.id)).toContain("verdict-low");
    expect(high.map((q) => q.id)).toContain("verdict-high");
    expect(low.map((q) => q.id)).not.toContain("verdict-high");
  });

  it("turns each stated exclusion into its own question", async () => {
    const qs = buildQuestions({
      estimate: await estimate(),
      exclusions: ["Gutter replacement", "Structural repairs"],
    });
    const text = qs.map((q) => q.question).join(" ");
    expect(text).toMatch(/Gutter replacement/);
    expect(text).toMatch(/Structural repairs/);
  });

  it("still produces useful questions with no uploaded document at all", async () => {
    // The whole point: this survives a wide or uncertain estimate, because a
    // missing decking allowance is a fact about the quote, not about our model.
    const qs = buildQuestions({ estimate: await estimate() });
    expect(qs.length).toBeGreaterThan(8);
    expect(qs.some((q) => q.priority === "critical")).toBe(true);
  });
});
