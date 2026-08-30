import { z } from "zod";
import type { EngineContext, EstimateResult, ServiceEngine } from "./types";
import { roofingInputSchema, roofingSteps, type RoofingInput } from "./roofing/schema";
import { estimateRoofing, ROOFING_ENGINE_VERSION } from "./roofing/model";
import type { PricingSource } from "@/lib/types";

/**
 * Service engine registry.
 *
 * To add a service: implement this interface in lib/engine/<key>/, register it
 * below, and add the matching rows to services/materials/pricing_*. Routing,
 * pages, the calculator UI and the quote tools are all driven from the registry
 * and the service's declared steps, so none of them need to change.
 */
const roofingEngine: ServiceEngine<RoofingInput> = {
  key: "roofing",
  version: ROOFING_ENGINE_VERSION,
  steps: roofingSteps,
  defaults: () => roofingInputSchema.parse({ zip: "00000" }),
  parse(raw) {
    const result = roofingInputSchema.safeParse(raw);
    if (!result.success) {
      const first = result.error.issues[0];
      return { ok: false, error: `${first.path.join(".") || "input"}: ${first.message}` };
    }
    // Remember which keys the caller actually supplied - the confidence score
    // rewards detail, so it has to know the difference between "chosen" and
    // "defaulted".
    const providedFields = raw && typeof raw === "object"
      ? Object.keys(raw as Record<string, unknown>).filter(
        (k) => (raw as Record<string, unknown>)[k] !== undefined && (raw as Record<string, unknown>)[k] !== "")
      : [];
    return { ok: true, value: { ...result.data, providedFields } };
  },
  estimate: (input, ctx) => estimateRoofing(input, ctx, ctx.sources ?? []),
  describe(input, ctx) {
    const m = ctx.materials.find((x) => x.slug === input.material);
    const area = input.areaMode === "roof" && input.roofAreaSqft
      ? `${input.roofAreaSqft.toLocaleString()} sq ft roof`
      : `${(input.houseSqft ?? 2000).toLocaleString()} sq ft home`;
    return `${area}, ${m?.name.toLowerCase() ?? input.material}, ${input.stories} storey`;
  },
};

const engines: Record<string, ServiceEngine<never>> = {
  roofing: roofingEngine as unknown as ServiceEngine<never>,
};

export function getEngine(key: string): ServiceEngine<never> | null {
  return engines[key] ?? null;
}

export function listEngineKeys(): string[] {
  return Object.keys(engines);
}

export type AnyEngine = ServiceEngine<never>;
export type { EngineContext, EstimateResult };
export { z };
