# CostSignal

**Home project cost intelligence. Phase 1: roof replacement, United States.**

> Know what your project should cost before you hire a contractor.

CostSignal is not a cost guide with a calculator bolted on. It is a pricing
engine with a website in front of it. The same engine produces the homepage
example, every city page, the calculator, the quote checker, the comparison
tool and the public API — so none of them can drift from each other.

```
                          ┌──────────────────────┐
                          │   ESTIMATION ENGINE  │   lib/engine/
                          │  (pure, testable)    │
                          └──────────┬───────────┘
                                     │ reads
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
        pricing_records       pricing_factors         geo chain
        (what things cost)   (every multiplier)   zip>city>metro>state>national
              └──────────────────────┼──────────────────────┘
                                     ▼
                          ┌──────────────────────┐
                          │      DataStore       │   lib/data/
                          │  json  │  postgres   │
                          └──────────┬───────────┘
                                     ▼
        ┌────────────┬───────────────┼───────────────┬────────────┐
        ▼            ▼               ▼               ▼            ▼
   Calculator   Quote checker   Comparison      SEO pages     Public API
                                                              /api/v1/*
```

---

## Quick start

```bash
npm install
cp .env.example .env.local     # set ADMIN_PASSWORD and ADMIN_SESSION_SECRET
npm run dev                    # http://localhost:3000
```

No database required. The app boots against a JSON file store seeded from typed
TypeScript modules, and persists runtime writes to `.data/store.json`. The
admin console is fully functional against it.

```bash
npm test          # 25 engine, quote, comparison and finance tests
npm run typecheck
npm run build
```

### Running on PostgreSQL

```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/costsignal
npm run db:schema    # psql -f db/schema.sql
npm run db:seed      # loads the same seed modules, idempotent
```

`getStore()` picks the driver from `DATABASE_URL`. Nothing above the data layer
changes.

---

## ⚠️ The pricing data shipped here is SAMPLE data

Every price row carries `data_status: 'sample'`. They are internally derived
figures shipped so the product is functional and reviewable. **They are not
observed market pricing and are not attributed to any third party.**

The application does not hide this:

- a persistent notice appears on every page that shows a price
- the confidence score is **hard-capped at 60/100** while any sample price is in
  play, and states the reason
- `data_status` is `NOT NULL` in the schema, so an unlabelled number cannot
  enter the system at all

See [DATA_SOURCES.md](./DATA_SOURCES.md) for what to connect before launch.

---

## How the system works

### 1. Geometry

Roofers price per *square* (100 sq ft of roof surface). Most homeowners only
know their house size, so the engine derives the rest:

```
footprint      = house area / storeys
roof plan area = footprint × 1.08              (eaves and overhangs)
roof surface   = roof plan area × pitch factor
squares        = roof surface / 100
material qty   = squares × waste factor        (7%–20% by roof complexity)
```

The pitch factor is exact geometry — `sqrt(1 + (rise/12)²)` — not an estimate.
A 6:12 roof has 11.8% more surface than its footprint; 12:12 has 41.4% more.

### 2. Components

Materials, labour, equipment, disposal, permits and add-ons are each priced from
a derived quantity × a looked-up unit price. Labour is
`(install + tear-off + detail) hours × pitch × storeys × complexity × access`,
and tear-off hours scale with the *installed weight* of the material coming off,
so a tile tear-off costs what a tile tear-off costs.

### 3. Range construction

Adding every component's low together and every high together describes a job
where everything simultaneously came in best-case, then worst-case. Neither
exists. Component uncertainties are combined **in quadrature**
(`√Σ deviation²`), which assumes partial independence and produces a range
~35–45% narrower than the naive sum. Both are shown in the line-item table.

Contractor overhead and profit is then applied at three levels (lean, typical,
constrained market).

### 4. Geographic resolution

Every price lookup walks `zip → city → metro → state → country → global` and
stops at the first hit. The level that answered is recorded, shown to the user,
and feeds the confidence score. An unknown ZIP still gets an estimate — from
national figures, with the score reduced and the reason stated.

### 5. Confidence

