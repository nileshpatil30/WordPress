/**
 * Turn shop listings into dollars per roofing square.
 *
 * Pure transform, no I/O, so the arithmetic that everything downstream rests on
 * can be tested. The collection worksheet asks for one number per row - the
 * price on the page - and this does the conversion and the aggregation, because
 * knowing that a bundle covers 33.33 sq ft and that three make a square is
 * exactly the judgement that should not sit with whoever is reading the page.
 */

export interface Listing {
  materialSlug: string;
  /** What was on the page for a single unit, e.g. 42.97. */
  price: number;
  /**
   * The retailer's publicly listed volume price, where it shows one - e.g.
   * "$35.97 each when you buy 36 or more". Preferred over the shelf price when
   * present, because it is what a contractor buying for a job actually pays,
   * and it needs no modelled discount on top.
   */
  bulkPrice?: number;
  /** How many units the volume price starts at, recorded for the provenance. */
  bulkQty?: number;
  /** What that price buys, in square feet. A shingle bundle is 33.33. */
  coverageSqft: number;
  store: string;
  product: string;
  url: string;
  /** YYYY-MM-DD, the day it was read. */
  date: string;
}

export interface MaterialRange {
  materialSlug: string;
  low: number;
  median: number;
  high: number;
  sampleSize: number;
  stores: string;
  urls: string;
  /** Earliest observation date in the group. */
  date: string;
  notes: string;
  /** True when the band is a stated assumption rather than an observed spread. */
  bandIsAssumed: boolean;
  /**
   * Which channel these prices came from. `retail_bulk` when every listing had
   * a volume price, `retail` otherwise - mixing the two in one range would
   * average two different channels together.
   */
  channel: "retail" | "retail_bulk";
}

/** A roofing square is 100 sq ft, whatever the packaging happens to be. */
export const perSquare = (price: number, coverageSqft: number) =>
  (price / coverageSqft) * 100;

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The narrowest band we will publish from shop listings, as a fraction either
 * side of the median.
 *
 * Listings read from one retailer on one day cannot describe market variation,
 * however many of them there are. Three colours of the same product line are
 * three listings and one price - the observed spread is zero, and publishing
 * low = median = high would read as certainty. Even a genuine spread across two
 * product lines at one store is narrower than the market.
 *
 * So this is a floor, not a replacement: the wider of the observed spread and
 * this. When the floor wins, the row says the band is assumed rather than
 * observed, and the engine widens it again for model uncertainty on top.
 */
export const MIN_BAND = 0.1;

export function summariseListings(listings: Listing[]): MaterialRange[] {
  const byMaterial = new Map<string, Listing[]>();
  for (const l of listings) {
    if (!(l.coverageSqft > 0)) throw new Error(`${l.materialSlug}: coverage must be positive`);
    if (!(l.price > 0)) throw new Error(`${l.materialSlug}: price must be positive`);
    byMaterial.set(l.materialSlug, [...(byMaterial.get(l.materialSlug) ?? []), l]);
  }

  return [...byMaterial].sort(([a], [b]) => a.localeCompare(b)).map(([slug, group]) => {
    // Use volume pricing only when every listing has it. A range that mixes a
    // shelf price with a bulk one is not a range, it is two channels averaged.
    const allBulk = group.every((l) => (l.bulkPrice ?? 0) > 0);
    const priceOf = (l: Listing) => (allBulk ? l.bulkPrice! : l.price);
    const vals = group.map((l) => perSquare(priceOf(l), l.coverageSqft));
    const mid = median(vals);
    const stores = [...new Set(group.map((l) => l.store))];
    const describe = (l: Listing) => allBulk
      ? `${l.store} ${l.product} at $${l.bulkPrice}/unit buying ${l.bulkQty ?? "bulk"}+, covering ${l.coverageSqft} sq ft each`
      : `${l.store} ${l.product} at $${l.price}/unit covering ${l.coverageSqft} sq ft`;

    // The floor wins wherever the listings are too alike to describe a market.
    const floorLow = mid * (1 - MIN_BAND);
    const floorHigh = mid * (1 + MIN_BAND);
    const low = Math.min(...vals, floorLow);
    const high = Math.max(...vals, floorHigh);
    // "Assumed" means the data was too narrow to describe a market - not
    // merely that the floor touched one side of an otherwise real spread.

    const spreadPct = Math.round((Math.max(...vals) / Math.min(...vals) - 1) * 1000) / 10;
    // The floor can extend one side of a perfectly good spread - a median
    // sitting near the bottom of the observed range does that. Saying the
    // listings were "too narrow to describe a market" in that case would be
    // false, so distinguish the two.
    const spreadTooNarrow = spreadPct < MIN_BAND * 200;
    const extended = [
      low === floorLow ? "low" : null, high === floorHigh ? "high" : null,
    ].filter(Boolean);

    const kind = allBulk ? "volume-priced listing" : "retail listing";
    const source = group.length === 1
      ? `Converted from a single ${kind}: ${describe(group[0])}.`
      : `Converted from ${group.length} ${kind}s: ${group.map(describe).join("; ")}.`;

    const bandNote = spreadTooNarrow
      ? ` Those listings span ${spreadPct}%, which is too narrow to describe a market`
        + `${stores.length === 1 ? " and they are all from one retailer" : ""}, so the published band is a `
        + `stated plus or minus ${MIN_BAND * 100}% instead of the observed spread. More products, and `
        + `ideally a second retailer or a distributor quote, would replace it with a real one.`
      : extended.length
        ? ` The listings span ${spreadPct}% across ${stores.length} retailer${stores.length === 1 ? "" : "s"}, `
          + `which is a real spread; the band is extended on the ${extended.join(" and ")} side`
          + `${extended.length > 1 ? "s" : ""} to a stated minimum of plus or minus ${MIN_BAND * 100}% `
          + `around the median, because the median does not sit in the middle of the observed prices.`
        : ` Range is the observed spread across those listings`
          + `${stores.length === 1 ? ", all from one retailer" : ""}.`;

    return {
      materialSlug: slug,
      low: round2(low),
      median: round2(mid),
      high: round2(high),
      sampleSize: group.length,
      stores: stores.join(", "),
      urls: [...new Set(group.map((l) => l.url))].join(" | "),
      date: group.map((l) => l.date).sort()[0],
      bandIsAssumed: spreadTooNarrow,
      channel: allBulk ? "retail_bulk" : "retail",
      notes: source + bandNote,
    };
  });
}
