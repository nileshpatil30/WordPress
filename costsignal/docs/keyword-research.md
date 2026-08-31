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
