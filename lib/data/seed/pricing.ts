import { ppiPoints, ppiSeries } from "./ppi";
import type {
  PriceIndexPoint, PriceIndexSeries, PricingFactor, PricingRecord, PricingSource,
} from "@/lib/types";

/** The period the shipped numbers describe, and when they were assembled. */
export const SEED_EFFECTIVE_DATE = "2026-08-01";
export const SEED_COLLECTED_DATE = "2026-08-15";

/**
 * IMPORTANT - read before shipping this to real users.
 *
 * Every price row below carries dataStatus: "sample". They are internally
 * derived, order-of-magnitude figures used to make the product functional in
 * development. They are NOT observed market prices and are not attributed to
 * any third party.
 *
 * The sources listed as `isActive: false` are the ingestion roadmap: real,
 * legally usable feeds to connect before launch. See DATA_SOURCES.md.
 */
export const pricingSources: PricingSource[] = [
  {
    id: "src-internal-model", name: "Home Cost Doctor internal model (sample data)",
    sourceType: "internal_model", reliabilityWeight: 0.4, isActive: true,
    lastReviewedAt: SEED_COLLECTED_DATE,
    licenseNotes:
      "Our own derivation. Shipped so the application is functional before real feeds are connected. Must not be presented to users as observed market pricing.",
    license: "Our own work.",
    redistributable: true,
  },
  {
    id: "src-observed-materials", name: "Observed material prices",
    sourceType: "public_market", reliabilityWeight: 0.7, isActive: true,
    lastReviewedAt: SEED_COLLECTED_DATE,
    licenseNotes:
      "Prices we observed ourselves from publicly listed retail and distributor sources, each row recording its own source, URL and observation date. We publish the derived cost range, never a third party's dataset. Where a competitor's published range is recorded it is marked as a benchmark and never becomes a priced record.",
    license: "Our own observations. Third-party benchmark ranges are recorded as benchmarks and never become priced records.",
    redistributable: true,
  },
  {
    id: "src-bls-oes", name: "BLS Occupational Employment and Wage Statistics",
    url: "https://www.bls.gov/oes/", sourceType: "government",
    reliabilityWeight: 0.92, isActive: true, lastReviewedAt: SEED_COLLECTED_DATE,
    licenseNotes:
      "US federal government work, generally in the public domain. Ingested: metro-level roofer wage data (SOC 47-2181), May 2025 release, via scripts/ingest-bls-oews.ts. The wage is BLS; the labour burden multiplier that turns a worker's wage into an employer's crew cost is ours, so those records are modelled rather than verified.",
    license: "Public domain (US federal government work).",
    redistributable: true,
  },
  {
    id: "src-bls-ppi", name: "BLS Producer Price Index - roofing materials",
    url: "https://www.bls.gov/ppi/", sourceType: "government",
    reliabilityWeight: 0.9, isActive: true, lastReviewedAt: SEED_COLLECTED_DATE,
    licenseNotes:
      "US federal government work, generally in the public domain. Ingested: series WPU1361, prepared asphalt and tar roofing and siding products, via scripts/ingest-ppi.ts. Used for the published price history and to carry anchored material prices forward. The index measures producer price movement and is not itself a price.",
    license: "Public domain (US federal government work).",
    redistributable: true,
  },
  {
    id: "src-census-permits", name: "US Census Building Permits Survey",
    url: "https://www.census.gov/construction/bps/", sourceType: "government",
    reliabilityWeight: 0.85, isActive: false,
    licenseNotes:
      "US federal government work, generally in the public domain. Intended use: construction activity as a demand proxy per metro. Not yet ingested.",
    license: "Public domain (US federal government work).",
    redistributable: true,
  },
  {
    id: "src-municipal-permits", name: "Municipal permit fee schedules",
    sourceType: "government", reliabilityWeight: 0.95, isActive: false,
    licenseNotes:
      "Published fee schedules from each authority having jurisdiction. Intended use: replacing our modelled permit allowance with the actual local schedule. Must be collected per jurisdiction and re-checked on their revision cycle.",
    license: "Public record. Published fee schedules from the authority having jurisdiction.",
    redistributable: true,
  },
  {
    id: "src-osm", name: "OpenStreetMap", url: "https://www.openstreetmap.org/copyright",
    sourceType: "open_data", reliabilityWeight: 0.7, isActive: false,
    licenseNotes:
      "Open Database Licence (ODbL). Commercial use is permitted with attribution, and share-alike obligations attach to derivative databases. Intended use: building footprints to pre-fill roof area. Legal review required before any derivative database is published.",
    license: "Open Database Licence (ODbL). Attribution and share-alike obligations attach to derivative databases.",
    redistributable: false,
  },
  {
    id: "src-first-party", name: "Home Cost Doctor homeowner submissions",
    sourceType: "first_party", reliabilityWeight: 0.75, isActive: true,
    licenseNotes:
      "Voluntarily submitted by homeowners with explicit consent, moderated before use, and aggregated so no individual project is identifiable. This is the intended long-term backbone of the model.",
    license: "Ours, collected with explicit consent and published only in aggregate.",
    redistributable: true,
  },
  {
    id: "src-contractor", name: "Contractor-submitted pricing",
    sourceType: "contractor_submitted", reliabilityWeight: 0.6, isActive: false,
    licenseNotes:
      "Supplied by participating contractors under agreement. Carries obvious selection bias and must be weighted accordingly, never used as a sole source for a market.",
    license: "Supplied under agreement with participating contractors.",
    redistributable: true,
  },
  {
    id: "src-licensed-costbook", name: "Commercial construction cost database (licensed)",
    sourceType: "licensed", reliabilityWeight: 0.95, isActive: false,
    licenseNotes:
      "Commercial cost databases such as RSMeans require a paid licence. Do not scrape, redistribute or derive a competing database from them. Ingest only under an executed licence that permits derived estimates.",
    license: "Proprietary commercial licence. Permits use in producing estimates, not redistribution as a dataset.",
    redistributable: false,
  },
];

