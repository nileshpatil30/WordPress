import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "caution" | "danger" | "positive";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-sunken text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent-line",
  caution: "bg-caution-soft text-caution border-caution/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  positive: "bg-positive-soft text-positive border-positive/20",
};

export function Badge({ children, tone = "neutral", className = "" }: {
  children: ReactNode; tone?: Tone; className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "", as: As = "div" }: {
  children: ReactNode; className?: string; as?: "div" | "section" | "article";
}) {
  return (
    <As className={`rounded-[14px] border border-line bg-surface ${className}`}>{children}</As>
  );
}

export function SectionHeading({ eyebrow, title, description, className = "" }: {
  eyebrow?: string; title: string; description?: string; className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`}>
      {eyebrow && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">{title}</h2>
      {description && <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{description}</p>}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-hover border-transparent",
  secondary: "bg-surface text-ink border-line-strong hover:border-ink/40",
  ghost: "bg-transparent text-ink border-transparent hover:bg-sunken",
};
const SIZES = { sm: "px-3 py-1.5 text-[13px]", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3.5 text-[15px]" };

function buttonClass({ variant = "primary", size = "md", className = "" }: ButtonProps) {
  return `inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export function Button(
  props: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { children, variant, size, className, ...rest } = props;
  return <button className={buttonClass({ children, variant, size, className })} {...rest}>{children}</button>;
}

export function ButtonLink(props: ButtonProps & { href: string; prefetch?: boolean }) {
  const { children, variant, size, className, href, prefetch } = props;
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass({ children, variant, size, className })}>
      {children}
    </Link>
  );
}

export function Stat({ label, value, sub, tone = "neutral" }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: Tone;
}) {
  const valueTone = tone === "accent" ? "text-accent" : tone === "caution" ? "text-caution"
    : tone === "danger" ? "text-danger" : tone === "positive" ? "text-positive" : "text-ink";
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">{label}</p>
      <p className={`mt-1.5 text-[26px] font-semibold tnum ${valueTone}`}>{value}</p>
      {sub && <p className="mt-1 text-[13px] leading-snug text-muted">{sub}</p>}
    </div>
  );
}

export function Disclosure({ summary, children, defaultOpen = false, className = "" }: {
  summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string;
}) {
  return (
    <details open={defaultOpen} className={`group border-t border-line py-3.5 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-medium text-ink marker:content-none">
        <span>{summary}</span>
        <span aria-hidden className="shrink-0 text-faint transition-transform group-open:rotate-45 text-xl leading-none">+</span>
      </summary>
      <div className="prose-body mt-3 text-[14.5px] leading-relaxed text-muted">{children}</div>
    </details>
  );
}

export function Callout({ tone = "neutral", title, children }: {
  tone?: Tone; title?: string; children: ReactNode;
}) {
  const map: Record<Tone, string> = {
    neutral: "border-line bg-sunken",
    accent: "border-accent-line bg-accent-soft",
    caution: "border-caution/25 bg-caution-soft",
    danger: "border-danger/25 bg-danger-soft",
    positive: "border-positive/25 bg-positive-soft",
  };
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${map[tone]}`}>
      {title && <p className="mb-1 text-[13px] font-semibold text-ink">{title}</p>}
      <div className="text-[13.5px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export function DataNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-caution/25 bg-caution-soft px-4 py-3 ${className}`}>
      <p className="text-[13px] leading-relaxed text-ink-soft">
        <strong className="font-semibold text-caution">Sample data.</strong>{" "}
        The prices behind every estimate on this site are internally modelled
        placeholders shipped for development. They are not observed market
        pricing and are not attributed to any third party. Verified data feeds
        are listed on the{" "}
        <Link href="/data-sources" className="font-medium text-accent underline underline-offset-2">
          data sources
        </Link>{" "}
        page.
      </p>
    </div>
  );
}

export function Field({ label, hint, children, htmlFor, suffix }: {
  label: string; hint?: string; children: ReactNode; htmlFor?: string; suffix?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      <div className="relative">
        {children}
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-faint">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="mt-1.5 block text-[12.5px] leading-snug text-faint">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 tnum";

export const selectClass =
  "w-full appearance-none rounded-lg border border-line-strong bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22none%22 stroke=%22%235F6B66%22 stroke-width=%221.6%22><path d=%22M6 8l4 4 4-4%22/></svg>')] bg-[length:18px] bg-[right_0.6rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-[15px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
