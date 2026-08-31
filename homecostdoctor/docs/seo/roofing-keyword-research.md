# Keyword research log

Captured evidence for what we build pages about. Nothing goes in here from
intuition — only from a tool, with the date and source named, so that a page
built on a number can be traced back to the number.

---

## asphalt shingle replacement — Semrush, US, desktop, 2026-08-31

| | |
|---|---|
| Volume (US) | 140/mo |
| Global volume | 170/mo |
| Keyword Difficulty | **20% (Easy)** |
| CPC | **$26.83** |
| Competitive density | 0.21 |
| Intent | Informational + Commercial |
| SERP results | 162 |

**The head term is not the story.** The variation set is:

| | |
|---|---|
| Keyword variations | **698**, totalling **10,000/mo** |
| Question keywords | **66**, totalling **510/mo** |

### Top variations

| Keyword | Volume | KD |
|---|---:|---:|
| asphalt shingle roof replacement | **1,000** | **16** |
| asphalt shingle roofing replacement new jersey | **880** | **7** |
| cost of replacing asphalt shingle roof | 590 | 44 |
| cost to replace asphalt shingle roof | 590 | 24 |
| price to replace asphalt shingle roof | 590 | 42 |

### Questions

| Keyword | Volume | KD |
|---|---:|---:|
| how much does it cost to replace asphalt shingle roof | 110 | 30 |
| when to replace asphalt shingle roof | 40 | 27 |
| how to replace asphalt shingles | 30 | 37 |
| when to replace asphalt shingles | 30 | 25 |
| how much does it cost to replace asphalt shingles | 20 | n/a |

### SERP, positions 1–10

1. roofingcalculator.com — **a calculator ranks #1**
2. iko.com (manufacturer)
3. homeadvisor.com
4. getproedge.com
5. nerdwallet.com
6. phoenixroofingandrepair.com (local contractor)
7. homewyse.com
8. ourroofbear.com
9. facebook.com (a group post)
10. roofworxca.com (local contractor)

Also present: video carousel, People Also Ask (2), discussions and forums (3),
local pack (3).

### Read

- A **specialised calculator already outranks HomeAdvisor and NerdWallet** for
  this term. Google is willing to rank a tool here. That is the single most
  encouraging fact on this page.
- Local contractors hold two of the top ten. Those positions are winnable with
  genuinely local content in a way that a national publisher's page is not.
- $26.83 CPC with KD 20 is an unusual combination — high commercial value,
  low ranking difficulty. That gap is the opportunity.
- 698 variations at 10K volume, for **one material within one project type**,
  is the argument against treating roofing as "too small a niche".

### Caveats

- **The New Jersey keyword needs verifying before anything is built on it.**
  880/mo at KD 7 for a state-qualified roofing term is anomalous — high volume
  and near-zero difficulty rarely coexist. Check the live SERP before trusting
  it. Semrush KD is a model, not an observation.
- ~~**We do not cover New Jersey.**~~ **Resolved 2026-08-31 (pricing only).**
  Three Northeast metros were added as data preparation: New York–Newark–Jersey
  City (35620), Philadelphia–Camden–Wilmington (37980) and Boston–Cambridge–
  Newton (14460), all with real BLS OEWS wages. A Newark or Boston ZIP now
  resolves to metro-level labour instead of the national fallback.

  **No Northeast page is published.** Those cities are `isPublished: false` and
  their ZIPs `pageEligible: false`, so the calculator serves them while the
  sitemap and every route still 404. Publishing waits on two things: verifying
  the keyword below, and writing the local editorial (freeze–thaw and ice
  damming, ice-and-water-shield code requirements, steep-slope and slate
  prevalence, permit authority per city).

  Wages are far apart, which is the whole reason the fallback was wrong:
  burdened median $66.11/hr in the New York metro against $40.87 in Phoenix.

  One known weakness: no state-specific labour-burden factor exists for NY, NJ,
  PA or MA, so those three metros use the national default of 1.80. Roofing
  workers' compensation rates in NY and NJ are among the highest in the country,
  so 1.80 is more likely an understatement than an overstatement there. Each
  record's methodology string names the factor it used.
