import type { Dataset } from "@/lib/types";
import { countries, metros, states } from "./geo";
import { cities } from "./cities";
import { zipCodes } from "./zips";
import { materials, projectTypes, services } from "./catalog";
import {
  priceIndexPoints, priceIndexSeries, pricingFactors, pricingRecords, pricingSources,
} from "./pricing";

export const seedDataset: Dataset = {
  countries, states, metros, cities, zipCodes,
  services, projectTypes, materials,
  pricingSources, pricingRecords, pricingFactors,
  priceIndexSeries, priceIndexPoints,
};

export { SEED_COLLECTED_DATE, SEED_EFFECTIVE_DATE } from "./pricing";
