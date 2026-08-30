import { Pool } from "pg";
import type { DataStore, EditableCollection } from "./store";
import type {
  ActualProjectCost, AdminUser, AnalyticsEvent, AuditLogEntry, City, ContractorQuoteSet, Country,
  Dataset, EstimateRequest, Lead, Material, Metro, PriceIndexPoint, PriceIndexSeries,
  PricingFactor, PricingRecord, PricingSource, ProjectType, QuoteCheck, Service, State,
  ZipCode,
} from "@/lib/types";

/** snake_case row -> camelCase object. */
function camel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  }
  return out as T;
}
/** camelCase key -> snake_case column. */
function snake(key: string) {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
/** Numeric columns come back as strings from pg; coerce the ones we do maths on. */
function num<T extends Record<string, unknown>>(row: T, keys: string[]): T {
  for (const k of keys) if (row[k] != null) (row as Record<string, unknown>)[k] = Number(row[k]);
  return row;
}

/**
 * Production store. Table and column names match db/schema.sql exactly.
 *
 * Only reference-data collections listed in EditableCollection are writable
 * through updateRecord/insertRecord, and every write emits an audit_log row in
 * the same transaction.
 */
export class PostgresStore implements DataStore {
  readonly driver = "postgres" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 8, idleTimeoutMillis: 30_000 });
  }

  private async q<T>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(text, params);
    return res.rows.map((r) => camel<T>(r));
  }

  async getDataset(): Promise<Dataset> {
    const [countries, states, metros, cities, zipCodes, services, projectTypes, materials,
      pricingSources, pricingRecords, pricingFactors, priceIndexSeries, priceIndexPoints] =
      await Promise.all([
        this.listCountries(), this.listStates(), this.listMetros(), this.listCities(),
        this.listZipCodes(), this.listServices(), this.q<ProjectType>("SELECT * FROM project_types"),
        this.q<Material>("SELECT * FROM materials"), this.listPricingSources(),
        this.q<PricingRecord>("SELECT * FROM pricing_records"),
        this.q<PricingFactor>("SELECT * FROM pricing_factors"),
        this.listIndexSeries(), this.q<PriceIndexPoint>("SELECT * FROM price_index_points"),
      ]);
    return { countries, states, metros, cities, zipCodes, services, projectTypes, materials,
      pricingSources, pricingRecords, pricingFactors, priceIndexSeries, priceIndexPoints };
  }

  // -- reference data ------------------------------------------------------
  listCountries() { return this.q<Country>("SELECT * FROM countries ORDER BY name"); }

  async listStates() {
    const rows = await this.q<State>("SELECT * FROM states ORDER BY name");
    return rows.map((r) => num(r as never, ["laborIndex", "materialIndex"]) as State);
  }

  listMetros() { return this.q<Metro>("SELECT * FROM metros ORDER BY name"); }

  listCities(opts?: { publishedOnly?: boolean }) {
    return this.q<City>(
      `SELECT * FROM cities ${opts?.publishedOnly ? "WHERE is_published" : ""} ORDER BY name`);
  }
  async getCityBySlug(slug: string) {
    return (await this.q<City>("SELECT * FROM cities WHERE slug = $1", [slug]))[0] ?? null;
  }
  async getCityById(id: string) {
    return (await this.q<City>("SELECT * FROM cities WHERE id = $1", [id]))[0] ?? null;
  }

  listZipCodes(opts?: { cityId?: string; pageEligibleOnly?: boolean }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts?.cityId) { params.push(opts.cityId); where.push(`city_id = $${params.length}`); }
    if (opts?.pageEligibleOnly) where.push("page_eligible");
    return this.q<ZipCode>(
      `SELECT * FROM zip_codes ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY code`,
      params);
  }
  async getZipByCode(code: string) {
    return (await this.q<ZipCode>("SELECT * FROM zip_codes WHERE code = $1", [code]))[0] ?? null;
  }

  listServices(opts?: { liveOnly?: boolean }) {
    return this.q<Service>(
      `SELECT * FROM services ${opts?.liveOnly ? "WHERE status = 'live'" : ""} ORDER BY sort_order`);
  }
  async getServiceBySlug(slug: string) {
    return (await this.q<Service>("SELECT * FROM services WHERE slug = $1", [slug]))[0] ?? null;
  }
  async getServiceByCostPath(p: string) {
    return (await this.q<Service>("SELECT * FROM services WHERE cost_path_slug = $1", [p]))[0] ?? null;
  }
  async listProjectTypes(serviceId: string) {
    const rows = await this.q<ProjectType>(
      "SELECT * FROM project_types WHERE service_id = $1", [serviceId]);
    return rows.map((r) => num(r as never, ["scopeMultiplier"]) as ProjectType);
  }
  async listMaterials(serviceId: string) {
    const rows = await this.q<Material>(
      "SELECT * FROM materials WHERE service_id = $1 AND status = 'live' ORDER BY sort_order",
      [serviceId]);
    return rows.map((r) => num(r as never, ["weightLbsPerSquare", "laborHoursPerSquare"]) as Material);
  }

  // -- pricing -------------------------------------------------------------
  async listPricingSources() {
    const rows = await this.q<PricingSource>("SELECT * FROM pricing_sources ORDER BY name");
    return rows.map((r) => num(r as never, ["reliabilityWeight"]) as PricingSource);
  }
  async listPricingRecords(serviceId: string) {
    const rows = await this.q<PricingRecord>(
      "SELECT * FROM pricing_records WHERE service_id = $1", [serviceId]);
    return rows.map((r) => num(r as never, ["lowPrice", "medianPrice", "highPrice", "confidenceScore"]) as PricingRecord);
  }
  async listPricingFactors(serviceId: string) {
    const rows = await this.q<PricingFactor>(
      "SELECT * FROM pricing_factors WHERE service_id = $1", [serviceId]);
    return rows.map((r) => num(r as never, ["multiplier", "flatAdder"]) as PricingFactor);
  }
  listIndexSeries() { return this.q<PriceIndexSeries>("SELECT * FROM price_index_series"); }
  async listIndexPoints(seriesId: string) {
    const rows = await this.q<PriceIndexPoint>(
      "SELECT * FROM price_index_points WHERE series_id = $1 ORDER BY period_start", [seriesId]);
    return rows.map((r) => num(r as never, ["value", "pctChangeYoy"]) as PriceIndexPoint);
  }

  // -- capture -------------------------------------------------------------
  async saveEstimateRequest(r: EstimateRequest) {
    await this.pool.query(
      `INSERT INTO estimate_requests
       (id, session_id, service_id, zip, city_id, inputs, estimate_low, estimate_typical,
        estimate_high, confidence, engine_version, path, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [r.id, r.sessionId, r.serviceId, r.zip, r.cityId ?? null, JSON.stringify(r.inputs),
        r.estimateLow, r.estimateTypical, r.estimateHigh, r.confidence, r.engineVersion,
        r.path ?? null, r.createdAt]);
  }

  async saveQuoteCheck(r: QuoteCheck) {
    await this.pool.query(
      `INSERT INTO quote_checks
       (id, estimate_request_id, session_id, service_id, zip, quoted_price, verdict, delta_pct, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r.id, r.estimateRequestId ?? null, r.sessionId, r.serviceId, r.zip, r.quotedPrice,
        r.verdict, r.deltaPct, r.createdAt]);
  }

  async saveQuoteSet(r: ContractorQuoteSet) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO contractor_quote_sets (id, session_id, service_id, zip, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [r.id, r.sessionId, r.serviceId, r.zip, r.createdAt]);
      for (const q of r.quotes) {
        await client.query(
          `INSERT INTO contractor_quotes
           (id, set_id, label, total_price, material_id, warranty_workmanship_years,
            warranty_material_years, scope, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [q.id, r.id, q.label, q.totalPrice, q.materialId ?? null,
            q.warrantyWorkmanshipYears ?? null, q.warrantyMaterialYears ?? null,
            JSON.stringify(q.scope), q.notes ?? null]);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async saveActualProjectCost(r: ActualProjectCost) {
    await this.pool.query(
      `INSERT INTO actual_project_costs
       (id, service_id, zip, project_month, amount_paid, material_id, roof_area_sqft,
        inputs, quotes_received, consent_version, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [r.id, r.serviceId, r.zip, r.projectMonth, r.amountPaid, r.materialId ?? null,
        r.roofAreaSqft ?? null, JSON.stringify(r.inputs), r.quotesReceived ?? null,
        r.consentVersion, r.status, r.submittedAt]);
  }

  async saveLead(r: Lead) {
    await this.pool.query(
      `INSERT INTO leads
       (id, estimate_request_id, service_id, zip, contact_name, email, phone, timeline,
        consent_at, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [r.id, r.estimateRequestId ?? null, r.serviceId, r.zip, r.contactName, r.email,
        r.phone ?? null, r.timeline, r.consentAt, r.status, r.createdAt]);
  }

  async saveEvent(r: AnalyticsEvent) {
    await this.pool.query(
      `INSERT INTO analytics_events (id, session_id, event_name, properties, path, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [r.id, r.sessionId, r.eventName, JSON.stringify(r.properties), r.path ?? null, r.createdAt]);
  }

  // -- admin accounts -------------------------------------------------------
  async getAdminUserByEmail(email: string) {
    return (await this.q<AdminUser>(
      "SELECT * FROM admin_users WHERE lower(email) = lower($1)", [email]))[0] ?? null;
  }
  async getAdminUserById(id: string) {
    return (await this.q<AdminUser>("SELECT * FROM admin_users WHERE id = $1", [id]))[0] ?? null;
  }
  listAdminUsers() { return this.q<AdminUser>("SELECT * FROM admin_users ORDER BY email"); }
  async createAdminUser(user: AdminUser) {
    try {
      await this.pool.query(
        `INSERT INTO admin_users (id, email, password_hash, role, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [user.id, user.email, user.passwordHash, user.role, user.createdAt]);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "insert failed" };
    }
  }
  async recordAdminLogin(id: string, at: string) {
    await this.pool.query("UPDATE admin_users SET last_login_at = $2 WHERE id = $1", [id, at]);
  }

  // -- admin ---------------------------------------------------------------
  async listEstimateRequests(limit = 200) {
    const rows = await this.q<EstimateRequest>(
      "SELECT * FROM estimate_requests ORDER BY created_at DESC LIMIT $1", [limit]);
    return rows.map((r) => num(r as never, ["estimateLow", "estimateTypical", "estimateHigh", "confidence"]) as EstimateRequest);
  }
  async listQuoteChecks(limit = 200) {
    const rows = await this.q<QuoteCheck>(
      "SELECT * FROM quote_checks ORDER BY created_at DESC LIMIT $1", [limit]);
    return rows.map((r) => num(r as never, ["quotedPrice", "deltaPct"]) as QuoteCheck);
  }
  async listSubmissions(status?: ActualProjectCost["status"]) {
    const rows = status
      ? await this.q<ActualProjectCost>(
        "SELECT * FROM actual_project_costs WHERE status = $1 ORDER BY submitted_at DESC", [status])
      : await this.q<ActualProjectCost>(
        "SELECT * FROM actual_project_costs ORDER BY submitted_at DESC");
    return rows.map((r) => num(r as never, ["amountPaid", "roofAreaSqft"]) as ActualProjectCost);
  }
  listLeads(limit = 200) {
    return this.q<Lead>("SELECT * FROM leads ORDER BY created_at DESC LIMIT $1", [limit]);
  }
  listEvents(limit = 500) {
    return this.q<AnalyticsEvent>(
      "SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT $1", [limit]);
  }
  listAuditLog(limit = 200) {
    return this.q<AuditLogEntry>("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1", [limit]);
  }

  async updateRecord<K extends EditableCollection>(
    collection: K, id: string, patch: Record<string, unknown>, actor: string,
  ) {
    const table = TABLE_FOR[collection];
    const entries = Object.entries(patch).filter(([k]) => k !== "id");
    if (!entries.length) return { ok: false, message: "empty patch" };

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = (await client.query(`SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!before) { await client.query("ROLLBACK"); return { ok: false, message: "not found" }; }

      const sets = entries.map(([k], i) => `${snake(k)} = $${i + 2}`).join(", ");
      const values = entries.map(([, v]) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v));
      const after = (await client.query(
        `UPDATE ${table} SET ${sets} WHERE id = $1 RETURNING *`, [id, ...values])).rows[0];

      await client.query(
        `INSERT INTO audit_log (id, table_name, record_id, action, actor, before, after)
         VALUES (gen_random_uuid()::text, $1, $2, 'update', $3, $4, $5)`,
        [table, id, actor, JSON.stringify(before), JSON.stringify(after)]);
      await client.query("COMMIT");
      return { ok: true };
    } catch (e) {
      await client.query("ROLLBACK");
      return { ok: false, message: e instanceof Error ? e.message : "update failed" };
    } finally {
      client.release();
    }
  }

  async deleteRecord<K extends EditableCollection>(
    collection: K, id: string, actor: string,
  ) {
    const table = TABLE_FOR[collection];
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = (await client.query(
        `DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id])).rows[0];
      if (!before) { await client.query("ROLLBACK"); return { ok: false, message: "not found" }; }
      await client.query(
        `INSERT INTO audit_log (id, table_name, record_id, action, actor, before)
         VALUES (gen_random_uuid()::text, $1, $2, 'delete', $3, $4)`,
        [table, id, actor, JSON.stringify(before)]);
      await client.query("COMMIT");
      return { ok: true };
    } catch (e) {
      await client.query("ROLLBACK");
      return { ok: false, message: e instanceof Error ? e.message : "delete failed" };
    } finally {
      client.release();
    }
  }

  async insertRecord<K extends EditableCollection>(
    collection: K, row: Record<string, unknown>, actor: string,
  ) {
    const table = TABLE_FOR[collection];
    const id = String(row.id ?? `${collection}-${Date.now().toString(36)}`);
    const entries = Object.entries({ ...row, id });
    const cols = entries.map(([k]) => snake(k)).join(", ");
    const placeholders = entries.map((_, i) => `$${i + 1}`).join(", ");
    const values = entries.map(([, v]) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v));

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const after = (await client.query(
        `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`, values)).rows[0];
      await client.query(
        `INSERT INTO audit_log (id, table_name, record_id, action, actor, after)
         VALUES (gen_random_uuid()::text, $1, $2, 'insert', $3, $4)`,
        [table, id, actor, JSON.stringify(after)]);
      await client.query("COMMIT");
      return { ok: true, id };
    } catch (e) {
      await client.query("ROLLBACK");
      return { ok: false, message: e instanceof Error ? e.message : "insert failed" };
    } finally {
      client.release();
    }
  }
}

/** Whitelist. Table names are never interpolated from user input. */
const TABLE_FOR: Record<EditableCollection, string> = {
  cities: "cities",
  zipCodes: "zip_codes",
  states: "states",
  services: "services",
  materials: "materials",
  pricingRecords: "pricing_records",
  pricingFactors: "pricing_factors",
  pricingSources: "pricing_sources",
  actualProjectCosts: "actual_project_costs",
};
