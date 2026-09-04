import type { Metro, State, ZipCode } from "@/lib/types";

/**
 * Turning public federal files into geographic coverage.
 *
 * Coverage used to be capped by editorial effort rather than by data. Every
 * ZIP had to belong to a hand-written city, so a homeowner in Portland or
 * Denver - both large metros BLS publishes roofer wages for - got the national
 * fallback, because nobody had written a Portland page yet.
 *
 * Two public files close that gap, and neither needs a licence:
 *
 *   BLS OEWS metro file   CBSA code, area title, primary state
 *   HUD ZIP-CBSA crosswalk    ZIP -> CBSA, updated quarterly
 *
 * Both are US federal works in the public domain. What comes out of here is
 * geography only: places and their codes. Not one price.
 */

/** A CBSA as the OEWS file describes it. */
export interface AreaRow {
  /** CBSA code, unpadded. */
  cbsa: string;
  /** e.g. "Portland-Vancouver-Hillsboro, OR-WA". */
  title: string;
  /** Two-letter primary state, e.g. "OR". */
  primaryState: string;
}

export interface GeoExpansion {
  metros: Metro[];
  states: State[];
  /** Areas that could not be placed, with the reason. Never silently dropped. */
  skipped: { cbsa: string; title: string; reason: string }[];
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * "Portland-Vancouver-Hillsboro, OR-WA" -> "Portland-Vancouver-Hillsboro".
 *
 * The state suffix is dropped because our Metro.name is rendered beside the
 * state code already, and "Portland-Vancouver-Hillsboro, OR-WA metro area, OR"
 * reads like a bug.
 */
export const metroName = (title: string) => title.split(",")[0].trim();

/** US state and territory names, for building a State row from a code alone. */
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin",
  WY: "Wyoming", PR: "Puerto Rico", VI: "U.S. Virgin Islands", GU: "Guam",
};

/**
 * Metros and states for every area in the file we do not already carry.
 *
 * `existing` wins on every collision. Hand-written metros carry ids other rows
 * reference (`metro-phx`) and names chosen to read well, and regenerating them
 * from a fresh BLS release would silently rename them - which is how a metro
 * quietly loses its wage data when BLS renames "Phoenix-Mesa-Scottsdale" to
 * "Phoenix-Mesa-Chandler".
 */
export function expandGeography(
  areas: AreaRow[],
  existing: { metros: Metro[]; states: State[] },
  countryId = "us",
): GeoExpansion {
  const haveCbsa = new Set(existing.metros.map((m) => m.cbsaCode?.trim()).filter(Boolean));
  const haveStateCode = new Map(existing.states.map((s) => [s.code, s]));

  const metros: Metro[] = [];
  const states: State[] = [];
  const skipped: GeoExpansion["skipped"] = [];
  const seen = new Set<string>();

  for (const a of areas) {
    const cbsa = a.cbsa.trim().replace(/^0+/, "");
    if (!cbsa || !/^\d+$/.test(cbsa)) {
      skipped.push({ cbsa: a.cbsa, title: a.title, reason: "no usable CBSA code" });
      continue;
    }
    if (haveCbsa.has(cbsa) || seen.has(cbsa)) continue;

    const code = a.primaryState.trim().toUpperCase();
    const name = STATE_NAMES[code];
    if (!name) {
      // Better to lose one area than to invent a state. A CBSA we cannot place
      // in a state has no working fallback when its wage data is suppressed.
      skipped.push({ cbsa, title: a.title, reason: `unknown state code "${a.primaryState}"` });
      continue;
    }
    seen.add(cbsa);

    if (!haveStateCode.has(code)) {
      const state: State = {
        id: `${countryId}-${code.toLowerCase()}`,
        countryId, code, name, slug: slugify(name),
        // Neutral, and honest about it. A state index is only consulted when
        // no metro row answers, and inventing a multiplier for a state we have
        // never priced would be a number with no evidence behind it wearing
        // the same clothes as one that has.
        laborIndex: 1, materialIndex: 1, dataStatus: "sample",
      };
      haveStateCode.set(code, state);
      states.push(state);
    }

    metros.push({
      id: `metro-cbsa-${cbsa}`,
      countryId,
      stateId: haveStateCode.get(code)!.id,
      name: metroName(a.title),
      slug: slugify(metroName(a.title)),
      cbsaCode: cbsa,
    });
  }

  return { metros, states, skipped };
}

/** One row of the HUD ZIP-to-CBSA crosswalk. */
export interface CrosswalkRow {
  zip: string;
  cbsa: string;
  /**
   * Share of the ZIP's residential addresses in this CBSA. HUD splits a ZIP
   * that straddles a boundary across several rows.
   */
  residentialRatio: number;
}

/**
 * ZIP rows for every ZIP the crosswalk can place in a metro we carry.
 *
 * A ZIP straddling two CBSAs gets the one holding most of its homes. Averaging
 * two metros' wages would produce a rate nobody pays, and picking the first row
 * would make the output depend on file order.
 *
 * ZIPs we already carry are left alone: those belong to a written city, and a
 * crosswalk row must not quietly move a ZIP off its city page.
 */
export function crosswalkZips(
  rows: CrosswalkRow[],
  metros: Metro[],
  existing: ZipCode[],
  countryId = "us",
): { zipCodes: ZipCode[]; unmatchedCbsas: number } {
  const byCbsa = new Map(metros.filter((m) => m.cbsaCode).map((m) => [m.cbsaCode!.trim(), m]));
  const have = new Set(existing.map((z) => z.code));

  const best = new Map<string, { cbsa: string; ratio: number }>();
  const unmatched = new Set<string>();

  for (const r of rows) {
    const zip = r.zip.trim().padStart(5, "0");
    if (!/^\d{5}$/.test(zip) || have.has(zip)) continue;
    const cbsa = r.cbsa.trim().replace(/^0+/, "");
    if (!byCbsa.has(cbsa)) { unmatched.add(cbsa); continue; }
    const prev = best.get(zip);
    if (!prev || r.residentialRatio > prev.ratio) best.set(zip, { cbsa, ratio: r.residentialRatio });
  }

  const zipCodes: ZipCode[] = [...best].sort(([a], [b]) => a.localeCompare(b)).map(([zip, hit]) => {
    const metro = byCbsa.get(hit.cbsa)!;
    return {
      id: `zip-${zip}`,
      countryId,
      stateId: metro.stateId,
      metroId: metro.id,
      code: zip,
      // No city and no page. This ZIP exists so the calculator can price it at
      // metro scope, not so it can rank for anything.
      pageEligible: false,
    };
  });

  return { zipCodes, unmatchedCbsas: unmatched.size };
}
