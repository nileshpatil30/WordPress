import { describe, expect, it } from "vitest";
import { JsonStore } from "@/lib/data/json-store";
import { buildEngineContext } from "@/lib/engine/context";
import { getEngine } from "@/lib/engine/registry";
import { seedDataset } from "@/lib/data/seed";

const store = new JsonStore();
const engine = getEngine("roofing")!;

async function estimate(zip: string) {
  const ctx = (await buildEngineContext(store, "roofing", zip))!;
  const parsed = engine.parse({
    zip, areaMode: "roof", roofAreaSqft: 2000, material: "asphalt-architectural",
    stories: 2, pitch: "moderate", complexity: "moderate", existingLayers: 1,
  });
  if (!parsed.ok) throw new Error(parsed.error);
  return { ctx, result: engine.estimate(parsed.value, ctx) };
}

const NORTHEAST_CITIES = [
  "city-newark", "city-jersey-city", "city-cherry-hill",
  "city-philadelphia", "city-boston",
];

/**
 * The Northeast rows are data preparation, not a launch. The whole approach
 * depends on one separation holding: `resolveGeo` answers pricing questions and
 * ignores publication, while `isPublished` / `pageEligible` gate what Google can
 * see. If that separation ever breaks, we either ship thin pages we promised not
 * to ship, or we quietly stop serving real wages to the calculator.
 */
describe("Northeast coverage: real pricing, no pages", () => {
  it("resolves a Newark ZIP to the New York metro with BLS wage data", async () => {
    const { ctx, result } = await estimate("07102");

    expect(ctx.geo.isFallback).toBe(false);
    expect(ctx.geo.city?.id).toBe("city-newark");
    // Newark is in the New York metro but the state of New Jersey. The chain
    // has to read those independently or it gets one of them wrong.
    expect(ctx.geo.city?.metroId).toBe("metro-nyc");
    expect(ctx.geo.state?.code).toBe("NJ");

    const labour = result.lineItems.filter((l) => l.component === "labor");
    expect(labour.length).toBeGreaterThan(0);
    for (const l of labour) {
      expect(l.sourceRef?.sourceId).toBe("src-bls-oes");
      expect(l.sourceRef?.scope).toBe("metro");
    }
  });

  it.each([
    ["07302", "city-jersey-city", "metro-nyc", "NJ"],
    ["08002", "city-cherry-hill", "metro-phl", "NJ"],
    ["19103", "city-philadelphia", "metro-phl", "PA"],
    ["02116", "city-boston", "metro-bos", "MA"],
  ])("resolves %s to %s at metro scope", async (zip, cityId, metroId, stateCode) => {
    const { ctx, result } = await estimate(zip);
    expect(ctx.geo.isFallback).toBe(false);
    expect(ctx.geo.city?.id).toBe(cityId);
    expect(ctx.geo.city?.metroId).toBe(metroId);
    expect(ctx.geo.state?.code).toBe(stateCode);
    expect(result.provenance.some((p) => p.sourceId === "src-bls-oes")).toBe(true);
  });

  it("prices Northeast labour above Phoenix, as the wage data says it should", async () => {
    const nyc = await estimate("07102");
    const phx = await estimate("85018");
    const labourOf = (r: Awaited<ReturnType<typeof estimate>>) =>
      r.result.subtotals.find((s) => s.component === "labor")!.typical;

    // BLS median for SOC 47-2181 is materially higher in the New York metro
    // than in Phoenix. If this ever inverts, the geo chain is picking the wrong
    // row rather than the labour market having changed.
    expect(labourOf(nyc)).toBeGreaterThan(labourOf(phx));
  });

  it("publishes every Northeast city, each with its own local editorial", () => {
    // These shipped unpublished first, as pricing-only data preparation. They
    // are published now because the editorial exists - which is the order rule
    // R1 requires, and the reason this test changed rather than being deleted.
    for (const id of NORTHEAST_CITIES) {
      const city = seedDataset.cities.find((c) => c.id === id);
      expect(city, `${id} missing from the seed`).toBeTruthy();
      expect(city!.isPublished, `${id} should be published`).toBe(true);
      expect(city!.content, `${id} is published with no content`).toBeTruthy();
      expect(city!.content!.localFactors.length,
        `${id} needs at least three local factors`).toBeGreaterThanOrEqual(3);
      expect(city!.content!.faqs.length, `${id} needs FAQs`).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives each Northeast city genuinely different editorial", () => {
    // The failure mode this guards is a templated page with the city name
    // swapped in. Newark and Cherry Hill are both New Jersey and both ours, and
    // they are different roofing markets; the copy has to reflect that.
    const summaries = NORTHEAST_CITIES.map((id) =>
      seedDataset.cities.find((c) => c.id === id)!.content!.summary);
    expect(new Set(summaries).size).toBe(NORTHEAST_CITIES.length);
    for (const s of summaries) expect(s.length).toBeGreaterThan(400);

    const titles = NORTHEAST_CITIES.flatMap((id) =>
      seedDataset.cities.find((c) => c.id === id)!.content!.localFactors.map((f) => f.title));
    // Some overlap between neighbouring markets is honest; wholesale reuse is not.
    expect(new Set(titles).size).toBeGreaterThan(titles.length * 0.8);
  });

  it("never publishes a city that has no local editorial", () => {
    // The general rule, not just for the Northeast: publication requires
    // content. This is the line between useful programmatic SEO and the
    // mass-generated kind.
    for (const city of seedDataset.cities) {
      if (city.isPublished) {
        expect(city.content, `${city.id} is published with no content`).toBeTruthy();
        expect(city.content!.summary.length).toBeGreaterThan(200);
      }
    }
  });

  it("gives every covered metro a BLS labour row", () => {
    const metroIds = new Set(
      seedDataset.cities.filter((c) => c.metroId).map((c) => c.metroId!));
    const priced = new Set(
      seedDataset.pricingRecords
        .filter((r) => r.sourceId === "src-bls-oes" && r.metricKey === "labor.rate_per_hour")
        .map((r) => r.geoScopeId));

    for (const id of metroIds) {
      expect(priced.has(id), `${id} has a city but no BLS labour row`).toBe(true);
    }
  });
});
