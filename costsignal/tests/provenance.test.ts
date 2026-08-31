import { describe, expect, it } from "vitest";
import { JsonStore } from "@/lib/data/json-store";
import { buildEngineContext } from "@/lib/engine/context";
import { getEngine } from "@/lib/engine/registry";
import { hasRealLabourData, seedDataset } from "@/lib/data/seed";
import type { RoofingInput } from "@/lib/engine/roofing/schema";

const store = new JsonStore();
const engine = getEngine("roofing")!;

async function estimate(zip: string, partial: Partial<RoofingInput> = {}) {
  const ctx = (await buildEngineContext(store, "roofing", zip))!;
  const parsed = engine.parse({
    zip, areaMode: "roof", roofAreaSqft: 2000, material: "asphalt-architectural",
    stories: 2, pitch: "moderate", complexity: "moderate", existingLayers: 1, ...partial,
  });
  if (!parsed.ok) throw new Error(parsed.error);
  return engine.estimate(parsed.value, ctx);
}

/**
 * The BLS rates were once loaded through a `require` in a try/catch. Module
 * resolution failed under the test runner, the catch swallowed it, and every
 * estimate silently fell back to sample wages while still rendering as though
 * nothing was wrong. These tests exist so that can never happen quietly again:
 * if real labour data stops being in force, the suite says so.
 */
describe("real labour data is actually in force", () => {
  it("loads the generated BLS records", () => {
    expect(hasRealLabourData).toBe(true);
  });

  it("carries a BLS labour rate for every covered metro", () => {
    const bls = seedDataset.pricingRecords.filter(
      (r) => r.metricKey === "labor.rate_per_hour" && r.sourceId === "src-bls-oes");
    expect(bls.length).toBeGreaterThanOrEqual(10);
    expect(bls.every((r) => r.geoScopeType === "metro")).toBe(true);
    expect(bls.every((r) => r.dataStatus === "modeled")).toBe(true);
    for (const r of bls) {
      expect(seedDataset.metros.some((m) => m.id === r.geoScopeId)).toBe(true);
    }
  });

  it("retires the sample city labour rows that would otherwise outrank them", () => {
    const stale = seedDataset.pricingRecords.filter(
      (r) => r.metricKey === "labor.rate_per_hour"
        && r.geoScopeType === "city" && r.dataStatus === "sample");
    expect(stale).toHaveLength(0);
  });

  it("resolves labour from BLS at metro scope for a covered ZIP", async () => {
    const r = await estimate("85018");
    const labour = r.lineItems.filter((l) => l.component === "labor");
    expect(labour.length).toBeGreaterThan(0);
    for (const l of labour) {
      expect(l.sourceRef?.sourceId).toBe("src-bls-oes");
      expect(l.sourceRef?.scope).toBe("metro");
      expect(l.sourceRef?.dataStatus).toBe("modeled");
    }
  });
});

describe("estimate provenance", () => {
  it("attributes every priced line item to a source", async () => {
    const r = await estimate("85018");
    expect(r.lineItems.length).toBeGreaterThan(0);
    for (const l of r.lineItems) {
      expect(l.sourceRef, `${l.key} has no sourceRef`).toBeTruthy();
      expect(l.sourceRef!.sourceName).not.toBe(l.sourceRef!.sourceId);
      expect(l.sourceRef!.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("splits the estimate by source, weighted by money and summing to one", async () => {
    const r = await estimate("85018");
    expect(r.provenance.length).toBeGreaterThan(1);
    expect(r.provenance.reduce((a, e) => a + e.shareOfCost, 0)).toBeCloseTo(1, 9);
    expect(r.provenance.reduce((a, e) => a + e.lineItemCount, 0)).toBe(r.lineItems.length);

    const shares = r.provenance.map((e) => e.shareOfCost);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);

    const bls = r.provenance.find((e) => e.sourceId === "src-bls-oes")!;
    expect(bls.dataStatus).toBe("modeled");
    expect(bls.scope).toBe("metro");
    expect(bls.oldestEffectiveDate).toBe("2025-05-01");
    // Labour is a real share of a re-roof, not a rounding error.
    expect(bls.shareOfCost).toBeGreaterThan(0.15);
  });

  it("reports an uncovered ZIP as wholly sample data at country scope", async () => {
    const r = await estimate("02116");
    expect(r.provenance).toHaveLength(1);
    expect(r.provenance[0].dataStatus).toBe("sample");
    expect(r.provenance[0].scope).toBe("country");
    expect(r.provenance[0].shareOfCost).toBeCloseTo(1, 9);
  });

  it("keeps the oldest date and the finest scope when a source answers several rows", async () => {
    const r = await estimate("85018");
    for (const e of r.provenance) {
      const rows = r.lineItems.filter((l) => l.sourceRef?.sourceId === e.sourceId);
      const oldest = rows.map((l) => l.sourceRef!.effectiveDate).sort()[0];
      expect(e.oldestEffectiveDate).toBe(oldest);
      const order = ["zip", "city", "metro", "state", "country", "global"];
      const finest = rows.map((l) => order.indexOf(l.sourceRef!.scope)).sort((a, b) => a - b)[0];
      expect(order.indexOf(e.scope)).toBe(finest);
    }
  });
});
