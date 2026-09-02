import type { DataStore } from "@/lib/data/store";
import { resolveGeo } from "./geo";
import type { EngineContext } from "./types";

/**
 * Assemble everything an engine needs for one request: the service, its
 * catalogue, its pricing rows and factors, and the resolved geography.
 */
export async function buildEngineContext(
  store: DataStore, serviceSlug: string, zip: string, now = new Date(),
): Promise<EngineContext | null> {
  const service = await store.getServiceBySlug(serviceSlug);
  if (!service || service.status !== "live") return null;

  const [materials, projectTypes, records, factors, geo, sources, indexSeries] =
    await Promise.all([
      store.listMaterials(service.id),
      store.listProjectTypes(service.id),
      store.listPricingRecords(service.id),
      store.listPricingFactors(service.id),
      resolveGeo(store, zip),
      store.listPricingSources(),
      store.listIndexSeries(),
    ]);

  // Points are per series, and there are few series, so this stays one round
  // trip per series rather than a join we would have to maintain.
  const indexPoints = (await Promise.all(
    indexSeries.map((s) => store.listIndexPoints(s.id)))).flat();

  return {
    service, materials, projectTypes, records, factors, geo, now, sources,
    indexSeries, indexPoints,
  };
}
