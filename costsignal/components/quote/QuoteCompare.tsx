"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Material, ProjectType } from "@/lib/types";
import type { EstimateResult } from "@/lib/engine/types";
import type { ComparisonResult, ScopeKey } from "@/lib/engine/quote";
import { SCOPE_ITEMS } from "@/lib/engine/quote";
import { roofingSteps } from "@/lib/engine/roofing/schema";
import { StepFields } from "@/components/calculator/Fields";
import { Badge, Button, Callout, Card, Field, inputClass } from "@/components/ui";
import { sessionId, track } from "@/lib/analytics";
import { usd } from "@/lib/format";

type Values = Record<string, unknown>;

interface DraftQuote {
  id: string;
  label: string;
  totalPrice: string;
  warrantyWorkmanshipYears: string;
  scope: Partial<Record<ScopeKey, boolean>>;
  notes: string;
}

const NUMERIC = new Set([
  "roofAreaSqft", "houseSqft", "stories", "planes", "skylights", "chimneys",
  "existingLayers", "ventilationQty", "deckSheets", "gutterLf",
]);

function blankQuote(i: number): DraftQuote {
  return {
    id: `q${i}-${Math.random().toString(36).slice(2, 7)}`,
    label: `Contractor ${String.fromCharCode(65 + i)}`,
    totalPrice: "", warrantyWorkmanshipYears: "", scope: {}, notes: "",
  };
}

