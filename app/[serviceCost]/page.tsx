import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { buildLocalScenarios } from "@/lib/local-estimates";
import { Badge, ButtonLink, Card, DataNotice, SectionHeading } from "@/components/ui";
import { QuoteCheckCta } from "@/components/site/QuoteCheckCta";
import { usd } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const store = await getStore();
  const services = await store.listServices({ liveOnly: true });
  return services.map((s) => ({ serviceCost: s.costPathSlug }));
}

export async function generateMetadata({ params }: { params: Promise<{ serviceCost: string }> }) {
  const { serviceCost } = await params;
  const store = await getStore();
  const service = await store.getServiceByCostPath(serviceCost);
  if (!service) return {};
  return buildMetadata({
    title: `${service.name} cost in ${new Date().getFullYear()}: what to expect and why`,
    description:
      "What roof replacement actually costs in the US, broken into materials, labour, tear-off, disposal and permits - with a calculator, a quote checker and local pages for ten metros.",
    path: `/${serviceCost}`,
  });
}

export default async function ServiceHubPage({
  params,
}: { params: Promise<{ serviceCost: string }> }) {
  const { serviceCost } = await params;
  const store = await getStore();
  const service = await store.getServiceByCostPath(serviceCost);
  if (!service || service.status !== "live") notFound();

  const [cities, materials] = await Promise.all([
    store.listCities({ publishedOnly: true }),
    store.listMaterials(service.id),
  ]);

  // National reference numbers, computed by the same engine as everything else.
  const national = await buildLocalScenarios("00000", materials,
    ["asphalt-architectural", "impact-resistant-shingle", "metal-standing-seam", "concrete-tile", "clay-tile", "natural-slate"]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: `${service.name} cost`, path: `/${serviceCost}` },
      ])} />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-[13px] text-faint">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-muted">{service.name} cost</span>
        </nav>

        <div className="mt-6 max-w-3xl">
          <Badge tone="accent">United States</Badge>
          <h1 className="display mt-4 text-[36px] font-semibold text-ink sm:text-[46px]">
            What does a roof replacement cost?
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            There is no single answer, and any site that gives you one is
            averaging away the things that actually determine your price: where
            you live, how big and how steep the roof is, what is already on it,
            and what is going back on. Below are modelled national reference
            figures, then the local pages where those figures get specific.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/roof-cost-calculator" size="lg">Calculate my roof cost</ButtonLink>
            <ButtonLink href="/quote-check" variant="secondary" size="lg">Check a quote I have</ButtonLink>
          </div>
        </div>

        <QuoteCheckCta className="mt-9 max-w-3xl" />
        <div className="mt-6 max-w-3xl"><DataNotice /></div>

        {national && (
          <>
            <section className="mt-14">
              <SectionHeading
                eyebrow="By roof size"
                title="National reference ranges"
                description="Architectural asphalt shingle, moderate pitch, one existing layer torn off, average site access. National figures - your city page will be more specific."
              />
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {national.bySize.map((s) => (
                  <Card key={s.label} className="p-5">
                    <p className="text-[13px] font-semibold text-ink">{s.label}</p>
                    <p className="mt-0.5 text-[12px] text-faint">
                      {s.roofAreaSqft.toLocaleString()} sq ft roof
                    </p>
                    <p className="mt-3 text-[20px] font-semibold tnum text-ink">
                      {usd(s.estimate.range.low)}
                    </p>
                    <p className="text-[13px] tnum text-muted">to {usd(s.estimate.range.high)}</p>
                    <p className="mt-3 border-t border-line pt-2.5 text-[12px] tnum text-faint">
                      {usd(s.estimate.perSquare.typical)} per square
                    </p>
                  </Card>
                ))}
              </div>
            </section>

            <section className="mt-14">
              <SectionHeading
                eyebrow="By material"
                title="What the material choice actually costs you"
                description="Same 2,000 sq ft roof, same everything else. Service life matters as much as price: the cheapest roof per dollar is rarely the cheapest per year."
              />
              <div className="scroll-x mt-7">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                      <th className="pb-2.5 pr-4 font-semibold">Material</th>
                      <th className="pb-2.5 pr-4 text-right font-semibold">Estimated range</th>
                      <th className="pb-2.5 pr-4 text-right font-semibold">Per square</th>
                      <th className="pb-2.5 pr-4 text-right font-semibold">Service life</th>
                      <th className="pb-2.5 text-right font-semibold">Cost per year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {national.byMaterial.map(({ material, estimate }) => {
                      const midLife = (material.expectedLifeYearsMin + material.expectedLifeYearsMax) / 2;
                      return (
                        <tr key={material.id} className="border-b border-line align-top">
                          <td className="py-3 pr-4">
                            <span className="text-[14.5px] font-medium text-ink">{material.name}</span>
                            <span className="mt-0.5 block max-w-md text-[12.5px] leading-snug text-faint">
                              {material.notes}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right text-[14px] tnum text-ink">
                            {usd(estimate.range.low)} – {usd(estimate.range.high)}
                          </td>
                          <td className="py-3 pr-4 text-right text-[14px] tnum text-muted">
                            {usd(estimate.perSquare.typical)}
                          </td>
                          <td className="py-3 pr-4 text-right text-[14px] tnum text-muted">
                            {material.expectedLifeYearsMin}–{material.expectedLifeYearsMax} yrs
                          </td>
                          <td className="py-3 text-right text-[14px] font-semibold tnum text-accent">
                            {usd(estimate.range.typical / midLife)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-faint">
                Cost per year divides the typical estimate by the midpoint of the
                expected service life. It ignores the time value of money and
                assumes you keep the house, so treat it as a way of ranking
                options rather than as a financial calculation.
              </p>
            </section>
          </>
        )}

        <section className="mt-16">
          <SectionHeading
            eyebrow="Local pages"
            title="Roofing costs by city"
            description="Each of these exists because there is something locally specific worth knowing - code, climate, permitting, or the materials that are actually common there."
          />
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => (
              <Link
                key={c.id}
                href={`/${serviceCost}/${c.slug}`}
                className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent-line"
              >
                <p className="text-[15.5px] font-semibold text-ink group-hover:text-accent">
                  {c.name} roofing costs
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
                  {c.content?.summary.slice(0, 120)}...
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-faint">
            Ten cities is deliberate. We would rather publish ten pages that tell
            you something true about your market than a thousand that reword the
            same national average. Cities are added when there is local data and
            local content to justify one, and the calculator already works for
            every US ZIP code regardless.
          </p>
        </section>
      </div>
    </>
  );
}
