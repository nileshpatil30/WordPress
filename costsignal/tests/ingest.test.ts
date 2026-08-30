import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseCsv, parseCsvRecords } from "@/lib/ingest/csv";
import { resolveFactor, transformOewsRows } from "@/lib/ingest/bls-oews";
import { seedDataset } from "@/lib/data/seed";

const csvText = fs.readFileSync(
  path.join(process.cwd(), "tests/fixtures/oews-sample.csv"), "utf8");

const opts = {
  socCode: "47-2181",
  effectiveDate: "2025-05-01",
  collectedDate: "2026-08-30",
  serviceId: "svc-roofing",
  sourceId: "src-bls-oes",
  metros: seedDataset.metros,
  factors: seedDataset.pricingFactors,
};

describe("csv parser", () => {
  it("keeps commas inside quoted fields", () => {
    const rows = parseCsv('a,"Phoenix-Mesa-Chandler, AZ",c\n1,"x, y",3\n');
    expect(rows[0]).toEqual(["a", "Phoenix-Mesa-Chandler, AZ", "c"]);
    expect(rows[1]).toEqual(["1", "x, y", "3"]);
  });

  it("handles escaped quotes and a BOM", () => {
    const rows = parseCsv('﻿name,note\n"He said ""hi""",ok\n');
    expect(rows[0][0]).toBe("name");
    expect(rows[1][0]).toBe('He said "hi"');
  });

  it("reads the fixture into records keyed by header", () => {
    const records = parseCsvRecords(csvText);
    expect(records).toHaveLength(8);
    expect(records[0].AREA_TITLE).toBe("Phoenix-Mesa-Chandler, AZ");
    expect(records[0].H_MEDIAN).toBe("24.22");
  });
});

describe("BLS OEWS transform", () => {
  const rows = parseCsvRecords(csvText);
  const result = transformOewsRows(rows, opts);
  const byMetro = new Map(result.records.map((r) => [r.geoScopeId, r]));

  it("filters to the requested occupation only", () => {
    expect(result.totalRowsForOccupation).toBe(7); // 8 rows minus the electricians
  });

  it("joins on the CBSA code, tolerating zero padding, and ignores unknown areas", () => {
    expect(byMetro.has("metro-phx")).toBe(true);
    expect(byMetro.has("metro-san")).toBe(true); // AREA was "0041740"
    expect(result.records.some((r) => r.geoScopeId === "99999")).toBe(false);
  });

  it("converts a wage into a burdened crew cost using the state factor", () => {
    // Phoenix: 24.22 x 1.78 (Arizona burden)
    expect(byMetro.get("metro-phx")!.medianPrice).toBeCloseTo(24.22 * 1.78, 2);
    // Dallas: 22.51 x 1.68 (Texas - no mandatory workers' comp)
    expect(byMetro.get("metro-dfw")!.medianPrice).toBeCloseTo(22.51 * 1.68, 2);
    // Los Angeles: 29.15 x 1.95 (California)
    expect(byMetro.get("metro-lax")!.medianPrice).toBeCloseTo(29.15 * 1.95, 2);
  });

  it("applies a lower burden in Texas than in California", () => {
    const tx = resolveFactor(seedDataset.pricingFactors, "labor.burden_multiplier", { stateId: "us-tx" })!;
    const ca = resolveFactor(seedDataset.pricingFactors, "labor.burden_multiplier", { stateId: "us-ca" })!;
    expect(tx.multiplier).toBeLessThan(ca.multiplier);
  });

  it("falls back to the global burden for a state with no override", () => {
    const none = resolveFactor(seedDataset.pricingFactors, "labor.burden_multiplier", { stateId: "us-zz" })!;
    expect(none.geoScopeType).toBe("global");
    expect(none.multiplier).toBe(1.8);
  });

  it("uses the published 25th/75th percentiles for the range", () => {
    const phx = byMetro.get("metro-phx")!;
    expect(phx.lowPrice).toBeCloseTo(20.11 * 1.78, 2);
    expect(phx.highPrice).toBeCloseTo(29.85 * 1.78, 2);
    expect(phx.methodology).toMatch(/25th and 75th percentile/);
  });

  it("falls back to a modelled spread when a percentile is suppressed", () => {
    // San Diego has H_PCT75 = "#", so the high must be derived, not dropped.
    const san = byMetro.get("metro-san")!;
    expect(san.highPrice).toBeGreaterThan(san.medianPrice);
    expect(san.methodology).toMatch(/modelled spread/);
  });

  it("skips an area whose median wage is suppressed", () => {
    expect(byMetro.has("metro-lv")).toBe(false);
    expect(result.skipped.map((s) => s.areaTitle).join()).toMatch(/Las Vegas/);
  });

  it("labels the result modeled, never verified", () => {
    // The wage is BLS; the burden multiplier is ours. That is a derivation.
    for (const r of result.records) expect(r.dataStatus).toBe("modeled");
  });

  it("does not fold profit into the labour rate", () => {
    // Guards against the classic mistake of using a 2.5-3.0x 'burden' that
    // silently includes profit, which the engine then adds again.
    const phx = byMetro.get("metro-phx")!;
    expect(phx.medianPrice / 24.22).toBeLessThan(2.0);
    expect(phx.methodology).toMatch(/overhead and profit are applied separately/i);
  });

  it("carries full provenance on every row", () => {
    for (const r of result.records) {
      expect(r.sourceId).toBe("src-bls-oes");
      expect(r.effectiveDate).toBe("2025-05-01");   // the release period
      expect(r.collectedDate).toBe("2026-08-30");   // when we fetched it
      expect(r.geoScopeType).toBe("metro");
      expect(r.metricKey).toBe("labor.rate_per_hour");
      expect(r.sampleSize).toBeGreaterThan(0);
    }
  });
});
