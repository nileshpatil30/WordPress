import { getStore } from "@/lib/data/store";
import { updateRecordAction } from "../actions";
import { InlineEditForm } from "@/components/admin/AdminForms";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const store = await getStore();
  const service = await store.getServiceBySlug("roofing");
  const [records, factors, materials, sources] = await Promise.all([
    store.listPricingRecords(service!.id),
    store.listPricingFactors(service!.id),
    store.listMaterials(service!.id),
    store.listPricingSources(),
  ]);

  const materialName = new Map(materials.map((m) => [m.id, m.name]));
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));

  const byScope = {
    national: records.filter((r) => r.geoScopeType === "country"),
    local: records.filter((r) => r.geoScopeType !== "country"),
  };

  return (
    <div className="space-y-10">
      <Card className="p-6">
        <h2 className="text-[17px] font-semibold text-ink">Editing prices</h2>
        <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-muted">
          Every edit here changes what the calculator, the city pages and the
          public API return immediately, and writes a before/after row to the
          audit log. Low must stay less than or equal to median, and median less
          than or equal to high &mdash; the database enforces the same rule.
          Update <span className="font-mono text-[12.5px]">effectiveDate</span> and{" "}
          <span className="font-mono text-[12.5px]">dataStatus</span> whenever you
          change a number, or the freshness badge and the confidence score will lie.
        </p>
      </Card>

      <PricingTable
        title="National price rows"
        description="The fallback layer. Every ZIP in the country resolves to these unless something more local exists."
        rows={byScope.national}
        materialName={materialName}
        sourceName={sourceName}
      />

      <PricingTable
        title="City-scoped overrides"
        description="These beat the national rows for any ZIP inside the city. Adding a city means adding rows here."
        rows={byScope.local}
        materialName={materialName}
        sourceName={sourceName}
      />

      <section>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Model factors</h2>
        <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-muted">
          Every multiplier the engine applies. Nothing here is hardcoded in the
          application, so the model can be retuned without a deploy. Changing a
          factor changes every estimate immediately &mdash; including the ones on
          published city pages.
        </p>
        <div className="scroll-x mt-5">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="pb-2.5 pr-4 font-semibold">Key</th>
                <th className="pb-2.5 pr-4 font-semibold">Applies to</th>
                <th className="pb-2.5 pr-4 font-semibold">Status</th>
                <th className="pb-2.5 font-semibold">Multiplier</th>
              </tr>
            </thead>
            <tbody>
              {factors.map((f) => (
                <tr key={f.id} className="border-b border-line align-top">
                  <td className="py-3 pr-4">
                    <span className="font-mono text-[12.5px] text-ink">{f.factorKey}</span>
                    <span className="mt-0.5 block max-w-md text-[12px] leading-snug text-faint">{f.label}</span>
                  </td>
                  <td className="py-3 pr-4 text-[13px] text-muted">{f.appliesTo}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={f.dataStatus === "verified" ? "positive" : f.dataStatus === "modeled" ? "accent" : "caution"}>
                      {f.dataStatus}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <InlineEditForm
                      action={updateRecordAction}
                      collection="pricingFactors"
                      id={f.id}
                      returnTo="/admin/pricing"
                      compact
                      fields={[
                        { name: "multiplier", label: "Multiplier", value: f.multiplier, type: "number", width: "w-24" },
                        { name: "dataStatus", label: "Status", value: f.dataStatus, width: "w-28" },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PricingTable({ title, description, rows, materialName, sourceName }: {
  title: string;
  description: string;
  rows: Awaited<ReturnType<Awaited<ReturnType<typeof getStore>>["listPricingRecords"]>>;
  materialName: Map<string, string>;
  sourceName: Map<string, string>;
}) {
  return (
    <section>
      <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-muted">{description}</p>
      <div className="scroll-x mt-5">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
              <th className="pb-2.5 pr-4 font-semibold">Metric</th>
              <th className="pb-2.5 pr-4 font-semibold">Scope</th>
              <th className="pb-2.5 pr-4 font-semibold">Source</th>
              <th className="pb-2.5 pr-4 font-semibold">Status</th>
              <th className="pb-2.5 font-semibold">Low / median / high</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <span className="font-mono text-[12.5px] text-ink">{r.metricKey}</span>
                  {r.materialId && (
                    <span className="mt-0.5 block text-[12px] text-faint">
                      {materialName.get(r.materialId) ?? r.materialId}
                    </span>
                  )}
                  <span className="mt-0.5 block text-[11.5px] text-faint">per {r.unit}</span>
                </td>
                <td className="py-3 pr-4 text-[12.5px] text-muted">
                  {r.geoScopeType}
                  <span className="block font-mono text-[11.5px] text-faint">{r.geoScopeId}</span>
                </td>
                <td className="py-3 pr-4 text-[12.5px] text-muted">{sourceName.get(r.sourceId) ?? r.sourceId}</td>
                <td className="py-3 pr-4">
                  <Badge tone={r.dataStatus === "verified" ? "positive" : r.dataStatus === "modeled" ? "accent" : "caution"}>
                    {r.dataStatus}
                  </Badge>
                  <span className="mt-1 block text-[11.5px] tnum text-faint">eff. {r.effectiveDate}</span>
                </td>
                <td className="py-3">
                  <InlineEditForm
                    action={updateRecordAction}
                    collection="pricingRecords"
                    id={r.id}
                    returnTo="/admin/pricing"
                    compact
                    fields={[
                      { name: "lowPrice", label: "Low", value: r.lowPrice, type: "number", width: "w-20" },
                      { name: "medianPrice", label: "Median", value: r.medianPrice, type: "number", width: "w-20" },
                      { name: "highPrice", label: "High", value: r.highPrice, type: "number", width: "w-20" },
                      { name: "effectiveDate", label: "Effective", value: r.effectiveDate, width: "w-32" },
                      { name: "dataStatus", label: "Status", value: r.dataStatus, width: "w-24" },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
