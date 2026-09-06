/**
 * Expand geographic coverage from two public federal files.
 *
 *   npm run expand:geo -- --oews ./MSA_M2025_dl.csv --crosswalk ./ZIP_CBSA.csv
 *   npm run expand:geo -- --oews ./MSA_M2025_dl.csv --crosswalk ./ZIP_CBSA.csv --emit-seed
 *
 * Or let it fetch both files itself, which is the same thing with the
 * downloading done for you:
 *
 *   npm run expand:geo -- --fetch
 *   npm run expand:geo -- --fetch --hud-token <token> --emit-seed
 *
 * Dry run by default, like every other ingester here: it reports what it would
 * add and writes nothing until --emit-seed.
 *
 * Where the files come from, both public domain:
 *   OEWS metro file   https://www.bls.gov/oes/tables.htm  ("All data" -> MSA)
 *   ZIP-CBSA crosswalk  https://www.huduser.gov/portal/datasets/usps_crosswalk.html
 *
 * HUD gates its crosswalk behind a free API token (register on that page, no
 * cost, no approval wait). Pass it as --hud-token or set HUD_API_TOKEN. Without
 * one, download the file by hand and pass --crosswalk; --fetch will say so
 * rather than failing obscurely.
 *
 * BLS ships OEWS as a zip. If the archive turns out to hold .xlsx rather than
 * .csv - which varies by release - this stops and tells you to save it as CSV,
 * because a wrong guess at a binary format is worse than an instruction.
 *
 * This adds places, not prices. Wage data for the new metros still comes from
 * `npm run ingest:bls`, which is the step that gives them a real number instead
 * of the national fallback.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
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

/** Where --fetch looks, unless told otherwise. Both overridable by flag. */
const DEFAULT_OEWS_URL = "https://www.bls.gov/oes/special-requests/oesm24ma.zip";
const HUD_CROSSWALK_API = "https://www.huduser.gov/hudapi/public/usps?type=3&query=All";

const CACHE = ".geo-downloads";

/**
 * Download to a local cache, or explain precisely what to do by hand.
 *
 * Everything here is network, and network is where an ingester earns its
 * keep by failing legibly. A 403 from HUD means a missing token, not a broken
 * URL, and saying so saves an hour of looking in the wrong place.
 */
function download(url: string, dest: string, headers: string[] = []): boolean {
  mkdirSync(CACHE, { recursive: true });
  const out = path.join(CACHE, dest);
  if (existsSync(out)) {
    console.log(`  cached: ${out}`);
    return true;
  }
  console.log(`  fetching ${url}`);
  const args = ["-fsSL", "--retry", "3", "--retry-delay", "2", "-o", out];
  for (const h of headers) args.push("-H", h);
  args.push(url);
  const r = spawnSync("curl", args, { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status === 0 && existsSync(out)) return true;
  console.error(`  FAILED: ${url}`);
  return false;
}

/** Unpack a zip with whatever the platform has, and find the data file in it. */
function unzipAndFindTable(zipPath: string): string | null {
  const dir = zipPath.replace(/\.zip$/, "");
  mkdirSync(dir, { recursive: true });
  const r = process.platform === "win32"
    ? spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command",
      `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${dir}' -Force`], { stdio: "inherit" })
    : spawnSync("unzip", ["-o", "-q", zipPath, "-d", dir], { stdio: "inherit" });
  if (r.status !== 0) return null;

  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const files = walk(dir);
  const csv = files.find((f) => /\.csv$/i.test(f) && /m[as]|msa|metro/i.test(path.basename(f)))
    ?? files.find((f) => /\.csv$/i.test(f));
  if (csv) return csv;

  const xlsx = files.find((f) => /\.xlsx?$/i.test(f));
  if (xlsx) {
    console.error(
      `\n  The archive holds a spreadsheet, not a CSV:\n    ${xlsx}\n`
      + "  Open it, File -> Save As -> CSV, then re-run with --oews <that csv>.\n"
      + "  Guessing at a binary format is how a wrong number gets published.");
  }
  return null;
}

/**
 * Download only what was not already supplied.
 *
 * `--fetch --oews ./local.csv` means "fetch the half I have not got", not
 * "download everything and ignore what I passed you". Fetching a 40 MB archive
 * to then discard it is the kind of thing that looks like a hang.
 */
