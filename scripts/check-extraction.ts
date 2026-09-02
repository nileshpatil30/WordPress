/**
 * Run the quote extractor against real documents and audit what comes back.
 *
 *   npm run test:extract -- fixtures/sample-quote.pdf
 *   npm run test:extract -- ~/quotes/*.pdf
 *   npm run test:extract -- ~/quotes/*.pdf --json out.json
 *
 * Reads ANTHROPIC_API_KEY from the environment or .env.local. The key is never
 * written anywhere by this script.
 *
 * Why this exists rather than "just look at the output":
 *
 * The extractor's schema has no field for a contractor's name, phone, email,
 * licence number or the property address. That prevents the obvious leak, but
 * it does not stop a model from putting a contractor's name into `notes`, or a
 * phone number into `paymentTerms`, or an address into a line item description.
 * Those are free-text fields and they will hold anything. A privacy promise
 * that is only enforced by the shape of the schema is not enforced at all, so
 * this sweeps every string that comes back and fails loudly on identity.
 *
 * The second thing it checks is honesty about silence. The whole quote-checker
 * rests on "not stated" meaning something different from "excluded". A model
 * that helpfully resolves ambiguity - marking an unmentioned permit as included
 * because most quotes include it - destroys that distinction while looking
 * completely correct. So every tri-state that came back resolved is reported
 * next to whether the document actually said anything, for a human to spot.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { extractQuote, mapExtractedQuote } from "../lib/extract/quote-extractor";
import { auditIdentity, isHardFailure, type IdentityFinding } from "../lib/extract/audit";
import type { ExtractedQuote } from "../lib/extract/schema";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/** Minimal .env.local reader so this works the same way `next dev` does. */
function loadEnvLocal() {
  if (process.env.ANTHROPIC_API_KEY) return;
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    // No .env.local. The key may still be in the environment.
  }
}

const MEDIA_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

const money = (n: number | null) =>
  n == null ? c.dim("not stated") : `$${n.toLocaleString("en-US")}`;

interface FileResult {
  file: string;
  ok: boolean;
  extracted?: ExtractedQuote;
  findings: IdentityFinding[];
  error?: string;
}

