import { FinanceCalculator } from "@/components/tools/FinanceCalculator";
import { Card } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Roof financing payment scenarios",
  description:
    "Work out monthly payments, total interest and total cost for the roofing finance offers you have actually been given. No lenders, no referrals, no rate table.",
  path: "/financing",
});

export default async function FinancingPage() {

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">
          What would paying for it actually look like?
        </h1>
        <p className="mt-5 text-[16.5px] leading-relaxed text-muted">
          A roof is one of the few purchases most households make on borrowed
          money without comparing the borrowing. Put the offers you have been
          given side by side, and look at the total paid rather than the monthly
          payment.
        </p>
      </div>

      <div className="mt-9">
        <FinanceCalculator  />
      </div>

      <Card className="mt-8 p-6">
        <h2 className="text-[16px] font-semibold text-ink">Three things worth knowing</h2>
        <ul className="mt-4 space-y-4 text-[14.5px] leading-relaxed text-muted">
          <li>
            <strong className="font-semibold text-ink">Ask for the cash price first.</strong>{" "}
            Contractor-arranged finance often carries a dealer fee built into the
            project price, so the &ldquo;0% for 12 months&rdquo; offer may already
            be priced in. You cannot compare finance without knowing the cash
            price it is being compared against.
          </li>
          <li>
            <strong className="font-semibold text-ink">A promotional period is not the whole term.</strong>{" "}
            Deferred-interest products can charge back the full accrued interest
            if the balance is not cleared before the promotion ends. Ask
            specifically whether interest is deferred or waived &mdash; they are
            very different products.
          </li>
          <li>
            <strong className="font-semibold text-ink">Secured borrowing is cheaper and riskier.</strong>{" "}
            A home equity product usually carries a lower rate than an unsecured
            personal loan, because your house is the collateral. That trade-off is
            yours to make, and it is worth making deliberately.
          </li>
        </ul>
      </Card>
    </div>
  );
}
