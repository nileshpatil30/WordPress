import Link from "next/link";
import { InterestForm } from "@/components/tools/InterestForm";
import { Callout, Card, SectionHeading } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Getting contractor quotes",
  description:
    "How to get good roofing quotes, and where Home Cost Doctor stands on contractor matching. We have no vetted network yet, and we would rather say so.",
  path: "/hire",
});

export default function HirePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">
          Getting quotes
        </h1>
        <p className="mt-5 text-[16.5px] leading-relaxed text-muted">
          Most cost sites exist to sell your details to contractors. That is a
          legitimate business, but it changes what the site is for: the estimate
          becomes the bait rather than the product.
        </p>
      </div>

      <div className="mt-8 max-w-2xl">
        <Callout tone="caution" title="Where we actually stand">
          We do not have a vetted contractor network, we have no referral
          partnerships, and we are not going to invent either. This page records
          interest so we know where demand is. Nobody will call you as a result of
          filling it in, and your details will not be sold.
        </Callout>
      </div>

      <section className="mt-14">
        <SectionHeading
          eyebrow="In the meantime"
          title="How to get quotes worth comparing"
          description="You do not need a matching service. You need three contractors quoting the same written scope."
        />
        <div className="mt-7 space-y-4">
          {[
            { n: "1", t: "Write the scope before you call anyone", d: "Use your estimate's line items as the specification: tear-off and layer count, underlayment type, flashing, ventilation, decking allowance with a per-sheet price, permit, disposal, warranty. Send the same list to everyone." },
            { n: "2", t: "Find candidates locally, not through a lead broker", d: "Manufacturer certified-installer directories, your state licensing board's search, and neighbours who have had work done recently are all better starting points than a form that sells your number to four companies at once." },
            { n: "3", t: "Insist on an on-site measurement for anything complex", d: "For steep, cut-up or hillside roofs, a satellite-measured quote is a guess. The measured square count should appear on the proposal." },
            { n: "4", t: "Verify licence and insurance independently", d: "Look the licence number up on the issuing board's site. Ask for the certificate of insurance to come directly from the insurer, naming you as certificate holder." },
            { n: "5", t: "Compare them properly", d: "Put the quotes side by side on scope, not just price." },
          ].map((s) => (
            <Card key={s.n} className="flex gap-5 p-6">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-[15px] font-semibold text-accent">
                {s.n}
              </span>
              <div>
                <p className="text-[15.5px] font-semibold text-ink">{s.t}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.d}</p>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-[14px]">
          <Link href="/contractor-questions" className="font-semibold text-accent hover:underline">
            The full question checklist &rarr;
          </Link>
          <Link href="/compare-quotes" className="font-semibold text-accent hover:underline">
            Compare quotes on scope &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Register interest"
          title="Tell us where matching would be useful"
        />
        <div className="mt-6"><InterestForm /></div>
      </section>

      <section className="mt-14 max-w-2xl">
        <SectionHeading eyebrow="How this gets paid for eventually" title="Being upfront about the business model" />
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          A product like this can be funded by contractor matching, contractor
          subscriptions, premium reports, API access for people who want the data
          programmatically, or clearly labelled sponsorship. Every one of those
          creates a pull toward telling you what suits the payer.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          The commitment that keeps this honest is simple and testable: the
          estimate and the quote checker never change their output based on who is
          paying, sponsored placements are labelled as such, and we will publish
          how our estimates compare to what people actually paid &mdash; including
          when that is unflattering.
        </p>
      </section>
    </div>
  );
}
