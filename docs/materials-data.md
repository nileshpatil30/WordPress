# Getting real material prices in

Materials, disposal, equipment and permits are still sample data — roughly 70%
of a typical re-roof. Labour is real (BLS OEWS, 15 metros). This is the gap that
matters most, and this is how to close it without buying anything.

For the full survey of where material prices can legitimately come from — every
source researched, priced and classified — see
[materials-data-sources.md](./materials-data-sources.md). This file is the
operating manual; that one is the research behind it.

## Why not just license RSMeans

Eventually, maybe. Not first. It costs money before there is any traffic to
justify it, and its data is licensed — you cannot buy a subscription and
republish the underlying cost database in a public calculator. Revisit when the
economics justify it and the licence terms have been read properly.

## The rule that cannot bend

> Our numerical dataset must be independently sourced, documented and derived.
> We may study a competitor's *methodology* and cite their published ranges as a
> benchmark. We may not use RSMeans, Homewyse, Angi or anyone else's dataset as
> our underlying data.

Every row records source, URL, date observed, geographic scope, unit and status.
A price without provenance is not usable here — the entire product rests on
being able to say where a number came from.

## The one thing everybody gets wrong

**Retail price is not contractor cost.**

A homeowner sees $42 a bundle on a shelf. A contractor buying the same product
from a distributor — ABC Supply, Beacon, SRS — pays materially less, because
they buy by the pallet on trade terms.

Feed shelf prices straight into the model and estimates come out **too high**.
That is the mirror image of the error the big cost guides are known for, and
just as useless to the person reading it.

So the ingester records which channel a price came from and applies
`material.trade_discount` (currently **0.78**, global, editable in
`pricing_factors`) to retail observations only. That factor is a modelled
assumption, not an observation, and it is named in the methodology of every
record it touches.

| Channel | Meaning | Discount |
|---|---|---|
| `retail` | Shelf or listed consumer price | ×0.78 |
| `trade` | Distributor or contractor-channel price | ×1.00 |
| `benchmark` | Somebody else's published range | **never ingested** |

## How to do a collection

1. Copy `data/materials-template.csv` to `data/materials.csv`.
2. Fill a row per material per source. Record the price **as you found it** —
   the ingester does the conversion, so never pre-discount by hand.
3. Dry run, which writes nothing:

   ```
   npm run ingest:materials -- --file data/materials.csv --collected 2026-09-02
   ```

4. Read the output. It shows the converted range per material, which rows were
   refused and why, and the discount applied.
5. When it looks right:

   ```
   npm run ingest:materials -- --file data/materials.csv \
     --collected 2026-09-02 --emit-seed lib/data/seed/materials.ts
   ```

6. Import `observedMaterialRecords` from `lib/data/seed/index.ts`, filtering out
   the sample rows it replaces — the same pattern `bls-labor.ts` uses. A finer
   or fresher sample row would otherwise keep winning the lookup.

## Where to look for numbers

- **Manufacturer published specifications** — GAF, IKO, Owens Corning. Coverage
  per bundle, bundles per square, accessory requirements. Not prices, but it
  makes our *quantities* exact.
- **Retailer listings** — publicly posted prices, recorded per listing with the
  URL. Convert to per-square before entry (three bundles per square for most
  architectural shingles).
- **Distributor quotes** — the best source available without a licence. A phone
  call to a local supply house gives a trade price directly, no discount factor
  needed, and it is the fastest way to sanity-check whether 0.78 is right.
- **Your own uploaded quotes** — eventually the strongest, because a real quote
  shows what a contractor actually charged, overhead and margin included. Needs
  a server and a database; not available on the static build.

## What "done" looks like

Not perfect numbers. Numbers whose direction of error is known.

Homewyse's known failure is running low — contractors report multiplying by 1.5.
If ours run high we are equally useless. The point of the channel field and the
discount factor is that when real quotes arrive, the bias is measurable and one
number fixes it, rather than being spread invisibly across the dataset.
