import { seedDataset } from "@/lib/data/seed";
import type { Country, DataStatus, PricingRecord, Service } from "@/lib/types";

/**
 * Whether a country is ready to publish a price, decided by the data.
 *
 * The plan for going beyond the US is one engine and a data pack per country,
 * activated only when its data is good enough. The failure mode that plan has
 * is obvious and common: somebody adds a flag to a country picker because the
 * page looks better with nine flags than with one, and the estimates behind
 * eight of them are a US number with a currency symbol swapped.
 *
 * So readiness is derived here rather than written down. A country pack cannot
 * be switched on by editing a boolean; it is on when the rows exist, and the
 * grade it shows is whatever the rows support. `Country.isActive` still exists
 * and still gates routing, but this decides whether it is honest to set it.
 *
 * Nothing in here touches a price. It reads the dataset and reports on it.
 */

/**
 * Roughly what each component contributes to a typical job, used only to weigh
 * how much of an estimate rests on which grade of data. Never used in pricing.
 *
 * Shared with lib/data-status.ts deliberately: two different answers to "how
 * much of this estimate is modelled" would be worse than one imperfect answer.
 */
export const TYPICAL_SHARE: Record<string, number> = {
  labor: 0.34, material: 0.4, disposal: 0.06,
  equipment: 0.04, permit: 0.03, overhead: 0.13,
};

/** A component with no priced row cannot produce an estimate at all. */
const REQUIRED_COMPONENTS = ["labor", "material"] as const;

export type PackLevel = "established" | "developing" | "limited" | "insufficient";

export interface CountryPack {
  countryId: string;
  countryName: string;
  iso2: string;
  currencyCode: string;
  serviceSlug: string;
  serviceName: string;
  level: PackLevel;
  /** Share backed by a directly observed price with no conversion applied. */
  verifiedShare: number;
  /** Share backed by an observation or a public series, plus our conversion. */
  modelledShare: number;
  /** Share resting on rows we generated with no observation behind them, 0-1. */
  sampleShare: number;
  /**
   * Share of a typical job carrying no priced row of its own because it is a
   * markup on the rest - overhead and profit. Excluded from the three grades
   * above and from the thresholds, since its quality is whatever the
   * components underneath it are.
   */
  factorDrivenShare: number;
  /** Cost components with no priced row anywhere in this country. */
  missingComponents: string[];
  /** Distinct metros with their own priced rows. */
  localMarkets: number;
  rowsByStatus: Record<DataStatus, number>;
  /** True when it is honest to publish a price for this country and service. */
  publishable: boolean;
  /** One line naming the single thing most in the way. */
  nextStep: string;
}

const LEVEL_LABEL: Record<PackLevel, string> = {
  established: "Established",
  developing: "Developing",
  limited: "Limited sample",
  insufficient: "Insufficient data",
};

export const packLevelLabel = (l: PackLevel) => LEVEL_LABEL[l];

/**
 * Rows priced in this country, at any scope inside it.
 *
 * Country scope is matched by id; anything finer is matched by walking up to
 * the country it sits in, because a metro-scoped row is still that country's
 * data and should count towards its readiness.
 */
function recordsForCountry(records: PricingRecord[], countryId: string): PricingRecord[] {
  const states = new Set(
    seedDataset.states.filter((s) => s.countryId === countryId).map((s) => s.id));
  const metros = new Set(
    seedDataset.metros.filter((m) => m.countryId === countryId).map((m) => m.id));
  const cities = new Set(
    seedDataset.cities.filter((c) => c.countryId === countryId).map((c) => c.id));
  const zips = new Set(
    seedDataset.zipCodes.filter((z) => z.countryId === countryId).map((z) => z.id));

  return records.filter((r) => {
    switch (r.geoScopeType) {
      case "country": return r.geoScopeId === countryId;
      case "state": return states.has(r.geoScopeId);
      case "metro": return metros.has(r.geoScopeId);
      case "city": return cities.has(r.geoScopeId);
      case "zip": return zips.has(r.geoScopeId);
      // A global row backs every country equally, so it says nothing about
      // whether this one is ready.
      default: return false;
    }
  });
}

