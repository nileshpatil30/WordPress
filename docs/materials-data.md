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

## The no-phone-call route

Ringing a distributor gets the best number - a real trade price, `channel:
trade`, confidence 80. It is also a conversation in English with a stranger,
which is a real barrier and not one worth pretending away.

Reading a price off a shop website is not. It needs no conversation, it can be
done in twenty minutes, and it is what `channel: retail` in the ingester was
built for.

```bash
# 1. Open data/price-worksheet.csv. Fifteen rows, each naming a product.
#    For each: search the store, find the product, type in three things -
#    the price, the address of the page, and today's date. Nothing else.

# 2. Convert the listings into dollars per roofing square:
npm run collect:prices

# 3. Feed the result to the ingester (dry run first, as always):
npm run ingest:materials -- --file data/materials.csv --collected YYYY-MM-DD
```

`collect:prices` does the arithmetic that would otherwise sit with whoever is
reading the page: a shingle bundle covers 33.33 sq ft, three make a square, a
metal panel covers 24. It also takes the spread across the products for a
material as that material's range.

Two things it will refuse to do, because both would put an untraceable number
in the dataset: accept a price with no URL, and accept a date that is not
YYYY-MM-DD.

**One listing is a price, not a range.** With a single product for a material
the band becomes a stated plus or minus 10%, the row says so in its own
methodology, and the engine's model uncertainty widens it again on top. Two more
products replace that with a real observed spread. Three per material is the
target.

**Record the volume price, not the shelf price.** Home Depot and Lowe's publish
a volume price on the same product page - "$35.97 each when you buy 36 or more".
That is what a contractor buying enough for a job actually pays, and putting it
in `bulk_price` skips the modelled discount entirely: the row goes in as
`retail_bulk`, undiscounted, at confidence 75.

Why that matters more than it sounds. Applying the 0.78 trade discount to a
big-box *shelf* price produced $99 per square for architectural shingles, while
Home Depot's own volume price was $108 and a distributor was charging $122. The
discount assumes contractors buy well below retail; on commodity shingles, big-box
shelf pricing is already close to trade, so discounting it again lands below any
price a roofer could actually transact at. The volume price removes the
assumption instead of re-tuning it.

**A single-unit shelf price is still not what a contractor pays.** Where no
volume price is shown, the ingester applies the documented
`material.trade_discount` afterwards, and the resulting rows land `modeled` with
confidence 70 - better than the sample rows they replace, and honestly below the
80 a real trade quote earns. If you can get even two or three phone quotes
later, they will beat all of this.

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

## Keeping prices current: anchor once, escalate free

A price you collect today is wrong in eighteen months, and re-collecting every
material in every market on a schedule is not realistic. It does not have to be.

A material price is three separable things, and they cost completely different
amounts to obtain:

| | | |
|---|---|---|
| **Level** | "shingles are $X a square" | effort - phone calls, retail feeds |
| **Escalation** | "$X in June is $X x 1.06 now" | **free, public domain** |
| **Geography** | "Dallas to Boston is x1.07" | **free, public domain** |

A licensed cost database sells all three bundled. We only ever have to source
the first one, because the other two are US federal statistics. The full survey
is in [materials-data-sources.md](./materials-data-sources.md).

### Ingesting the index

The BLS Producer Price Index publishes roofing-specific series in the public
domain. `WPU1361` (prepared asphalt and tar roofing and siding products) is the
one that matters most; `WPU136`, `PCU3241223241221` and `PCU3241223241222` are
the alternatives.

```bash
# straight from the BLS public API - no key, last three years
npm run ingest:ppi -- --series WPU1361 --fetch

# or from a download: https://fred.stlouisfed.org/series/WPU1361 -> CSV
npm run ingest:ppi -- --series WPU1361 --file ~/Downloads/WPU1361.csv
```

Dry run by default. It prints the series, the latest reading, the year-on-year
change, and — the useful part — exactly what a price anchored on each of several
dates would be carried forward by. When the numbers look right:

```bash
npm run ingest:ppi -- --series WPU1361 --fetch --emit-seed lib/data/seed/ppi.ts
```

Then import it from `lib/data/seed/pricing.ts`, retire the sample series, and set
`src-bls-ppi` to `isActive: true`.

### What escalation is allowed to do

`lib/escalation.ts` is the only place in the codebase that can move a price
without anyone observing it, so every rule in it fails closed:

- **A `sample` series escalates nothing, ever.** Until a real BLS series is
  ingested this whole mechanism is inert and prices are served exactly as
  anchored. There is a test asserting that against the shipped dataset. An
  invented trend line applied to a real price is worse than no trend line.
- **A series only moves the components it measures.** A materials PPI must never
  age labour, which has its own OEWS series, and a series that does not declare
  `appliesTo` moves nothing.
- **Forward only, and no extrapolation behind the series.**
- **Capped at x1.5.** Past that the honest answer is that the anchor needs
  re-collecting, not multiplying, so it declines and the recency penalty in the
  confidence score does the work instead.

And the one that is easy to get wrong: **escalating fixes the price level, not
the sample.** A 2025 observation carried forward on a 2026 index is still a 2025
observation, so it keeps its full recency penalty. Escalation is not allowed to
make old data look fresh.

Every escalated estimate says so on the page, naming the series, both index
readings and the observation date, so a reader can check it against the
published series themselves.

### The rest of the free escalation signal

The index is the backbone but it is not the only free signal, and the other two
are worth checking against it on a collection:

- **Manufacturer price-increase letters.** GAF, Owens Corning and CertainTeed
  send dated, percentage-specific letters to distribution, and distributors post
  them publicly ([Mid-Atlantic](https://www.marsupply.com/resources/price-increase-announcements/),
  [Carolina Atlantic](https://www.carolinaatlantic.com/resources/price-increase-announcements/),
  [Cameron Ashley](https://www.cameronashleybp.com/pricenotices)). They are
  roofing-specific and they lead the BLS series. Treat an announced increase as
  an upper bound: it is a list-price change, and realisation is usually lower.
- **Distributor public financials.** Beacon and SRS discuss average selling price
  and price/volume mix in filings and earnings calls, which tells you whether an
  announced increase actually stuck.

## What "done" looks like

Not perfect numbers. Numbers whose direction of error is known.

Homewyse's known failure is running low — contractors report multiplying by 1.5.
If ours run high we are equally useless. The point of the channel field and the
discount factor is that when real quotes arrive, the bias is measurable and one
number fixes it, rather than being spread invisibly across the dataset.
