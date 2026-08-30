import { getStore } from "@/lib/data/store";
import { Badge, Card } from "@/components/ui";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const store = await getStore();
  const [estimates, quoteChecks, submissions, leads, events, cities, zips, records, audit] =
    await Promise.all([
      store.listEstimateRequests(1000), store.listQuoteChecks(1000),
      store.listSubmissions(), store.listLeads(1000), store.listEvents(2000),
      store.listCities(), store.listZipCodes(),
      store.listPricingRecords("svc-roofing"), store.listAuditLog(20),
    ]);

  // Where is demand, and do we have data for it? This is the "which city next"
  // queue, and it is the whole reason estimate_requests exists.
  const knownZips = new Set(zips.map((z) => z.code));
  const zipCounts = new Map<string, { count: number; confidenceSum: number }>();
  for (const e of estimates) {
    const cur = zipCounts.get(e.zip) ?? { count: 0, confidenceSum: 0 };
    zipCounts.set(e.zip, { count: cur.count + 1, confidenceSum: cur.confidenceSum + e.confidence });
  }
  const demand = [...zipCounts.entries()]
    .map(([zip, v]) => ({
      zip, count: v.count, avgConfidence: Math.round(v.confidenceSum / v.count),
      known: knownZips.has(zip),
    }))
    .sort((a, b) => b.count - a.count);

  const gaps = demand.filter((d) => !d.known).slice(0, 12);

  const materialCounts = new Map<string, number>();
  for (const e of estimates) {
    const m = String((e.inputs as Record<string, unknown>).material ?? "unknown");
    materialCounts.set(m, (materialCounts.get(m) ?? 0) + 1);
  }

  const eventCounts = new Map<string, number>();
  for (const ev of events) eventCounts.set(ev.eventName, (eventCounts.get(ev.eventName) ?? 0) + 1);

  const sampleRecords = records.filter((r) => r.dataStatus === "sample").length;
  const pending = submissions.filter((s) => s.status === "pending");
  const avgEstimate = estimates.length
    ? estimates.reduce((a, e) => a + e.estimateTypical, 0) / estimates.length : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Estimates generated" value={estimates.length} />
        <Metric label="Quote checks" value={quoteChecks.length} />
        <Metric label="Submissions awaiting review" value={pending.length}
          tone={pending.length > 0 ? "caution" : "neutral"} />
        <Metric label="Interest registrations" value={leads.length} />
        <Metric label="Published cities" value={cities.filter((c) => c.isPublished).length} />
        <Metric label="ZIP codes mapped" value={zips.length} />
        <Metric label="Price rows on sample data" value={`${sampleRecords}/${records.length}`}
          tone={sampleRecords > 0 ? "caution" : "positive"} />
        <Metric label="Average typical estimate" value={avgEstimate ? usd(avgEstimate) : "-"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-[16px] font-semibold text-ink">Most requested ZIP codes</h2>
          <p className="mt-1 text-[13px] text-muted">
            Demand signal from the calculator. Low average confidence with high
            volume is the strongest possible argument for adding local data.
          </p>
          {demand.length === 0 ? (
            <Empty>No estimates captured yet. Run the calculator to populate this.</Empty>
          ) : (
            <table className="mt-4 w-full border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-faint">
                  <th className="pb-2 pr-3 font-semibold">ZIP</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Estimates</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Avg confidence</th>
                  <th className="pb-2 font-semibold">Mapped</th>
                </tr>
              </thead>
              <tbody>
                {demand.slice(0, 12).map((d) => (
                  <tr key={d.zip} className="border-b border-line/70">
                    <td className="py-2 pr-3 font-mono text-ink">{d.zip}</td>
                    <td className="py-2 pr-3 text-right tnum text-ink">{d.count}</td>
                    <td className="py-2 pr-3 text-right tnum text-muted">{d.avgConfidence}</td>
                    <td className="py-2">
                      <Badge tone={d.known ? "positive" : "caution"}>{d.known ? "yes" : "no"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-[16px] font-semibold text-ink">Coverage gaps</h2>
          <p className="mt-1 text-[13px] text-muted">
            ZIP codes people asked about that we have never heard of. These are
            the next rows to add to the geography table.
          </p>
          {gaps.length === 0 ? (
            <Empty>No unmapped ZIP codes requested yet.</Empty>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {gaps.map((g) => (
                <li key={g.zip} className="rounded-lg border border-caution/30 bg-caution-soft px-2.5 py-1.5 text-[13px]">
                  <span className="font-mono font-semibold text-ink">{g.zip}</span>
                  <span className="ml-2 tnum text-muted">{g.count}x</span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-8 text-[15px] font-semibold text-ink">Popular configurations</h3>
          {materialCounts.size === 0 ? (
            <Empty>Nothing yet.</Empty>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {[...materialCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([m, n]) => (
                <li key={m} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="text-ink-soft">{m}</span>
                  <span className="tnum text-muted">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-[16px] font-semibold text-ink">Funnel</h2>
          {eventCounts.size === 0 ? (
            <Empty>No events captured yet.</Empty>
          ) : (
            <ul className="mt-4 space-y-2">
              {[
                "calculator_started", "calculator_completed", "estimate_generated",
                "quote_check_started", "quote_check_completed",
                "quote_comparison_started", "quote_comparison_completed",
                "submission_completed", "lead_form_completed",
              ].map((name) => {
                const n = eventCounts.get(name) ?? 0;
                const max = Math.max(...[...eventCounts.values()], 1);
                return (
                  <li key={name}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="font-mono text-ink-soft">{name}</span>
                      <span className="tnum text-muted">{n}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full bg-accent/60" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-[16px] font-semibold text-ink">Recent changes</h2>
          <p className="mt-1 text-[13px] text-muted">
            Every reference-data edit is written to the audit log with before and
            after values.
          </p>
          {audit.length === 0 ? (
            <Empty>No edits recorded yet.</Empty>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {audit.map((a) => (
                <li key={a.id} className="border-b border-line/70 pb-2.5 text-[13px]">
                  <span className="font-medium text-ink">{a.action}</span>
                  <span className="text-muted"> on </span>
                  <span className="font-mono text-ink-soft">{a.tableName}</span>
                  <span className="text-muted"> / {a.recordId}</span>
                  <span className="block text-[12px] text-faint">
                    {new Date(a.createdAt).toLocaleString()} by {a.actor}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: {
  label: string; value: string | number; tone?: "neutral" | "caution" | "positive";
}) {
  const color = tone === "caution" ? "text-caution" : tone === "positive" ? "text-positive" : "text-ink";
  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">{label}</p>
      <p className={`mt-2 text-[24px] font-semibold tnum ${color}`}>{value}</p>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 rounded-lg bg-sunken px-4 py-6 text-center text-[13px] text-faint">{children}</p>;
}
