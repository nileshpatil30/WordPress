# Where roofing material prices can legitimately come from

**Research report. No code changes.**
Question asked: how do we get reliable roofing *material* pricing for a commercial
cost-estimation product without depending on an expensive RSMeans licence?

The answer is not "buy RSMeans". It is not "don't buy RSMeans" either. It is that
RSMeans sells three separable things bundled together, and two of the three are
available free, in the public domain, and are already legal to redistribute.

---

## 0. The argument in one page

A material price has three components, and they have completely different
acquisition costs:

| Component | What it is | Where it comes from | Cost |
|---|---|---|---|
| **Level** | "Architectural shingles are $X a square" | First-party trade quotes, retail feeds | Effort, not money |
| **Escalation** | "$X was true in June, it is $X×1.06 now" | BLS PPI, manufacturer price letters | **Free, public domain** |
| **Geographic spread** | "$X in Dallas is $X×1.07 in Boston" | Freight + tax model, public bid tabs | **Free, public domain** |

A licensed cost database sells all three as one product. We only ever have to
buy the first one, and "buy" mostly means *phone calls*, not money.

Two facts make this workable, and both are specific to roofing:

**Material prices disperse far less than labour.** A bundle of GAF Timberline is
the same physical object in Newark and in Phoenix. What differs is freight, sales
tax, and the distributor's margin — a spread of maybe 10–15%. Installed labour
across those same two markets differs by 60%+. Our own dataset already shows
this: `labor.burden_multiplier` ranges 1.68–1.95 by state and `overhead.typical`
is 1.32, while material geography is a rounding error next to it. **Money spent
buying precision in materials is money spent on the low-variance input.**

