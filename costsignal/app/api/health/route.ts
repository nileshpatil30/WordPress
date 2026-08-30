import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment health and honesty check.
 *
 * Reports the storage driver, whether the database actually answers, whether
 * any admin account exists, and how much of the pricing data is still sample.
 * That last one is deliberately in a health check: shipping with sample prices
 * is the single most consequential state this application can be in, and it
 * should be visible to monitoring rather than only to someone reading a page.
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "geo");
  if (limited) return limited;

  const started = Date.now();
  try {
    const store = await getStore();
    const [services, records, admins] = await Promise.all([
      store.listServices({ liveOnly: true }),
      store.listPricingRecords("svc-roofing"),
      store.listAdminUsers(),
    ]);

    const sample = records.filter((r) => r.dataStatus === "sample").length;
    const oldest = records.map((r) => r.effectiveDate).sort()[0] ?? null;

    const warnings: string[] = [];
    if (store.driver === "json") {
      warnings.push("Using the JSON file store. Writes are lost on a read-only filesystem.");
    }
    if (!admins.length) warnings.push("No admin accounts exist. Run: npm run admin:create");
    if (sample > 0) {
      warnings.push(`${sample} of ${records.length} price rows are sample data; confidence is capped at 60.`);
    }

    return NextResponse.json({
      status: warnings.length ? "degraded" : "ok",
      driver: store.driver,
      liveServices: services.map((s) => s.slug),
      pricing: { total: records.length, sample, oldestEffectiveDate: oldest },
      adminAccounts: admins.length,
      warnings,
      responseMs: Date.now() - started,
    }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      message: err instanceof Error ? err.message : "unknown error",
      responseMs: Date.now() - started,
    }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
