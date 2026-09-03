import type { PriceIndexPoint, PriceIndexSeries } from "@/lib/types";

/**
 * GENERATED FILE - do not edit by hand.
 *
 * Produced by scripts/ingest-ppi.ts from the BLS Producer Price Index.
 * Re-run against a fresh download to regenerate:
 *
 *   npm run ingest:ppi -- --series WPU1361 --fetch \
 *     --emit-seed lib/data/seed/ppi.ts
 *
 * data_status is "verified" - and this is the only pricing data in the project
 * that is, apart from the exact pitch geometry. An index point is a US federal
 * statistic transcribed unchanged, with no modelling of ours in between. What we
 * DERIVE from it (see lib/escalation.ts) is modelled again.
 *
 * The index measures producer price movement. It carries an anchored price
 * forward; it is not itself a price.
 */
export const PPI_SERIES_KEY = "WPU1361";
export const PPI_LATEST_PERIOD = "2026-07-01";

export const ppiSeries: PriceIndexSeries = {
  "id": "pis-wpu1361",
  "seriesKey": "WPU1361",
  "name": "PPI: prepared asphalt and tar roofing and siding products",
  "geoScopeType": "country",
  "geoScopeId": "us",
  "sourceId": "src-bls-ppi",
  "unit": "index (1982=100)",
  "dataStatus": "verified",
  "appliesTo": [
    "material"
  ],
  "methodology": "PPI: prepared asphalt and tar roofing and siding products, series WPU1361, as published. 31 monthly readings from 2024-01-01 to 2026-07-01. Values are transcribed unchanged; the index measures producer price movement, not a retail or installed price."
};

export const ppiPoints: PriceIndexPoint[] = [
  {
    "id": "pip-wpu1361-2024-01",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-01-01",
    "value": 345.616
  },
  {
    "id": "pip-wpu1361-2024-02",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-02-01",
    "value": 349.485
  },
  {
    "id": "pip-wpu1361-2024-03",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-03-01",
    "value": 349.873
  },
  {
    "id": "pip-wpu1361-2024-04",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-04-01",
    "value": 342.543
  },
  {
    "id": "pip-wpu1361-2024-05",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-05-01",
    "value": 351.859
  },
  {
    "id": "pip-wpu1361-2024-06",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-06-01",
    "value": 349.495
  },
  {
    "id": "pip-wpu1361-2024-07",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-07-01",
    "value": 350.861
  },
  {
    "id": "pip-wpu1361-2024-08",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-08-01",
    "value": 346.495
  },
  {
    "id": "pip-wpu1361-2024-09",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-09-01",
    "value": 349.7
  },
  {
    "id": "pip-wpu1361-2024-10",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-10-01",
    "value": 358.55
  },
  {
    "id": "pip-wpu1361-2024-11",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-11-01",
    "value": 352.975
  },
  {
    "id": "pip-wpu1361-2024-12",
    "seriesId": "pis-wpu1361",
    "periodStart": "2024-12-01",
    "value": 352.495
  },
  {
    "id": "pip-wpu1361-2025-01",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-01-01",
    "value": 351.626,
    "pctChangeYoy": 1.7
  },
  {
    "id": "pip-wpu1361-2025-02",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-02-01",
    "value": 348.518,
    "pctChangeYoy": -0.3
  },
  {
    "id": "pip-wpu1361-2025-03",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-03-01",
    "value": 347.865,
    "pctChangeYoy": -0.6
  },
  {
    "id": "pip-wpu1361-2025-04",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-04-01",
    "value": 345.02,
    "pctChangeYoy": 0.7
  },
  {
    "id": "pip-wpu1361-2025-05",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-05-01",
    "value": 357.967,
    "pctChangeYoy": 1.7
  },
  {
    "id": "pip-wpu1361-2025-06",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-06-01",
    "value": 359.639,
    "pctChangeYoy": 2.9
  },
  {
    "id": "pip-wpu1361-2025-07",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-07-01",
    "value": 359.364,
    "pctChangeYoy": 2.4
  },
  {
    "id": "pip-wpu1361-2025-08",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-08-01",
    "value": 360.038,
    "pctChangeYoy": 3.9
  },
  {
    "id": "pip-wpu1361-2025-09",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-09-01",
    "value": 356.618,
    "pctChangeYoy": 2
  },
  {
    "id": "pip-wpu1361-2025-10",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-10-01",
    "value": 357.814,
    "pctChangeYoy": -0.2
  },
  {
    "id": "pip-wpu1361-2025-11",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-11-01",
    "value": 357.916,
    "pctChangeYoy": 1.4
  },
  {
    "id": "pip-wpu1361-2025-12",
    "seriesId": "pis-wpu1361",
    "periodStart": "2025-12-01",
    "value": 354.925,
    "pctChangeYoy": 0.7
  },
  {
    "id": "pip-wpu1361-2026-01",
    "seriesId": "pis-wpu1361",
    "periodStart": "2026-01-01",
    "value": 347.005,
    "pctChangeYoy": -1.3
  },
  {
    "id": "pip-wpu1361-2026-02",
    "seriesId": "pis-wpu1361",
    "periodStart": "2026-02-01",
    "value": 352.546,
    "pctChangeYoy": 1.2
  },
  {
    "id": "pip-wpu1361-2026-03",
    "seriesId": "pis-wpu1361",
    "periodStart": "2026-03-01",
    "value": 346.394,
    "pctChangeYoy": -0.4
  },
  {
    "id": "pip-wpu1361-2026-04",
    "seriesId": "pis-wpu1361",
    "periodStart": "2026-04-01",
    "value": 347.632,
    "pctChangeYoy": 0.8
  },
  {
    "id": "pip-wpu1361-2026-05",
    "seriesId": "pis-wpu1361",
    "periodStart": "2026-05-01",
    "value": 354.678,
    "pctChangeYoy": -0.9
  },
  {
    "id": "pip-wpu1361-2026-06",
    "seriesId": "pis-wpu1361",
    "periodStart": "2026-06-01",
    "value": 367.585,
    "pctChangeYoy": 2.2
  },
  {
    "id": "pip-wpu1361-2026-07",
    "seriesId": "pis-wpu1361",
    "periodStart": "2026-07-01",
    "value": 372.301,
    "pctChangeYoy": 3.6
  }
];
