"use client";

import { useRef, useState } from "react";
import { isStaticBuild } from "@/lib/deployment";
import { Badge, Button, Callout, Card } from "@/components/ui";
import { sessionId, track } from "@/lib/analytics";
import { usd } from "@/lib/format";

interface Extraction {
  projectInput: Record<string, unknown>;
  quoteRow: {
    totalPrice: number | null;
    materialSlug: string | null;
    warrantyWorkmanshipYears: number | null;
    scope: Record<string, boolean>;
  };
  missing: string[];
  redFlags: { issue: string; quotedText: string }[];
  summary: {
    documentType: string;
    confidence: "high" | "medium" | "low";
    totalPrice: number | null;
    materialProductName: string | null;
    measuredSquares: number | null;
    lineItems: { description: string; amount: number | null; quantity: number | null; unit: string | null }[];
    exclusions: string[];
    paymentTerms: string | null;
    scope: Record<string, string>;
    notes: string;
    warrantyWorkmanshipYears: number | null;
    deckSheetsIncluded: number | null;
  };
}

const SCOPE_LABEL: Record<string, string> = {
  tearOff: "Tear-off", disposal: "Disposal", permit: "Permit",
  underlayment: "Underlayment", flashing: "Flashing", ventilation: "Ventilation",
  deckAllowance: "Decking allowance", cleanup: "Clean-up", licensedInsured: "Licence and insurance",
};

/**
 * Upload a quote instead of typing it.
 *
 * This is the highest-friction step in the whole product - a homeowner holding
 * a three-page PDF is not going to hand-transcribe nine scope checkboxes. It is
 * also where the first-party data comes from, as a byproduct of the tool being
 * useful rather than as a favour we ask for.
 */
export function QuoteUpload(props: { zip?: string; onExtracted: (e: Extraction) => void }) {
  // Branching here, before any hook, so the form below can use hooks
  // unconditionally. `isStaticBuild` never changes at runtime, but an early
  // return above a useState is still a rules-of-hooks violation waiting to be
  // enforced.
  return isStaticBuild ? <ManualOnlyNotice /> : <QuoteUploadForm {...props} />;
}

/**
 * Shown when the build has no server to hold the API key.
 *
 * Deliberately not an amber warning titled "Upload is not available". That
 * framed our hosting choice as the homeowner's problem and made the page look
 * broken before they had used it - nothing here is broken, and every part of
 * the check works. So: lead with what to do, and demote the reason to the
 * footnote it deserves.
 */
function ManualOnlyNotice() {
  return (
    <Callout title="Enter your quote below">
      Type the contractor&rsquo;s total and describe the project. The comparison,
      the confidence score and the questions to ask all work exactly the same
      &mdash; reading the PDF only ever saved you the typing.
      <span className="mt-2 block text-[12.5px] text-faint">
        PDF reading needs a server to hold an API key. This build is static
        files, where that key would ship to your browser for anyone to read, so
        the feature is off rather than insecure.
      </span>
    </Callout>
  );
}

