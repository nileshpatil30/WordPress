import type { PricingRecord } from "@/lib/types";

/**
 * GENERATED FILE - do not edit by hand.
 *
 * Produced by scripts/ingest-materials.ts from observed material prices.
 * Re-run the ingester against a fresh collection to regenerate:
 *
 *   npm run ingest:materials -- --file <csv> --collected <YYYY-MM-DD> \
 *     --emit-seed lib/data/seed/materials.ts
 *
 * data_status is "modeled", not "verified": the observed price is real, and the
 * retail-to-trade conversion applied to it is our assumption. Each record's
 * methodology names the source, the URL, the observation date and the discount.
 */
export const MATERIALS_COLLECTED_DATE = "2026-09-04";

export const observedMaterialRecords: PricingRecord[] = [
  {
    "id": "pr-mat-asphalt-3tab-us",
    "serviceId": "svc-roofing",
    "component": "material",
    "materialId": "mat-asphalt-3tab",
    "metricKey": "material.per_square",
    "geoScopeType": "country",
    "geoScopeId": "us",
    "unit": "square",
    "lowPrice": 94.7,
    "medianPrice": 105.22,
    "highPrice": 115.74,
    "currency": "USD",
    "effectiveDate": "2026-09-04",
    "collectedDate": "2026-09-04",
    "sourceId": "src-observed-materials",
    "dataStatus": "modeled",
    "sampleSize": 3,
    "confidenceScore": 75,
    "methodology": "Home Depot (https://www.homedepot.com/p/GAF-Royal-Sovereign-Charcoal-Algae-Resistant-3-Tab-Roofing-Shingles-33-33-sq-ft-per-Bundle-26-Pieces-0201180/100040028 | https://www.homedepot.com/p/205655938 | https://www.homedepot.com/p/GAF-Royal-Sovereign-Weathered-Gray-Algae-Resistant-3-Tab-Roofing-Shingles-33-33-sq-ft-per-Bundle-26-Pieces-0202880/100046024), observed 2026-09-04. Observed at the retailer's publicly listed volume price - what a contractor buying enough for a job actually pays. That price already contains most of the gap between shelf and trade, so no further discount is applied. Range across 3 listings. Converted from 3 volume-priced listings: Home Depot GAF Royal Sovereign Charcoal at $35.07/unit buying 48+, covering 33.33 sq ft each; Home Depot Owens Corning Supreme Estate Gray 3-Tab at $35.07/unit buying 48+, covering 33.3 sq ft each; Home Depot GAF Royal Sovereign Weathered Gray at $35.07/unit buying 48+, covering 33.33 sq ft each. Those listings span 0.1%, which is too narrow to describe a market and they are all from one retailer, so the published band is a stated plus or minus 10% instead of the observed spread. More products, and ideally a second retailer or a distributor quote, would replace it with a real one."
  },
  {
    "id": "pr-mat-asphalt-architectural-us",
    "serviceId": "svc-roofing",
    "component": "material",
    "materialId": "mat-asphalt-architectural",
    "metricKey": "material.per_square",
    "geoScopeType": "country",
    "geoScopeId": "us",
    "unit": "square",
    "lowPrice": 104.42,
    "medianPrice": 116.02,
    "highPrice": 140.35,
    "currency": "USD",
    "effectiveDate": "2026-09-04",
    "collectedDate": "2026-09-04",
    "sourceId": "src-observed-materials",
    "dataStatus": "modeled",
    "sampleSize": 5,
    "confidenceScore": 75,
    "methodology": "Home Depot, Lowe's (https://www.homedepot.com/p/GAF-Timberline-HDZ-Weathered-Wood-Algae-Resistant-Laminated-High-Definition-Shingles-33-33-sq-ft-per-Bundle-0487900/309755323 | https://www.homedepot.com/p/GAF-Timberline-HDZ-Slate-Algae-Resistant-Laminated-High-Definition-Shingles-33-33-sq-ft-per-Bundle-0487750/309755283 | https://www.homedepot.com/p/Owens-Corning-Oakridge-Onyx-Black-Laminate-Architectural-Roofing-Shingles-32-8-sq-ft-Per-Bundle-HK01/205655927 | https://www.homedepot.com/p/Owens-Corning-Oakridge-Estate-Gray-Algae-Resistant-Laminate-Architectural-Roofing-Shingles-32-8-sq-ft-Per-Bundle-786355/206830644 | https://www.lowes.com/pd/GAF-Timberline-HDZ-33-33-Sq-Ft-Weathered-Wood-Laminated-Architectural-Roof-Shingles/1001327156), observed 2026-09-04. Observed at the retailer's publicly listed volume price - what a contractor buying enough for a job actually pays. That price already contains most of the gap between shelf and trade, so no further discount is applied. Range across 5 listings. Converted from 5 volume-priced listings: Home Depot GAF Timberline HDZ Weathered Wood at $38.67/unit buying 39+, covering 33.33 sq ft each; Home Depot GAF Timberline HDZ Slate at $38.67/unit buying 39+, covering 33.33 sq ft each; Home Depot Owens Corning Oakridge Onyx Black at $36.87/unit buying 39+, covering 32.8 sq ft each; Home Depot Owens Corning Oakridge Estate Gray at $36.87/unit buying 39+, covering 32.8 sq ft each; Lowe's GAF Timberline HDZ Weathered Wood (Lowe's) at $46.78/unit buying 36+, covering 33.33 sq ft each. The listings span 24.9% across 2 retailers, which is a real spread; the band is extended on the low side to a stated minimum of plus or minus 10% around the median, because the median does not sit in the middle of the observed prices."
  }
];
