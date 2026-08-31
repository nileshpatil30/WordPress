import Link from "next/link";
import { Callout } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms of use",
  description:
    "The terms on which Home Cost Doctor is provided: estimates are modelled ranges, not quotes, offers, inspections or advice.",
  path: "/terms",
});

const UPDATED = "30 August 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">Terms of use</h1>
      <p className="mt-3 text-[13px] text-faint">Last updated {UPDATED}</p>

      <div className="mt-8">
        <Callout tone="caution" title="Draft pending legal review">
          Written to describe what this service actually is and is not. It has
          not been reviewed by a lawyer, and it does not yet name a legal entity,
          a governing law or a dispute process. Those must be completed before
          launch.
        </Callout>
      </div>

      <Section title="1. What this service is">
        <p>
          Home Cost Doctor produces <strong>modelled cost ranges</strong> for home
          improvement projects from pricing data and the project characteristics
          you supply. That is the entire product.
        </p>
      </Section>

      <Section title="2. What an estimate is not">
        <ul className="list-disc space-y-2 pl-5">
          <li>It is <strong>not a quote or an offer</strong>. We do not perform work and cannot contract to do so.</li>
          <li>It is <strong>not an inspection or a survey</strong>. No model can see your deck condition, your structure, your site access or your local crew availability.</li>
          <li>It is <strong>not a valuation, an appraisal, or insurance advice</strong>, and must not be relied on in a claim, a dispute, a purchase decision or a legal proceeding.</li>
          <li>It is <strong>not financial or legal advice</strong>. The payment scenario tool performs arithmetic on figures you enter. We are not a lender, we broker no finance, and we have no lending partners.</li>
          <li>It is <strong>not a judgement about any contractor</strong>. The quote checker compares a number to our model. A quote outside our range is not evidence of wrongdoing, overcharging or incompetence.</li>
        </ul>
      </Section>

      <Section title="3. Accuracy, and its limits">
        <p>
          Actual prices vary by contractor, site conditions, materials, labour
          availability, permits, code requirements, season and market conditions.
          We publish a confidence score with every estimate, and it is designed to
          fall when the evidence is weak. Where our data is sample or modelled
          rather than verified, we say so on the page.
        </p>
        <p>
          We make no warranty that any estimate is accurate, complete, current or
          fit for any purpose. Read the{" "}
          <Link href="/methodology" className="font-medium text-accent underline underline-offset-2">methodology</Link>{" "}
          before relying on anything here.
        </p>
      </Section>

      <Section title="4. Contractors, licensing and permits">
        <p>
          Licensing, permitting, insurance and building code requirements differ
          by state and by municipality, and they change. Anything we say about
          them is general context, not legal advice, and must be verified with
          the authority having jurisdiction for your address. Verify any
          contractor&rsquo;s licence and insurance directly with the issuing
          board and the insurer &mdash; never from a number printed on a
          proposal, and never from this site.
        </p>
      </Section>

      <Section title="5. Data you submit">
        <p>
          If you contribute project cost figures, you confirm they are accurate to
          the best of your knowledge and that you are entitled to share them. You
          grant us permission to use them, in aggregate and without identifying
          you or your property, to improve our pricing model and to publish
          derived statistics. You can ask us to delete a submission &mdash; see the{" "}
          <Link href="/privacy" className="font-medium text-accent underline underline-offset-2">privacy policy</Link>.
        </p>
        <p>Do not submit anyone else&rsquo;s personal information.</p>
      </Section>

      <Section title="6. Acceptable use">
        <ul className="list-disc space-y-2 pl-5">
          <li>Do not attempt to bypass, evade or overwhelm rate limits.</li>
          <li>Do not scrape the site to build a competing dataset. Our public API exists for programmatic access; ask us for a key.</li>
          <li>Do not submit deliberately false cost data. Every submission is reviewed, and false data damages a dataset other homeowners rely on.</li>
          <li>Do not attempt to access the administrative interface or any account that is not yours.</li>
        </ul>
      </Section>

      <Section title="7. API">
        <p>
          The partner API is provided under a separate key. Keys may be rate
          limited, suspended or revoked. Attribution requirements, caching rules
          and redistribution terms will be set out in the key agreement, and
          redistribution of our data as a dataset is not permitted without one.
        </p>
      </Section>

      <Section title="8. Third-party data">
        <p>
          Some data originates from third parties under their own terms and
          licences, which are recorded on our{" "}
          <Link href="/data-sources" className="font-medium text-accent underline underline-offset-2">data sources</Link>{" "}
          page. Where a source carries attribution or share-alike obligations, those
          obligations travel with any derived output.
        </p>
      </Section>

      <Section title="9. Liability">
        <p>
          The service is provided &ldquo;as is&rdquo;. To the fullest extent
          permitted by law, we exclude all warranties and are not liable for any
          loss arising from reliance on an estimate, a comparison, or any other
          output of this service &mdash; including money spent, money not saved,
          or a decision to hire or not hire a contractor.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be
          excluded. Specific limits and a governing law must be added here before
          launch.
        </p>
      </Section>

      <Section title="10. Changes">
        <p>
          We may update these terms. Material changes will be reflected in the
          date at the top of this page.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <div className="prose-body mt-3 space-y-3 text-[15px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}
