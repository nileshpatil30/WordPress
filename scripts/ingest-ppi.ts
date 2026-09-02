/**
 * Ingest a BLS Producer Price Index series into the price index tables.
 *
 *   # straight from the BLS public API (no key needed, 25 requests/day):
 *   npm run ingest:ppi -- --series WPU1361 --fetch
 *
 *   # or from a file you downloaded (BLS JSON or FRED CSV, auto-detected):
 *   npm run ingest:ppi -- --series WPU1361 --file ./WPU1361.csv
 *
 *   # write it into the committed seed:
 *   npm run ingest:ppi -- --series WPU1361 --fetch --emit-seed lib/data/seed/ppi.ts
 *
 * Dry run by default, exactly like the other two ingesters: it prints what it
 * would write, and what escalation a price anchored at various dates would
 * receive, and changes nothing until you pass --emit-seed.
 *
 * Where to get the data by hand:
 *   BLS   https://data.bls.gov/timeseries/WPU1361   ("Download" -> XLSX/CSV)
 *   FRED  https://fred.stlouisfed.org/series/WPU1361  ("Download" -> CSV)
 *
 * Both are US federal statistics and in the public domain.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { CostComponent } from "../lib/types";
import {
  parseBlsSeriesJson, parseFredCsv, transformIndexObservations,
  type IndexObservation,
} from "../lib/ingest/ppi";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

/**
 * The roofing-relevant PPI series, so the common case is one flag. Anything
 * else can be ingested by passing --name and --unit explicitly.
 */
const KNOWN: Record<string, { name: string; unit: string; appliesTo: CostComponent[] }> = {
  WPU1361: {
    name: "PPI: prepared asphalt and tar roofing and siding products",
    unit: "index (1982=100)", appliesTo: ["material"],
  },
  WPU136: {
    name: "PPI: nonmetallic mineral products, asphalt felts and coatings",
    unit: "index (1982=100)", appliesTo: ["material"],
  },
  PCU3241223241221: {
    name: "PPI: asphalt shingle and coating materials manufacturing, roofing asphalts and coatings",
    unit: "index", appliesTo: ["material"],
  },
  PCU3241223241222: {
    name: "PPI: asphalt shingle and coating materials manufacturing, prepared asphalt roofing and siding",
    unit: "index", appliesTo: ["material"],
  },
};

const monthsBetween = (a: string, b: string) => {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
};