- Volume figures are Semrush estimates, not Google-reported data.

---

## To research next

Run the same exercise and record it here before deciding what to build:

- metal roof replacement / metal roof cost
- roof repair (distinct intent from replacement — cheaper job, different buyer)
- roof replacement cost + `{city}` for the ten metros we actually cover
- tile underlayment / lift and relay (the representative Phoenix job)
- "is my roofing quote too high" and quote-checking intent generally — this is
  our differentiated product and we have no volume data for it at all

---

## Live SERP evidence — retrieved 2026-08-31

Real Google results, not tool estimates. Recorded because SERP composition
decides difficulty far more reliably than a KD score does.

### "roof replacement cost calculator"

This Old House, Inch Calculator, Modernize, RealCostIQ, RoofPitch,
RoofingCostCalculator.com, Roof Maxx, CostFlowAI. Homewyse and
RoofingCalculator.com did not appear in this result set.

Contested but not closed. This Old House and Modernize are strong domains; the
rest are ordinary. Entering here on "better calculator" positioning alone is a
hard fight for a new domain.

### "is my roofing quote too high" / quote-checking intent

**A direct competitor exists: roofcostdata.com.**

- `/roof-quote-checker` — "Roof Quote Checker (2026) | Review a Roof Replacement Quote"
- `/roof-quote-checklist`
- `/roofing-estimate`
- `/roofing-cost/tx/dallas`, `/roofing-cost/co/denver` — programmatic city pages,
  structurally near-identical to our `/roofing-cost/dallas-tx`

Their framing closely matches ours: scope gaps, decking allowance, permits,
flashing, ventilation, warranty, tear-off, and "the risk is not a high price,
it is a high price with unclear scope."

The rest of that SERP is contractor marketing blogs (roof-crafters, equityroofs,
stronghouse, valorhome, roofsbyrhino) — thin, no tool. That gap is the opening:
everyone is *writing about* quote comparison, almost nobody is *doing* it.

**Not yet verified** — the domain is blocked by this environment's egress proxy,
so whether they gate on email, accept PDF uploads, or use real local pricing is
unknown. Checking that is the highest-value hour of competitive research
available right now.

---

## Market size by state — BLS OEWS May 2025, SOC 47-2181

Roofer employment is a direct measure of how much roofing work a market absorbs,
and a far better expansion signal than population.

| State | Roofers | Largest metro | Median wage | Covered |
|---|---:|---|---:|---|
| FL | 21,940 | Miami-Fort Lauderdale | $23.09 | yes (3) |
| CA | 20,210 | Los Angeles-Long Beach | $30.56 | yes (2) |
| NY | 5,370 | New York-Newark-Jersey City | $36.73 | yes |
| TX | 4,840 | Dallas-Fort Worth | $22.59 | yes (3) |
| IL | 4,640 | Chicago-Naperville-Elgin | $39.47 | **no** |
| OH | 3,790 | Cleveland | $26.77 | no |
| PA | 3,650 | Philadelphia-Camden | $28.72 | yes |
| AZ | 3,180 | Phoenix-Mesa-Chandler | $22.96 | yes |
| MI | 2,470 | Detroit-Warren-Dearborn | $30.48 | **no** |
| NV | 2,010 | Las Vegas-Henderson | $23.94 | yes |
| MA | 1,790 | Boston-Cambridge-Newton | $31.90 | yes |
| CT | 660 | Hartford-West Hartford | $31.59 | no |
| NJ | 230* | Trenton-Princeton | $39.47 | yes |

