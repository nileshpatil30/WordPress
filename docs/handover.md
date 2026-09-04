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
| Local coverage | 17 cities, 10 states, 89 ZIPs |

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
npm test                  # 203 tests
npm run build:static      # out/, ready to upload
npm run collect:prices    # price worksheet -> materials.csv
npm run ingest:materials  # materials.csv -> seed (dry run without --emit-seed)
npm run ingest:ppi        # BLS PPI -> seed
npm run ingest:bls        # BLS OEWS wages -> seed
```

## Where the reasoning is written down

- `docs/materials-data.md` - how to collect prices, and the trade discount
- `docs/materials-data-sources.md` - every source researched, classified by
  whether we can reuse it, benchmark it, licence it, or must not collect it
- `docs/deployment.md` - the static build and Hostinger
- `docs/seo/` - keyword research and the page roadmap
