/**
 * Shared domain types.
 *
 * These mirror `db/schema.sql` one-to-one so the JSON store (dev/demo) and the
 * PostgreSQL store (production) are interchangeable behind `DataStore`.
 */

/** How much we trust a number, and whether it is real or illustrative. */
export type DataStatus =
  | "verified" // traceable to a named, dated, legally usable source
  | "modeled" // derived by our methodology from verified inputs
  | "sample"; // illustrative placeholder shipped for development/demo only

export type SourceType =
  | "government" // BLS, Census, ONS, municipal permit schedules
  | "open_data" // OpenStreetMap, open geo/permit portals
  | "trade_association"
  | "manufacturer" // published list pricing
  | "public_market" // publicly posted retail/service prices, where permitted
  | "licensed" // commercial datasets under contract
  | "first_party" // our own users' submitted quotes / actual paid amounts
  | "contractor_submitted"
  | "internal_model"; // our own derivation - never presented as observed data

export type GeoScopeType =
  | "global"
  | "country"
  | "state"
  | "metro"
  | "city"
  | "zip";

export type CostComponent =
  | "material"
  | "labor"
  | "equipment"
  | "disposal"
  | "permit"
  | "overhead"
  | "addon";

export type UnitSystem = "imperial" | "metric";

// --------------------------------------------------------------------------
// Geography
// --------------------------------------------------------------------------

export interface Country {
  id: string;
  iso2: string;
  name: string;
  currencyCode: string;
  unitSystem: UnitSystem;
  defaultLocale: string;
  isActive: boolean;
}

export interface State {
  id: string;
  countryId: string;
  code: string;
  name: string;
  slug: string;
  /** Multiplier vs. the national labor baseline (1.00 = national average). */
  laborIndex: number;
  /** Multiplier vs. the national material baseline. */
  materialIndex: number;
  dataStatus: DataStatus;
  notes?: string;
}

export interface Metro {
  id: string;
  countryId: string;
  stateId: string;
  name: string;
  slug: string;
  cbsaCode?: string;
}

export interface City {
  id: string;
  countryId: string;
  stateId: string;
  metroId?: string;
  name: string;
  slug: string; // "phoenix-az"
  population?: number;
  latitude?: number;
  longitude?: number;
  /** Only published cities get an indexable landing page. */
  isPublished: boolean;
  /** Hand-written, city-specific editorial. Never templated. */
  content?: CityContent;
}

export interface CityContent {
  /** One-paragraph summary of what actually drives roofing prices here. */
  summary: string;
  /** 3-6 concrete local factors: climate, code, labor market, seasonality. */
  localFactors: { title: string; body: string }[];
  /** Materials that are actually common locally, most common first. */
  commonMaterials: string[]; // material slugs
  /**
   * The job that is actually most common here. In tile markets the typical
   * project is an underlayment replacement, not a new tile roof, and the
   * headline figure should say so rather than quoting the most expensive
   * version of the work.
   */
  representativeProjectType?: string; // project_types.slug
  /** Permit context - always "verify with the AHJ" framed. */
  permitNotes: string;
  /** Best/worst months to buy, and why. */
  seasonality: string;
  faqs: { q: string; a: string }[];
}

export interface ZipCode {
  id: string;
  countryId: string;
  stateId: string;
  cityId: string;
  code: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  /**
   * A ZIP only gets its own indexable page when we have something specific to
   * say about it. Everything else resolves up to the city page.
   */
  pageEligible: boolean;
  content?: {
    summary: string;
    housingStock: string;
    notes: { title: string; body: string }[];
  };
}

// --------------------------------------------------------------------------
// Service catalog
// --------------------------------------------------------------------------

export interface Service {
  id: string;
  slug: string; // "roofing"
  /** URL prefix for cost pages: "roofing-cost" -> /roofing-cost/phoenix-az */
  costPathSlug: string;
  name: string;
  shortName: string;
  category: "exterior" | "interior" | "systems" | "outdoor" | "structural";
  /** Primary pricing unit. */
  unit: "square" | "sq_ft" | "linear_ft" | "each" | "watt" | "ton";
  /** Which engine module handles it. */
  engineKey: string;
  status: "live" | "planned";
  description: string;
  sortOrder: number;
}

export interface ProjectType {
  id: string;
  serviceId: string;
  slug: string;
  name: string;
  description: string;
  /** Multiplier applied to the whole modeled job. */
  scopeMultiplier: number;
}

export interface Material {
  id: string;
  serviceId: string;
  slug: string;
  name: string;
  family: string; // "asphalt" | "metal" | "tile" | ...
  tier: "economy" | "standard" | "premium" | "luxury";
  unit: "square" | "sq_ft";
  expectedLifeYearsMin: number;
  expectedLifeYearsMax: number;
  /** Installed weight, used for disposal tonnage and structural notes. */
  weightLbsPerSquare: number;
  /** Labor hours per square for a crew of average productivity. */
  laborHoursPerSquare: number;
  notes: string;
  sortOrder: number;
  status: "live" | "planned";
}

// --------------------------------------------------------------------------
// Pricing data
// --------------------------------------------------------------------------

export interface PricingSource {
  id: string;
  name: string;
  url?: string;
  sourceType: SourceType;
  licenseNotes: string;
  /** 0-1. Feeds the confidence score. */
  reliabilityWeight: number;
  isActive: boolean;
  lastReviewedAt?: string; // ISO date
}

