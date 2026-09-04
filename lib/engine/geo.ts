import type { PricingFactor, PricingRecord } from "@/lib/types";
import type { GeoLevel, GeoResolution, PriceTriple } from "./types";
import type { DataStore } from "@/lib/data/store";
import { NO_ESCALATION, type Escalation, type Escalator } from "@/lib/escalation";

/**
 * Resolve a ZIP to the geography chain, then let the price lookup walk that
 * chain from most specific to least. This is the mechanism that makes "add a
 * city" a data operation: drop in a city row plus city-scoped pricing records
 * and every ZIP under it immediately resolves one level finer.
 */
export async function resolveGeo(store: DataStore, zip: string): Promise<GeoResolution> {
  const zipRecord = await store.getZipByCode(zip);
  const city = zipRecord?.cityId ? await store.getCityById(zipRecord.cityId) : null;

  // A city is editorial; a metro is data. Prefer the city's metro when there
  // is a city, and fall back to the one the ZIP crosswalk carries - that is
  // what lets a ZIP nobody has written about still price at metro scope.
  const metroId = city?.metroId ?? zipRecord?.metroId;
  const metro = metroId
    ? (await store.listMetros()).find((m) => m.id === metroId) ?? null
    : null;

  const stateId = city?.stateId ?? zipRecord?.stateId;
  const states = await store.listStates();
  const state = stateId ? states.find((s) => s.id === stateId) ?? null : null;

  return {
    zip,
    zipRecord,
    city,
    metro,
    state,
    bestLevel: "country", // replaced by the first lookup that finds data
    label: label(city, metro, state),
    // Placed at all, not placed in a city. A ZIP resolving to a metro is using
    // that metro's wage data, which is the opposite of a national fallback.
    isFallback: !state,
  };
}

/** "Phoenix, AZ" with a city, "Portland metro area, OR" without one. */
export function label(
  city: { name: string } | null, metro: { name: string } | null, state: { code: string } | null,
): string {
  if (!state) return "United States (national)";
  if (city) return `${city.name}, ${state.code}`;
  if (metro) return `${metro.name} metro area, ${state.code}`;
  return `${state.code} (statewide)`;
}

const LEVEL_ORDER: GeoLevel[] = ["zip", "city", "metro", "state", "country", "global"];

export interface PriceLookupHit {
  record: PricingRecord;
  level: GeoLevel;
  /** The price actually used, after any index escalation. */
  triple: PriceTriple;
  /** Set only when a published index moved this record. */
  escalation?: Escalation;
}

/**
 * Walks zip -> city -> metro -> state -> country -> global and returns the
 * first match, together with the level it was found at so the confidence score
 * can penalise coarse fallbacks.
 *
 * This is the one place a stored record becomes a price the model can use, so
 * it is also where index escalation is applied - anything downstream sees an
 * already-current number and the record it came from. The escalator declines by
 * default, so with no real index ingested prices are served exactly as
 * anchored. See lib/escalation.ts.
 */
export function makePriceLookup(
  records: PricingRecord[], geo: GeoResolution, escalate: Escalator = NO_ESCALATION,
) {
  const scopeIds: Partial<Record<GeoLevel, string | undefined>> = {
    zip: geo.zipRecord?.id,
    city: geo.city?.id,
    metro: geo.metro?.id,
    state: geo.state?.id,
    country: geo.state ? geo.state.countryId : "us",
    global: "global",
  };

  const index = new Map<string, PricingRecord[]>();
  for (const r of records) {
    const key = `${r.metricKey}::${r.materialId ?? ""}`;
    const bucket = index.get(key);
    if (bucket) bucket.push(r); else index.set(key, [r]);
  }

  const used: PriceLookupHit[] = [];

  function lookup(metricKey: string, materialId?: string): PriceLookupHit | null {
    const candidates = index.get(`${metricKey}::${materialId ?? ""}`) ?? [];
    for (const level of LEVEL_ORDER) {
      const scopeId = scopeIds[level];
      if (!scopeId) continue;
      const matches = candidates.filter((c) => c.geoScopeType === level && c.geoScopeId === scopeId);
      if (!matches.length) continue;
      // Most recent effective date wins within a level.
      const record = matches.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      const escalation = escalate(record) ?? undefined;
      const k = escalation?.multiplier ?? 1;
      const hit: PriceLookupHit = {
        record, level, escalation,
        triple: {
          low: record.lowPrice * k,
          typical: record.medianPrice * k,
          high: record.highPrice * k,
        },
      };
      used.push(hit);
      return hit;
    }
    return null;
  }

  /** Throws only on a genuine data gap, which is a configuration bug. */
  function require_(metricKey: string, materialId?: string): PriceLookupHit {
    const hit = lookup(metricKey, materialId);
    if (!hit) {
      throw new Error(
        `No pricing record for "${metricKey}"${materialId ? ` (material ${materialId})` : ""} at any geographic scope.`);
    }
    return hit;
  }

  function bestLevel(): GeoLevel {
    let best: GeoLevel = "global";
    for (const hit of used) {
      if (LEVEL_ORDER.indexOf(hit.level) < LEVEL_ORDER.indexOf(best)) best = hit.level;
    }
    return best;
  }

  return { lookup, require: require_, used, bestLevel };
}

export type PriceLookup = ReturnType<typeof makePriceLookup>;

// -- triple arithmetic ------------------------------------------------------
export const scale = (t: PriceTriple, k: number): PriceTriple =>
  ({ low: t.low * k, typical: t.typical * k, high: t.high * k });

export const addTriples = (...ts: PriceTriple[]): PriceTriple =>
  ts.reduce((a, b) => ({ low: a.low + b.low, typical: a.typical + b.typical, high: a.high + b.high }),
    { low: 0, typical: 0, high: 0 });

export const zeroTriple = (): PriceTriple => ({ low: 0, typical: 0, high: 0 });

/**
 * Factors resolve through the same geographic chain as prices.
 *
 * Without this, a state-scoped factor added by an administrator would be
 * silently ignored by the engine while still appearing in the admin console -
 * a quiet trap. The schema's UNIQUE (service, factor_key, geo_scope_type,
 * geo_scope_id) has always implied this resolution; this is it.
 */
export function makeFactorLookup(factors: PricingFactor[], geo: GeoResolution) {
  const scopeIds: Partial<Record<GeoLevel, string | undefined>> = {
    zip: geo.zipRecord?.id,
    city: geo.city?.id,
    metro: geo.metro?.id,
    state: geo.state?.id,
    country: geo.state ? geo.state.countryId : "us",
    global: "global",
  };

  const byKey = new Map<string, PricingFactor[]>();
  for (const f of factors) {
    const bucket = byKey.get(f.factorKey);
    if (bucket) bucket.push(f); else byKey.set(f.factorKey, [f]);
  }

  return function factor(key: string, fallback = 1): number {
    const candidates = byKey.get(key);
    if (!candidates?.length) return fallback;
    for (const level of LEVEL_ORDER) {
      const scopeId = scopeIds[level];
      if (!scopeId) continue;
      const hit = candidates.find(
        (c) => c.geoScopeType === level && c.geoScopeId === scopeId);
      if (hit) return hit.multiplier;
    }
    // A factor that exists but is scoped somewhere else entirely still beats a
    // hardcoded fallback, so fall back to the first row rather than to 1.
    return candidates[0].multiplier;
  };
}
