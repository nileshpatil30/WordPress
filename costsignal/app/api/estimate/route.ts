import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { bad, id, isError, runEstimate, safeSessionId } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad("Invalid JSON body"); }

  const result = await runEstimate(body);
  if (isError(result)) return bad(result.error, result.status);

  const { estimate, parsedInput } = result;
  const store = await getStore();

  // Capture demand signal. This is what tells us which city to add next, and
  // it is deliberately free of anything identifying.
  await store.saveEstimateRequest({
    id: id("est"),
    sessionId: safeSessionId(body.sessionId),
    serviceId: estimate.serviceId,
    zip: String(parsedInput.zip),
    cityId: estimate.geo.city?.id,
    inputs: parsedInput,
    estimateLow: estimate.range.low,
    estimateTypical: estimate.range.typical,
    estimateHigh: estimate.range.high,
    confidence: estimate.confidence.score,
    engineVersion: estimate.engineVersion,
    path: typeof body.path === "string" ? body.path.slice(0, 200) : undefined,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ estimate });
}