const base = {
  currency: "USD",
  effectiveDate: SEED_EFFECTIVE_DATE,
  collectedDate: SEED_COLLECTED_DATE,
  sourceId: "src-internal-model",
  dataStatus: "sample" as const,
  serviceId: "svc-roofing",
};

// [materialSlug, low, median, high] - delivered material cost per roofing
// square (100 sq ft of roof surface), excluding underlayment and accessories.
const materialPerSquare: [string, number, number, number][] = [
  ["asphalt-3tab", 105, 122, 145],
  ["asphalt-architectural", 130, 158, 195],
  ["impact-resistant-shingle", 180, 218, 265],
  ["asphalt-premium", 205, 255, 320],
  ["metal-exposed-fastener", 180, 240, 320],
  ["metal-standing-seam", 350, 480, 700],
  ["concrete-tile", 200, 285, 400],
  ["clay-tile", 350, 520, 800],
  ["synthetic-slate", 350, 470, 650],
  ["natural-slate", 600, 850, 1250],
  ["cedar-shake", 350, 470, 650],
  ["tpo-membrane", 150, 195, 265],
  ["modified-bitumen", 130, 168, 225],
  ["spf-foam", 180, 235, 310],
];

// Component prices that do not vary by material.
// [metricKey, unit, low, median, high, component, methodology]
const componentRows: [string, string, number, number, number, PricingRecord["component"], string][] = [
  ["underlayment.felt-15.per_square", "square", 14, 19, 26, "material", "Organic felt underlayment, material only."],
  ["underlayment.synthetic.per_square", "square", 18, 25, 34, "material", "Synthetic underlayment, material only. The common default on new work."],
  ["underlayment.peel-stick.per_square", "square", 55, 78, 110, "material", "Fully self-adhered membrane. Required in some jurisdictions and common as a secondary water barrier."],
  ["accessories.per_square", "square", 32, 46, 65, "material", "Starter course, ridge cap, drip edge and fasteners as an allowance per square."],
  ["flashing.standard.per_square", "square", 12, 18, 28, "material", "Step, valley and pipe-boot flashing on a conventional roof."],
  ["flashing.full-replacement.per_square", "square", 26, 38, 55, "material", "Complete flashing replacement including counter-flashing and valley metal."],
  ["ventilation.ridge-vent.per_lf", "linear_ft", 7, 10, 15, "material", "Continuous ridge vent, material and cut-in."],
  ["ventilation.static.each", "each", 45, 68, 95, "material", "Static box or turbine vent, installed."],
  ["ventilation.powered.each", "each", 320, 460, 650, "material", "Powered attic ventilator including electrical connection."],
  ["penetration.skylight-flash.each", "each", 240, 380, 620, "addon", "Re-flashing an existing skylight during replacement. Replacing the unit itself costs considerably more."],
  ["penetration.chimney-flash.each", "each", 350, 560, 900, "addon", "Chimney flashing rebuild including counter-flashing let into the masonry."],
  ["deck.sheet-replacement.each", "each", 75, 98, 140, "material", "One 4x8 sheet of replacement sheathing, material and labour."],
  ["equipment.dumpster-haul.each", "each", 380, 520, 700, "equipment", "Roll-off container delivery, haul and base handling for one container."],
  ["disposal.tipping_per_ton", "ton", 48, 72, 110, "disposal", "Landfill or transfer-station tipping fee per ton of tear-off debris."],
  ["labor.rate_per_hour", "hour", 48, 62, 82, "labor", "Fully burdened crew cost per hour before contractor overhead and profit. Not a retail billing rate."],
  ["permit.flat_allowance", "each", 150, 320, 700, "permit", "Residential re-roof permit allowance. Actual fees are set per jurisdiction and vary widely."],
  ["addon.gutter-replacement.per_lf", "linear_ft", 8, 12, 18, "addon", "Seamless aluminium gutter replacement, material and labour per linear foot."],
  ["addon.solar-ready-conduit.each", "each", 350, 620, 950, "addon", "Roof penetrations and conduit provisions for a future solar installation, done while the roof is open."],
];

