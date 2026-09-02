import { describe, expect, it } from "vitest";
import {
  parseBlsSeriesJson, parseFredCsv, transformIndexObservations,
} from "@/lib/ingest/ppi";
import { buildEscalator } from "@/lib/escalation";
import type { PricingRecord } from "@/lib/types";

const blsJson = {
  status: "REQUEST_SUCCEEDED",
  Results: {
    series: [
      {
        seriesID: "WPU1361",
        data: [
          // BLS returns newest first, and mixes in an annual average.
          { year: "2026", period: "M02", periodName: "February", value: "348.500" },
          { year: "2026", period: "M01", periodName: "January", value: "347.114" },
          { year: "2025", period: "M13", periodName: "Annual", value: "340.000" },
          { year: "2025", period: "M02", periodName: "February", value: "330.000" },
          { year: "2025", period: "M01", periodName: "January", value: "328.000" },
        ],
      },
      { seriesID: "WPU136", data: [{ year: "2026", period: "M01", value: "199.9" }] },
    ],
  },
};

const transform = (observations: { periodStart: string; value: number }[]) =>
  transformIndexObservations({
    observations, seriesKey: "WPU1361",
    name: "PPI: prepared asphalt and tar roofing and siding products",
    unit: "index (1982=100)", sourceId: "src-bls-ppi", appliesTo: ["material"],
  });

describe("BLS series JSON", () => {
  it("drops the annual average, which is not a thirteenth month", () => {
    // M13 is the classic way to end up with a phantom period that distorts a
    // year-on-year comparison.
    const obs = parseBlsSeriesJson(blsJson, "WPU1361");
    expect(obs).toHaveLength(4);
    expect(obs.map((o) => o.periodStart)).toEqual([
      "2025-01-01", "2025-02-01", "2026-01-01", "2026-02-01",
    ]);
  });

  it("returns readings oldest first regardless of how BLS ordered them", () => {
    const obs = parseBlsSeriesJson(blsJson, "WPU1361");
    expect(obs[0].value).toBe(328);
    expect(obs.at(-1)!.value).toBe(348.5);
  });

  it("picks the series asked for, not whichever came back first", () => {
    expect(parseBlsSeriesJson(blsJson, "WPU136")).toHaveLength(1);
    expect(parseBlsSeriesJson(blsJson, "WPU136")[0].value).toBe(199.9);
  });

  it("returns nothing rather than guessing when the series is absent", () => {
    expect(parseBlsSeriesJson(blsJson, "WPU9999")).toEqual([]);
    expect(parseBlsSeriesJson({}, "WPU1361")).toEqual([]);
  });
});

describe("FRED CSV", () => {
  it("reads both the old and the current header", () => {
    const old = parseFredCsv("DATE,WPU1361\n2025-01-01,328.0\n2026-01-01,347.114\n");
    const now = parseFredCsv("observation_date,WPU1361\n2025-01-01,328.0\n2026-01-01,347.114\n");
    expect(old).toEqual(now);
    expect(now).toHaveLength(2);
  });

  it("skips a missing reading instead of scoring it zero", () => {
    // FRED writes "." for a gap. Reading that as 0 would produce an infinite
    // escalation multiplier the moment anything divided by it.
    const obs = parseFredCsv("DATE,WPU1361\n2025-01-01,328.0\n2025-02-01,.\n2026-01-01,347.114\n");
    expect(obs).toHaveLength(2);
    expect(obs.every((o) => o.value > 0)).toBe(true);
  });
});

describe("index transform", () => {
  it("marks the series verified, which almost nothing else here is", () => {
    // An index point is a federal statistic transcribed unchanged. What we
    // derive from it is modelled again.
    const { series } = transform(parseBlsSeriesJson(blsJson, "WPU1361"));
    expect(series.dataStatus).toBe("verified");
    expect(series.sourceId).toBe("src-bls-ppi");
    expect(series.appliesTo).toEqual(["material"]);
  });

  it("computes year-on-year only where a year-earlier reading exists", () => {
    const { points } = transform(parseBlsSeriesJson(blsJson, "WPU1361"));
    const jan25 = points.find((p) => p.periodStart === "2025-01-01")!;
    const jan26 = points.find((p) => p.periodStart === "2026-01-01")!;
    expect(jan25.pctChangeYoy).toBeUndefined();
    expect(jan26.pctChangeYoy).toBeCloseTo(5.8, 1);
  });

  it("refuses a reading that cannot be placed or believed", () => {
    const { points, rejected } = transform([
      { periodStart: "2025-01-01", value: 300 },
      { periodStart: "2025-01-01", value: 301 }, // duplicate period
      { periodStart: "Jan 2025", value: 302 },   // unparseable
      { periodStart: "2025-03-01", value: 0 },   // not a real index level
      { periodStart: "2025-04-01", value: 310 },
    ]);
    expect(points).toHaveLength(2);
    expect(rejected).toHaveLength(3);
    expect(rejected.map((r) => r.reason).join(" ")).toMatch(/duplicate/);
  });

  it("gives every row a stable id so a re-ingest updates rather than duplicates", () => {
    const a = transform(parseBlsSeriesJson(blsJson, "WPU1361"));
    const b = transform(parseBlsSeriesJson(blsJson, "WPU1361"));
    expect(a.points.map((p) => p.id)).toEqual(b.points.map((p) => p.id));
    expect(a.series.id).toBe(b.series.id);
    expect(new Set(a.points.map((p) => p.id)).size).toBe(a.points.length);
  });

  it("says in its methodology that it is not a price", () => {
    const { series } = transform(parseBlsSeriesJson(blsJson, "WPU1361"));
    expect(series.methodology).toMatch(/not a retail or installed price/i);
    expect(series.methodology).toContain("WPU1361");
  });

  it("produces something the escalator can immediately use", () => {
    // The round trip that matters: ingest a real-shaped release, and a price
    // anchored last January comes forward on it without any further wiring.
    const { series, points } = transform(parseBlsSeriesJson(blsJson, "WPU1361"));
    const record: PricingRecord = {
      id: "pr-x", serviceId: "svc-roofing", component: "material",
      metricKey: "material.per_square", geoScopeType: "country", geoScopeId: "us",
      unit: "square", lowPrice: 100, medianPrice: 200, highPrice: 300,
      currency: "USD", effectiveDate: "2025-01-01", collectedDate: "2025-02-01",
      sourceId: "src-observed-materials", dataStatus: "modeled",
      confidenceScore: 70, methodology: "Test.",
    };
    const e = buildEscalator({ series: [series], points })(record);
    expect(e).not.toBeNull();
    expect(e!.multiplier).toBeCloseTo(348.5 / 328, 4);
  });
});
