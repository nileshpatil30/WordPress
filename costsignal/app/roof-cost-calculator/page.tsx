import { getStore } from "@/lib/data/store";
import { RoofCalculator } from "@/components/calculator/RoofCalculator";
import { DataNotice } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";
import { readInitialValues } from "@/lib/calculator-params";

export const metadata = buildMetadata({
  title: "Roof replacement cost calculator",
  description:
    "Estimate your roof replacement cost by ZIP code, roof size, material, pitch and site conditions. Full cost breakdown, stated assumptions and a confidence score.",
  path: "/roof-cost-calculator",
});

export default async function CalculatorPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const store = await getStore();
  const service = await store.getServiceBySlug("roofing");
  const [materials, projectTypes] = await Promise.all([
    store.listMaterials(service!.id),
    store.listProjectTypes(service!.id),
  ]);

  const initialValues = readInitialValues(sp);
  const autoStart = typeof initialValues.zip === "string" && /^\d{5}$/.test(initialValues.zip);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">
          Roof replacement cost calculator
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          Three questions gets you a range. After that, every assumption is yours
          to change &mdash; and the breakdown shows exactly what each change does
          to the price.
        </p>
      </div>

      <div className="mt-8">
        <DataNotice />
      </div>

      <div className="mt-8">
        <RoofCalculator
          materials={materials}
          projectTypes={projectTypes}
          initialValues={initialValues}
          autoStart={autoStart}
        />
      </div>
    </div>
  );
}
