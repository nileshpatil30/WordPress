import Link from "next/link";
import { Callout } from "@/components/ui";
import { CONSENT_VERSION } from "@/lib/consent";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy policy",
  description:
    "What Home Cost Doctor collects, what it deliberately does not collect, how long it is kept, and how to have it deleted.",
  path: "/privacy",
});

const UPDATED = "30 August 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">Privacy policy</h1>
      <p className="mt-3 text-[13px] text-faint">Last updated {UPDATED}</p>

      <div className="mt-8">
        <Callout tone="caution" title="Draft pending legal review">
          This policy describes what the application actually does today, written
          from the code rather than from a template. It has not been reviewed by
          a lawyer and does not yet name a legal entity, a jurisdiction, or a
          data protection contact. Those must be filled in before the site is
          launched publicly.
        </Callout>
      </div>

      <Section title="The short version">
        <p>
          We collect as little as we can get away with. The contribution form has
          no field for your name, address, or your contractor&rsquo;s name, so we
          cannot collect them even by accident. We do not sell anything to
          anyone, we run no advertising and no remarketing, and the only place we
          ask for contact details is a form that says plainly that nobody will
          call you. We do use Google Analytics to see which pages get used, with
          advertising features switched off &mdash; the detail is below.
        </p>
      </Section>

      <Section title="What we collect, and why">
        <Table rows={[
          ["Estimate requests", "ZIP code, the project details you enter, the resulting range and confidence score, and an opaque session identifier.", "To show you an estimate, and in aggregate to work out which cities to add local data for next."],
          ["Quote checks", "The quoted amount you enter, the project details, and the verdict.", "To show the comparison, and in aggregate to measure how our modelled ranges compare with real market quotes."],
          ["Uploaded contractor quotes", "The figures and scope read out of the document: total, line items, material, warranty, what is included or excluded. The file itself is never stored, and we do not record your contractor's name, licence number or your address.", "To fill in the comparison for you, and in aggregate to build a picture of real local quote pricing."],
          ["Contributed project costs", "ZIP code, amount paid, the month the work finished, and optional project characteristics.", "To improve the pricing model with real prices. Reviewed by a person before use, and only ever published combined with other projects."],
          ["Interest registrations", "Name, email, optional phone, ZIP code, timeline.", "So we can tell you if contractor matching becomes available in your area. Nothing else."],
          ["Analytics events", "Event name from a fixed allow-list, non-identifying properties, the page path, and the session identifier.", "To see which parts of the product get used and where people give up."],
        ]} />
      </Section>

      <Section title="What we deliberately do not collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your name, address, or your contractor&rsquo;s name on a contributed project cost. The form has no such fields.</li>
          <li>The exact date of a project. Contributions store the month only, because a precise date plus a ZIP code starts to identify a specific property.</li>
          <li>The contractor&rsquo;s name, phone number, licence number, or your property address from an uploaded quote. The reader is instructed not to return them, and the data structure we store them into has no field for them.</li>
          <li>The uploaded file itself. It is held in memory for the length of the request and then discarded.</li>
          <li>Anything from advertising or remarketing networks. Google Analytics is the only third-party script on this site, and it runs with Google&rsquo;s advertising features explicitly disabled, so it cannot be used to build an advertising audience from your visit.</li>
          <li>Free-text that looks like contact detail in analytics. The event endpoint strips anything resembling an email address or phone number before storing.</li>
        </ul>
      </Section>

      <Section title="Consent">
        <p>
          Contributed project costs and interest registrations both require you to
          tick an explicit consent box, and we store which version of the consent
          wording you agreed to. The current version identifier is{" "}
          <code className="font-mono text-[13px] text-ink">{CONSENT_VERSION}</code>.
          If the wording changes materially, the identifier changes with it, so we
          always know what any given contributor actually agreed to.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Session identifier</strong> &mdash; a random string in your browser&rsquo;s <code className="font-mono text-[13px]">sessionStorage</code>. It is not a cookie, it is not a fingerprint, and it is discarded when you close the tab.</li>
          <li><strong>Contractor question checklist</strong> &mdash; your ticked items are saved in <code className="font-mono text-[13px]">localStorage</code> on your own device and are never sent to us.</li>
          <li><strong>Admin session cookie</strong> &mdash; set only for staff signing into the admin console. It is HTTP-only and scoped to <code className="font-mono text-[13px]">/admin</code>.</li>
          <li><strong>Google Analytics cookies</strong> &mdash; <code className="font-mono text-[13px]">_ga</code> and a related per-property cookie, set by Google to tell repeat visits apart. We send Google a truncated IP address and we have turned off Google Signals, which is the setting that would otherwise link your visit to a Google account for advertising. These are the only cookies set by anyone other than us.</li>
        </ul>
        <p>We set no advertising, marketing or cross-site cookies of our own, and we run no remarketing or ad-network tags.</p>
      </Section>

      <Section title="Who we share it with">
        <p>
          Nobody. We do not sell, rent or trade personal data. We have no
          contractor network, no lead buyers and no advertising partners today. If
          that ever changes, any sharing of your details will require your
          specific, separate consent at the point of collection &mdash; not a
          quiet update to this page.
        </p>
        <p>
          We use infrastructure providers to host the application and its
          database. They process data on our instructions only.
        </p>
        <p>
          Google is the one exception worth naming. Google Analytics receives
          your truncated IP address, the pages you view and basic device
          information, and Google acts as a processor for that under its own
          terms. We have disabled the advertising features that would let it be
          used to target you elsewhere. If you would rather not be measured at
          all, Google publishes a browser opt-out add-on, and any tracker
          blocker will stop it.
        </p>
      </Section>

      <Section title="How long we keep it">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Analytics events</strong> &mdash; retained in a rolling window and pruned automatically.</li>
          <li><strong>Estimate requests and quote checks</strong> &mdash; retained as aggregate demand and accuracy data. They contain no contact details.</li>
          <li><strong>Contributed project costs</strong> &mdash; retained indefinitely as part of the pricing dataset, because their value is historical. They contain no contact details.</li>
          <li><strong>Interest registrations</strong> &mdash; retained until you ask us to delete them, or until we decide not to launch matching in your area.</li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask us what we hold about you, ask for it to be corrected, or
          ask for it to be deleted. Because contributed project costs are stored
          without any identifier linking them to you, we may need you to tell us
          the ZIP code, amount and month in order to find a specific submission.
        </p>
        <p>
          Depending on where you live you may have additional statutory rights,
          including under the California Consumer Privacy Act. A contact address
          and a response process must be added here before launch.
        </p>
      </Section>

      <Section title="Children">
        <p>This site is intended for homeowners and is not directed at children.</p>
      </Section>

      <Section title="Changes">
        <p>
          When this policy changes we will update the date at the top. Material
          changes to what we collect or how we use it will also change the
          consent version, and we will not apply new uses retroactively to data
          collected under older wording.
        </p>
      </Section>

      <p className="mt-12 text-[13px] leading-relaxed text-faint">
        See also the <Link href="/terms" className="font-medium text-accent underline underline-offset-2">terms of use</Link>{" "}
        and our <Link href="/data-sources" className="font-medium text-accent underline underline-offset-2">data sources</Link> page.
      </p>
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

function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="scroll-x mt-4">
      <table className="w-full min-w-[600px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-faint">
            <th className="pb-2.5 pr-4 font-semibold">What</th>
            <th className="pb-2.5 pr-4 font-semibold">Fields</th>
            <th className="pb-2.5 font-semibold">Why</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([what, fields, why]) => (
            <tr key={what} className="border-b border-line align-top text-[13.5px]">
              <td className="py-3 pr-4 font-medium text-ink">{what}</td>
              <td className="py-3 pr-4 text-muted">{fields}</td>
              <td className="py-3 text-muted">{why}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
