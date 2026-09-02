import type { PricingFactor } from "@/lib/types";

/**
 * Resolve a factor through the geographic chain: state, then country, then the
 * global default.
 *
 * Shared by every ingester, because they all face the same question - which
 * multiplier applies to this row - and answering it two different ways would
 * let two data sources disagree about the same place.
 */
export function resolveFactor(
  factors: PricingFactor[], factorKey: string, scope: { stateId?: string; countryId?: string },
): PricingFactor | null {
  const chain: [PricingFactor["geoScopeType"], string | undefined][] = [
    ["state", scope.stateId],
    ["country", scope.countryId],
    ["global", "global"],
  ];
  for (const [type, id] of chain) {
    if (!id) continue;
    const hit = factors.find(
      (f) => f.factorKey === factorKey && f.geoScopeType === type && f.geoScopeId === id);
    if (hit) return hit;
  }
  return null;
}
