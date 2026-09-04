/**
 * Expand geographic coverage from two public federal files.
 *
 *   npm run expand:geo -- --oews ./MSA_M2025_dl.csv --crosswalk ./ZIP_CBSA.csv
 *   npm run expand:geo -- --oews ./MSA_M2025_dl.csv --crosswalk ./ZIP_CBSA.csv --emit-seed
 *
 * Dry run by default, like every other ingester here: it reports what it would
 * add and writes nothing until --emit-seed.
 *
 * Where the files come from, both public domain:
 *   OEWS metro file   https://www.bls.gov/oes/tables.htm  ("All data" -> MSA)
 *   ZIP-CBSA crosswalk  https://www.huduser.gov/portal/datasets/usps_crosswalk.html
 *
 * This adds places, not prices. Wage data for the new metros still comes from
 * `npm run ingest:bls`, which is the step that gives them a real number instead
 * of the national fallback.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseCsvRecords } from "../lib/ingest/csv";
import { crosswalkZips, expandGeography, type AreaRow, type CrosswalkRow } from "../lib/ingest/geo-expand";
import { seedDataset } from "../lib/data/seed";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (n: string) => process.argv.includes(`--${n}`);

/** Column names differ between releases and between HUD's own exports. */
const pick = (row: Record<string, string>, ...names: string[]) => {
  for (const n of names) {
    const hit = Object.keys(row).find((k) => k.trim().toUpperCase() === n.toUpperCase());
    if (hit && row[hit]?.trim()) return row[hit].trim();
  }
  return "";
};

function main() {
  const oewsPath = arg("oews");
  const crosswalkPath = arg("crosswalk");
  if (!oewsPath || !crosswalkPath) {
    console.error(
      "Usage: npm run expand:geo -- --oews <MSA csv> --crosswalk <ZIP_CBSA csv> [--emit-seed]\n\n"
      + "  --oews       BLS OEWS metro file. Supplies the areas and their states.\n"
      + "  --crosswalk  HUD ZIP-to-CBSA crosswalk. Supplies ZIP -> area.\n"
      + "  --emit-seed  Write lib/data/seed/geo-expanded.ts. Without it, nothing changes.\n");
    process.exit(1);
  }

  const oewsRows = parseCsvRecords(readFileSync(oewsPath, "utf8"));
  const areas: AreaRow[] = [];
  const seenArea = new Set<string>();
  for (const r of oewsRows) {
    const cbsa = pick(r, "AREA");
    if (!cbsa || seenArea.has(cbsa)) continue;
    seenArea.add(cbsa);
    areas.push({ cbsa, title: pick(r, "AREA_TITLE", "AREA_NAME"), primaryState: pick(r, "PRIM_STATE", "STATE") });
  }
  console.log(`Read ${oewsRows.length} OEWS rows covering ${areas.length} areas.`);

  const { metros, states, skipped } = expandGeography(areas, seedDataset);
  console.log(`  ${metros.length} new metros, ${states.length} new states.`);
  if (skipped.length) console.log(`  ${skipped.length} areas skipped (see --verbose).`);
  if (flag("verbose")) for (const s of skipped) console.log(`    ${s.cbsa} ${s.title}: ${s.reason}`);

  const cwRows = parseCsvRecords(readFileSync(crosswalkPath, "utf8"));
  const crosswalk: CrosswalkRow[] = cwRows.map((r) => ({
    zip: pick(r, "ZIP"),
    cbsa: pick(r, "CBSA"),
    residentialRatio: Number(pick(r, "RES_RATIO", "RES RATIO", "TOT_RATIO")) || 0,
  })).filter((r) => r.zip && r.cbsa);
  console.log(`Read ${cwRows.length} crosswalk rows.`);

  // Match against the metros we will have after expanding, not the ones we
  // have now - otherwise every new metro's ZIPs go unmatched on the first run.
  const allMetros = [...seedDataset.metros, ...metros];
  const { zipCodes, unmatchedCbsas } = crosswalkZips(crosswalk, allMetros, seedDataset.zipCodes);
  console.log(`  ${zipCodes.length} new ZIPs placed; ${unmatchedCbsas} CBSAs had no metro.`);

  const before = seedDataset.zipCodes.length;
  console.log(
    `\nCoverage: ${seedDataset.metros.length} -> ${allMetros.length} metros, `
    + `${before} -> ${before + zipCodes.length} ZIPs, `
    + `${seedDataset.states.length} -> ${seedDataset.states.length + states.length} states.`);

  if (!flag("emit-seed")) {
    console.log("\nDRY RUN. Nothing written. Re-run with --emit-seed to commit it.");
    console.log("Then run `npm run ingest:bls` so the new metros get real wages.");
    return;
  }

  const out = "lib/data/seed/geo-expanded.ts";
  writeFileSync(out, `import type { Metro, State, ZipCode } from "@/lib/types";

/**
 * GENERATED FILE - do not edit by hand.
 *
 * Produced by scripts/expand-geography.ts from the BLS OEWS metro file and the
 * HUD ZIP-to-CBSA crosswalk, both US federal works in the public domain.
 *
 * Geography only. Every price still comes from the ingesters, and a metro in
 * here with no wage row of its own falls back exactly as it did before.
 */
export const expandedStates: State[] = ${JSON.stringify(states, null, 2)};

export const expandedMetros: Metro[] = ${JSON.stringify(metros, null, 2)};

export const expandedZipCodes: ZipCode[] = ${JSON.stringify(zipCodes, null, 2)};
`, "utf8");
  console.log(`\nWrote ${out}.`);
  console.log("Next: npm run ingest:bls -- --file <MSA csv> --effective <date> --emit-seed lib/data/seed/bls-labor.ts");
}

main();
