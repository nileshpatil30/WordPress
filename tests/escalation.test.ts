import { describe, expect, it } from "vitest";
import { buildEscalator } from "@/lib/escalation";
import { makePriceLookup } from "@/lib/engine/geo";
import { seedDataset } from "@/lib/data/seed";
import type {
  PriceIndexPoint, PriceIndexSeries, PricingRecord,
} from "@/lib/types";
import type { GeoResolution } from "@/lib/engine/types";

const series = (over: Partial<PriceIndexSeries> = {}): PriceIndexSeries => ({
  id: "pis-test", seriesKey: "WPU1361", name: "PPI: test roofing series",
  geoScopeType: "country", geoScopeId: "us", sourceId: "src-bls-ppi",
  unit: "index (1982=100)", dataStatus: "verified", appliesTo: ["material"],
  methodology: "Test series.",
  ...over,
});

/** Monthly readings climbing from `from` to `to` across the given periods. */
const points = (rows: [string, number][], seriesId = "pis-test"): PriceIndexPoint[] =>
  rows.map(([periodStart, value], i) => ({
    id: `pip-${i}`, seriesId, periodStart, value,
  }));

const STANDARD = points([
  ["2025-01-01", 300], ["2025-07-01", 310],
  ["2026-01-01", 320], ["2026-07-01", 330],
]);

const record = (over: Partial<PricingRecord> = {}): PricingRecord => ({
  id: "pr-test", serviceId: "svc-roofing", component: "material",
  metricKey: "material.per_square", geoScopeType: "country", geoScopeId: "us",
  unit: "square", lowPrice: 100, medianPrice: 200, highPrice: 300,
  currency: "USD", effectiveDate: "2025-01-01", collectedDate: "2025-02-01",
  sourceId: "src-observed-materials", dataStatus: "modeled",
  confidenceScore: 70, methodology: "Test record.",
  ...over,
});

