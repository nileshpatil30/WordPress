import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { EVENTS } from "@/lib/events";
import { id, safeSessionId, scrubProperties } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set<string>(EVENTS);

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "events");
  if (limited) return limited;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const eventName = String(body.eventName ?? "");
  // Allow-list only. An open event endpoint becomes a junk drawer within weeks.
  if (!ALLOWED.has(eventName)) return NextResponse.json({ ok: false }, { status: 422 });

  const store = await getStore();
  await store.saveEvent({
    id: id("ev"),
    sessionId: safeSessionId(body.sessionId),
    eventName,
    properties: scrubProperties(body.properties),
    path: typeof body.path === "string" ? body.path.slice(0, 200) : undefined,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
