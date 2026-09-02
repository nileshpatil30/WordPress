import { NextResponse } from "next/server";
import { bad, isError, runEstimate } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public API, key-gated.
 *
 * This exists so the B2B path (contractor tools, embedded widgets, partner
 * integrations) is a configuration change rather than a rewrite. Keys are read
 * from PARTNER_API_KEYS for now; swap for the api_keys table when there are
 * real partners.
 *
 *   GET /api/v1/estimate?zip=85018&roofAreaSqft=2000&material=asphalt-architectural
 */
function authorised(req: Request): boolean {
  const configured = (process.env.PARTNER_API_KEYS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!configured.length) return false;
  const key = req.headers.get("x-api-key") ?? "";
  return configured.includes(key);
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json(
      { error: "Missing or invalid API key. Set PARTNER_API_KEYS and send x-api-key." },
      { status: 401 });
  }

  // Limited per API key rather than per IP: a partner behind one NAT should
  // not be throttled by another partner's traffic.
  const limited = enforceRateLimit(req, "partnerApi", req.headers.get("x-api-key") ?? undefined);
  if (limited) return limited;

  const url = new URL(req.url);
  const p = url.searchParams;
  const numberOr = (k: string) => (p.has(k) ? Number(p.get(k)) : undefined);

  const input: Record<string, unknown> = {
    zip: p.get("zip") ?? "",
    areaMode: p.has("roofAreaSqft") ? "roof" : "house",
    roofAreaSqft: numberOr("roofAreaSqft"),
    houseSqft: numberOr("houseSqft"),
    stories: numberOr("stories") ?? 1,
    material: p.get("material") ?? undefined,
    pitch: p.get("pitch") ?? undefined,
    complexity: p.get("complexity") ?? undefined,
    existingLayers: numberOr("existingLayers"),
  };
  for (const k of Object.keys(input)) if (input[k] === undefined) delete input[k];

  const result = await runEstimate({ serviceSlug: p.get("service") ?? "roofing", input });
  if (isError(result)) return bad(result.error, result.status);

  const { estimate } = result;
  return NextResponse.json({
    range: estimate.range,
    midpoint: estimate.midpoint,
    perSquare: estimate.perSquare,
    currency: estimate.currency,
    confidence: { score: estimate.confidence.score, band: estimate.confidence.band },
    breakdown: estimate.subtotals,
    geo: { zip: estimate.geo.zip, label: estimate.geo.label, resolvedAt: estimate.geo.bestLevel },
    dataFreshness: estimate.freshness,
    engineVersion: estimate.engineVersion,
    disclaimer:
      "Modelled range, not a quote. Actual prices vary by contractor, site conditions and local requirements.",
  }, { headers: { "cache-control": "public, max-age=300" } });
}
