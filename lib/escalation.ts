import type {
  CostComponent, PriceIndexPoint, PriceIndexSeries, PricingRecord,
} from "@/lib/types";

/**
 * Carry an anchored price forward with a published index.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * A material price has three separable parts, and they cost completely
 * different amounts to obtain:
 *
 *   level        "architectural shingles are $X a square"   - effort
 *   escalation   "$X in June is $X x 1.06 now"              - free, public domain
 *   geography    "Dallas to Boston is x1.07"                - free, public domain
 *
 * A licensed cost database sells all three bundled. We only ever have to source
 * the first one ourselves, because the other two are US federal statistics.
 *
 * An index gives you the DERIVATIVE, not the level. WPU1361 = 347.114 means
 * nothing in dollars. What it means is that a price anchored in June 2026 can be
 * carried forward exactly, forever, for nothing - which is why a 2026 anchor
 * plus a live index is worth more in 2028 than a licensed 2026 price table.
 *
 * Anchor once, escalate free. See docs/materials-data-sources.md.
 *
 * ---------------------------------------------------------------------------
 * The rules, and why each one is here
 * ---------------------------------------------------------------------------
 *
 * Escalation is the easiest place in this codebase to accidentally invent data,
 * so every rule below fails closed:
 *
 *   1. A `sample` series escalates nothing. Ever. Until a real BLS series is
 *      ingested, this whole module is inert and prices are served exactly as
 *      anchored. A made-up trend line applied to a real price is worse than no
 *      trend line at all.
 *   2. A series only moves the components it actually measures. A materials PPI
 *      must not age labour - labour has its own OEWS series - or permits, or
 *      disposal. `appliesTo` is required; a series that does not declare one
 *      escalates nothing.
 *   3. Forward only. A record newer than the last index point is left alone.
 *   4. No extrapolation behind the series. If a record predates the first index
 *      point we cannot know what happened, so we do nothing.
 *   5. Clamped. Past `maxMultiplier` the honest statement is "this anchor is too
 *      old to escalate", not a doubled number. We decline, and the recency
 *      penalty in the confidence score does its job instead.
 *
 * Note on confidence, deliberately unchanged: escalating fixes the price LEVEL,
 * not the SAMPLE. A 2024 observation carried forward on a 2026 index is still a
 * 2024 observation, so it keeps its full recency penalty. Escalation is not
 * allowed to make old data look fresh.
 */

export interface Escalation {
  /** Multiplier to apply to the anchored price. */
  multiplier: number;
  /**
   * The record's own effective date. Distinct from `fromPeriod`, and the two
   * must never be conflated in anything a reader sees: the anchor is when we
   * observed the price, `fromPeriod` is the index reading in force at that
   * date. With monthly readings they are at most a month apart, but they are
   * different facts and the note states both.
   */
  anchorDate: string;
  /** Index period the multiplier is measured from. */
  fromPeriod: string;
  /** Latest index period available. */
  toPeriod: string;
  fromValue: number;
  toValue: number;
  seriesKey: string;
  seriesName: string;
  /** Plain-English provenance sentence, safe to show a homeowner. */
  note: string;
}

/** Returns null whenever we cannot honestly escalate, which is most of the time. */
export type Escalator = (record: PricingRecord) => Escalation | null;

export const NO_ESCALATION: Escalator = () => null;

const round4 = (n: number) => Math.round(n * 10000) / 10000;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-06-01" -> "June 2026". Avoids Date parsing and its timezone traps. */
function periodLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const idx = Number(m) - 1;
  return MONTHS[idx] ? `${MONTHS[idx]} ${y}` : iso;
}

export interface BuildEscalatorOptions {
  series: PriceIndexSeries[];
  points: PriceIndexPoint[];
  /**
   * Scope ids the current request resolves to, most specific first. A series
   * only applies if its scope is one of these - a national index applies to
   * everyone, a state index only inside that state.
   */
  scopeIds?: string[];
  /**
   * Refuse to escalate beyond this. Default 1.5: a 50% climb means the anchor
   * needs re-collecting, not multiplying.
   */
  maxMultiplier?: number;
}

/**
 * Build the escalator for one request.
 *
 * Picks the most specific usable series per component and returns a function
 * the price lookup can apply to every record it resolves.
 */
export function buildEscalator(opts: BuildEscalatorOptions): Escalator {
  const maxMultiplier = opts.maxMultiplier ?? 1.5;
  const scopeIds = opts.scopeIds ?? ["us", "global"];

  // Rules 1 and 2: sample series and series with no declared coverage are
  // dropped here, before anything can reference them.
  const usable = opts.series.filter((s) =>
    s.dataStatus !== "sample"
    && Array.isArray(s.appliesTo) && s.appliesTo.length > 0
    && scopeIds.includes(s.geoScopeId));

  if (!usable.length) return NO_ESCALATION;

  const pointsBySeries = new Map<string, PriceIndexPoint[]>();
  for (const p of opts.points) {
    const bucket = pointsBySeries.get(p.seriesId);
    if (bucket) bucket.push(p); else pointsBySeries.set(p.seriesId, [p]);
  }
  for (const bucket of pointsBySeries.values()) {
    bucket.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  }

  // One series per component, most geographically specific first.
  const byComponent = new Map<CostComponent, { series: PriceIndexSeries; points: PriceIndexPoint[] }>();
  for (const scopeId of scopeIds) {
    for (const s of usable) {
      if (s.geoScopeId !== scopeId) continue;
      const points = pointsBySeries.get(s.id) ?? [];
      if (points.length < 2) continue; // one point is a level, not a trend
      for (const component of s.appliesTo ?? []) {
        if (!byComponent.has(component)) byComponent.set(component, { series: s, points });
      }
    }
  }

  if (!byComponent.size) return NO_ESCALATION;

  return (record) => {
    const chosen = byComponent.get(record.component);
    if (!chosen) return null;

    const { series, points } = chosen;
    const latest = points[points.length - 1];

    // Rule 3: forward only.
    if (record.effectiveDate >= latest.periodStart) return null;

    // Rule 4: the last index reading at or before the anchor date. If the
    // record predates the series, we have nothing to measure from.
    let base: PriceIndexPoint | null = null;
    for (const p of points) {
      if (p.periodStart <= record.effectiveDate) base = p; else break;
    }
    if (!base || !(base.value > 0)) return null;

    const multiplier = round4(latest.value / base.value);
    // Rule 5, both directions. A published index that has fallen is real and we
    // pass it through, but a collapse that large is a data error, not a market.
    if (!(multiplier > 0.5) || multiplier > maxMultiplier) return null;
    if (multiplier === 1) return null;

    const pct = (multiplier - 1) * 100;
    const direction = pct >= 0 ? "risen" : "fallen";
    const note =
      `Observed ${periodLabel(record.effectiveDate)} and carried forward on `
      + `${series.name} (${series.seriesKey}). The reading in force at that date `
      + `was ${periodLabel(base.periodStart)} (${base.value}); the latest is `
      + `${periodLabel(latest.periodStart)} (${latest.value}), so the index has `
      + `${direction} ${Math.abs(pct).toFixed(1)}%. The observed price is unchanged; `
      + `only that adjustment is applied.`;

    return {
      multiplier,
      anchorDate: record.effectiveDate,
      fromPeriod: base.periodStart,
      toPeriod: latest.periodStart,
      fromValue: base.value,
      toValue: latest.value,
      seriesKey: series.seriesKey,
      seriesName: series.name,
      note,
    };
  };
}
