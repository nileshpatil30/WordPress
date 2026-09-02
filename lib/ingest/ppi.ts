import type {
  CostComponent, PriceIndexPoint, PriceIndexSeries,
} from "@/lib/types";

/**
 * Ingest a published price index into price_index_series / price_index_points.
 *
 * Pure transform, no I/O, so it is testable without a network or a filesystem.
 * Same shape and same discipline as lib/ingest/bls-oews.ts and
 * lib/ingest/materials.ts.
 *
 * ---------------------------------------------------------------------------
 * What this is for
 * ---------------------------------------------------------------------------
 *
 * This is the free half of a licensed cost database. The BLS Producer Price
 * Index publishes roofing-specific series in the public domain:
 *
 *   WPU1361            Prepared asphalt and tar roofing and siding products
 *   WPU136             Nonmetallic mineral products: asphalt felts and coatings
 *   PCU3241223241221   Asphalt shingle and coating materials manufacturing
 *   PCU3241223241222   ... prepared asphalt/tar roofing and siding
 *
 * They give us no price LEVELS at all - an index reading of 347.114 means
 * nothing in dollars. What they give us is the ability to anchor a price once,
 * from a real observation, and carry it forward accurately for nothing, forever.
 * See lib/escalation.ts and docs/materials-data-sources.md.
 *
 * ---------------------------------------------------------------------------
 * Provenance
 * ---------------------------------------------------------------------------
 *
 * These rows land `verified`, which nothing else in the pricing dataset does.
 * That is deliberate and it is narrow: an index point is a US federal statistic
 * transcribed unchanged, with no modelling of ours between the publication and
 * the row. The moment we derive anything from it - as escalation does - the
 * result is modelled again.
 */

/** One reading, as published. Nothing here is derived. */
export interface IndexObservation {
  /** Period start, ISO. BLS monthly M01 -> "-01-01". */
  periodStart: string;
  value: number;
}

export interface PpiIngestResult {
  series: PriceIndexSeries;
  points: PriceIndexPoint[];
  rejected: { observation: IndexObservation; reason: string }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * BLS API JSON -> observations.
 *
 * Drops M13 (the annual average), which is the classic way to end up with a
 * thirteenth month that silently distorts a year-on-year comparison. Semiannual
 * S01/S02 periods go the same way.
 */
export function parseBlsSeriesJson(json: unknown, seriesKey?: string): IndexObservation[] {
  const root = json as {
    Results?: { series?: { seriesID?: string; data?: Record<string, string>[] }[] };
  };
  const all = root?.Results?.series ?? [];
  const series = seriesKey
    ? all.find((s) => s.seriesID?.toUpperCase() === seriesKey.toUpperCase())
    : all[0];
  if (!series?.data) return [];

  const out: IndexObservation[] = [];
  for (const row of series.data) {
    const period = String(row.period ?? "");
    if (!/^M(0[1-9]|1[0-2])$/.test(period)) continue; // monthly readings only
    const year = String(row.year ?? "");
    if (!/^\d{4}$/.test(year)) continue;
    const value = Number(row.value);
    if (!Number.isFinite(value)) continue;
    out.push({ periodStart: `${year}-${period.slice(1)}-01`, value });
  }
  return out.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}

/**
 * FRED CSV -> observations. Accepts both the historical `DATE,<SERIES>` header
 * and the current `observation_date,<SERIES>`, and skips FRED's "." for a
 * missing reading rather than reading it as zero.
 */
export function parseFredCsv(csv: string): IndexObservation[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const out: IndexObservation[] = [];
  for (const line of lines.slice(1)) {
    const [date, raw] = line.split(",").map((c) => c.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) continue;
    if (!raw || raw === ".") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    out.push({ periodStart: date, value });
  }
  return out.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}

export function transformIndexObservations(opts: {
  observations: IndexObservation[];
  /** Publisher's series identifier, e.g. "WPU1361". */
  seriesKey: string;
  name: string;
  unit: string;
  sourceId: string;
  /** Which cost components this index may move. Required - see lib/escalation.ts. */
  appliesTo: CostComponent[];
  geoScopeType?: PriceIndexSeries["geoScopeType"];
  geoScopeId?: string;
  methodology?: string;
}): PpiIngestResult {
  const rejected: PpiIngestResult["rejected"] = [];
  const seriesId = `pis-${opts.seriesKey.toLowerCase()}`;
  const seen = new Set<string>();
  const clean: IndexObservation[] = [];

  for (const o of opts.observations) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.periodStart)) {
      rejected.push({ observation: o, reason: `periodStart must be YYYY-MM-DD, got "${o.periodStart}"` });
      continue;
    }
    if (!(o.value > 0)) {
      rejected.push({ observation: o, reason: "index value must be positive" });
      continue;
    }
    if (seen.has(o.periodStart)) {
      rejected.push({ observation: o, reason: `duplicate period ${o.periodStart}` });
      continue;
    }
    seen.add(o.periodStart);
    clean.push(o);
  }

  clean.sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  const byPeriod = new Map(clean.map((o) => [o.periodStart, o.value]));
  const points: PriceIndexPoint[] = clean.map((o) => {
    const [y, m, d] = o.periodStart.split("-");
    const yearAgo = `${Number(y) - 1}-${m}-${d}`;
    const prior = byPeriod.get(yearAgo);
    return {
      id: `pip-${opts.seriesKey.toLowerCase()}-${o.periodStart.slice(0, 7)}`,
      seriesId,
      periodStart: o.periodStart,
      value: o.value,
      pctChangeYoy: prior ? round1(((o.value - prior) / prior) * 100) : undefined,
    };
  });

  const first = clean[0]?.periodStart;
  const last = clean[clean.length - 1]?.periodStart;

  const series: PriceIndexSeries = {
    id: seriesId,
    seriesKey: opts.seriesKey,
    name: opts.name,
    geoScopeType: opts.geoScopeType ?? "country",
    geoScopeId: opts.geoScopeId ?? "us",
    sourceId: opts.sourceId,
    unit: opts.unit,
    // Transcribed unchanged from a public-domain federal statistic. Anything we
    // derive from it downstream is modelled again.
    dataStatus: "verified",
    appliesTo: opts.appliesTo,
    methodology: opts.methodology
      ?? `${opts.name}, series ${opts.seriesKey}, as published. `
      + `${points.length} monthly readings${first && last ? ` from ${first} to ${last}` : ""}. `
      + `Values are transcribed unchanged; the index measures producer price movement, not a retail or installed price.`,
  };

  return { series, points, rejected };
}
