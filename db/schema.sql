-- ===========================================================================
-- CostSignal - canonical PostgreSQL schema
-- ===========================================================================
-- Design rules that this schema encodes:
--
--  1. Geography is a chain, not a flat table: country > state > metro > city >
--     zip. Pricing attaches to ANY level via (geo_scope_type, geo_scope_id),
--     and the engine walks the chain downward-to-upward until it finds data.
--     That is what makes "add a city" a data operation, not a code change.
--
--  2. Nothing about the cost model is hardcoded. Every multiplier lives in
--     pricing_factors; every base price lives in pricing_records. The engine
--     reads them, so retuning the model is an admin edit.
--
--  3. Every price carries provenance: where it came from, when it was
--     collected, what period it describes, under what licence, and whether it
--     is verified, modeled, or sample data. data_status is NOT NULL on purpose:
--     an unlabelled number cannot enter the system.
--
--  4. Internationalisation is structural, not retrofitted: currency, unit
--     system and locale live on countries, and every money column is paired
--     with a currency.
--
--  5. The three prices we care about long term - estimated, quoted, actually
--     paid - are stored separately so model accuracy can be measured later.
--
-- Apply with:  psql "$DATABASE_URL" -f db/schema.sql
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy city search

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE data_status  AS ENUM ('verified','modeled','sample');
  CREATE TYPE source_type  AS ENUM ('government','open_data','trade_association',
                                    'manufacturer','public_market','licensed',
                                    'first_party','contractor_submitted','internal_model');
  CREATE TYPE geo_scope    AS ENUM ('global','country','state','metro','city','zip');
  CREATE TYPE cost_component AS ENUM ('material','labor','equipment','disposal',
                                      'permit','overhead','addon');
  CREATE TYPE unit_system   AS ENUM ('imperial','metric');
  CREATE TYPE submission_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1. Geography
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS countries (
  id             TEXT PRIMARY KEY,
  iso2           CHAR(2)     NOT NULL UNIQUE,
  name           TEXT        NOT NULL,
  currency_code  CHAR(3)     NOT NULL,
  unit_system    unit_system NOT NULL DEFAULT 'imperial',
  default_locale TEXT        NOT NULL DEFAULT 'en-US',
  is_active      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS states (
  id             TEXT PRIMARY KEY,
  country_id     TEXT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL,
  -- Coarse fallbacks used when we have no metro/city data for a ZIP.
  labor_index    NUMERIC(6,3) NOT NULL DEFAULT 1.000,
  material_index NUMERIC(6,3) NOT NULL DEFAULT 1.000,
  data_status    data_status  NOT NULL,
  notes          TEXT,
  UNIQUE (country_id, code)
);

CREATE TABLE IF NOT EXISTS metros (
  id         TEXT PRIMARY KEY,
  country_id TEXT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  state_id   TEXT NOT NULL REFERENCES states(id)    ON DELETE CASCADE,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  cbsa_code  TEXT
);

CREATE TABLE IF NOT EXISTS cities (
  id           TEXT PRIMARY KEY,
  country_id   TEXT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  state_id     TEXT NOT NULL REFERENCES states(id)    ON DELETE CASCADE,
  metro_id     TEXT REFERENCES metros(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,          -- "phoenix-az"
  population   INTEGER,
  latitude     NUMERIC(9,6),
  longitude    NUMERIC(9,6),
  -- A city page is only indexable once an editor has written real local
  -- content for it. This is the gate that stops thin programmatic pages.
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  content      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cities_name_trgm ON cities USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS zip_codes (
  id            TEXT PRIMARY KEY,
  country_id    TEXT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  state_id      TEXT NOT NULL REFERENCES states(id)    ON DELETE CASCADE,
  city_id       TEXT NOT NULL REFERENCES cities(id)    ON DELETE CASCADE,
  code          TEXT NOT NULL,
  county        TEXT,
  latitude      NUMERIC(9,6),
  longitude     NUMERIC(9,6),
  -- Same gate as cities, one level finer.
  page_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  content       JSONB,
  UNIQUE (country_id, code)
);
CREATE INDEX IF NOT EXISTS zip_codes_city ON zip_codes(city_id);

-- ---------------------------------------------------------------------------
-- 2. Service catalogue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,        -- "roofing"
  cost_path_slug TEXT NOT NULL UNIQUE,        -- "roofing-cost" -> /roofing-cost/...
  name           TEXT NOT NULL,
  short_name     TEXT NOT NULL,
  category       TEXT NOT NULL,
  unit           TEXT NOT NULL,
  -- Which engine module computes this service. Adding a service = adding a
  -- module with this key + rows in materials/pricing_*, no app rewrite.
  engine_key     TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'planned',   -- live | planned
  description    TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_types (
  id               TEXT PRIMARY KEY,
  service_id       TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  scope_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.000,
  UNIQUE (service_id, slug)
);

CREATE TABLE IF NOT EXISTS materials (
  id                      TEXT PRIMARY KEY,
  service_id              TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slug                    TEXT NOT NULL,
  name                    TEXT NOT NULL,
  family                  TEXT NOT NULL,
  tier                    TEXT NOT NULL,
  unit                    TEXT NOT NULL,
  expected_life_years_min INTEGER NOT NULL,
  expected_life_years_max INTEGER NOT NULL,
  weight_lbs_per_square   NUMERIC(8,2) NOT NULL,
  labor_hours_per_square  NUMERIC(6,2) NOT NULL,
  notes                   TEXT NOT NULL DEFAULT '',
  sort_order              INTEGER NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'live',
  UNIQUE (service_id, slug)
);

-- ---------------------------------------------------------------------------
-- 3. Pricing data + provenance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_sources (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  url               TEXT,
  source_type       source_type NOT NULL,
  -- Plain-language record of what we are allowed to do with this data.
  license_notes     TEXT NOT NULL,
  -- Short licence label, e.g. "Public domain (US federal government work)".
  license           TEXT,
  -- May figures derived from this source be published on a public page?
  -- Defaults to FALSE so a new source is unpublishable until someone decides.
  redistributable   BOOLEAN NOT NULL DEFAULT FALSE,
  reliability_weight NUMERIC(4,3) NOT NULL DEFAULT 0.500,  -- 0-1, feeds confidence
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_reviewed_at  DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_records (
  id               TEXT PRIMARY KEY,
  service_id       TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  material_id      TEXT REFERENCES materials(id) ON DELETE CASCADE,
  component        cost_component NOT NULL,
  metric_key       TEXT NOT NULL,          -- "material.per_square", "labor.rate_per_hour"
  geo_scope_type   geo_scope NOT NULL,
  geo_scope_id     TEXT NOT NULL,
  unit             TEXT NOT NULL,
  low_price        NUMERIC(12,2) NOT NULL,
  median_price     NUMERIC(12,2) NOT NULL,
  high_price       NUMERIC(12,2) NOT NULL,
  currency         CHAR(3) NOT NULL DEFAULT 'USD',
  effective_date   DATE NOT NULL,          -- period the price describes
  collected_date   DATE NOT NULL,          -- when we captured it
  source_id        TEXT NOT NULL REFERENCES pricing_sources(id),
  methodology      TEXT NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  data_status      data_status NOT NULL,
  sample_size      INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (low_price <= median_price AND median_price <= high_price)
);
CREATE INDEX IF NOT EXISTS pricing_records_lookup
  ON pricing_records (service_id, metric_key, geo_scope_type, geo_scope_id, effective_date DESC);

CREATE TABLE IF NOT EXISTS pricing_factors (
  id             TEXT PRIMARY KEY,
  service_id     TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  factor_key     TEXT NOT NULL,            -- "pitch.steep", "complexity.complex"
  label          TEXT NOT NULL,
  applies_to     TEXT NOT NULL,            -- labor | material | equipment | all
  multiplier     NUMERIC(6,3) NOT NULL DEFAULT 1.000,
  flat_adder     NUMERIC(12,2),
  geo_scope_type geo_scope NOT NULL DEFAULT 'global',
  geo_scope_id   TEXT NOT NULL DEFAULT 'global',
  description    TEXT NOT NULL,
  data_status    data_status NOT NULL,
  source_id      TEXT REFERENCES pricing_sources(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, factor_key, geo_scope_type, geo_scope_id)
);

CREATE TABLE IF NOT EXISTS price_index_series (
  id             TEXT PRIMARY KEY,
  series_key     TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  geo_scope_type geo_scope NOT NULL,
  geo_scope_id   TEXT NOT NULL,
  source_id      TEXT NOT NULL REFERENCES pricing_sources(id),
  unit           TEXT NOT NULL,
  methodology    TEXT NOT NULL,
  data_status    data_status NOT NULL,
  -- Which cost components this index may move. A materials PPI must never age
  -- labour, which has its own OEWS series. NULL escalates nothing.
  applies_to     cost_component[]
);

CREATE TABLE IF NOT EXISTS price_index_points (
  id             TEXT PRIMARY KEY,
  series_id      TEXT NOT NULL REFERENCES price_index_series(id) ON DELETE CASCADE,
  period_start   DATE NOT NULL,
  value          NUMERIC(12,4) NOT NULL,
  pct_change_yoy NUMERIC(8,3),
  UNIQUE (series_id, period_start)
);

-- ---------------------------------------------------------------------------
-- 4. Demand signal + first-party data (the long-term moat)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estimate_requests (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL,          -- opaque, client-generated, not a person
  service_id        TEXT NOT NULL REFERENCES services(id),
  zip               TEXT NOT NULL,
  city_id           TEXT REFERENCES cities(id),
  inputs            JSONB NOT NULL,
  estimate_low      NUMERIC(12,2) NOT NULL,
  estimate_typical  NUMERIC(12,2) NOT NULL,
  estimate_high     NUMERIC(12,2) NOT NULL,
  confidence        INTEGER NOT NULL,
  engine_version    TEXT NOT NULL,
  path              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS estimate_requests_zip ON estimate_requests(zip, created_at DESC);

CREATE TABLE IF NOT EXISTS quote_checks (
  id                  TEXT PRIMARY KEY,
  estimate_request_id TEXT REFERENCES estimate_requests(id) ON DELETE SET NULL,
  session_id          TEXT NOT NULL,
  service_id          TEXT NOT NULL REFERENCES services(id),
  zip                 TEXT NOT NULL,
  quoted_price        NUMERIC(12,2) NOT NULL,
  verdict             TEXT NOT NULL,
  delta_pct           NUMERIC(8,3) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contractor_quote_sets (
  id                  TEXT PRIMARY KEY,
  session_id          TEXT NOT NULL,
  service_id          TEXT NOT NULL REFERENCES services(id),
  zip                 TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contractor_quotes (
  id                          TEXT PRIMARY KEY,
  set_id                      TEXT NOT NULL REFERENCES contractor_quote_sets(id) ON DELETE CASCADE,
  label                       TEXT NOT NULL,
  total_price                 NUMERIC(12,2) NOT NULL,
  material_id                 TEXT REFERENCES materials(id),
  warranty_workmanship_years  INTEGER,
  warranty_material_years     INTEGER,
  scope                       JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes                       TEXT
);

-- Contractor quotes uploaded by homeowners, after AI extraction.
--
-- The uploaded document is NEVER stored - only this structured result. The file
-- carries the contractor's identity and usually the property address, and
-- keeping either would break the promise made on /privacy. Extraction is
-- likewise instructed not to return them.
CREATE TABLE IF NOT EXISTS extracted_quotes (
  id                          TEXT PRIMARY KEY,
  session_id                  TEXT NOT NULL,
  service_id                  TEXT NOT NULL REFERENCES services(id),
  zip                         TEXT,
  total_price                 NUMERIC(12,2),
  material_family             TEXT NOT NULL,
  measured_squares            NUMERIC(8,2),
  roof_area_sqft              INTEGER,
  existing_layers             INTEGER,
  stories                     INTEGER,
  -- Free text as written on the quote. Normalising it at capture time would
  -- throw away information we cannot get back; normalise on read instead.
  pitch_description           TEXT,
  document_type               TEXT,
  warranty_workmanship_years  INTEGER,
  warranty_material_years     INTEGER,
  -- Tri-state per key: included | excluded | not_stated. "Not stated" is not
  -- the same as "excluded", and collapsing them misrepresents the contractor.
  scope                       JSONB NOT NULL DEFAULT '{}'::jsonb,
  line_item_count             INTEGER NOT NULL DEFAULT 0,
  red_flag_count              INTEGER NOT NULL DEFAULT 0,
  extraction_confidence       TEXT NOT NULL,
  extractor_version           TEXT NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS extracted_quotes_zip ON extracted_quotes(zip, created_at DESC);

-- What the homeowner actually paid. Voluntary, consented, moderated.
CREATE TABLE IF NOT EXISTS actual_project_costs (
  id               TEXT PRIMARY KEY,
  service_id       TEXT NOT NULL REFERENCES services(id),
  zip              TEXT NOT NULL,
  project_month    TEXT NOT NULL,           -- 'YYYY-MM'; deliberately coarse
  amount_paid      NUMERIC(12,2) NOT NULL,
  material_id      TEXT REFERENCES materials(id),
  roof_area_sqft   INTEGER,
  inputs           JSONB NOT NULL DEFAULT '{}'::jsonb,
  quotes_received  INTEGER,
  consent_version  TEXT NOT NULL,
  status           submission_status NOT NULL DEFAULT 'pending',
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ,
  moderation_notes TEXT
);
CREATE INDEX IF NOT EXISTS actual_costs_status ON actual_project_costs(status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS leads (
  id                  TEXT PRIMARY KEY,
  estimate_request_id TEXT REFERENCES estimate_requests(id) ON DELETE SET NULL,
  service_id          TEXT NOT NULL REFERENCES services(id),
  zip                 TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  timeline            TEXT NOT NULL,
  consent_at          TIMESTAMPTZ NOT NULL,   -- explicit, timestamped consent
  status              TEXT NOT NULL DEFAULT 'new',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  event_name  TEXT NOT NULL,
  properties  JSONB NOT NULL DEFAULT '{}'::jsonb,   -- never PII
  path        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_name ON analytics_events(event_name, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Operations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id  TEXT NOT NULL,
  action     TEXT NOT NULL,
  actor      TEXT NOT NULL,
  before     JSONB,
  after      JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_record ON audit_log(table_name, record_id, created_at DESC);

-- Admin accounts. Passwords are scrypt hashes; the application never stores or
-- transmits a plaintext password, and there is no default account.
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer',  -- owner | editor | viewer
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  -- Disable rather than delete, so audit_log.actor stays resolvable.
  disabled_at   TIMESTAMPTZ,
  CHECK (role IN ('owner','editor','viewer'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  key_hash   TEXT NOT NULL UNIQUE,
  scopes     TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- 6. Operational views
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Migrations. The CREATE TABLE statements above are IF NOT EXISTS, so they are
-- no-ops against a database that already exists and new columns have to be
-- added explicitly. Each of these is idempotent and safe to re-run.
-- ---------------------------------------------------------------------------
ALTER TABLE pricing_sources    ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE pricing_sources    ADD COLUMN IF NOT EXISTS redistributable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE price_index_series ADD COLUMN IF NOT EXISTS applies_to cost_component[];

-- Where is our data going stale, and where is it missing entirely?
CREATE OR REPLACE VIEW v_data_freshness AS
SELECT s.slug                                   AS service,
       pr.geo_scope_type,
       pr.geo_scope_id,
       COUNT(*)                                 AS record_count,
       MAX(pr.effective_date)                   AS newest_effective_date,
       MIN(pr.effective_date)                   AS oldest_effective_date,
       ROUND(AVG(pr.confidence_score))          AS avg_confidence,
       BOOL_OR(pr.data_status = 'sample')       AS contains_sample_data
FROM pricing_records pr
JOIN services s ON s.id = pr.service_id
GROUP BY 1,2,3;

-- Demand vs. coverage: the queue for "which city do we add next?"
CREATE OR REPLACE VIEW v_demand_gaps AS
SELECT er.zip,
       COUNT(*)                                        AS estimate_count,
       ROUND(AVG(er.confidence))                       AS avg_confidence,
       MAX(er.created_at)                              AS last_seen,
       EXISTS (SELECT 1 FROM zip_codes z WHERE z.code = er.zip) AS zip_known
FROM estimate_requests er
GROUP BY er.zip
ORDER BY estimate_count DESC;
