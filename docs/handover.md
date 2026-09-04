# Where this is up to

Written for whoever picks this up next, including a Claude session with no
memory of how any of it got here. Last updated September 2026.

## What the site is

Home Cost Doctor. Independent roof replacement cost estimates by ZIP, a
contractor quote checker, and side-by-side quote comparison. Roofing only, USA
only, architected so a second service is a dataset plus one engine module.

Live at homecostdoctor.com, deployed as static files on Hostinger. `npm run
build:static` produces `out/`, which gets uploaded to `public_html`.

## The one rule everything rests on

> Our numerical dataset must be independently sourced, documented and derived.

We may study a competitor's methodology and cite their published ranges as a
benchmark. We may not use RSMeans, Homewyse, Angi or anyone else's dataset as
our underlying data. `tests/provenance.test.ts` enforces the publishable half of
this mechanically - every source carries `redistributable`, and nothing marked
false can back a priced record.

## What is real and what is not

| | |
|---|---|
| Labour | Real. BLS OEWS, May 2025, SOC 47-2181, 15 metros |
| Price index | Real. BLS PPI WPU1361, 31 monthly readings to July 2026 |
| Geometry | Exact. Pitch multipliers are sqrt(1 + (rise/12)^2) |
| Materials | **Modelled.** About 68% of a typical re-roof |
| Local coverage | 17 cities, 11 states, 89 ZIPs, 15 labour metros |

Run `npx tsx -e 'import {getDataStatus} from "./lib/data-status"; console.log(getDataStatus())'`
for the current picture rather than trusting this table.

## The next thing to do, and it is not code

Get real material prices in. Everything else is polish on top of numbers we made
up.

There are two routes and the second needs no phone calls:

1. **Trade quotes.** Ring an ABC Supply, Beacon or SRS branch and ask the price
   per square on a named product. `channel: trade`, confidence 80. Best data.
2. **Retail listings.** `data/price-worksheet.csv` names fifteen products, seven
   as direct Home Depot links with coverage pre-filled. Read the price off the
   page, then `npm run collect:prices` and
   `npm run ingest:materials -- --file data/materials.csv --collected <date>`.
   `channel: retail`, confidence 70 after the documented trade discount.

Both are dry-run by default. Nothing writes until `--emit-seed`.

Retail is the homeowner channel, so `material.trade_discount` (0.78) converts it
to what a contractor pays. That factor is a modelled assumption living in
`pricing_factors`, named in the methodology of every row it touches.

## Nothing updates by itself

Worth being blunt about, because it is the first thing a new reader assumes
wrongly. The static build is a photograph, not a window:

```
lib/data/seed/*.ts  ->  npm run build:static  ->  zip  ->  Hostinger public_html
    the prices            bakes into 52 pages           what visitors see
```

There is no server, no database call at request time and no scheduled fetch. A
price on homecostdoctor.com changes when a person runs those three steps, and
not before. That includes the escalation index: `lib/data/seed/ppi.ts` is a
generated file, so the BLS Producer Price Index only moves when somebody runs
`npm run ingest:ppi` and rebuilds. Roughly a monthly chore.

`.github/workflows/monthly-data-refresh.yml` takes that chore off a person. On
the 20th of each month it fetches the series, stops if BLS published nothing
new, and otherwise runs the tests, builds, attaches a ready-to-upload zip to the
run and opens a pull request with the refreshed index. It deliberately does not
deploy - no FTP credentials exist anywhere in this repository - so extracting
that zip into `public_html` stays a decision a person makes. That is the right
shape while materials are still modelled.

## What expansion actually requires

Where the dataset stands. Re-derive rather than trusting this:

```bash
npx tsx -e 'import {getDataStatus} from "./lib/data-status"; console.log(getDataStatus())'
```

| | |
|---|---|
| Pricing rows | 67 - 52 sample, 15 real (the real ones are BLS labour rates) |
| Modelled share of a typical re-roof | 68% |
| Cities / states / ZIPs / labour metros | 17 / 11 / 89 / 15 |
| Materials | 14 |
| Services | 1 live, 6 planned |
| Countries | 1 |

In priority order, and the order matters more than the list:

**1. Materials.** Asphalt is done: both shingle rows are priced from observed
pallet prices, with no trade-discount assumption in between. The remaining
twelve - tile, slate, metal, cedar, the low-slope membranes - are still
modelled, and `data/price-worksheet-round2.csv` names three search targets for
each. Two of them need care: metal panels are priced by *covering* width, which
is less than panel width because they overlap, and membranes come in rolls
whose coverage is printed on the wrapper.

