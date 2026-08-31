/**
 * Shareable result links.
 *
 * The inputs are encoded into the URL itself rather than stored behind an id.
 * That means: no database row to leak, no guessable identifier, nothing to
 * expire, and a shared link recomputes against current pricing instead of
 * showing a frozen number from months ago.
 *
 * Keys are shortened before encoding purely to keep the URL manageable - a
 * full-field link is around 200 characters this way rather than 400.
 */
const SHORT: Record<string, string> = {
  zip: "z", areaMode: "am", roofAreaSqft: "ra", houseSqft: "hs", stories: "st",
  material: "m", projectType: "pt", quality: "q", pitch: "p", complexity: "c",
  planes: "pl", skylights: "sk", chimneys: "ch", existingLayers: "el",
  existingMaterial: "em", underlayment: "u", flashing: "f", ventilation: "v",
  ventilationQty: "vq", deckSheets: "ds", access: "a", warranty: "w",
  includePermit: "ip", includeDisposal: "id", gutterLf: "g", quotedPrice: "qp",
};
const LONG: Record<string, string> = Object.fromEntries(
  Object.entries(SHORT).map(([k, v]) => [v, k]));

/** Base64url that works in both the browser and Node, without a polyfill. */
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(text, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): string {
  const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export function encodeShare(values: Record<string, unknown>): string {
  const packed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const short = SHORT[key];
    if (!short || value === undefined || value === null || value === "") continue;
    packed[short] = value;
  }
  return toBase64Url(JSON.stringify(packed));
}

export function decodeShare(token: string): Record<string, unknown> | null {
  // A hand-edited or truncated link should render a 404, never a crash.
  if (!/^[A-Za-z0-9_-]{4,2000}$/.test(token)) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(token));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const out: Record<string, unknown> = {};
    for (const [short, value] of Object.entries(parsed as Record<string, unknown>)) {
      const key = LONG[short];
      // Drop anything not in the allow-list rather than passing it through to
      // the engine - a share link is untrusted input like any other.
      if (!key) continue;
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        continue;
      }
      out[key] = value;
    }
    return /^\d{5}$/.test(String(out.zip ?? "")) ? out : null;
  } catch {
    return null;
  }
}
