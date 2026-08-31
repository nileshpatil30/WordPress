import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { buildLocalScenarios } from "@/lib/local-estimates";
import { RoofCalculator } from "@/components/calculator/RoofCalculator";
import {
  BreakdownTable, ConfidenceMeter, FreshnessLine, PriceRangeBar, ProvenancePanel,
} from "@/components/estimate/EstimateView";
import { PriceHistory } from "@/components/charts/PriceHistory";
import { Badge, ButtonLink, Card, DataNotice, SectionHeading } from "@/components/ui";
import { usd } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, JsonLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const store = await getStore();
  const [services, cities] = await Promise.all([
    store.listServices({ liveOnly: true }),
    store.listCities({ publishedOnly: true }),
  ]);
  return services.flatMap((s) => cities.map((c) => ({ serviceCost: s.costPathSlug, city: c.slug })));
}

export async function generateMetadata({ params }: {
  params: Promise<{ serviceCost: string; city: string }>;
}) {
  const { serviceCost, city } = await params;
  const store = await getStore();
  const [service, cityRow] = await Promise.all([
    store.getServiceByCostPath(serviceCost), store.getCityBySlug(city),
  ]);
  if (!service || !cityRow) return {};
  const state = (await store.listStates()).find((s) => s.id === cityRow.stateId);
  return buildMetadata({
    title: `Roof replacement cost in ${cityRow.name}, ${state?.code} (${new Date().getFullYear()})`,
    description: `What a roof replacement costs in ${cityRow.name}: local price ranges by roof size and material, the local factors that drive them, and a calculator for your own roof.`,
    path: `/${serviceCost}/${city}`,
  });
}

