"use client";

import { useState } from "react";
import { Button, Callout, Card, Field, inputClass, selectClass } from "@/components/ui";
import { track } from "@/lib/analytics";

/**
 * Contractor-matching interest, not a lead funnel.
 *
 * There is no vetted contractor network yet, and this form says so before you
 * fill it in rather than after. Nothing is sold on, and the honest response is
 * returned by the API rather than a fake confirmation.
 */
export function InterestForm() {
  const [form, setForm] = useState({ contactName: "", email: "", phone: "", zip: "", timeline: "3-6 months" });
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; message?: string }>({ status: "idle" });

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (state.status === "idle") track("lead_form_started");
  };

  const ready = form.contactName.trim().length > 1
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)
    && /^\d{5}$/.test(form.zip) && consent;

  async function submit() {
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, serviceSlug: "roofing", consent: true }),
      });
      const data = await res.json();
      if (!res.ok) { setState({ status: "error", message: data.error }); return; }
      track("lead_form_completed");
      setState({ status: "done", message: data.message });
    } catch {
      setState({ status: "error", message: "Network error - please try again." });
    }
  }

  if (state.status === "done") {
    return (
      <Card className="p-8">
        <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Noted</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{state.message}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name">
          <input className={inputClass} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="ZIP code">
          <input className={inputClass} inputMode="numeric" maxLength={5} value={form.zip}
            onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} />
        </Field>
        <Field label="Phone" hint="Optional. We will not call you.">
          <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Timeline">
          <select className={selectClass} value={form.timeline} onChange={(e) => set("timeline", e.target.value)}>
            {["Emergency - active leak", "Within a month", "1-3 months", "3-6 months", "Just planning ahead"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-line-strong accent-[#0C6B58]" />
          <span className="text-[13.5px] leading-relaxed text-ink-soft">
            I would like to be told when contractor matching is available in my
            area. I understand Home Cost Doctor has no contractor network today, will
            not pass my details to third parties, and that I can ask for my
            details to be deleted at any time.
          </span>
        </label>
      </div>

      {state.status === "error" && <div className="mt-5"><Callout tone="danger">{state.message}</Callout></div>}

      <Button onClick={() => void submit()} disabled={!ready || state.status === "sending"} className="mt-6" size="lg">
        {state.status === "sending" ? "Sending..." : "Let me know when this is live"}
      </Button>
    </Card>
  );
}
