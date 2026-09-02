/**
 * Shared query-param decoding for calculator prefill.
 *
 * City pages, ZIP pages, the quote tools and shared links all pass project
 * details through the URL, so the decode rules live in one place rather than
 * being re-implemented per page.
 */
const PASSTHROUGH = new Set([
  "zip", "areaMode", "roofAreaSqft", "houseSqft", "stories", "material", "projectType",
  "quality", "pitch", "complexity", "planes", "skylights", "chimneys", "existingLayers",
  "existingMaterial", "underlayment", "flashing", "ventilation", "ventilationQty",
  "deckSheets", "access", "warranty", "includePermit", "includeDisposal", "gutterLf",
]);

const NUMERIC = new Set([
  "roofAreaSqft", "houseSqft", "stories", "planes", "skylights", "chimneys",
  "existingLayers", "ventilationQty", "deckSheets", "gutterLf",
]);

/** Query params let city pages, quote tools and shared links prefill the form. */
export function readInitialValues(sp: Record<string, string | string[] | undefined>) {
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(sp)) {
    if (!PASSTHROUGH.has(k) || raw === undefined) continue;
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v === "") continue;
    if (NUMERIC.has(k)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    } else if (v === "true" || v === "false") {
      out[k] = v === "true";
    } else {
      out[k] = v;
    }
  }
  return out;
}
