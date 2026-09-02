import { describe, expect, it } from "vitest";
import { transformMaterialObservations, type MaterialObservation } from "@/lib/ingest/materials";
import { seedDataset } from "@/lib/data/seed";

const FACTORS = seedDataset.pricingFactors;
const SLUGS = seedDataset.materials.map((m) => m.slug);

const obs = (over: Partial<MaterialObservation> = {}): MaterialObservation => ({
  materialSlug: "asphalt-architectural",
  metricKey: "material.per_square",
  unit: "square",
  channel: "retail",
  low: 142, median: 158, high: 178,
  sourceName: "Example retailer",
  sourceRef: "https://example.com/listing",
  observedDate: "2026-09-01",
  ...over,
});

const run = (observations: MaterialObservation[]) =>
  transformMaterialObservations({
    observations, factors: FACTORS, serviceId: "svc-roofing",
    collectedDate: "2026-09-02", knownMaterialSlugs: SLUGS,
  });

describe("material price ingestion", () => {
  it("converts a retail price to what a contractor would pay", () => {
    // The whole reason this transform exists. A shelf price fed straight into
    // the model produces estimates that are too high - the mirror of the error
    // the large cost guides are known for.
    const { records } = run([obs()]);
    expect(records).toHaveLength(1);
    expect(records[0].medianPrice).toBeLessThan(158);
    expect(records[0].medianPrice).toBeCloseTo(158 * 0.78, 2);
    expect(records[0].methodology).toMatch(/trade discount factor/i);
    expect(records[0].methodology).toContain("https://example.com/listing");
  });

  it("passes trade-channel prices through unconverted", () => {
    const { records } = run([obs({ channel: "trade", low: 410, median: 480, high: 560 })]);
    expect(records[0].medianPrice).toBe(480);
    expect(records[0].methodology).toMatch(/no retail-to-trade conversion/i);
    // A price already in the contractor channel is better evidence than a
    // converted retail one, and the confidence should say so.
    expect(records[0].confidenceScore).toBeGreaterThan(
      run([obs()]).records[0].confidenceScore!);
  });

  it("never turns a competitor's published range into one of our records", () => {
    // We can cite someone else's number as a benchmark. We cannot republish it
    // as our dataset, and we did not observe it.
    const { records, rejected } = run([obs({ channel: "benchmark" })]);
    expect(records).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatch(/benchmark/i);
  });

  it("marks everything modeled, never verified", () => {
    // The observation is real; the conversion to a contractor's cost is ours.
    const { records } = run([obs(), obs({ channel: "trade", materialSlug: "asphalt-3tab" })]);
    for (const r of records) {
      expect(r.dataStatus).toBe("modeled");
      expect(r.sourceId).toBe("src-observed-materials");
    }
  });

  it("refuses a row that cannot be traced back", () => {
    const cases: [string, Partial<MaterialObservation>][] = [
      ["unknown material", { materialSlug: "not-a-real-material" }],
      ["out-of-order range", { low: 200, median: 150, high: 178 }],
      ["non-positive price", { low: 0 }],
      ["bad date", { observedDate: "Sept 2026" }],
    ];
    for (const [label, over] of cases) {
      const { records, rejected } = run([obs(over)]);
      expect(records, label).toHaveLength(0);
      expect(rejected, label).toHaveLength(1);
    }
  });

  it("keeps the observation date separate from the collection date", () => {
    // Freshness must describe the period a price covers, not the day we ran
    // the script - the same distinction the BLS ingest makes.
    const { records } = run([obs({ observedDate: "2026-07-15" })]);
    expect(records[0].effectiveDate).toBe("2026-07-15");
    expect(records[0].collectedDate).toBe("2026-09-02");
  });

  it("uses the trade discount factor from the dataset, not a hardcoded number", () => {
    const factor = FACTORS.find((f) => f.factorKey === "material.trade_discount");
    expect(factor, "material.trade_discount must exist in the seed").toBeTruthy();
    const { records } = run([obs()]);
    expect(records[0].medianPrice).toBeCloseTo(158 * factor!.multiplier, 2);
  });
});
