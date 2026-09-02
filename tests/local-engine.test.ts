import { describe, expect, it } from "vitest";
import { JsonStore } from "@/lib/data/json-store";
import { buildEngineContext } from "@/lib/engine/context";
import { getEngine } from "@/lib/engine/registry";
import { buildLocalContext, estimateLocally } from "@/lib/engine/local";

const store = new JsonStore();
const engine = getEngine("roofing")!;

const CASES: Record<string, unknown>[] = [
  { zip: "85018", areaMode: "roof", roofAreaSqft: 2000, material: "asphalt-architectural", stories: 2, pitch: "moderate", complexity: "moderate", existingLayers: 1 },
  { zip: "07102", areaMode: "roof", roofAreaSqft: 2400, material: "metal-standing-seam", stories: 2, pitch: "steep", complexity: "complex", existingLayers: 2 },
  { zip: "02116", areaMode: "house", houseSqft: 1800, stories: 1, material: "asphalt-3tab", pitch: "low", complexity: "simple", existingLayers: 1 },
  { zip: "33133", areaMode: "roof", roofAreaSqft: 3000, material: "concrete-tile", projectType: "tile-underlayment", stories: 1, pitch: "moderate", complexity: "moderate", existingLayers: 1 },
  // Uncovered ZIP: must fall back nationally on both paths, identically.
  { zip: "59718", areaMode: "roof", roofAreaSqft: 2000, material: "asphalt-architectural", stories: 2, pitch: "moderate", complexity: "moderate", existingLayers: 1 },
];

/**
 * The browser path and the server path must agree exactly.
 *
 * The calculator prices in the browser so the site can be served as static
 * files, while `/api/estimate` still exists for deployments with a server. Two
 * code paths producing two different numbers for the same house would be worse
 * than having no calculator at all - a homeowner comparing a shared link
 * against a fresh calculation would catch it immediately and rightly stop
 * trusting everything else on the page.
 */
describe("browser engine matches server engine", () => {
  it.each(CASES.map((c) => [String(c.zip), c] as const))(
    "produces an identical estimate for %s", async (_zip, input) => {
      const ctx = (await buildEngineContext(store, "roofing", String(input.zip)))!;
      const parsed = engine.parse(input);
      if (!parsed.ok) throw new Error(parsed.error);
      const server = engine.estimate(parsed.value, ctx);

      const local = estimateLocally(input, "roofing");
      expect(local.ok, local.ok ? "" : (local as { error: string }).error).toBe(true);
      if (!local.ok) return;

      // Whole-object equality, not a spot check on the headline number: the
      // breakdown, provenance, confidence and assumptions are all shown to the
      // user and all have to match.
      expect(local.estimate).toEqual(server);
    });

  it("resolves the same geography, including the national fallback", async () => {
    for (const zip of ["85018", "07102", "59718"]) {
      const server = (await buildEngineContext(store, "roofing", zip))!;
      const local = buildLocalContext("roofing", zip)!;
      expect(local.geo.city?.id).toBe(server.geo.city?.id);
      expect(local.geo.state?.id).toBe(server.geo.state?.id);
      expect(local.geo.isFallback).toBe(server.geo.isFallback);
      expect(local.geo.label).toBe(server.geo.label);
    }
  });

  it("sees the same pricing rows the server does", async () => {
    const server = (await buildEngineContext(store, "roofing", "85018"))!;
    const local = buildLocalContext("roofing", "85018")!;
    expect(local.records.length).toBe(server.records.length);
    expect(local.factors.length).toBe(server.factors.length);
    expect(local.materials.length).toBe(server.materials.length);
    // Including the real BLS labour rows, which are the point of the whole
    // geographic chain.
    expect(local.records.filter((r) => r.sourceId === "src-bls-oes").length)
      .toBe(server.records.filter((r) => r.sourceId === "src-bls-oes").length);
  });

  it("reports errors rather than throwing on bad input", () => {
    expect(estimateLocally({ zip: "not-a-zip" }, "roofing").ok).toBe(false);
    expect(estimateLocally({}, "roofing").ok).toBe(false);
    const unknown = estimateLocally({ zip: "85018" }, "solar");
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error).toMatch(/not live/i);
  });
});
