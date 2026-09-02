/**
 * Minimal RFC 4180 CSV reader.
 *
 * Written rather than pulled in as a dependency because the one thing we
 * actually need is correct handling of quoted fields containing commas - BLS
 * area titles are all of the form "Phoenix-Mesa-Chandler, AZ", and a naive
 * split(",") silently shifts every column after AREA_TITLE. That failure mode
 * is quiet and produces plausible-looking wrong numbers, which is exactly the
 * class of bug this product exists to avoid.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM; BLS files ship with one and it corrupts the first header.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field); field = "";
      // Skip blank trailing lines rather than emitting a one-empty-field row.
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }

  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Parse into objects keyed by the header row. Headers are upper-cased. */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toUpperCase());
  return rows.slice(1).map((cells) => {
    const out: Record<string, string> = {};
    headers.forEach((h, i) => { out[h] = (cells[i] ?? "").trim(); });
    return out;
  });
}
