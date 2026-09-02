import type { PricingFactor, PricingRecord } from "@/lib/types";
import { resolveFactor } from "./factors";

/**
 * Turn observed material prices into pricing records.
 *
 * Pure transform, no I/O, so it is testable without a network or a filesystem.
 * Mirrors lib/ingest/bls-oews.ts deliberately: same shape, same discipline.
 *
 * ---------------------------------------------------------------------------
 * The thing this exists to get right: retail price is not contractor cost
 * ---------------------------------------------------------------------------
 *
 * A homeowner sees $42 a bundle on a shelf. A roofing contractor buying the
 * same product from a distributor - ABC Supply, Beacon, SRS - pays materially
 * less, because they buy by the pallet on trade terms. Feeding shelf prices
 * straight into a cost model produces estimates that are too HIGH, which is the
 * mirror image of the error the big cost guides are known for and just as
 * useless to the person reading it.
 *
 * So an observation is recorded with the channel it came from, and a documented
 * trade-discount factor converts retail to the contractor's likely cost. The
 * factor is a modelled assumption, it lives in pricing_factors where it can be
 * retuned without a deploy, and it is named in every methodology string it
 * touches. That is the difference between an assumption and a fudge.
 *
 * Records land as `dataStatus: "modeled"`, never "verified": the observation is
 * real, the conversion to a contractor's cost is ours.
 */

export type PriceChannel = "retail" | "trade" | "benchmark";

/** One observed price, as collected. Nothing here is derived. */
export interface MaterialObservation {
  /** Catalogue slug this prices, e.g. "asphalt-architectural". */
  materialSlug: string;
  /** Metric it feeds, e.g. "material.per_square". */
  metricKey: string;
  unit: string;
  /**
   * Where the number came from.
   *   retail    - a shelf or listed consumer price
   *   trade     - a distributor or contractor-channel price
   *   benchmark - a published cost range from a third party, used for
   *               comparison rather than as our own observation
   */
  channel: PriceChannel;
  low: number;
  median: number;
  high: number;
  /** Human-readable source, recorded verbatim. */
  sourceName: string;
  /** URL or citation, so any row can be traced back. */
  sourceRef: string;
  /** The date the price was observed, not the date it was ingested. */
  observedDate: string;
  /** Geographic scope of the observation. National unless stated. */
  geoScopeType?: "country" | "state" | "metro" | "city";
  geoScopeId?: string;
  /** How many distinct listings or quotes the range came from. */
  sampleSize?: number;
  notes?: string;
}

export interface MaterialIngestResult {
  records: PricingRecord[];
  /** Rows we refused, and why. Surfaced rather than silently dropped. */
  rejected: { observation: MaterialObservation; reason: string }[];
  /** Applied trade discount per channel, for the run report. */
  discountsApplied: Record<string, number>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A benchmark is somebody else's published range. It is legitimate evidence
 * that our number is in the right area, and it is not legitimate as our own
 * data - we did not observe it and we have no rights to redistribute it as a
 * dataset. So benchmarks are ingested for comparison and never become priced
 * records.
 */
export function transformMaterialObservations(opts: {
  observations: MaterialObservation[];
  factors: PricingFactor[];
  serviceId: string;
  /** Ingest date, distinct from every observation date. */
  collectedDate: string;
  /** Existing material slugs; anything else is a typo, not a new product. */
  knownMaterialSlugs: string[];
}): MaterialIngestResult {
  const records: PricingRecord[] = [];
  const rejected: MaterialIngestResult["rejected"] = [];
  const discountsApplied: Record<string, number> = {};
  const known = new Set(opts.knownMaterialSlugs);

  for (const o of opts.observations) {
    if (o.channel === "benchmark") {
      rejected.push({
        observation: o,
        reason: "benchmark - kept for comparison, never used as our own priced record",
      });
      continue;
    }
    if (!known.has(o.materialSlug)) {
      rejected.push({ observation: o, reason: `unknown material slug "${o.materialSlug}"` });
      continue;
    }
    if (!(o.low > 0 && o.median > 0 && o.high > 0)) {
      rejected.push({ observation: o, reason: "prices must all be positive" });
      continue;
    }
    if (!(o.low <= o.median && o.median <= o.high)) {
      rejected.push({ observation: o, reason: `range out of order: ${o.low}/${o.median}/${o.high}` });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.observedDate)) {
      rejected.push({ observation: o, reason: `observedDate must be YYYY-MM-DD, got "${o.observedDate}"` });
      continue;
    }

    const scopeType = o.geoScopeType ?? "country";
    const scopeId = o.geoScopeId ?? "us";

    // Retail needs converting to what a contractor actually pays. Trade prices
    // are already in the right channel and pass through at 1.0.
    const discount = o.channel === "retail"
      ? resolveFactor(opts.factors, "material.trade_discount", {
        stateId: scopeType === "state" ? scopeId : undefined,
        countryId: "us",
      })?.multiplier ?? 0.78
      : 1;
    discountsApplied[o.channel] = discount;

    const channelNote = o.channel === "retail"
      ? `Observed retail price, multiplied by a trade discount factor of ${discount} to approximate what a roofing contractor pays a distributor for the same product. Retail shelf pricing overstates contractor material cost; that factor is our modelled assumption and is editable in pricing_factors.`
      : "Observed in the contractor supply channel, so no retail-to-trade conversion is applied.";

    records.push({
      id: `pr-mat-${o.materialSlug}-${scopeId}`,
      serviceId: opts.serviceId,
      component: "material",
      metricKey: o.metricKey,
      geoScopeType: scopeType,
      geoScopeId: scopeId,
      unit: o.unit,
      lowPrice: round2(o.low * discount),
      medianPrice: round2(o.median * discount),
      highPrice: round2(o.high * discount),
      currency: "USD",
      effectiveDate: o.observedDate,
      collectedDate: opts.collectedDate,
      sourceId: "src-observed-materials",
      dataStatus: "modeled",
      sampleSize: o.sampleSize,
      // Observed input, modelled conversion. Not as strong as a published
      // government series, considerably stronger than a placeholder.
      confidenceScore: o.channel === "trade" ? 80 : 70,
      methodology: [
        `${o.sourceName} (${o.sourceRef}), observed ${o.observedDate}.`,
        channelNote,
        o.sampleSize ? `Range across ${o.sampleSize} listings.` : null,
        o.notes,
      ].filter(Boolean).join(" "),
    });
  }

  return { records, rejected, discountsApplied };
}
