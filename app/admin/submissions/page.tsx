import { getStore } from "@/lib/data/store";
import { reviewSubmissionAction } from "../actions";
import { ReviewForm } from "@/components/admin/AdminForms";
import { Badge, Card } from "@/components/ui";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const store = await getStore();
  const [all, materials, zips] = await Promise.all([
    store.listSubmissions(), store.listMaterials("svc-roofing"), store.listZipCodes(),
  ]);
  const materialName = new Map(materials.map((m) => [m.id, m.name]));
  const knownZips = new Set(zips.map((z) => z.code));

  const pending = all.filter((s) => s.status === "pending");
  const reviewed = all.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-10">
      <Card className="p-6">
        <h2 className="text-[17px] font-semibold text-ink">Reviewing homeowner submissions</h2>
        <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-muted">
          Nothing here influences an estimate until it is approved, and an
          approved submission is only ever used in aggregate. Reject anything
          implausible &mdash; an amount that cannot correspond to the stated roof
          area, a ZIP that does not exist, or an obvious test entry. Rejections
          are kept rather than deleted so the review process is itself auditable.
        </p>
      </Card>

      <section>
        <div className="flex items-center gap-3">
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Awaiting review</h2>
          <Badge tone={pending.length ? "caution" : "positive"}>{pending.length}</Badge>
        </div>

        {pending.length === 0 ? (
          <p className="mt-5 rounded-lg bg-sunken px-4 py-8 text-center text-[13.5px] text-faint">
            Nothing waiting. Submissions arrive from the /contribute page.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {pending.map((s) => {
              const perSqFt = s.roofAreaSqft ? s.amountPaid / s.roofAreaSqft : null;
              const implausible = perSqFt != null && (perSqFt < 2 || perSqFt > 60);
              return (
                <Card key={s.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[22px] font-semibold tnum text-ink">{usd(s.amountPaid)}</p>
                      <p className="mt-1 text-[13px] text-muted">
                        ZIP <span className="font-mono text-ink">{s.zip}</span>
                        {!knownZips.has(s.zip) && <span className="ml-2 text-caution">not in our geography table</span>}
                        {" · "}{s.projectMonth}
                        {s.materialId && ` · ${materialName.get(s.materialId) ?? s.materialId}`}
                        {s.roofAreaSqft && ` · ${s.roofAreaSqft.toLocaleString()} sq ft`}
                      </p>
                      {perSqFt != null && (
                        <p className={`mt-1 text-[13px] tnum ${implausible ? "text-danger" : "text-muted"}`}>
                          {usd(perSqFt, { cents: true })} per sq ft
                          {implausible && " - outside a plausible range, check before approving"}
                        </p>
                      )}
                      {s.quotesReceived != null && (
                        <p className="mt-1 text-[13px] text-muted">{s.quotesReceived} quotes received</p>
                      )}
                    </div>
                    <div className="text-right text-[12px] text-faint">
                      <p>Submitted {new Date(s.submittedAt).toLocaleDateString()}</p>
                      <p className="mt-0.5 font-mono">{s.consentVersion}</p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-line pt-4">
                    <ReviewForm action={reviewSubmissionAction} id={s.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {reviewed.length > 0 && (
        <section>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Reviewed</h2>
          <div className="scroll-x mt-5">
            <table className="w-full min-w-[680px] border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                  <th className="pb-2.5 pr-4 font-semibold">Amount</th>
                  <th className="pb-2.5 pr-4 font-semibold">ZIP</th>
                  <th className="pb-2.5 pr-4 font-semibold">Month</th>
                  <th className="pb-2.5 pr-4 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((s) => (
                  <tr key={s.id} className="border-b border-line">
                    <td className="py-2.5 pr-4 tnum text-ink">{usd(s.amountPaid)}</td>
                    <td className="py-2.5 pr-4 font-mono text-muted">{s.zip}</td>
                    <td className="py-2.5 pr-4 tnum text-muted">{s.projectMonth}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={s.status === "approved" ? "positive" : "danger"}>{s.status}</Badge>
                    </td>
                    <td className="py-2.5 text-muted">{s.moderationNotes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