**\*The New Jersey figure is an artefact — do not act on it literally.** NJ
roofing labour is counted under the New York-Newark-Jersey City and
Philadelphia-Camden-Wilmington metros, which BLS attributes to NY and PA. Only
Trenton and Atlantic City are NJ-primary. Read naively this row says abandon our
strongest geographic keyword; it actually says we already cover New Jersey,
through both metros.

**Caveat:** OEWS excludes the self-employed, a large share of roofing. Every
count is a floor, and cross-state ratios may be distorted where self-employment
rates differ.

### Expansion order this supports

1. **Publish the three Northeast metros already ingested** — pricing is live,
   only local editorial is missing.
2. **Chicago** — 3,900 roofers at the highest median wage of any large metro on
   the list, and no coverage. High wage means high ticket means more valuable
   lead. One BLS re-run away.
3. **Detroit** — 1,450 in a single concentrated metro.

Ohio is a trap despite its total: 3,790 roofers fragmented across metros, with
Cleveland at only 780, so no single city page reaches much of the market.
Connecticut is simply small.

---

## Not researched, and why

- **Semrush volume/KD/CPC for 15 of the 16 seed keywords** — no Semrush account.
  Fabricating these would be worse than leaving them blank, because pages would
  get built on them.
- **Reddit homeowner questions** — reddit.com blocks this crawler. Semrush's
  Questions filter is a better source anyway: real search language *with volumes
  attached*. Longer term, `lib/engine/questions.ts` generates this from real
  uploaded quotes, which is better than either.
- **Google Trends seasonality curves** — no access. Month-by-month roofing
  seasonality claims from anyone without the tool are invented.

---

## Page selection rules

Policy, not data. These are what stop 780 possible URLs becoming 700 thin ones.
R1–R3 are already enforced in code via `cities.is_published` and
`zip_codes.page_eligible`.

| # | Rule |
|---|---|
| **R1** | A city page requires hand-written local editorial. If it could be templated from the city name, it does not ship. |
| **R2** | A city page requires metro-level pricing. National fallback wearing a city name is the definition of thin. |
| **R3** | A ZIP page requires something the city page does not already say. |
| **R4** | A size page requires the calculation to change materially. 2,000 and 2,100 sq ft are the same page. |
| **R5** | A material page requires its own cost structure. Tile lift-and-relay differs from asphalt tear-off; two shingle brands do not. |
| **R6** | No page without demonstrated demand — a Semrush volume or a Search Console impression. |
| **R7** | Every page states its own confidence. This is what lets us publish before certainty without lying. |
| **R8** | **Build the cluster, not the keyword.** |

### R8, because it is the one most easily got wrong

A keyword with 10 searches and KD 1% is not a page. It is a *section* of a page
that serves a cluster.

Worked example. These all belong to one tool:

- roofing underlayment cost
- synthetic underlayment cost
- roofing felt cost — **40/mo, KD 1%**
- felt paper cost
- underlayment cost per square foot
- underlayment cost for a 1,500 / 2,000 / 2,500 sq ft roof

Wrong: `/cost-of-roofing-felt-paper`, a page for 40 searches a month.
Right: `/roofing-underlayment-cost`, one calculator absorbing the whole cluster.

The test is not *"can I rank for this keyword?"* but **"what larger topic does
this keyword belong to, and how much of that topic can one excellent tool
capture?"** That is the difference between a keyword site and an SEO product.

Low KD is never a reason on its own. It is a tie-breaker between pages that
already passed R6 and R8.

---

## Homewyse — the scale competitor

Reported at roughly **487K visits/month**, ~98.8% US, with Google organic about
48.9% of traffic, and **1,000+ material cost calculators**. *(Figures relayed
from a Semrush profile; not independently verified here.)*

Their per-page architecture is a genuine reference: ZIP, surface area, material
grade, labour and roof layout in, a range out, described as a vendor-neutral
estimate customised by location and options. That is close to what we do.

**Three things to take, one to refuse.**

Take: the cluster architecture, the calculator input model, and the proof that
this page type sustains real traffic at scale.