function report(r: FileResult) {
  console.log(`\n${c.bold(r.file)}`);

  if (r.error) {
    console.log(`  ${c.red("EXTRACTION FAILED")}  ${r.error}`);
    return;
  }
  const e = r.extracted!;
  const mapped = mapExtractedQuote(e);

  if (!e.isRoofingQuote) {
    console.log(`  ${c.yellow("Not read as a roofing quote")} (documentType: ${e.documentType})`);
    console.log(`  ${c.dim("This is correct behaviour if the file genuinely is not one.")}`);
    return;
  }

  console.log(`  ${"total".padEnd(18)} ${c.bold(money(e.totalPrice))}`);
  console.log(`  ${"material".padEnd(18)} ${e.materialFamily}` +
    (e.materialProductName ? c.dim(`  (${e.materialProductName})`) : ""));
  console.log(`  ${"measured".padEnd(18)} ${e.measuredSquares != null
    ? `${e.measuredSquares} squares` : e.roofAreaSqft != null
      ? `${e.roofAreaSqft.toLocaleString()} sq ft` : c.dim("not stated")}`);
  console.log(`  ${"confidence".padEnd(18)} ${e.extractionConfidence}`);
  console.log(`  ${"line items".padEnd(18)} ${e.lineItems.length}`);

  // Scope: the tri-state is the point, so show all three states explicitly.
  const scope = Object.entries(e.scope);
  const shown = (state: string) => scope.filter(([, v]) => v === state).map(([k]) => k);
  console.log(`  ${"scope included".padEnd(18)} ${shown("included").join(", ") || c.dim("none")}`);
  console.log(`  ${"scope excluded".padEnd(18)} ${shown("excluded").join(", ") || c.dim("none")}`);
  console.log(`  ${"scope not stated".padEnd(18)} ${c.cyan(shown("not_stated").join(", ") || "none")}`);

  if (mapped.missing.length) {
    console.log(`  ${"needs asking".padEnd(18)} ${mapped.missing.join(", ")}`);
  }
  if (e.redFlags.length) {
    console.log(`  ${c.yellow("red flags")}`);
    for (const f of e.redFlags) {
      console.log(`    - ${f.issue}`);
      console.log(`      ${c.dim(`"${f.quotedText.slice(0, 110)}"`)}`);
    }
  }

  const hard = r.findings.filter(isHardFailure);
  const soft = r.findings.filter((f) => !isHardFailure(f));

  if (hard.length) {
    console.log(`  ${c.red("PRIVACY FAILURE")} - identity data came back in structured fields:`);
    for (const f of hard) {
      console.log(`    ${c.red("x")} ${f.field}  ${c.dim(f.label)}  ${JSON.stringify(f.matched)}`);
    }
  } else {
    console.log(`  ${c.green("privacy ok")}       no contractor identity in any field`);
  }
  if (soft.length) {
    console.log(`  ${c.dim(`(${soft.length} identity-shaped match(es) inside quoted red-flag text - expected, review anyway)`)}`);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  loadEnvLocal();

  const argv = process.argv.slice(2);
  const jsonAt = argv.indexOf("--json");
  const jsonOut = jsonAt >= 0 ? argv[jsonAt + 1] : null;
  // Guard the -1 case: without --json, `jsonAt + 1` is 0 and would eat the
  // first file argument.
  const jsonValueAt = jsonAt >= 0 ? jsonAt + 1 : -1;
  const files = argv.filter((a, i) => !a.startsWith("--") && i !== jsonValueAt);

  if (!files.length) {
    console.error("Usage: npm run test:extract -- <file.pdf> [more files] [--json out.json]");
    process.exit(2);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set.\n" +
      "Put it in homecostdoctor/.env.local (which is gitignored):\n\n" +
      "  ANTHROPIC_API_KEY=sk-ant-...\n");
    process.exit(2);
  }

  console.log(c.dim(`Extracting ${files.length} document(s) with claude-opus-5...`));

  const results: FileResult[] = [];
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const mediaType = MEDIA_TYPE[ext];
    if (!mediaType) {
      results.push({ file: basename(file), ok: false, findings: [], error: `unsupported file type ${ext}` });
      continue;
    }
    try {
      const data = readFileSync(file).toString("base64");
      const extracted = await extractQuote({ data, mediaType });
      const findings = auditIdentity(extracted);
      results.push({
        file: basename(file),
        ok: !findings.some(isHardFailure),
        extracted,
        findings,
      });
    } catch (err) {
      results.push({
        file: basename(file), ok: false, findings: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const r of results) report(r);

  // ---- summary ----
  const failed = results.filter((r) => r.error);
  const leaked = results.filter((r) => r.findings.some(isHardFailure));
  const notQuotes = results.filter((r) => r.extracted && !r.extracted.isRoofingQuote);
  const noTotal = results.filter((r) => r.extracted?.isRoofingQuote && r.extracted.totalPrice == null);
  const noArea = results.filter((r) => r.extracted?.isRoofingQuote
    && r.extracted.measuredSquares == null && r.extracted.roofAreaSqft == null);

  console.log(`\n${c.bold("Summary")}`);
  console.log(`  documents            ${results.length}`);
  console.log(`  extraction errors    ${failed.length ? c.red(String(failed.length)) : "0"}`);
  console.log(`  privacy failures     ${leaked.length ? c.red(String(leaked.length)) : c.green("0")}`);
  console.log(`  not read as quotes   ${notQuotes.length}`);
  console.log(`  missing a total      ${noTotal.length}`);
  console.log(`  missing an area      ${noArea.length}`);

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(results, null, 2));
    console.log(`\n  full output written to ${jsonOut}`);
  }

  // A privacy failure or a crash is a real failure. A document the model
  // declined to read as a quote is information, not an error.
  process.exit(leaked.length || failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
