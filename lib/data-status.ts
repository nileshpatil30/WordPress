import { seedDataset, hasRealLabourData } from "@/lib/data/seed";
import { BLS_EFFECTIVE_DATE, BLS_SOC_CODE } from "@/lib/data/seed/bls-labor";
import { formatMonth } from "@/lib/format";

/**
 * What the site actually knows, derived from the dataset rather than written
 * down.
 *
 * The old version of this was a hand-written amber warning that said "mostly
 * sample data" and left it there. That was honest and it was also the wrong
 * shape: a homeowner arriving from Google saw a price and, directly underneath,
 * what read as an admission that the calculator did not work. Honesty about
 * data quality is the product's whole differentiator, so it deserves to be
 * presented as a status readout - here is what is real, here is what is
 * modelled, here is what improves it - rather than as a warning label.
 *
 * Nothing here is softened. Materials are still reported as modelled and not
 * observed. What changed is that the reader can see which parts are solid, and
 * the numbers come from the dataset, so this cannot drift out of date the way a
 * sentence would.
 */

export type StatusLevel = "real" | "modelled" | "partial";

export interface DataStatusRow {
  label: string;
  /** Short verdict, e.g. "Government data". */
  status: string;
  level: StatusLevel;
  /** One line of specifics: which release, how many metros. */
  detail: string;
}

export interface DataStatusReport {
  rows: DataStatusRow[];
  /** Share of a typical re-roof still priced from modelled rows, 0-1. */
  modelledShare: number;
  /** True while any sample row can reach an estimate. */
  containsSample: boolean;
  publishedCityCount: number;
  labourMetroCount: number;
}

/**
 * Roughly what each component contributes to a typical re-roof. Used only to
 * describe how much of the estimate rests on modelled rows - never in pricing.
 */
const TYPICAL_SHARE: Record<string, number> = {
  labor: 0.34, material: 0.4, disposal: 0.06,
  equipment: 0.04, permit: 0.03, overhead: 0.13,
};

export function getDataStatus(): DataStatusReport {
  const records = seedDataset.pricingRecords;

  const labourMetros = new Set(
    records
      .filter((r) => r.metricKey === "labor.rate_per_hour" && r.geoScopeType === "metro")
      .map((r) => r.geoScopeId));

  const materialRows = records.filter((r) => r.component === "material");
  const observedMaterials = materialRows.filter((r) => r.dataStatus !== "sample");

  const publishedCityCount = seedDataset.cities.filter((c) => c.isPublished).length;

  const containsSample = records.some((r) => r.dataStatus === "sample");
  const modelledShare = Object.entries(TYPICAL_SHARE).reduce((acc, [component, share]) => {
    const rows = records.filter((r) => r.component === component);
    if (!rows.length) return acc + share;
    const sampleRows = rows.filter((r) => r.dataStatus === "sample").length;
    return acc + share * (sampleRows / rows.length);
  }, 0);

  const rows: DataStatusRow[] = [
    {
      label: "Labour",
      status: hasRealLabourData ? "Government data" : "Sample rates",
      level: hasRealLabourData ? "real" : "modelled",
      detail: hasRealLabourData
        ? `Bureau of Labor Statistics wage release for ${formatMonth(BLS_EFFECTIVE_DATE)}, occupation ${BLS_SOC_CODE} (roofers), across ${labourMetros.size} metro areas.`
        : "Not yet ingested.",
    },
    {
      label: "Materials",
      status: observedMaterials.length ? "Partly observed" : "Modelled",
      level: observedMaterials.length ? "partial" : "modelled",
      detail: observedMaterials.length
        ? `${observedMaterials.length} of ${materialRows.length} material rows come from observed prices; the rest are modelled.`
        : "Derived from our own model, not from observed market pricing. This is the gap we are closing first.",
    },
    {
      label: "Local coverage",
      status: `${publishedCityCount} cities`,
      level: "partial",
      detail: `Metro-level pricing in ${labourMetros.size} markets and written local guidance for ${publishedCityCount} cities. Anywhere else falls back to national figures, and the confidence score says so.`,
    },
    {
      label: "Geometry",
      status: "Exact",
      level: "real",
      detail: "Pitch multipliers, roof area and material quantities are arithmetic, not estimates.",
    },
  ];

  return {
    rows,
    modelledShare: Math.round(modelledShare * 100) / 100,
    containsSample,
    publishedCityCount,
    labourMetroCount: labourMetros.size,
  };
}
