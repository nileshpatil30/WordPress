import { createHmac, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getStore } from "@/lib/data/store";
import type { AdminRole, AdminUser } from "@/lib/types";

const scrypt = promisify(scryptCb) as (
  password: string, salt: Buffer, keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// scrypt needs roughly 128 * N * r bytes. Node caps allocation at 32 MB by
// default, which N = 2^15 sits exactly on, so the limit is raised explicitly
// rather than by weakening the parameters.
const MAXMEM = 96 * 1024 * 1024;

const COOKIE = "cs_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

// Deliberately expensive. These are the parameters, stored alongside the hash,
// so they can be raised later without invalidating existing passwords.
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 32 };

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_SESSION_SECRET must be set to at least 16 characters in production.");
    }
    return "insecure-development-secret";
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, { ...SCRYPT, maxmem: MAXMEM });
  return [
    "scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p,
    salt.toString("base64"), hash.toString("base64"),
  ].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, saltB64, hashB64] = parts;

  let expected: Buffer;
  try {
    expected = Buffer.from(hashB64, "base64");
  } catch { return false; }

  const candidate = await scrypt(
    password, Buffer.from(saltB64, "base64"), expected.length,
    { N: Number(N), r: Number(r), p: Number(p), maxmem: MAXMEM });

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** Minimum bar for a password that can rewrite every price on the site. */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return "Mix upper and lower case.";
  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return "Include a number or a symbol.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function issueToken(userId: string) {
  const payload = `${userId}:${Date.now() + MAX_AGE_SECONDS * 1000}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): { userId: string } | null {
  if (!token) return null;
  const [encoded, mac] = token.split(".");
  if (!encoded || !mac) return null;

  let payload: string;
  try { payload = Buffer.from(encoded, "base64url").toString("utf8"); }
  catch { return null; }

  const a = Buffer.from(mac);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [userId, expiresRaw] = payload.split(":");
  if (!userId || Number(expiresRaw) < Date.now()) return null;
  return { userId };
}

export interface AdminSession {
  id: string;
  email: string;
  role: AdminRole;
}

/**
 * The signed-in administrator, or null.
 *
 * The role is read from the database on every request rather than baked into
 * the cookie, so revoking or downgrading an account takes effect immediately
 * instead of when their session happens to expire.
 */
export async function currentAdmin(): Promise<AdminSession | null> {
  const jar = await cookies();
  const claim = verifyToken(jar.get(COOKIE)?.value);
  if (!claim) return null;

  const store = await getStore();
  const user = await store.getAdminUserById(claim.userId);
  if (!user || user.disabledAt) return null;

  return { id: user.id, email: user.email, role: user.role };
}

const RANK: Record<AdminRole, number> = { viewer: 0, editor: 1, owner: 2 };

export function hasRole(session: AdminSession | null, minimum: AdminRole): boolean {
  return !!session && RANK[session.role] >= RANK[minimum];
}

/**
 * Authenticate. Returns null on any failure without saying which - an error
 * that distinguishes "no such account" from "wrong password" enumerates users.
 */
export async function authenticate(email: string, password: string): Promise<AdminUser | null> {
  const store = await getStore();
  const user = await store.getAdminUserByEmail(email);

  if (!user || user.disabledAt) {
    // Spend comparable time regardless, so timing does not reveal existence.
    await hashPassword(password).catch(() => undefined);
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}

export async function newAdminUser(
  email: string, password: string, role: AdminRole,
): Promise<AdminUser> {
  return {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_MAX_AGE = MAX_AGE_SECONDS;