// City-level overrides. [cityId, laborRateMedian, permitMedian, tippingMedian]
const cityOverrides: [string, number, number, number][] = [
  ["city-phoenix", 58, 280, 62],
  ["city-dallas", 56, 240, 58],
  ["city-houston", 55, 260, 60],
  ["city-austin", 61, 310, 66],
  ["city-san-diego", 82, 480, 105],
  ["city-los-angeles", 86, 520, 118],
  ["city-las-vegas", 63, 300, 68],
  ["city-tampa", 57, 340, 64],
  ["city-orlando", 56, 300, 62],
  ["city-miami", 64, 520, 92],
];

function rec(
  id: string, metricKey: string, unit: string, low: number, median: number, high: number,
  component: PricingRecord["component"], geoScopeType: PricingRecord["geoScopeType"],
  geoScopeId: string, methodology: string, materialId?: string, confidence = 45,
): PricingRecord {
  return { ...base, id, metricKey, unit, lowPrice: low, medianPrice: median, highPrice: high,
    component, geoScopeType, geoScopeId, methodology, materialId, confidenceScore: confidence };
}

export const pricingRecords: PricingRecord[] = [
  ...materialPerSquare.map(([slug, low, med, high]) =>
    rec(`pr-mat-${slug}`, "material.per_square", "square", low, med, high, "material",
      "country", "us",
      "Modelled national delivered material cost per square. Replace with distributor or manufacturer list pricing before launch.",
      `mat-${slug}`)),

  ...componentRows.map(([key, unit, low, med, high, component, methodology]) =>
    rec(`pr-${key.replace(/[._]/g, "-")}`, key, unit, low, med, high, component, "country", "us", methodology)),

  ...cityOverrides.flatMap(([cityId, labor, permit, tipping]) => [
    rec(`pr-${cityId}-labor`, "labor.rate_per_hour", "hour",
      Math.round(labor * 0.82), labor, Math.round(labor * 1.28), "labor", "city", cityId,
      "Modelled from the national baseline scaled by a metro wage differential. Replace with BLS OEWS metro data for SOC 47-2181.", undefined, 50),
    rec(`pr-${cityId}-permit`, "permit.flat_allowance", "each",
      Math.round(permit * 0.6), permit, Math.round(permit * 1.9), "permit", "city", cityId,
      "Modelled allowance. Replace with the published fee schedule from the authority having jurisdiction - these are knowable exactly and should not stay modelled.", undefined, 35),
    rec(`pr-${cityId}-tipping`, "disposal.tipping_per_ton", "ton",
      Math.round(tipping * 0.75), tipping, Math.round(tipping * 1.45), "disposal", "city", cityId,
      "Modelled regional tipping fee. Replace with published transfer-station rates.", undefined, 40),
  ]),
];

