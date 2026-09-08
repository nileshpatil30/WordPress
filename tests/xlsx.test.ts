import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { columnIndex, readXlsx, readXlsxRecords, unzip } from "@/lib/ingest/xlsx";

const DIR = "tests/fixtures";
/** Written by openpyxl, which stores strings inline. */
const buf = () => readFileSync(`${DIR}/oesm.xlsx`);
/** Hand-built the way Excel writes: strings pooled and referenced by index. */
const pooled = () => readFileSync(`${DIR}/shared.xlsx`);

describe("reading a government data table out of .xlsx", () => {
  it("unzips the parts a workbook is made of", () => {
    const files = unzip(buf());
    expect([...files.keys()]).toContain("xl/worksheets/sheet1.xml");
  });

  it("reads a stored entry as well as a deflated one", () => {
    // Zips mix compression methods per entry, and a reader that only handles
    // deflate fails on whichever file happens to have been stored.
    const files = unzip(pooled());
    expect(files.get("docProps/core.xml")!.toString()).toBe("<x/>");
    expect(files.get("xl/sharedStrings.xml")!.toString()).toContain("<sst");
  });

  it("resolves pooled strings, which is how Excel actually writes them", () => {
    // openpyxl stores strings inline, so the fixture above never exercises
    // t="s". A real BLS workbook does nothing else.
    const rec = readXlsxRecords(pooled());
    expect(rec[0].AREA).toBe("38900");
    expect(rec[0].H_MEDIAN).toBe("32.15");
    expect(rec[0].AREA_TITLE).toBe("");
    expect(rec[1].AREA).toBe('Portland & "PDX", OR-WA');
    expect(rec[1].AREA_TITLE).toBe("inline & escaped");
  });

  it("reads the header and every row", () => {
    const rows = readXlsx(buf());
    expect(rows[0].slice(0, 3)).toEqual(["AREA", "AREA_TITLE", "PRIM_STATE"]);
    expect(rows).toHaveLength(5);
  });

  it("holds a blank cell's place instead of shifting the row left", () => {
    // The row that matters. Excel omits an empty cell from the XML entirely,
    // so reading cells in document order would slide every later value one
    // column left - which in a wage table means publishing the 25th percentile
    // as the median. Denver's TOT_EMP is blank on purpose.
    const denver = readXlsxRecords(buf()).find((r) => r.AREA === "19740")!;
    expect(denver.TOT_EMP).toBe("");
    expect(denver.H_PCT25).toBe("22.1");
    expect(denver.H_MEDIAN).toBe("27.44");
    expect(denver.H_PCT75).toBe("33.75");
  });

  it("keys rows by header, the same shape parseCsvRecords returns", () => {
    const rec = readXlsxRecords(buf());
    const portland = rec.find((r) => r.AREA === "38900")!;
    expect(portland.AREA_TITLE).toBe("Portland-Vancouver-Hillsboro, OR-WA");
    expect(portland.PRIM_STATE).toBe("OR");
    expect(portland.H_MEDIAN).toBe("32.15");
  });

  it("unescapes XML entities in shared strings", () => {
    const odd = readXlsxRecords(buf()).find((r) => r.AREA === "12345")!;
    expect(odd.AREA_TITLE).toBe('Ampersand & "quoted", NY');
  });

  it("converts spreadsheet column references", () => {
    expect(columnIndex("A1")).toBe(0);
    expect(columnIndex("Z9")).toBe(25);
    expect(columnIndex("AA1")).toBe(26);
    expect(columnIndex("BM12")).toBe(64);
  });

  it("says what is wrong rather than returning nonsense", () => {
    expect(() => unzip(Buffer.from("not a zip at all"))).toThrow(/no end-of-central-directory/);
  });
});
