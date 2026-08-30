"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Material, ProjectType } from "@/lib/types";
import type { EstimateResult } from "@/lib/engine/types";
import { roofingSteps } from "@/lib/engine/roofing/schema";
import { EstimateResultView } from "@/components/estimate/EstimateView";
import { Badge, Button, Card } from "@/components/ui";
import { StepFields, type FieldOptions } from "@/components/calculator/Fields";
import { sessionId, track } from "@/lib/analytics";
import { usd } from "@/lib/format";

type Values = Record<string, unknown>;

const NUMERIC = new Set([
  "roofAreaSqft", "houseSqft", "stories", "planes", "skylights", "chimneys",
  "existingLayers", "ventilationQty", "deckSheets", "gutterLf", "partialSharePct",
]);

const WIZARD_STEPS = roofingSteps.filter((s) => !s.advanced);
const ADVANCED_STEPS = roofingSteps.filter((s) => s.advanced);

export function RoofCalculator({
  materials, projectTypes, initialValues, autoStart = false,
}: {
  materials: Material[];
  projectTypes: ProjectType[];
  initialValues?: Values;
  /** City/ZIP pages jump straight to a result rather than an empty form. */
  autoStart?: boolean;
}) {
  const [values, setValues] = useState<Values>(() => ({
    areaMode: "house", houseSqft: 2000, stories: 1, material: "asphalt-architectural",
    projectType: "full-replacement", pitch: "moderate", complexity: "moderate",
    existingLayers: 1, underlayment: "synthetic", flashing: "standard",
    ventilation: "ridge-vent", deckSheets: 2, access: "easy", quality: "standard",
    warranty: "standard", includePermit: true, includeDisposal: true,
    skylights: 0, chimneys: 0, addons: [],
    ...initialValues,
  }));

  const [stepIndex, setStepIndex] = useState(autoStart ? WIZARD_STEPS.length : 0);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const startedRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const showingResult = stepIndex >= WIZARD_STEPS.length;

  const set = useCallback((name: string, value: unknown) => {
    if (!startedRef.current) {
      startedRef.current = true;
      track("calculator_started");
    }
    setValues((v) => ({ ...v, [name]: value }));
  }, []);

  // Build the payload the API expects: only keys the user has actually set,
  // so the engine can distinguish "chosen" from "defaulted" for confidence.
  const payload = useMemo(() => {
    const out: Values = {};
    for (const [k, v] of Object.entries(values)) {
      if (v === "" || v === undefined || v === null) continue;
      out[k] = NUMERIC.has(k) ? Number(v) : v;
    }
    return out;
  }, [values]);

  const zipValid = /^\d{5}$/.test(String(values.zip ?? ""));

  const compute = useCallback(async (signal?: AbortSignal) => {
    if (!zipValid) return;
    setPending(true);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST", signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceSlug: "roofing", input: payload, sessionId: sessionId(),
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not calculate an estimate"); return; }
      setError(null);
      setEstimate(data.estimate);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") setError("Network error - please try again.");
    } finally {
      setPending(false);
    }
  }, [payload, zipValid]);

  // Live recalculation while the result is on screen. Debounced so typing in a
  // number field does not fire a request per keystroke.
  useEffect(() => {
    if (!showingResult || !zipValid) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => void compute(ctrl.signal), 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [showingResult, compute, zipValid]);

  useEffect(() => {
    if (estimate && showingResult) {
      track("estimate_generated", {
        zip: String(values.zip ?? ""), material: String(values.material ?? ""),
        confidence: estimate.confidence.score, typical: estimate.range.typical,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate?.range.typical]);

  const options = useMemo(() => ({
    materials: materials.map((m) => ({
      value: m.slug, label: m.name,
      hint: `${m.expectedLifeYearsMin}-${m.expectedLifeYearsMax} year service life`,
    })),
    projectTypes: projectTypes.map((p) => ({ value: p.slug, label: p.name, hint: p.description })),
  }), [materials, projectTypes]);

  function advance() {
    const next = stepIndex + 1;
    track("calculator_step_completed", { step: WIZARD_STEPS[stepIndex]?.id ?? "unknown" });
    setStepIndex(next);
    if (next >= WIZARD_STEPS.length) {
      track("calculator_completed");
      void compute();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }

  const currentStep = WIZARD_STEPS[Math.min(stepIndex, WIZARD_STEPS.length - 1)];
  const canAdvance = stepIndex === 0 ? zipValid : true;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
      {/* ---------------- Form column ---------------- */}
      <Card className="p-6 lg:sticky lg:top-24">
        {!showingResult ? (
          <>
            <div className="mb-5 flex items-center gap-2">
              {WIZARD_STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-accent" : "bg-sunken"}`}
                  aria-hidden
                />
              ))}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
              Step {stepIndex + 1} of {WIZARD_STEPS.length}
            </p>
            <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.02em] text-ink">
              {currentStep.title}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{currentStep.description}</p>

            <div className="mt-6 space-y-5">
              <StepFields step={currentStep} values={values} set={set} options={options} />
            </div>

            <div className="mt-7 flex items-center gap-3">
              {stepIndex > 0 && (
                <Button variant="secondary" onClick={() => setStepIndex((i) => i - 1)}>Back</Button>
              )}
              <Button onClick={advance} disabled={!canAdvance} className="flex-1">
                {stepIndex === WIZARD_STEPS.length - 1 ? "Calculate my roof cost" : "Continue"}
              </Button>
            </div>
            {stepIndex === 0 && !zipValid && (
              <p className="mt-3 text-[12.5px] text-faint">
                We start with location because labour, permits and disposal are
                local, and together they are most of what makes the same roof cost
                different amounts in different cities.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold text-ink">Refine your estimate</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Every change updates the number instantly.
                </p>
              </div>
              {pending && <Badge tone="accent">Updating</Badge>}
            </div>

            <div className="mt-5 space-y-5">
              {roofingSteps.filter((s) => !s.advanced).map((step) => (
                <div key={step.id} className="space-y-5">
                  <StepFields step={step} values={values} set={set} options={options} />
                </div>
              ))}
            </div>

            {ADVANCED_STEPS.map((step) => (
              <details key={step.id} className="group mt-5 border-t border-line pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-ink marker:content-none">
                  {step.title}
                  <span aria-hidden className="text-faint transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                </summary>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{step.description}</p>
                <div className="mt-4 space-y-5">
                  <StepFields step={step} values={values} set={set} options={options} />
                </div>
              </details>
            ))}

            <Button
              variant="secondary"
              className="mt-6 w-full"
              onClick={() => { setStepIndex(0); setEstimate(null); }}
            >
              Start over
            </Button>
          </>
        )}
      </Card>

      {/* ---------------- Result column ---------------- */}
      <div ref={resultRef} className="min-w-0 scroll-mt-28">
        {error && (
          <Card className="border-danger/25 bg-danger-soft p-5">
            <p className="text-[14px] font-medium text-danger">{error}</p>
          </Card>
        )}

        {!showingResult && !estimate && <EmptyState />}

        {estimate && (
          <div className={pending ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <EstimateResultView estimate={estimate} />
            <NextSteps estimate={estimate} values={values} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="flex h-full min-h-[420px] flex-col items-center justify-center px-8 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 14 12 5l9 9" stroke="#0C6B58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 19v-5M12 19v-7M17 19v-3" stroke="#0C6B58" strokeWidth="2" strokeLinecap="round" opacity=".6" />
        </svg>
      </div>
      <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.02em] text-ink">
        Your estimate will appear here
      </h3>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
        Three questions is enough for a first number. After that you can refine
        any assumption and watch the price move, so you can see exactly what is
        driving it.
      </p>
    </Card>
  );
}

function NextSteps({ estimate, values }: { estimate: EstimateResult; values: Values }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) {
    if (v === "" || v === undefined || v === null || Array.isArray(v)) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();

  return (
    <Card className="mt-5 p-6 sm:p-8">
      <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">What to do next</h3>
      <p className="mt-1.5 text-[14px] text-muted">
        A number on its own does not help you hire anyone. These do.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <NextCard
          href={`/quote-check?${qs}`}
          title="Check a quote you already have"
          body={`Compare a contractor's number against this ${usd(estimate.range.low)}-${usd(estimate.range.high)} range, and see which single assumption would explain any gap.`}
        />
        <NextCard
          href={`/compare-quotes?${qs}`}
          title="Compare several quotes properly"
          body="Normalise quotes for scope so the cheapest sticker price stops looking like the cheapest job."
        />
        <NextCard
          href="/contractor-questions"
          title="Questions to ask before you sign"
          body="A printable list built around the line items that actually cause disputes."
        />
        <NextCard
          href={`/financing?amount=${estimate.range.typical}`}
          title="Work out payment scenarios"
          body="Your own rates and terms, the arithmetic done for you. No lenders, no referrals."
        />
      </div>
    </Card>
  );
}

function NextCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <a
      href={href}
      className="group rounded-xl border border-line bg-sunken/50 p-4 transition-colors hover:border-accent-line hover:bg-accent-soft/40"
    >
      <p className="text-[14.5px] font-semibold text-ink group-hover:text-accent">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
    </a>
  );
}
