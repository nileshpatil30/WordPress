export interface FinanceScenario {
  label: string;
  apr: number;
  termMonths: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
}

export interface FinanceResult {
  principal: number;
  downPayment: number;
  amountFinanced: number;
  scenarios: FinanceScenario[];
  disclaimer: string;
}

/**
 * Standard amortised payment. No lender relationships, no rate table pulled
 * from a partner - the user supplies the terms they have actually been offered
 * and we do the arithmetic. Offering illustrative rates we cannot honour would
 * be worse than useless.
 */
export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function buildFinanceScenarios(
  principal: number,
  downPayment: number,
  terms: { label: string; apr: number; termMonths: number }[],
): FinanceResult {
  const amountFinanced = Math.max(0, principal - downPayment);
  const scenarios = terms.map((t) => {
    const monthly = monthlyPayment(amountFinanced, t.apr, t.termMonths);
    const totalPaid = monthly * t.termMonths;
    return {
      label: t.label,
      apr: t.apr,
      termMonths: t.termMonths,
      monthlyPayment: Math.round(monthly * 100) / 100,
      totalPaid: Math.round(totalPaid),
      totalInterest: Math.round(totalPaid - amountFinanced),
    };
  });

  return {
    principal, downPayment, amountFinanced, scenarios,
    disclaimer:
      "These are arithmetic scenarios using rates and terms you enter. CostSignal is not a lender, does not broker finance, and has no lending partners. Nothing here is a loan offer or financial advice. Contractor-arranged finance frequently carries a dealer fee built into the project price - ask what the cash price is before comparing.",
  };
}
