import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { Logo } from "./Logo";

export async function SiteFooter() {
  const store = await getStore();
  const [cities, services] = await Promise.all([
    store.listCities({ publishedOnly: true }),
    store.listServices(),
  ]);
  const planned = services.filter((s) => s.status === "planned");

  return (
    <footer className="mt-20 bg-accent-deep text-white/70">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* The brand column. No social icons until there are accounts to
              link to - a dead icon row costs more trust than it buys. */}
          <div className="lg:pr-6">
            <Logo tone="light" />
            <p className="mt-4 max-w-[16rem] text-[13.5px] leading-relaxed text-white/60">
              Know what your home project should cost, before you spend thousands.
            </p>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-white">Tools</p>
            <ul className="mt-3 space-y-2 text-[14px] text-white/65">
              <li><Link href="/roof-cost-calculator" className="hover:text-white">Roof cost calculator</Link></li>
              <li><Link href="/quote-check" className="hover:text-white">Is my quote fair?</Link></li>
              <li><Link href="/compare-quotes" className="hover:text-white">Compare contractor quotes</Link></li>
              <li><Link href="/contractor-questions" className="hover:text-white">Questions to ask a roofer</Link></li>
              <li><Link href="/financing" className="hover:text-white">Payment scenarios</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-white">Roofing cost by city</p>
            <ul className="mt-3 space-y-2 text-[14px] text-white/65">
              {cities.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/roofing-cost/${c.slug}`} className="hover:text-white">{c.name}</Link>
                </li>
              ))}
              <li><Link href="/roofing-cost" className="font-medium text-white hover:underline">All cities</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-white">How this works</p>
            <ul className="mt-3 space-y-2 text-[14px] text-white/65">
              <li><Link href="/methodology" className="hover:text-white">Estimation methodology</Link></li>
              <li><Link href="/data-sources" className="hover:text-white">Data sources and licences</Link></li>
              <li><Link href="/contribute" className="hover:text-white">Share what you actually paid</Link></li>
              <li><Link href="/hire" className="hover:text-white">Getting contractor quotes</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of use</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-white">Coming next</p>
            <ul className="mt-3 space-y-2 text-[14px] text-white/55">
              {planned.map((s) => <li key={s.id}>{s.shortName}</li>)}
            </ul>
            <p className="mt-3 text-[12.5px] leading-snug text-white/50">
              Roofing first, done properly. Each new service is added as data plus
              one engine module.
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-white/15 pt-8">
          <p className="max-w-3xl text-[12.5px] leading-relaxed text-white/50">
            <strong className="font-semibold text-white/80">Estimates are modelled ranges</strong>{" "}
            based on available market data and the project assumptions you supply.
            Actual prices vary by contractor, site conditions, materials, labour
            availability, permits, code requirements and other factors. Nothing on
            this site is a quote, an offer, an inspection, or professional, legal
            or financial advice. Verify licensing, insurance and permit
            requirements with the relevant authority for your address.
          </p>
          <p className="mt-4 text-[12.5px] text-white/50">
            &copy; {new Date().getFullYear()} Home Cost Doctor. Currently modelling
            roof replacement in the United States.
          </p>
        </div>
      </div>
    </footer>
  );
}
