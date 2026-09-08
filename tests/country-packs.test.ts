import { describe, expect, it } from "vitest";
import {
  getCountryPacks, packLevelLabel, packsContradictingActivation, publishablePacks,
} from "@/lib/country-packs";
import { seedDataset } from "@/lib/data/seed";

describe("country pack readiness", () => {
  it("grades every country and service pair, including the hopeless ones", () => {
    // A pack missing from this list cannot be checked before somebody
    // activates it, so absent countries are the failure this guards against.
    const packs = getCountryPacks();
    expect(packs).toHaveLength(seedDataset.countries.length * seedDataset.services.length);
    for (const c of seedDataset.countries) {
      expect(packs.some((p) => p.countryId === c.id)).toBe(true);
    }
  });

  it("refuses to publish a country with no priced rows", () => {
    // Canada and the UK are seeded to prove the model is not US-shaped. They
    // hold no prices, and a currency symbol on a US number is not a Canadian
    // estimate.
    for (const iso2 of ["CA", "GB"]) {
      const pack = getCountryPacks().find((p) => p.iso2 === iso2 && p.serviceSlug === "roofing")!;
      expect(pack.level).toBe("insufficient");
      expect(pack.publishable).toBe(false);
      expect(pack.missingComponents).toContain("labor");
      expect(pack.missingComponents).toContain("material");
    }
  });

  it("publishes only the packs that have data", () => {
    expect(publishablePacks().map((p) => `${p.iso2}/${p.serviceSlug}`)).toEqual(["US/roofing"]);
  });

  it("no active country lacks a publishable service", () => {
    // The whole risk of a country-pack plan is a flag switched on ahead of the
    // data because nine flags look better than one. That is a test failure
    // here rather than something to notice in production.
    expect(packsContradictingActivation()).toEqual([]);
  });

  it("counts a component backed by a public series as evidence, not as nothing", () => {
    // The first version had two buckets, verified and all-sample, so anything
    // in between counted as nothing: the US graded 0% observed while its
    // labour came from a BLS wage release. Honest data mostly lives in the
    // middle, and a grade that ignores the middle describes no real dataset.
    const us = getCountryPacks().find((p) => p.countryId === "us" && p.serviceSlug === "roofing")!;
    expect(us.modelledShare).toBeGreaterThan(0.5);
    expect(us.level).not.toBe("insufficient");
  });

  it("accounts for the whole job, with overhead named rather than dropped", () => {
    // Overhead is a markup on everything else, so it carries no priced row.
    // Counting it as a gap would cap every country below 90% forever; counting
    // it as good data would be flattery. The three grades describe the priced
    // part and must sum to it.
    const us = getCountryPacks().find((p) => p.countryId === "us" && p.serviceSlug === "roofing")!;
    expect(us.verifiedShare + us.modelledShare + us.sampleShare).toBeCloseTo(1, 6);
    expect(us.factorDrivenShare).toBeGreaterThan(0);
  });

  it("names the one thing most in the way", () => {
    const ca = getCountryPacks().find((p) => p.iso2 === "CA" && p.serviceSlug === "roofing")!;
    expect(ca.nextStep).toMatch(/cannot produce an estimate/);
    const us = getCountryPacks().find((p) => p.countryId === "us" && p.serviceSlug === "roofing")!;
    expect(us.nextStep).toMatch(/local market/);
  });

  it("labels every level", () => {
    for (const l of ["established", "developing", "limited", "insufficient"] as const) {
      expect(packLevelLabel(l).length).toBeGreaterThan(0);
    }
  });
});
