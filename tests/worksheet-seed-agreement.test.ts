import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { observedMaterialRecords } from "@/lib/data/seed/materials";

/**
 * The collected worksheets and the shipped seed have to agree.
 *
 * Collection happens in rounds, each its own data/price-worksheet*.csv, and
 * `ingest:materials --emit-seed` rewrites the whole seed module from one CSV.
 * So the natural next command after a second round -
 * `collect:prices --file data/price-worksheet-round2.csv` - used to produce a
 * materials.csv holding only round two, and ingesting it deleted round one.
 * Nothing on screen looked wrong; the site just went back to modelled numbers.
 *
 * collect:prices now reads every worksheet and the ingester refuses a lossy
 * emit without --replace. This is the backstop for both: if a material has a
 * priced row somebody collected and the seed does not carry it, that work has
 * been dropped somewhere between the two.
 */
const worksheetRows = () => readdirSync("data")
  .filter((f) => /^price-worksheet.*\.csv$/.test(f))
  .flatMap((f) => {
    const [header, ...lines] = readFileSync(path.join("data", f), "utf8")
      .split("\n").filter((l) => l.trim());
    const cols = header.split(",");
    return lines.map((line) => {
      // Good enough for these files: the only quoted field is the URL, which
      // holds no commas. A real parser lives in lib/ingest/csv.ts.
      const cells = line.split(",");
      return Object.fromEntries(cols.map((c, i) => [c.trim(), (cells[i] ?? "").trim()]));
    });
  });

describe("collected worksheets and the shipped seed", () => {
  it("ships a priced row for every material somebody collected", () => {
    const collected = new Set(
      worksheetRows()
        .filter((r) => Number(r.price) > 0)
        .map((r) => r.material_slug));
    const seeded = new Set(
      observedMaterialRecords.map((r) => (r.materialId ?? "").replace(/^mat-/, "")));

    const dropped = [...collected].filter((slug) => !seeded.has(slug));
    expect(dropped, `collected but missing from the seed: ${dropped.join(", ")}`).toEqual([]);
  });

  it("does not ship a material no worksheet supports", () => {
    // The other direction: a seed row with no collection behind it is a number
    // whose provenance cannot be checked, which is the one thing this project
    // does not ship.
    const collected = new Set(
      worksheetRows().filter((r) => Number(r.price) > 0).map((r) => r.material_slug));
    for (const r of observedMaterialRecords) {
      const slug = (r.materialId ?? "").replace(/^mat-/, "");
      expect(collected.has(slug), `seeded with no worksheet rows: ${slug}`).toBe(true);
    }
  });

  it("keeps every observed record pointing at the material the engine looks up", () => {
    for (const r of observedMaterialRecords) {
      expect(r.materialId, `${r.id} has no materialId and is unreachable`).toBeTruthy();
      expect(r.materialId).toMatch(/^mat-/);
    }
  });
});
