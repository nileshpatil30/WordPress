import { getStore } from "@/lib/data/store";
import { ContributeForm } from "@/components/tools/ContributeForm";
import { Card, SectionHeading } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Tell us what your roof actually cost",
  description:
    "Share what you paid for your roof replacement. Anonymous, consented, reviewed before use, and aggregated so no individual project is identifiable.",
  path: "/contribute",
});

export default async function ContributePage() {
  const store = await getStore();
  const service = await store.getServiceBySlug("roofing");
  const materials = await store.listMaterials(service!.id);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">
          What did you actually pay?
        </h1>
        <p className="mt-5 text-[16.5px] leading-relaxed text-muted">
          Published cost guides are built from other published cost guides. The
          only way to break that circle is real prices from real projects. If you
          have had a roof replaced, two minutes here makes every estimate on this
          site better &mdash; including for the next person in your ZIP code.
        </p>
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-3">
        {[
          { t: "We never ask who you are", d: "No name, no email, no address, no contractor name. The form does not have those fields, so we cannot collect them by accident." },
          { t: "Dates are stored by month", d: "Month and year only. A precise date plus a ZIP code starts to identify a property, so we do not keep one." },
          { t: "Nothing is used until reviewed", d: "Every submission lands as pending and is checked by a person. Individual projects are only ever published combined with others." },
        ].map((x) => (
          <Card key={x.t} className="p-5">
            <p className="text-[14.5px] font-semibold text-ink">{x.t}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{x.d}</p>
          </Card>
        ))}
      </div>

      <div className="mt-9">
        <ContributeForm materials={materials} />
      </div>

      <section className="mt-14 max-w-2xl">
        <SectionHeading eyebrow="Why this matters" title="Estimated, quoted, paid" />
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          We store those three numbers separately and deliberately: what our model
          estimated, what contractors quoted, and what was actually paid. That is
          the only way to measure whether the model is any good, and to publish
          how wrong it has been. Most cost sites cannot tell you their accuracy
          because they never collect the third number.
        </p>
      </section>
    </div>
  );
}
