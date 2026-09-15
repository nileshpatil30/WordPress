/**
 * Read homeowner submissions off the live host back into the project.
 *
 *   npm run import:submissions -- --file ./submissions.jsonl
 *   npm run import:submissions -- --file ./submissions.jsonl --apply
 *
 * Download hcd-data/submissions.jsonl from the host first (it sits beside
 * public_html, not inside it, so it is not reachable over the web).
 *
 * Dry run by default like every other ingester here. What it writes is
 * `pending` rows in the store, which no estimate reads - a homeowner's figure
 * becomes usable only after a human approves it in the admin console. That is
 * not friction for its own sake: one mistyped amount in an aggregate is a
 * wrong number on a page that promises to show its working.
 */
import { readFileSync } from "node:fs";
import { getStore } from "../lib/data/store";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (n: string) => process.argv.includes(`--${n}`);

/** What submit.php writes, restated here so a shape change fails loudly. */
interface Row {
  id?: string;
  serviceSlug?: string;
  zip?: string;
  projectMonth?: string;
  amountPaid?: number;
  materialId?: string | null;
  roofAreaSqft?: number | null;
  inputs?: Record<string, unknown>;
  quotesReceived?: number | null;
  consentVersion?: string;
  submittedAt?: string;
}

async function main() {
  const file = arg("file");
  if (!file) {
    console.error(
      "Usage: npm run import:submissions -- --file <submissions.jsonl> [--apply]\n\n"
      + "  --file   The JSON Lines file downloaded from hcd-data/ on the host.\n"
      + "  --apply  Actually write. Without it, nothing is stored.\n");
    process.exit(1);
  }

  const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.trim());
  console.log(`Read ${lines.length} line(s) from ${file}.`);

  const store = await getStore();
  const rows: Row[] = [];
  const rejected: { line: number; reason: string }[] = [];

  lines.forEach((line, i) => {
    let row: Row;
    try { row = JSON.parse(line) as Row; } catch { rejected.push({ line: i + 1, reason: "not JSON" }); return; }

    // Re-validate rather than trusting the file. It arrives off a public
    // endpoint by way of a manual download, and the checks are cheap.
    if (!/^\d{5}$/.test(String(row.zip))) { rejected.push({ line: i + 1, reason: "bad zip" }); return; }
    if (!/^\d{4}-\d{2}$/.test(String(row.projectMonth))) { rejected.push({ line: i + 1, reason: "bad projectMonth" }); return; }
    const amt = Number(row.amountPaid);
    if (!Number.isFinite(amt) || amt <= 0 || amt > 2_000_000) { rejected.push({ line: i + 1, reason: "bad amountPaid" }); return; }
    if (!row.consentVersion) { rejected.push({ line: i + 1, reason: "no consent version" }); return; }
    rows.push(row);
  });

  if (rejected.length) {
    console.log(`\n${rejected.length} line(s) rejected:`);
    for (const r of rejected) console.log(`  line ${r.line}: ${r.reason}`);
  }
  if (!rows.length) {
    console.log("\nNothing usable to import.");
    process.exit(rejected.length ? 1 : 0);
  }

  // Skip anything already stored. The file on the host is append-only and
  // never truncated, so every import re-reads rows imported last time.
  const existing = new Set((await store.listSubmissions()).map((r) => r.id));
  const fresh = rows.filter((r) => r.id && !existing.has(r.id));
  console.log(`\n${rows.length} valid, ${rows.length - fresh.length} already imported, ${fresh.length} new.`);

  const byMonth = new Map<string, number[]>();
  for (const r of fresh) {
    byMonth.set(r.projectMonth!, [...(byMonth.get(r.projectMonth!) ?? []), Number(r.amountPaid)]);
  }
  if (fresh.length) {
    console.log("\nNew submissions by project month:");
    for (const [month, amounts] of [...byMonth].sort()) {
      const sorted = [...amounts].sort((a, b) => a - b);
      const mid = sorted[Math.floor(sorted.length / 2)];
      console.log(`  ${month}  n=${String(amounts.length).padStart(3)}  median $${mid.toLocaleString("en-US")}`);
    }
  }

  if (!flag("apply")) {
    console.log("\nDRY RUN. Nothing written. Re-run with --apply to store them as pending.");
    return;
  }

  let written = 0;
  for (const r of fresh) {
    const service = await store.getServiceBySlug(r.serviceSlug ?? "roofing");
    if (!service) { console.log(`  skipped ${r.id}: unknown service "${r.serviceSlug}"`); continue; }
    await store.saveActualProjectCost({
      id: r.id!,
      serviceId: service.id,
      zip: r.zip!,
      projectMonth: r.projectMonth!,
      amountPaid: Number(r.amountPaid),
      materialId: r.materialId ?? undefined,
      roofAreaSqft: r.roofAreaSqft ?? undefined,
      inputs: r.inputs ?? {},
      quotesReceived: r.quotesReceived ?? undefined,
      consentVersion: r.consentVersion!,
      status: "pending",
      submittedAt: r.submittedAt ?? new Date().toISOString(),
    });
    written++;
  }
  console.log(`\nStored ${written} row(s) as pending. Approve them in the admin console before any estimate uses them.`);
}

main();
