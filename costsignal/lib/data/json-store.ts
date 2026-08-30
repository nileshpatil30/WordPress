import fs from "node:fs";
import path from "node:path";
import { seedDataset } from "./seed";
import type { DataStore, EditableCollection } from "./store";
import type {
  ActualProjectCost, AdminUser, AnalyticsEvent, AuditLogEntry, City, ContractorQuoteSet, Country,
  Dataset, EstimateRequest, Lead, Material, Metro, PriceIndexPoint, PriceIndexSeries,
  PricingFactor, PricingRecord, PricingSource, ProjectType, QuoteCheck, Service, State,
  StoreShape, ZipCode,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

/**
 * Reference collections are merged over the seed by id, so a seed update is
 * never lost behind a stale overlay. That merge cannot express a deletion, so
 * deletions are recorded as tombstones and filtered out on load. Without this,
 * a row removed through the admin console or an ingest job silently reappears
 * on the next boot.
 */
type Tombstones = Partial<Record<string, string[]>>;

function emptyMutable(): Pick<StoreShape,
  "estimateRequests" | "quoteChecks" | "contractorQuoteSets" | "actualProjectCosts"
  | "leads" | "analyticsEvents" | "auditLog" | "adminUsers"> {
  return {
    estimateRequests: [], quoteChecks: [], contractorQuoteSets: [],
    actualProjectCosts: [], leads: [], analyticsEvents: [], auditLog: [], adminUsers: [],
  };
}

/**
 * File-backed store.
 *
 * Seeded reference data is the baseline; anything written at runtime (captured
 * estimates, submissions, admin edits) is persisted to .data/store.json and
 * layered back over the seed on the next boot. That makes the whole product -
 * admin console included - genuinely functional with no database, while the
 * PostgreSQL store remains the production path.
 *
 * Not suitable for production: no concurrency control, no read replicas, and a
 * read-only serverless filesystem silently disables persistence.
 */
export class JsonStore implements DataStore {
  readonly driver = "json" as const;
  private state: StoreShape;
  private canWrite: boolean;
  private deleted: Tombstones = {};

  constructor() {
    this.canWrite = process.env.ALLOW_FILE_WRITES !== "false";
    this.state = { ...structuredClone(seedDataset), ...emptyMutable() };
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_FILE)) return;
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as
        Partial<StoreShape> & { __deleted?: Tombstones };
      const raw = parsed as Partial<StoreShape>;
      this.deleted = parsed.__deleted ?? {};
      // Runtime collections replace wholesale; reference collections are merged
      // by id so a seed update is not lost behind a stale overlay.
      this.state = { ...this.state, ...emptyMutable(), ...pickMutable(raw) };
      for (const key of REFERENCE_KEYS) {
        const overlay = raw[key] as { id: string }[] | undefined;
        if (!overlay?.length) continue;
        const byId = new Map((this.state[key] as { id: string }[]).map((r) => [r.id, r]));
        for (const row of overlay) byId.set(row.id, { ...byId.get(row.id), ...row });
        (this.state as unknown as Record<string, unknown>)[key] = [...byId.values()];
      }
      // Re-apply deletions last, so a tombstoned row cannot come back via the
      // seed or the overlay.
      for (const [key, ids] of Object.entries(this.deleted)) {
        if (!ids?.length) continue;
        const rows = this.state[key as keyof StoreShape] as unknown as { id: string }[] | undefined;
        if (!Array.isArray(rows)) continue;
        const gone = new Set(ids);
        (this.state as unknown as Record<string, unknown>)[key] = rows.filter((r) => !gone.has(r.id));
      }
    } catch (err) {
      console.warn("[json-store] could not read overlay, using seed only:", err);
    }
  }

  private persist() {
    if (!this.canWrite) return;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(
        DATA_FILE, JSON.stringify({ ...this.state, __deleted: this.deleted }, null, 2), "utf8");
    } catch (err) {
      // A read-only filesystem is an expected deployment, not a crash.
      this.canWrite = false;
      console.warn("[json-store] persistence disabled:", err);
    }
  }

  // -- reference data ------------------------------------------------------
  async getDataset(): Promise<Dataset> { return this.state; }
  async listCountries(): Promise<Country[]> { return this.state.countries; }
  async listStates(): Promise<State[]> { return this.state.states; }
  async listMetros(): Promise<Metro[]> { return this.state.metros; }

  async listCities(opts?: { publishedOnly?: boolean }): Promise<City[]> {
    const rows = opts?.publishedOnly ? this.state.cities.filter((c) => c.isPublished) : this.state.cities;
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }
  async getCityBySlug(slug: string) { return this.state.cities.find((c) => c.slug === slug) ?? null; }
  async getCityById(id: string) { return this.state.cities.find((c) => c.id === id) ?? null; }

  async listZipCodes(opts?: { cityId?: string; pageEligibleOnly?: boolean }): Promise<ZipCode[]> {
    return this.state.zipCodes
      .filter((z) => (opts?.cityId ? z.cityId === opts.cityId : true))
      .filter((z) => (opts?.pageEligibleOnly ? z.pageEligible : true))
      .sort((a, b) => a.code.localeCompare(b.code));
  }
  async getZipByCode(code: string) { return this.state.zipCodes.find((z) => z.code === code) ?? null; }

  async listServices(opts?: { liveOnly?: boolean }): Promise<Service[]> {
    return this.state.services
      .filter((s) => (opts?.liveOnly ? s.status === "live" : true))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async getServiceBySlug(slug: string) { return this.state.services.find((s) => s.slug === slug) ?? null; }
  async getServiceByCostPath(p: string) { return this.state.services.find((s) => s.costPathSlug === p) ?? null; }
  async listProjectTypes(serviceId: string): Promise<ProjectType[]> {
    return this.state.projectTypes.filter((p) => p.serviceId === serviceId);
  }
  async listMaterials(serviceId: string): Promise<Material[]> {
    return this.state.materials
      .filter((m) => m.serviceId === serviceId && m.status === "live")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // -- pricing -------------------------------------------------------------
  async listPricingSources(): Promise<PricingSource[]> { return this.state.pricingSources; }
  async listPricingRecords(serviceId: string): Promise<PricingRecord[]> {
    return this.state.pricingRecords.filter((r) => r.serviceId === serviceId);
  }
  async listPricingFactors(serviceId: string): Promise<PricingFactor[]> {
    return this.state.pricingFactors.filter((f) => f.serviceId === serviceId);
  }
  async listIndexSeries(): Promise<PriceIndexSeries[]> { return this.state.priceIndexSeries; }
  async listIndexPoints(seriesId: string): Promise<PriceIndexPoint[]> {
    return this.state.priceIndexPoints
      .filter((p) => p.seriesId === seriesId)
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  }

  // -- capture -------------------------------------------------------------
  async saveEstimateRequest(row: EstimateRequest) { this.state.estimateRequests.push(row); this.persist(); }
  async saveQuoteCheck(row: QuoteCheck) { this.state.quoteChecks.push(row); this.persist(); }
  async saveQuoteSet(row: ContractorQuoteSet) { this.state.contractorQuoteSets.push(row); this.persist(); }
  async saveActualProjectCost(row: ActualProjectCost) { this.state.actualProjectCosts.push(row); this.persist(); }
  async saveLead(row: Lead) { this.state.leads.push(row); this.persist(); }
  async saveEvent(row: AnalyticsEvent) {
    this.state.analyticsEvents.push(row);
    // Keep the dev file from growing without bound.
    if (this.state.analyticsEvents.length > 5000) this.state.analyticsEvents.splice(0, 1000);
    this.persist();
  }

  // -- admin accounts -------------------------------------------------------
  async getAdminUserByEmail(email: string) {
    const needle = email.trim().toLowerCase();
    return this.state.adminUsers.find((u) => u.email.toLowerCase() === needle) ?? null;
  }
  async getAdminUserById(id: string) {
    return this.state.adminUsers.find((u) => u.id === id) ?? null;
  }
  async listAdminUsers() { return this.state.adminUsers; }
  async createAdminUser(user: AdminUser) {
    if (await this.getAdminUserByEmail(user.email)) {
      return { ok: false, message: "An account with that email already exists." };
    }
    this.state.adminUsers.push(user);
    this.persist();
    return { ok: true };
  }
  async recordAdminLogin(id: string, at: string) {
    const user = this.state.adminUsers.find((u) => u.id === id);
    if (user) { user.lastLoginAt = at; this.persist(); }
  }

  // -- admin ---------------------------------------------------------------
  async listEstimateRequests(limit = 200) { return tail(this.state.estimateRequests, limit); }
  async listQuoteChecks(limit = 200) { return tail(this.state.quoteChecks, limit); }
  async listSubmissions(status?: ActualProjectCost["status"]) {
    const rows = status ? this.state.actualProjectCosts.filter((r) => r.status === status) : this.state.actualProjectCosts;
    return [...rows].reverse();
  }
  async listLeads(limit = 200) { return tail(this.state.leads, limit); }
  async listEvents(limit = 500) { return tail(this.state.analyticsEvents, limit); }
  async listAuditLog(limit = 200) { return tail(this.state.auditLog, limit); }

  async updateRecord<K extends EditableCollection>(
    collection: K, id: string, patch: Record<string, unknown>, actor: string,
  ) {
    const rows = this.state[collection] as unknown as { id: string }[];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return { ok: false, message: `No ${collection} row with id ${id}` };
    const before = structuredClone(rows[idx]);
    rows[idx] = { ...rows[idx], ...patch, id };
    this.state.auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tableName: collection, recordId: id, action: "update", actor,
      before: before as Record<string, unknown>, after: rows[idx] as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    });
    this.persist();
    return { ok: true };
  }

  async deleteRecord<K extends EditableCollection>(
    collection: K, id: string, actor: string,
  ) {
    const rows = this.state[collection] as unknown as { id: string }[];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return { ok: false, message: `No ${collection} row with id ${id}` };
    const [removed] = rows.splice(idx, 1);
    this.deleted[collection] = [...(this.deleted[collection] ?? []), id];
    this.state.auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tableName: collection, recordId: id, action: "delete", actor,
      before: removed as unknown as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    });
    this.persist();
    return { ok: true };
  }

  async insertRecord<K extends EditableCollection>(
    collection: K, row: Record<string, unknown>, actor: string,
  ) {
    const rows = this.state[collection] as unknown as { id: string }[];
    const id = String(row.id ?? `${collection}-${Date.now().toString(36)}`);
    if (rows.some((r) => r.id === id)) return { ok: false, message: `id ${id} already exists` };
    // Re-inserting a previously deleted id is a resurrection, not a duplicate.
    this.deleted[collection] = (this.deleted[collection] ?? []).filter((x) => x !== id);
    rows.push({ ...row, id } as { id: string });
    this.state.auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tableName: collection, recordId: id, action: "insert", actor,
      after: row, createdAt: new Date().toISOString(),
    });
    this.persist();
    return { ok: true, id };
  }
}

const REFERENCE_KEYS = [
  "countries", "states", "metros", "cities", "zipCodes", "services", "projectTypes",
  "materials", "pricingSources", "pricingRecords", "pricingFactors",
  "priceIndexSeries", "priceIndexPoints",
] as const satisfies readonly (keyof Dataset)[];

const MUTABLE_KEYS = [
  "estimateRequests", "quoteChecks", "contractorQuoteSets", "actualProjectCosts",
  "leads", "analyticsEvents", "auditLog", "adminUsers",
] as const;

function pickMutable(raw: Partial<StoreShape>) {
  const out: Record<string, unknown> = {};
  for (const k of MUTABLE_KEYS) if (raw[k]) out[k] = raw[k];
  return out as Partial<StoreShape>;
}

function tail<T>(rows: T[], limit: number): T[] {
  return rows.slice(Math.max(0, rows.length - limit)).reverse();
}
