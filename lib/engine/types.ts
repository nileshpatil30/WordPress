import type {
  City, CostComponent, DataStatus, Material, PricingFactor, PricingRecord, ProjectType,
  Service, State, ZipCode,
} from "@/lib/types";

export interface PriceTriple { low: number; typical: number; high: number }

export interface LineItem {
  key: string;
  label: string;
  component: CostComponent;
  low: number;
  typical: number;
  high: number;
  /** Plain-language derivation, e.g. "24.6 squares x $158/square". */
  basis: string;
  /**
   * Where the unit price came from. Carried on every line so the interface can
   * show provenance per row rather than as a single site-wide disclaimer - the
   * difference between claiming transparency and demonstrating it.
   */
  sourceRef?: {
    metricKey: string;
    /** Geographic level that answered: zip, city, metro, state, country. */
    scope: string;
    dataStatus: DataStatus;
    sourceId: string;
    sourceName: string;
    /** The period the price describes, not when we fetched it. */
    effectiveDate: string;
  };
  optional?: boolean;
  note?: string;
}

export interface Assumption {
  label: string;
  value: string;
  note?: string;
  /** True when the user did not supply this and the engine chose a default. */
  assumed?: boolean;
}

export type GeoLevel = "zip" | "city" | "metro" | "state" | "country" | "global";

export interface GeoResolution {
  zip: string;
  zipRecord: ZipCode | null;
  city: City | null;
  state: State | null;
  /** The finest level at which we actually found pricing for this location. */
  bestLevel: GeoLevel;
  label: string;
  /** True when we could not place the ZIP at all and fell back to national. */
  isFallback: boolean;
}

export interface ConfidenceBreakdown {
  key: string;
  label: string;
  earned: number;
  max: number;
  detail: string;
}

export interface ConfidenceResult {
  score: number;
  band: "High" | "Moderate" | "Limited" | "Indicative";
  breakdown: ConfidenceBreakdown[];
  caveats: string[];
}

/** One row of the "what is this estimate built on" summary. */
export interface ProvenanceEntry {
  sourceId: string;
  sourceName: string;
  dataStatus: DataStatus;
  /** Finest geographic level this source answered at. */
  scope: string;
  /** Oldest period any of its prices describes. */
  oldestEffectiveDate: string;
  /** Share of the estimate's direct cost this source priced, 0-1. */
  shareOfCost: number;
  lineItemCount: number;
}

export interface FreshnessInfo {
  /** Oldest input feeding the estimate. This is what it is honestly dated to. */
  effectiveDate: string;
  /** Newest input, shown for transparency about the spread of data ages. */
  newestEffectiveDate: string;
  collectedDate: string;
  label: string;
  containsSampleData: boolean;
  monthsOld: number;
}

export interface EstimateResult {
  engineVersion: string;
  serviceId: string;
  serviceSlug: string;
  currency: string;
  range: PriceTriple;
  midpoint: number;
  /** Unit economics - the number contractors actually think in. */
  perSquare: PriceTriple;
  lineItems: LineItem[];
  subtotals: { component: CostComponent; label: string; low: number; typical: number; high: number }[];
  directCost: PriceTriple;
  /** Naive sum of every line item's bounds. Always wider than `directCost`. */
  directCostStraightSum: PriceTriple;
  overheadAndProfit: PriceTriple;
  assumptions: Assumption[];
  /** What the estimate is built on, biggest contributor first. */
  provenance: ProvenanceEntry[];
  derived: Record<string, number | string>;
  confidence: ConfidenceResult;
  geo: GeoResolution;
  freshness: FreshnessInfo;
  warnings: string[];
}

/** Everything an engine needs, resolved once per request. */
export interface EngineContext {
  service: Service;
  materials: Material[];
  projectTypes: ProjectType[];
  records: PricingRecord[];
  factors: PricingFactor[];
  geo: GeoResolution;
  now: Date;
  /** Source metadata, used by the confidence score. */
  sources?: import("@/lib/types").PricingSource[];
  /**
   * Published index series used to carry anchored prices forward. Optional, and
   * absent means prices are served exactly as anchored.
   */
  indexSeries?: import("@/lib/types").PriceIndexSeries[];
  indexPoints?: import("@/lib/types").PriceIndexPoint[];
}

export interface FormField {
  name: string;
  label: string;
  type: "number" | "select" | "toggle" | "text";
  options?: { value: string; label: string; hint?: string }[];
  /** Options come from reference data rather than being hardcoded in the form. */
  optionsFrom?: "materials" | "projectTypes";
  hint?: string;
  suffix?: string;
  min?: number;
  max?: number;
  /** Only show when this predicate over the current values passes. */
  showWhen?: (values: Record<string, unknown>) => boolean;
}

export interface FormStep {
  id: string;
  title: string;
  description: string;
  /** Advanced steps are collapsed by default - progressive disclosure. */
  advanced?: boolean;
  fields: FormField[];
}

export interface ServiceEngine<I = Record<string, unknown>> {
  key: string;
  version: string;
  steps: FormStep[];
  defaults(): I;
  parse(raw: unknown): { ok: true; value: I } | { ok: false; error: string };
  estimate(input: I, ctx: EngineContext): EstimateResult;
  /** Human label for a set of inputs, used in comparisons and page titles. */
  describe(input: I, ctx: EngineContext): string;
}
