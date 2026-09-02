import { describe, expect, it } from "vitest";
import {
  pitchAngleDegrees, pitchBand, pitchMultiplier, roofAreaFromFootprint,
  shingleQuantities, sqftToSquares, squaresToSqft,
} from "@/lib/geometry";
import { seedDataset } from "@/lib/data/seed";

/**
 * These tools are the one part of the site with no pricing uncertainty, so
 * "about right" is not good enough - the numbers are either exact or wrong.
 */
describe("roof geometry", () => {
  it("computes pitch multipliers as exact geometry", () => {
    expect(pitchMultiplier(0)).toBe(1);
    expect(pitchMultiplier(6)).toBeCloseTo(Math.sqrt(1.25), 10);   // 1.1180…
    expect(pitchMultiplier(12)).toBeCloseTo(Math.SQRT2, 10);        // 45°, 1.4142…
    expect(pitchMultiplier(9)).toBeCloseTo(1.25, 10);               // 3-4-5 triangle
  });

  it("agrees with the pricing engine's own pitch factors", () => {
    // The calculator and these tools must not disagree about the same roof.
    const factor = (key: string) =>
      seedDataset.pricingFactors.find((f) => f.factorKey === key)!.multiplier;
    expect(pitchMultiplier(3.5)).toBeCloseTo(factor("pitch.low.area"), 3);
    expect(pitchMultiplier(6)).toBeCloseTo(factor("pitch.moderate.area"), 3);
    expect(pitchMultiplier(9)).toBeCloseTo(factor("pitch.steep.area"), 3);
    expect(pitchMultiplier(12)).toBeCloseTo(factor("pitch.very-steep.area"), 3);
  });

  it("converts pitch to an angle", () => {
    expect(pitchAngleDegrees(12)).toBeCloseTo(45, 6);
    expect(pitchAngleDegrees(0)).toBe(0);
    expect(pitchAngleDegrees(6)).toBeCloseTo(26.565, 2);
  });

  it("bands pitches the way the engine does", () => {
    expect(pitchBand(1)).toBe("flat");
    expect(pitchBand(4)).toBe("low");
    expect(pitchBand(6)).toBe("moderate");
    expect(pitchBand(9)).toBe("steep");
    expect(pitchBand(14)).toBe("very-steep");
  });

  it("does not mistake house area for roof area", () => {
    // The error this tool exists to correct: a 2,000 sq ft two-storey house has
    // roughly half that as footprint, then more again for pitch and eaves.
    const oneStorey = roofAreaFromFootprint({ houseSqft: 2000, stories: 1, risePer12: 6 });
    const twoStorey = roofAreaFromFootprint({ houseSqft: 2000, stories: 2, risePer12: 6 });
    expect(twoStorey.footprintSqft).toBeCloseTo(oneStorey.footprintSqft / 2, 6);
    expect(oneStorey.roofAreaSqft).toBeGreaterThan(2000);
    expect(twoStorey.roofAreaSqft).toBeLessThan(2000);
  });

  it("produces the squares figure a contractor would quote", () => {
    const r = roofAreaFromFootprint({ houseSqft: 2000, stories: 1, risePer12: 6 });
    // 2000 x 1.08 eaves x 1.118 pitch = 2415 sq ft = 24.1 squares.
    expect(r.squares).toBeCloseTo(24.15, 1);
    expect(r.band).toBe("moderate");
  });

  it("round-trips squares and square feet", () => {
    expect(squaresToSqft(sqftToSquares(2415))).toBeCloseTo(2415, 9);
    expect(sqftToSquares(100)).toBe(1);
  });

  it("counts bundles including waste, rounded up", () => {
    const q = shingleQuantities({ squares: 24.15, wastePct: 10 });
    expect(q.squaresWithWaste).toBeCloseTo(26.565, 3);
    // 3 bundles per square, and you cannot buy a fraction of a bundle.
    expect(q.bundles).toBe(Math.ceil(26.565 * 3));
    expect(q.underlaymentRolls).toBe(3);
    expect(Number.isInteger(q.bundles)).toBe(true);
  });

  it("scales waste rather than hiding it", () => {
    const low = shingleQuantities({ squares: 20, wastePct: 10 });
    const high = shingleQuantities({ squares: 20, wastePct: 18 });
    expect(high.bundles).toBeGreaterThan(low.bundles);
    expect(low.wastePct).toBe(10);
  });
});
