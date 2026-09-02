import { getStore } from "@/lib/data/store";
import { QuoteCompare } from "@/components/quote/QuoteCompare";
import { DataNotice } from "@/components/ui";
import { readInitialValues } from "@/lib/calculator-params";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Compare contractor roofing quotes side by side",
  description:
    "Compare multiple roof replacement quotes on scope, warranty and adjusted cost - not just sticker price - against a modelled cost range for your project.",
  path: "/compare-quotes",
});

export default async function CompareQuotesPage() {
  const store = await getStore();
  const service = await store.getServiceBySlug("roofing");
  const [materials, projectTypes] = await Promise.all([
    store.listMaterials(service!.id),
    store.listProjectTypes(service!.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">
          Compare your quotes properly
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          Three quotes at three prices usually means three different jobs. Tick
          what each quote actually states in writing, and we will price back in
          what the others leave out &mdash; so the cheapest sticker price stops
          being mistaken for the cheapest job.
        </p>
      </div>

      {/* Stated before the form, because the instinct being corrected here is
          the one the user arrives with. */}
      <div className="mt-7 max-w-3xl rounded-xl border border-accent-line bg-accent-soft/60 px-5 py-4">
        <p className="text-[15px] font-semibold text-ink">
          Don&rsquo;t compare quotes on price alone.
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
          An $18,000 quote is not automatically better than a $20,000 one. We
          compare scope, included work, warranty and allowances, then price back
          in what each quote leaves out &mdash; so a quote that is cheapest only
          because it omits the tear-off stops looking cheapest.
        </p>
      </div>

      <div className="mt-6"><DataNotice compact /></div>

      <div className="mt-8">
        <QuoteCompare
          materials={materials}
          projectTypes={projectTypes}
          initialValues={{}}
        />
      </div>
    </div>
  );
}