function gradePack(country: Country, service: Service): CountryPack {
  const rows = recordsForCountry(seedDataset.pricingRecords, country.id)
    .filter((r) => r.serviceId === service.id);

  const rowsByStatus: Record<DataStatus, number> = { verified: 0, modeled: 0, sample: 0 };
  for (const r of rows) rowsByStatus[r.dataStatus]++;

  // Weigh each component by what it contributes, then by the BEST grade of row
  // backing it - best, because the engine resolves the finest scope available,
  // so one real metro row is what a user in that metro actually gets.
  //
  // Three buckets, not two. The first version had only "verified" and "all
  // sample", which left every component in between counted as nothing: the US
  // graded 0% observed while its labour came from a BLS wage release, because
  // those rows are "modeled" - a real observation with our labour burden
  // applied on top. A grade that ignores the middle describes no real dataset,
  // since the middle is where honest data mostly lives.
  let verifiedShare = 0;
  let modelledShare = 0;
  let sampleShare = 0;
  let factorDrivenShare = 0;
  const missingComponents: string[] = [];

  for (const [component, share] of Object.entries(TYPICAL_SHARE)) {
    const forComponent = rows.filter((r) => r.component === component);
    if (forComponent.length === 0) {
      if ((REQUIRED_COMPONENTS as readonly string[]).includes(component)) {
        missingComponents.push(component);
      } else {
        // Overhead and profit are a percentage of everything else, so they
        // have no row and no independent quality. Counting them as a gap
        // would permanently cap every country at 87%; counting them as good
        // would be flattery. They are set aside and named.
        factorDrivenShare += share;
      }
      continue;
    }
    if (forComponent.some((r) => r.dataStatus === "verified")) verifiedShare += share;
    else if (forComponent.some((r) => r.dataStatus === "modeled")) modelledShare += share;
    else sampleShare += share;
  }

  const localMarkets = new Set(
    rows.filter((r) => r.geoScopeType === "metro").map((r) => r.geoScopeId)).size;

  // The thresholds, stated once and in one place.
  //
  //   insufficient  a required component has no row: this is not a price
  //   limited       most of the job rests on rows we invented
  //   developing    some of it does
  //   established   almost none of it does, and the evidence is direct
  // Grade the priced part of the job on its own terms: with overhead set
  // aside, the three shares should describe all of what is left.
  const priced = 1 - factorDrivenShare;
  if (priced > 0) {
    verifiedShare /= priced;
    modelledShare /= priced;
    sampleShare /= priced;
  }
  const evidenceShare = verifiedShare + modelledShare;
  const level: PackLevel = missingComponents.length > 0 || rows.length === 0
    ? "insufficient"
    : sampleShare > 0.5 ? "limited"
      : sampleShare > 0.2 ? "developing"
        : evidenceShare >= 0.8 && verifiedShare >= 0.4 ? "established" : "developing";

  return {
    countryId: country.id,
    countryName: country.name,
    iso2: country.iso2,
    currencyCode: country.currencyCode,
    serviceSlug: service.slug,
    serviceName: service.name,
    level,
    verifiedShare,
    modelledShare,
    sampleShare,
    factorDrivenShare,
    missingComponents,
    localMarkets,
    rowsByStatus,
    // The threshold, stated once. "Limited" still publishes, because the
    // confidence score and the widened range already say so on every estimate
    // and a homeowner with a rough number beats a homeowner with none.
    // "Insufficient" does not: an estimate missing labour or materials is not
    // an uncertain price, it is not a price.
    publishable: level !== "insufficient",
    nextStep: nextStep(level, missingComponents, sampleShare, localMarkets),
  };
}

function nextStep(
  level: PackLevel, missing: string[], sampleShare: number, localMarkets: number,
): string {
  if (missing.length) {
    return `No priced rows for ${missing.join(" or ")}. Until those exist this country `
      + "cannot produce an estimate at all.";
  }
  if (level === "limited") {
    return `${Math.round(sampleShare * 100)}% of a typical job rests on rows with no `
      + "observation behind them. Collect observed prices for the largest component first.";
  }
  if (localMarkets === 0) {
    return "Every row is national. One metro-scoped labour source would make the "
      + "estimate local rather than average.";
  }
  return `${localMarkets} local market${localMarkets === 1 ? "" : "s"} with their own rows. `
    + "Widen coverage, or raise the remaining modelled components to observed.";
}

/**
 * Every country and service pair, graded.
 *
 * Includes pairs that are nowhere near ready - that is the point. A pack that
 * does not appear in this list cannot be checked before someone activates it.
 */
export function getCountryPacks(): CountryPack[] {
  const out: CountryPack[] = [];
  for (const country of seedDataset.countries) {
    for (const service of seedDataset.services) {
      out.push(gradePack(country, service));
    }
  }
  return out;
}

/** The packs it is honest to publish, which is what a country picker may show. */
export const publishablePacks = () => getCountryPacks().filter((p) => p.publishable);

/**
 * Countries whose `isActive` flag disagrees with what their data supports.
 *
 * A flag switched on ahead of the data is the whole risk of this plan, so it
 * is a test failure rather than something to notice in production.
 */
export function packsContradictingActivation(): CountryPack[] {
  const active = new Map(seedDataset.countries.map((c) => [c.id, c.isActive]));
  const byCountry = new Map<string, CountryPack[]>();
  for (const p of getCountryPacks()) {
    byCountry.set(p.countryId, [...(byCountry.get(p.countryId) ?? []), p]);
  }
  const bad: CountryPack[] = [];
  for (const [countryId, packs] of byCountry) {
    if (!active.get(countryId)) continue;
    // An active country must have at least one publishable service.
    if (!packs.some((p) => p.publishable)) bad.push(...packs);
  }
  return bad;
}