describe("index escalation", () => {
  it("carries an anchored price forward on the published index", () => {
    // The whole point: anchor once, escalate free. 300 -> 330 is +10%.
    const e = buildEscalator({ series: [series()], points: STANDARD })(record());
    expect(e).not.toBeNull();
    expect(e!.multiplier).toBeCloseTo(330 / 300, 4);
    expect(e!.fromPeriod).toBe("2025-01-01");
    expect(e!.toPeriod).toBe("2026-07-01");
  });

  it("refuses to escalate on a sample series", () => {
    // Applying an invented trend line to a real price is worse than no trend
    // line at all, so the gate is the series' own data status.
    const escalate = buildEscalator({
      series: [series({ dataStatus: "sample" })], points: STANDARD,
    });
    expect(escalate(record())).toBeNull();
  });

  it("ships a real, usable index rather than a placeholder", () => {
    // This assertion used to read "is inert on the dataset we ship", and it
    // passed because the only series was a sample. A real BLS series is
    // ingested now, so the same expectation would still pass - for an entirely
    // different reason - and would quietly stop guarding anything. What matters
    // now is that the series is real and wired in.
    const series = seedDataset.priceIndexSeries;
    expect(series).toHaveLength(1);
    expect(series[0].dataStatus).not.toBe("sample");
    expect(series[0].appliesTo).toContain("material");
    expect(seedDataset.priceIndexPoints.length).toBeGreaterThan(12);
  });

  it("moves a material price anchored before the latest index reading", () => {
    // The wiring proof. Every shipped anchor currently postdates the index, so
    // nothing escalates in practice - but that is the forward-only rule, not a
    // broken connection, and this distinguishes the two.
    const escalate = buildEscalator({
      series: seedDataset.priceIndexSeries, points: seedDataset.priceIndexPoints,
    });
    const first = seedDataset.priceIndexPoints[0];
    const aged = { ...record({ effectiveDate: first.periodStart }), component: "material" as const };
    const e = escalate(aged);
    expect(e, "a material anchored at the start of the index must escalate").not.toBeNull();
    expect(e!.multiplier).toBeGreaterThan(1);
    expect(e!.seriesKey).toBe(seedDataset.priceIndexSeries[0].seriesKey);
  });

  it("leaves every shipped record alone, because each anchor postdates the index", () => {
    const escalate = buildEscalator({
      series: seedDataset.priceIndexSeries, points: seedDataset.priceIndexPoints,
    });
    const latest = seedDataset.priceIndexPoints.at(-1)!.periodStart;
    for (const r of seedDataset.pricingRecords) {
      if (escalate(r) !== null) {
        expect(r.effectiveDate < latest, `${r.id} escalated, so it must predate ${latest}`).toBe(true);
      }
    }
  });

  it("only moves the components the index actually measures", () => {
    // A materials PPI must never age labour - labour has its own OEWS series.
    const escalate = buildEscalator({ series: [series()], points: STANDARD });
    expect(escalate(record({ component: "material" }))).not.toBeNull();
    for (const component of ["labor", "permit", "disposal", "equipment"] as const) {
      expect(escalate(record({ component })), component).toBeNull();
    }
  });

  it("escalates nothing when a series does not declare what it covers", () => {
    const escalate = buildEscalator({
      series: [series({ appliesTo: undefined })], points: STANDARD,
    });
    expect(escalate(record())).toBeNull();
  });

  it("never runs backwards", () => {
    const escalate = buildEscalator({ series: [series()], points: STANDARD });
    expect(escalate(record({ effectiveDate: "2026-07-01" }))).toBeNull();
    expect(escalate(record({ effectiveDate: "2026-09-01" }))).toBeNull();
  });

  it("does not extrapolate behind the start of the series", () => {
    // We cannot know what the index did before it was published, so we decline
    // rather than assume the earliest reading held.
    const escalate = buildEscalator({ series: [series()], points: STANDARD });
    expect(escalate(record({ effectiveDate: "2019-01-01" }))).toBeNull();
  });

  it("measures from the last reading at or before the anchor date", () => {
    // An anchor dated mid-period uses the reading in force at that date, not
    // the next one, which would understate the movement since.
    const e = buildEscalator({ series: [series()], points: STANDARD })(
      record({ effectiveDate: "2025-09-15" }));
    expect(e!.fromValue).toBe(310);
    expect(e!.multiplier).toBeCloseTo(330 / 310, 4);
  });

  it("declines rather than doubling a price that is too old to escalate", () => {
    // Past the cap the honest answer is that the anchor needs re-collecting.
    const runaway = points([["2020-01-01", 100], ["2026-01-01", 400]]);
    expect(buildEscalator({ series: [series()], points: runaway })(
      record({ effectiveDate: "2020-01-01" }))).toBeNull();
    // ...and the same series still escalates an anchor inside the cap.
    const gentle = points([["2020-01-01", 100], ["2026-01-01", 110]]);
    expect(buildEscalator({ series: [series()], points: gentle })(
      record({ effectiveDate: "2020-01-01" }))).not.toBeNull();
  });

  it("needs more than one reading to call something a trend", () => {
    const escalate = buildEscalator({
      series: [series()], points: points([["2025-01-01", 300]]),
    });
    expect(escalate(record())).toBeNull();
  });

  it("ignores a series scoped outside the location being priced", () => {
    const escalate = buildEscalator({
      series: [series({ geoScopeType: "state", geoScopeId: "us-ca" })],
      points: STANDARD,
      scopeIds: ["us-tx", "us", "global"],
    });
    expect(escalate(record())).toBeNull();
  });

  it("prefers the most specific series available", () => {
    const national = series({ id: "pis-nat", geoScopeId: "us" });
    const texas = series({
      id: "pis-tx", geoScopeType: "state", geoScopeId: "us-tx",
      name: "PPI: Texas roofing materials",
    });
    const escalate = buildEscalator({
      series: [national, texas],
      points: [
        ...points(STANDARD.map((p) => [p.periodStart, p.value] as [string, number]), "pis-nat"),
        ...points([["2025-01-01", 300], ["2026-07-01", 360]], "pis-tx"),
      ],
      scopeIds: ["us-tx", "us", "global"],
    });
    expect(escalate(record())!.seriesKey).toBe("WPU1361");
    expect(escalate(record())!.toValue).toBe(360);
  });

  it("explains itself in language a homeowner can check", () => {
    const e = buildEscalator({ series: [series()], points: STANDARD })(record())!;
    expect(e.note).toContain("WPU1361");
    expect(e.note).toContain("January 2025");
    expect(e.note).toContain("July 2026");
    expect(e.note).toMatch(/risen 10\.0%/);
    expect(e.note).toMatch(/observed price is unchanged/i);
  });

  it("never conflates when we saw the price with the index reading in force", () => {
    // These are different facts. An anchor observed in September sits on the
    // last reading published at or before it, and a note that quietly reported
    // one as the other would be unverifiable against the published series.
    const e = buildEscalator({ series: [series()], points: STANDARD })(
      record({ effectiveDate: "2025-09-15" }))!;
    expect(e.anchorDate).toBe("2025-09-15");
    expect(e.fromPeriod).toBe("2025-07-01");
    expect(e.note).toContain("Observed September 2025");
    expect(e.note).toContain("July 2025");
  });

  it("passes a published fall through as a fall", () => {
    const falling = points([["2025-01-01", 320], ["2026-01-01", 304]]);
    const e = buildEscalator({ series: [series()], points: falling })(record())!;
    expect(e.multiplier).toBeCloseTo(0.95, 4);
    expect(e.note).toMatch(/fallen 5\.0%/);
  });
});

const GEO: GeoResolution = {
  zip: "00000", zipRecord: null, city: null, state: null,
  bestLevel: "country", label: "United States (national)", isFallback: true,
};

describe("escalation through the price lookup", () => {
  it("applies to the price the model actually uses, and records why", () => {
    // Escalation belongs at the single point where a stored record becomes a
    // usable price, so nothing downstream can forget to apply it.
    const escalate = buildEscalator({ series: [series()], points: STANDARD });
    const lookup = makePriceLookup([record()], GEO, escalate);
    const hit = lookup.require("material.per_square");

    expect(hit.triple.typical).toBeCloseTo(200 * (330 / 300), 4);
    expect(hit.escalation?.seriesKey).toBe("WPU1361");
    // The stored record is untouched - only the resolved price moves.
    expect(hit.record.medianPrice).toBe(200);
  });

  it("leaves the price exactly as anchored when nothing can be escalated", () => {
    const lookup = makePriceLookup([record()], GEO);
    const hit = lookup.require("material.per_square");
    expect(hit.triple).toEqual({ low: 100, typical: 200, high: 300 });
    expect(hit.escalation).toBeUndefined();
  });
});
