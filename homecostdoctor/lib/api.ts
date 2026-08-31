import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { buildEngineContext } from "@/lib/engine/context";
import { getEngine } from "@/lib/engine/registry";
import type { EngineContext, EstimateResult } from "@/lib/engine/types";

export function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Session ids are opaque client strings. Never trust them for authorisation. */
export function safeSessionId(raw: unknown): string {
  return typeof raw === "string" && /^[\w-]{1,64}$/.test(raw) ? raw : "anonymous";
}

const PII = /(@|\+?\d[\d\s().-]{7,})/;

/** Second line of defence: strip anything that looks like contact detail. */
export function scrubProperties(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string") {
      if (PII.test(v) || v.length > 120) continue;
      out[k] = v;
    } else if (typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
    }
  }
  return out;
}

export interface RunEstimateResult {
  estimate: EstimateResult;
  ctx: EngineContext;
  parsedInput: Record<string, unknown>;
}

/**
 * The one path that turns a request body into an estimate. Every tool -
 * calculator, quote checker, comparison, public API, city pages - goes through
 * here, so they can never drift apart.
 */
export async function runEstimate(body: {
  serviceSlug?: unknown; input?: unknown;
}): Promise<RunEstimateResult | { error: string; status: number }> {
  const serviceSlug = typeof body.serviceSlug === "string" ? body.serviceSlug : "roofing";
  const store = await getStore();
  const service = await store.getServiceBySlug(serviceSlug);
  if (!service) return { error: `Unknown service "${serviceSlug}"`, status: 404 };
  if (service.status !== "live") {
    return { error: `${service.name} is not live yet. Roofing is the only service currently modelled.`, status: 409 };
  }

  const engine = getEngine(service.engineKey);
  if (!engine) return { error: `No engine registered for "${service.engineKey}"`, status: 500 };

  const parsed = engine.parse(body.input);
  if (!parsed.ok) return { error: parsed.error, status: 422 };

  const zip = String((parsed.value as { zip: string }).zip);
  const ctx = await buildEngineContext(store, service.slug, zip);
  if (!ctx) return { error: "Could not build pricing context", status: 500 };

  try {
    const estimate = engine.estimate(parsed.value, ctx);
    return { estimate, ctx, parsedInput: parsed.value as Record<string, unknown> };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Estimation failed",
      status: 500,
    };
  }
}

export function isError(r: unknown): r is { error: string; status: number } {
  return !!r && typeof r === "object" && "error" in r;
}