export default async function CityCostPage({ params }: {
  params: Promise<{ serviceCost: string; city: string }>;
}) {
  const { serviceCost, city: citySlug } = await params;
  const store = await getStore();
  const [service, city] = await Promise.all([
    store.getServiceByCostPath(serviceCost), store.getCityBySlug(citySlug),
  ]);
  if (!service || service.status !== "live" || !city || !city.isPublished || !city.content) notFound();

  const [states, zips, materials, allSeries] = await Promise.all([
    store.listStates(), store.listZipCodes({ cityId: city.id }),
    store.listMaterials(service.id), store.listIndexSeries(),
  ]);
  const state = states.find((s) => s.id === city.stateId);
  const projectTypes = await store.listProjectTypes(service.id);

  const anchorZip = zips[0]?.code ?? "00000";
  const scenarios = await buildLocalScenarios(
    anchorZip, materials, city.content.commonMaterials, city.content.representativeProjectType);
  if (!scenarios) notFound();

  const rep = scenarios.representative;
  const eligibleZips = zips.filter((z) => z.pageEligible);
  const repProjectType = projectTypes.find(
    (p) => p.slug === (city.content!.representativeProjectType ?? "full-replacement"));

  // Only a country-scoped sample series exists today; a city with no series
  // renders the honest empty state rather than an invented trend.
  const series = allSeries.find((s) => s.geoScopeType === "country") ?? null;
  const points = series ? await store.listIndexPoints(series.id) : [];

  const place = `${city.name}, ${state?.code}`;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Roofing cost", path: `/${serviceCost}` },
        { name: place, path: `/${serviceCost}/${citySlug}` },
      ])} />
      <JsonLd data={faqJsonLd(city.content.faqs)} />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-[13px] text-faint">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-2">/</span>
          <Link href={`/${serviceCost}`} className="hover:text-ink">Roofing cost</Link>
          <span className="mx-2">/</span>
          <span className="text-muted">{place}</span>
        </nav>

        {/* ------------------------- Headline ------------------------- */}
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <div>
            <Badge tone="accent">{place}</Badge>
            <h1 className="display mt-4 text-[34px] font-semibold text-ink sm:text-[44px]">
              Roof replacement cost in {city.name}
            </h1>
            <p className="mt-5 text-[16.5px] leading-relaxed text-muted">{city.content.summary}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/roof-cost-calculator?zip=${anchorZip}`} size="lg">
                Calculate my roof cost
              </ButtonLink>
              <ButtonLink href={`/quote-check?zip=${anchorZip}`} variant="secondary" size="lg">
                Check a quote
              </ButtonLink>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-line bg-gradient-to-b from-accent-soft/70 to-surface px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                Typical {city.name} roof replacement
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                2,000 sq ft roof · {materials.find((m) => m.slug === city.content!.commonMaterials[0])?.name.toLowerCase()} · {repProjectType?.name.toLowerCase()} · moderate pitch
              </p>
              <p className="display mt-4 text-[32px] font-semibold text-ink">
                {usd(rep.range.low)} <span className="text-faint">–</span> {usd(rep.range.high)}
              </p>
              <div className="mt-4">
                <PriceRangeBar low={rep.range.low} typical={rep.range.typical} high={rep.range.high} />
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-accent-line/50 pt-4 text-[13px] text-muted">
                <span>Typical <span className="font-semibold tnum text-ink">{usd(rep.range.typical)}</span></span>
                <span>Midpoint <span className="font-semibold tnum text-ink">{usd(rep.midpoint)}</span></span>
                <span><span className="font-semibold tnum text-ink">{usd(rep.perSquare.typical)}</span>/square</span>
              </div>
              <div className="mt-3"><FreshnessLine estimate={rep} /></div>
              {city.content.representativeProjectType && city.content.representativeProjectType !== "full-replacement" && (
                <p className="mt-3 rounded-lg bg-surface/70 px-3 py-2 text-[12px] leading-relaxed text-muted">
                  We headline the job that is actually most common here, not the
                  most expensive version of it. A brand-new tile roof costs
                  considerably more &mdash; see the material table below.
                </p>
              )}
            </div>
            <div className="px-6 py-6">
              <ConfidenceMeter confidence={rep.confidence} />
            </div>
          </Card>
        </div>

        <div className="mt-10 max-w-3xl"><DataNotice /></div>

        {/* ------------------------- Calculator ------------------------- */}
        <section className="mt-16" id="calculator">
          <SectionHeading
            eyebrow="Your roof, not the average one"
            title={`${city.name} roof cost calculator`}
            description="The numbers above describe a representative local project. This one describes yours."
          />
          <div className="mt-8">
            <RoofCalculator
              materials={materials}
              projectTypes={projectTypes}
              initialValues={{
                zip: anchorZip, areaMode: "roof", roofAreaSqft: 2000,
                material: city.content.commonMaterials[0],
                projectType: city.content.representativeProjectType ?? "full-replacement",
              }}
              autoStart
            />
          </div>
        </section>

        {/* --------------------- Local price tables --------------------- */}
        <section className="mt-16">
          <SectionHeading
            eyebrow="Local ranges"
            title={`${city.name} roofing costs by size and material`}
            description={`Sizes use the local common job (${repProjectType?.name.toLowerCase()}). The material table below is always a full replacement, so materials stay comparable with each other.`}
          />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {scenarios.bySize.map((s) => (
              <Card key={s.label} className="p-5">
                <p className="text-[13px] font-semibold text-ink">{s.label}</p>
                <p className="mt-0.5 text-[12px] text-faint">{s.roofAreaSqft.toLocaleString()} sq ft roof</p>
                <p className="mt-3 text-[20px] font-semibold tnum text-ink">{usd(s.estimate.range.low)}</p>
                <p className="text-[13px] tnum text-muted">to {usd(s.estimate.range.high)}</p>
              </Card>
            ))}
          </div>

          <div className="scroll-x mt-8">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <caption className="sr-only">Roof replacement cost by material in {place}</caption>
              <thead>
                <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                  <th className="pb-2.5 pr-4 font-semibold">Material (common locally)</th>
                  <th className="pb-2.5 pr-4 text-right font-semibold">2,000 sq ft roof</th>
                  <th className="pb-2.5 pr-4 text-right font-semibold">Per square</th>
                  <th className="pb-2.5 text-right font-semibold">Service life</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.byMaterial.map(({ material, estimate }) => (
                  <tr key={material.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-[14.5px] font-medium text-ink">{material.name}</td>
                    <td className="py-3 pr-4 text-right text-[14px] tnum text-ink">
                      {usd(estimate.range.low)} – {usd(estimate.range.high)}
                    </td>
                    <td className="py-3 pr-4 text-right text-[14px] tnum text-muted">
                      {usd(estimate.perSquare.typical)}
                    </td>
                    <td className="py-3 text-right text-[14px] tnum text-muted">
                      {material.expectedLifeYearsMin}–{material.expectedLifeYearsMax} yrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------ Local factors ------------------------ */}
        <section className="mt-16">
          <SectionHeading
            eyebrow="Why prices here are what they are"
            title={`What drives roofing costs in ${city.name}`}
          />
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {city.content.localFactors.map((f) => (
              <Card key={f.title} className="p-6">
                <h3 className="text-[16px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{f.body}</p>
              </Card>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-[16px] font-semibold text-ink">Permits and inspections</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{city.content.permitNotes}</p>
              {state?.notes && (
                <p className="mt-3 border-t border-line pt-3 text-[13.5px] leading-relaxed text-muted">
                  <span className="font-semibold text-ink">{state.name}: </span>{state.notes}
                </p>
              )}
            </Card>
            <Card className="p-6">
              <h3 className="text-[16px] font-semibold text-ink">When to book the work</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{city.content.seasonality}</p>
            </Card>
          </div>
        </section>

        {/* ------------------------- Breakdown ------------------------- */}
        <section className="mt-16">
          <SectionHeading
            eyebrow="Where the money goes"
            title={`Cost breakdown for a typical ${city.name} roof`}
            description="A 2,000 sq ft replacement, itemised the way a contractor builds their own price."
          />
          <Card className="mt-7 p-6 sm:p-8">
            <BreakdownTable estimate={rep} />
          </Card>
        </section>

        {/* ------------------------- Provenance ------------------------- */}
        <section className="mt-16">
          <SectionHeading
            eyebrow="Where the numbers come from"
            title={`What the ${city.name} figures are built on`}
            description="Weighted by money rather than by how many sources we can list. Anything still resting on our own sample figures is named as such."
          />
          <Card className="mt-7 p-6 sm:p-8">
            <ProvenancePanel estimate={rep} />
          </Card>
        </section>

        {/* ----------------------- Price history ----------------------- */}
        <section className="mt-16">
          <SectionHeading eyebrow="Trend" title="How roofing costs have moved" />
          <div className="mt-7">
            <PriceHistory series={series} points={points} placeLabel={place} />
          </div>
        </section>

        {/* --------------------------- FAQs --------------------------- */}
        <section className="mt-16 max-w-3xl">
          <SectionHeading eyebrow="Local questions" title={`Roofing in ${city.name}`} />
          <div className="mt-5">
            {city.content.faqs.map((f) => (
              <details key={f.q} className="group border-t border-line py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-medium text-ink marker:content-none">
                  {f.q}
                  <span aria-hidden className="text-xl leading-none text-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ------------------------ Internal links ------------------------ */}
        <section className="mt-16">
          <SectionHeading
            eyebrow="Nearby"
            title="ZIP-level pages and related tools"
            description="A ZIP code gets its own page only where the housing stock or local conditions differ enough from the city as a whole to change the answer."
          />
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eligibleZips.map((z) => (
              <Link
                key={z.id}
                href={`/${serviceCost}/${citySlug}/${z.code}`}
                className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent-line"
              >
                <p className="text-[14.5px] font-semibold text-ink group-hover:text-accent">
                  {z.code} roofing costs
                </p>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted">
                  {z.content?.summary.slice(0, 90)}...
                </p>
              </Link>
            ))}
            <Link href="/compare-quotes" className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent-line">
              <p className="text-[14.5px] font-semibold text-ink group-hover:text-accent">Compare contractor quotes</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">Normalise several quotes for scope</p>
            </Link>
            <Link href="/contractor-questions" className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent-line">
              <p className="text-[14.5px] font-semibold text-ink group-hover:text-accent">Questions to ask a roofer</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">Before you sign anything</p>
            </Link>
          </div>

          {zips.length > eligibleZips.length && (
            <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-faint">
              We also cover{" "}
              {zips.filter((z) => !z.pageEligible).map((z) => z.code).join(", ")}{" "}
              in the calculator. They do not have their own pages because we have
              nothing to say about them that this page does not already say
              better.
            </p>
          )}
        </section>

        <p className="mt-14 max-w-3xl text-[13px] leading-relaxed text-faint">
          Every figure on this page is generated by the same estimation engine as
          the calculator, from pricing rows scoped to {place} where we have them
          and national figures where we do not. Read the{" "}
          <Link href="/methodology" className="font-medium text-accent underline underline-offset-2">methodology</Link>{" "}
          for how the model is built, or the{" "}
          <Link href="/data-sources" className="font-medium text-accent underline underline-offset-2">data sources</Link>{" "}
          page for what is behind the numbers and under what licence.
        </p>
      </div>
    </>
  );
}
