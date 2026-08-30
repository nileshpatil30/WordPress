import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin access for Phase 1: a single shared password, exchanged for an HMAC
 * signed cookie. There is no user table yet.
 *
 * This is explicitly NOT production auth. Before launch, replace with real
 * accounts, per-user roles and audit attribution by user id. The audit log
 * already records an `actor` string, so that swap is contained.
 */
const COOKIE = "cs_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? "insecure-development-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function issueToken(actor: string) {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${actor}:${expires}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): { actor: string } | null {
  if (!token) return null;
  const [encoded, mac] = token.split(".");
  if (!encoded || !mac) return null;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch { return null; }

  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [actor, expiresRaw] = payload.split(":");
  if (!actor || Number(expiresRaw) < Date.now()) return null;
  return { actor };
}

export function checkPassword(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function currentAdmin(): Promise<{ actor: string } | null> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_MAX_AGE = MAX_AGE_SECONDS;
