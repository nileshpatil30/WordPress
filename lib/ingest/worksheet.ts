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
  /** What was on the page, e.g. 42.97. */
  price: number;
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
    const vals = group.map((l) => perSquare(l.price, l.coverageSqft));
    const mid = median(vals);
    const stores = [...new Set(group.map((l) => l.store))];
    const describe = (l: Listing) =>
      `${l.store} ${l.product} at $${l.price}/unit covering ${l.coverageSqft} sq ft`;

    // The floor wins wherever the listings are too alike to describe a market.
    const floorLow = mid * (1 - MIN_BAND);
    const floorHigh = mid * (1 + MIN_BAND);
    const low = Math.min(...vals, floorLow);
    const high = Math.max(...vals, floorHigh);
    const bandIsAssumed = low === floorLow || high === floorHigh;

    const spreadPct = Math.round((Math.max(...vals) / Math.min(...vals) - 1) * 1000) / 10;
    const source = group.length === 1
      ? `Converted from a single retail listing: ${describe(group[0])}.`
      : `Converted from ${group.length} retail listings: ${group.map(describe).join("; ")}.`;
    const bandNote = bandIsAssumed
      ? ` Those listings span ${spreadPct}%, which is too narrow to describe a market`
        + `${stores.length === 1 ? " and they are all from one retailer" : ""}, so the published band is a `
        + `stated plus or minus ${MIN_BAND * 100}% instead of the observed spread. More products, and `
        + `ideally a second retailer or a distributor quote, would replace it with a real one.`
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
      bandIsAssumed,
      notes: source + bandNote,
    };
  });
}