Out of 100: local data coverage (32), recency (20), project detail supplied
(22), source quality (16), range tightness (10) — then capped at 60 for sample
data or 78 for modelled data. **The score is designed to be able to fall.**

---

## How the quote checker works

`POST /api/quote-check` does three things:

1. **Classifies** the quote against the modelled range — `well-below`, `below`,
   `within`, `above`, `well-above`.
2. **Explains** it. This is the differentiating part. `explainVariance()`
   re-runs the full model changing **exactly one input at a time** (roof 25%
   larger, second existing layer, steeper pitch, premium grade, difficult
   access, significant decking, system warranty…) and reports which single
   change would move the modelled range to *contain* the quote.
3. **Records** the check, so estimated-vs-quoted accuracy can be measured later.

That turns a verdict into a list of specific questions to put to the contractor.

Language rules are enforced by `tests/quote.test.ts`: the output never says a
contractor is overcharging, ripping you off, or too expensive — only that a
number is outside *our modelled range*. A quote well *below* the range is
treated as a scope risk, not a win.

### Quote comparison

Each quote is scored on stated scope, then the modelled cost of everything it
*omits* (with its share of overhead) is added back to produce an **adjusted
comparable**. In the shipped example the cheapest sticker price ($13,900)
becomes the most expensive job ($18,512 adjusted) once its missing tear-off,
disposal and permit are priced in. The cheapest quote is never labelled "best".

---

## How SEO page generation works

The URL structure is driven by the service registry, not by routing code:

```
/roofing-cost                        ← app/[serviceCost]/page.tsx
/roofing-cost/phoenix-az             ← app/[serviceCost]/[city]/page.tsx
/roofing-cost/phoenix-az/85018       ← app/[serviceCost]/[city]/[zip]/page.tsx
```

`[serviceCost]` matches `services.cost_path_slug`. Adding solar creates
`/solar-cost/...` with no routing changes.

**Two publication gates stop thin pages from ever existing:**

| Gate | Table | Meaning |
|---|---|---|
| `is_published` | `cities` | An editor has written real local content for this city |
| `page_eligible` | `zip_codes` | This ZIP has something specific to say that the city page does not |

`generateStaticParams`, the sitemap and the internal links all read the same
gates, so we can never advertise a URL that 404s. Non-eligible ZIPs still work
in the calculator — they just resolve to their city. Requesting one as a page
returns 404 by design (verified: `/roofing-cost/phoenix-az/85003` → 404).

**Current footprint: 41 indexable URLs** — 1 homepage, 9 tool/trust pages,
1 service hub, 10 city pages, 20 ZIP pages. That is deliberate. Ten cities that
say something true beats a thousand that reword a national average.

Every local page carries: a working calculator prefilled for that place, local
ranges by size and by material, hand-written local factors (code, climate,
permitting, labour market), a full cost breakdown, price history or an honest
empty state, local FAQs with `FAQPage` JSON-LD, breadcrumbs, and a freshness
date.

---

## Adding things

### Add a city

1. Insert a `cities` row (state, metro, slug like `denver-co`).
2. Insert its `zip_codes` rows.
3. Add city-scoped `pricing_records` for `labor.rate_per_hour`,
   `permit.flat_allowance`, `disposal.tipping_per_ton`.
4. Write `content`: summary, 3–6 local factors, permit notes, seasonality,
   FAQs, common materials, and optionally `representativeProjectType` (tile
   markets headline a lift-and-relay, not a new tile roof).
5. Set `is_published = true`.

Steps 1–3 make the calculator more accurate immediately. Step 5 is what creates
the page. In dev, edit `lib/data/seed/cities.ts`; in production, the admin
console at `/admin/geo` or SQL.

### Add a ZIP page

Add `content` to the `zip_codes` row and set `page_eligible = true`. If you
cannot write something the city page does not already say, do not set the flag.

### Add a service

1. Row in `services` with a `cost_path_slug` and an `engine_key`.
2. Module at `lib/engine/<key>/` implementing `ServiceEngine` — a zod input
   schema, `FormStep[]` for progressive disclosure, and an `estimate()`.
3. Register it in `lib/engine/registry.ts`.
4. Rows in `materials`, `pricing_records`, `pricing_factors`.
5. Flip `status` to `live`.

