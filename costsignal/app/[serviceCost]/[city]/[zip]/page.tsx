import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { buildLocalScenarios } from "@/lib/local-estimates";
import { RoofCalculator } from "@/components/calculator/RoofCalculator";
import { BreakdownTable, ConfidenceMeter, FreshnessLine, PriceRangeBar } from "@/components/estimate/EstimateView";
import { Badge, ButtonLink, Card, DataNotice, SectionHeading } from "@/components/ui";
import { usd } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";

export const revalidate = 3600;

/**
 * ZIP pages exist only where `page_eligible` is true - that is, where an editor
 * has written something specific and true about the ZIP that the city page does
 * not already say. Everything else 404s here and works fine in the calculator.
 * This is the whole difference between useful programmatic SEO and thin pages.
 */
export async function generateStaticParams() {
  const store = await getStore();
  const [services, zips] = await Promise.all([
    store.listServices({ liveOnly: true }),
    store.listZipCodes({ pageEligibleOnly: true }),
  ]);
  const cities = await store.listCities({ publishedOnly: true });
  const byId = new Map(cities.map((c) => [c.id, c]));

  return services.flatMap((s) =>
    zips
      .filter((z) => byId.has(z.cityId))
      .map((z) => ({ serviceCost: s.costPathSlug, city: byId.get(z.cityId)!.slug, zip: z.code })));
}

export async function generateMetadata({ params }: {
  params: Promise<{ serviceCost: string; city: string; zip: string }>;
}) {
  const { serviceCost, city, zip } = await params;
  const store = await getStore();
  const [cityRow, zipRow] = await Promise.all([store.getCityBySlug(city), store.getZipByCode(zip)]);
  if (!cityRow || !zipRow?.pageEligible) return {};
  const state = (await store.listStates()).find((s) => s.id === cityRow.stateId);
  return buildMetadata({
    title: `Roof replacement cost in ${zip} (${cityRow.name}, ${state?.code})`,
    description: `Roofing cost estimates for ZIP ${zip} in ${cityRow.name}: what the local housing stock means for your price, plus a calculator for your own roof.`,
    path: `/${serviceCost}/${city}/${zip}`,
  });
}

