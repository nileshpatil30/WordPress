import type { PriceIndexPoint, PriceIndexSeries } from "@/lib/types";
import { Badge, Card } from "@/components/ui";

/**
 * Price history.
 *
 * The important behaviour here is the empty state: when we have no verified
 * series for a place, we say so rather than drawing a plausible-looking line.
 * Invented history is the single most damaging thing a pricing product can
 * publish, because it looks exactly like the real thing.
 */
export function PriceHistory({ series, points, placeLabel }: {
  series: PriceIndexSeries | null;
  points: PriceIndexPoint[];
  placeLabel: string;
}) {
  if (!series || points.length < 2) {
    return (
      <Card className="p-6">
        <h3 className="text-[16px] font-semibold text-ink">Price history</h3>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
          We do not yet hold a verified price history series for {placeLabel}, so
          there is nothing to chart. We are not going to draw one from
          assumptions.
        </p>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-faint">
          The intended source is the Bureau of Labor Statistics Producer Price
          Index for roofing materials, combined with our own first-party data as
          submissions accumulate. Until that is ingested, this section stays
          empty on purpose.
        </p>
      </Card>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.25 || 1;
  const lo = min - pad;
  const hi = max + pad;

  const W = 640, H = 200, PADX = 8, PADY = 14;
  const x = (i: number) => PADX + (i / (points.length - 1)) * (W - PADX * 2);
  const y = (v: number) => PADY + (1 - (v - lo) / (hi - lo)) * (H - PADY * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PADY} L${x(0).toFixed(1)},${H - PADY} Z`;

  const latest = points[points.length - 1];
  const first = points[0];
  const totalChange = ((latest.value - first.value) / first.value) * 100;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold text-ink">{series.name}</h3>
          <p className="mt-1 text-[13px] text-muted">{series.unit}</p>
        </div>
        {series.dataStatus === "sample" && <Badge tone="caution">Sample series</Badge>}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Latest</p>
          <p className="mt-1 text-[22px] font-semibold tnum text-ink">{latest.value.toFixed(1)}</p>
        </div>
        {latest.pctChangeYoy != null && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Year on year</p>
            <p className="mt-1 text-[22px] font-semibold tnum text-caution">
              +{latest.pctChangeYoy.toFixed(1)}%
            </p>
          </div>
        )}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
            Since {first.periodStart.slice(0, 4)}
          </p>
          <p className="mt-1 text-[22px] font-semibold tnum text-ink">+{totalChange.toFixed(1)}%</p>
        </div>
      </div>

      <div className="scroll-x mt-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[200px] w-full min-w-[420px]" role="img"
          aria-label={`${series.name}: ${first.value.toFixed(1)} in ${first.periodStart.slice(0, 7)} rising to ${latest.value.toFixed(1)} in ${latest.periodStart.slice(0, 7)}`}>
          <defs>
            <linearGradient id="ph-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0C6B58" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0C6B58" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#ph-fill)" />
          <path d={line} fill="none" stroke="#0C6B58" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={p.id} cx={x(i)} cy={y(p.value)} r="3.25" fill="#FFFFFF" stroke="#0C6B58" strokeWidth="2" />
          ))}
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-[11.5px] tnum text-faint">
        <span>{first.periodStart.slice(0, 7)}</span>
        <span>{latest.periodStart.slice(0, 7)}</span>
      </div>

      <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-faint">
        <strong className="font-semibold text-muted">Methodology.</strong>{" "}
        {series.methodology}
      </p>
    </Card>
  );
}