The calculator, quote checker, comparison tool and cost pages are all driven by
the engine's declared steps and the registry — none of them need editing.

### Add or update pricing data

Admin console → **Pricing and factors**. Every edit writes a before/after
`audit_log` row and takes effect immediately across the site and the API.
Always update `effective_date` and `data_status` when you change a number, or
the freshness badge and confidence score will lie.

Bulk ingestion belongs in an `ingest_runs`-driven job writing `pricing_records`
with full provenance — the schema is ready for it; the jobs are not written.

---

## Project layout

```
app/                    Next.js App Router
  [serviceCost]/…       programmatic cost pages (hub → city → ZIP)
  admin/                console + server actions
  api/                  estimate, quote-check, quote-compare, events,
                        submissions, leads, geo, v1 (partner API)
components/             ui kit, calculator, quote tools, estimate views, charts
lib/
  engine/               the cost model — pure, framework-free, unit tested
    roofing/            schema.ts (inputs + form steps), model.ts, explain.ts
    geo.ts confidence.ts quote.ts finance.ts registry.ts context.ts
  data/                 DataStore interface, json-store, postgres-store, seed/
  types.ts              domain types, 1:1 with db/schema.sql
db/schema.sql           canonical PostgreSQL schema (commented)
scripts/seed-postgres.ts
tests/                  vitest
```

---

## Database design

Full DDL with commentary in [`db/schema.sql`](./db/schema.sql). The five ideas
it encodes:

1. **Geography is a chain, not a flat table.** Pricing attaches at any level via
   `(geo_scope_type, geo_scope_id)`; the engine walks it. Adding a city is a
   data operation.
2. **Nothing multiplicative is hardcoded.** Every base price is a
   `pricing_records` row; every multiplier is a `pricing_factors` row. Retuning
   the model is an admin edit, not a deploy.
3. **Provenance is mandatory.** Source, licence note, effective date, collected
   date, methodology, confidence and `data_status NOT NULL` on every price.
4. **Internationalisation is structural.** Currency, unit system and locale live
   on `countries`; every money column is paired with a currency. `CA` and `GB`
   rows already exist, inactive, to keep the model honest.
5. **Estimated, quoted and actually-paid are stored separately** —
   `estimate_requests`, `quote_checks` / `contractor_quotes`,
   `actual_project_costs` — so model accuracy can be measured and published.

Two operational views ship with it: `v_data_freshness` (where data is going
stale) and `v_demand_gaps` (which ZIP to add next).

---

## What is NOT done before production

Honest list. None of it is hidden behind a "coming soon".

| Area | Status |
|---|---|
| **Pricing data** | All sample. This is the blocker; everything else is secondary. |
| **Auth** | Admin is a single shared password + HMAC cookie. Needs real accounts and roles. The audit log already records an `actor`, so the swap is contained. |
| **Rate limiting** | None on any API route. Add before public exposure. |
| **Ingestion jobs** | The schema and provenance model are ready; no scheduled ingestion exists. |
| **Email / notifications** | Submissions and interest registrations are stored, nothing is sent. |
| **Contractor network** | Does not exist, and `/hire` says so plainly rather than collecting leads under false pretences. |
| **Price history** | One clearly-labelled sample series. Cities without a series render an honest empty state rather than an invented trend. |
| **Analytics** | First-party, allow-listed events into our own store. No third-party analytics wired. |
| **Accessibility** | Semantic HTML, labelled controls, visible focus rings, `prefers-reduced-motion`, ARIA on charts. Not yet audited with a screen reader. |
| **Legal pages** | Privacy policy and terms are not written. Required before collecting submissions in production. |
| **API keys** | `/api/v1/*` reads keys from an env var. The `api_keys` table exists but is not wired. |

---

## Commercial model

Architecturally supported, deliberately not switched on: contractor leads,
contractor subscriptions, premium reports, partner API access, affiliate and
financing relationships, and clearly-labelled sponsorship.

The commitment that keeps it honest, and which the code reflects today: the
estimate and the quote checker never change output based on who is paying,
sponsored placement is labelled, no fake partnerships or invented contractor
data, and model accuracy gets published — including when it is unflattering.
