import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { isError, runEstimate } from "@/lib/api";
import { Badge, ButtonLink, Card, DataNotice, SectionHeading } from "@/components/ui";
import { PriceRangeBar } from "@/components/estimate/EstimateView";
import { ZipStart } from "@/components/site/ZipStart";
import { usd } from "@/lib/format";
import { buildMetadata, JsonLd, SITE_NAME, siteUrl } from "@/lib/seo";

export const metadata = buildMetadata({
  // The root layout's title template does not apply to its own segment,
  // so the brand is added explicitly here.
  title: "Roof replacement cost calculator and quote checker | Home Cost Doctor",
  description:
    "Personalised roof replacement estimates by ZIP code, with a full cost breakdown, a confidence score, a contractor quote fairness check and side-by-side quote comparison.",
  path: "/",
});

export default async function HomePage() {
  const store = await getStore();
  const [cities, services] = await Promise.all([
    store.listCities({ publishedOnly: true }),
    store.listServices(),
  ]);

  // A real, server-computed estimate in the hero. Not a mockup - the same code
  // path the calculator uses, so what you see is what the product does.
  const demo = await runEstimate({
    serviceSlug: "roofing",
    input: {
      zip: "85018", areaMode: "roof", roofAreaSqft: 2000, stories: 2,
      material: "asphalt-architectural", pitch: "moderate", complexity: "moderate",
      existingLayers: 1,
    },
  });
  const sample = isError(demo) ? null : demo.estimate;
  const planned = services.filter((s) => s.status === "planned");

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: SITE_NAME,
        url: siteUrl("/"),
        applicationCategory: "FinanceApplication",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description:
          "Local roof replacement cost estimates, contractor quote fairness checks and quote comparison for US homeowners.",
      }} />

      {/* ---------------------------- Hero ---------------------------- */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
          <div>
            <Badge tone="accent">Phase 1 · Roof replacement · United States</Badge>
            <h1 className="display mt-5 text-[42px] font-semibold text-ink sm:text-[56px]">
              Know what your home project should cost.
            </h1>
            {/* The product in one sentence, including the thing nobody else
                will say: you do not have to give us your phone number. */}
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-soft">
              Get an independent cost estimate, check a contractor&rsquo;s quote and
              compare your options &mdash; without handing over your phone number.
            </p>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted">
              Not a national average. A modelled range for your ZIP code, your
              roof size, your material and your site, with every line item shown,
              every assumption stated, and a confidence score that goes down when
              the data is thin.
            </p>

            <div className="mt-8 max-w-md">
              <ZipStart />
            </div>

            <ul className="mt-8 grid gap-2.5 text-[14px] text-muted sm:grid-cols-2">
              {[
                "Independent \u2014 no contractor required",
                "Full cost breakdown, not one number",
                "Compare quotes on scope, not price",
                "Every price is dated and sourced",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckIcon />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {sample && (
            <Card className="overflow-hidden shadow-[0_1px_2px_rgba(16,22,20,0.04),0_12px_40px_-12px_rgba(16,22,20,0.14)]">
              <div className="border-b border-line px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-faint">
                    Live example
                  </p>
                  <Badge tone="neutral">Phoenix, AZ 85018</Badge>
                </div>
                <p className="mt-1.5 text-[13px] text-muted">
                  2,000 sq ft roof · architectural shingle · 2 storeys · 1 layer to tear off
                </p>
              </div>

              <div className="px-6 py-6">
                <p className="display text-[34px] font-semibold text-ink">
                  {usd(sample.range.low)} <span className="text-faint">–</span> {usd(sample.range.high)}
                </p>
                <div className="mt-4">
                  <PriceRangeBar low={sample.range.low} typical={sample.range.typical} high={sample.range.high} />
                </div>

                <div className="mt-6 space-y-2 border-t border-line pt-5">
                  {sample.subtotals.map((s) => (
                    <div key={s.component} className="flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] text-muted">{s.label}</span>
                      <span className="text-[14px] font-semibold tnum text-ink">{usd(s.typical)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="text-[13px] text-muted">Confidence</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold tnum text-ink">
                      {sample.confidence.score}/100
                    </span>
                    <Badge tone={sample.confidence.band === "High" ? "positive" : "caution"}>
                      {sample.confidence.band}
                    </Badge>
                  </span>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-faint">
                  Labour here is government wage data. Materials are still
                  modelled, which is what holds the score down &mdash; and the
                  score rises on its own as observed pricing lands.
                </p>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* ------------------------ The journey ------------------------ */}
      {/* The whole product in one line. A homeowner arriving cold should be
          able to see where this ends before deciding to start. */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <ol className="scroll-x flex items-stretch gap-2 md:grid md:grid-cols-5 md:gap-3">
            {[
              { n: "01", label: "Measure", body: "Work out your roof size", href: "/roof-calculator" },
              { n: "02", label: "Estimate", body: "See what it should cost", href: "/roof-cost-calculator" },
              { n: "03", label: "Check", body: "Test a quote against it", href: "/quote-check" },
              { n: "04", label: "Compare", body: "Weigh quotes on scope", href: "/compare-quotes" },
              { n: "05", label: "Hire", body: "Only when you want to", href: "/hire" },
            ].map((step) => (
              <li key={step.n} className="min-w-[9.5rem] flex-1">
                <Link
                  href={step.href}
                  className="group flex h-full flex-col rounded-lg border border-line bg-surface px-3.5 py-3 transition-colors hover:border-accent-line"
                >
                  <span className="text-[11px] font-semibold tnum tracking-[0.1em] text-faint">
                    {step.n}
                  </span>
                  <span className="mt-1 text-[14px] font-semibold text-ink group-hover:text-accent">
                    {step.label}
                  </span>
                  <span className="mt-0.5 text-[12.5px] leading-snug text-muted">{step.body}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------- The three questions -------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <SectionHeading
          eyebrow="What this is for"
          title="Three questions, answered properly"
          description="Directories send you to contractors. Cost guides give you a national average. Neither tells you whether the number in front of you makes sense."
        />
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          <FeatureCard
            href="/roof-cost-calculator"
            step="01"
            title="What should my roof cost?"
            body="Answer three questions for a first range, then refine any assumption &mdash; pitch, layers, decking allowance, access &mdash; and watch the price move. Every line item shows how it was calculated."
            cta="Open the calculator"
          />
          <FeatureCard
            href="/quote-check"
            step="02"
            title="Is my contractor's quote fair?"
            body="Compare a real quote to the modelled range. If it sits outside, we re-run the model changing one assumption at a time and tell you which single change would account for the gap."
            cta="Check a quote"
          />
          <FeatureCard
            href="/compare-quotes"
            step="03"
            title="How do my quotes compare?"
            body="Enter several quotes with their scope. We price back in what each one leaves out, so a quote that is cheapest only because it omits the tear-off stops looking cheapest."
            cta="Compare quotes"
          />
        </div>
      </section>

      {/* ------------------------- Transparency ------------------------- */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <SectionHeading
                eyebrow="Why you can argue with it"
                title="The estimate shows its working"
                description="An estimate you cannot interrogate is just a number someone made up. Ours breaks into the same components a contractor uses to build a price, and tells you where each one came from."
              />
              <div className="mt-8 space-y-5">
                <Detail
                  title="Every price is dated and attributed"
                  body="Each pricing row carries a source, a licence note, the period it describes, the date we collected it and a data-status flag: verified, modelled, or sample."
                />
                <Detail
                  title="The confidence score can go down"
                  body="ZIP-level data earns more than national fallback. Stale data loses points. While any sample data is in the mix, the score is capped at 60 and says so."
                />
                <Detail
                  title="Ranges are combined, not stacked"
                  body="Adding every component's worst case together describes a job that does not exist. Component uncertainties are combined in quadrature, assuming partial independence."
                />
                <Detail
                  title="Nothing multiplicative is hardcoded"
                  body="Every factor - pitch, storeys, complexity, access, overhead - is a database row an administrator can retune without a deploy."
                />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/methodology" variant="secondary">Read the methodology</ButtonLink>
                <ButtonLink href="/data-sources" variant="ghost">Data sources and licences</ButtonLink>
              </div>
            </div>

            <div className="space-y-4">
              <DataNotice />
              {sample && (
                <Card className="p-6">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-faint">
                    Confidence, itemised
                  </p>
                  <ul className="mt-4 space-y-3">
                    {sample.confidence.breakdown.map((b) => (
                      <li key={b.key}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[13.5px] font-medium text-ink-soft">{b.label}</span>
                          <span className="shrink-0 text-[13px] tnum text-muted">{b.earned}/{b.max}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-sunken">
                          <div className="h-full rounded-full bg-accent/60" style={{ width: `${(b.earned / b.max) * 100}%` }} />
                        </div>
                        <p className="mt-1 text-[12px] leading-snug text-faint">{b.detail}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------- Cities ---------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <SectionHeading
          eyebrow="Local pages"
          title="Roofing costs, city by city"
          description="A city gets a page when we have something specific and true to say about it - local code, climate, permitting, materials that are actually common there. Not because the keyword has volume."
        />
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((c) => (
            <Link
              key={c.id}
              href={`/roofing-cost/${c.slug}`}
              className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent-line"
            >
              <p className="text-[16px] font-semibold text-ink group-hover:text-accent">
                {c.name} roofing costs
              </p>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
                {c.content?.localFactors[0]?.title ?? "Local cost factors and calculator"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------- Roadmap ---------------------------- */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <SectionHeading
            eyebrow="What comes next"
            title="Roofing first, done properly"
            description="Launching twenty categories at once produces twenty shallow ones. Each new service arrives as a data set plus one engine module, so the calculator, quote tools and local pages work for it on day one."
          />
          <div className="mt-8 flex flex-wrap gap-2">
            <Badge tone="accent">Roofing · live</Badge>
            {planned.map((s) => <Badge key={s.id}>{s.shortName} · planned</Badge>)}
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({ href, step, title, body, cta }: {
  href: string; step: string; title: string; body: string; cta: string;
}) {
  return (
    <Card className="flex flex-col p-6 transition-colors hover:border-accent-line">
      <span className="text-[12px] font-semibold tnum tracking-[0.1em] text-accent">{step}</span>
      <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      <p
        className="mt-2.5 flex-1 text-[14px] leading-relaxed text-muted"
        dangerouslySetInnerHTML={{ __html: body }}
      />
      <Link href={href} className="mt-5 text-[14px] font-semibold text-accent hover:underline">
        {cta} &rarr;
      </Link>
    </Card>
  );
}

function Detail({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-accent-line pl-4">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-1 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7.25" stroke="#B9D4CB" strokeWidth="1.5" />
      <path d="m5 8.2 2.1 2.1L11 6.4" stroke="#0C6B58" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