Refuse: **the page count.** Their 1,000+ pages are inventory, not a ranking
report — the existence of a page says nothing about whether it ranks. Copying
the count rather than the method is how you end up with hundreds of pages Google
treats as templated filler.

**Where we can be better:** Homewyse answers *"what should this project cost?"*
We can answer *"what should YOUR roof cost, and is the quote you were handed
reasonable?"* The second question is the product; the first is table stakes.

### Two corrections to the material list under consideration

- **TPO and EPDM are commercial roofing.** The searcher is a building owner or
  contractor, not a homeowner with a quote. Wrong buyer, wrong engine, no lead
  value in our funnel. Excluded in the roadmap.
- **Cedar shake, clay tile and slate are cluster members, not launch pages**, at
  10–30 searches/month each on the data we have. Including them in a first-20
  list contradicts the very trap we are trying to avoid.

---

## Working order

Research → pick 20–50 → build those properly → measure Search Console →
scale only the patterns that show impressions.

No page generation at volume before Search Console has something to say. The
roadmap in `seo-page-roadmap.csv` holds the current selection, with the tiers
and the explicit do-not-build list.

---

## Keyword clustering — 254 keywords into 30 pages

Full mapping in `seo-page-roadmap.csv`. The master list was ~200 keywords across
10 tiers; clustering under rule R8 collapses them into 30 pages plus 8 explicit
do-not-builds.

### Source quality of the relayed volumes

The volumes in that master list come from SEO agency blog posts — LYNX SEO,
skillmammoth, roofingseo.services, AIBuildCalc — not from Semrush directly. The
list itself notes `roof replacement cost` ranging from **12K to 67K/month**
depending on the database. A 5× spread is not a measurement.

Every relayed figure in the CSV is suffixed `*`. Treat them as directional
ordering, never as inputs to a revenue model. **The semantic groupings are the
valuable part** and they hold regardless of whose number is right.

### The finding that reorders everything

**All five `verified` rows in our entire dataset are pitch geometry.**

```
pitch.flat.area          1.000
pitch.low.area           1.054   sqrt(1 + (3.5/12)^2)
pitch.moderate.area      1.118   sqrt(1 + (6/12)^2)
pitch.steep.area         1.250   sqrt(1 + (9/12)^2)
pitch.very-steep.area    1.414
```

Exact mathematics, not estimates. Everything else in the dataset is `modeled`
or `sample`.

This means the **geometry cluster is the only part of the site our data gap does
not touch**: roof area, roof squares, pitch, shingle bundles. Zero pricing data
required, 100% confidence, shippable today — while every cost page is gated on
materials being 60–70% invented.

That is a different and better reason to build them than search volume, and it
promotes four geometry tools into Tier 1:

| Page | Why it ships now |
|---|---|
| `/roof-calculator` | Hub. Area, squares, pitch, bundles. Verified data |
| `/roofing-square-calculator` | The unit the trade quotes in; homeowners don't know it |
| `/roof-pitch-calculator` | Pure geometry |
| `/roof-shingle-calculator` | Quantities exact; price-out carries the confidence badge |

They also feed the cost calculator naturally: someone who just learned their
roof is 24 squares is one click from what 24 squares should cost.

**Second finding:** `/roofing-labor-cost` is the one *cost* page we can defend
today — backed by real BLS OEWS wages across 13 metros. No competitor found
publishes sourced local labour rates.

### Deliberately not Tier 1

`/roof-replacement-cost` and `/roof-cost-calculator` are the head terms and the
money, and they are Tier 2. The live SERP holds This Old House and Modernize,
and our materials are still sample. Entering the most contested term in the
vertical with our weakest data is the losing fight. Win the flanks — geometry,
quote-checking, labour — while materials get fixed.

### One correction to earlier advice

