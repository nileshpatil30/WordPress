# Data strategy

The data problem is harder than the coding problem. A React calculator that
multiplies `area × cost per square` is a weekend. Being able to say *"a 2,000
sq ft asphalt roof replacement in Phoenix typically costs X–Y in August 2026"*
and defend it is the actual business.

Everything shipped today is **sample data**. This document is the plan for
replacing it, in the order the work should happen.

---

## Layer A — Government and official statistics

Free, legally usable, and the right foundation for the *structure* of the model
even though none of it gives you a roof price directly.

| Source | Use | Notes |
|---|---|---|
| **BLS Occupational Employment and Wage Statistics** | Metro-level roofer wages (SOC 47-2181) → the labour index | Replaces our modelled per-city labour rate with something defensible. Highest value per hour of work. |
| **BLS Producer Price Index** | Roofing material cost trend → the price history series | The honest source for the "+6.8% vs last year" claim we currently refuse to make. |
| **US Census Building Permits Survey** | Construction activity per metro as a demand proxy | Useful for seasonality and for prioritising which cities to add. |
| **Municipal permit fee schedules** | Actual permit fees per jurisdiction | Published, exact, and knowable. Our permit allowance is currently the weakest number in the model, and this fixes it outright. |

US federal government works are generally in the public domain. Municipal
schedules are published but change on their own revision cycles — record the
retrieval date and re-check.

---

## Layer B — Open data

| Source | Use | Licence reality |
|---|---|---|
| **OpenStreetMap** | Building footprints → pre-fill roof area from an address | ODbL. Commercial use permitted **with attribution**, and share-alike obligations attach to derivative *databases*. Get legal review before publishing anything derived. |
| Open municipal permit portals | Real re-roof permit values by address | Coverage is patchy and per-city, but where it exists it is close to ground truth. |

Pre-filling roof area from a footprint would be the single biggest UX
improvement available: roof area is the largest driver of price and the input
users are least able to supply.

---

## Layer C — Publicly available market information

Retail material prices and publicly posted service prices, **assessed
individually** before any automated collection: that site's terms, its robots
rules, copyright and database rights, and the law in the relevant jurisdiction.
Checked before collecting, not after.

Build an ingestion framework, not a scraper. One connector per source, each
writing `pricing_records` with full provenance, each independently disableable.

---

## Layer D — First-party data (the moat)

What a homeowner actually paid. Nobody else can copy it, and it is the only
thing that lets us measure our own accuracy.

Already implemented end to end (`/contribute` → `actual_project_costs` →
`/admin/submissions`):

- no name, email, address or contractor name is *collected at all* — the form
  has no such fields, so they cannot be captured by accident
- dates stored to the **month**, never the day (a precise date plus a ZIP starts
  to identify a property)
- explicit consent with a stored `consent_version`
- every row lands `pending` and is useless until a human approves it
- rejections are retained, so moderation is itself auditable

`estimate_requests`, `quote_checks` and `actual_project_costs` are separate
tables **on purpose**: estimated, quoted and paid are three different numbers,
and keeping them apart is what makes it possible to publish how wrong the model
has been.

---

## Layer E — Partnerships

Contractor-submitted material, labour and project pricing, under agreement, in
exchange for exposure. Carries obvious selection bias — weight it accordingly
(`pricing_sources.reliability_weight` exists for this) and never let it be the
sole source for a market.

---

## What we will not do

**We will not build the business on scraping commercial cost databases.**
Products like RSMeans exist because good localised cost data is expensive to
produce. Scraping one to build a free competitor creates copyright,
database-right and contract exposure, and produces a dataset we could never
defend. If we want that data, we license it — `pricing_sources` already has a
`licensed` type and a placeholder row recording exactly that.

---

## Order of work

1. **Municipal permit schedules** for the ten launch cities. Exact, free,
   removes the weakest number in the model.
2. **BLS OEWS metro wages** → replaces the modelled labour index. This is the
   largest single input to the price.
3. **Material pricing** from distributor or manufacturer published pricing under
   an agreement.
4. **BLS PPI** → turns on the price history section honestly.
5. **First-party submissions** accumulate in the background from day one.
6. **OpenStreetMap footprints** → roof-area pre-fill, after legal review.

Each of these raises the confidence cap for real. Until step 1 lands, every
estimate on the site is correctly capped at 60/100 and says why.
