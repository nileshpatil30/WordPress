import { getStore } from "@/lib/data/store";
import { updateRecordAction } from "../actions";
import { InlineEditForm } from "@/components/admin/AdminForms";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminGeoPage() {
  const store = await getStore();
  const [cities, zips, states] = await Promise.all([
    store.listCities(), store.listZipCodes(), store.listStates(),
  ]);
  const cityName = new Map(cities.map((c) => [c.id, c.name]));
  const stateCode = new Map(states.map((s) => [s.id, s.code]));

  return (
    <div className="space-y-10">
      <Card className="p-6">
        <h2 className="text-[17px] font-semibold text-ink">Adding a city</h2>
        <ol className="mt-3 max-w-3xl list-decimal space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-muted">
          <li>Insert a <span className="font-mono text-[12.5px]">cities</span> row with its state, metro and slug.</li>
          <li>Insert its <span className="font-mono text-[12.5px]">zip_codes</span> rows.</li>
          <li>Add city-scoped <span className="font-mono text-[12.5px]">pricing_records</span> for the labour rate, permit allowance and tipping fee.</li>
          <li>Write the local content: summary, local factors, permit notes, seasonality and FAQs.</li>
          <li>Only then set <span className="font-mono text-[12.5px]">is_published</span> to true. That flag is the gate on an indexable page, and it exists so a city cannot get a page before it has anything to say.</li>
        </ol>
      </Card>

      <section>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Cities</h2>
        <div className="scroll-x mt-5">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="pb-2.5 pr-4 font-semibold">City</th>
                <th className="pb-2.5 pr-4 font-semibold">Slug</th>
                <th className="pb-2.5 pr-4 font-semibold">ZIPs</th>
                <th className="pb-2.5 pr-4 font-semibold">Content</th>
                <th className="pb-2.5 font-semibold">Published</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => {
                const count = zips.filter((z) => z.cityId === c.id).length;
                return (
                  <tr key={c.id} className="border-b border-line align-top">
                    <td className="py-3 pr-4 text-[14px] font-medium text-ink">
                      {c.name}
                      <span className="block text-[12px] text-faint">{stateCode.get(c.stateId)}</span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[12.5px] text-muted">{c.slug}</td>
                    <td className="py-3 pr-4 text-[13px] tnum text-muted">{count}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={c.content ? "positive" : "caution"}>
                        {c.content ? `${c.content.localFactors.length} factors` : "none"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <InlineEditForm
                        action={updateRecordAction}
                        collection="cities"
                        id={c.id}
                        returnTo="/admin/geo"
                        compact
                        fields={[{ name: "isPublished", label: "Published", value: String(c.isPublished), width: "w-20" }]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">ZIP codes</h2>
        <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-muted">
          A ZIP gets its own indexable page only when <span className="font-mono text-[12.5px]">pageEligible</span>{" "}
          is true and it has written content. Everything else still works in the
          calculator &mdash; it simply resolves to its city.
        </p>
        <div className="scroll-x mt-5">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="pb-2.5 pr-4 font-semibold">ZIP</th>
                <th className="pb-2.5 pr-4 font-semibold">City</th>
                <th className="pb-2.5 pr-4 font-semibold">County</th>
                <th className="pb-2.5 pr-4 font-semibold">Content</th>
                <th className="pb-2.5 font-semibold">Page eligible</th>
              </tr>
            </thead>
            <tbody>
              {zips.map((z) => (
                <tr key={z.id} className="border-b border-line align-top">
                  <td className="py-3 pr-4 font-mono text-[13px] text-ink">{z.code}</td>
                  <td className="py-3 pr-4 text-[13px] text-muted">{z.cityId ? cityName.get(z.cityId) : "\u2014"}</td>
                  <td className="py-3 pr-4 text-[13px] text-muted">{z.county}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={z.content ? "positive" : "neutral"}>{z.content ? "written" : "none"}</Badge>
                  </td>
                  <td className="py-3">
                    <InlineEditForm
                      action={updateRecordAction}
                      collection="zipCodes"
                      id={z.id}
                      returnTo="/admin/geo"
                      compact
                      fields={[{ name: "pageEligible", label: "Eligible", value: String(z.pageEligible), width: "w-20" }]}
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