export default async function ZipCostPage({ params }: {
  params: Promise<{ serviceCost: string; city: string; zip: string }>;
}) {
  const { serviceCost, city: citySlug, zip } = await params;
  const store = await getStore();
  const [service, city, zipRow] = await Promise.all([
    store.getServiceByCostPath(serviceCost),
    store.getCityBySlug(citySlug),
    store.getZipByCode(zip),
  ]);

  if (!service || service.status !== "live" || !city?.isPublished || !city.content) notFound();
  if (!zipRow || !zipRow.pageEligible || zipRow.cityId !== city.id || !zipRow.content) notFound();

  const [states, materials, projectTypes, siblingZips] = await Promise.all([
    store.listStates(), store.listMaterials(service.id),
    store.listProjectTypes(service.id),
    store.listZipCodes({ cityId: city.id, pageEligibleOnly: true }),
  ]);
  const state = states.find((s) => s.id === city.stateId);

  const scenarios = await buildLocalScenarios(
    zip, materials, city.content.commonMaterials, city.content.representativeProjectType);
  if (!scenarios) notFound();
  const rep = scenarios.representative;
  const place = `${zip}, ${city.name}, ${state?.code}`;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Roofing cost", path: `/${serviceCost}` },
        { name: `${city.name}, ${state?.code}`, path: `/${serviceCost}/${citySlug}` },
        { name: zip, path: `/${serviceCost}/${citySlug}/${zip}` },
      ])} />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-[13px] text-faint">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-2">/</span>
          <Link href={`/${serviceCost}`} className="hover:text-ink">Roofing cost</Link>
          <span className="mx-2">/</span>
          <Link href={`/${serviceCost}/${citySlug}`} className="hover:text-ink">{city.name}, {state?.code}</Link>
          <span className="mx-2">/</span>
          <span className="text-muted">{zip}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <div>
            <Badge tone="accent">ZIP {zip} · {zipRow.county} County</Badge>
            <h1 className="display mt-4 text-[34px] font-semibold text-ink sm:text-[42px]">
              Roof replacement cost in {zip}
            </h1>
            <p className="mt-5 text-[16.5px] leading-relaxed text-muted">{zipRow.content.summary}</p>

            <div className="mt-6 rounded-xl border border-line bg-surface p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">
                Housing stock here
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{zipRow.content.housingStock}</p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/roof-cost-calculator?zip=${zip}`} size="lg">Calculate my roof cost</ButtonLink>
              <ButtonLink href={`/quote-check?zip=${zip}`} variant="secondary" size="lg">Check a quote</ButtonLink>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-line bg-gradient-to-b from-accent-soft/70 to-surface px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                Typical replacement in {zip}
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                2,000 sq ft roof · {projectTypes.find((p) => p.slug === (city.content!.representativeProjectType ?? "full-replacement"))?.name.toLowerCase()} · moderate pitch
              </p>
              <p className="display mt-4 text-[32px] font-semibold text-ink">
                {usd(rep.range.low)} <span className="text-faint">–</span> {usd(rep.range.high)}
              </p>
              <div className="mt-4">
                <PriceRangeBar low={rep.range.low} typical={rep.range.typical} high={rep.range.high} />
              </div>
              <div className="mt-4"><FreshnessLine estimate={rep} /></div>
            </div>
            <div className="px-6 py-6"><ConfidenceMeter confidence={rep.confidence} /></div>
          </Card>
        </div>

        <div className="mt-10 max-w-3xl"><DataNotice /></div>

        <section className="mt-16">
          <SectionHeading
            eyebrow={`Specific to ${zip}`}
            title="What changes the price on this street"
            description={`These are the things that differ here from ${city.name} as a whole. Everything else on the ${city.name} page still applies.`}
          />
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {zipRow.content.notes.map((n) => (
              <Card key={n.title} className="p-6">
                <h3 className="text-[16px] font-semibold text-ink">{n.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{n.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-16" id="calculator">
          <SectionHeading
            eyebrow="Your roof"
            title={`Roof cost calculator for ${zip}`}
            description="Pre-filled for this ZIP code. Change anything and the estimate follows."
          />
          <div className="mt-8">
            <RoofCalculator
              materials={materials}
              projectTypes={projectTypes}
              initialValues={{
                zip, areaMode: "roof", roofAreaSqft: 2000,
                material: city.content.commonMaterials[0],
                projectType: city.content.representativeProjectType ?? "full-replacement",
              }}
              autoStart
            />
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading
            eyebrow="By size and material"
            title={`Local ranges for ${zip}`}
            description="Same assumptions throughout, so these are comparable with each other and with the city page."
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

          <Card className="mt-8 p-6 sm:p-8">
            <h3 className="text-[16px] font-semibold text-ink">Cost breakdown for a typical roof here</h3>
            <div className="mt-5"><BreakdownTable estimate={rep} /></div>
          </Card>
        </section>

        <section className="mt-16">
          <SectionHeading eyebrow="Nearby" title={`Other ${city.name} pages`} />
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href={`/${serviceCost}/${citySlug}`} className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent-line">
              <p className="text-[14.5px] font-semibold text-ink group-hover:text-accent">
                {city.name} roofing costs
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">
                Local factors, permits, seasonality and full city ranges
              </p>
            </Link>
            {siblingZips.filter((z) => z.code !== zip).map((z) => (
              <Link
                key={z.id}
                href={`/${serviceCost}/${citySlug}/${z.code}`}
                className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent-line"
              >
                <p className="text-[14.5px] font-semibold text-ink group-hover:text-accent">
                  {z.code} roofing costs
                </p>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted">
                  {z.content?.summary.slice(0, 80)}...
                </p>
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-14 max-w-3xl text-[13px] leading-relaxed text-faint">
          Pricing for {place} resolves through our geographic chain: ZIP-scoped
          rows where we hold them, then city, metro, state and national. The
          confidence score above tells you which level actually answered. See the{" "}
          <Link href="/methodology" className="font-medium text-accent underline underline-offset-2">methodology</Link>.
        </p>
      </div>
    </>
  );
}
