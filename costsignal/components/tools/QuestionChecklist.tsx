"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";

export interface QuestionGroup {
  id: string;
  title: string;
  intro: string;
  questions: { id: string; q: string; why: string; redFlag?: string }[];
}

const STORAGE_KEY = "cs_contractor_questions_v1";

/**
 * A working checklist rather than an article.
 *
 * State lives in localStorage so someone can tick items off across several
 * contractor visits, and the copy button produces plain text they can paste
 * into an email. Nothing is sent to us.
 */
export function QuestionChecklist({ groups }: { groups: QuestionGroup[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch { /* private mode, cleared storage - render fine without it */ }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch { /* nothing to do */ }
  }, [checked]);

  const total = useMemo(() => groups.reduce((a, g) => a + g.questions.length, 0), [groups]);
  const done = useMemo(
    () => groups.reduce((a, g) => a + g.questions.filter((q) => checked[q.id]).length, 0),
    [groups, checked]);

  async function copyAll() {
    const text = groups
      .map((g) => `${g.title.toUpperCase()}\n${g.questions.map((q) => `- ${q.q}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard blocked - the list is on screen anyway */ }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-faint">Progress</p>
            <p className="mt-0.5 text-[19px] font-semibold tnum text-ink">{done} of {total}</p>
          </div>
          <div className="h-9 w-px bg-line" />
          <div className="w-40">
            <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void copyAll()}>
            {copied ? "Copied" : "Copy the list"}
          </Button>
          {done > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setChecked({})}>Reset</Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {groups.map((g) => {
          const groupDone = g.questions.filter((q) => checked[q.id]).length;
          return (
            <Card key={g.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-xl">
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{g.title}</h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{g.intro}</p>
                </div>
                <Badge tone={groupDone === g.questions.length ? "positive" : "neutral"}>
                  {groupDone}/{g.questions.length}
                </Badge>
              </div>

              <ul className="mt-5 space-y-1">
                {g.questions.map((q) => (
                  <li key={q.id} className="border-t border-line py-3.5 first:border-t-0 first:pt-0">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked[q.id] === true}
                        onChange={() => setChecked((c) => ({ ...c, [q.id]: !c[q.id] }))}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-line-strong accent-[#0C6B58]"
                      />
                      <span className="min-w-0">
                        <span className={`block text-[15px] font-medium leading-snug ${checked[q.id] ? "text-faint line-through" : "text-ink"}`}>
                          {q.q}
                        </span>
                        <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{q.why}</span>
                        {q.redFlag && (
                          <span className="mt-2 block rounded-lg bg-caution-soft px-3 py-2 text-[12.5px] leading-relaxed text-ink-soft">
                            <strong className="font-semibold text-caution">Watch for: </strong>{q.redFlag}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
