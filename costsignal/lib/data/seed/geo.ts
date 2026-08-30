import type { Country, Metro, State } from "@/lib/types";

/**
 * Phase 1 is US-only, but the country row already carries currency, unit
 * system and locale so adding GB/CA/AU later is a data operation.
 */
export const countries: Country[] = [
  {
    id: "us",
    iso2: "US",
    name: "United States",
    currencyCode: "USD",
    unitSystem: "imperial",
    defaultLocale: "en-US",
    isActive: true,
  },
  // Not active. Present to prove the model is not US-shaped.
  { id: "ca", iso2: "CA", name: "Canada", currencyCode: "CAD", unitSystem: "metric", defaultLocale: "en-CA", isActive: false },
  { id: "gb", iso2: "GB", name: "United Kingdom", currencyCode: "GBP", unitSystem: "metric", defaultLocale: "en-GB", isActive: false },
];

/**
 * State-level indices are the coarsest fallback in the geo chain. They are
 * MODELED: derived from published regional wage and construction-cost
 * dispersion, not observed roofing invoices. See /methodology.
 */
export const states: State[] = [
  {
    id: "us-az", countryId: "us", code: "AZ", name: "Arizona", slug: "arizona",
    laborIndex: 0.95, materialIndex: 1.0, dataStatus: "sample",
    notes: "Arizona requires a licensed contractor (ROC) for most re-roofing work above the handyman exemption threshold.",
  },
  {
    id: "us-tx", countryId: "us", code: "TX", name: "Texas", slug: "texas",
    laborIndex: 0.92, materialIndex: 0.98, dataStatus: "sample",
    notes: "Texas does not issue a statewide roofing contractor licence. Verification shifts to insurance, local registration and references.",
  },
  {
    id: "us-ca", countryId: "us", code: "CA", name: "California", slug: "california",
    laborIndex: 1.24, materialIndex: 1.06, dataStatus: "sample",
    notes: "California requires a CSLB C-39 roofing licence for roofing work over the minor-work threshold.",
  },
  {
    id: "us-nv", countryId: "us", code: "NV", name: "Nevada", slug: "nevada",
    laborIndex: 1.02, materialIndex: 1.02, dataStatus: "sample",
    notes: "Nevada requires a State Contractors Board C-15 roofing licence.",
  },
  {
    id: "us-fl", countryId: "us", code: "FL", name: "Florida", slug: "florida",
    laborIndex: 0.97, materialIndex: 1.04, dataStatus: "sample",
    notes: "Florida requires a state-certified or registered roofing contractor (CCC licence) and a permit with inspections for re-roofing.",
  },
];

export const metros: Metro[] = [
  { id: "metro-phx", countryId: "us", stateId: "us-az", name: "Phoenix-Mesa-Chandler", slug: "phoenix-mesa-chandler", cbsaCode: "38060" },
  { id: "metro-dfw", countryId: "us", stateId: "us-tx", name: "Dallas-Fort Worth-Arlington", slug: "dallas-fort-worth-arlington", cbsaCode: "19100" },
  { id: "metro-hou", countryId: "us", stateId: "us-tx", name: "Houston-Pasadena-The Woodlands", slug: "houston-pasadena-the-woodlands", cbsaCode: "26420" },
  { id: "metro-aus", countryId: "us", stateId: "us-tx", name: "Austin-Round Rock-San Marcos", slug: "austin-round-rock-san-marcos", cbsaCode: "12420" },
  { id: "metro-san", countryId: "us", stateId: "us-ca", name: "San Diego-Chula Vista-Carlsbad", slug: "san-diego-chula-vista-carlsbad", cbsaCode: "41740" },
  { id: "metro-lax", countryId: "us", stateId: "us-ca", name: "Los Angeles-Long Beach-Anaheim", slug: "los-angeles-long-beach-anaheim", cbsaCode: "31080" },
  { id: "metro-lv", countryId: "us", stateId: "us-nv", name: "Las Vegas-Henderson-North Las Vegas", slug: "las-vegas-henderson-north-las-vegas", cbsaCode: "29820" },
  { id: "metro-tpa", countryId: "us", stateId: "us-fl", name: "Tampa-St. Petersburg-Clearwater", slug: "tampa-st-petersburg-clearwater", cbsaCode: "45300" },
  { id: "metro-orl", countryId: "us", stateId: "us-fl", name: "Orlando-Kissimmee-Sanford", slug: "orlando-kissimmee-sanford", cbsaCode: "36740" },
  { id: "metro-mia", countryId: "us", stateId: "us-fl", name: "Miami-Fort Lauderdale-West Palm Beach", slug: "miami-fort-lauderdale-west-palm-beach", cbsaCode: "33100" },
];
