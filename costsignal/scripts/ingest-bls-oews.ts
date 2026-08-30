/**
 * Ingest BLS Occupational Employment and Wage Statistics into pricing_records.
 *
 *   # download the MSA file for the release you want, then:
 *   npx tsx scripts/ingest-bls-oews.ts --file ./MSA_M2025_dl.csv --effective 2025-05-01
 *   npx tsx scripts/ingest-bls-oews.ts --file ./MSA_M2025_dl.csv --effective 2025-05-01 --apply
 *
 * Dry run by default. Nothing is written until you pass --apply.
 *
 * Flags:
 *   --file <path>        OEWS metro (MSA) CSV. Required.
 *   --effective <date>   The period the release describes, e.g. 2025-05-01.
 *                        Required, and deliberately not defaulted: dating a
 *                        2023 release as "today" would make the freshness badge
 *                        and the confidence score lie.
 *   --soc <code>         Occupation code. Default 47-2181 (Roofers).
 *   --service <slug>     Default "roofing".
 *   --apply              Actually write.
 *   --retire-superseded  Delete sample city-scoped labour rows that this data
 *                        replaces. Without it they keep winning, because the
 *                        resolution chain prefers a more specific scope.
 */
import fs from "node:fs";
import path from "node:path";
import { parseCsvRecords } from "../lib/ingest/csv";
import { transformOewsRows, OEWS_SOC_CODES } from "../lib/ingest/bls-oews";
import { getStore } from "../lib/data/store";

const ACTOR = "ingest:bls-oews";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const file = arg("file");
  const effectiveDate = arg("effective");
  const socCode = arg("soc") ?? OEWS_SOC_CODES.roofers;
  const serviceSlug = arg("service") ?? "roofing";
  const apply = flag("apply");
  const retire = flag("retire-superseded");

  if (!file || !effectiveDate) {
    console.error("Usage: --file <MSA csv> --effective <YYYY-MM-DD> [--soc 47-2181] [--apply] [--retire-superseded]");
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
    console.error("--effective must be the OEWS reference period as YYYY-MM-DD (e.g. 2025-05-01), not today's date.");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${path.resolve(file)}`);
    process.exit(1);
  }

  const store = await getStore();
  const service = await store.getServiceBySlug(serviceSlug);
  if (!service) { console.error(`Unknown service "${serviceSlug}"`); process.exit(1); }

  const [metros, factors, existing, sources] = await Promise.all([
    store.listMetros(),
    store.listPricingFactors(service.id),
    store.listPricingRecords(service.id),
    store.listPricingSources(),
  ]);

  const source = sources.find((s) => s.id === "src-bls-oes");
  if (!source) { console.error('Missing pricing source "src-bls-oes". Seed it first.'); process.exit(1); }

  console.log(`Reading ${path.resolve(file)}`);
  const rows = parseCsvRecords(fs.readFileSync(file, "utf8"));
  console.log(`Parsed ${rows.length.toLocaleString()} rows.\n`);

  const result = transformOewsRows(rows, {
    socCode,
    effectiveDate,
    collectedDate: new Date().toISOString().slice(0, 10),
    serviceId: service.id,
    sourceId: source.id,
    metros,
    factors,
  });

  console.log(`SOC ${socCode}: ${result.totalRowsForOccupation} metro rows in the file, ` +
    `${result.matchedMetros} matched to metros we cover.\n`);

  if (!result.records.length) {
    console.error("Nothing matched. Check that metros.cbsa_code values line up with the AREA column.");
    process.exit(1);
  }

  const metroName = new Map(metros.map((m) => [m.id, m.name]));
  console.log("Fully burdened crew rate (low / median / high per hour):");
  for (const r of result.records) {
    console.log(`  ${(metroName.get(r.geoScopeId) ?? r.geoScopeId).slice(0, 34).padEnd(36)}` +
      `$${r.lowPrice.toFixed(2).padStart(7)} $${r.medianPrice.toFixed(2).padStart(7)} $${r.highPrice.toFixed(2).padStart(7)}` +
      `   n=${r.sampleSize ?? "?"}`);
  }

  if (result.skipped.length) {
    console.log(`\nSkipped ${result.skipped.length} area(s) with suppressed wages:`);
    for (const s of result.skipped) console.log(`  ${s.areaTitle} - ${s.reason}`);
  }

  // A city-scoped row always beats a metro-scoped one, so sample city labour
  // rows would quietly keep winning after this import.
  const superseded = existing.filter(
    (r) => r.metricKey === "labor.rate_per_hour" &&
      r.geoScopeType === "city" && r.dataStatus === "sample");

  if (superseded.length) {
    console.log(`\n${superseded.length} sample city-scoped labour row(s) would still take ` +
      `precedence over this metro data, because a finer scope always wins.`);
    if (!retire) console.log("Pass --retire-superseded to remove them.");
  }

  if (!apply) {
    console.log("\nDRY RUN. Nothing written. Re-run with --apply.");
    return;
  }

  let written = 0;
  for (const record of result.records) {
    const exists = existing.some((r) => r.id === record.id);
    const res = exists
      ? await store.updateRecord("pricingRecords", record.id,
        record as unknown as Record<string, unknown>, ACTOR)
      : await store.insertRecord("pricingRecords",
        record as unknown as Record<string, unknown>, ACTOR);
    if (res.ok) written++;
    else console.error(`  failed ${record.id}: ${res.message}`);
  }

  let retired = 0;
  if (retire) {
    for (const row of superseded) {
      const res = await store.deleteRecord("pricingRecords", row.id, ACTOR);
      if (res.ok) retired++;
      else console.error(`  failed to retire ${row.id}: ${res.message}`);
    }
  }

  console.log(`\nWrote ${written} labour rate row(s)${retired ? `, retired ${retired} sample row(s)` : ""}.`);
  console.log("Data status is `modeled`, not `verified`: the wage is from BLS, the burden");
  console.log("multiplier is ours. The confidence cap moves from 60 to 78, not to 100.");
}

main().catch((err) => { console.error(err); process.exit(1); });
