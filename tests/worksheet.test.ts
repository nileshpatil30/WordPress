import { describe, expect, it } from "vitest";
import { median, perSquare, summariseListings, type Listing } from "@/lib/ingest/worksheet";

const listing = (over: Partial<Listing> = {}): Listing => ({
  materialSlug: "asphalt-architectural",
  price: 42.97, coverageSqft: 33.33,
  store: "Home Depot", product: "GAF Timberline HDZ",
  url: "https://example.test/hdz", date: "2026-09-04",
  ...over,
});

describe("converting a shop listing to dollars per square", () => {
  it("turns a bundle price into a square price", () => {
    // Three bundles at 33.33 sq ft make 100 sq ft, so a square costs three
    // bundles. This is the arithmetic the worksheet exists to take off the
    // person reading the page.
    expect(perSquare(42.97, 33.33)).toBeCloseTo(128.92, 2);
    expect(perSquare(10, 100)).toBe(10);
  });

  it("handles packaging that is not a shingle bundle", () => {
    // A metal panel covering 24 sq ft is priced the same way; nothing in the
    // conversion assumes shingles.
    expect(perSquare(31.4, 24)).toBeCloseTo(130.83, 2);
  });

  it("takes the middle of an even number of listings", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([3, 1, 2])).toBe(2);
  });
});

describe("summarising several listings into a range", () => {
  it("uses the observed spread when there is one", () => {
    const out = summariseListings([
      listing({ price: 42.97 }), listing({ price: 46.25 }), listing({ price: 44.5 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].low).toBeCloseTo(perSquare(42.97, 33.33), 1);
    expect(out[0].high).toBeCloseTo(perSquare(46.25, 33.33), 1);
    expect(out[0].median).toBeCloseTo(perSquare(44.5, 33.33), 1);
    expect(out[0].sampleSize).toBe(3);
    expect(out[0].bandIsAssumed).toBe(false);
  });

  it("says so when the band is assumed rather than observed", () => {
    // One listing is a price, not a range. Publishing it as low=median=high
    // would be a false precision, and silently widening it would be worse.
    const [only] = summariseListings([listing()]);
    expect(only.bandIsAssumed).toBe(true);
    expect(only.low).toBeLessThan(only.median);
    expect(only.high).toBeGreaterThan(only.median);
    expect(only.notes).toMatch(/stated plus or minus/i);
    expect(only.notes).toMatch(/collect two more/i);
  });

  it("keeps every source, so any figure can be traced back", () => {
    const [m] = summariseListings([
      listing({ url: "https://a.test/1", store: "Home Depot" }),
      listing({ url: "https://b.test/2", store: "Lowes" }),
    ]);
    expect(m.urls).toContain("https://a.test/1");
    expect(m.urls).toContain("https://b.test/2");
    expect(m.stores).toBe("Home Depot, Lowes");
  });

  it("dates the group by its earliest observation", () => {
    // Freshness has to describe the oldest thing in the mix, not the newest.
    const [m] = summariseListings([
      listing({ date: "2026-09-04" }), listing({ date: "2026-08-20" }),
    ]);
    expect(m.date).toBe("2026-08-20");
  });

  it("groups by material and keeps them apart", () => {
    const out = summariseListings([
      listing({ materialSlug: "asphalt-3tab", price: 33.1 }),
      listing({ materialSlug: "asphalt-architectural", price: 42.97 }),
    ]);
    expect(out.map((m) => m.materialSlug)).toEqual(["asphalt-3tab", "asphalt-architectural"]);
    expect(out[0].median).toBeLessThan(out[1].median);
  });

  it("refuses a listing that cannot be converted", () => {
    expect(() => summariseListings([listing({ coverageSqft: 0 })])).toThrow(/coverage/i);
    expect(() => summariseListings([listing({ price: 0 })])).toThrow(/price/i);
  });
});