async function loadObservations(seriesKey: string): Promise<IndexObservation[]> {
  const file = arg("file");
  if (file) {
    const raw = readFileSync(file, "utf8");
    const looksJson = raw.trimStart().startsWith("{");
    const obs = looksJson ? parseBlsSeriesJson(JSON.parse(raw), seriesKey) : parseFredCsv(raw);
    console.log(`Read ${obs.length} readings from ${file} (${looksJson ? "BLS JSON" : "FRED CSV"}).`);
    return obs;
  }

  const url = `https://api.bls.gov/publicAPI/v1/timeseries/data/${seriesKey}`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BLS API returned ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json?.status && json.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS API: ${json.status} ${(json.message ?? []).join("; ")}`);
  }
  // The keyless v1 API returns the last three years only. That is plenty for
  // escalating a recent anchor, and not enough for a long history chart - pass
  // --file with a full download if you want the whole series.
  const obs = parseBlsSeriesJson(json, seriesKey);
  console.log(`Fetched ${obs.length} monthly readings.`);
  return obs;
}

async function main() {
  const seriesKey = (arg("series") ?? "WPU1361").toUpperCase();
  const emitSeed = arg("emit-seed");
  const known = KNOWN[seriesKey];
  const name = arg("name") ?? known?.name;
  const unit = arg("unit") ?? known?.unit ?? "index";

  if (!flag("fetch") && !arg("file")) {
    console.error(
      "Usage: npm run ingest:ppi -- --series <ID> (--fetch | --file <path>) [--emit-seed <path>]\n\n"
      + `  --series     BLS series id. Default WPU1361. Known: ${Object.keys(KNOWN).join(", ")}\n`
      + "  --fetch      Pull from the BLS public API (no key, last 3 years).\n"
      + "  --file       A BLS JSON or FRED CSV download. Auto-detected.\n"
      + "  --name       Series display name, if not one of the known ids.\n"
      + "  --unit       Index base, e.g. \"index (1982=100)\".\n"
      + "  --emit-seed  Write a committed TypeScript seed module. Without it, nothing is written.\n");
    process.exit(2);
  }
  if (!name) {
    console.error(`Unknown series "${seriesKey}". Pass --name and --unit explicitly.`);
    process.exit(2);
  }

  const observations = await loadObservations(seriesKey);
  if (observations.length < 2) {
    console.error("Need at least two readings to establish a trend. Nothing written.");
    process.exit(1);
  }

  const result = transformIndexObservations({
    observations, seriesKey, name, unit,
    sourceId: "src-bls-ppi",
    appliesTo: known?.appliesTo ?? ["material"],
  });

  if (result.rejected.length) {
    console.log(`\nNot ingested (${result.rejected.length}):`);
    for (const r of result.rejected) {
      console.log(`  ${r.observation.periodStart} - ${r.reason}`);
    }
  }

  const points = result.points;
  const latest = points[points.length - 1];
  const first = points[0];
  console.log(`\n${result.series.name}`);
  console.log(`  ${points.length} readings, ${first.periodStart} to ${latest.periodStart}`);
  console.log(`  latest ${latest.value}${latest.pctChangeYoy != null ? `  (${latest.pctChangeYoy > 0 ? "+" : ""}${latest.pctChangeYoy}% year on year)` : ""}`);

  const today = new Date().toISOString().slice(0, 10);
  const lag = monthsBetween(latest.periodStart, today);
  if (lag > 4) {
    console.log(`\n  WARNING: the latest reading is ${lag} months old. PPI normally lags`);
    console.log("  one to two months; anything more means this download is stale and");
    console.log("  escalation will under-adjust. Re-download before emitting a seed.");
  }

  // The point of the dry run: show what this would actually do to a price.
  console.log("\nWhat a price anchored on each date would be carried forward by:");
  for (const anchor of ["2024-01-01", "2025-01-01", "2025-07-01", "2026-01-01"]) {
    let base: typeof points[number] | null = null;
    for (const p of points) { if (p.periodStart <= anchor) base = p; else break; }
    if (!base) { console.log(`  ${anchor}  (before the series starts - no escalation)`); continue; }
    const mult = latest.value / base.value;
    console.log(
      `  ${anchor}  x${mult.toFixed(4)}  (${((mult - 1) * 100).toFixed(1)}%)`
      + `   ${base.value} -> ${latest.value}`);
  }
  console.log(
    "\nEscalation is capped at x1.5 in lib/escalation.ts. Past that the honest\n"
    + "answer is that the anchor needs re-collecting, not multiplying.");

  if (!emitSeed) {
    console.log("\nDRY RUN. Nothing written. Re-run with --emit-seed <path> to commit it.");
    return;
  }

  const body = `import type { PriceIndexPoint, PriceIndexSeries } from "@/lib/types";

/**
 * GENERATED FILE - do not edit by hand.
 *
 * Produced by scripts/ingest-ppi.ts from the BLS Producer Price Index.
 * Re-run against a fresh download to regenerate:
 *
 *   npm run ingest:ppi -- --series ${seriesKey} --fetch \\
 *     --emit-seed lib/data/seed/ppi.ts
 *
 * data_status is "verified" - and this is the only pricing data in the project
 * that is, apart from the exact pitch geometry. An index point is a US federal
 * statistic transcribed unchanged, with no modelling of ours in between. What we
 * DERIVE from it (see lib/escalation.ts) is modelled again.
 *
 * The index measures producer price movement. It carries an anchored price
 * forward; it is not itself a price.
 */
export const PPI_SERIES_KEY = ${JSON.stringify(seriesKey)};
export const PPI_LATEST_PERIOD = ${JSON.stringify(latest.periodStart)};

export const ppiSeries: PriceIndexSeries = ${JSON.stringify(result.series, null, 2)};

export const ppiPoints: PriceIndexPoint[] = ${JSON.stringify(points, null, 2)};
`;
  writeFileSync(emitSeed, body, "utf8");
  console.log(`\nWrote 1 series and ${points.length} points to ${emitSeed}`);
  console.log("Next: import it from lib/data/seed/pricing.ts, retire the sample series,");
  console.log('and set src-bls-ppi to isActive: true.');
}

main().catch((err) => { console.error(String(err?.message ?? err)); process.exit(1); });
