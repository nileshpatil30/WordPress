import { getStore } from "@/lib/data/store";
import { QuoteCompare } from "@/components/quote/QuoteCompare";
import { DataNotice } from "@/components/ui";
import { readInitialValues } from "@/lib/calculator-params";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Compare contractor roofing quotes side by side",
  description:
    "Compare multiple roof replacement quotes on scope, warranty and adjusted cost - not just sticker price - against a modelled fair range for your project.",
  path: "/compare-quotes",
});

export default async function CompareQuotesPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
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

      <div className="mt-8"><DataNotice /></div>

      <div className="mt-8">
        <QuoteCompare
          materials={materials}
          projectTypes={projectTypes}
          initialValues={readInitialValues(sp)}
        />
      </div>
    </div>
  );
}
