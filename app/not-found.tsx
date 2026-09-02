import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start px-5 py-24">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">404</p>
      <h1 className="display mt-3 text-[36px] font-semibold text-ink">
        There is nothing useful at this address
      </h1>
      <p className="mt-5 text-[16px] leading-relaxed text-muted">
        We only publish a page when it has something specific to say. If you were
        looking for a city or ZIP code we have not covered yet, the calculator
        still works for every US ZIP code &mdash; it just tells you honestly that
        it is using national figures.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/roof-cost-calculator" size="lg">Open the calculator</ButtonLink>
        <ButtonLink href="/roofing-cost" variant="secondary" size="lg">Browse cities</ButtonLink>
      </div>
      <Link href="/" className="mt-6 text-[14px] font-medium text-accent hover:underline">
        Back to the homepage
      </Link>
    </div>
  );
}
