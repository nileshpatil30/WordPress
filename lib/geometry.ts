/**
 * Roof geometry: area, squares, pitch and shingle quantity.
 *
 * This is the only part of the site with no pricing uncertainty in it. Pitch
 * multipliers are exact — sqrt(1 + (rise/12)²) — and they are the five
 * `verified` rows in the whole dataset. Everything else we publish carries a
 * confidence score because materials are still modelled; none of that applies
 * here, because none of this is a price.
 *
 * That is why these tools exist as their own thing rather than as inputs buried
 * in the calculator. The competing pages for this intent are generic utility
 * sites doing the same arithmetic with no local context at all, and a homeowner
 * who has just learned their roof is 24 squares is one step from asking what 24
 * squares should cost.
 *
 * All of it runs in the browser and needs no server.
 */

/** Exact pitch multipliers. rise:12 -> surface area / plan area. */
export const PITCH_MULTIPLIER: Record<number, number> = Object.fromEntries(
  Array.from({ length: 19 }, (_, i) => [i, Math.sqrt(1 + (i / 12) ** 2)]),
);

export const pitchMultiplier = (risePer12: number) =>
  Math.sqrt(1 + (risePer12 / 12) ** 2);

/** Roof pitch expressed as an angle, for people who think in degrees. */
export const pitchAngleDegrees = (risePer12: number) =>
  (Math.atan(risePer12 / 12) * 180) / Math.PI;

export type PitchBand = "flat" | "low" | "moderate" | "steep" | "very-steep";

/**
 * Which band a pitch falls in. These match the bands the pricing engine uses,
 * so the answer here and the answer in the calculator cannot disagree.
 */
export function pitchBand(risePer12: number): PitchBand {
  if (risePer12 <= 2) return "flat";
  if (risePer12 <= 4) return "low";
  if (risePer12 <= 7) return "moderate";
  if (risePer12 <= 10) return "steep";
  return "very-steep";
}

export const PITCH_BAND_LABEL: Record<PitchBand, string> = {
  flat: "Flat / low slope",
  low: "Low slope",
  moderate: "Moderate slope",
  steep: "Steep slope",
  "very-steep": "Very steep",
};

/** Walkability, which is what actually drives the labour premium. */
export const PITCH_BAND_NOTE: Record<PitchBand, string> = {
  flat: "Not walkable as a sloped roof; usually a membrane system rather than shingles.",
  low: "Comfortably walkable. No steep-slope labour premium.",
  moderate: "Walkable for a roofer. The most common residential pitch.",
  steep: "Requires roof jacks and staging. Expect a labour premium.",
  "very-steep": "Needs full fall protection and staging throughout. A significant labour premium.",
};

export interface AreaResult {
  /** Ground-plan area the roof covers. */
  footprintSqft: number;
  /** Actual sloped surface area. */
  roofAreaSqft: number;
  squares: number;
  multiplier: number;
  band: PitchBand;
}

/**
 * Roof surface from a building footprint.
 *
 * `eaveOverhang` defaults to 1.08, matching the pricing engine: eaves and rakes
 * extend past the walls, so the roof is always larger than the floor plan. The
 * common mistake this tool exists to correct is treating house square footage
 * as roof square footage, which understates a two-storey house by half.
 */
export function roofAreaFromFootprint(opts: {
  houseSqft: number;
  stories?: number;
  risePer12: number;
  eaveOverhang?: number;
}): AreaResult {
  const stories = Math.max(1, opts.stories ?? 1);
  const eave = opts.eaveOverhang ?? 1.08;
  const footprintSqft = (opts.houseSqft / stories) * eave;
  const multiplier = pitchMultiplier(opts.risePer12);
  const roofAreaSqft = footprintSqft * multiplier;
  return {
    footprintSqft,
    roofAreaSqft,
    squares: roofAreaSqft / 100,
    multiplier,
    band: pitchBand(opts.risePer12),
  };
}

/** A roofing "square" is 100 sq ft of roof surface. */
export const sqftToSquares = (sqft: number) => sqft / 100;
export const squaresToSqft = (squares: number) => squares * 100;

export interface ShingleResult {
  squares: number;
  /** Squares including waste, which is what you actually buy. */
  squaresWithWaste: number;
  wastePct: number;
  /** Three bundles per square is the standard for architectural shingles. */
  bundles: number;
  /** Underlayment rolls at 10 squares per roll (4 sq synthetic is also common). */
  underlaymentRolls: number;
  /** Starter and ridge cap are sold by linear foot; these are estimates. */
  nailsLb: number;
}

/**
 * Material quantity for a shingle roof.
 *
 * Quantities are arithmetic and exact given the inputs. What is *not* exact is
 * the waste factor, which depends on how cut-up the roof is — so it is an input
 * with a stated default rather than a hidden constant.
 */
export function shingleQuantities(opts: {
  squares: number;
  wastePct?: number;
  bundlesPerSquare?: number;
}): ShingleResult {
  const wastePct = opts.wastePct ?? 10;
  const bundlesPerSquare = opts.bundlesPerSquare ?? 3;
  const squaresWithWaste = opts.squares * (1 + wastePct / 100);
  return {
    squares: opts.squares,
    squaresWithWaste,
    wastePct,
    bundles: Math.ceil(squaresWithWaste * bundlesPerSquare),
    underlaymentRolls: Math.ceil(squaresWithWaste / 10),
    // Roughly 2.5 lb of roofing nails per square at four nails per shingle.
    nailsLb: Math.ceil(squaresWithWaste * 2.5),
  };
}

/** Typical waste by how complex the roofline is. Guidance, not a rule. */
export const WASTE_GUIDANCE: { label: string; pct: number; note: string }[] = [
  { label: "Simple gable", pct: 10, note: "Two planes, few cuts. The usual minimum." },
  { label: "Moderate", pct: 12, note: "A hip roof, or a gable with dormers and a valley or two." },
  { label: "Complex", pct: 15, note: "Multiple valleys, hips and dormers - a lot of cutting." },
  { label: "Very complex", pct: 18, note: "Turrets, many planes, or a steep cut-up roofline." },
];
