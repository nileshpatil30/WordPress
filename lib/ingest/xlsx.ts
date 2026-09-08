import { inflateRawSync } from "node:zlib";

/**
 * Just enough .xlsx to read a government data table.
 *
 * BLS ships the OEWS metro file as a spreadsheet inside a zip, so the
 * geography expander used to stop and ask somebody to open Excel and save it
 * as CSV. That is a small ask that reliably does not happen, and it is the
 * step before the one command that would otherwise take coverage from 17
 * cities to every metro in the country.
 *
 * This is deliberately not a spreadsheet library. It reads a rectangle of
 * values from the first worksheet: no formulas, no styles, no dates, no
 * formatting. A statistical agency's data table is a rectangle of text and
 * numbers, and anything richer than that is not the file we are looking at.
 *
 * An .xlsx is a zip of XML. Node has inflateRawSync but no zip reader, so the
 * container is parsed here too - about forty lines, against a dependency that
 * would have to be audited and kept current for the rest of the project's life.
 */

interface ZipEntry { name: string; method: number; data: Buffer }

/**
 * Read the zip central directory rather than scanning for local headers.
 *
 * Local headers can carry a zero size with the real one in a trailing data
 * descriptor, which is exactly what a streamed writer produces - so scanning
 * works on files written one way and silently truncates files written the
 * other. The central directory is the authority in both cases.
 */
export function unzip(buf: Buffer): Map<string, Buffer> {
  const EOCD = 0x06054b50;
  let eocd = -1;
  // The comment field means the record is not always at a fixed offset.
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip file: no end-of-central-directory record");

  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset === 0xffffffff) {
    throw new Error("ZIP64 archives are not supported; this reader expects a data table, not a disk image");
  }

  const out = new Map<string, Buffer>();
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("corrupt central directory");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    // The local header repeats the name and extra fields, and its extra field
    // length routinely differs from the central one - so it has to be read
    // here rather than reused.
    const lhNameLen = buf.readUInt16LE(localOffset + 26);
    const lhExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lhNameLen + lhExtraLen;
    const raw = buf.subarray(start, start + compSize);

    if (method === 0) out.set(name, Buffer.from(raw));
    else if (method === 8) out.set(name, inflateRawSync(raw));
    else throw new Error(`unsupported zip compression method ${method} for ${name}`);
  }
  return out;
}

/** "BM12" -> 11. Column letters are base-26 with no zero. */
export function columnIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const unescapeXml = (s: string) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&amp;/g, "&");

/** Text of every <si>, flattening the <r> runs Excel splits formatting across. */
function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const si of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = "";
    for (const t of si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
    out.push(unescapeXml(text));
  }
  return out;
}

/**
 * The first worksheet as rows of strings.
 *
 * Empty cells are omitted from the XML entirely, so gaps are filled by column
 * reference. Reading cells in document order instead would shift every value
 * after the first blank into the wrong column - which in a wage table means
 * silently reading the 25th percentile as the median.
 */
export function readXlsx(buf: Buffer): string[][] {
  const files = unzip(buf);
  const shared = files.has("xl/sharedStrings.xml")
    ? sharedStrings(files.get("xl/sharedStrings.xml")!.toString("utf8"))
    : [];

  const sheetName = [...files.keys()]
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort()[0];
  if (!sheetName) throw new Error("no worksheet found in workbook");
  const xml = files.get(sheetName)!.toString("utf8");

  const rows: string[][] = [];
  for (const row of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const c of row[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>|<c([^>]*)\/>/g)) {
      const attrs = c[1] ?? c[3] ?? "";
      const body = c[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const at = ref ? columnIndex(ref) : cells.length;
      while (cells.length < at) cells.push("");

      let value = "";
      if (type === "inlineStr") {
        for (const t of body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) value += t[1];
        value = unescapeXml(value);
      } else {
        const v = /<v[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
        value = type === "s" ? (shared[Number(v)] ?? "") : unescapeXml(v);
      }
      cells[at] = value;
    }
    rows.push(cells);
  }
  return rows;
}

/** Rows keyed by the header row, matching parseCsvRecords so callers do not care. */
export function readXlsxRecords(buf: Buffer): Record<string, string>[] {
  const rows = readXlsx(buf);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toUpperCase());
  return rows.slice(1).map((cells) => {
    const out: Record<string, string> = {};
    headers.forEach((h, i) => { out[h] = (cells[i] ?? "").trim(); });
    return out;
  });
}
