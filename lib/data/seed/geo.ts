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

  // -- Northeast ------------------------------------------------------------
  // Added as data preparation, not as a launch. No city under these states is
  // published, so none of them generates an indexable page. What they do is let
  // a Northeast ZIP resolve to a metro with real BLS wage data instead of
  // dropping to the national fallback.
  {
    id: "us-nj", countryId: "us", code: "NJ", name: "New Jersey", slug: "new-jersey",
    laborIndex: 1.18, materialIndex: 1.05, dataStatus: "sample",
    notes: "New Jersey requires contractors performing home improvement work to register with the Division of Consumer Affairs and to carry commercial general liability insurance. Confirm registration status before signing.",
  },
  {
    id: "us-ny", countryId: "us", code: "NY", name: "New York", slug: "new-york",
    laborIndex: 1.26, materialIndex: 1.06, dataStatus: "sample",
    notes: "New York issues no statewide roofing licence. Licensing is local - New York City, Nassau, Suffolk and Westchester each run their own scheme - so verification is county or city specific.",
  },
  {
    id: "us-pa", countryId: "us", code: "PA", name: "Pennsylvania", slug: "pennsylvania",
    laborIndex: 1.06, materialIndex: 1.02, dataStatus: "sample",
    notes: "Pennsylvania has no statewide trade licence for roofing, but contractors must register as Home Improvement Contractors with the Office of Attorney General. Philadelphia additionally licenses contractors through L&I.",
  },
  {
    id: "us-il", countryId: "us", code: "IL", name: "Illinois", slug: "illinois",
    laborIndex: 1.22, materialIndex: 1.03, dataStatus: "sample",
    notes: "Illinois has no statewide roofing licence for residential work in the way some states do, but roofing contractors must be licensed by the Illinois Department of Financial and Professional Regulation and carry insurance. Chicago additionally licenses contractors through the city.",
  },
  {
    id: "us-mi", countryId: "us", code: "MI", name: "Michigan", slug: "michigan",
    laborIndex: 1.08, materialIndex: 1.01, dataStatus: "sample",
    notes: "Michigan requires a residential builder or maintenance and alteration contractor licence covering roofing, issued by LARA. Verify the licence number with the state rather than accepting one printed on a quote.",
  },
  {
    id: "us-ma", countryId: "us", code: "MA", name: "Massachusetts", slug: "massachusetts",
    laborIndex: 1.21, materialIndex: 1.05, dataStatus: "sample",
    notes: "Massachusetts requires both a Construction Supervisor Licence for structural work and Home Improvement Contractor registration. HIC registration is what gives a homeowner access to the state's arbitration and guaranty fund.",
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

  // Northeast. `stateId` is the metro's primary state, which is not always the
  // state of a city inside it: Newark sits in the New York metro but in New
  // Jersey. The geo chain reads metro and state independently, so a Newark ZIP
  // correctly gets New York metro wages and New Jersey state rules.
  { id: "metro-nyc", countryId: "us", stateId: "us-ny", name: "New York-Newark-Jersey City", slug: "new-york-newark-jersey-city", cbsaCode: "35620" },
  { id: "metro-phl", countryId: "us", stateId: "us-pa", name: "Philadelphia-Camden-Wilmington", slug: "philadelphia-camden-wilmington", cbsaCode: "37980" },
  { id: "metro-bos", countryId: "us", stateId: "us-ma", name: "Boston-Cambridge-Newton", slug: "boston-cambridge-newton", cbsaCode: "14460" },

  // Midwest. Chicago is the highest-wage large metro in the 13-state BLS
  // analysis - 3,900 roofers at a $39.47 median - and was the strongest market
  // we did not cover.
  { id: "metro-chi", countryId: "us", stateId: "us-il", name: "Chicago-Naperville-Elgin", slug: "chicago-naperville-elgin", cbsaCode: "16980" },
  { id: "metro-det", countryId: "us", stateId: "us-mi", name: "Detroit-Warren-Dearborn", slug: "detroit-warren-dearborn", cbsaCode: "19820" },
];
