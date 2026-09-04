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

/** One listing gives a price, not a range. Widen by a stated amount and say so. */
export const SINGLE_LISTING_BAND = 0.1;

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
    const single = group.length === 1;
    const describe = (l: Listing) =>
      `${l.store} ${l.product} at $${l.price}/unit covering ${l.coverageSqft} sq ft`;

    return {
      materialSlug: slug,
      low: round2(single ? mid * (1 - SINGLE_LISTING_BAND) : Math.min(...vals)),
      median: round2(mid),
      high: round2(single ? mid * (1 + SINGLE_LISTING_BAND) : Math.max(...vals)),
      sampleSize: group.length,
      stores: [...new Set(group.map((l) => l.store))].join(", "),
      urls: [...new Set(group.map((l) => l.url))].join(" | "),
      date: group.map((l) => l.date).sort()[0],
      bandIsAssumed: single,
      notes: single
        ? `Converted from a single retail listing: ${describe(group[0])}. One listing gives a price, `
          + `not a range, so the band is a stated plus or minus ${SINGLE_LISTING_BAND * 100}% rather than `
          + `an observed spread. Collect two more products for this material to replace it with a real one.`
        : `Converted from ${group.length} retail listings: ${group.map(describe).join("; ")}. `
          + `Range is the observed spread across those listings.`,
    };
  });
}
