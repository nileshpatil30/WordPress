import { seedDataset } from "@/lib/data/seed";
import { getEngine } from "./registry";
import type { EngineContext, EstimateResult, GeoResolution } from "./types";

/**
 * Run the pricing engine in the browser, with no server call.
 *
 * The engine is pure computation over reference data: geometry, unit prices,
 * factors and a geographic lookup. None of that needs a server, and the seed
 * dataset is about 30 KB gzipped - smaller than the round trip it replaces.
 *
 * Two things follow from that, and they are why this exists rather than being
 * a fallback:
 *
 *   1. The estimate becomes instant. No network, no spinner, no failure mode
 *      where a slow connection looks like a broken calculator.
 *   2. The site can be deployed as static files to any host, including shared
 *      hosting with no Node runtime at all.
 *
 * What is lost is the demand logging the API route does - which ZIP codes
 * people ask about. That is genuinely useful for deciding which city to add
 * next, so a static deployment gives it up, and `/api/estimate` still exists
 * for deployments that can run a server.
 *
 * Identical maths either way: both paths call the same `engine.estimate`.
 */

function resolveGeoLocal(zip: string): GeoResolution {
  const zipRecord = seedDataset.zipCodes.find((z) => z.code === zip) ?? null;
  const city = zipRecord
    ? seedDataset.cities.find((c) => c.id === zipRecord.cityId) ?? null
    : null;
  const state = city
    ? seedDataset.states.find((s) => s.id === city.stateId) ?? null
    : null;

  return {
    zip,
    zipRecord,
    city,
    state,
    // Replaced by the first price lookup that finds data, exactly as the
    // server-side resolver does.
    bestLevel: "country",
    label: city && state ? `${city.name}, ${state.code}` : "United States (national)",
    isFallback: !zipRecord,
  };
}

export function buildLocalContext(serviceSlug: string, zip: string, now = new Date()): EngineContext | null {
  const service = seedDataset.services.find((s) => s.slug === serviceSlug);
  if (!service || service.status !== "live") return null;

  return {
    service,
    materials: seedDataset.materials.filter((m) => m.serviceId === service.id),
    projectTypes: seedDataset.projectTypes.filter((p) => p.serviceId === service.id),
    records: seedDataset.pricingRecords.filter((r) => r.serviceId === service.id),
    factors: seedDataset.pricingFactors.filter((f) => f.serviceId === service.id),
    geo: resolveGeoLocal(zip),
    now,
    sources: seedDataset.pricingSources,
  };
}

export type LocalEstimate =
  | { ok: true; estimate: EstimateResult }
  | { ok: false; error: string };

