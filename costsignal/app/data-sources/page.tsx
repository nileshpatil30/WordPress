import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { Badge, Card, DataNotice, SectionHeading } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Data sources, licences and provenance",
  description:
    "Every pricing source behind CostSignal: what it is, what licence it carries, how much weight it gets, and whether it is connected yet.",
  path: "/data-sources",
});

const TYPE_LABEL: Record<string, string> = {
  government: "Government / open statistics",
  open_data: "Open data",
  trade_association: "Trade association",
  manufacturer: "Manufacturer published pricing",
  public_market: "Publicly available market information",
  licensed: "Commercially licensed",
  first_party: "First-party (our users)",
  contractor_submitted: "Contractor submitted",
  internal_model: "Internal model",
};

export default async function DataSourcesPage() {
  const store = await getStore();
  const [sources, service] = await Promise.all([
    store.listPricingSources(), store.getServiceBySlug("roofing"),
  ]);
  const records = await store.listPricingRecords(service!.id);

  const usage = new Map<string, number>();
  for (const r of records) usage.set(r.sourceId, (usage.get(r.sourceId) ?? 0) + 1);

  const active = sources.filter((s) => s.isActive);
  const planned = sources.filter((s) => !s.isActive);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="max-w-3xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[44px]">
          Where the numbers come from
        </h1>
        <p className="mt-5 text-[16.5px] leading-relaxed text-muted">
          A cost platform is only as good as its provenance. Every price row in
          our database carries a source, a licence note, the period it describes,
          the date we collected it, and a status flag &mdash; verified, modelled,
          or sample. This page is that table, rendered.
        </p>
      </div>

      <div className="mt-9 max-w-3xl"><DataNotice /></div>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Connected"
          title="Sources currently feeding estimates"
          description="Right now this is a short and uncomfortable list, and we would rather show you that than dress it up."
        />
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {active.map((s) => (
            <SourceCard key={s.id} source={s} recordCount={usage.get(s.id) ?? 0} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="The ingestion roadmap"
          title="Sources configured but not yet connected"
          description="These are already rows in the pricing_sources table with their licence terms recorded. Connecting one is an ingestion job, not an architecture change."
        />
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {planned.map((s) => (
            <SourceCard key={s.id} source={s} recordCount={usage.get(s.id) ?? 0} />
          ))}
        </div>
      </section>

      <section className="mt-16 max-w-3xl">
        <SectionHeading eyebrow="Ground rules" title="What we will and will not do to get data" />
        <div className="mt-6 space-y-4">
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold text-ink">We will not build the business on scraping</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Commercial construction cost databases exist because good localised
              cost data is genuinely valuable and expensive to produce. Scraping
              one to build a free competitor creates copyright, database-right and
              contract problems, and it produces a dataset we could never defend
              or stand behind. If we want that data, we license it.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold text-ink">Automated collection is checked case by case</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Where publicly posted prices are useful, collection is assessed
              individually against that site&rsquo;s terms, its robots rules,
              applicable copyright and database rights, and the law in the
              relevant jurisdiction &mdash; before anything is collected, not
              after.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold text-ink">Open data obligations are obligations</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              OpenStreetMap is available under the Open Database Licence.
              Commercial use is permitted, with attribution required and
              share-alike obligations attaching to derivative databases. That is a
              real constraint on how a derived building-footprint dataset could be
              published, and it needs legal review before we rely on it.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold text-ink">Our own users are the endgame</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              What a homeowner actually paid, with their consent and stripped of
              anything identifying, is the one dataset nobody else can copy. It is
              also the only one that lets us measure our own accuracy: we store
              the estimated, quoted and actually-paid figures separately for
              exactly that reason.{" "}
              <Link href="/contribute" className="font-medium text-accent underline underline-offset-2">
                Contribute yours
              </Link>.
            </p>
          </Card>
        </div>
      </section>

      <section className="mt-16 max-w-3xl">
        <SectionHeading eyebrow="Provenance fields" title="What we record about every price" />
        <div className="scroll-x mt-6">
          <table className="w-full min-w-[520px] border-collapse text-left text-[13.5px]">
            <tbody>
              {[
                ["source_name / source_url", "Who published it and where"],
                ["source_type", "Government, open data, licensed, first-party, contractor, internal model"],
                ["license_notes", "In plain language, what we are allowed to do with it"],
                ["geo_scope_type / geo_scope_id", "Exactly which place the price describes"],
                ["unit", "Per square, per hour, per ton, per linear foot, each"],
                ["low / median / high", "Never a single point estimate"],
                ["effective_date", "The period the price describes"],
                ["collected_date", "When we captured it"],
                ["methodology", "How it was derived, in a sentence"],
                ["confidence_score", "Per record, feeding the estimate-level score"],
                ["data_status", "verified, modeled or sample - and it is NOT NULL"],
                ["sample_size", "How many observations sit behind it, where applicable"],
              ].map(([field, meaning]) => (
                <tr key={field} className="border-b border-line align-top">
                  <td className="py-2.5 pr-6 font-mono text-[12.5px] text-ink">{field}</td>
                  <td className="py-2.5 text-muted">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 text-[14px] leading-relaxed text-muted">
          <code className="font-mono text-[13px] text-ink">data_status</code> being
          non-nullable is deliberate. An unlabelled number cannot enter the
          system, which means we can never accidentally present a placeholder as
          a fact.
        </p>
      </section>
    </div>
  );
}

function SourceCard({ source, recordCount }: {
  source: Awaited<ReturnType<Awaited<ReturnType<typeof getStore>>["listPricingSources"]>>[number];
  recordCount: number;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold text-ink">{source.name}</h3>
          <p className="mt-0.5 text-[12.5px] text-faint">{TYPE_LABEL[source.sourceType] ?? source.sourceType}</p>
        </div>
        <Badge tone={source.isActive ? "positive" : "neutral"}>
          {source.isActive ? "Connected" : "Planned"}
        </Badge>
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">{source.licenseNotes}</p>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-[12.5px] text-faint">
        <span>Reliability weight <span className="font-semibold tnum text-muted">{source.reliabilityWeight.toFixed(2)}</span></span>
        <span>Price rows <span className="font-semibold tnum text-muted">{recordCount}</span></span>
        {source.lastReviewedAt && <span>Reviewed {source.lastReviewedAt}</span>}
      </div>

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline"
        >
          {new URL(source.url).hostname} &rarr;
        </a>
      )}
    </Card>
  );
}
