/**
 * Two drawings that carry information the numbers cannot.
 *
 * Both are SVG rather than images: they are driven by the value the reader has
 * actually selected, so they are the calculation rather than a picture of one,
 * and they stay sharp and on-palette at any size.
 */

/**
 * A pitch, drawn to scale.
 *
 * "6:12" means nothing to most people, and "×1.118" means less. The triangle
 * makes it obvious at a glance that the roof surface is the sloping side and
 * that it is always longer than the ground it covers - which is the single
 * misunderstanding that makes people underestimate their roof.
 */
export function PitchDiagram({ risePer12, multiplier, angle }: {
  risePer12: number; multiplier: number; angle: number;
}) {
  const W = 300, H = 200, PAD = 34;
  // Scale so both legs fit whatever the pitch: a 16:12 is taller than it is
  // wide, a 2:12 is far wider than tall.
  const unit = Math.min((W - PAD * 2) / 12, (H - PAD * 2) / Math.max(risePer12, 1.5));
  const run = 12 * unit;
  const rise = risePer12 * unit;
  const x0 = PAD, y0 = H - PAD;          // bottom-left corner
  const x1 = x0 + run, y1 = y0;          // bottom-right (end of run)
  const x2 = x0, y2 = y0 - rise;         // top-left (top of rise)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[320px]" role="img"
      aria-label={`A ${risePer12} in 12 roof pitch: ${angle.toFixed(1)} degrees, surface ${multiplier.toFixed(3)} times the ground it covers`}>
      {/* Ground it covers */}
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="var(--color-line-strong)" strokeWidth="1.5" />
      {/* Rise */}
      <line x1={x0} y1={y0} x2={x2} y2={y2} stroke="var(--color-line-strong)" strokeWidth="1.5"
        strokeDasharray="3 3" />
      {/* The roof surface itself - the thing you pay to cover */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-accent)" strokeWidth="3"
        strokeLinecap="round" />
      <polygon points={`${x0},${y0} ${x1},${y1} ${x2},${y2}`} fill="var(--color-accent)" opacity="0.07" />

      {/* Right-angle mark at the corner */}
      <path d={`M ${x0 + 9} ${y0} L ${x0 + 9} ${y0 - 9} L ${x0} ${y0 - 9}`}
        fill="none" stroke="var(--color-faint)" strokeWidth="1.2" />

      <text x={x0 + run / 2} y={y0 + 17} textAnchor="middle"
        className="fill-[var(--color-muted)] text-[11px] font-semibold">12&Prime; run</text>
      {rise > 16 && (
        <text x={x0 - 8} y={y0 - rise / 2} textAnchor="end" dominantBaseline="middle"
          className="fill-[var(--color-muted)] text-[11px] font-semibold">{risePer12}&Prime;</text>
      )}
      <text x={(x1 + x2) / 2 + 6} y={(y1 + y2) / 2 - 8} textAnchor="middle"
        className="fill-[var(--color-accent)] text-[11.5px] font-bold">
        &times;{multiplier.toFixed(3)}
      </text>
    </svg>
  );
}

export type RoofShapeKind = "simple" | "moderate" | "complex" | "very-complex";

/**
 * A roofline in plan, from directly above.
 *
 * Complexity is the input people guess at most, and it drives the waste factor.
 * Four outlines make it a recognition task instead of a judgement call: you
 * look down at your own roof, or at a photograph of it, and pick the one that
 * matches.
 */
export function RoofShape({ kind, className = "" }: { kind: RoofShapeKind; className?: string }) {
  const ridge = { stroke: "var(--color-accent)", strokeWidth: 2, strokeLinecap: "round" as const };
  const hip = { stroke: "var(--color-line-strong)", strokeWidth: 1.3 };

  return (
    <svg viewBox="0 0 80 60" className={`h-auto w-full ${className}`} role="img"
      aria-label={SHAPE_LABEL[kind]}>
      <rect x="4" y="8" width="72" height="44" rx="2"
        fill="var(--color-sunken)" stroke="var(--color-line-strong)" strokeWidth="1.3" />
      {kind === "simple" && (
        // Two planes meeting at one ridge. Nothing to cut around.
        <line x1="10" y1="30" x2="70" y2="30" {...ridge} />
      )}
      {kind === "moderate" && (
        <>
          <line x1="16" y1="30" x2="64" y2="30" {...ridge} />
          <line x1="4" y1="8" x2="16" y2="30" {...hip} />
          <line x1="76" y1="8" x2="64" y2="30" {...hip} />
          <line x1="4" y1="52" x2="16" y2="30" {...hip} />
          <line x1="76" y1="52" x2="64" y2="30" {...hip} />
        </>
      )}
      {kind === "complex" && (
        <>
          <line x1="16" y1="24" x2="52" y2="24" {...ridge} />
          <line x1="52" y1="24" x2="52" y2="46" {...ridge} />
          <line x1="4" y1="8" x2="16" y2="24" {...hip} />
          <line x1="4" y1="40" x2="16" y2="24" {...hip} />
          <line x1="40" y1="52" x2="52" y2="46" {...hip} />
          <line x1="64" y1="52" x2="52" y2="46" {...hip} />
          <line x1="76" y1="8" x2="52" y2="24" {...hip} />
        </>
      )}
      {kind === "very-complex" && (
        <>
          <line x1="14" y1="20" x2="40" y2="20" {...ridge} />
          <line x1="40" y1="20" x2="40" y2="42" {...ridge} />
          <line x1="40" y1="42" x2="66" y2="42" {...ridge} />
          <line x1="52" y1="20" x2="52" y2="30" {...ridge} />
          <line x1="4" y1="8" x2="14" y2="20" {...hip} />
          <line x1="4" y1="32" x2="14" y2="20" {...hip} />
          <line x1="28" y1="52" x2="40" y2="42" {...hip} />
          <line x1="76" y1="52" x2="66" y2="42" {...hip} />
          <line x1="76" y1="30" x2="66" y2="42" {...hip} />
          <line x1="46" y1="8" x2="52" y2="20" {...hip} />
          <line x1="58" y1="8" x2="52" y2="20" {...hip} />
        </>
      )}
    </svg>
  );
}

const SHAPE_LABEL: Record<RoofShapeKind, string> = {
  simple: "A simple gable roof seen from above: one ridge, two planes",
  moderate: "A hip roof seen from above: one ridge with four sloping planes",
  complex: "A cut-up roof seen from above: an L-shaped ridge with several valleys",
  "very-complex": "A very cut-up roof seen from above: multiple ridges, dormers and valleys",
};
