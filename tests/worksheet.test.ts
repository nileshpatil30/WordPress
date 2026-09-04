import { describe, expect, it } from "vitest";
import { MIN_BAND, median, perSquare, summariseListings, type Listing } from "@/lib/ingest/worksheet";

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
  it("takes the median from the listings even when the floor sets the band", () => {
    // These three span 7.6%, which is real and still narrower than the floor,
    // so the band widens while the centre stays exactly where the listings put
    // it. This test used to assert the observed spread won; it did not, and
    // that was the assumption worth correcting rather than the assertion.
    const out = summariseListings([
      listing({ price: 42.97 }), listing({ price: 46.25 }), listing({ price: 44.5 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].median).toBeCloseTo(perSquare(44.5, 33.33), 1);
    expect(out[0].sampleSize).toBe(3);
    expect(out[0].bandIsAssumed).toBe(true);
    expect(out[0].low).toBeLessThan(perSquare(42.97, 33.33));
    expect(out[0].high).toBeGreaterThan(perSquare(46.25, 33.33));
  });

  it("prefers a volume price over the shelf price", () => {
    // The shelf price needs a modelled discount before it means anything. A
    // publicly listed volume price is what a contractor buying for a job
    // actually pays, so it goes in as observed and skips the assumption.
    const [m] = summariseListings([
      listing({ price: 42.97, bulkPrice: 35.97, bulkQty: 36 }),
      listing({ price: 40.97, bulkPrice: 34.5, bulkQty: 36 }),
    ]);
    expect(m.channel).toBe("retail_bulk");
    expect(m.median).toBeCloseTo(perSquare((35.97 + 34.5) / 2, 33.33), 1);
    expect(m.notes).toMatch(/volume-priced/i);
    expect(m.notes).toMatch(/buying 36\+/);
  });

  it("will not average a volume price together with a shelf price", () => {
    // Mixing the two is not a range, it is two channels averaged into one
    // number that describes neither.
    const [m] = summariseListings([
      listing({ price: 42.97, bulkPrice: 35.97, bulkQty: 36 }),
      listing({ price: 40.97 }),
    ]);
    expect(m.channel).toBe("retail");
    expect(m.median).toBeCloseTo(perSquare((42.97 + 40.97) / 2, 33.33), 1);
  });

  it("names what a partly collected group is still missing", () => {
    // The shape that turned up in real collection: four of five architectural
    // listings had a pallet price, so the rule discarded all four and the
    // output was byte-identical to the run before anyone did the work. The
    // rule is right; saying nothing about it is not.
    const [m] = summariseListings([
      listing({ product: "Timberline HDZ", price: 42.97, bulkPrice: 38.67, bulkQty: 39 }),
      listing({ product: "Oakridge", price: 40.97, bulkPrice: 36.87, bulkQty: 39 }),
      listing({ product: "Timberline HDZ (Lowe's)", store: "Lowe's", price: 51.98 }),
    ]);
    expect(m.channel).toBe("retail");
    expect(m.unusedBulkFrom).toEqual(["Timberline HDZ", "Oakridge"]);
    expect(m.missingBulkFrom).toEqual(["Timberline HDZ (Lowe's)"]);
  });

  it("says nothing about volume pricing when the group is all or nothing", () => {
    // Both settled states are silent: a fully collected group uses the volume
    // prices, and a group with none was never going to. Reporting on either
    // would be noise on every run.
    const [none] = summariseListings([listing({ price: 42.97 }), listing({ price: 40.97 })]);
    expect(none.unusedBulkFrom).toEqual([]);
    expect(none.missingBulkFrom).toEqual([]);

    const [all] = summariseListings([
      listing({ price: 42.97, bulkPrice: 38.67, bulkQty: 39 }),
      listing({ price: 40.97, bulkPrice: 36.87, bulkQty: 39 }),
    ]);
    expect(all.channel).toBe("retail_bulk");
    expect(all.unusedBulkFrom).toEqual([]);
  });

  it("refuses to call identical listings a range", () => {
    // Three colours of one product line at one store are three listings and one
    // price. The observed spread is zero, and publishing low = median = high
    // would read as certainty. This is the case that actually turned up in real
    // collected data - GAF Royal Sovereign in three colours, all $38.97.
    const [m] = summariseListings([
      listing({ price: 38.97 }), listing({ price: 38.97 }), listing({ price: 38.97 }),
    ]);
    expect(m.sampleSize).toBe(3);
    expect(m.bandIsAssumed).toBe(true);
    expect(m.low).toBeLessThan(m.median);
    expect(m.high).toBeGreaterThan(m.median);
    expect(m.notes).toMatch(/too narrow to describe a market/i);
  });

  it("does not call a real spread too narrow just because the floor touched it", () => {
    // Five listings spanning 25% across two retailers describe a market. The
    // median sits near the bottom of them, so the floor still extends the low
    // side - but the note must say that, not claim the data was inadequate.
    // This is the real collected shape: four Home Depot listings around $125
    // and one Lowe's at $156.
    const [m] = summariseListings([
      listing({ price: 42.97 }), listing({ price: 42.97 }),
      listing({ price: 40.97 }), listing({ price: 40.97 }),
      listing({ price: 51.98, store: "Lowe's" }),
    ]);
    expect(m.bandIsAssumed).toBe(false);
    expect(m.notes).toMatch(/which is a real spread/i);
    expect(m.notes).toMatch(/extended on the low side/i);
    expect(m.notes).not.toMatch(/too narrow/i);
    expect(m.high).toBeCloseTo(perSquare(51.98, 33.33), 1);
  });

  it("keeps the floor when the observed spread is narrower than it", () => {
    // A 3% spread is real and still narrower than any material market.
    const [m] = summariseListings([
      listing({ price: 40 }), listing({ price: 41.2 }),
    ]);
    expect(m.bandIsAssumed).toBe(true);
    expect(m.low).toBeCloseTo(m.median * (1 - MIN_BAND), 2);
    expect(m.high).toBeCloseTo(m.median * (1 + MIN_BAND), 2);
  });

  it("uses the observed spread once it is wider than the floor", () => {
    const [m] = summariseListings([
      listing({ price: 30 }), listing({ price: 60 }), listing({ price: 45 }),
    ]);
    expect(m.bandIsAssumed).toBe(false);
    expect(m.low).toBeCloseTo(perSquare(30, 33.33), 1);
    expect(m.high).toBeCloseTo(perSquare(60, 33.33), 1);
    expect(m.notes).toMatch(/observed spread/i);
  });

  it("says when everything came from one retailer", () => {
    const [one] = summariseListings([listing({ price: 30 }), listing({ price: 60 })]);
    expect(one.notes).toMatch(/one retailer/i);
    const [two] = summariseListings([
      listing({ price: 30, store: "Home Depot" }), listing({ price: 60, store: "Lowes" }),
    ]);
    expect(two.notes).not.toMatch(/one retailer/i);
  });

  it("says so when the band is assumed rather than observed", () => {
    // One listing is a price, not a range. Publishing it as low=median=high
    // would be a false precision, and silently widening it would be worse.
    const [only] = summariseListings([listing()]);
    expect(only.bandIsAssumed).toBe(true);
    expect(only.low).toBeLessThan(only.median);
    expect(only.high).toBeGreaterThan(only.median);
    expect(only.notes).toMatch(/stated plus or minus/i);
    expect(only.notes).toMatch(/single retail listing/i);
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
