import { describe, expect, it } from "vitest";
import { JsonStore } from "@/lib/data/json-store";
import { buildEngineContext } from "@/lib/engine/context";
import { getEngine } from "@/lib/engine/registry";
import type { RoofingInput } from "@/lib/engine/roofing/schema";

const store = new JsonStore();
const engine = getEngine("roofing")!;

async function estimate(partial: Partial<RoofingInput> & { zip: string }) {
  const ctx = (await buildEngineContext(store, "roofing", partial.zip))!;
  const parsed = engine.parse(partial);
  if (!parsed.ok) throw new Error(parsed.error);
  return engine.estimate(parsed.value, ctx);
}

const baseline = {
  zip: "85018", areaMode: "roof" as const, roofAreaSqft: 2000,
  material: "asphalt-architectural", stories: 2 as const, pitch: "moderate" as const,
  complexity: "moderate" as const, existingLayers: 1 as const,
};

describe("roofing engine", () => {
  it("produces an ordered, plausible range for a typical 20-square asphalt roof", async () => {
    const r = await estimate(baseline);
    expect(r.range.low).toBeLessThan(r.range.typical);
    expect(r.range.typical).toBeLessThan(r.range.high);
    // Sanity envelope for a 2,000 sq ft architectural shingle tear-off.
    expect(r.range.typical).toBeGreaterThan(9_000);
    expect(r.range.typical).toBeLessThan(30_000);
    expect(r.perSquare.typical).toBeGreaterThan(400);
    expect(r.perSquare.typical).toBeLessThan(1_500);
  });

  it("line items and overhead reconcile exactly to the headline range", async () => {
    const r = await estimate(baseline);
    const direct = r.lineItems.reduce((a, l) => a + l.typical, 0);
    expect(direct).toBeCloseTo(r.directCost.typical, 5);
    expect(direct + r.overheadAndProfit.typical).toBeCloseTo(r.range.typical, -2);
  });

  it("prices a bigger roof higher, monotonically", async () => {
    const small = await estimate({ ...baseline, roofAreaSqft: 1500 });
    const large = await estimate({ ...baseline, roofAreaSqft: 3000 });
    expect(large.range.typical).toBeGreaterThan(small.range.typical);
  });

  it("charges more for steep pitch, more storeys, and harder access", async () => {
    const easy = await estimate({ ...baseline, pitch: "low", stories: 1, access: "easy" });
    const hard = await estimate({ ...baseline, pitch: "very-steep", stories: 3, access: "difficult" });
    expect(hard.range.typical).toBeGreaterThan(easy.range.typical * 1.15);
  });

  it("charges more for two existing layers than one", async () => {
    const one = await estimate({ ...baseline, existingLayers: 1 });
    const two = await estimate({ ...baseline, existingLayers: 2 });
    expect(two.range.typical).toBeGreaterThan(one.range.typical);
  });

  it("ranks materials in the expected order", async () => {
    const slugs = ["asphalt-3tab", "asphalt-architectural", "metal-standing-seam", "natural-slate"];
    const totals: number[] = [];
    for (const material of slugs) totals.push((await estimate({ ...baseline, material })).range.typical);
    for (let i = 1; i < totals.length; i++) expect(totals[i]).toBeGreaterThan(totals[i - 1]);
  });

  it("prices a tile lift-and-relay below a full new tile roof", async () => {
    const full = await estimate({ ...baseline, material: "concrete-tile", projectType: "full-replacement" });
    const relay = await estimate({ ...baseline, material: "concrete-tile", projectType: "tile-underlayment" });
    expect(relay.range.typical).toBeLessThan(full.range.typical);
  });

  it("resolves a known ZIP to its city and an unknown ZIP to national fallback", async () => {
    const known = await estimate(baseline);
    expect(known.geo.city?.slug).toBe("phoenix-az");
    expect(known.geo.isFallback).toBe(false);
    expect(known.geo.bestLevel).toBe("city");

    const unknown = await estimate({ ...baseline, zip: "99999" });
    expect(unknown.geo.isFallback).toBe(true);
    expect(unknown.confidence.score).toBeLessThan(known.confidence.score);
  });

  it("reflects the local labour market: LA above Dallas for an identical roof", async () => {
    const dallas = await estimate({ ...baseline, zip: "75214" });
    const la = await estimate({ ...baseline, zip: "90042" });
    expect(la.range.typical).toBeGreaterThan(dallas.range.typical);
  });

  it("caps confidence while sample data is in use and says why", async () => {
    const r = await estimate(baseline);
    expect(r.confidence.score).toBeLessThanOrEqual(60);
    expect(r.confidence.caveats.join(" ")).toMatch(/sample data/i);
    expect(r.freshness.containsSampleData).toBe(true);
  });

  it("raises confidence when the user supplies more detail", async () => {
    const sparse = await estimate(baseline);
    const detailed = await estimate({
      ...baseline, planes: 8, skylights: 2, chimneys: 1, underlayment: "synthetic",
      flashing: "full-replacement", ventilation: "ridge-vent", deckSheets: 4,
      access: "moderate", warranty: "system", quality: "premium",
      existingMaterial: "asphalt-3tab",
    });
    const supplied = (r: { confidence: { breakdown: { key: string; earned: number }[] } }) =>
      r.confidence.breakdown.find((b) => b.key === "inputs")!.earned;
    expect(supplied(detailed)).toBeGreaterThan(supplied(sparse));
  });

  it("dates the estimate to its OLDEST input, not its newest", async () => {
    // One fresh row must never make stale data look current. This is the whole
    // reason the freshness label exists.
    const ctx = (await buildEngineContext(store, "roofing", baseline.zip))!;
    // Age every labour row, whichever scope ends up resolving.
    for (const r of ctx.records) {
      if (r.metricKey === "labor.rate_per_hour") r.effectiveDate = "2023-05-01";
    }

    const parsed = engine.parse(baseline);
    if (!parsed.ok) throw new Error(parsed.error);
    const r = engine.estimate(parsed.value, ctx);

    expect(r.freshness.effectiveDate).toBe("2023-05-01");
    expect(r.freshness.newestEffectiveDate > r.freshness.effectiveDate).toBe(true);
    expect(r.freshness.monthsOld).toBeGreaterThan(24);

    const recency = r.confidence.breakdown.find((b) => b.key === "recency")!;
    expect(recency.earned).toBeLessThanOrEqual(6);
  });

  it("rejects a malformed ZIP", () => {
    const parsed = engine.parse({ zip: "abc" });
    expect(parsed.ok).toBe(false);
  });
});