I previously said do not build TPO or EPDM because they are commercial roofing.
**Half right.** Those named-membrane searches do skew commercial, but
residential low-slope roofing is real — Phoenix foam, row houses, patio sections
— and our catalog already carries `tpo-membrane`, `modified-bitumen` and
`spf-foam`. The correct call is **one homeowner-framed `/flat-roof-cost` page**
absorbing all four membranes, not separate TPO and EPDM pages.

### What the do-not-build list now covers

- `/cost-of-roofing-felt-paper` — 40/mo, KD 1%. Cluster member. R8.
- Separate TPO and EPDM pages — merge into flat roof.
- 11 individual size pages — R4. Use the size hub with a selector.
- 50 state pages — R1+R2. We have 13 metros, not 50 states; 37 would be
  national fallback wearing a state name.
- 14 question keywords as standalone pages — they are H2s and FAQ blocks inside
  the cost pages. Separate pages would cannibalise them.
- Ohio and Connecticut metros — fragmented and small on the BLS evidence.
- `best-roofing-contractor-{city}` — no vetted network exists.
- Any second vertical.

### Insurance and storm — the one I keep saying wait to

Highest lead value in the master list, and still Tier 3. These are *insurance*
questions — "is my adjuster's scope fair?" — not retail cost questions. Our
engine models retail replacement. Ranking for them and then answering a
different question than the one asked is how a page earns a high bounce rate and
loses the ranking anyway. Build the adjuster-scope comparison first; the page
follows the tool, not the reverse.

---

## Seasonal SEO — the honest version

**The tactic to avoid:** restamping an unchanged page with today's date, or
putting the current month in a title that says the same thing all year. Search
engines discount `lastmod` they cannot trust, and a site that publishes its own
confidence scores cannot also fake its freshness dates.

**What was actually wrong:** `app/sitemap.ts` set `lastModified: new Date()` on
every URL. Every deploy — including one that only touched CSS — told Google all
43 pages had changed. That is the unreliable-lastmod pattern, and it was already
live.

**The fix, in the only order that makes the date true: content moves first, the
date follows.**

`lib/seasonality.ts` gives each metro a real seasonal profile — installation
window, peak demand, softest pricing, storm season — and renders guidance for
the *current month*. The page genuinely says something different in September
than in February, so a monthly `lastmod` is a fact rather than a claim.

Sitemap dates now derive from two real signals: `SEED_COLLECTED_DATE` (when the
pricing behind every estimate was collected) and the first of the current month
(when the seasonal guidance last changed). Nothing derives from build time.

### Why regional profiles rather than one national calendar

| Metro group | Install window | Peak | Storm season |
|---|---|---|---|
| Phoenix, Las Vegas | Oct–Apr | Oct–Nov, Feb–Apr | Monsoon, Jul–Sep |
| Dallas, Houston, Austin | year-round | Mar–Jun | Hail, Mar–Jun |
| Miami, Tampa, Orlando | year-round | Mar–May, Sep–Oct | Hurricane, Jun–Nov |
| Los Angeles, San Diego | year-round | Apr–Aug | — |
| NY/Newark, Philadelphia, Boston | Apr–Oct | Jun–Sep | Ice damming, Dec–Mar |

Phoenix and Boston are near-exact inverses. In July, Phoenix is *outside* its
comfortable window and Boston is at peak. Any single national "spring is roofing
season" line is wrong for most of the country, and writing one under a specific
city name is precisely the templated local page rule R1 exists to prevent.

Profiles fall back metro → state → continental default, the same chain the
pricing lookup uses.

### Where the month should and should not appear

- **In the page content:** yes. It changes, it is useful, it is true.
- **In `lastmod`:** yes, now that the content behind it moves.
- **In the `<title>`:** no. A title rewritten twelve times a year destabilises
  CTR history for no ranking gain. The year is already there via
  `getFullYear()`; that is enough.

### Still not built: storm-event pages

The seasonal *guidance* covers storm seasons. Storm *keywords* — hail damage,
roof insurance claim — remain Tier 3 for the reason given above: they are
insurance questions, and our engine models retail replacement cost.
