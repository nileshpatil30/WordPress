import { NextResponse } from "next/server";

/**
 * Fixed-window rate limiter.
 *
 * IMPORTANT DEPLOYMENT CAVEAT: this counts in the memory of one process. Behind
 * several instances or on a serverless platform that spins up new workers, each
 * one keeps its own counter, so the effective limit is roughly
 * `limit x instances`. That is still far better than nothing - it stops a single
 * client hammering one worker - but it is not a security control.
 *
 * To make it one, swap `hit()` for a shared counter (Redis INCR with EXPIRE, or
 * a Postgres table keyed by bucket+window). The call sites do not change.
 */
interface Counter { count: number; resetAt: number }

const buckets = new Map<string, Counter>();
let lastSweep = Date.now();

/** Drop expired counters occasionally so the map cannot grow without bound. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, c] of buckets) if (c.resetAt <= now) buckets.delete(key);
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let counter = buckets.get(key);
  if (!counter || counter.resetAt <= now) {
    counter = { count: 0, resetAt: now + windowMs };
    buckets.set(key, counter);
  }
  counter.count++;

  const remaining = Math.max(0, limit - counter.count);
  return {
    ok: counter.count <= limit,
    limit,
    remaining,
    resetAt: counter.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((counter.resetAt - now) / 1000)),
  };
}

/**
 * Client identity for limiting purposes.
 *
 * Only forwarded headers set by the platform proxy are trusted, and only the
 * first hop. A client can spoof x-forwarded-for when the app is exposed
 * directly, so do not deploy this without a proxy in front that overwrites it.
 */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim()
    ?? req.headers.get("cf-connecting-ip")?.trim()
    ?? "unknown";
}

export const LIMITS = {
  estimate: { limit: 60, windowMs: 60_000 },
  quoteCheck: { limit: 30, windowMs: 60_000 },
  quoteCompare: { limit: 20, windowMs: 60_000 },
  events: { limit: 120, windowMs: 60_000 },
  geo: { limit: 120, windowMs: 60_000 },
  // Write endpoints that create moderation work or contain contact details are
  // limited per hour, not per minute.
  // Each upload costs real money to process, so it is the tightest limit here.
  extract: { limit: 10, windowMs: 60 * 60_000 },
  submissions: { limit: 5, windowMs: 60 * 60_000 },
  leads: { limit: 5, windowMs: 60 * 60_000 },
  partnerApi: { limit: 120, windowMs: 60_000 },
} as const;

/**
 * Returns a 429 response when the caller is over the limit, otherwise null.
 *
 *   const limited = enforceRateLimit(req, "estimate");
 *   if (limited) return limited;
 */
export function enforceRateLimit(
  req: Request, bucket: keyof typeof LIMITS, identity?: string,
): NextResponse | null {
  const { limit, windowMs } = LIMITS[bucket];
  const result = hit(`${bucket}:${identity ?? clientKey(req)}`, limit, windowMs);
  if (result.ok) return null;

  return NextResponse.json(
    {
      error: "Too many requests. Please slow down.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfterSeconds),
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.ceil(result.resetAt / 1000)),
      },
    });
}

/** Test hook. */
export function __resetRateLimits() { buckets.clear(); }
