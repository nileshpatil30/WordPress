import type { EstimateResult, LineItem } from "@/lib/engine/types";
import { Badge, Callout, Card, Disclosure } from "@/components/ui";
import { num, pct, usd } from "@/lib/format";

/* -------------------------------------------------------------------------
   Price range bar
   The single most important visual on the site: it has to make "this is a
   range, not a price" impossible to misread.
------------------------------------------------------------------------- */
export function PriceRangeBar({ low, typical, high, marker }: {
  low: number; typical: number; high: number;
  marker?: { value: number; label: string; tone?: "caution" | "danger" | "positive" };
}) {
  const values = [low, high, ...(marker ? [marker.value] : [])];
  const domainMin = Math.min(...values) * 0.88;
  const domainMax = Math.max(...values) * 1.12;
  const at = (v: number) =>
    Math.max(0, Math.min(100, ((v - domainMin) / (domainMax - domainMin)) * 100));

  const markerTone = marker?.tone === "danger" ? "bg-danger"
    : marker?.tone === "caution" ? "bg-caution" : "bg-positive";

  return (
    <div className="pt-2">
      <div className="relative h-2.5 rounded-full bg-sunken" role="img"
        aria-label={`Estimated range ${usd(low)} to ${usd(high)}, typical ${usd(typical)}${marker ? `, your quote ${usd(marker.value)}` : ""}`}>
        <div
          className="absolute inset-y-0 rounded-full bg-accent/25"
          style={{ left: `${at(low)}%`, width: `${at(high) - at(low)}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `calc(${at(typical)}% - 1.5px)` }}
        />
        {marker && (
          <div
            className={`absolute top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full ${markerTone}`}
            style={{ left: `calc(${at(marker.value)}% - 1.5px)` }}
          />
        )}
      </div>

      <div className="relative mt-2 h-4 text-[11px] font-medium text-faint">
        <span className="absolute -translate-x-1/2 tnum" style={{ left: `${at(low)}%` }}>{usd(low)}</span>
        <span className="absolute -translate-x-1/2 tnum" style={{ left: `${at(high)}%` }}>{usd(high)}</span>
      </div>
      {marker && (
        <p className="mt-3 text-[12.5px] text-muted">
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${markerTone}`} />
          {marker.label}: <span className="font-semibold text-ink tnum">{usd(marker.value)}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
export function ConfidenceMeter({ confidence }: { confidence: EstimateResult["confidence"] }) {
  const tone = confidence.band === "High" ? "positive"
    : confidence.band === "Moderate" ? "accent"
      : confidence.band === "Limited" ? "caution" : "danger";
  const barTone = tone === "positive" ? "bg-positive" : tone === "accent" ? "bg-accent"
    : tone === "caution" ? "bg-caution" : "bg-danger";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Confidence</p>
        <Badge tone={tone}>{confidence.band}</Badge>
      </div>
      <p className="mt-1.5 text-[26px] font-semibold tnum text-ink">
        {confidence.score}<span className="text-[15px] font-medium text-faint">/100</span>
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${confidence.score}%` }} />
      </div>

      <ul className="mt-4 space-y-2.5">
        {confidence.breakdown.map((b) => (
          <li key={b.key}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium text-ink-soft">{b.label}</span>
              <span className="shrink-0 tnum text-muted">{b.earned}/{b.max}</span>
            </div>
            <p className="mt-0.5 text-[12.5px] leading-snug text-faint">{b.detail}</p>
          </li>
        ))}
      </ul>

      {confidence.caveats.length > 0 && (
        <div className="mt-4 space-y-2">
          {confidence.caveats.map((c) => (
            <p key={c} className="rounded-lg bg-caution-soft px-3 py-2 text-[12.5px] leading-relaxed text-ink-soft">
              {c}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
const COMPONENT_TONE: Record<string, string> = {
  material: "bg-accent", labor: "bg-ink", equipment: "bg-faint",
  disposal: "bg-caution", permit: "bg-line-strong", addon: "bg-accent/50",
  overhead: "bg-muted",
};

export function BreakdownTable({ estimate }: { estimate: EstimateResult }) {
  const totalTypical = estimate.range.typical;
  const rows = [...estimate.subtotals];

  return (
    <div>
      {/* Composition bar - where the money actually goes, at a glance. */}
      <div className="flex h-3 w-full overflow-hidden rounded-full" role="img" aria-label="Cost composition">
        {rows.map((r) => (
          <div
            key={r.component}
            className={COMPONENT_TONE[r.component] ?? "bg-line-strong"}
            style={{ width: `${(r.typical / totalTypical) * 100}%` }}
            title={`${r.label}: ${usd(r.typical)}`}
          />
        ))}
      </div>

      <div className="mt-5 space-y-1">
        {rows.map((r) => (
          <div key={r.component} className="flex items-baseline justify-between gap-4 py-1.5">
            <span className="flex items-center gap-2.5 text-[14px] text-ink-soft">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${COMPONENT_TONE[r.component] ?? "bg-line-strong"}`} />
              {r.label}
            </span>
            <span className="shrink-0 text-right">
              <span className="text-[15px] font-semibold tnum text-ink">{usd(r.typical)}</span>
              <span className="ml-2 text-[12px] tnum text-faint">
                {Math.round((r.typical / totalTypical) * 100)}%
              </span>
            </span>
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <span className="text-[14px] font-semibold text-ink">Typical total</span>
          <span className="text-[17px] font-semibold tnum text-ink">{usd(totalTypical)}</span>
        </div>
      </div>

      <details className="group mt-6 rounded-xl border border-line bg-sunken/60 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[13.5px] font-semibold text-ink marker:content-none">
          Every line item, with how it was calculated
          <span aria-hidden className="text-faint transition-transform group-open:rotate-45 text-lg leading-none">+</span>
        </summary>
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="pb-2 pr-3 font-semibold">Item</th>
                <th className="pb-2 pr-3 text-right font-semibold">Low</th>
                <th className="pb-2 pr-3 text-right font-semibold">Typical</th>
                <th className="pb-2 text-right font-semibold">High</th>
              </tr>
            </thead>
            <tbody>
              {estimate.lineItems.map((l) => <LineItemRow key={l.key} item={l} />)}
              <tr className="border-t border-line-strong">
                <td className="py-2.5 pr-3 text-[13px] font-semibold text-ink">
                  Direct cost
                  <span className="block text-[11.5px] font-normal leading-snug text-faint">
                    Combined in quadrature, not by stacking every worst case
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right text-[13px] tnum text-muted">{usd(estimate.directCost.low)}</td>
                <td className="py-2.5 pr-3 text-right text-[13px] font-semibold tnum text-ink">{usd(estimate.directCost.typical)}</td>
                <td className="py-2.5 text-right text-[13px] tnum text-muted">{usd(estimate.directCost.high)}</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 text-[13px] font-semibold text-ink">Contractor overhead and profit</td>
                <td className="py-2.5 pr-3 text-right text-[13px] tnum text-muted">{usd(estimate.overheadAndProfit.low)}</td>
                <td className="py-2.5 pr-3 text-right text-[13px] font-semibold tnum text-ink">{usd(estimate.overheadAndProfit.typical)}</td>
                <td className="py-2.5 text-right text-[13px] tnum text-muted">{usd(estimate.overheadAndProfit.high)}</td>
              </tr>
              <tr className="border-t-2 border-ink/15">
                <td className="py-3 pr-3 text-[14px] font-semibold text-ink">Estimated price</td>
                <td className="py-3 pr-3 text-right text-[14px] font-semibold tnum text-ink">{usd(estimate.range.low)}</td>
                <td className="py-3 pr-3 text-right text-[14px] font-semibold tnum text-accent">{usd(estimate.range.typical)}</td>
                <td className="py-3 text-right text-[14px] font-semibold tnum text-ink">{usd(estimate.range.high)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function LineItemRow({ item }: { item: LineItem }) {
  return (
    <tr className="border-b border-line/70 align-top">
      <td className="py-2.5 pr-3">
        <span className="text-[13.5px] font-medium text-ink">{item.label}</span>
        {item.optional && <span className="ml-2 text-[11px] text-faint">optional</span>}
        <span className="block text-[12px] leading-snug text-faint">{item.basis}</span>
        {item.note && <span className="mt-1 block text-[12px] leading-snug text-muted">{item.note}</span>}
      </td>
      <td className="py-2.5 pr-3 text-right text-[13px] tnum text-faint">{usd(item.low)}</td>
      <td className="py-2.5 pr-3 text-right text-[13px] font-semibold tnum text-ink">{usd(item.typical)}</td>
      <td className="py-2.5 text-right text-[13px] tnum text-faint">{usd(item.high)}</td>
    </tr>
  );
}

/* ------------------------------------------------------------------------- */
export function AssumptionsList({ estimate }: { estimate: EstimateResult }) {
  return (
    <div>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {estimate.assumptions.map((a) => (
          <div key={`${a.label}-${a.value}`}>
            <dt className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">
              {a.label}
              {a.assumed && (
                <span className="rounded bg-sunken px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-muted">
                  assumed
                </span>
              )}
            </dt>
            <dd className="mt-1 text-[15px] font-semibold text-ink">{a.value}</dd>
            {a.note && <dd className="mt-0.5 text-[12.5px] leading-snug text-muted">{a.note}</dd>}
          </div>
        ))}
      </dl>

      {estimate.warnings.length > 0 && (
        <div className="mt-6 space-y-2">
          {estimate.warnings.map((w) => (
            <Callout key={w} tone="caution">{w}</Callout>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
export function FreshnessLine({ estimate }: { estimate: EstimateResult }) {
  return (
    <p className="text-[12.5px] text-faint">
      Pricing data updated{" "}
      <span className="font-semibold text-muted">{estimate.freshness.label}</span>
      {" · "}
      {estimate.geo.isFallback
        ? "national figures (ZIP not mapped)"
        : `${estimate.geo.bestLevel}-level data for ${estimate.geo.label}`}
      {estimate.freshness.containsSampleData && (
        <>{" · "}<span className="font-semibold text-caution">contains sample data</span></>
      )}
    </p>
  );
}

/* -------------------------------------------------------------------------
   The full result panel, used by the calculator and by every city page.
------------------------------------------------------------------------- */
export function EstimateResultView({ estimate, compact = false }: {
  estimate: EstimateResult; compact?: boolean;
}) {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-gradient-to-b from-accent-soft/70 to-surface px-6 py-7 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Your estimated price
          </p>
          <p className="display mt-2 text-[38px] font-semibold text-ink sm:text-[52px]">
            {usd(estimate.range.low)} <span className="text-faint">–</span> {usd(estimate.range.high)}
          </p>
          <div className="mt-5">
            <PriceRangeBar low={estimate.range.low} typical={estimate.range.typical} high={estimate.range.high} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <MiniStat label="Low" value={usd(estimate.range.low)} />
            <MiniStat label="Typical" value={usd(estimate.range.typical)} accent />
            <MiniStat label="High" value={usd(estimate.range.high)} />
            <MiniStat label="Midpoint" value={usd(estimate.midpoint)} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-accent-line/50 pt-4">
            <span className="text-[13px] text-muted">
              <span className="font-semibold tnum text-ink">{usd(estimate.perSquare.typical)}</span> per roofing square
            </span>
            <span className="text-[13px] text-muted">
              <span className="font-semibold tnum text-ink">{num(Number(estimate.derived.squares))}</span> squares
              ({num(Number(estimate.derived.roofSurfaceSqft))} sq ft)
            </span>
            <span className="text-[13px] text-muted">
              <span className="font-semibold tnum text-ink">{num(Number(estimate.derived.laborHours))}</span> crew hours
            </span>
          </div>
          <div className="mt-3">
            <FreshnessLine estimate={estimate} />
          </div>
        </div>

        <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Where the money goes</h3>
            <p className="mb-5 mt-1 text-[13px] text-muted">
              A single number tells you nothing. This is the same structure a
              contractor uses to build their price.
            </p>
            <BreakdownTable estimate={estimate} />
          </div>
          <div className="lg:border-l lg:border-line lg:pl-8">
            <ConfidenceMeter confidence={estimate.confidence} />
          </div>
        </div>
      </Card>

      {!compact && (
        <Card className="px-6 py-7 sm:px-8">
          <h3 className="text-[15px] font-semibold text-ink">What we assumed</h3>
          <p className="mb-5 mt-1 text-[13px] text-muted">
            Change any of these in the calculator and the estimate moves. Anything
            marked <em>assumed</em> is a default we chose because you did not supply it.
          </p>
          <AssumptionsList estimate={estimate} />
        </Card>
      )}

      <Card className="px-6 py-5 sm:px-8">
        <Disclosure summary="What this estimate is, and what it is not" className="border-t-0 pt-0">
          <p>
            This is a modelled range built from our pricing data and the project
            characteristics you supplied. It is not a quote, an offer, or an
            inspection. No model can see your deck condition, your site access,
            your local crew availability this month, or what a specific contractor
            needs to charge to do the job properly.
          </p>
          <p>
            Use it to walk into a contractor conversation informed, to spot a quote
            that needs explaining, and to understand which parts of the price are
            actually negotiable. Do not use it to argue that a contractor is wrong.
          </p>
        </Disclosure>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">{label}</p>
      <p className={`mt-1 text-[19px] font-semibold tnum ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
    </div>
  );
}

export function DeltaPill({ value }: { value: number }) {
  const tone = value > 0 ? "caution" : value < 0 ? "positive" : "neutral";
  return <Badge tone={tone}>{pct(value, 1)} vs typical</Badge>;
}
