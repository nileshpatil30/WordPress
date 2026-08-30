import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { bad, id } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Contractor matching intake.
 *
 * There is no contractor network yet, and this route does not pretend
 * otherwise: it records interest and returns an honest message. Wiring it to a
 * real partner is a deliberate later decision, not an accident of the code.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad("Invalid JSON body"); }

  if (body.consent !== true) return bad("Consent is required before we store your details", 422);

  const email = String(body.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad("Enter a valid email address", 422);

  const zip = String(body.zip ?? "");
  if (!/^\d{5}$/.test(zip)) return bad("A 5-digit ZIP code is required", 422);

  const contactName = String(body.contactName ?? "").trim().slice(0, 80);
  if (contactName.length < 2) return bad("Enter your name", 422);

  const store = await getStore();
  const service = await store.getServiceBySlug(String(body.serviceSlug ?? "roofing"));
  if (!service) return bad("Unknown service", 404);

  await store.saveLead({
    id: id("lead"),
    estimateRequestId: typeof body.estimateRequestId === "string" ? body.estimateRequestId : undefined,
    serviceId: service.id,
    zip,
    contactName,
    email,
    phone: typeof body.phone === "string" ? body.phone.slice(0, 32) : undefined,
    timeline: String(body.timeline ?? "unspecified").slice(0, 40),
    consentAt: new Date().toISOString(),
    status: "new",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    message:
      "Recorded. To be straight with you: we do not yet have a vetted contractor network, so nobody will call you today. We will be in touch when matching is live in your area, and we will not sell your details on.",
  });
}
