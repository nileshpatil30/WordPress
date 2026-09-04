import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { isError, runEstimate } from "@/lib/api";
import { Badge, ButtonLink, Card, DataNotice, SectionHeading } from "@/components/ui";
import {
  IconBathroom, IconCalculator, IconClipboard, IconHvac, IconKitchen, IconLock,
  IconMagnifier, IconMailOff, IconPhoneOff, IconPin, IconRoofing, IconScales,
  IconShieldCheck, IconSiding, IconSliders, IconSolar, IconTrendUp, IconUpload,
  IconUsers, IconWindows,
} from "@/components/ui/Icons";
import { MaterialPhoto } from "@/components/site/MaterialPhoto";
import { materialPhoto } from "@/lib/photos";
import { assessQuote } from "@/lib/engine/quote";
import { PriceRangeBar } from "@/components/estimate/EstimateView";
import { usd } from "@/lib/format";
import { buildMetadata, JsonLd, SITE_NAME, siteUrl } from "@/lib/seo";
import { dataIllustration, heroPhoto } from "@/lib/photos";

export const metadata = buildMetadata({
  // The root layout's title template does not apply to its own segment,
  // so the brand is added explicitly here.
  title: "Roof replacement cost calculator and quote checker | Home Cost Doctor",
  description:
    "Independent roof replacement cost estimates by ZIP code, with a full cost breakdown, a confidence score, a contractor quote check and side-by-side quote comparison. No phone number required.",
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
  const hero = heroPhoto();
  const illustration = dataIllustration();


  // Two quotes against the hero estimate, scored by the same function the
  // quote checker uses. Illustrative prices, real verdicts - a hand-written
  // "Fair" badge would be a picture of the product rather than the product.
  const quoteDemo = sample && {
    a: { price: Math.round((sample.range.typical * 0.97) / 50) * 50, ...assessQuote(Math.round((sample.range.typical * 0.97) / 50) * 50, sample) },
    b: { price: Math.round((sample.range.high * 1.04) / 50) * 50, ...assessQuote(Math.round((sample.range.high * 1.04) / 50) * 50, sample) },
  };

  // Real ranges on the city cards. A card that shows a number a reader can act
  // on is worth more than one that says "local cost factors", and these come
  // from the same engine as every other price on the site.
  const [states, allMaterials] = await Promise.all([
    store.listStates(),
    store.listMaterials((await store.getServiceBySlug("roofing"))!.id),
  ]);
  const materialTiles = allMaterials.filter((m) => materialPhoto(m.slug));
  const cityCards = (await Promise.all(cities.map(async (c) => {
    const zips = await store.listZipCodes({ cityId: c.id });
    const zip = zips[0]?.code;
    if (!zip) return null;
    // The locally common material, not a national default - tile in Phoenix,
    // membrane in Jersey City. That makes the number locally true and the cards
    // NOT comparable to each other, which is why each card names its material.
    // A grid of bare numbers would read as "Las Vegas costs double Austin" when
    // what it actually says is "tile costs double asphalt".
    const slug = c.content?.commonMaterials?.[0] ?? "asphalt-architectural";
    const r = await runEstimate({
      serviceSlug: "roofing",
      input: {
        zip, areaMode: "roof", roofAreaSqft: 2000, stories: 1, material: slug,
        pitch: "moderate", complexity: "moderate", existingLayers: 1,
      },
    });
    if (isError(r)) return null;
    return {
      id: c.id, name: c.name, slug: c.slug,
      code: states.find((s) => s.id === c.stateId)?.code ?? "",
      low: r.estimate.range.low, high: r.estimate.range.high,
      material: allMaterials.find((m) => m.slug === slug)?.name ?? slug,
      note: c.content?.localFactors[0]?.title ?? "",
    };
  }))).filter((c): c is NonNullable<typeof c> => c !== null);

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
          "Independent roof replacement cost estimates, contractor quote checks and quote comparison for US homeowners.",
      }} />

      {/* ---------------------------- Hero ---------------------------- */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[1.02fr_1fr] lg:items-center lg:py-20">
          <div>
            <Badge tone="accent">Independent · Transparent · Built for homeowners</Badge>
            <h1 className="display mt-5 text-[40px] font-semibold text-ink sm:text-[54px]">
              Know what your home project{" "}
              <span className="text-accent">should cost.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17.5px] leading-relaxed text-ink-soft">
              Get an independent cost estimate, check a contractor&rsquo;s quote and
              compare your options &mdash; without giving us your phone number.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/roof-cost-calculator" size="lg" className="gap-2">
                <IconCalculator size={18} /> Calculate my roof cost
              </ButtonLink>
              <ButtonLink href="/quote-check" variant="secondary" size="lg" className="gap-2">
                <IconUpload size={18} /> Check a quote
              </ButtonLink>
            </div>

            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { Icon: IconPhoneOff, title: "No phone required", body: "Free estimates" },
                { Icon: IconShieldCheck, title: "Independent", body: "We work for you" },
                { Icon: IconClipboard, title: "Transparent", body: "See how we calculate" },
              ].map(({ Icon, title, body }) => (
                <li key={title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <Icon size={17} />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
                    <span className="block text-[12.5px] text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {sample && (
            <div className="relative">
              {hero && (
                // Decorative. The estimate card below is the evidence, so the
                // photograph is cropped short and hidden on small screens where
                // the number matters more than the mood.
                <img
                  src={hero} alt="" aria-hidden width={1448} height={1086}
                  fetchPriority="high" decoding="async"
                  className="hidden aspect-[16/10] w-full select-none rounded-2xl object-cover object-[50%_42%] lg:block"
                />
              )}
              <Card
                // Overlaps the photograph's bottom edge only. The first version
                // used a 220px band and swallowed the house almost entirely.
                className={`relative overflow-hidden shadow-[0_2px_4px_rgba(16,42,67,0.04),0_18px_50px_-16px_rgba(16,42,67,0.18)] ${
                  hero ? "lg:-mt-14 lg:ml-auto lg:w-[93%]" : ""}`}
              >
                <div className="border-b border-line px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-faint">
                      Example estimate
                    </p>
                    <Badge tone="neutral">Phoenix, AZ 85018</Badge>
                  </div>
                  <p className="display mt-2 text-[32px] font-semibold text-ink">
                    {usd(sample.range.low)} <span className="text-faint">&ndash;</span> {usd(sample.range.high)}
                  </p>
                  <div className="mt-3">
                    <PriceRangeBar low={sample.range.low} typical={sample.range.typical} high={sample.range.high} />
                  </div>
                </div>

                <div className="px-6 py-5">
                  <div className="space-y-2">
                    {sample.subtotals.map((s) => (
                      <div key={s.component} className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] text-muted">{s.label}</span>
                        <span className="text-[14px] font-semibold tnum text-ink">{usd(s.typical)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 border-t border-line pt-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-muted">Confidence</span>
                      <span className="text-[15px] font-semibold tnum text-ink">
                        {sample.confidence.score}<span className="text-faint">/100</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${sample.confidence.score}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[12px] text-faint">
                      {sample.confidence.band} &mdash; labour is government wage data,
                      materials are still modelled.
                    </p>
                  </div>

                  {/* The card looks like a calculator, so people try to type in
                      it. It is not interactive - it is a real estimate for an
                      example house, rendered by the same engine the calculator
                      runs. Say both things, and give the click somewhere to go.
                      The label deliberately differs from the hero button two
                      inches to the left; the same words twice in one viewport
                      reads as a stutter, not as emphasis. */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <p className="max-w-[15rem] text-[12px] leading-snug text-muted">
                      A 2,000&nbsp;sq&nbsp;ft roof in Phoenix, produced by the
                      calculator &mdash; not a mockup.
                    </p>
                    <ButtonLink href="/roof-cost-calculator" size="sm" className="gap-1.5 whitespace-nowrap">
                      Calculate for my roof <span aria-hidden>&rarr;</span>
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* -------------------------- Materials -------------------------- */}
      {/* Directly under the hero because it answers the question a homeowner
          has before they have a budget: what are my options and what do they
          even look like. The photographs were previously only on a secondary
          page.

          It used to run full-bleed at 220px a tile, which made a supporting
          strip the loudest thing on the page and broke the 6xl rhythm every
          other section keeps. Now it sits in the container at 150px, with the
          name underneath in body text rather than reversed out of a gradient -
          smaller type over a photograph is exactly where legibility goes, and
          the longest names were being clipped by the tile edge. */}
      {materialTiles.length > 0 && (
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Materials we price
              </p>
              <Link
                href="/roofing-cost"
                className="whitespace-nowrap text-[13px] font-semibold text-accent hover:underline"
              >
                Compare materials &rarr;
              </Link>
            </div>

            {/* Bleeds to the viewport edge so a half-cut tile signals the row
                scrolls, while the first one still lines up with the heading. */}
            <ul className="scroll-x -mx-5 mt-5 flex gap-3 px-5">
              {materialTiles.map((m) => (
                <li key={m.id} className="w-[150px] shrink-0">
                  <Link href="/roofing-cost" className="group block">
                    <MaterialPhoto
                      src={materialPhoto(m.slug)}
                      name={m.name}
                      className="w-full rounded-lg transition-opacity group-hover:opacity-90"
                    />
                    <span className="mt-2 block min-h-[2.2rem] text-[12px] font-medium leading-snug text-muted group-hover:text-accent">
                      {m.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ------------------------- How it works ------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <SectionHeading eyebrow="How it works" title="Five simple steps to a smarter decision" />
        <ol className="scroll-x mt-9 flex items-start gap-2 md:grid md:grid-cols-5 md:gap-4">
          {[
            { n: "01", Icon: IconCalculator, label: "Calculate", body: "Tell us about your project and get an estimated cost range.", href: "/roof-cost-calculator" },
            { n: "02", Icon: IconUpload, label: "Check", body: "Upload your contractor's quote and we'll compare it with the modelled range.", href: "/quote-check" },
            { n: "03", Icon: IconMagnifier, label: "Understand", body: "See what is driving the price and where the quote differs.", href: "/methodology" },
            { n: "04", Icon: IconScales, label: "Compare", body: "Compare multiple quotes on scope, price and value.", href: "/compare-quotes" },
            { n: "05", Icon: IconUsers, label: "Hire", body: "Request local roofing quotes when you're ready.", href: "/hire" },
          ].map(({ n, Icon, label, body, href }) => (
            <li key={n} className="relative min-w-[13rem] flex-1">
              {/* Connector, drawn between tiles rather than after the last. */}
              {n !== "05" && (
                <span aria-hidden className="absolute left-[3.6rem] top-6 hidden h-px w-[calc(100%-3.6rem)] bg-line md:block">
                  <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 border-r border-t border-line-strong" />
                </span>
              )}
              <Link href={href} className="group relative block">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-accent-line bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  <Icon size={22} />
                </span>
                <span className="mt-4 block text-[12px] font-semibold tnum tracking-[0.1em] text-faint">{n}</span>
                <span className="mt-0.5 block text-[16px] font-semibold text-ink group-hover:text-accent">{label}</span>
                <span className="mt-1.5 block text-[13.5px] leading-relaxed text-muted">{body}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------- The three questions -------------------- */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Three questions, answered properly"
            title="Not another roofing calculator"
            description="Directories send you to contractors. Cost guides give you a national average. Neither tells you whether the number in front of you makes sense."
          />
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <FeatureCard
              href="/roof-cost-calculator" Icon={IconCalculator}
              title="What should my roof cost?"
              body="Answer three questions for a first range, then refine any assumption &mdash; pitch, layers, decking allowance, access &mdash; and watch the price move. Every line item shows how it was calculated."
              cta="Open the calculator"
            />
            <FeatureCard
              href="/quote-check" Icon={IconUpload} highlight
              title="Is my contractor's quote fair?"
              body="Compare a real quote to the modelled range. If it sits outside, we re-run the model changing one assumption at a time and tell you which single change would account for the gap."
              cta="Check a quote"
            />
            <FeatureCard
              href="/compare-quotes" Icon={IconScales}
              title="How do my quotes compare?"
              body="Enter several quotes with their scope. We price back in what each one leaves out, so a quote that is cheapest only because it omits the tear-off stops looking cheapest."
              cta="Compare quotes"
            />
          </div>
        </div>
      </section>

      {/* ------------------------ Quote comparison ------------------------ */}
      {/* The clearest possible statement of what this site is for: the same
          roof, two prices, and the reason they differ. The verdicts come from
          assessQuote - the same function the quote checker runs - so this is
          the product working, not a picture of it. */}
      {quoteDemo && (
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Compare properly"
            title="Two quotes for the same roof"
            description="The cheaper quote is not automatically the better one. We compare what each includes and price back in what it leaves out, so the difference stops being a mystery."
          />
          <div className="mt-9 grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
            {([
              { label: "Contractor A", q: quoteDemo.a, scope: [
                ["Tear-off and disposal", true], ["New underlayment", true],
                ["Lifetime material warranty", true], ["Ridge vent", true],
                ["Decking allowance", false],
              ] },
              { label: "Contractor B", q: quoteDemo.b, scope: [
                ["Tear-off and disposal", true], ["New underlayment", true],
                ["Lifetime material warranty", true], ["Ridge vent", true],
                ["Decking allowance", true],
              ] },
            ] as const).map(({ label, q, scope }) => {
              const high = q.verdict === "above" || q.verdict === "well-above";
              return (
                <Card key={label} className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13.5px] font-semibold text-muted">{label}</p>
                    <Badge tone={high ? "caution" : "positive"}>
                      {high ? "Above range" : "Within range"}
                    </Badge>
                  </div>
                  <p className="display mt-2 text-[30px] font-semibold text-ink">{usd(q.price)}</p>
                  <p className="mt-1 text-[12.5px] text-faint">
                    {q.deltaVsTypicalPct > 0 ? "+" : ""}{q.deltaVsTypicalPct}% against our typical figure
                  </p>
                  <ul className="mt-4 space-y-2 border-t border-line pt-4">
                    {scope.map(([item, included]) => (
                      <li key={item} className="flex items-start gap-2 text-[13.5px]">
                        <span className={`mt-[3px] shrink-0 ${included ? "text-accent" : "text-caution"}`}>
                          {included ? <TickIcon /> : <PlusIcon />}
                        </span>
                        <span className={included ? "text-ink-soft" : "text-caution"}>
                          {item}{included ? "" : " — not stated"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}

            <Card className="flex flex-col justify-center bg-sunken/60 p-6">
              <p className="text-[15px] font-semibold text-ink">
                So which one is actually cheaper?
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                A is {usd(quoteDemo.b.price - quoteDemo.a.price)} less and says
                nothing about the decking. If the deck needs work that becomes a
                change order after the tear-off, when you have no leverage. B
                includes an allowance &mdash; but an allowance is worth perhaps
                two thousand on a roof this size, so it explains part of the gap,
                not all of it. The rest is a question for B.
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
                Scope shown is illustrative. The prices and verdicts are computed
                by the same engine as the rest of the site, against the estimate
                at the top of this page.
              </p>
              <ButtonLink href="/compare-quotes" variant="secondary" size="sm" className="mt-5 self-start">
                Compare your own quotes
              </ButtonLink>
            </Card>
          </div>
        </section>
      )}

      {/* ---------------------------- Cities ---------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Local pricing that makes sense"
            title="Roofing costs, city by city"
            description="Local costs vary with labour, climate, permitting and the materials that are actually common there. A city gets a page when we have something specific and true to say about it."
          />
          <ButtonLink href="/roofing-cost" variant="secondary" size="sm" className="whitespace-nowrap">
            View all cities &rarr;
          </ButtonLink>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cityCards.map((c) => (
            <Link
              key={c.id}
              href={`/roofing-cost/${c.slug}`}
              className="group flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent-line"
            >
              <p className="text-[15.5px] font-semibold text-ink group-hover:text-accent">
                {c.name}{c.code && `, ${c.code}`}
              </p>
              <p className="mt-1 text-[15px] font-semibold tnum text-accent">
                {usd(c.low)} &ndash; {usd(c.high)}
              </p>
              <p className="mt-0.5 text-[12px] text-faint">{c.material} &middot; 2,000 sq ft</p>
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{c.note}</p>
            </Link>
          ))}
          <Link
            href="/roofing-cost"
            className="group flex flex-col justify-center rounded-xl border border-dashed border-line-strong p-5 transition-colors hover:border-accent-line"
          >
            <span className="text-accent"><IconPin size={22} /></span>
            <span className="mt-2 text-[15.5px] font-semibold text-ink group-hover:text-accent">All cities</span>
            <span className="mt-1 text-[12.5px] text-muted">See every location we cover</span>
          </Link>
        </div>
        <p className="mt-4 text-[12.5px] text-faint">
          Each range is a representative 2,000 sq ft single-storey roof in that
          city, priced in the material most common there &mdash; so Phoenix and
          Las Vegas are tile while Austin is asphalt, and the cards are not
          directly comparable to one another. Your roof is not the representative
          one either; the calculator prices yours.
        </p>
      </section>

      {/* ------------------------- Transparency ------------------------- */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start">
            <div>
              <SectionHeading
                eyebrow="Transparent methodology"
                title="We show our work"
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
                <ButtonLink href="/methodology" variant="secondary">See how we calculate it</ButtonLink>
                <ButtonLink href="/data-sources" variant="ghost">Data sources and licences</ButtonLink>
              </div>
            </div>

            <div className="space-y-4">
              <DataNotice />
              {/* The illustration used to sit in a full-width 128px band above
                  the body. It is a 4:3 line drawing on white, so object-contain
                  left most of that band empty, and the icon square directly
                  underneath meant the card carried two graphics for one idea.
                  Now the drawing IS the graphic, at icon scale. */}
              <Card className="p-6">
                {illustration ? (
                  <img
                    src={illustration} alt="" aria-hidden width={800} height={600}
                    loading="lazy" decoding="async"
                    className="-ml-1.5 h-14 w-auto object-contain object-left"
                  />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent">
                    <IconTrendUp size={20} />
                  </span>
                )}
                <p className="mt-3.5 text-[17px] font-semibold text-ink">Always improving</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  We combine public government data, observed market prices and
                  homeowner submissions to keep the numbers current. Every price is
                  anchored to a date and carried forward on a published index, so
                  the estimate you get today is not last year&rsquo;s number in a
                  new wrapper.
                </p>
                <Link href="/data-sources" className="mt-4 inline-block text-[13.5px] font-semibold text-accent hover:underline">
                  Learn about our data &rarr;
                </Link>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Privacy --------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <Card className="p-7 sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
                <IconLock size={22} />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
                Your data is yours.
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                The estimate, the quote check and the comparison all work without
                a phone number, an email address or an account. We only ask for
                contact details at the point where you tell us you want local
                contractors to call you &mdash; because that is the only step
                where somebody has to.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3 lg:gap-3">
              {[
                { Icon: IconMailOff, title: "No spam", body: "We don't sell your details." },
                { Icon: IconPhoneOff, title: "No pressure", body: "No contractor calls unless you ask." },
                { Icon: IconSliders, title: "You're in control", body: "Nothing is shared without your say-so." },
              ].map(({ Icon, title, body }) => (
                <li key={title} className="rounded-xl border border-line bg-sunken/50 p-4">
                  <span className="text-accent"><Icon size={20} /></span>
                  <span className="mt-2.5 block text-[14px] font-semibold text-ink">{title}</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">{body}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* ---------------------------- Roadmap ---------------------------- */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <SectionHeading
            eyebrow="What comes next"
            title="Roofing first, done properly"
            description="Launching twenty categories at once produces twenty shallow ones. Each new service arrives as a data set plus one engine module, so the calculator, quote tools and local pages work for it on day one."
          />
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[{ id: "live-roofing", shortName: "Roofing", live: true }, ...planned.map((p) => ({ ...p, live: false }))]
              .map((svc) => {
                const Icon = SERVICE_ICON[svc.shortName] ?? IconRoofing;
                return (
                  <li
                    key={svc.id}
                    className={`rounded-xl border px-3 py-4 text-center ${
                      svc.live ? "border-accent-line bg-accent-soft" : "border-line bg-surface"}`}
                  >
                    <span className={`inline-flex ${svc.live ? "text-accent" : "text-faint"}`}>
                      <Icon size={24} />
                    </span>
                    <span className="mt-2 block text-[13.5px] font-semibold text-ink">{svc.shortName}</span>
                    <span className={`mt-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] ${
                      svc.live ? "text-accent" : "text-faint"}`}>
                      {svc.live ? "Live" : "Planned"}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      </section>
    </>
  );
}

function FeatureCard({ href, Icon, title, body, cta, highlight = false }: {
  href: string; Icon: (p: { size?: number }) => React.ReactElement;
  title: string; body: string; cta: string; highlight?: boolean;
}) {
  return (
    <Card
      className={`flex flex-col p-6 transition-colors hover:border-accent-line ${
        highlight ? "border-accent-line bg-accent-soft/40" : ""}`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon size={21} />
      </span>
      <h3 className="mt-4 text-[18.5px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
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

const SERVICE_ICON: Record<string, (p: { size?: number }) => React.ReactElement> = {
  Roofing: IconRoofing, Solar: IconSolar, HVAC: IconHvac, Windows: IconWindows,
  Siding: IconSiding, Kitchen: IconKitchen, Bathroom: IconBathroom,
};

function TickIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="m3 8.4 3.1 3.1L13 4.6" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Not a cross: a missing line item is an open question, not a failure. */
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.8v6.4M4.8 8h6.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
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