/** Parse and price one request entirely client-side. */
export function estimateLocally(
  input: unknown, serviceSlug = "roofing",
): LocalEstimate {
  const service = seedDataset.services.find((s) => s.slug === serviceSlug);
  if (!service) return { ok: false, error: `Unknown service "${serviceSlug}"` };
  if (service.status !== "live") {
    return { ok: false, error: `${service.name} is not live yet. Roofing is the only service currently modelled.` };
  }

  const engine = getEngine(service.engineKey);
  if (!engine) return { ok: false, error: `No engine registered for "${service.engineKey}"` };

  const parsed = engine.parse(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const zip = String((parsed.value as { zip: string }).zip);
  const ctx = buildLocalContext(service.slug, zip);
  if (!ctx) return { ok: false, error: "Could not build pricing context" };

  try {
    return { ok: true, estimate: engine.estimate(parsed.value, ctx) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not produce an estimate" };
  }
}

// ---------------------------------------------------------------------------
// Quote checking and comparison, in the browser
//
// Same reasoning as the estimate above: both are pure functions of the
// estimate plus what the homeowner typed. The API routes additionally record
// the check for aggregate accuracy data, which a static deployment gives up.
// ---------------------------------------------------------------------------

import { assessQuote, compareQuotes, type QuoteInput, type ScopeKey } from "./quote";
import { buildQuestions, type ScopeState } from "./questions";
import { explainVariance } from "./roofing/explain";
import type { RoofingInput } from "./roofing/schema";

const numberOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export type LocalQuoteCheck =
  | { ok: true; estimate: EstimateResult; assessment: ReturnType<typeof assessQuote>;
      variance: ReturnType<typeof explainVariance> | null;
      questions: ReturnType<typeof buildQuestions> }
  | { ok: false; error: string };

export function checkQuoteLocally(body: {
  quotedPrice: unknown; input: unknown; extraction?: Record<string, unknown>;
  serviceSlug?: string;
}): LocalQuoteCheck {
  const quotedPrice = Number(body.quotedPrice);
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
    return { ok: false, error: "Enter the contractor's quoted total as a positive number" };
  }
  if (quotedPrice > 5_000_000) {
    return { ok: false, error: "That quote looks out of range for a residential roof" };
  }

  const slug = body.serviceSlug ?? "roofing";
  const service = seedDataset.services.find((s) => s.slug === slug);
  if (!service) return { ok: false, error: `Unknown service "${slug}"` };
  const engine = getEngine(service.engineKey);
  if (!engine) return { ok: false, error: `No engine registered for "${service.engineKey}"` };

  const parsed = engine.parse(body.input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const ctx = buildLocalContext(slug, String((parsed.value as { zip: string }).zip));
  if (!ctx) return { ok: false, error: "Could not build pricing context" };

  let estimate: EstimateResult;
  try {
    estimate = engine.estimate(parsed.value, ctx);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not produce an estimate" };
  }

  const assessment = assessQuote(quotedPrice, estimate);
  const variance = estimate.serviceSlug === "roofing"
    ? explainVariance(parsed.value as unknown as RoofingInput, ctx, quotedPrice, estimate)
    : null;

  const extraction = body.extraction ?? {};
  const questions = buildQuestions({
    estimate,
    scope: extraction.scope as Partial<Record<ScopeKey, ScopeState>> | undefined,
    exclusions: Array.isArray(extraction.exclusions)
      ? (extraction.exclusions as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 10)
      : undefined,
    redFlags: Array.isArray(extraction.redFlags)
      ? (extraction.redFlags as { issue: string; quotedText: string }[]).slice(0, 5)
      : undefined,
    warrantyWorkmanshipYears: numberOrNull(extraction.warrantyWorkmanshipYears),
    deckSheetsIncluded: numberOrNull(extraction.deckSheetsIncluded),
    measuredSquares: numberOrNull(extraction.measuredSquares),
    verdict: assessment.verdict,
  });

  return { ok: true, estimate, assessment, variance, questions };
}

export type LocalCompare =
  | { ok: true; estimate: EstimateResult; comparison: ReturnType<typeof compareQuotes> }
  | { ok: false; error: string };

export function compareQuotesLocally(body: {
  quotes: unknown; input: unknown; serviceSlug?: string;
}): LocalCompare {
  const raw = Array.isArray(body.quotes) ? body.quotes : [];
  if (raw.length < 2) return { ok: false, error: "Add at least two quotes to compare" };
  if (raw.length > 6) return { ok: false, error: "Compare up to six quotes at a time" };

  const est = estimateLocally(body.input, body.serviceSlug ?? "roofing");
  if (!est.ok) return { ok: false, error: est.error };

  const quotes: QuoteInput[] = raw.map((q, i) => {
    const item = q as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : `q${i}`,
      label: typeof item.label === "string" && item.label.trim()
        ? item.label.trim().slice(0, 60)
        : `Contractor ${String.fromCharCode(65 + i)}`,
      totalPrice: Number(item.totalPrice) || 0,
      materialSlug: typeof item.materialSlug === "string" ? item.materialSlug : undefined,
      warrantyWorkmanshipYears: Number.isFinite(Number(item.warrantyWorkmanshipYears))
        ? Number(item.warrantyWorkmanshipYears) : undefined,
      scope: (item.scope ?? {}) as Partial<Record<ScopeKey, boolean>>,
    };
  });

  return { ok: true, estimate: est.estimate, comparison: compareQuotes(quotes, est.estimate) };
}
