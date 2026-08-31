import { describe, expect, it } from "vitest";
import {
  seasonalGuidance, seasonalProfile, type Month,
} from "@/lib/seasonality";
import { seedDataset } from "@/lib/data/seed";

const at = (month: Month) => new Date(Date.UTC(2026, month - 1, 15));
const allMonths = [1,2,3,4,5,6,7,8,9,10,11,12] as Month[];

describe("regional seasonal profiles", () => {
  it("gives every published city a metro-specific profile, not the default", () => {
    // A city falling through to the continental default would render generic
    // "spring through autumn" copy under a specific city name - exactly the
    // templated local page this project exists not to build.
    for (const city of seedDataset.cities) {
      const p = seasonalProfile({ metroId: city.metroId, stateId: city.stateId });
      expect(p.installWindow.length, `${city.id} has no install window`).toBeGreaterThan(0);
      expect(p.driver.length, `${city.id} has no driver sentence`).toBeGreaterThan(20);
    }
  });

  it("puts Phoenix and Boston peaks in opposite halves of the year", () => {
    // The whole reason this module exists: a national seasonality line is wrong
    // for most of the country.
    const phx = seasonalProfile({ metroId: "metro-phx" });
    const bos = seasonalProfile({ metroId: "metro-bos" });
    expect(phx.installWindow).toContain(1);    // January: comfortable in Phoenix
    expect(phx.installWindow).not.toContain(7); // July: not
    expect(bos.installWindow).toContain(7);     // July: comfortable in Boston
    expect(bos.installWindow).not.toContain(1); // January: not
  });

  it("treats Phoenix summer as soft pricing rather than peak", () => {
    const g = seasonalGuidance(seasonalProfile({ metroId: "metro-phx" }), "Phoenix", at(7));
    expect(g.stance).toBe("off-window");
    expect(g.headline).toContain("July");
    expect(g.headline).toContain("Phoenix");
  });

  it("surfaces the local storm season only inside it", () => {
    const dfw = seasonalProfile({ metroId: "metro-dfw" });
    expect(seasonalGuidance(dfw, "Dallas", at(4)).stormNote).toMatch(/hail/i);
    expect(seasonalGuidance(dfw, "Dallas", at(12)).stormNote).toBeUndefined();

    const mia = seasonalProfile({ metroId: "metro-mia" });
    expect(seasonalGuidance(mia, "Miami", at(9)).stormNote).toMatch(/hurricane/i);
    expect(seasonalGuidance(mia, "Miami", at(2)).stormNote).toBeUndefined();
  });

  it("falls back metro to state to default, like the pricing chain", () => {
    expect(seasonalProfile({ metroId: "metro-phx" }).installWindow).not.toContain(7);
    // No metro, but a desert state: still gets the desert profile.
    expect(seasonalProfile({ stateId: "us-az" }).installWindow).not.toContain(7);
    // Neither: the continental default, which does include July.
    expect(seasonalProfile({}).installWindow).toContain(7);
  });

  it("produces a distinct, non-empty message for every month in every metro", () => {
    const metros = [...new Set(seedDataset.cities.map((c) => c.metroId).filter(Boolean))];
    for (const metroId of metros) {
      const profile = seasonalProfile({ metroId: metroId as string });
      const seen = new Set<string>();
      for (const m of allMonths) {
        const g = seasonalGuidance(profile, "Testville", at(m));
        expect(g.headline).toContain(g.monthLabel);
        expect(g.detail.length).toBeGreaterThan(40);
        seen.add(g.headline);
      }
      // Twelve months must not collapse into one message, or the page has not
      // really changed and the lastmod date would be a lie.
      expect(seen.size, `${metroId} says the same thing all year`).toBeGreaterThan(1);
    }
  });

  it("never claims a month is both peak and softest pricing", () => {
    const metros = [...new Set(seedDataset.cities.map((c) => c.metroId).filter(Boolean))];
    for (const metroId of metros) {
      const p = seasonalProfile({ metroId: metroId as string });
      const overlap = p.peakDemand.filter((m) => p.softestPricing.includes(m));
      expect(overlap, `${metroId} contradicts itself`).toEqual([]);
    }
  });
});
