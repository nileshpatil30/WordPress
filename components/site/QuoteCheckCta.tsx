import Link from "next/link";
import { ButtonLink } from "@/components/ui";

/**
 * The differentiated ask, on every page that shows a cost.
 *
 * A calculator can tell someone a roof costs about $20,000. Plenty of sites do.
 * What almost nobody does is take the $26,000 quote already sitting in their
 * inbox and explain the gap - and that is the moment this product is actually
 * useful, so it should not be buried behind a nav link.
 *
 * Framed as a question rather than a promise. We can say how a quote compares
 * to a modelled range; we cannot pronounce it fair.
 */
export function QuoteCheckCta({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`rounded-xl border border-accent-line bg-accent-soft/60 px-5 py-5 sm:px-6 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="text-[16px] font-semibold text-ink">
            Already have a contractor&rsquo;s quote?
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            See how it compares to the modelled range for your ZIP, and which
            single assumption &mdash; pitch, layers, decking, access &mdash; would
            account for the difference. A quote outside the range is not proof of
            anything, and we will say so.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <ButtonLink href="/quote-check" size="sm" className="whitespace-nowrap">
            Check my quote
          </ButtonLink>
          <Link
            href="/compare-quotes"
            className="whitespace-nowrap text-[13.5px] font-semibold text-accent hover:underline"
          >
            Compare several &rarr;
          </Link>
        </div>
      </div>
    </aside>
  );
}
