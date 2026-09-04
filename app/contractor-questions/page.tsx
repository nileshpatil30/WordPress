import { QuestionChecklist, type QuestionGroup } from "@/components/tools/QuestionChecklist";
import { buildMetadata, JsonLd, faqJsonLd } from "@/lib/seo";
import { processPhoto } from "@/lib/photos";

export const metadata = buildMetadata({
  title: "Questions to ask a roofing contractor before you sign",
  description:
    "A working checklist of what to ask a roofer about scope, licensing, warranty, decking, permits and payment terms - with why each question matters and what answers should worry you.",
  path: "/contractor-questions",
});

const GROUPS: QuestionGroup[] = [
  {
    id: "credentials",
    title: "Before anything else: who are they",
    intro: "Everything downstream depends on this. Verify independently rather than accepting a number printed on a proposal.",
    questions: [
      { id: "c1", q: "What is your licence number, and which classification is it?", why: "Roofing licences are state-specific: California uses C-39, Nevada C-15, Florida a CCC certification, and Texas has no state roofing licence at all. Look the number up on the issuing board's own website and confirm the company name matches.", redFlag: "Reluctance to give a number, or a number registered to a different company name." },
      { id: "c2", q: "Can you send a certificate of insurance directly from your insurer?", why: "General liability and workers' compensation both matter. If an uninsured worker is injured on your roof, that can become your problem. A certificate emailed by the insurer, naming you as certificate holder, is the only version worth having.", redFlag: "A PDF forwarded by the contractor rather than sent by the insurer, or coverage that expires before your job finishes." },
      { id: "c3", q: "Who is actually doing the work - your crew or a subcontractor?", why: "Subcontracting is normal and not a problem in itself. What matters is who carries the insurance, who supervises daily, and who honours the workmanship warranty if the sub is gone in three years.", redFlag: "Vagueness about whether the warranty follows the company or the crew." },
      { id: "c4", q: "Can I see three local jobs from the last two years?", why: "Recent and local matters more than volume. Roofs that have been through one or two local storm seasons tell you more than a portfolio.", redFlag: "Only references from other metros, or only jobs less than three months old." },
    ],
  },
  {
    id: "scope",
    title: "Scope: the lines that cause disputes",
    intro: "Almost every mid-job argument traces back to something that was never written down. Get each of these in the contract as a specific line, not a general assurance.",
    questions: [
      { id: "s1", q: "How many squares did you measure, and how did you measure them?", why: "Roof area drives the whole price. An on-site measurement and an aerial report can differ by 10% or more on a cut-up roof, and that difference flows straight into what you pay.", redFlag: "A quote produced without anyone visiting a complex or hillside property." },
      { id: "s2", q: "How many existing layers are there, and is full tear-off included?", why: "Two layers roughly doubles tear-off labour and disposal tonnage. A quote assuming one layer on a two-layer roof will produce a change order.", redFlag: "A tear-off allowance stated as 'as needed' with no layer count." },
      { id: "s3", q: "What is the per-sheet price for replacement decking, and how many sheets are included?", why: "Deck condition is unknown until the old roof is off. A stated allowance plus a stated unit price turns a nasty surprise into a predictable variable. This single question resolves more disputes than any other.", redFlag: "No decking language at all, or a per-sheet price well above market that only appears mid-job." },
      { id: "s4", q: "Which underlayment, and is a secondary water barrier included?", why: "Underlayment is the actual waterproof layer. Felt, synthetic and fully self-adhered are three very different products at three very different prices, and in some jurisdictions the choice is a code matter." },
      { id: "s5", q: "Is all flashing being replaced, or reused?", why: "Reused flashing around chimneys, walls and valleys is a common way to make a quote cheaper. It is also where roofs leak first." },
      { id: "s6", q: "What ventilation is being installed, and is the existing intake adequate?", why: "Exhaust without matching intake does nothing. Inadequate ventilation shortens shingle life in hot and humid climates, and it is far cheaper to fix while the roof is open." },
      { id: "s7", q: "Who pulls the permit, and is the fee in this price?", why: "The contractor should pull it. A homeowner-pulled permit can shift liability for code compliance onto you, and an unpermitted re-roof causes problems at resale and at claim time.", redFlag: "Any suggestion that a permit is unnecessary, or an offer to skip it to save money." },
    ],
  },
  {
    id: "warranty",
    title: "Warranty: what is actually covered",
    intro: "There are two separate warranties and they fail in different ways. Manufacturer warranties cover the product; workmanship warranties cover the installation. Most leaks are installation.",
    questions: [
      { id: "w1", q: "How long is your workmanship warranty, and what voids it?", why: "Installation defects usually surface after year five, which is exactly when short workmanship warranties expire. Ten years or more is meaningfully better than two." },
      { id: "w2", q: "Is the manufacturer warranty a standard one or a system warranty?", why: "System warranties require a certified installer and a complete single-brand assembly including underlayment and accessories. They cost more and cover more. Know which one you are buying." },
      { id: "w3", q: "Is the warranty transferable if I sell?", why: "Transferability affects resale value and costs the contractor nothing to confirm in writing." },
      { id: "w4", q: "What is your process if I have a leak in year three?", why: "A specific answer with a named contact and a response time is a good sign. A vague reassurance is not." },
    ],
  },
  {
    id: "money",
    title: "Money and schedule",
    intro: "Payment structure is one of the clearest signals about how a business is run.",
    questions: [
      { id: "m1", q: "What is the payment schedule?", why: "A modest deposit, then payment on completion or at defined milestones, is normal. Material deposits on special-order tile or metal are legitimate.", redFlag: "A demand for most or all of the money up front, or pressure to pay in cash." },
      { id: "m2", q: "What is the cash price, separate from any financing you offer?", why: "Contractor-arranged finance frequently has a dealer fee built into the project price. You cannot compare finance offers without knowing the cash price first." },
      { id: "m3", q: "What would cause the price to change once work starts?", why: "You want a short, specific list - decking, unforeseen structural issues - not an open-ended clause." },
      { id: "m4", q: "How many days will the job take, and what is your dry-in plan overnight?", why: "In climates with daily afternoon storms, how a crew secures an open roof each evening is a genuine competence question." },
      { id: "m5", q: "Will you provide a lien waiver on final payment?", why: "If the contractor does not pay their supplier or subcontractor, a lien can attach to your property even though you paid in full." },
    ],
  },
  {
    id: "insurance",
    title: "If this is an insurance claim",
    intro: "Claim-funded roofs follow different rules, and some common practices are illegal in some states.",
    questions: [
      { id: "i1", q: "Will you work from my insurer's scope, and flag anything missing from it?", why: "The insurer's scope, depreciation schedule and your deductible determine your actual out-of-pocket cost. A quote matching the scope is not automatically good, and one above it is not automatically inflated." },
      { id: "i2", q: "Do you ever cover or rebate a customer's deductible?", why: "The correct answer is no. In Texas, for example, it is a criminal offence for a contractor to rebate or waive an insurance deductible on a property claim, and it is prohibited in a number of other states.", redFlag: "Any offer to 'take care of' or 'waive' your deductible. Walk away." },
      { id: "i3", q: "Am I signing a contract, or an authorisation to inspect?", why: "Post-storm door-knocking sometimes involves documents that are contingency contracts assigning your claim rights. Read what you are signing, and never sign on the doorstep." },
    ],
  },
];