export function QuoteCompare({ materials, projectTypes, initialValues }: {
  materials: Material[]; projectTypes: ProjectType[]; initialValues?: Values;
}) {
  const [values, setValues] = useState<Values>(() => ({
    areaMode: "house", houseSqft: 2000, stories: 1, material: "asphalt-architectural",
    projectType: "full-replacement", pitch: "moderate", complexity: "moderate",
    existingLayers: 1, includePermit: true, includeDisposal: true,
    skylights: 0, chimneys: 0, deckSheets: 2, access: "easy",
    underlayment: "synthetic", flashing: "standard", ventilation: "ridge-vent",
    quality: "standard", warranty: "standard", addons: [],
    ...initialValues,
  }));
  const [quotes, setQuotes] = useState<DraftQuote[]>(() => [blankQuote(0), blankQuote(1)]);
  const [result, setResult] = useState<{ estimate: EstimateResult; comparison: ComparisonResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const set = useCallback((name: string, value: unknown) => {
    if (!started.current) { started.current = true; track("quote_comparison_started"); }
    setValues((v) => ({ ...v, [name]: value }));
  }, []);

  const patchQuote = (id: string, patch: Partial<DraftQuote>) =>
    setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const toggleScope = (id: string, key: ScopeKey) =>
    setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, scope: { ...q.scope, [key]: !q.scope[key] } } : q)));

  const zipValid = /^\d{5}$/.test(String(values.zip ?? ""));
  const priced = quotes.filter((q) => Number(q.totalPrice) > 0);
  const ready = zipValid && priced.length >= 2;

  const payload = useMemo(() => {
    const out: Values = {};
    for (const [k, v] of Object.entries(values)) {
      if (v === "" || v === undefined || v === null) continue;
      out[k] = NUMERIC.has(k) ? Number(v) : v;
    }
    return out;
  }, [values]);

  const options = useMemo(() => ({
    materials: materials.map((m) => ({ value: m.slug, label: m.name })),
    projectTypes: projectTypes.map((p) => ({ value: p.slug, label: p.name, hint: p.description })),
  }), [materials, projectTypes]);

  async function compare() {
    if (!ready) return;
    setPending(true);
    try {
      const res = await fetch("/api/quote-compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceSlug: "roofing", input: payload, sessionId: sessionId(),
          quotes: priced.map((q) => ({
            id: q.id, label: q.label, totalPrice: Number(q.totalPrice),
            warrantyWorkmanshipYears: q.warrantyWorkmanshipYears ? Number(q.warrantyWorkmanshipYears) : undefined,
            scope: q.scope, notes: q.notes || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not compare these quotes"); return; }
      setError(null);
      setResult(data);
      track("quote_comparison_completed", { quoteCount: priced.length, spreadPct: data.comparison.spreadPct });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">The project</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          All the quotes are for the same roof, so describe it once. This gives us
          the modelled range to measure them against.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roofingSteps.filter((s) => !s.advanced).map((step) => (
            <StepFields key={step.id} step={step} values={values} set={set} options={options} />
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {quotes.map((q, i) => (
          <Card key={q.id} className="p-6">
            <div className="flex items-start justify-between gap-3">
              <input
                aria-label="Quote label"
                className="w-full max-w-[220px] rounded-lg border border-transparent bg-transparent px-2 py-1 text-[16px] font-semibold text-ink hover:border-line focus:border-accent focus:outline-none"
                value={q.label}
                onChange={(e) => patchQuote(q.id, { label: e.target.value.slice(0, 60) })}
              />
              {quotes.length > 2 && (
                <button
                  type="button"
                  onClick={() => setQuotes((qs) => qs.filter((x) => x.id !== q.id))}
                  className="shrink-0 rounded-lg px-2 py-1 text-[12.5px] font-medium text-faint hover:bg-sunken hover:text-danger"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Quoted total">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-faint">$</span>
                  <input
                    className={`${inputClass} pl-7`}
                    inputMode="numeric"
                    placeholder={`${18500 + i * 1500}`}
                    value={q.totalPrice}
                    onChange={(e) => patchQuote(q.id, { totalPrice: e.target.value.replace(/[^\d.]/g, "") })}
                  />
                </div>
              </Field>
              <Field label="Workmanship warranty" suffix="years">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  placeholder="10"
                  value={q.warrantyWorkmanshipYears}
                  onChange={(e) => patchQuote(q.id, { warrantyWorkmanshipYears: e.target.value.replace(/\D/g, "") })}
                />
              </Field>
            </div>

            <fieldset className="mt-5">
              <legend className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">
                Stated in the written quote
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SCOPE_ITEMS.map((s) => (
                  <label key={s.key} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={q.scope[s.key] === true}
                      onChange={() => toggleScope(q.id, s.key)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-[#0C6B58]"
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {quotes.length < 6 && (
          <Button variant="secondary" onClick={() => setQuotes((qs) => [...qs, blankQuote(qs.length)])}>
            Add another quote
          </Button>
        )}
        <Button onClick={() => void compare()} disabled={!ready || pending} size="lg">
          {pending ? "Comparing..." : "Compare these quotes"}
        </Button>
        {!ready && (
          <p className="text-[12.5px] text-faint">
            Needs a ZIP code and at least two quotes with a price.
          </p>
        )}
      </div>

      {error && (
        <Card className="border-danger/25 bg-danger-soft p-5">
          <p className="text-[14px] font-medium text-danger">{error}</p>
        </Card>
      )}

      <div ref={resultRef} className="scroll-mt-28">
        {result && <ComparisonView {...result} />}
      </div>
    </div>
  );
}

function ComparisonView({ estimate, comparison }: {
  estimate: EstimateResult; comparison: ComparisonResult;
}) {
  const sorted = [...comparison.quotes].sort((a, b) => a.adjustedComparable - b.adjustedComparable);

  return (
    <div className="space-y-5">
      <Card className="px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
              Our modelled range for this project
            </p>
            <p className="mt-1.5 text-[26px] font-semibold tnum text-ink">
              {usd(estimate.range.low)} <span className="text-faint">–</span> {usd(estimate.range.high)}
            </p>
          </div>
          <Badge tone="neutral">Spread between quotes: {comparison.spreadPct}%</Badge>
        </div>

        <div className="mt-6 space-y-3">
          {comparison.narrative.map((n) => (
            <p key={n} className="text-[14.5px] leading-relaxed text-ink-soft">{n}</p>
          ))}
        </div>

        <div className="scroll-x mt-7">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="pb-2.5 pr-4 font-semibold">Quote</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Sticker price</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">
                  Adjusted for scope
                  <span className="block font-normal normal-case tracking-normal text-faint">
                    plus what it leaves out
                  </span>
                </th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Scope stated</th>
                <th className="pb-2.5 text-right font-semibold">vs our range</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((q) => (
                <tr key={q.id} className="border-b border-line align-top">
                  <td className="py-3.5 pr-4">
                    <span className="text-[14.5px] font-semibold text-ink">{q.label}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {q.isLowestSticker && <Badge tone="neutral">Lowest sticker</Badge>}
                      {q.isLowestAdjusted && <Badge tone="accent">Lowest adjusted</Badge>}
                      {q.isMostComplete && <Badge tone="positive">Most complete scope</Badge>}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-right text-[15px] tnum text-muted">{usd(q.totalPrice)}</td>
                  <td className="py-3.5 pr-4 text-right text-[16px] font-semibold tnum text-ink">
                    {usd(q.adjustedComparable)}
                    {q.adjustedComparable !== q.totalPrice && (
                      <span className="block text-[12px] font-normal text-faint">
                        +{usd(q.adjustedComparable - q.totalPrice)} of missing scope
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-right text-[14px] tnum text-muted">{q.scopeCoveragePct}%</td>
                  <td className="py-3.5 text-right">
                    <Badge tone={q.vsRange === "within" ? "positive" : q.vsRange.includes("well") ? "danger" : "caution"}>
                      {q.vsRange.replace("-", " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Callout tone="neutral" title="How to read this">
            {comparison.disclaimer} The cheapest sticker price is never
            automatically the best quote, and we do not rank them for you. What
            we can do is stop you comparing two different jobs as if they were
            the same one.
          </Callout>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((q) => (
          <Card key={q.id} className="p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[16px] font-semibold text-ink">{q.label}</h3>
              <span className="text-[15px] font-semibold tnum text-ink">{usd(q.totalPrice)}</span>
            </div>

            {q.missingScope.length > 0 && (
              <div className="mt-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">
                  Not stated in this quote
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {q.missingScope.map((m) => (
                    <li key={m.key} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                      <span className="text-ink-soft">{m.label}</span>
                      <span className="shrink-0 tnum text-faint">
                        {m.estimatedCost != null ? `~${usd(m.estimatedCost)}` : "ask"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {q.flags.length > 0 && (
              <ul className="mt-5 space-y-2">
                {q.flags.map((f) => (
                  <li
                    key={f.text}
                    className={`rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
                      f.level === "caution" ? "bg-caution-soft text-ink-soft" : "bg-sunken text-muted"
                    }`}
                  >
                    {f.text}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
