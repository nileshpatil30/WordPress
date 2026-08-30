import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { bad, id, safeSessionId } from "@/lib/api";
import { CONSENT_VERSION } from "@/lib/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * First-party data intake: what a homeowner actually paid.
 *
 * Deliberate constraints, because this is the dataset the whole business
 * eventually rests on and it has to be defensible:
 *   - no name, email, address or contractor name is accepted at all
 *   - the date is stored to the month, never the day
 *   - every row lands as `pending` and is useless until a human approves it
 *   - explicit consent, with a version string, is required
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad("Invalid JSON body"); }

  if (body.consent !== true) {
    return bad("We need your explicit consent before storing anything", 422);
  }

  const zip = String(body.zip ?? "");
  if (!/^\d{5}$/.test(zip)) return bad("A 5-digit ZIP code is required", 422);

  const amountPaid = Number(body.amountPaid);
  if (!Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid > 2_000_000) {
    return bad("Enter the amount you actually paid", 422);
  }

  const projectMonth = String(body.projectMonth ?? "");
  if (!/^\d{4}-\d{2}$/.test(projectMonth)) {
    return bad("Project month must be in YYYY-MM form", 422);
  }

  const store = await getStore();
  const service = await store.getServiceBySlug(String(body.serviceSlug ?? "roofing"));
  if (!service) return bad("Unknown service", 404);

  await store.saveActualProjectCost({
    id: id("apc"),
    serviceId: service.id,
    zip,
    projectMonth,
    amountPaid,
    materialId: typeof body.materialId === "string" ? body.materialId : undefined,
    roofAreaSqft: Number.isFinite(Number(body.roofAreaSqft)) ? Number(body.roofAreaSqft) : undefined,
    inputs: {
      stories: Number(body.stories) || undefined,
      pitch: typeof body.pitch === "string" ? body.pitch : undefined,
      complexity: typeof body.complexity === "string" ? body.complexity : undefined,
      tearOffLayers: Number(body.tearOffLayers) || undefined,
      quotesReceivedLow: Number(body.quotesReceivedLow) || undefined,
      quotesReceivedHigh: Number(body.quotesReceivedHigh) || undefined,
      sessionId: safeSessionId(body.sessionId),
    },
    quotesReceived: Number.isFinite(Number(body.quotesReceived)) ? Number(body.quotesReceived) : undefined,
    consentVersion: CONSENT_VERSION,
    status: "pending",
    submittedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    message:
      "Thank you. Your figures are queued for review. They will only ever be used in aggregate, and never in a way that identifies your property.",
  });
}