// ---------------------------------------------------------------------------
// Factors - every multiplier the engine applies lives here, not in code.
// ---------------------------------------------------------------------------
/** A geographically scoped factor. State-scoped rows beat the global one. */
function scopedFactor(
  key: string, label: string, appliesTo: PricingFactor["appliesTo"], multiplier: number,
  description: string, geoScopeType: PricingFactor["geoScopeType"], geoScopeId: string,
  dataStatus: PricingFactor["dataStatus"] = "modeled",
): PricingFactor {
  return {
    id: `pf-${key.replace(/\./g, "-")}-${geoScopeId}`, serviceId: "svc-roofing", factorKey: key,
    label, appliesTo, multiplier, geoScopeType, geoScopeId, description, dataStatus,
    sourceId: "src-internal-model", updatedAt: SEED_COLLECTED_DATE,
  };
}

function factor(
  key: string, label: string, appliesTo: PricingFactor["appliesTo"], multiplier: number,
  description: string, dataStatus: PricingFactor["dataStatus"] = "sample",
): PricingFactor {
  return {
    id: `pf-${key.replace(/\./g, "-")}`, serviceId: "svc-roofing", factorKey: key, label,
    appliesTo, multiplier, geoScopeType: "global", geoScopeId: "global", description,
    dataStatus, sourceId: "src-internal-model", updatedAt: SEED_COLLECTED_DATE,
  };
}

