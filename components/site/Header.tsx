import Link from "next/link";
import { ButtonLink } from "@/components/ui";

const NAV = [
  { href: "/roofing-cost", label: "Roofing costs" },
  { href: "/roof-calculator", label: "Roof calculator" },
  { href: "/quote-check", label: "Check a quote" },
  { href: "/compare-quotes", label: "Compare quotes" },
  { href: "/methodology", label: "Methodology" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Home Cost Doctor home">
          <Mark />
          <span className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em] text-ink">Home Cost Doctor</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/roof-cost-calculator" size="sm" className="whitespace-nowrap">
            Calculate my roof cost
          </ButtonLink>
        </div>
      </div>

      {/* Mobile nav: a single scrollable row beats a hamburger for four links. */}
      <div className="scroll-x flex gap-1 border-t border-line px-4 py-2 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}

function Mark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent" aria-hidden>
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
        <path d="M2 12.5 10 4l8 8.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 16.5v-4M10 16.5v-6M13.5 16.5v-2.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" opacity="0.75" />
      </svg>
    </span>
  );
}
