import type { Dataset, PricingRecord } from "@/lib/types";
import { countries, metros, states } from "./geo";
import { cities } from "./cities";
import { zipCodes } from "./zips";
import { materials, projectTypes, services } from "./catalog";
import {
  priceIndexPoints, priceIndexSeries, pricingFactors, pricingRecords, pricingSources,
} from "./pricing";

/**
 * Real BLS-derived labour rates, when the ingester has produced them.
 *
 * Optional on purpose: a fresh clone works with sample data alone, and the
 * moment `bls-labor.ts` exists it takes over automatically. The import is
 * resolved at build time, so this costs nothing at runtime.
 */
let blsLaborRecords: PricingRecord[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const generated = require("./bls-labor") as { blsLaborRecords?: PricingRecord[] };
  blsLaborRecords = generated.blsLaborRecords ?? [];
} catch {
  // No generated file yet. Sample labour rates stay in force, and every
  // estimate keeps saying so.
}

/**
 * A metro-scoped BLS rate is useless while a sample city-scoped rate still
 * exists, because a finer geographic scope always wins the lookup. So the
 * sample city labour rows are dropped the moment real ones arrive.
 */
const labourRecords = blsLaborRecords.length
  ? [
    ...pricingRecords.filter(
      (r) => !(r.metricKey === "labor.rate_per_hour"
        && r.geoScopeType === "city"
        && r.dataStatus === "sample")),
    ...blsLaborRecords,
  ]
  : pricingRecords;

export const seedDataset: Dataset = {
  countries, states, metros, cities, zipCodes,
  services, projectTypes, materials,
  pricingSources, pricingRecords: labourRecords, pricingFactors,
  priceIndexSeries, priceIndexPoints,
};

/** True when real wage data is in play rather than sample rates. */
export const hasRealLabourData = blsLaborRecords.length > 0;

export { SEED_COLLECTED_DATE, SEED_EFFECTIVE_DATE } from "./pricing";
