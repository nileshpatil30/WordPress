import { isError, runEstimate } from "@/lib/api";
import type { EstimateResult } from "@/lib/engine/types";
import type { Material } from "@/lib/types";

const SIZES = [
  { label: "Small home", roofAreaSqft: 1400, note: "roughly 1,200 sq ft single storey" },
  { label: "Average home", roofAreaSqft: 2000, note: "the most common replacement size" },
  { label: "Large home", roofAreaSqft: 2800, note: "larger two-storey or spread single storey" },
  { label: "Very large home", roofAreaSqft: 3800, note: "custom or multi-wing roofline" },
];

export interface LocalScenarios {
  representative: EstimateResult;
  bySize: { label: string; note: string; roofAreaSqft: number; estimate: EstimateResult }[];
  byMaterial: { material: Material; estimate: EstimateResult }[];
}

/**
 * The numbers that make a local page worth publishing.
 *
 * These run through exactly the same engine as the calculator, so a local page
 * can never drift from the tool it sits above. A city page that cannot produce
 * these is a city page we do not publish.
 */
export async function buildLocalScenarios(
  zip: string, materials: Material[], commonMaterialSlugs: string[],
  representativeProjectType = "full-replacement",
): Promise<LocalScenarios | null> {
  const primary = commonMaterialSlugs[0] ?? "asphalt-architectural";
  const base = {
    zip, areaMode: "roof" as const, stories: 1, pitch: "moderate" as const,
    complexity: "moderate" as const, existingLayers: 1, material: primary,
    projectType: representativeProjectType,
  };

  const rep = await runEstimate({ serviceSlug: "roofing", input: { ...base, roofAreaSqft: 2000 } });
  if (isError(rep)) return null;

  const bySize = await Promise.all(
    SIZES.map(async (s) => {
      const r = await runEstimate({ serviceSlug: "roofing", input: { ...base, roofAreaSqft: s.roofAreaSqft } });
      return isError(r) ? null : { ...s, estimate: r.estimate };
    }),
  );

  const wanted = commonMaterialSlugs
    .map((slug) => materials.find((m) => m.slug === slug))
    .filter((m): m is Material => Boolean(m));

  const byMaterial = await Promise.all(
    wanted.map(async (material) => {
      const r = await runEstimate({
        serviceSlug: "roofing",
        // Always a full replacement here: the point of this table is a
        // like-for-like material comparison, not the local common job.
        input: { ...base, roofAreaSqft: 2000, material: material.slug, projectType: "full-replacement" },
      });
      return isError(r) ? null : { material, estimate: r.estimate };
    }),
  );

  return {
    representative: rep.estimate,
    bySize: bySize.filter((x): x is NonNullable<typeof x> => x !== null),
    byMaterial: byMaterial.filter((x): x is NonNullable<typeof x> => x !== null),
  };
}
