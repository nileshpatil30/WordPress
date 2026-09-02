import Link from "next/link";
import { getStore } from "@/lib/data/store";

export async function SiteFooter() {
  const store = await getStore();
  const [cities, services] = await Promise.all([
    store.listCities({ publishedOnly: true }),
    store.listServices(),
  ]);
  const planned = services.filter((s) => s.status === "planned");

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[13px] font-semibold text-ink">Tools</p>
            <ul className="mt-3 space-y-2 text-[14px] text-muted">
              <li><Link href="/roof-cost-calculator" className="hover:text-ink">Roof cost calculator</Link></li>
              <li><Link href="/quote-check" className="hover:text-ink">Is my quote fair?</Link></li>
              <li><Link href="/compare-quotes" className="hover:text-ink">Compare contractor quotes</Link></li>
              <li><Link href="/contractor-questions" className="hover:text-ink">Questions to ask a roofer</Link></li>
              <li><Link href="/financing" className="hover:text-ink">Payment scenarios</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">Roofing cost by city</p>
            <ul className="mt-3 space-y-2 text-[14px] text-muted">
              {cities.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/roofing-cost/${c.slug}`} className="hover:text-ink">{c.name}</Link>
                </li>
              ))}
              <li><Link href="/roofing-cost" className="font-medium text-accent hover:underline">All cities</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">How this works</p>
            <ul className="mt-3 space-y-2 text-[14px] text-muted">
              <li><Link href="/methodology" className="hover:text-ink">Estimation methodology</Link></li>
              <li><Link href="/data-sources" className="hover:text-ink">Data sources and licences</Link></li>
              <li><Link href="/contribute" className="hover:text-ink">Share what you actually paid</Link></li>
              <li><Link href="/hire" className="hover:text-ink">Getting contractor quotes</Link></li>
              <li><Link href="/privacy" className="hover:text-ink">Privacy policy</Link></li>
              <li><Link href="/terms" className="hover:text-ink">Terms of use</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">Coming next</p>
            <ul className="mt-3 space-y-2 text-[14px] text-faint">
              {planned.slice(0, 5).map((s) => <li key={s.id}>{s.shortName}</li>)}
            </ul>
            <p className="mt-3 text-[12.5px] leading-snug text-faint">
              Roofing first, done properly. Each new service is added as data plus
              one engine module.
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-8">
          <p className="max-w-3xl text-[12.5px] leading-relaxed text-faint">
            <strong className="font-semibold text-muted">Estimates are modelled ranges</strong>{" "}
            based on available market data and the project assumptions you supply.
            Actual prices vary by contractor, site conditions, materials, labour
            availability, permits, code requirements and other factors. Nothing on
            this site is a quote, an offer, an inspection, or professional, legal
            or financial advice. Verify licensing, insurance and permit
            requirements with the relevant authority for your address.
          </p>
          <p className="mt-4 text-[12.5px] text-faint">
            &copy; {new Date().getFullYear()} Home Cost Doctor. Currently modelling
            roof replacement in the United States.
          </p>
        </div>
      </div>
    </footer>
  );
}
