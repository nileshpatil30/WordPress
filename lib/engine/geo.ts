import type { PricingFactor, PricingRecord } from "@/lib/types";
import type { GeoLevel, GeoResolution, PriceTriple } from "./types";
import type { DataStore } from "@/lib/data/store";

/**
 * Resolve a ZIP to the geography chain, then let the price lookup walk that
 * chain from most specific to least. This is the mechanism that makes "add a
 * city" a data operation: drop in a city row plus city-scoped pricing records
 * and every ZIP under it immediately resolves one level finer.
 */
export async function resolveGeo(store: DataStore, zip: string): Promise<GeoResolution> {
  const zipRecord = await store.getZipByCode(zip);
  const city = zipRecord ? await store.getCityById(zipRecord.cityId) : null;
  const states = await store.listStates();
  const state = city ? states.find((s) => s.id === city.stateId) ?? null : null;

  return {
    zip,
    zipRecord,
    city,
    state,
    bestLevel: "country", // replaced by the first lookup that finds data
    label: city && state ? `${city.name}, ${state.code}` : "United States (national)",
    isFallback: !zipRecord,
  };
}

const LEVEL_ORDER: GeoLevel[] = ["zip", "city", "metro", "state", "country", "global"];

export interface PriceLookupHit {
  record: PricingRecord;
  level: GeoLevel;
  triple: PriceTriple;
}

/**
 * Walks zip -> city -> metro -> state -> country -> global and returns the
 * first match, together with the level it was found at so the confidence score
 * can penalise coarse fallbacks.
 */
export function makePriceLookup(records: PricingRecord[], geo: GeoResolution) {
  const scopeIds: Partial<Record<GeoLevel, string | undefined>> = {
    zip: geo.zipRecord?.id,
    city: geo.city?.id,
    metro: geo.city?.metroId,
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
      const hit: PriceLookupHit = {
        record, level,
        triple: { low: record.lowPrice, typical: record.medianPrice, high: record.highPrice },
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
    metro: geo.city?.metroId,
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
