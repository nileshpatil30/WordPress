"use client";

import { useMemo, useState } from "react";
import { buildFinanceScenarios } from "@/lib/engine/finance";
import { Badge, Callout, Card, Field, inputClass } from "@/components/ui";
import { usd } from "@/lib/format";

interface Term { id: string; label: string; apr: string; termMonths: string }

const DEFAULT_TERMS: Term[] = [
  { id: "t1", label: "Home equity line", apr: "8.5", termMonths: "120" },
  { id: "t2", label: "Contractor finance", apr: "12.9", termMonths: "84" },
  { id: "t3", label: "Personal loan", apr: "15.9", termMonths: "60" },
];

/**
 * Payment scenarios using rates the user has actually been offered.
 *
 * We deliberately ship no rate table and no lender partners. Illustrative rates
 * we cannot honour would be worse than useless, and a finance referral dressed
 * up as a calculator is exactly the pattern this product exists to avoid.
 */
/**
 * `?amount=18500` is read from the address bar rather than passed from the
 * server, so the page can prerender to a static file while links from an
 * estimate still arrive with the right figure filled in.
 */
function amountFromUrl(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = new URLSearchParams(window.location.search).get("amount");
  const n = Number(raw);
  return raw && Number.isFinite(n) && n > 0 ? n : undefined;
}

export function FinanceCalculator({ initialAmount }: { initialAmount?: number }) {
  const [amount, setAmount] = useState(() => String(initialAmount ?? amountFromUrl() ?? 18000));
  const [down, setDown] = useState("2000");
  const [terms, setTerms] = useState<Term[]>(DEFAULT_TERMS);

  const result = useMemo(() => buildFinanceScenarios(
    Number(amount) || 0,
    Number(down) || 0,
    terms.map((t) => ({
      label: t.label, apr: Number(t.apr) || 0, termMonths: Number(t.termMonths) || 1,
    })),
  ), [amount, down, terms]);

  const patch = (id: string, p: Partial<Term>) =>
    setTerms((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));

  const cheapest = result.scenarios.reduce(
    (a, b) => (b.totalPaid < a.totalPaid ? b : a), result.scenarios[0]);

  return (
    <div className="space-y-5">
      <Card className="p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Project cost" hint="Use the typical figure from your estimate, or a real quote.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-faint">$</span>
              <input className={`${inputClass} pl-7`} inputMode="numeric" value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
            </div>
          </Field>
          <Field label="Cash you are putting in" hint="Deposit, savings, or an insurance payment.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-faint">$</span>
              <input className={`${inputClass} pl-7`} inputMode="numeric" value={down}
                onChange={(e) => setDown(e.target.value.replace(/[^\d.]/g, ""))} />
            </div>
          </Field>
        </div>

        <div className="mt-6 border-t border-line pt-6">
          <p className="text-[13px] font-semibold text-ink">The offers you are comparing</p>
          <p className="mt-1 text-[13px] text-muted">
            Replace these with the actual rates and terms you have been quoted.
            We do not supply rates, because we are not a lender and have no
            lending partners.
          </p>
          <div className="mt-4 space-y-3">
            {terms.map((t) => (
              <div key={t.id} className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
                <input
                  aria-label="Offer name"
                  className={inputClass}
                  value={t.label}
                  onChange={(e) => patch(t.id, { label: e.target.value.slice(0, 40) })}
                />
                <div className="relative">
                  <input
                    aria-label="APR"
                    className={inputClass}
                    inputMode="decimal"
                    value={t.apr}
                    onChange={(e) => patch(t.id, { apr: e.target.value.replace(/[^\d.]/g, "") })}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-faint">% APR</span>
                </div>
                <div className="relative">
                  <input
                    aria-label="Term in months"
                    className={inputClass}
                    inputMode="numeric"
                    value={t.termMonths}
                    onChange={(e) => patch(t.id, { termMonths: e.target.value.replace(/\D/g, "") })}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-faint">months</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Amount financed</p>
            <p className="mt-1 text-[24px] font-semibold tnum text-ink">{usd(result.amountFinanced)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">What each option costs</h2>
        <div className="scroll-x mt-5">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="pb-2.5 pr-4 font-semibold">Offer</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Monthly</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Total interest</th>
                <th className="pb-2.5 text-right font-semibold">Total paid</th>
              </tr>
            </thead>
            <tbody>
              {result.scenarios.map((s) => (
                <tr key={s.label} className="border-b border-line">
                  <td className="py-3.5 pr-4">
                    <span className="text-[14.5px] font-medium text-ink">{s.label}</span>
                    <span className="block text-[12.5px] tnum text-faint">
                      {s.apr}% APR over {s.termMonths} months
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-right text-[16px] font-semibold tnum text-ink">
                    {usd(s.monthlyPayment, { cents: true })}
                  </td>
                  <td className="py-3.5 pr-4 text-right text-[14px] tnum text-caution">{usd(s.totalInterest)}</td>
                  <td className="py-3.5 text-right text-[14px] tnum text-ink">
                    {usd(s.totalPaid)}
                    {s.label === cheapest?.label && result.scenarios.length > 1 && (
                      <span className="ml-2 align-middle"><Badge tone="positive">Least total</Badge></span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-[13.5px] leading-relaxed text-muted">
          The lowest monthly payment is usually the most expensive option overall,
          because a longer term means more months of interest. Compare the total
          paid column, then decide what monthly figure you can live with.
        </p>
      </Card>

      <Callout tone="caution" title="Read this">{result.disclaimer}</Callout>
    </div>
  );
}
