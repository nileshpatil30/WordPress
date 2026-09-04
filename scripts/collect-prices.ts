/**
 * Turn a filled-in price worksheet into the observations file the materials
 * ingester expects.
 *
 *   npm run collect:prices
 *   npm run collect:prices -- --out data/materials.csv
 *
 * Why this exists: data/materials-template.csv asks for a low, median and high
 * per material, in dollars per roofing square. Getting there from a shop
 * listing means knowing that a bundle covers 33.33 sq ft, that three make a
 * square, and how to turn several products into a range. That is a pile of
 * judgement to put on whoever is doing the collecting.
 *
 * So the worksheet asks for one thing per row - the price on the page - and
 * this does the rest: converts each listing to dollars per square, then takes
 * the spread across the products for that material as the range.
 *
 * Nothing is invented. Every row keeps the store, the URL and the date it was
 * observed, and the ingester still applies the documented retail-to-trade
 * discount afterwards, because a shelf price is not what a contractor pays.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { summariseListings, type Listing } from "../lib/ingest/worksheet";

interface Row {
  material_slug: string; what_to_search_for: string; store: string;
  price: string; price_unit: string; coverage_sqft: string; url: string; date: string;
}

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** Minimal CSV reader: handles quoted fields, which product names contain. */
function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  const head = splitLine(lines[0]);
  return lines.slice(1).filter((l) => l.trim()).map((l) => {
    const cells = splitLine(l);
    return Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? "").trim()])) as unknown as Row;
  });
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function main() {
  const file = arg("file") ?? "data/price-worksheet.csv";
  const out = arg("out") ?? "data/materials.csv";
  const rows = parseCsv(readFileSync(file, "utf8"));

  const usable = rows.filter((r) => r.price && Number.isFinite(Number(r.price)) && Number(r.price) > 0);
  const skipped = rows.length - usable.length;
  console.log(`Read ${rows.length} rows from ${file}; ${usable.length} have a price.`);
  if (skipped) console.log(`${skipped} row${skipped === 1 ? "" : "s"} left blank and ignored.\n`);
  if (!usable.length) {
    console.error("Nothing to convert. Fill in the price column and run this again.");
    process.exit(1);
  }

  const missingUrl = usable.filter((r) => !r.url.trim());
  if (missingUrl.length) {
    console.error(
      `${missingUrl.length} row(s) have a price but no url. A price without a source is not usable here -\n`
      + `paste the address of the page you read it from:\n`
      + missingUrl.map((r) => `  ${r.material_slug} - ${r.what_to_search_for}`).join("\n"));
    process.exit(1);
  }
  const badDate = usable.filter((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.date.trim()));
  if (badDate.length) {
    console.error(`${badDate.length} row(s) need a date as YYYY-MM-DD, e.g. 2026-09-04.`);
    process.exit(1);
  }

  const listings: Listing[] = usable.map((r) => {
    const coverage = Number(r.coverage_sqft);
    if (!(coverage > 0)) {
      console.error(
        `${r.material_slug} (${r.what_to_search_for}): coverage_sqft is "${r.coverage_sqft}".\n`
        + "  It is how many square feet that one price buys, and the product title on the page\n"
        + "  usually states it - e.g. \"33.33 sq. ft. per Bundle\". Fill it in and run this again.");
      process.exit(1);
    }
    return {
      materialSlug: r.material_slug, price: Number(r.price), coverageSqft: coverage,
      store: r.store, product: r.what_to_search_for, url: r.url.trim(), date: r.date.trim(),
    };
  });

  const summaries = summariseListings(listings);
  const lines = ["material_slug,metric_key,unit,channel,low,median,high,source_name,source_ref,observed_date,geo_scope_type,geo_scope_id,sample_size,notes"];
  console.log("Dollars per roofing square, before the retail-to-trade discount:\n");

  for (const m of summaries) {
    lines.push([
      m.materialSlug, "material.per_square", "square", "retail",
      String(m.low), String(m.median), String(m.high),
      m.stores, m.urls, m.date, "country", "us", String(m.sampleSize), m.notes,
    ].map(csvCell).join(","));

    console.log(
      `  ${m.materialSlug.padEnd(26)} $${m.low.toFixed(2).padStart(8)} $${m.median.toFixed(2).padStart(8)} `
      + `$${m.high.toFixed(2).padStart(8)}   from ${m.sampleSize} listing${m.sampleSize === 1 ? "" : "s"}`
      + (m.bandIsAssumed ? "   (band assumed, not observed)" : ""));
  }

  writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(`\nWrote ${summaries.length} material rows to ${out}`);
  console.log(`Next: npm run ingest:materials -- --file ${out} --collected ${new Date().toISOString().slice(0, 10)}`);
}

main();
