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

  it("resolves an uncovered ZIP entirely at country scope", async () => {
    // Deliberately far outside any metro we cover. If coverage ever reaches
    // Montana this test will fail loudly rather than quietly asserting nothing
    // - which is exactly what happened when Boston moved from uncovered to
    // covered and this case was still pointing at 02116.
    //
    // It used to assert one source and wholly sample data. That stopped being
    // true when observed material prices arrived: they are national, so they
    // reach Montana like everywhere else, and the estimate is now a mix. The
    // claim worth guarding was never "all sample" - it is that an uncovered
    // ZIP gets nothing finer than country scope, whatever the data quality.
    const ctx = (await buildEngineContext(store, "roofing", "59718"))!;
    expect(ctx.geo.isFallback, "59718 was expected to be uncovered").toBe(true);

    const r = await estimate("59718");
    expect(r.provenance.every((p) => p.scope === "country")).toBe(true);
    expect(r.provenance.map((p) => p.shareOfCost).reduce((a, b) => a + b, 0))
      .toBeCloseTo(1, 9);
    // Nothing here may claim to be verified: no local data exists for it.
    expect(r.provenance.some((p) => p.dataStatus === "verified")).toBe(false);
    // And the sample rows have not silently vanished - twelve materials plus
    // most component rows are still modelled from nothing.
    expect(r.provenance.some((p) => p.dataStatus === "sample")).toBe(true);
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

/**
 * The rule the whole project rests on, made mechanical.
 *
 * A licensed cost database or a competitor's published guide may inform our
 * work and may never become our published dataset. That has been enforced by
 * convention and by the benchmark rejection in the materials ingester. A
 * licence breach is not something to catch in code review, so it is enforced
 * here instead: fail closed, and treat anything not explicitly cleared as not
 * publishable.
 */
describe("no source we cannot redistribute reaches a published price", () => {
  const byId = new Map(seedDataset.pricingSources.map((s) => [s.id, s]));

  it("declares a licence and a redistribution decision for every source", () => {
    for (const s of seedDataset.pricingSources) {
      expect(s.license, `${s.id} must state its licence`).toBeTruthy();
      expect(typeof s.redistributable, `${s.id} must decide redistributability`)
        .toBe("boolean");
    }
  });

  it("backs every priced record with a redistributable source", () => {
    for (const r of seedDataset.pricingRecords) {
      const source = byId.get(r.sourceId);
      expect(source, `record ${r.id} cites unknown source ${r.sourceId}`).toBeTruthy();
      expect(source!.redistributable, `record ${r.id} is backed by ${r.sourceId}`)
        .toBe(true);
    }
  });

  it("backs every index series with a redistributable source", () => {
    for (const s of seedDataset.priceIndexSeries) {
      expect(byId.get(s.sourceId)?.redistributable, `series ${s.id}`).toBe(true);
    }
  });

  it("keeps the licensed cost book and ODbL data out of the published set", () => {
    // Named explicitly, because these are the two that would actually cost us
    // something: RSMeans is licensed for producing estimates rather than for
    // republication, and OSM carries share-alike obligations on derived
    // databases that we have not taken legal advice on.
    for (const id of ["src-licensed-costbook", "src-osm"]) {
      const source = byId.get(id)!;
      expect(source.redistributable).toBe(false);
      expect(seedDataset.pricingRecords.some((r) => r.sourceId === id)).toBe(false);
    }
  });

  it("does not surface a non-redistributable source in an estimate", async () => {
    const r = await estimate("85018");
    for (const p of r.provenance) {
      expect(byId.get(p.sourceId)?.redistributable, p.sourceId).toBe(true);
    }
  });
});
