import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { Logo } from "./Logo";

/**
 * "Check a quote" is deliberately an action, not a nav link.
 *
 * Any site can tell you a roof costs about $20,000. What separates this one is
 * taking the $26,000 quote already sitting in someone's inbox and explaining
 * the gap - so the header carries it as a button beside the primary call to
 * action rather than as the third of five text links, where nobody found it.
 */
const NAV = [
  { href: "/roofing-cost", label: "Roofing costs" },
  { href: "/roof-calculator", label: "Roof calculator" },
  { href: "/compare-quotes", label: "Compare quotes" },
  { href: "/methodology", label: "Methodology" },
];

/** Mobile keeps the quote checker in the row too, since there is no button space. */
const MOBILE_NAV = [
  NAV[0], NAV[1],
  { href: "/quote-check", label: "Check a quote" },
  NAV[2], NAV[3],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3">
        <Link href="/" aria-label="Home Cost Doctor home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
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

        <div className="flex shrink-0 items-center gap-2">
          {/* Wrapped rather than given `hidden` directly: the button class also
              sets `inline-flex`, and which of the two display utilities wins
              depends on stylesheet order, not attribute order. On a 390px
              viewport it lost, and the wordmark wrapped to three lines to make
              room. The quote checker is still one tap away in the row below. */}
          <span className="hidden sm:block">
            <ButtonLink href="/quote-check" variant="secondary" size="sm" className="whitespace-nowrap">
              Check a quote
            </ButtonLink>
          </span>
          {/* The full label plus the wordmark overflows a 390px viewport, so the
              smallest screens get the short one. */}
          <ButtonLink href="/roof-cost-calculator" size="sm" className="whitespace-nowrap">
            <span className="sm:hidden">Calculate</span>
            <span className="hidden sm:inline">Calculate my roof cost</span>
          </ButtonLink>
        </div>
      </div>

      {/* Mobile nav: a single scrollable row beats a hamburger for five links. */}
      <div className="scroll-x flex gap-1 border-t border-line px-4 py-2 lg:hidden">
        {MOBILE_NAV.map((item) => (
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
