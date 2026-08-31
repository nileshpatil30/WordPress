"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Material, ProjectType } from "@/lib/types";
import type { EstimateResult } from "@/lib/engine/types";
import type { QuoteAssessment } from "@/lib/engine/quote";
import type { VarianceExplanation } from "@/lib/engine/roofing/explain";
import { roofingSteps } from "@/lib/engine/roofing/schema";
import { StepFields } from "@/components/calculator/Fields";
import { QuoteUpload } from "@/components/quote/QuoteUpload";
import { PriceRangeBar } from "@/components/estimate/EstimateView";
import { Badge, Button, Callout, Card, Field, inputClass } from "@/components/ui";
import { sessionId, track } from "@/lib/analytics";
import { ShareButton } from "@/components/estimate/ShareButton";
import { encodeShare } from "@/lib/share";
import { pct, usd } from "@/lib/format";

type Values = Record<string, unknown>;

const NUMERIC = new Set([
  "roofAreaSqft", "houseSqft", "stories", "planes", "skylights", "chimneys",
  "existingLayers", "ventilationQty", "deckSheets", "gutterLf",
]);

const VERDICT_TONE = {
  "well-below": "danger", below: "caution", within: "positive",
  above: "caution", "well-above": "danger",
} as const;

export function QuoteChecker({ materials, projectTypes, initialValues }: {
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
  const [quotedPrice, setQuotedPrice] = useState<string>("");
  const [result, setResult] = useState<{
    estimate: EstimateResult; assessment: QuoteAssessment; variance: VarianceExplanation | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadFlags, setUploadFlags] = useState<{ issue: string; quotedText: string }[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const set = useCallback((name: string, value: unknown) => {
    if (!started.current) { started.current = true; track("quote_check_started"); }
    setValues((v) => ({ ...v, [name]: value }));
  }, []);

  const payload = useMemo(() => {
    const out: Values = {};
    for (const [k, v] of Object.entries(values)) {
      if (v === "" || v === undefined || v === null) continue;
      out[k] = NUMERIC.has(k) ? Number(v) : v;
    }
    return out;
  }, [values]);

  const zipValid = /^\d{5}$/.test(String(values.zip ?? ""));
  const priceValid = Number(quotedPrice) > 0;
  const ready = zipValid && priceValid;

  const check = useCallback(async () => {
    if (!ready) return;
    setPending(true);
    try {
      const res = await fetch("/api/quote-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceSlug: "roofing", input: payload,
          quotedPrice: Number(quotedPrice), sessionId: sessionId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not check this quote"); return; }
      setError(null);
      setResult(data);
      track("quote_check_completed", {
        verdict: data.assessment.verdict, deltaPct: data.assessment.deltaVsTypicalPct,
      });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setPending(false);
    }
  }, [payload, quotedPrice, ready]);

  // Once a result is on screen, keep it in step with the inputs.
  useEffect(() => {
    if (!result || !ready) return;
    const t = setTimeout(() => void check(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, quotedPrice]);

  const options = useMemo(() => ({
    materials: materials.map((m) => ({ value: m.slug, label: m.name })),
    projectTypes: projectTypes.map((p) => ({ value: p.slug, label: p.name, hint: p.description })),
  }), [materials, projectTypes]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4 lg:sticky lg:top-24">
        <QuoteUpload
          zip={/^\d{5}$/.test(String(values.zip ?? "")) ? String(values.zip) : undefined}
          onExtracted={(e) => {
            // Merge what the document actually stated; leave everything else
            // at its default so the user can see what still needs answering.
            setValues((v) => ({ ...v, ...e.projectInput }));
            if (e.quoteRow.totalPrice != null) setQuotedPrice(String(e.quoteRow.totalPrice));
            if (e.quoteRow.warrantyWorkmanshipYears != null) {
              setValues((v) => ({ ...v, warranty: "extended-labor" }));
            }
            setUploadFlags(e.redFlags);
            if (!started.current) { started.current = true; track("quote_check_started"); }
          }}
        />

      <Card className="p-6">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Your quote</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Enter the contractor&rsquo;s total, then describe the project as
          accurately as you can. The closer the description, the more useful the
          comparison.
        </p>

        <div className="mt-5">
          <Field label="Contractor's quoted total" hint="The full price on the proposal, before any discount you have negotiated.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-faint">$</span>
              <input
                className={`${inputClass} pl-7`}
                inputMode="numeric"
                placeholder="18,500"
                value={quotedPrice}
                onChange={(e) => {
                  setQuotedPrice(e.target.value.replace(/[^\d.]/g, ""));
                  if (!started.current) { started.current = true; track("quote_check_started"); }
                }}
              />
            </div>
          </Field>
        </div>

        <div className="mt-5 space-y-5 border-t border-line pt-5">
          {roofingSteps.filter((s) => !s.advanced).map((step) => (
            <StepFields key={step.id} step={step} values={values} set={set} options={options} />
          ))}
        </div>

        {roofingSteps.filter((s) => s.advanced).map((step) => (
          <details key={step.id} className="group mt-5 border-t border-line pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-ink marker:content-none">
              {step.title}
              <span aria-hidden className="text-lg leading-none text-faint transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="mt-4 space-y-5">
              <StepFields step={step} values={values} set={set} options={options} />
            </div>
          </details>
        ))}

        <Button onClick={() => void check()} disabled={!ready || pending} className="mt-6 w-full" size="lg">
          {pending ? "Checking..." : "Check this quote"}
        </Button>
        {!ready && (
          <p className="mt-3 text-[12.5px] text-faint">
            A ZIP code and the quoted total are the two things we cannot work without.
          </p>
        )}
      </Card>
      </div>

      <div ref={resultRef} className="min-w-0 scroll-mt-28 space-y-5">
        {error && (
          <Card className="border-danger/25 bg-danger-soft p-5">
            <p className="text-[14px] font-medium text-danger">{error}</p>
          </Card>
        )}

        {!result && !error && <QuoteEmptyState />}

        {uploadFlags.length > 0 && (
          <div className="space-y-2">
            {uploadFlags.map((f) => (
              <Callout key={f.issue} tone="danger" title={f.issue}>
                Found in your quote: <span className="italic">&ldquo;{f.quotedText}&rdquo;</span>
              </Callout>
            ))}
          </div>
        )}

        {result && (
          <>
            <VerdictCard {...result} shareUrl={`/r/${encodeShare({ ...payload, quotedPrice: Number(quotedPrice) })}`} />
            {result.variance && <VarianceCard variance={result.variance} />}
            <ConsiderationsCard assessment={result.assessment} />
          </>
        )}
      </div>
    </div>
  );
}

function VerdictCard({ estimate, assessment, shareUrl }: {
  estimate: EstimateResult; assessment: QuoteAssessment; shareUrl: string;
}) {
  const tone = VERDICT_TONE[assessment.verdict];
  const markerTone = tone === "positive" ? "positive" : tone === "caution" ? "caution" : "danger";

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
              Your contractor quote
            </p>
            <p className="display mt-2 text-[38px] font-semibold text-ink sm:text-[46px]">
              {usd(assessment.quotedPrice)}
            </p>
          </div>
          <Badge tone={tone}>{assessment.headline}</Badge>
        </div>

        <div className="mt-7 border-t border-line pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            Our modelled range for this project
          </p>
          <p className="mt-1.5 text-[24px] font-semibold tnum text-ink">
            {usd(estimate.range.low)} <span className="text-faint">–</span> {usd(estimate.range.high)}
          </p>
          <div className="mt-4">
            <PriceRangeBar
              low={estimate.range.low}
              typical={estimate.range.typical}
              high={estimate.range.high}
              marker={{ value: assessment.quotedPrice, label: "Your quote", tone: markerTone }}
            />
          </div>
          <p className="mt-4 text-[13px] text-muted">
            That is <span className="font-semibold tnum text-ink">{pct(assessment.deltaVsTypicalPct, 1)}</span>{" "}
            against our typical figure of{" "}
            <span className="font-semibold tnum text-ink">{usd(estimate.range.typical)}</span>, with a
            confidence score of {estimate.confidence.score}/100.
          </p>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8">
        <p className="text-[15px] leading-relaxed text-ink-soft">{assessment.summary}</p>
        <Callout tone="neutral" title="Read this before you act on it">
          {assessment.disclaimer}
        </Callout>

        <div className="mt-5 border-t border-line pt-5">
          <ShareButton shareUrl={shareUrl} label="Copy a link to this comparison" />
          <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
            Useful for a second opinion, or for the thread where someone asked
            whether their quote was reasonable.
          </p>
        </div>
      </div>
    </Card>
  );
}

function VarianceCard({ variance }: { variance: VarianceExplanation }) {
  return (
    <Card className="px-6 py-7 sm:px-8">
      <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
        What would have to be true
      </h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
        We re-ran the model changing exactly one assumption at a time. These are
        the changes that, on their own, would move our range to include your
        quote &mdash; which makes each one a specific question to ask, rather
        than a verdict about the contractor.
      </p>

      {variance.explains.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {variance.explains.map((c) => (
            <li key={c.change} className="rounded-xl border border-accent-line bg-accent-soft/40 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14.5px] font-semibold text-ink">{c.change}</p>
                <span className="text-[12.5px] font-semibold tnum text-accent">
                  {pct(c.impactPct, 1)} on the typical price
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.detail}</p>
              <p className="mt-2 text-[12.5px] tnum text-faint">
                Revised range: {usd(c.newRange.low)} – {usd(c.newRange.high)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <Callout tone="caution">{variance.conclusion}</Callout>
        </div>
      )}

      <details className="group mt-6 border-t border-line pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-ink marker:content-none">
          The biggest levers on this project, ranked
          <span aria-hidden className="text-lg leading-none text-faint transition-transform group-open:rotate-45">+</span>
        </summary>
        <ul className="mt-4 space-y-2.5">
          {variance.sensitivities.map((s) => (
            <li key={s.change} className="flex items-baseline justify-between gap-4 border-b border-line/70 pb-2.5">
              <span className="text-[13.5px] text-ink-soft">{s.change}</span>
              <span className={`shrink-0 text-[13px] font-semibold tnum ${s.impactPct > 0 ? "text-caution" : "text-positive"}`}>
                {pct(s.impactPct, 1)}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {variance.explains.length > 0 && (
        <p className="mt-5 text-[13px] leading-relaxed text-muted">{variance.conclusion}</p>
      )}
    </Card>
  );
}

function ConsiderationsCard({ assessment }: { assessment: QuoteAssessment }) {
  return (
    <Card className="px-6 py-7 sm:px-8">
      <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
        Questions worth asking
      </h3>
      <ul className="mt-4 space-y-3">
        {assessment.considerations.map((c) => (
          <li key={c} className="flex gap-3 text-[14px] leading-relaxed text-ink-soft">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuoteEmptyState() {
  return (
    <Card className="flex min-h-[380px] flex-col justify-center px-8 py-12">
      <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
        A quote outside our range is not proof of anything
      </h3>
      <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-muted">
        It is a prompt to ask a better question. When your quote sits outside the
        modelled range, we do not tell you the contractor is wrong &mdash; we
        re-run the model one assumption at a time and show you which single
        change would account for the difference.
      </p>
      <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-muted">
        Often it is roof area. Sometimes it is a second layer nobody mentioned,
        or a decking allowance, or a system warranty. Those are things you can
        put to a contractor directly.
      </p>
    </Card>
  );
}
