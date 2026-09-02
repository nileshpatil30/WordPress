/**
 * Load the seeded reference data into PostgreSQL.
 *
 *   psql "$DATABASE_URL" -f db/schema.sql
 *   npm run db:seed
 *
 * Idempotent: every insert is ON CONFLICT DO UPDATE, so re-running after a seed
 * edit updates rows in place rather than failing or duplicating. It does NOT
 * touch runtime tables (estimate_requests, submissions, leads, audit_log).
 */
import { Pool } from "pg";
import { seedDataset } from "../lib/data/seed";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Nothing to seed.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

function snake(key: string) {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

async function upsert(table: string, rows: readonly object[]) {
  if (!rows.length) return;
  let count = 0;
  for (const row of rows) {
    const entries = Object.entries(row as Record<string, unknown>)
      .filter(([, v]) => v !== undefined);
    const cols = entries.map(([k]) => snake(k));
    const placeholders = entries.map((_, i) => `$${i + 1}`);
    // Arrays map to real Postgres arrays (price_index_series.applies_to is a
    // cost_component[]), so pass them through for the driver to serialise.
    // JSON-stringifying one produces '["material"]', which will not cast.
    const values = entries.map(([, v]) =>
      Array.isArray(v) ? v
        : v !== null && typeof v === "object" ? JSON.stringify(v) : v);
    const updates = cols.filter((c) => c !== "id").map((c) => `${c} = EXCLUDED.${c}`);

    await pool.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})
       ON CONFLICT (id) DO UPDATE SET ${updates.join(", ")}`,
      values);
    count++;
  }
  console.log(`  ${table.padEnd(20)} ${count}`);
}

async function main() {
  console.log("Seeding reference data into PostgreSQL...");
  // Order matters: foreign keys.
  await upsert("countries", seedDataset.countries);
  await upsert("states", seedDataset.states);
  await upsert("metros", seedDataset.metros);
  await upsert("cities", seedDataset.cities);
  await upsert("zip_codes", seedDataset.zipCodes);
  await upsert("services", seedDataset.services);
  await upsert("project_types", seedDataset.projectTypes);
  await upsert("materials", seedDataset.materials);
  await upsert("pricing_sources", seedDataset.pricingSources);
  await upsert("pricing_records", seedDataset.pricingRecords);
  await upsert("pricing_factors", seedDataset.pricingFactors);
  await upsert("price_index_series", seedDataset.priceIndexSeries);
  await upsert("price_index_points", seedDataset.priceIndexPoints);

  const { rows } = await pool.query(
    "SELECT COUNT(*) FILTER (WHERE data_status = 'sample') AS sample, COUNT(*) AS total FROM pricing_records");
  console.log(`\nDone. ${rows[0].sample} of ${rows[0].total} price rows are SAMPLE data.`);
  console.log("Replace them with verified sources before showing estimates to real users.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
