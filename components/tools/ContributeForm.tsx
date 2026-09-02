"use client";

import { useState } from "react";
import { isStaticBuild } from "@/lib/deployment";
import type { Material } from "@/lib/types";
import { CONSENT_TEXT } from "@/lib/consent";
import { Button, Callout, Card, Field, inputClass, selectClass } from "@/components/ui";
import { sessionId, track } from "@/lib/analytics";

export function ContributeForm({ materials }: { materials: Material[] }) {
  if (isStaticBuild) {
    return (
      <Callout tone="caution" title="Contributions are paused on this deployment">
        This build is served as static files, so there is no database to write a
        contributed project cost into. We would rather say that than accept your
        figures and lose them.
      </Callout>
    );
  }


  const [form, setForm] = useState<Record<string, string>>({
    zip: "", amountPaid: "", projectMonth: "", materialId: "", roofAreaSqft: "",
    stories: "1", quotesReceived: "", quotesReceivedLow: "", quotesReceivedHigh: "",
  });
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; message?: string }>({ status: "idle" });

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (state.status === "idle") track("submission_started");
  };

  const ready = /^\d{5}$/.test(form.zip) && Number(form.amountPaid) > 0
    && /^\d{4}-\d{2}$/.test(form.projectMonth) && consent;

  async function submit() {
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceSlug: "roofing", consent: true, sessionId: sessionId(),
          zip: form.zip, amountPaid: Number(form.amountPaid),
          projectMonth: form.projectMonth,
          materialId: form.materialId || undefined,
          roofAreaSqft: form.roofAreaSqft ? Number(form.roofAreaSqft) : undefined,
          stories: Number(form.stories) || undefined,
          quotesReceived: form.quotesReceived ? Number(form.quotesReceived) : undefined,
          quotesReceivedLow: form.quotesReceivedLow ? Number(form.quotesReceivedLow) : undefined,
          quotesReceivedHigh: form.quotesReceivedHigh ? Number(form.quotesReceivedHigh) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setState({ status: "error", message: data.error }); return; }
      track("submission_completed");
      setState({ status: "done", message: data.message });
    } catch {
      setState({ status: "error", message: "Network error - please try again." });
    }
  }

  if (state.status === "done") {
    return (
      <Card className="p-8">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Thank you</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{state.message}</p>
        <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-faint">
          Submissions are reviewed before they influence anything. A single
          project never moves a market figure on its own, and nothing you have
          entered can be traced back to your property.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="ZIP code" hint="Where the work was done.">
          <input className={inputClass} inputMode="numeric" maxLength={5} value={form.zip}
            onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} />
        </Field>
        <Field label="What you actually paid" hint="The final figure, including any change orders.">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-faint">$</span>
            <input className={`${inputClass} pl-7`} inputMode="numeric" value={form.amountPaid}
              onChange={(e) => set("amountPaid", e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
        </Field>
        <Field label="Month the work finished" hint="Month and year only. We deliberately do not store the day.">
          <input className={inputClass} type="month" value={form.projectMonth}
            onChange={(e) => set("projectMonth", e.target.value)} />
        </Field>
        <Field label="Material installed">
          <select className={selectClass} value={form.materialId} onChange={(e) => set("materialId", e.target.value)}>
            <option value="">Prefer not to say</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Roof area if you know it" suffix="sq ft">
          <input className={inputClass} inputMode="numeric" value={form.roofAreaSqft}
            onChange={(e) => set("roofAreaSqft", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Storeys">
          <select className={selectClass} value={form.stories} onChange={(e) => set("stories", e.target.value)}>
            <option value="1">Single storey</option>
            <option value="2">Two storeys</option>
            <option value="3">Three or more</option>
          </select>
        </Field>
        <Field label="How many quotes did you get?">
          <input className={inputClass} inputMode="numeric" value={form.quotesReceived}
            onChange={(e) => set("quotesReceived", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lowest quote" suffix="$">
            <input className={inputClass} inputMode="numeric" value={form.quotesReceivedLow}
              onChange={(e) => set("quotesReceivedLow", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Highest quote" suffix="$">
            <input className={inputClass} inputMode="numeric" value={form.quotesReceivedHigh}
              onChange={(e) => set("quotesReceivedHigh", e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>
      </div>

      <div className="mt-7 border-t border-line pt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-line-strong accent-[#0C6B58]" />
          <span className="text-[13.5px] leading-relaxed text-ink-soft">{CONSENT_TEXT}</span>
        </label>
      </div>

      {state.status === "error" && (
        <div className="mt-5"><Callout tone="danger">{state.message}</Callout></div>
      )}

      <Button onClick={() => void submit()} disabled={!ready || state.status === "sending"}
        size="lg" className="mt-6 w-full sm:w-auto">
        {state.status === "sending" ? "Sending..." : "Submit my figures"}
      </Button>
      {!ready && (
        <p className="mt-3 text-[12.5px] text-faint">
          ZIP code, amount paid, month and consent are required. Everything else is optional.
        </p>
      )}
    </Card>
  );
}
