import type { PricingFactor, PricingRecord, Metro } from "@/lib/types";
import { resolveFactor } from "./factors";

/**
 * BLS Occupational Employment and Wage Statistics -> pricing_records.
 *
 * This module is a pure transform: rows in, pricing records out, no I/O. The
 * CLI in scripts/ handles files and the database.
 *
 * Three decisions worth understanding before changing anything here:
 *
 * 1. WE JOIN ON THE AREA CODE, NOT THE AREA TITLE.
 *    BLS renames metros between releases - Phoenix has been published as both
 *    "Phoenix-Mesa-Scottsdale, AZ" and "Phoenix-Mesa-Chandler, AZ". Our metros
 *    table carries cbsa_code precisely so the join survives that.
 *
 * 2. WE USE THE PUBLISHED PERCENTILES FOR THE RANGE.
 *    OEWS gives H_PCT25 / H_MEDIAN / H_PCT75. Using them means our low and high
 *    are observed wage dispersion rather than an invented +/- percentage.
 *
 * 3. THE RESULT IS `modeled`, NOT `verified`.
 *    The wage is verified; the burden multiplier that turns a worker's wage into
 *    an employer's crew cost is ours. A derivation from a verified input is
 *    modelled, and the confidence cap (78) should reflect that. Claiming
 *    `verified` here would be the exact dishonesty the cap exists to prevent.
 */

export const OEWS_SOC_CODES = {
  roofers: "47-2181",
  solarPvInstallers: "47-2231",
  hvacMechanics: "49-9021",
  electricians: "47-2111",
  plumbers: "47-2152",
  carpenters: "47-2031",
} as const;

export interface OewsIngestOptions {
  /** SOC occupation code, e.g. "47-2181" for Roofers. */
  socCode: string;
  /** The period the release describes, e.g. "2025-05-01". NOT today's date. */
  effectiveDate: string;
  /** When we downloaded it. */
  collectedDate: string;
  serviceId: string;
  sourceId: string;
  metros: Metro[];
  /** Factor rows; the burden multiplier is resolved per state from these. */
  factors: PricingFactor[];
  /** Fallback when no state-scoped burden factor exists. */
  defaultBurden?: number;
}

export interface OewsIngestResult {
  records: PricingRecord[];
  skipped: { area: string; areaTitle: string; reason: string }[];
  matchedMetros: number;
  totalRowsForOccupation: number;
}

/**
 * BLS suppression markers. `*` = estimate not released, `#` = wage at or above
 * the top of the published range. Both become null: a `#` metro is a real data
 * point we simply cannot read a number from, and guessing one would be worse
 * than skipping it.
 */
function wage(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "*" || trimmed === "**" || trimmed === "#") return null;
  const n = Number(trimmed.replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function intOrNull(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[,]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function transformOewsRows(
  rows: Record<string, string>[], opts: OewsIngestOptions,
): OewsIngestResult {
  const byCbsa = new Map<string, Metro>();
  for (const m of opts.metros) if (m.cbsaCode) byCbsa.set(m.cbsaCode.trim(), m);

  const records: PricingRecord[] = [];
  const skipped: OewsIngestResult["skipped"] = [];
  let totalRowsForOccupation = 0;

  for (const row of rows) {
    const occ = (row.OCC_CODE ?? "").trim();
    if (occ !== opts.socCode) continue;
    totalRowsForOccupation++;

    // MSA files publish the CBSA code in AREA. Some releases zero-pad it.
    const area = (row.AREA ?? "").trim().replace(/^0+/, "");
    const areaTitle = (row.AREA_TITLE ?? "").trim();
    const metro = byCbsa.get(area);
    if (!metro) continue; // Not a metro we cover. Not an error.

    const median = wage(row.H_MEDIAN);
    if (median === null) {
      skipped.push({ area, areaTitle, reason: "median hourly wage suppressed or unavailable" });
      continue;
    }

    // Prefer published dispersion over an invented spread.
    const p25 = wage(row.H_PCT25);
    const p75 = wage(row.H_PCT75);
    const low = p25 ?? median * 0.82;
    const high = p75 ?? median * 1.28;
    const usedPercentiles = p25 !== null && p75 !== null;

    const burdenFactor = resolveFactor(opts.factors, "labor.burden_multiplier", {
      stateId: metro.stateId, countryId: metro.countryId,
    });
    const burden = burdenFactor?.multiplier ?? opts.defaultBurden ?? 1.8;

    // A published wage is what the worker receives. What a contractor pays to
    // put that worker on a roof includes payroll taxes, workers' compensation
    // (expensive for roofing), general liability, vehicles, supervision and
    // non-productive hours. Profit is NOT in here - the engine applies overhead
    // and profit separately, and putting it in both places double-counts it.
    const employment = intOrNull(row.TOT_EMP);

    records.push({
      id: `pr-oews-${opts.socCode}-${metro.id}`,
      serviceId: opts.serviceId,
      component: "labor",
      metricKey: "labor.rate_per_hour",
      geoScopeType: "metro",
      geoScopeId: metro.id,
      unit: "hour",
      lowPrice: round2(low * burden),
      medianPrice: round2(median * burden),
      highPrice: round2(high * burden),
      currency: "USD",
      effectiveDate: opts.effectiveDate,
      collectedDate: opts.collectedDate,
      sourceId: opts.sourceId,
      dataStatus: "modeled",
      sampleSize: employment,
      confidenceScore: scoreRecord(usedPercentiles, employment),
      methodology:
        `BLS OEWS ${opts.effectiveDate.slice(0, 7)} hourly wages for SOC ${opts.socCode} in ` +
        `${areaTitle} (CBSA ${area}), multiplied by a labour burden factor of ${burden} ` +
        `(${burdenFactor?.label ?? "default"}) to convert a worker's wage into an employer's ` +
        `fully burdened crew cost. Contractor overhead and profit are applied separately by ` +
        `the estimation engine and are deliberately not included here. ` +
        (usedPercentiles
          ? "Low and high are the published 25th and 75th percentile wages."
          : "Percentile wages were unavailable for this area, so the range is a modelled spread around the median.") +
        " OEWS is an establishment survey and excludes the self-employed, which is a material" +
        " share of roofing labour; treat it as a floor on local labour cost.",
    });
  }

  return { records, skipped, matchedMetros: records.length, totalRowsForOccupation };
}

/** Per-record confidence: real percentiles and a decent sample earn more. */
function scoreRecord(usedPercentiles: boolean, employment?: number): number {
  let score = 70; // A government wage survey is a strong starting point.
  if (usedPercentiles) score += 10;
  if (employment != null && employment >= 1000) score += 8;
  else if (employment != null && employment >= 300) score += 4;
  else if (employment != null && employment < 100) score -= 10;
  return Math.max(0, Math.min(100, score));
}

const round2 = (n: number) => Math.round(n * 100) / 100;
