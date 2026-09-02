"use client";

import { useState } from "react";
import type { PersonalQuestion } from "@/lib/engine/questions";
import { Badge, Button, Card } from "@/components/ui";
import { usd } from "@/lib/format";

const TONE = {
  critical: "danger", important: "caution", "worth-asking": "neutral",
} as const;

const LABEL = {
  critical: "Ask before signing", important: "Important", "worth-asking": "Worth asking",
} as const;

/**
 * The questions worth asking about THIS quote.
 *
 * A generic "questions to ask a roofer" list is a blog post, and every roofing
 * site has one. This is generated from the gaps in the actual document, with
 * the money at stake attached from our own line items - which is the part
 * nobody can copy without a cost model underneath.
 */
export function QuestionsCard({ questions }: { questions: PersonalQuestion[] }) {
  const [copied, setCopied] = useState(false);
  if (!questions.length) return null;

  const critical = questions.filter((q) => q.priority === "critical").length;

  async function copyAll() {
    const text = questions
      .map((q, i) => `${i + 1}. ${q.question}\n   (${q.trigger})`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* the list is on screen anyway */ }
  }

  return (
    <Card className="px-6 py-7 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
            What to ask about this quote
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
            Generated from what your quote says and, more importantly, what it
            leaves out. Amounts are our modelled cost of the item on a roof this
            size &mdash; not what the contractor would charge.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void copyAll()}>
          {copied ? "Copied" : "Copy all questions"}
        </Button>
      </div>

      {critical > 0 && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-soft">
          <strong className="font-semibold text-danger">
            {critical} {critical === 1 ? "question needs" : "questions need"} an answer before you sign.
          </strong>{" "}
          These are the ones that become disputes once work has started.
        </p>
      )}

      <ol className="mt-5 space-y-3">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-xl border border-line bg-sunken/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="flex-1 text-[14.5px] font-semibold leading-snug text-ink">
                <span className="mr-2 tnum text-faint">{i + 1}.</span>{q.question}
              </p>
              <Badge tone={TONE[q.priority]}>{LABEL[q.priority]}</Badge>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{q.why}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-faint">
              <span>{q.trigger}</span>
              {q.amountAtStake != null && q.amountAtStake > 0 && (
                <span className="font-semibold tnum text-caution">
                  ~{usd(q.amountAtStake)} at stake
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