export interface PricingRecord {
  id: string;
  serviceId: string;
  materialId?: string;
  component: CostComponent;
  /** Free-form key so an engine can look up exactly what it needs. */
  metricKey: string; // e.g. "material.per_square", "labor.rate_per_hour"
  geoScopeType: GeoScopeType;
  geoScopeId: string;
  unit: string;
  lowPrice: number;
  medianPrice: number;
  highPrice: number;
  currency: string;
  effectiveDate: string; // ISO date - the period the price describes
  collectedDate: string; // ISO date - when we captured it
  sourceId: string;
  methodology: string;
  confidenceScore: number; // 0-100, per-record
  dataStatus: DataStatus;
  sampleSize?: number;
}

/**
 * Every assumption the engine makes is a row here - nothing multiplicative is
 * hardcoded in the frontend. Admins can retune the model without a deploy.
 */
export interface PricingFactor {
  id: string;
  serviceId: string;
  /** Namespaced: "pitch.steep", "complexity.complex", "story.2" ... */
  factorKey: string;
  label: string;
  appliesTo: "labor" | "material" | "equipment" | "all";
  /** Multiplier form (1.15 = +15%). */
  multiplier: number;
  /** Optional flat adder in currency units, applied after the multiplier. */
  flatAdder?: number;
  geoScopeType: GeoScopeType;
  geoScopeId: string;
  description: string;
  dataStatus: DataStatus;
  sourceId?: string;
  updatedAt: string;
}

export interface PriceIndexSeries {
  id: string;
  seriesKey: string;
  name: string;
  geoScopeType: GeoScopeType;
  geoScopeId: string;
  sourceId: string;
  unit: string;
  methodology: string;
  dataStatus: DataStatus;
}

export interface PriceIndexPoint {
  id: string;
  seriesId: string;
  periodStart: string; // ISO date
  value: number;
  pctChangeYoy?: number;
}

// --------------------------------------------------------------------------
// Demand-side / first-party data
// --------------------------------------------------------------------------

export interface EstimateRequest {
  id: string;
  sessionId: string;
  serviceId: string;
  zip: string;
  cityId?: string;
  inputs: Record<string, unknown>;
  estimateLow: number;
  estimateTypical: number;
  estimateHigh: number;
  confidence: number;
  engineVersion: string;
  createdAt: string;
  path?: string;
}

export interface QuoteCheck {
  id: string;
  estimateRequestId?: string;
  sessionId: string;
  serviceId: string;
  zip: string;
  quotedPrice: number;
  verdict: string;
  deltaPct: number;
  createdAt: string;
}

export interface ContractorQuoteSet {
  id: string;
  sessionId: string;
  serviceId: string;
  zip: string;
  createdAt: string;
  quotes: ContractorQuote[];
}

export interface ContractorQuote {
  id: string;
  setId: string;
  label: string;
  totalPrice: number;
  materialId?: string;
  warrantyWorkmanshipYears?: number;
  warrantyMaterialYears?: number;
  scope: Record<string, boolean>;
  notes?: string;
}

export interface ActualProjectCost {
  id: string;
  serviceId: string;
  zip: string;
  projectMonth: string; // "2026-05"
  amountPaid: number;
  materialId?: string;
  roofAreaSqft?: number;
  inputs: Record<string, unknown>;
  quotesReceived?: number;
  consentVersion: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  moderationNotes?: string;
}

export interface Lead {
  id: string;
  estimateRequestId?: string;
  serviceId: string;
  zip: string;
  contactName: string;
  email: string;
  phone?: string;
  timeline: string;
  consentAt: string;
  status: "new" | "contacted" | "matched" | "closed";
  createdAt: string;
}

export interface AnalyticsEvent {
  id: string;
  sessionId: string;
  eventName: string;
  properties: Record<string, unknown>;
  path?: string;
  createdAt: string;
}

export type AdminRole = "owner" | "editor" | "viewer";

export interface AdminUser {
  id: string;
  email: string;
  /** scrypt hash, stored as "scrypt:<N>:<r>:<p>:<saltB64>:<hashB64>". */
  passwordHash: string;
  role: AdminRole;
  createdAt: string;
  lastLoginAt?: string;
  /** Set to disable without deleting, so the audit trail stays resolvable. */
  disabledAt?: string;
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: "insert" | "update" | "delete";
  actor: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

// --------------------------------------------------------------------------
// Aggregate dataset shape (JSON store + Postgres seeder both consume this)
// --------------------------------------------------------------------------

export interface Dataset {
  countries: Country[];
  states: State[];
  metros: Metro[];
  cities: City[];
  zipCodes: ZipCode[];
  services: Service[];
  projectTypes: ProjectType[];
  materials: Material[];
  pricingSources: PricingSource[];
  pricingRecords: PricingRecord[];
  pricingFactors: PricingFactor[];
  priceIndexSeries: PriceIndexSeries[];
  priceIndexPoints: PriceIndexPoint[];
}

export interface MutableCollections {
  estimateRequests: EstimateRequest[];
  quoteChecks: QuoteCheck[];
  contractorQuoteSets: ContractorQuoteSet[];
  actualProjectCosts: ActualProjectCost[];
  leads: Lead[];
  analyticsEvents: AnalyticsEvent[];
  auditLog: AuditLogEntry[];
  adminUsers: AdminUser[];
}

export type StoreShape = Dataset & MutableCollections;
