import Link from "next/link";
import { RoofGeometry } from "@/components/tools/RoofGeometry";
import { Card, SectionHeading } from "@/components/ui";
import { JsonLd, buildMetadata, siteUrl } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Roof calculator: area, squares, pitch and shingles",
  description:
    "Work out roof area from your house size, convert square feet to roofing squares, get the exact pitch multiplier and angle, and count shingle bundles including waste. Exact geometry, no estimates, nothing to sign up for.",
  path: "/roof-calculator",
});

const FAQS = [
  {
    q: "What is a roofing square?",
    a: "100 square feet of roof surface. It is the unit contractors quote in, and the most common reason a quote is hard to compare against an online figure - a 24-square roof is 2,400 square feet, not 24.",
  },
  {
    q: "Why is my roof bigger than my house?",
    a: "Two reasons. Eaves and rakes extend past the walls, adding roughly 8%. And a sloped roof covers more surface than the ground beneath it: a 6:12 pitch adds about 12%, a 12:12 pitch adds 41%. A two-storey house is the opposite case - its footprint is about half its floor area.",
  },
  {
    q: "How is the pitch multiplier calculated?",
    a: "Exactly, as the square root of 1 plus (rise divided by 12) squared. A 6:12 roof gives the square root of 1.25, which is 1.1180. There is no estimation involved, which is why these figures carry no confidence score while our cost estimates do.",
  },
  {
    q: "How many bundles of shingles will I need?",
    a: "Three bundles covers one square for most architectural shingles, so multiply your squares by three and add waste. Waste runs about 10% on a simple gable and up to 18% on a cut-up roof with several valleys and dormers, because every cut leaves an offcut.",
  },
  {
    q: "Do I need to give an email address to use this?",
    a: "No. There is no form, no sign-up and no contact details required anywhere on this site to get a number. That is deliberate - most roofing calculators exist to collect your phone number and sell it to contractors.",
  },
];

export default function RoofCalculatorPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <div className="max-w-2xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">
          Roof calculator
        </h1>
        <p className="mt-4 text-[16.5px] leading-relaxed text-muted">
          Roof area, squares, pitch and shingle quantity. All of it is exact
          arithmetic rather than an estimate, so unlike the cost figures
          elsewhere on this site, none of it carries a confidence score &mdash;
          there is no pricing in it to be uncertain about.
        </p>
      </div>

      <div className="mt-8">
        <RoofGeometry />
      </div>

      <section className="mt-14">
        <SectionHeading
          eyebrow="The part most people get wrong"
          title="Your house size is not your roof size"
        />
        <Card className="mt-6 p-6 sm:p-7">
          <p className="text-[15.5px] leading-relaxed text-ink-soft">
            The most common mistake in roofing arithmetic is treating the floor
            area of a house as the area of its roof. They are different numbers
            and the gap runs in both directions.
          </p>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
            <li>
              <strong className="text-ink">A two-storey house</strong> has roughly
              half its floor area as footprint. A 2,000 sq ft two-storey home sits
              on about 1,000 sq ft of ground.
            </li>
            <li>
              <strong className="text-ink">Eaves add about 8%.</strong> The roof
              overhangs the walls on every side.
            </li>
            <li>
              <strong className="text-ink">Pitch adds more.</strong> A moderate
              6:12 roof has 12% more surface than the ground it covers. A steep
              12:12 roof has 41% more.
            </li>
          </ul>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Get this wrong and every downstream number &mdash; bundles, cost per
            square, whether a quote looks fair &mdash; is wrong with it.
          </p>
        </Card>
      </section>

      <section className="mt-14">
        <SectionHeading eyebrow="Common questions" title="Roof measurement" />
        <div className="mt-5">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-t border-line py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-medium text-ink marker:content-none">
                {f.q}
                <span aria-hidden className="shrink-0 text-faint transition-transform group-open:rotate-45 text-lg leading-none">+</span>
              </summary>
              <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <Card className="p-6 sm:p-8">
          <h2 className="text-[19px] font-semibold text-ink">
            Know your size. Now find out what it should cost.
          </h2>
          <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted">
            The cost calculator prices a roof by ZIP code using Bureau of Labor
            Statistics wage data for your metro, and shows which source priced
            each line so you can see where the number is solid and where it is
            not.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/roof-cost-calculator/" className="text-[15px] font-semibold text-accent underline underline-offset-4">
              Roof replacement cost calculator
            </Link>
            <Link href="/quote-check/" className="text-[15px] font-semibold text-accent underline underline-offset-4">
              Check a contractor&rsquo;s quote
            </Link>
          </div>
        </Card>
      </section>

      <p className="mt-10 text-[13px] text-faint">
        Canonical: <span className="font-mono">{siteUrl("/roof-calculator")}</span>
      </p>
    </div>
  );
}
