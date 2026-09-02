import Link from "next/link";
import { notFound } from "next/navigation";
import { isError, runEstimate } from "@/lib/api";
import { assessQuote } from "@/lib/engine/quote";
import { decodeShare } from "@/lib/share";
import { EstimateResultView, PriceRangeBar } from "@/components/estimate/EstimateView";
import { Badge, ButtonLink, Callout, Card, DataNotice } from "@/components/ui";
import { pct, usd } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const input = decodeShare(token);
  if (!input) return buildMetadata({ title: "Shared estimate", description: "", path: `/r/${token}`, noindex: true });

  const result = await runEstimate({ serviceSlug: "roofing", input });
  const title = isError(result)
    ? "Shared roof cost estimate"
    : `Roof estimate: ${usd(result.estimate.range.low)}–${usd(result.estimate.range.high)} in ${result.estimate.geo.label}`;

  return buildMetadata({
    title,
    description: "A modelled cost range for this specific roof, with the full breakdown and a confidence score.",
    path: `/r/${token}`,
    // Shared links are personal working documents, not content we want indexed.
    noindex: true,
  });
}

/**
 * A shared result.
 *
 * The whole point of this page is that someone can send it to their spouse, or
 * paste it into a thread where somebody asked "is this quote fair?", and the
 * recipient sees a real answer without typing anything. That is the only
 * distribution mechanism here that scales without anyone pretending to be a
 * neutral stranger.
 */
export default async function SharedResultPage({ params }: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const input = decodeShare(token);
  if (!input) notFound();

  const result = await runEstimate({ serviceSlug: "roofing", input });
  if (isError(result)) notFound();

  const { estimate } = result;
  const quoted = Number(input.quotedPrice);
  const assessment = Number.isFinite(quoted) && quoted > 0
    ? assessQuote(quoted, estimate) : null;

  const params2 = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) params2.set(k, String(v));
  const continueHref = `/roof-cost-calculator?${params2.toString()}`;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">Shared result</Badge>
        <span className="text-[13px] text-faint">
          Recalculated just now against current pricing data.
        </span>
      </div>

      <h1 className="display mt-4 text-[30px] font-semibold text-ink sm:text-[38px]">
        {assessment
          ? "Is this roofing quote fair?"
          : `Roof replacement estimate for ${estimate.geo.label}`}
      </h1>

      {assessment && (
        <Card className="mt-7 overflow-hidden">
          <div className="border-b border-line px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                  The quote
                </p>
                <p className="display mt-2 text-[34px] font-semibold text-ink">
                  {usd(assessment.quotedPrice)}
                </p>
              </div>
              <Badge tone={assessment.verdict === "within" ? "positive"
                : assessment.verdict.includes("well") ? "danger" : "caution"}>
                {assessment.headline}
              </Badge>
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                Modelled range for this project
              </p>
              <p className="mt-1.5 text-[22px] font-semibold tnum text-ink">
                {usd(estimate.range.low)} <span className="text-faint">–</span> {usd(estimate.range.high)}
              </p>
              <div className="mt-4">
                <PriceRangeBar
                  low={estimate.range.low} typical={estimate.range.typical} high={estimate.range.high}
                  marker={{
                    value: assessment.quotedPrice, label: "The quote",
                    tone: assessment.verdict === "within" ? "positive"
                      : assessment.verdict.includes("well") ? "danger" : "caution",
                  }}
                />
              </div>
              <p className="mt-4 text-[13.5px] text-muted">
                {pct(assessment.deltaVsTypicalPct, 1)} against the typical figure of{" "}
                <span className="font-semibold tnum text-ink">{usd(estimate.range.typical)}</span>.
              </p>
            </div>
          </div>
          <div className="px-6 py-5 sm:px-8">
            <p className="text-[14.5px] leading-relaxed text-ink-soft">{assessment.summary}</p>
          </div>
        </Card>
      )}

      <div className="mt-6">
        <EstimateResultView estimate={estimate} compact={Boolean(assessment)} />
      </div>

      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
          This is someone else&rsquo;s roof. Do yours.
        </h2>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">
          Three questions gets you a range for your own property, with every line
          item shown. Or upload a quote you already have and we will read it for you.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/roof-cost-calculator" size="lg">Calculate my roof cost</ButtonLink>
          <ButtonLink href="/quote-check" variant="secondary" size="lg">Check my own quote</ButtonLink>
          <ButtonLink href={continueHref} variant="ghost" size="lg">Start from these numbers</ButtonLink>
        </div>
      </Card>

      <div className="mt-6"><DataNotice compact /></div>

      <div className="mt-6">
        <Callout tone="neutral" title="What this link is">
          The project details are encoded in the address itself &mdash; nothing
          about this estimate is stored on our servers, and anyone with the link
          sees the same page. It contains no name, address or contact details.
          Read the{" "}
          <Link href="/methodology" className="font-medium text-accent underline underline-offset-2">
            methodology
          </Link>{" "}
          for how the number is built.
        </Callout>
      </div>
    </div>
  );
}
