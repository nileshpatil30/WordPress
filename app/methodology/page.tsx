import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { Badge, Card, DataNotice, SectionHeading } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";
import { usd } from "@/lib/format";

export const metadata = buildMetadata({
  title: "How we estimate roofing costs",
  description:
    "The full methodology behind Home Cost Doctor estimates: the cost model, the geographic fallback chain, how ranges are combined, and how the confidence score is calculated.",
  path: "/methodology",
});

export default async function MethodologyPage() {
  const store = await getStore();
  const service = await store.getServiceBySlug("roofing");
  const factors = await store.listPricingFactors(service!.id);
  const records = await store.listPricingRecords(service!.id);

  const grouped = new Map<string, typeof factors>();
  for (const f of factors) {
    const group = f.factorKey.split(".")[0];
    grouped.set(group, [...(grouped.get(group) ?? []), f]);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="max-w-3xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[44px]">
          How the estimate is built
        </h1>
        <p className="mt-5 text-[16.5px] leading-relaxed text-muted">
          An estimate you cannot argue with is worthless. This page describes
          exactly how the number is produced, which parts are measured, which are
          modelled, and where the model is weakest. If something here looks
          wrong, it probably is &mdash; and you now know enough to say so.
        </p>
      </div>

      {/* Two layers on purpose. Most people want to know we are not making it
          up and then leave; the detail below is for the ones who want to check.
          Putting the technical model first loses both. */}
      <Card className="mt-9 max-w-3xl p-6 sm:p-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-accent">
          In short
        </p>
        <ol className="mt-4 space-y-3">
          {[
            ["Measure the roof, not the house", "Your floor area is not your roof area. We derive the real sloped surface from the footprint and the pitch."],
            ["Price the materials it needs", "Per square, for your material, including the waste a cut-up roofline creates."],
            ["Add the crew, at local wages", "Hours for the install, the tear-off and the detail work, at the wage rates published for your metro."],
            ["Add the real cost of a real contractor", "Disposal, equipment, permits, and the overhead and profit a licensed, insured, warrantied business has to carry."],
            ["Say how sure we are", "The range widens where the data is thin, and the confidence score falls rather than pretending."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-3.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold tnum text-accent">
                {i + 1}
              </span>
              <span>
                <span className="block text-[14.5px] font-semibold text-ink">{title}</span>
                <span className="mt-0.5 block text-[13.5px] leading-relaxed text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 border-t border-line pt-4 text-[13.5px] leading-relaxed text-muted">
          That is the whole model. Everything below is the detail: the exact
          formulas, the factor table live from the database, how the range is
          combined, and where the model is weakest.
        </p>
      </Card>

      <div className="mt-6 max-w-3xl"><DataNotice /></div>

      {/* --------------------------- The model --------------------------- */}
      <section className="mt-16">
        <SectionHeading
          eyebrow="Step 1"
          title="Geometry: from what you know to roofing squares"
          description="Roofers price per square - 100 square feet of roof surface. Almost nobody knows their roof area, so we derive it."
        />
        <Card className="mt-6 max-w-3xl p-6">
          <pre className="scroll-x text-[13px] leading-relaxed text-ink-soft">
{`footprint      = house area / number of storeys
roof plan area = footprint x 1.08          (eaves and overhangs)
roof surface   = roof plan area x pitch factor
squares        = roof surface / 100
material qty   = squares x waste factor    (7% to 20% by complexity)`}
          </pre>
          <p className="mt-5 text-[14px] leading-relaxed text-muted">
            The pitch factor is exact geometry, not an estimate:{" "}
            <span className="font-mono text-[13px] text-ink">sqrt(1 + (rise/12)^2)</span>.
            A 6:12 roof has 11.8% more surface than its footprint; a 12:12 roof
            has 41.4% more. This is the one part of the model that is simply
            true, and it is why pitch matters so much to your price.
          </p>
        </Card>
      </section>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Step 2"
          title="Components, priced separately"
          description="Every cost is built from a quantity we derive and a unit price we look up. Nothing is a percentage of a made-up total."
        />
        <div className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-2">
          {[
            { t: "Materials", d: "Covering, underlayment, starter and ridge, drip edge, flashing, ventilation, decking allowance. Quantity is squares x waste; price comes from the pricing table for that material." },
            { t: "Labour", d: "Install hours per square by material, plus tear-off hours scaled by the weight of what is coming off, plus detail and dry-in hours. Then multiplied by pitch, storeys, roof shape and access." },
            { t: "Equipment", d: "Roll-off containers, sized from the calculated debris tonnage rather than assumed." },
            { t: "Disposal", d: "Tear-off tonnage = squares x installed weight per square x layers, times the local tipping fee." },
            { t: "Permits", d: "A local allowance. This is the weakest number in the model and the easiest to fix - published fee schedules are exact and jurisdiction-specific." },
            { t: "Overhead and profit", d: "Applied to the direct cost. A licensed, insured contractor carrying warranty reserve, supervision, vehicles and office cost has to charge this. It is not a negotiating margin." },
          ].map((x) => (
            <Card key={x.t} className="p-5">
              <h3 className="text-[15px] font-semibold text-ink">{x.t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{x.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Step 3"
          title="How the range is combined"
          description="This is where most cost calculators quietly mislead people."
        />
        <div className="mt-6 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
          <p>
            Every unit price has a low, a median and a high. The naive way to
            build a total range is to add all the lows together and all the highs
            together. That describes a job where the shingles, the labour, the
            dumpster, the tipping fee and the permit <em>all</em> came in at their
            best case simultaneously &mdash; and then the same job where they all
            came in at their worst. Neither job exists.
          </p>
          <p>
            We combine component uncertainties in quadrature instead: the total
            deviation is the square root of the sum of the squared component
            deviations. That assumes the components are partly independent, which
            is much closer to reality, and it produces a range roughly 35 to 45%
            narrower than the naive sum. Both numbers are shown in the line-item
            table so you can see the difference.
          </p>
          <p>
            Overhead and profit is then applied at three levels &mdash; lean,
            typical, and premium-or-constrained-market &mdash; which is where most
            of the remaining spread comes from.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Step 4"
          title="Geography: the fallback chain"
          description="Local prices are the whole point, so the model is explicit about how local it actually managed to be."
        />
        <Card className="mt-6 max-w-3xl p-6">
          <p className="text-[14.5px] leading-relaxed text-muted">
            Every price lookup walks this chain and stops at the first level that
            has data:
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
            {["ZIP", "City", "Metro", "State", "National", "Global"].map((l, i) => (
              <span key={l} className="flex items-center gap-2">
                <span className="rounded-lg border border-line bg-sunken px-2.5 py-1.5 font-semibold text-ink">{l}</span>
                {i < 5 && <span className="text-faint">&rarr;</span>}
              </span>
            ))}
          </div>
          <p className="mt-5 text-[14.5px] leading-relaxed text-muted">
            The level that answered is recorded and shown to you, and it feeds
            the confidence score directly. A ZIP we have never seen still returns
            an estimate &mdash; from national figures, with the score reduced and
            the reason stated. That is the honest behaviour: refusing to answer
            helps nobody, and pretending to be local when you are not is worse.
          </p>
        </Card>
      </section>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Step 5"
          title="The confidence score"
          description="Out of 100, and it is designed to be able to fall."
        />
        <div className="scroll-x mt-6 max-w-3xl">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="pb-2.5 pr-4 font-semibold">Component</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Max</th>
                <th className="pb-2.5 font-semibold">What earns it</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {[
                ["Local data coverage", 32, "ZIP-level pricing earns 32; city 27; metro 21; state 14; national 9."],
                ["Data recency", 20, "Full marks within three months of the effective date, falling to 2 beyond two years."],
                ["Project detail supplied", 22, "Proportional to how many of the thirteen optional inputs you actually gave us."],
                ["Source quality", 16, "Weighted by the reliability of each source that fed the estimate."],
                ["Range tightness", 10, "A tighter modelled spread relative to the typical price scores higher."],
              ].map(([label, max, detail]) => (
                <tr key={String(label)} className="border-b border-line align-top">
                  <td className="py-2.5 pr-4 font-medium text-ink">{label}</td>
                  <td className="py-2.5 pr-4 text-right tnum text-muted">{max}</td>
                  <td className="py-2.5 text-muted">{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Card className="mt-6 max-w-3xl border-caution/25 bg-caution-soft p-5">
          <p className="text-[14px] leading-relaxed text-ink-soft">
            <strong className="font-semibold">The cap.</strong> If any price in an
            estimate is sample data, the score is capped at 60 regardless of what
            it would otherwise have earned, and the reason is shown alongside it.
            If any price is modelled rather than directly observed, the cap is 78.
            Today, every estimate on this site hits the first cap. When real feeds
            are connected, scores will rise on their own &mdash; and until then
            you should treat these numbers as directional.
          </p>
        </Card>
      </section>

      {/* --------------------------- Live factors --------------------------- */}
      <section className="mt-14">
        <SectionHeading
          eyebrow="Every assumption, in the open"
          title="The factor table, live from the database"
          description={`These ${factors.length} multipliers and ${records.length} price rows are what the engine actually reads. Nothing multiplicative is written into the application code, so an administrator can retune the model without a deploy.`}
        />
        <div className="mt-7 space-y-8">
          {[...grouped.entries()].map(([group, rows]) => (
            <div key={group}>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-accent">{group}</h3>
              <div className="scroll-x mt-3">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-faint">
                      <th className="pb-2 pr-4 font-semibold">Key</th>
                      <th className="pb-2 pr-4 text-right font-semibold">Value</th>
                      <th className="pb-2 pr-4 font-semibold">Applies to</th>
                      <th className="pb-2 pr-4 font-semibold">Status</th>
                      <th className="pb-2 font-semibold">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px]">
                    {rows.map((f) => (
                      <tr key={f.id} className="border-b border-line/70 align-top">
                        <td className="py-2 pr-4 font-mono text-[12px] text-ink">{f.factorKey}</td>
                        <td className="py-2 pr-4 text-right tnum font-semibold text-ink">
                          {f.multiplier.toFixed(3)}
                        </td>
                        <td className="py-2 pr-4 text-muted">{f.appliesTo}</td>
                        <td className="py-2 pr-4">
                          <Badge tone={f.dataStatus === "verified" ? "positive" : f.dataStatus === "modeled" ? "accent" : "caution"}>
                            {f.dataStatus}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------- Limitations --------------------------- */}
      <section className="mt-16 max-w-3xl">
        <SectionHeading eyebrow="Being straight with you" title="What this model cannot do" />
        <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-soft">
          {[
            "It cannot see your deck. Rot, delamination and old skip sheathing are found at tear-off, and they are the most common reason a real job costs more than any estimate.",
            "It does not know your local crew availability this month. Post-storm markets can move 20 to 30% in weeks, and nothing in our data captures that in real time.",
            "It does not model code upgrades triggered by your specific permit. Those are jurisdiction-specific and sometimes property-specific.",
            "It assumes a competent, insured contractor doing the job properly. It is not modelling the cheapest possible way to get shingles onto a roof.",
            "Its permit figures are allowances, not schedules. Published fee schedules are exact, and replacing our allowance with them is one of the highest-value improvements available.",
            "Its labour rates are real - Bureau of Labor Statistics wage data for each metro - but materials, disposal, equipment and permits are still our own sample figures, and they are the larger share of the bill. That is the single largest limitation, and no amount of good modelling fixes it.",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-caution" />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[14.5px] leading-relaxed text-muted">
          If you want to help fix the biggest limitation, the most useful thing
          you can do is tell us what you actually paid.{" "}
          <Link href="/contribute" className="font-medium text-accent underline underline-offset-2">
            It takes two minutes
          </Link>{" "}
          and it is anonymous.
        </p>
      </section>

      <section className="mt-14 max-w-3xl">
        <Card className="p-6">
          <h2 className="text-[16px] font-semibold text-ink">A worked example</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            A 2,000 sq ft roof is 20 squares. At a moderate 10% waste factor that
            is 22 squares of material. Architectural shingle at roughly{" "}
            {usd(158)} per square is about {usd(3476)} of covering, before
            underlayment, accessories, flashing and ventilation. Labour is roughly
            1.6 crew hours per square to install, plus tear-off scaled by the
            weight coming off, plus detail hours &mdash; then multiplied by pitch,
            storeys, roof shape and access. Add containers, tipping fees and a
            permit allowance, then overhead and profit on the whole direct cost.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Every one of those numbers is visible in the line-item table on your
            own estimate, with the arithmetic shown next to it.
          </p>
        </Card>
      </section>
    </div>
  );
}
