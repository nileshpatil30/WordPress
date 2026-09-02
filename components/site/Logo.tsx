/**
 * The mark: a navy house outline with a green check swept through it.
 *
 * Flattened from the supplied artwork - same idea, no gradients and no 3-D
 * bevel, because the mark has to survive a 16px favicon and a one-colour print
 * on a PDF report. The house is drawn as an open gable with no base line so it
 * reads as a home rather than a box, and the check is heavier than the house so
 * that when the fine strokes merge at small sizes the shape that survives is
 * the check - which is the half that says what this product does.
 */
export function LogoMark({ size = 30, className = "", checkColor = "var(--color-accent)" }: {
  size?: number; className?: string; checkColor?: string;
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" fill="none"
      className={className} aria-hidden focusable="false"
    >
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.8 14.8 16 5l13.2 9.8" />
        <path d="M7 13.2v13.6M25 13.2v13.6" />
      </g>
      <path
        d="m10.6 19.2 3.9 4L23.4 14"
        stroke={checkColor} strokeWidth="3.6"
        strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </svg>
  );
}

/** Mark plus the stacked wordmark, as used in the header and footer. */
export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const primary = tone === "light" ? "text-white" : "text-ink";
  const secondary = tone === "light" ? "text-white/85" : "text-accent";
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={primary} checkColor={tone === "light" ? "#5BD08C" : "var(--color-accent)"} />
      <span className="leading-[1.05]">
        <span className={`block whitespace-nowrap text-[14.5px] font-bold uppercase tracking-[0.04em] ${primary}`}>
          Home Cost
        </span>
        <span className={`block whitespace-nowrap text-[14.5px] font-bold uppercase tracking-[0.16em] ${secondary}`}>
          Doctor
        </span>
      </span>
    </span>
  );
}