function QuoteUploadForm({ zip, onExtracted }: {
  zip?: string;
  onExtracted: (e: Extraction) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [manualOnly, setManualOnly] = useState(false);
  const [result, setResult] = useState<Extraction | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setState("reading");
    setMessage(null);
    track("quote_upload_started", { sizeKb: Math.round(file.size / 1024) });

    const body = new FormData();
    body.append("file", file);
    body.append("sessionId", sessionId());
    if (zip) body.append("zip", zip);

    try {
      const res = await fetch("/api/quote-extract", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setManualOnly(Boolean(data.manualEntryAvailable));
        setMessage(data.error ?? "Could not read that file.");
        track("quote_upload_failed", { status: res.status });
        return;
      }
      setResult(data as Extraction);
      setState("done");
      track("quote_upload_completed", {
        confidence: data.summary.confidence,
        redFlags: data.redFlags.length,
        lineItems: data.summary.lineItems.length,
      });
    } catch {
      setState("error");
      setMessage("Upload failed. Check your connection and try again.");
      track("quote_upload_failed", { status: 0 });
    }
  }

  if (state === "done" && result) {
    return <ExtractionReview result={result} onUse={() => onExtracted(result)}
      onRedo={() => { setState("idle"); setResult(null); }} />;
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Upload the quote instead</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            A PDF or a photo of the paperwork. We read the total, the scope and
            the warranty so you do not have to type any of it.
          </p>
        </div>
        <Badge tone="accent">Faster</Badge>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={`mt-4 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft/50" : "border-line-strong bg-sunken/40"
        }`}
      >
        {state === "reading" ? (
          <div>
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
            <p className="mt-3 text-[13.5px] font-medium text-ink">Reading your quote...</p>
            <p className="mt-1 text-[12.5px] text-faint">This usually takes a few seconds.</p>
          </div>
        ) : (
          <>
            <p className="text-[13.5px] text-muted">Drag a file here, or</p>
            <Button variant="secondary" size="sm" className="mt-2.5"
              onClick={() => inputRef.current?.click()}>
              Choose a file
            </Button>
            <p className="mt-3 text-[12px] text-faint">PDF, PNG, JPEG or WebP · up to 15 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>

      {message && (
        <div className="mt-4">
          <Callout tone={manualOnly ? "neutral" : "danger"}>
            {message}
            {manualOnly && " Everything below still works — just fill it in yourself."}
          </Callout>
        </div>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-faint">
        We do not keep the file, and we do not record your contractor&rsquo;s name
        or your address &mdash; the reader is instructed not to return them. Only
        the figures and the scope are saved, and only in aggregate.
      </p>
    </Card>
  );
}

function ExtractionReview({ result, onUse, onRedo }: {
  result: Extraction; onUse: () => void; onRedo: () => void;
}) {
  const { summary, missing, redFlags } = result;
  const tone = summary.confidence === "high" ? "positive"
    : summary.confidence === "medium" ? "accent" : "caution";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Here is what we read</h3>
          <p className="mt-1 text-[13px] text-muted">
            Check it against your paperwork before you use it.
          </p>
        </div>
        <Badge tone={tone}>{summary.confidence} confidence</Badge>
      </div>

      {summary.totalPrice != null && (
        <p className="mt-5 text-[30px] font-semibold tnum text-ink">{usd(summary.totalPrice)}</p>
      )}
      <p className="mt-1 text-[13px] text-muted">
        {summary.materialProductName ?? "Material not named"}
        {summary.measuredSquares != null && ` · ${summary.measuredSquares} squares stated`}
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">
          Scope stated in the quote
        </p>
        <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          {Object.entries(summary.scope).map(([key, value]) => (
            <li key={key} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-ink-soft">{SCOPE_LABEL[key] ?? key}</span>
              <span className={
                value === "included" ? "font-medium text-positive"
                  : value === "excluded" ? "font-medium text-danger" : "text-faint"
              }>
                {value === "included" ? "included" : value === "excluded" ? "excluded" : "not stated"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {summary.lineItems.length > 0 && (
        <details className="group mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-ink marker:content-none">
            {summary.lineItems.length} line items read from the quote
          </summary>
          <ul className="mt-2.5 space-y-1.5">
            {summary.lineItems.map((l, i) => (
              <li key={`${l.description}-${i}`} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                <span className="text-muted">{l.description}</span>
                <span className="shrink-0 tnum text-ink">{l.amount != null ? usd(l.amount) : "—"}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {summary.exclusions.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">
            Explicitly excluded
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted">
            {summary.exclusions.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      )}

      {redFlags.length > 0 && (
        <div className="mt-4 space-y-2">
          {redFlags.map((f) => (
            <Callout key={f.issue} tone="danger" title={f.issue}>
              <span className="italic">&ldquo;{f.quotedText}&rdquo;</span>
            </Callout>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <div className="mt-4">
          <Callout tone="caution">
            The quote does not state {missing.join(", ")}. You will need to fill
            {missing.length === 1 ? " that in" : " those in"} below for an accurate comparison.
          </Callout>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onUse}>Use these details</Button>
        <Button variant="ghost" onClick={onRedo}>Upload a different file</Button>
      </div>
    </Card>
  );
}
