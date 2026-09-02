import type {
  ActualProjectCost, AdminUser, AnalyticsEvent, AuditLogEntry, City, ContractorQuoteSet, Country,
  Dataset, EstimateRequest, ExtractedQuoteRecord, Lead, Material, Metro, PriceIndexPoint, PriceIndexSeries,
  PricingFactor, PricingRecord, PricingSource, ProjectType, QuoteCheck, Service, State,
  StoreShape, ZipCode,
} from "@/lib/types";

/**
 * The one interface the whole application talks to.
 *
 * Two implementations ship: a JSON file store (default, zero infrastructure,
 * used for development and demos) and a PostgreSQL store (production). Nothing
 * above this layer knows which one is in use.
 */
export interface DataStore {
  readonly driver: "json" | "postgres";

  // -- reference data ------------------------------------------------------
  getDataset(): Promise<Dataset>;
  listCountries(): Promise<Country[]>;
  listStates(): Promise<State[]>;
  listMetros(): Promise<Metro[]>;
  listCities(opts?: { publishedOnly?: boolean }): Promise<City[]>;
  getCityBySlug(slug: string): Promise<City | null>;
  getCityById(id: string): Promise<City | null>;
  listZipCodes(opts?: { cityId?: string; pageEligibleOnly?: boolean }): Promise<ZipCode[]>;
  getZipByCode(code: string): Promise<ZipCode | null>;

  listServices(opts?: { liveOnly?: boolean }): Promise<Service[]>;
  getServiceBySlug(slug: string): Promise<Service | null>;
  getServiceByCostPath(costPathSlug: string): Promise<Service | null>;
  listProjectTypes(serviceId: string): Promise<ProjectType[]>;
  listMaterials(serviceId: string): Promise<Material[]>;

  // -- pricing -------------------------------------------------------------
  listPricingSources(): Promise<PricingSource[]>;
  listPricingRecords(serviceId: string): Promise<PricingRecord[]>;
  listPricingFactors(serviceId: string): Promise<PricingFactor[]>;
  listIndexSeries(): Promise<PriceIndexSeries[]>;
  listIndexPoints(seriesId: string): Promise<PriceIndexPoint[]>;

  // -- capture -------------------------------------------------------------
  saveEstimateRequest(row: EstimateRequest): Promise<void>;
  saveQuoteCheck(row: QuoteCheck): Promise<void>;
  saveQuoteSet(row: ContractorQuoteSet): Promise<void>;
  saveActualProjectCost(row: ActualProjectCost): Promise<void>;
  saveLead(row: Lead): Promise<void>;
  saveEvent(row: AnalyticsEvent): Promise<void>;
  saveExtractedQuote(row: ExtractedQuoteRecord): Promise<void>;

  // -- admin accounts -------------------------------------------------------
  getAdminUserByEmail(email: string): Promise<AdminUser | null>;
  getAdminUserById(id: string): Promise<AdminUser | null>;
  listAdminUsers(): Promise<AdminUser[]>;
  createAdminUser(user: AdminUser): Promise<{ ok: boolean; message?: string }>;
  recordAdminLogin(id: string, at: string): Promise<void>;

  // -- admin ---------------------------------------------------------------
  listEstimateRequests(limit?: number): Promise<EstimateRequest[]>;
  listQuoteChecks(limit?: number): Promise<QuoteCheck[]>;
  listSubmissions(status?: ActualProjectCost["status"]): Promise<ActualProjectCost[]>;
  listLeads(limit?: number): Promise<Lead[]>;
  listEvents(limit?: number): Promise<AnalyticsEvent[]>;
  listExtractedQuotes(limit?: number): Promise<ExtractedQuoteRecord[]>;
  listAuditLog(limit?: number): Promise<AuditLogEntry[]>;

  /** Patch one reference-data row and write an audit entry. */
  updateRecord<K extends EditableCollection>(
    collection: K, id: string, patch: Record<string, unknown>, actor: string,
  ): Promise<{ ok: boolean; message?: string }>;

  insertRecord<K extends EditableCollection>(
    collection: K, row: Record<string, unknown>, actor: string,
  ): Promise<{ ok: boolean; message?: string; id?: string }>;

  /**
   * Remove one reference-data row, writing an audit entry that keeps the
   * deleted values. Needed for data operations: when a verified feed supersedes
   * a sample row, the sample row has to go, or the geographic resolution chain
   * keeps preferring it for being more specific.
   */
  deleteRecord<K extends EditableCollection>(
    collection: K, id: string, actor: string,
  ): Promise<{ ok: boolean; message?: string }>;
}

export type EditableCollection = Extract<
  keyof StoreShape,
  | "cities" | "zipCodes" | "states" | "services" | "materials"
  | "pricingRecords" | "pricingFactors" | "pricingSources" | "actualProjectCosts"
>;

let cached: DataStore | null = null;

/**
 * Pick the driver. DATABASE_URL present -> PostgreSQL; otherwise the JSON file
 * store. Both are lazily imported so a deployment without `pg` configured never
 * loads the driver, and the JSON store never ships to a Postgres deployment.
 */
export async function getStore(): Promise<DataStore> {
  if (cached) return cached;

  // Failing loudly beats failing silently. Without this, a production deploy
  // with no DATABASE_URL falls back to the JSON store, whose writes land on a
  // read-only serverless filesystem and vanish: estimates, submissions and
  // leads would all be accepted and then quietly lost.
  // Skipped during `next build`, which legitimately prerenders pages with no
  // database attached; the risk being guarded against is lost writes at runtime.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production" && !isBuildPhase
      && process.env.ALLOW_JSON_STORE_IN_PRODUCTION !== "true") {
    throw new Error(
      "DATABASE_URL is not set. The JSON file store is for development only and will " +
      "silently discard writes on a read-only filesystem. Set DATABASE_URL, or set " +
      "ALLOW_JSON_STORE_IN_PRODUCTION=true if you genuinely intend to run without a database.");
  }

  if (process.env.DATABASE_URL) {
    const { PostgresStore } = await import("./postgres-store");
    cached = new PostgresStore(process.env.DATABASE_URL);
  } else {
    const { JsonStore } = await import("./json-store");
    cached = new JsonStore();
  }
  return cached;
}

/** Test hook - lets a test swap in a fixture store. */
export function __setStoreForTesting(store: DataStore | null) {
  cached = store;
}