const FAQS = [
  { q: "How many quotes should I get for a roof replacement?", a: "Three is the usual advice and it holds up, provided all three are quoting the same written scope. Two quotes for different scopes tell you less than one detailed quote does." },
  { q: "Should I pay a deposit?", a: "A modest deposit is normal, and material deposits on special-order products are legitimate. Being asked for most or all of the money before work starts is not." },
  { q: "What is the single most useful question on this list?", a: "The decking one. Deck condition is unknown until tear-off, and a stated allowance plus a stated per-sheet price converts the most common source of mid-job disputes into a predictable number." },
];

/**
 * The four stages the scope questions are actually about.
 *
 * A homeowner ticking "is full tear-off included?" has usually never seen a
 * tear-off. The decking one earns its place most: question s3 is the single
 * question that resolves the most disputes, and a photograph of a rotted deck
 * explains in one glance why an allowance matters.
 */
const STAGES: { slug: string; title: string; body: string }[] = [
  { slug: "tear-off", title: "Tear-off", body: "Stripping the old covering to bare deck. Two layers roughly doubles the labour and the disposal tonnage." },
  { slug: "decking-rot", title: "Deck condition", body: "Nobody knows what is under the old roof until it is off. This is what an allowance and a per-sheet price protect you from." },
  { slug: "underlayment", title: "Underlayment", body: "Goes down over the bare deck before the covering. Synthetic or felt is a line item worth naming in the contract." },
  { slug: "ridge-vent", title: "Ventilation", body: "A ridge vent runs the length of the peak under the cap shingles. Often quoted vaguely, and it affects how long the roof lasts." },
  { slug: "ice-and-water", title: "Eave protection", body: "A self-adhering membrane along the eaves, under everything else. In snow country it is what stops an ice dam pushing water back into the house." },
];

export default function ContractorQuestionsPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <JsonLd data={faqJsonLd(FAQS)} />

      <div className="max-w-2xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">
          What to ask before you hire a roofer
        </h1>
        <p className="mt-5 text-[16.5px] leading-relaxed text-muted">
          Not a list of generic tips. These are the questions whose answers
          actually change what you pay or what you are left holding, with the
          reason each one matters and what a worrying answer sounds like. Tick
          them off as you go &mdash; your progress is saved in this browser and
          never sent to us.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-[15px] font-semibold text-ink">What the scope questions are about</h2>
        <ul className="scroll-x mt-4 flex gap-3 md:grid md:grid-cols-5">
          {STAGES.filter((st) => processPhoto(st.slug)).map((st) => (
            <li key={st.slug} className="w-[240px] shrink-0 md:w-auto">
              <figure className="h-full overflow-hidden rounded-xl border border-line bg-surface">
                <img
                  src={processPhoto(st.slug)!} alt={st.title} width={640} height={480}
                  loading="lazy" decoding="async"
                  className="w-full object-cover" style={{ aspectRatio: "4 / 3" }}
                />
                <figcaption className="px-4 py-3">
                  <span className="block text-[14px] font-semibold text-ink">{st.title}</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">{st.body}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <QuestionChecklist groups={GROUPS} />
      </div>

      <section className="mt-14">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Common questions</h2>
        <div className="mt-5">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-t border-line py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink marker:content-none">
                {f.q}
                <span aria-hidden className="text-xl leading-none text-faint transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-12 text-[13px] leading-relaxed text-faint">
        General information, not legal advice. Licensing, permitting and
        insurance rules differ by state and by municipality, and they change.
        Verify anything that matters with the authority having jurisdiction for
        your address.
      </p>
    </div>
  );
}
