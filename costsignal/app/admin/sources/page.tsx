import { getStore } from "@/lib/data/store";
import { updateRecordAction } from "../actions";
import { InlineEditForm } from "@/components/admin/AdminForms";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const store = await getStore();
  const [sources, records] = await Promise.all([
    store.listPricingSources(), store.listPricingRecords("svc-roofing"),
  ]);

  const usage = new Map<string, { count: number; newest: string; sample: number }>();
  for (const r of records) {
    const cur = usage.get(r.sourceId) ?? { count: 0, newest: "", sample: 0 };
    usage.set(r.sourceId, {
      count: cur.count + 1,
      newest: r.effectiveDate > cur.newest ? r.effectiveDate : cur.newest,
      sample: cur.sample + (r.dataStatus === "sample" ? 1 : 0),
    });
  }

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h2 className="text-[17px] font-semibold text-ink">Source register</h2>
        <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-muted">
          The licence note is the operative field: it is what someone reads in two
          years when deciding whether a given dataset can be used in a new
          product. Keep it in plain language, and re-check it whenever the
          upstream terms change. Reliability weight feeds the confidence score
          directly, so raising it without evidence inflates every estimate that
          uses the source.
        </p>
      </Card>

      <div className="scroll-x">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
              <th className="pb-2.5 pr-4 font-semibold">Source</th>
              <th className="pb-2.5 pr-4 font-semibold">Type</th>
              <th className="pb-2.5 pr-4 font-semibold">Rows</th>
              <th className="pb-2.5 pr-4 font-semibold">Newest data</th>
              <th className="pb-2.5 font-semibold">Weight and status</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => {
              const u = usage.get(s.id);
              return (
                <tr key={s.id} className="border-b border-line align-top">
                  <td className="py-3.5 pr-4">
                    <span className="text-[14px] font-medium text-ink">{s.name}</span>
                    <span className="mt-1 block max-w-md text-[12px] leading-snug text-faint">{s.licenseNotes}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-muted">{s.sourceType}</td>
                  <td className="py-3.5 pr-4 text-[13px] tnum text-muted">
                    {u?.count ?? 0}
                    {u?.sample ? <span className="block text-[11.5px] text-caution">{u.sample} sample</span> : null}
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] tnum text-muted">{u?.newest || "-"}</td>
                  <td className="py-3.5">
                    <div className="mb-2">
                      <Badge tone={s.isActive ? "positive" : "neutral"}>
                        {s.isActive ? "connected" : "planned"}
                      </Badge>
                    </div>
                    <InlineEditForm
                      action={updateRecordAction}
                      collection="pricingSources"
                      id={s.id}
                      returnTo="/admin/sources"
                      compact
                      fields={[
                        { name: "reliabilityWeight", label: "Weight", value: s.reliabilityWeight, type: "number", width: "w-20" },
                        { name: "isActive", label: "Active", value: String(s.isActive), width: "w-20" },
                        { name: "lastReviewedAt", label: "Reviewed", value: s.lastReviewedAt ?? "", width: "w-32" },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