**Roofing material prices move in visible, announced steps.** Manufacturers do
not quietly drift; they send dated price-increase letters, and roofing
distributors publish those letters on the open web as a courtesy to their
contractors. April 2026: 4–8%. June 2026: another 6–10%.
([Mid-Atlantic Roofing Supply](https://www.marsupply.com/resources/price-increase-announcements/),
[Carolina Atlantic](https://www.carolinaatlantic.com/resources/price-increase-announcements/),
[Cameron Ashley](https://www.cameronashleybp.com/pricenotices))
That is a free, dated, citable, roofing-specific escalation series that a general
construction cost database does not even give you.

So: **anchor once, escalate free.** Everything below is detail on how.

---

## Category key

Every source below is labelled with both the user's four categories and a cost tag.

- **(1) REUSABLE** — we can put this in our product as our own data
- **(2) BENCHMARK** — we can compare against it and cite it, never republish it
- **(3) LICENCE** — needs a commercial licence before any use
- **(4) NO** — should not be collected at all

Cost tags: **FREE** · **PAID** · **LICENCE REQUIRED** · **BENCHMARK ONLY** ·
**NOT APPROPRIATE FOR COMMERCIAL REUSE**

---

## 1. Professional cost databases

**RSMeans (Gordian).** Core $396/yr, Complete $1,019/yr, Complete Plus $5,973/yr
([Capterra listing](https://www.capterra.com/p/151681/RSMeans/pricing/)); the
2026 Residential Costs book is a separate, cheaper product
([rsmeans.com](https://www.rsmeans.com/2026-residential-costs-book)).

The price is not the blocker. **The licence is.** RSMeans is licensed for use *in
producing estimates*, not for redistribution as a dataset and not as the
underlying price table of a public-facing calculator. Buying the $396 tier and
publishing its numbers on homecostdoctor.com would be a licence breach, not a
bargain. Even at $5,973 the answer does not change.

What it *is* good for: **a private validation harness.** One seat, used offline,
to answer "is our modelled number within 15% of the industry-standard number?"
That is a legitimate use of a licensed product and it never touches a published page.

**Craftsman National Construction Estimator**, **BNi Building News** — same
structure, lower price, same redistribution problem.

**Xactimate (Verisk).** Worth naming because in roofing it matters more than
RSMeans: it is what insurance adjusters price storm claims with, so in
hail-belt markets it is the *de facto* price authority. Licensed to
contractors and adjusters, price lists not redistributable, and the pricing tiers
are aimed at firms doing claims work.

> **Verdict: (3) LICENCE REQUIRED.** Do not build on it. A single Core seat as a
> private accuracy check is defensible later, and is a Phase 3 nice-to-have, not
> a dependency. **This is the recommendation the user explicitly did not want, and
> it is correctly not the recommendation.**

---

## 2. Manufacturers

GAF, Owens Corning, CertainTeed, TAMKO, Malarkey, IKO, Atlas. They sell through
distribution and **publish no prices** — asking them for a price list gets you
routed to a distributor.

Two things they *do* publish, both free and both useful:

**(a) Price-increase letters.** Dated, percentage-specific, product-line-specific.
Manufacturers send them to distribution; distributors post them publicly.
Verified rounds: 5–7% effective Aug–Sep 2025; 4–8% effective April 2026 (GAF Apr 15,
Owens Corning Apr 1, CertainTeed Apr 15); 6–10% effective June 2026.
Sources: [Mid-Atlantic Roofing Supply](https://www.marsupply.com/resources/price-increase-announcements/),
[Carolina Atlantic Roofing Supply](https://www.carolinaatlantic.com/resources/price-increase-announcements/),
[Cameron Ashley](https://www.cameronashleybp.com/pricenotices),
[Mueller Roofing Distributors](https://mueller1875.com/vendor-news/).

This is the single most underrated free source in this report. It is
roofing-specific, it leads the BLS series by a month or two, and it is a *fact
about an announcement* — citing "GAF announced 6–10% effective 1 June 2026" is
reporting, not redistribution of a price database.

Caveat worth stating in the methodology: an announced increase is a list-price
increase. Realisation is typically lower — distributors absorb some, and
competitive markets absorb more. Treat an announced 8% as an upper bound on
realised escalation and reconcile it against BLS PPI (§6), which measures what
was actually transacted.

**(b) Specification data.** Bundles per square, coverage, exposure, weight,
nailing pattern, warranty tier. Published, factual, and it is what our
`shingleQuantities()` geometry already encodes. Free and safe.

> **Verdict: (1) REUSABLE — FREE**, for escalation and specifications.
> Levels are not available here at all.

---

## 3. Distributors

ABC Supply, Beacon (Beacon PRO+), SRS, Cameron Ashley, L&W Supply, Allied.
**This is where the real number lives** — the contractor's actual cost — and it is
the hardest to reach, because pricing is account-specific and login-gated.

**Do not** create contractor accounts, scrape logged-in catalogues, or bypass the
gate. That is squarely in category (4), and it is also the thing that would make
the whole dataset unusable if discovered.

**Do** the legitimate version, which works better than it sounds:

- **Call and ask, as a business.** "I run a roofing cost information site; can you
  give me a current per-square price on Timberline HDZ for a 30-square residential
  tear-off in this ZIP?" Branch managers answer this. It takes an afternoon to
  collect 10–15 markets. These are `channel: "trade"` observations, they pass
  through our ingester unconverted, and they land at `confidenceScore: 80` — the
  highest-quality material data we can get.
- **Public cash-sale price lists.** Some branches publish walk-in pricing. Public,
  free, citable.

**Publicly disclosed distributor financials.** Beacon and SRS have been public
companies filing 10-Ks and running earnings calls, where they discuss average
selling price, price/volume mix and gross margin. That is a free, audited,
citable, industry-wide statement about *price movement* — an excellent
cross-check on §2's announced increases and §6's index. It gives you no levels,
but it tells you whether an announced 8% actually stuck.

> **Verdict: (1) REUSABLE — FREE** via direct quotes and public filings.
> **(4) NO** for anything behind a contractor login.

---

## 4. Retail

Home Depot, Lowe's, Menards. Homeowner-channel pricing, published openly.

The important finding here is that **we do not have to scrape any of it.**

**Home Depot runs an affiliate programme through Impact, free to join, and it
includes a daily product data feed** ([Home Depot affiliate FAQs](https://www.homedepot.com/c/SF_MS_Affiliate_Program_FAQs)).
Lowe's runs an equivalent. That converts the entire question from "is scraping
allowed" (it is not) to "we have a permissioned data feed" — with the merchant's
own terms defining what we may do with it.

Read those terms before building on them. Affiliate feeds are granted for
*promoting the merchant*. A calculator that shows a material cost and links to the
product sits comfortably inside that. Publishing a redistributable price database
built from the feed does not. The safe design is the one we already built:
**ingest the feed, apply the trade discount, publish our derived contractor cost
with the source cited — never republish the feed itself.**

And retail must be converted, which is the whole reason `lib/ingest/materials.ts`
exists. Shelf price is the homeowner channel. Feeding it in raw produces estimates
that are too **high** — the mirror image of the error Homewyse is known for, and
just as useless. `material.trade_discount` (0.78, national, editable in
`pricing_factors`) is the documented conversion, and it is named in the
methodology string of every row it touches.

> **Verdict: (1) REUSABLE — FREE, via the affiliate feed, subject to its terms.**
> Scraping the storefront: **(4) NO.**

---

## 5. Government and institutional procurement

The most underused legitimate source of **real installed prices** in this entire
report, because it is public record by law.

**State facility bid tabulations.** Louisiana's Division of Administration
publishes roof-replacement and roof-preservation bid tabs as open PDFs, with every
bidder's number ([example](https://doa.la.gov/media/gdtje05j/ua-bid-tab-f-01004679-roof-replace-iss.pdf),
[example](https://doa.la.gov/media/libjtamb/bid-tab-01-107-15-04-f-01003980-roof-preservation-sections-a-g-ghosep-lps-hq.pdf)).
Most states do the same.

**School districts.** Saint Paul Public Schools maintains a
[bid tabulation archive](https://www.spps.org/about/departments/business-financial-affairs/purchasing-services/opportunities/bid-tabulations-archive);
Montgomery County (MD) Public Schools publishes
[bid results](https://www.montgomeryschoolsmd.org/departments/facilities/construction/bid-results);
Volusia County Schools publishes
[bid documents](https://www.vcsedu.org/directory/departments/operation-services/facilities-services/design-construction/bid-documents).
Districts reroof constantly and the numbers are public.

**State DOT bid item price data** — [Texas Open Data Portal](https://data.texas.gov/dataset/Bid-Tabulations/de7b-7dna),
[Oregon ODOT average bid item prices](https://www.oregon.gov/odot/business/pages/average_bid_item_prices.aspx),
[WSDOT bid tabulations](https://wsdot.wa.gov/business-wsdot/contracts/about-public-works-contracts/public-works-contract-history/bid-tabulations).
Excellent data, wrong trade — DOT work is paving and bridges, roofing line items
are rare.

**USASpending API** — [api.usaspending.gov](https://api.usaspending.gov/), free,
no authentication, CORS-open, filterable to NAICS 238160 (roofing contractors).
Gives award totals and locations, rarely unit prices. Useful for market-size
context, weak for pricing.

**Public records requests.** A one-paragraph request to a district's purchasing
office for reroof bid tabs is cheap, legal and routinely granted.

**The honest caveat, which matters:** an institutional reroof is not a residential
reroof. Prevailing-wage rules push labour *up*; project scale pushes per-square
cost *down*; bonding, insurance and specification requirements push it *up*; and
much of the work is membrane, not shingle. The net adjustment is not obviously in
one direction, which is exactly why this is a **calibration and bounds source, not
a price source.** It tells us when our residential number is implausible. Any
conversion from institutional to residential is a modelled assumption and would
have to be documented as one.

> **Verdict: (1) REUSABLE — FREE, PUBLIC DOMAIN.** Best used to bound and validate,
> not to price directly.

---

## 6. Price indexes and government statistics

The escalation backbone. Public domain, free, programmatic, and permanently
citable.

**BLS Producer Price Index, roofing-specific series:**

| Series | Covers |
|---|---|
| `WPU136` | Nonmetallic mineral products: asphalt felts and coatings |
| `WPU1361` | Prepared asphalt & tar roofing and siding products (Jan 2026 = 347.114) |
| `PCU3241223241221` | Asphalt shingle & coating materials mfg: roofing asphalts, pitches, coatings, cements |
| `PCU3241223241222` | Asphalt shingle & coating materials mfg: prepared asphalt/tar roofing & siding |

Sources: [FRED WPU1361](https://fred.stlouisfed.org/series/WPU1361),
[FRED WPU136](https://fred.stlouisfed.org/series/WPU136),
[ALFRED PCU3241223241222](https://alfred.stlouisfed.org/series?seid=PCU3241223241222).

**Access.** The FRED API is free with a key and returns JSON; the BLS public API
is free (registration raises the rate limit). Both are US federal statistics —
**public domain, no licence, redistributable.** AGC of America also publishes
[ready-made PPI tables](https://www.agc.org/sites/default/files/users/user21902/PPI%20Tables%202026_01%20Redo_v2.pdf)
for construction inputs if we want a cross-check.

**We already do this for labour.** `lib/ingest/bls-oews.ts` pulls OEWS SOC 47-2181
by CBSA. Adding a PPI escalation step is the same discipline applied to the other
half of the cost.

**The conceptual point worth being precise about: an index gives you the
derivative, not the level.** WPU1361 = 347.114 does not mean anything in dollars.
What it means is that a price you anchored in June 2026 can be carried forward
exactly, forever, for free. That is the half of RSMeans's value that we get
without paying, and it is the half that decays fastest if you *don't* have it —
a licensed 2026 price table is worth less in 2028 than a 2026 anchor plus a live index.

Also free and relevant: Census **Value of Construction Put in Place** and
**building permits** for demand context, and BLS **OEWS** (already ingested) for labour.

> **Verdict: (1) REUSABLE — FREE, PUBLIC DOMAIN.** Highest value-per-effort item
> in this report. Build this next.

---

## 7. Published cost guides

Homewyse, Fixr, HomeGuide, Angi, This Old House, roofcostdata, and the long tail
of contractor blog posts.

These are copyrighted editorial, they are frequently derivative of each other
(the same range citation-loops between four sites), and at least one of them is
known to run low — Homewyse's own FAQ concedes that "the largest variance…
arises from labor rate differences", and contractors routinely report having to
multiply its output.

They are still worth collecting, for one reason: **if our number lands outside
every published range, one of us is wrong and we should find out which before a
homeowner does.**

This is already implemented and enforced in code. `transformMaterialObservations()`
rejects every `channel: "benchmark"` row with the reason *"benchmark — kept for
comparison, never used as our own priced record"*, and there is a test asserting
it (`tests/materials-ingest.test.ts`, "never turns a competitor's published range
into one of our records").

> **Verdict: (2) BENCHMARK ONLY.** Cite in comparisons, never ingest as data.

---

## 8. First-party data

The only source on this list that no competitor can copy, and the only one that
gets more valuable every month.

- **Quote PDF extraction** — the `npm run test:extract` pipeline. A homeowner
  uploads a real quote; we parse line items, scope, material, area, price.
- **Quote-fairness submissions** — every use of the checker is a real local price
  with a ZIP and a date attached.
- **Contractor partners** — a handful of contractors willing to share anonymised
  historical jobs is worth more than any purchased table.

**Sizing this honestly, and correcting something I overstated earlier:** ten real
quotes do **not** beat a purchased table as a *price source*. Ten quotes calibrate;
they tell you your model is 20% low in Boston. Several hundred quotes, spread
across markets and dated, are a price source. The distinction matters because
under-powering the first-party dataset and then treating it as authoritative is a
worse failure than modelling openly.

Requirements before any of this is used: explicit consent at upload, contractor
names and homeowner identity stripped, aggregation floor (never publish a figure
derived from fewer than N quotes in a market), and the same `dataStatus` /
`confidenceScore` discipline as everything else.

> **Verdict: (1) REUSABLE — FREE, and fully owned.** The long-run moat.

---

## 9. The recommended hybrid model

Three layers, separately sourced, separately confident, separately citable.

```
  LEVEL          material.per_square anchor, per material
   ├── first-party trade quotes from distributors      (channel: trade,  conf 80)
   └── retail affiliate feed × material.trade_discount (channel: retail, conf 70)

  ESCALATION     carry the anchor forward
   ├── BLS PPI WPU1361 / PCU32412232412xx              (public domain)
   ├── manufacturer price-increase letters              (dated, roofing-specific)
   └── public distributor financials                    (did the increase stick?)

  GEOGRAPHY      spread the anchor across markets
   ├── freight distance from plant + state/local sales tax
   ├── public bid tabulations                           (bounds, not levels)
   └── first-party quotes by ZIP                        (as volume allows)
```

Roughly 80% of this is already built. `lib/ingest/materials.ts` is Layer 1.
`lib/ingest/bls-oews.ts` proves the Layer 2 pattern for labour. `resolveGeo`'s
zip → city → metro → state → country → global fallback is Layer 3's plumbing.

The gaps are: no PPI escalation step yet, no affiliate feed connected, and
`data/materials.csv` is still a template with nothing real in it.

**Why this beats a licensed database even ignoring cost.** A purchased table is a
snapshot with someone else's methodology and no explanation. This model produces
a number we can defend line by line on the page — "$X per square, from a
distributor quote in Newark dated 12 June, carried forward 6.2% on BLS WPU1361."
That sentence *is* the product. It is the thing Homewyse cannot write.

---

## 10. Provenance and licensing discipline

What the codebase already enforces:

- `dataStatus: "verified" | "modeled" | "sample"` — observed material prices land
  `modeled`, never `verified`, because the observation is real but the
  retail→trade conversion is ours.
- `effectiveDate` (when the price was true) is kept separate from `collectedDate`
  (when we ran the script). Freshness describes the price, not the job.
- Every record carries a `methodology` string naming source, URL, observation
  date and the discount applied.
- `confidenceScore` per record; trade-channel 80, converted retail 70.
- Benchmarks are rejected at ingestion, not filtered at render.

**One concrete addition this research recommends:** add a `license` field and a
`redistributable: boolean` to the source table, and assert in a test that no
record whose source is non-redistributable can reach a published page. Right now
the discipline is enforced by the benchmark check and by convention. If we ever
add a licensed source for private validation (§1), convention is not enough — the
boundary should be mechanical.

Standing rules, unchanged: no scraping behind logins, email gates, CAPTCHAs,
paywalls, rate limits or robots restrictions; no fake accounts or submissions; and
data being publicly visible does not mean it is licensed for commercial reuse.

---

## 11. Cost / benefit matrix

| Source | Category | Cost | Effort | Gives us | Value |
|---|---|---|---|---|---|
| BLS PPI + FRED API | (1) | **FREE** | Low | Escalation, forever | ★★★★★ |
| Manufacturer price letters | (1) | **FREE** | Low | Dated roofing-specific escalation | ★★★★★ |
| Distributor phone quotes | (1) | **FREE** | Medium | Real trade-channel levels | ★★★★★ |
| First-party quote data | (1) | **FREE** | Ongoing | Levels + geography + a moat | ★★★★★ |
| Retail affiliate feed | (1) | **FREE** | Medium | Levels, needs conversion | ★★★★ |
| Public bid tabulations | (1) | **FREE** | Medium | Bounds and sanity checks | ★★★ |
| Distributor public financials | (1) | **FREE** | Low | Escalation cross-check | ★★★ |
| Manufacturer spec sheets | (1) | **FREE** | Low | Quantities, warranty tiers | ★★★ |
| USASpending API | (1) | **FREE** | Low | Market context, few unit prices | ★★ |
| Published cost guides | (2) | **BENCHMARK ONLY** | Low | Plausibility check | ★★ |
| RSMeans Core, private use | (3) | **PAID $396/yr** | Low | Private accuracy audit | ★★ |
| RSMeans as our dataset | (3) | **LICENCE REQUIRED** | — | Nothing publishable | ✗ |
| Xactimate price lists | (3) | **LICENCE REQUIRED** | — | Nothing publishable | ✗ |
| Scraping distributor logins | (4) | **NOT APPROPRIATE** | — | — | ✗ |
| Scraping retail storefronts | (4) | **NOT APPROPRIATE** | — | — | ✗ |
| Republishing competitor tables | (4) | **NOT APPROPRIATE** | — | — | ✗ |

Every ★★★★★ row is free. That is the finding.

---

## 12. Phased recommendation

**Phase 0 — free, now, no new dependencies.**
Wire BLS PPI (WPU1361) into the pipeline as an escalation factor, mirroring the
OEWS ingester. Start a dated log of manufacturer price-increase letters from the
distributor pages in §2. Both are public domain, both are low effort, and together
they mean any anchor we set from here on stays current automatically.
*Outcome: prices stop going stale.*

**Phase 1 — free, one afternoon of phone calls.**
Collect 10–15 trade-channel quotes across our published markets and put them in
`data/materials.csv`. These are `channel: "trade"`, they bypass the discount, and
they replace the sample material rows with real ones.
*Outcome: the "sample data" banner comes off the material component.*

**Phase 2 — free, needs an application.**
Join the Home Depot / Lowe's affiliate programmes for the permissioned product
feed. Read the terms first and constrain use to deriving our published contractor
cost. Retail then becomes a continuously-refreshing breadth layer under the
narrow, high-quality trade anchors.
*Outcome: coverage across every material without more phone calls.*

**Phase 3 — free, ongoing, and the actual moat.**
Turn on quote-PDF extraction and fairness-check capture with consent and an
aggregation floor. Optionally, at this point, one RSMeans Core seat used privately
to audit our accuracy — never as a source.
*Outcome: first-party price data that compounds and that no competitor has.*

**Phase 4 — the destination.**
Once first-party volume supports it, the anchors themselves come from our own
quotes, and public data becomes the cross-check rather than the source. At that
point the dataset is proprietary, defensible, independently sourced, and worth
more than the thing we declined to buy.

---

*Prepared September 2026. Sources are cited inline; every price level in the
product remains independently sourced, documented and derived.*