export const pricingFactors: PricingFactor[] = [
  // Pitch area multipliers are exact geometry: sqrt(1 + (rise/12)^2). The roof
  // surface of a pitched plane is always that much larger than its footprint.
  factor("pitch.flat.area", "Flat / low slope (0:12-2:12) area factor", "all", 1.0,
    "Roof surface equals footprint. Exact geometry, not an estimate.", "verified"),
  factor("pitch.low.area", "Low slope (3:12-4:12) area factor", "all", 1.042,
    "sqrt(1 + (3.5/12)^2) = 1.0417. Exact geometry for a 3.5:12 representative pitch, the midpoint of the band. Previously stored as 1.054, which is the 4:12 value and did not match the formula stated beside it - a row marked verified has to be reproducible from its own methodology.", "verified"),
  factor("pitch.moderate.area", "Moderate slope (5:12-7:12) area factor", "all", 1.118,
    "sqrt(1 + (6/12)^2). Exact geometry for a 6:12 representative pitch.", "verified"),
  factor("pitch.steep.area", "Steep slope (8:12-10:12) area factor", "all", 1.25,
    "sqrt(1 + (9/12)^2). Exact geometry for a 9:12 representative pitch.", "verified"),
  factor("pitch.very-steep.area", "Very steep (11:12+) area factor", "all", 1.414,
    "sqrt(1 + (12/12)^2). Exact geometry for a 12:12 representative pitch.", "verified"),

  factor("pitch.flat.labor", "Flat / low slope labour factor", "labor", 1.1,
    "Low-slope work uses a different system and detailing, so hours per square rise even though area does not."),
  factor("pitch.low.labor", "Low slope labour factor", "labor", 1.0, "Baseline walkable pitch."),
  factor("pitch.moderate.labor", "Moderate slope labour factor", "labor", 1.05, "Still walkable; modest productivity loss."),
  factor("pitch.steep.labor", "Steep slope labour factor", "labor", 1.28,
    "Roof jacks, staging and fall protection are required and productivity drops sharply."),
  factor("pitch.very-steep.labor", "Very steep labour factor", "labor", 1.5,
    "Full staging required. This is the single largest labour driver on a residential roof."),

  factor("stories.1.labor", "Single storey", "labor", 1.0, "Baseline. Ground-level material handling."),
  factor("stories.2.labor", "Two storeys", "labor", 1.1, "Longer carries, more setup, higher fall exposure."),
  factor("stories.3.labor", "Three or more storeys", "labor", 1.24, "Often needs a lift or conveyor; material handling dominates."),

  factor("complexity.simple.labor", "Simple roofline", "labor", 1.0, "Gable or hip with two to four planes and no dormers."),
  factor("complexity.moderate.labor", "Moderate roofline", "labor", 1.12, "Five to eight planes, some valleys, one or two dormers."),
  factor("complexity.complex.labor", "Complex roofline", "labor", 1.28, "Nine or more planes, multiple valleys and dormers, significant flashing."),
  factor("complexity.very-complex.labor", "Very complex roofline", "labor", 1.45, "Cut-up custom roof with turrets, many intersections and extensive detail work."),

  factor("complexity.simple.waste", "Simple roofline waste factor", "material", 1.07, "Standard cutting waste on a simple roof."),
  factor("complexity.moderate.waste", "Moderate roofline waste factor", "material", 1.1, "Valleys and hips increase offcut waste."),
  factor("complexity.complex.waste", "Complex roofline waste factor", "material", 1.15, "Many intersections produce significantly more waste."),
  factor("complexity.very-complex.waste", "Very complex waste factor", "material", 1.2, "Highly cut-up roofs routinely exceed 20 percent waste."),

  factor("access.easy.labor", "Easy access", "labor", 1.0, "Driveway staging, container next to the house, clear perimeter."),
  factor("access.moderate.labor", "Moderate access", "labor", 1.07, "Some carrying distance, partial obstruction, restricted container placement."),
  factor("access.difficult.labor", "Difficult access", "labor", 1.18, "Hillside, narrow street, no on-site staging, or heavy tree cover."),

  factor("tearoff.hours_per_square_per_layer", "Tear-off labour", "labor", 0.85,
    "Base crew hours to strip one layer from one square. Scaled by the existing material's weight in the engine."),

  factor("labor.detail_hours_per_square", "Detail and dry-in labour", "labor", 0.35,
    "Crew hours per square for underlayment, flashing, valleys and edge detail, over and above the covering install itself."),
  factor("labor.tile_relay_handling", "Tile lift-and-relay handling", "labor", 1.15,
    "Every tile is handled twice on a lift-and-relay, so install hours rise even though no new tile is laid."),
  factor("material.tile_breakage_allowance", "Tile breakage allowance", "material", 0.12,
    "Share of tile expected to break during a lift-and-relay and need replacing. Ask each contractor what allowance they assumed."),
  factor("area.eave_overhang", "Eave overhang allowance", "material", 1.08,
    "Roof plan area exceeds conditioned floor footprint because of eaves and overhangs."),

  factor("quality.builder.material", "Builder-grade material selection", "material", 0.88,
    "Entry-level product within the chosen material family."),
  factor("quality.standard.material", "Standard material selection", "material", 1.0,
    "Mid-range product within the chosen family. The default."),
  factor("quality.premium.material", "Premium material selection", "material", 1.22,
    "Top-of-line product within the chosen family, heavier weight and longer warranty."),

  factor("warranty.standard.adder", "Manufacturer standard warranty", "all", 1.0,
    "The warranty that comes with the product. No cost adder."),
  factor("warranty.extended-labor.adder", "Extended workmanship warranty", "all", 1.03,
    "Contractor-backed extended labour coverage, typically 10 years or more."),
  factor("warranty.system.adder", "Manufacturer system warranty", "all", 1.08,
    "Requires a certified installer and a complete single-manufacturer system, including underlayment and accessories."),

  // Overhead and profit is where most of the low/high spread comes from. It is
  // a real cost of doing business, not a markup to be negotiated away.
  factor("overhead.low", "Contractor overhead and profit - low", "all", 1.22,
    "A lean, high-volume operation working at cost-plus in a soft market."),
  factor("overhead.typical", "Contractor overhead and profit - typical", "all", 1.32,
    "A properly insured company carrying warranty reserve, supervision and overhead."),
  factor("overhead.high", "Contractor overhead and profit - high", "all", 1.45,
    "A premium or capacity-constrained contractor, or a post-storm market."),

  factor("contingency.deck", "Deck repair contingency", "all", 1.0,
    "Deck replacement is estimated explicitly from a sheet count rather than as a percentage."),

  // ---------------------------------------------------------------------
  // Labour burden: what a published wage becomes once an employer pays for it.
  //
  // Covers payroll taxes, workers' compensation, general liability, vehicles,
  // supervision and non-productive hours. It does NOT include profit - the
  // engine applies overhead and profit separately, and including it here would
  // count profit twice. Used by scripts/ingest-bls-oews.ts to convert BLS wage
  // data into a fully burdened crew rate.
  //
  // State overrides exist because workers' compensation for roofing is one of
  // the most expensive classifications there is, and its cost varies enormously
  // by state.
  // ---------------------------------------------------------------------
  // ---------------------------------------------------------------------
  // Retail to trade
  //
  // A homeowner sees a shelf price; a contractor buys the same product from a
  // distributor by the pallet and pays less. Ingesting retail prices without
  // this conversion produces estimates that are too high - the mirror of the
  // error the large cost guides are known for, and no more useful. This is a
  // modelled assumption, not an observation, and every record it touches names
  // it in the methodology.
  // ---------------------------------------------------------------------
  scopedFactor("material.trade_discount", "Retail to contractor material cost", "material", 0.78,
    "Applied to an observed retail price to approximate what a roofing contractor pays a distributor for the same product. Roofing materials are typically bought on trade terms by the pallet rather than the bundle. Retune from real supplier quotes as they become available; until then this is our assumption and is marked modeled rather than verified.",
    "global", "global"),

  scopedFactor("labor.burden_multiplier", "Labour burden - national default", "labor", 1.8,
    "Applied to a published hourly wage to reach an employer's fully burdened crew cost. Excludes profit.",
    "global", "global"),
  scopedFactor("labor.burden_multiplier", "Labour burden - Texas", "labor", 1.68,
    "Texas is the one state that does not require most private employers to carry workers' compensation, so the burden on a published wage is typically lower. Verify against the employer's actual coverage.",
    "state", "us-tx"),
  scopedFactor("labor.burden_multiplier", "Labour burden - California", "labor", 1.95,
    "High workers' compensation rates for roofing classifications plus state payroll costs.",
    "state", "us-ca"),
  scopedFactor("labor.burden_multiplier", "Labour burden - Florida", "labor", 1.9,
    "Roofing carries one of the most expensive workers' compensation classifications in the state.",
    "state", "us-fl"),
  scopedFactor("labor.burden_multiplier", "Labour burden - Arizona", "labor", 1.78,
    "Modelled from typical roofing workers' compensation and payroll burden.",
    "state", "us-az"),
  scopedFactor("labor.burden_multiplier", "Labour burden - Nevada", "labor", 1.82,
    "Modelled from typical roofing workers' compensation and payroll burden.",
    "state", "us-nv"),
];

// ---------------------------------------------------------------------------
// Price history. Real, as of the BLS ingest: a sample series used to live here
// so the chart component could be built, and it has been retired now that
// scripts/ingest-ppi.ts has produced the genuine one. The series is the only
// `verified` pricing data in the project apart from the pitch geometry - a
// federal statistic transcribed unchanged, with no modelling of ours in
// between. What we DERIVE from it (lib/escalation.ts) is modelled again.
// ---------------------------------------------------------------------------
export const priceIndexSeries: PriceIndexSeries[] = [ppiSeries];
export const priceIndexPoints: PriceIndexPoint[] = ppiPoints;
