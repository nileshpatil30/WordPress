import { getStore } from "@/lib/data/store";
import { QuoteChecker } from "@/components/quote/QuoteChecker";
import { DataNotice } from "@/components/ui";
import { readInitialValues } from "@/lib/calculator-params";
import { buildMetadata, JsonLd, faqJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Is my roofing quote fair? Quote checker",
  description:
    "Compare a contractor's roof replacement quote against a modelled fair range for your ZIP code and project, and see which single assumption would explain any gap.",
  path: "/quote-check",
});

const FAQS = [
  {
    q: "Does a quote above your range mean I am being overcharged?",
    a: "No. It means the quote sits outside what our model expects for the project as you described it. There are many legitimate reasons for that, including a larger measured roof, a steeper pitch, a second layer, extensive decking replacement, a premium product, or work our model does not know about. We list the likely explanations so you can ask about them.",
  },
  {
    q: "What should I do about a quote well below your range?",
    a: "Treat it as a scope question before treating it as a saving. Check that tear-off, disposal, the permit, the decking allowance, flashing and the warranty are all explicitly included, and verify licensing and insurance directly with the issuing authority and insurer.",
  },
  {
    q: "Is this an inspection or a valuation?",
    a: "Neither. It is a modelled comparison based on the project characteristics you enter. It cannot see your roof, your deck condition or your site, and it is not a substitute for a contractor who has been on the roof.",
  },
];

export default async function QuoteCheckPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const store = await getStore();
  const service = await store.getServiceBySlug("roofing");
  const [materials, projectTypes] = await Promise.all([
    store.listMaterials(service!.id),
    store.listProjectTypes(service!.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <JsonLd data={faqJsonLd(FAQS)} />

      <div className="max-w-2xl">
        <h1 className="display text-[34px] font-semibold text-ink sm:text-[42px]">
          Is my contractor&rsquo;s quote fair?
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          Compare a real quote against a modelled range for your project. We will
          not tell you a contractor is ripping you off &mdash; we will tell you
          how the number compares to our model, and exactly what could account
          for the difference.
        </p>
      </div>

      <div className="mt-8"><DataNotice /></div>

      <div className="mt-8">
        <QuoteChecker
          materials={materials}
          projectTypes={projectTypes}
          initialValues={readInitialValues(sp)}
        />
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
          Common questions
        </h2>
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
    </div>
  );
}
