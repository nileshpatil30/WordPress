/**
 * Ingest observed material prices from a CSV.
 *
 *   npm run ingest:materials -- --file data/materials.csv --collected 2026-09-02
 *   npm run ingest:materials -- --file data/materials.csv --collected 2026-09-02 --emit-seed lib/data/seed/materials.ts
 *
 * Dry run by default, exactly like the BLS ingester: it prints what it would
 * write and changes nothing until you pass --emit-seed. A pricing ingest that
 * silently mutates the dataset is how a bad row reaches production.
 *
 * The CSV schema is documented in data/materials-template.csv. Every row must
 * carry its own source, URL and observation date, because a price without a
 * provenance is not usable here - the whole product rests on being able to say
 * where a number came from.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseCsvRecords } from "../lib/ingest/csv";
import {
  transformMaterialObservations, type MaterialObservation, type PriceChannel,
} from "../lib/ingest/materials";
import { seedDataset } from "../lib/data/seed";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const CHANNELS: PriceChannel[] = ["retail", "trade", "benchmark"];
const num = (v: string | undefined) => (v == null || v === "" ? NaN : Number(v));

function main() {
  const file = arg("file");
  const collected = arg("collected");
  const emitSeed = arg("emit-seed");

  if (!file || !collected) {
    console.error(
      "Usage: npm run ingest:materials -- --file <csv> --collected YYYY-MM-DD [--emit-seed <path>]\n\n" +
      "  --file       CSV of observations. See data/materials-template.csv.\n" +
      "  --collected  The date you ran the collection, not the date a price was observed.\n" +
      "  --emit-seed  Write a committed TypeScript seed module. Without it, nothing is written.\n");
    process.exit(2);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(collected)) {
    console.error(`--collected must be YYYY-MM-DD, got "${collected}"`);
    process.exit(2);
  }

  console.log(`Reading ${file}`);
  const rows = parseCsvRecords(readFileSync(file, "utf8"));
  console.log(`Parsed ${rows.length} rows.\n`);

  const observations: MaterialObservation[] = [];
  const malformed: { line: number; reason: string }[] = [];

  // The shared CSV parser upper-cases headers, because the BLS release it was
  // written for ships them that way. This file is hand-authored, so read it
  // case-insensitively rather than making a person match a convention they
  // cannot see.
  const field = (row: Record<string, string>, name: string): string => {
    const direct = row[name] ?? row[name.toUpperCase()] ?? row[name.toLowerCase()];
    if (direct !== undefined) return direct;
    const key = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? row[key] : "";
  };

  rows.forEach((raw, i) => {
    const r = new Proxy({} as Record<string, string>, {
      get: (_t, prop: string) => field(raw as Record<string, string>, prop),
    });
    const channel = (r.channel ?? "").trim() as PriceChannel;
    if (!CHANNELS.includes(channel)) {
      malformed.push({ line: i + 2, reason: `channel must be one of ${CHANNELS.join(", ")}` });
      return;
    }
    const [low, median, high] = [num(r.low), num(r.median), num(r.high)];
    if (![low, median, high].every(Number.isFinite)) {
      malformed.push({ line: i + 2, reason: "low, median and high must all be numbers" });
      return;
    }
    if (!r.source_name || !r.source_ref) {
      malformed.push({ line: i + 2, reason: "source_name and source_ref are required - a price without provenance is unusable" });
      return;
    }
    observations.push({
      materialSlug: (r.material_slug ?? "").trim(),
      metricKey: (r.metric_key ?? "material.per_square").trim(),
      unit: (r.unit ?? "square").trim(),
      channel,
      low, median, high,
      sourceName: r.source_name.trim(),
      sourceRef: r.source_ref.trim(),
      observedDate: (r.observed_date ?? "").trim(),
      geoScopeType: (r.geo_scope_type || undefined) as MaterialObservation["geoScopeType"],
      geoScopeId: r.geo_scope_id || undefined,
      sampleSize: Number.isFinite(num(r.sample_size)) ? num(r.sample_size) : undefined,
      notes: r.notes || undefined,
    });
  });

  const result = transformMaterialObservations({
    observations,
    factors: seedDataset.pricingFactors,
    serviceId: "svc-roofing",
    collectedDate: collected,
    knownMaterialSlugs: seedDataset.materials.map((m) => m.slug),
  });

  if (malformed.length) {
    console.log(`Malformed rows (${malformed.length}):`);
    for (const m of malformed) console.log(`  line ${m.line}: ${m.reason}`);
    console.log();
  }
  if (result.rejected.length) {
    console.log(`Not ingested (${result.rejected.length}):`);
    for (const r of result.rejected) {
      console.log(`  ${r.observation.materialSlug || "(no slug)"} - ${r.reason}`);
    }
    console.log();
  }

  if (!result.records.length) {
    console.log("Nothing to write.");
    process.exit(malformed.length ? 1 : 0);
  }

  const discount = result.discountsApplied.retail;
  if (discount) console.log(`Retail-to-trade discount applied: ${discount}\n`);

  console.log("Material cost per unit (low / median / high):");
  for (const r of result.records) {
    const slug = r.id.replace(/^pr-mat-/, "").replace(new RegExp(`-${r.geoScopeId}$`), "");
    const label = `${slug} (${r.geoScopeId})`;
    console.log(
      `  ${label.padEnd(46)} $${r.lowPrice.toFixed(2).padStart(8)}` +
      ` $${r.medianPrice.toFixed(2).padStart(8)} $${r.highPrice.toFixed(2).padStart(8)}` +
      `  per ${r.unit}`);
  }
  console.log();

  if (!emitSeed) {
    console.log("DRY RUN. Nothing written. Re-run with --emit-seed <path> to commit them.");
    return;
  }

  const body = `import type { PricingRecord } from "@/lib/types";

/**
 * GENERATED FILE - do not edit by hand.
 *
 * Produced by scripts/ingest-materials.ts from observed material prices.
 * Re-run the ingester against a fresh collection to regenerate:
 *
 *   npm run ingest:materials -- --file <csv> --collected <YYYY-MM-DD> \\
 *     --emit-seed lib/data/seed/materials.ts
 *
 * data_status is "modeled", not "verified": the observed price is real, and the
 * retail-to-trade conversion applied to it is our assumption. Each record's
 * methodology names the source, the URL, the observation date and the discount.
 */
export const MATERIALS_COLLECTED_DATE = ${JSON.stringify(collected)};

export const observedMaterialRecords: PricingRecord[] = ${JSON.stringify(result.records, null, 2)};
`;
  writeFileSync(emitSeed, body, "utf8");
  console.log(`Wrote ${result.records.length} rows to ${emitSeed}`);
  console.log("Import it from lib/data/seed/index.ts to bring it into the dataset.");
}

main();