describe("source quality scoring", () => {
  it("weights sources by how much they actually supply, not by how many exist", async () => {
    const ctx = (await buildEngineContext(store, "roofing", "85018"))!;
    // Swap exactly one of ~10 price lookups to a high-reliability source.
    // Scope-agnostic: real BLS data is metro-scoped, sample fallback is
    // national, and this assertion is about weighting rather than geography.
    for (const r of ctx.records) {
      if (r.metricKey === "labor.rate_per_hour") r.sourceId = "src-bls-oes";
    }

    const parsed = engine.parse({
      zip: "85018", areaMode: "roof" as const, roofAreaSqft: 2000, stories: 2 as const,
      material: "asphalt-architectural", pitch: "moderate" as const,
      complexity: "moderate" as const, existingLayers: 1 as const,
    });
    if (!parsed.ok) throw new Error(parsed.error);
    const r = engine.estimate(parsed.value, ctx);
    const sources = r.confidence.breakdown.find((b) => b.key === "sources")!;

    // An unweighted mean over the two distinct sources would give
    // (0.40 + 0.92) / 2 * 16 = 11. Weighted by contribution it is ~7.
    expect(sources.earned).toBeLessThan(9);
    expect(sources.detail).toMatch(/Weighted by contribution/);
  });
});

/**
 * Data quality has to move the number people act on, not just the badge beside
 * it. A line item's low/high describes market variation at a known price; it
 * says nothing about whether the price is known. Before this, a sample row was
 * published with exactly the same band as a government-backed one - the
 * confidence score fell, and the figure a homeowner would take to a contractor
 * did not move at all.
 */
describe("uncertainty about the data widens the published range", () => {
  const inputs = {
    zip: "85018", areaMode: "roof" as const, roofAreaSqft: 2000, stories: 2,
    material: "asphalt-architectural", pitch: "moderate" as const,
    complexity: "moderate" as const, existingLayers: 1,
  };
  const store = new JsonStore();
  const engine = getEngine("roofing")!;

  /** Re-runs the estimate with every model-uncertainty factor forced to `k`. */
  async function withUncertainty(k: number | null) {
    const ctx = (await buildEngineContext(store, "roofing", inputs.zip))!;
    const factors = k === null ? ctx.factors
      : ctx.factors.map((f) => f.factorKey.startsWith("uncertainty.") ? { ...f, multiplier: k } : f);
    const parsed = engine.parse(inputs as never);
    if (!parsed.ok) throw new Error(parsed.error);
    return engine.estimate(parsed.value, { ...ctx, factors });
  }

  const width = (r: { range: { low: number; high: number } }) => r.range.high - r.range.low;

  it("publishes a wider range than the market spread alone", async () => {
    const marketOnly = await withUncertainty(1);
    const asPublished = await withUncertainty(null);
    expect(width(asPublished)).toBeGreaterThan(width(marketOnly));
  });

  it("never moves the midpoint", async () => {
    // Widening is a statement about our confidence, not a different guess at
    // the price. Shifting the centre would be exactly the dishonesty this is
    // meant to prevent.
    const marketOnly = await withUncertainty(1);
    const asPublished = await withUncertainty(null);
    expect(asPublished.range.typical).toBe(marketOnly.range.typical);
  });

  it("narrows on its own as the data improves", async () => {
    // The property that matters long-term: nobody has to remember to tighten
    // the range when real prices land. Better data does it by itself.
    const poor = await withUncertainty(1.6);
    const good = await withUncertainty(1.05);
    expect(width(good)).toBeLessThan(width(poor));
  });

  it("still contains the midpoint inside the range", async () => {
    const r = await withUncertainty(null);
    expect(r.range.low).toBeLessThan(r.range.typical);
    expect(r.range.high).toBeGreaterThan(r.range.typical);
  });
});