function fetchInputs(have: { oews?: string; crosswalk?: string }):
{ oews: string; crosswalk: string } | null {
  let oews = have.oews ?? null;
  if (!oews) {
    const oewsUrl = arg("oews-url") ?? DEFAULT_OEWS_URL;
    console.log("Fetching the OEWS metro file:");
    if (!download(oewsUrl, "oews.zip")) {
      console.error(
        "  BLS may have moved the release. Find the current MSA file at\n"
        + "  https://www.bls.gov/oes/tables.htm and pass --oews-url or --oews.");
      return null;
    }
    oews = /\.zip$/i.test(oewsUrl)
      ? unzipAndFindTable(path.join(CACHE, "oews.zip"))
      : path.join(CACHE, "oews.zip");
    if (!oews) return null;
  }

  if (have.crosswalk) return { oews, crosswalk: have.crosswalk };

  const token = arg("hud-token") ?? process.env.HUD_API_TOKEN;
  if (!token) {
    console.error(
      "\nThe HUD crosswalk needs a free API token.\n"
      + "  Register at https://www.huduser.gov/portal/dataset/uspszip-api.html,\n"
      + "  then re-run with --hud-token <token> or set HUD_API_TOKEN.\n"
      + "  Or download the ZIP-CBSA file by hand and pass --crosswalk <file>.");
    return null;
  }
  console.log("Fetching the HUD ZIP-CBSA crosswalk:");
  if (!download(HUD_CROSSWALK_API, "zip-cbsa.json", [`Authorization: Bearer ${token}`])) {
    console.error("  A 401 or 403 here means the token was rejected, not that the URL is wrong.");
    return null;
  }
  return { oews, crosswalk: path.join(CACHE, "zip-cbsa.json") };
}

/** HUD's API answers JSON; a hand-downloaded crosswalk is CSV. Accept both. */
function readCrosswalk(file: string): CrosswalkRow[] {
  const text = readFileSync(file, "utf8");
  if (file.endsWith(".json") || text.trimStart().startsWith("{")) {
    const body = JSON.parse(text) as { data?: { results?: Record<string, unknown>[] } };
    return (body.data?.results ?? []).map((r) => ({
      zip: String(r.zip ?? ""),
      cbsa: String(r.geoid ?? r.cbsa ?? ""),
      residentialRatio: Number(r.res_ratio ?? r.tot_ratio ?? 0),
    })).filter((r) => r.zip && r.cbsa);
  }
  return parseCsvRecords(text).map((r) => ({
    zip: pick(r, "ZIP"),
    cbsa: pick(r, "CBSA", "GEOID"),
    residentialRatio: Number(pick(r, "RES_RATIO", "RES RATIO", "TOT_RATIO")) || 0,
  })).filter((r) => r.zip && r.cbsa);
}

function main() {
  let oewsPath = arg("oews");
  let crosswalkPath = arg("crosswalk");

  if (flag("fetch") && (!oewsPath || !crosswalkPath)) {
    const got = fetchInputs({ oews: oewsPath, crosswalk: crosswalkPath });
    if (!got) process.exit(1);
    oewsPath = got.oews;
    crosswalkPath = got.crosswalk;
    console.log();
  }

  if (!oewsPath || !crosswalkPath) {
    console.error(
      "Usage: npm run expand:geo -- --fetch [--hud-token <token>] [--emit-seed]\n"
      + "   or: npm run expand:geo -- --oews <MSA csv> --crosswalk <ZIP_CBSA csv> [--emit-seed]\n\n"
      + "  --fetch      Download both files instead of pointing at local ones.\n"
      + "  --hud-token  Free HUD API token. Or set HUD_API_TOKEN.\n"
      + "  --oews       BLS OEWS metro file. Supplies the areas and their states.\n"
      + "  --crosswalk  HUD ZIP-to-CBSA crosswalk. Supplies ZIP -> area.\n"
      + "  --oews-url   Override the release --fetch downloads.\n"
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

  const crosswalk = readCrosswalk(crosswalkPath);
  console.log(`Read ${crosswalk.length} crosswalk rows.`);

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