**Historical note, kept because the reasoning still applies.** Eight verified retail observations are collected in
`data/price-worksheet.csv` and *none are ingested*. Three things stand in the
way: Home Depot bulk or pallet prices on the seven product pages already
visited; a sourced retail-to-trade factor, because the 0.78 in `pricing_factors`
was chosen rather than observed; and `coverage_sqft` for the metal panels, which
is the net covering width, less than the panel width because the panels overlap.

Until these land, every expansion below multiplies a modelled number across more
surface area. Note the discipline that applies here: retail inputs sitting below
current model assumptions is a signal, not a confirmed correction, because the
trade factor converting one to the other is itself unvalidated. Do not retune
the production model on the strength of the retail observations alone.

**2. Index freshness.** See the section above. One command, then a rebuild.

**3. Geography.** Unblocked, and now waiting on two downloads rather than on
code. Coverage used to be capped by editorial effort: every ZIP had to belong
to a hand-written city, so Portland and Denver - metros BLS publishes roofer
wages for - fell to the national figure because nobody had written the page.
A ZIP now carries its own metro, so it prices at metro scope with or without an
article about it.

    npm run expand:geo -- --oews <MSA csv> --crosswalk <ZIP_CBSA csv>

Dry run by default. The OEWS metro file is at bls.gov/oes/tables.htm and the
ZIP-to-CBSA crosswalk at huduser.gov; both are public domain. Add --emit-seed,
then run `npm run ingest:bls` so the new metros get real wages rather than the
national fallback. Roughly 380 metros and 40,000 ZIPs are reachable this way.

**4. More countries** (UK, Australia, Netherlands, Poland have been asked
about). Larger than it looks. The engine is geography-generic, but the data
pipeline is not: BLS wages, BLS PPI and US permit structures are all
US-specific, and each country needs its own statistical-agency equivalent, its
own currency, square metres instead of roofing squares, and VAT - which the
model currently has no concept of. Budget a month per country, not a week.

**5. More services.** Solar, HVAC, windows, siding, kitchen and bathroom are
seeded as `planned`. Each needs an engine module and its own dataset, which
means starting the materials problem again from zero, six more times.

The judgement behind that order: one country and one trade done properly is a
defensible product. Six trades at 68% modelled is six thin pages.

## Things that will bite you

**Data quality drives the published range, not just the badge.** A line item's
low/high is market variation at a known price. Model uncertainty is combined in
quadrature on top, scaled by `dataStatus` - see `DEFAULT_MODEL_UNCERTAINTY` in
`lib/engine/roofing/model.ts`. So the range narrows on its own as sample rows
become modelled and then verified. Nobody has to remember.

**Escalation only runs forward.** `lib/escalation.ts` carries an anchored price
forward on the PPI index. Every current material anchor postdates the latest
index reading, so nothing escalates today. That is the rule working, not a
broken wire.

**Delete `.data/` before building.** It is a gitignored store overlay that
shadows renamed seed rows and will silently serve stale content.

**Upload is off on static builds** and that is deliberate: reading a quote PDF
needs a server to hold an API key, which would otherwise ship to the browser.
Enabling it means deploying somewhere with a server, not a code change.

**`master` is well behind this branch.** Vercel builds from `master`, Hostinger
does not. Merging publishes.

## Commands

```bash
npm test                  # 213 tests
npm run build:static      # out/, ready to upload
npm run collect:prices    # price worksheet -> materials.csv
npm run ingest:materials  # materials.csv -> seed (dry run without --emit-seed)
npm run ingest:ppi        # BLS PPI -> seed
npm run ingest:bls        # BLS OEWS wages -> seed
```

`.github/workflows/monthly-data-refresh.yml` runs the PPI ingest on a schedule
and hands back a built zip. It needs no secrets - `GITHUB_TOKEN` is enough to
open the pull request - so it works as soon as it is on the default branch.

## Where the reasoning is written down

- `docs/materials-data.md` - how to collect prices, and the trade discount
- `docs/materials-data-sources.md` - every source researched, classified by
  whether we can reuse it, benchmark it, licence it, or must not collect it
- `docs/deployment.md` - the static build and Hostinger
- `docs/seo/` - keyword research and the page roadmap
