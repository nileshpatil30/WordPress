import { beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimits, clientKey, enforceRateLimit, hit, LIMITS } from "@/lib/rate-limit";
import {
  hashPassword, hasRole, issueToken, passwordProblem, verifyPassword, verifyToken,
} from "@/lib/auth";
import type { AdminSession } from "@/lib/auth";

describe("rate limiting", () => {
  beforeEach(() => __resetRateLimits());

  it("allows up to the limit and refuses beyond it", () => {
    for (let i = 0; i < 5; i++) expect(hit("k", 5, 60_000).ok).toBe(true);
    expect(hit("k", 5, 60_000).ok).toBe(false);
  });

  it("counts each key separately", () => {
    for (let i = 0; i < 5; i++) hit("a", 5, 60_000);
    expect(hit("a", 5, 60_000).ok).toBe(false);
    expect(hit("b", 5, 60_000).ok).toBe(true);
  });

  it("resets after the window", () => {
    for (let i = 0; i < 3; i++) hit("w", 3, 1);
    expect(hit("w", 3, 1).ok).toBe(false);
    return new Promise<void>((resolve) => setTimeout(() => {
      expect(hit("w", 3, 1).ok).toBe(true);
      resolve();
    }, 5));
  });

  it("returns 429 with Retry-After once over the limit", () => {
    const req = new Request("https://example.com/api/estimate", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    for (let i = 0; i < LIMITS.estimate.limit; i++) {
      expect(enforceRateLimit(req, "estimate")).toBeNull();
    }
    const blocked = enforceRateLimit(req, "estimate");
    expect(blocked?.status).toBe(429);
    expect(Number(blocked?.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("limits the write endpoints far harder than the read ones", () => {
    expect(LIMITS.submissions.limit).toBeLessThan(LIMITS.estimate.limit);
    expect(LIMITS.leads.limit).toBeLessThan(LIMITS.estimate.limit);
    expect(LIMITS.submissions.windowMs).toBeGreaterThan(LIMITS.estimate.windowMs);
  });

  it("takes only the first forwarded hop as the client identity", () => {
    const req = new Request("https://example.com/", {
      headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1, 10.0.0.2" },
    });
    expect(clientKey(req)).toBe("198.51.100.7");
  });
});

describe("password hashing", () => {
  it("round-trips a password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("Correct horse battery", hash)).toBe(false);
  });

  it("stores scrypt parameters with the hash and never the password", async () => {
    const hash = await hashPassword("some-long-password-1");
    const [algo, N, r, p] = hash.split(":");
    expect(algo).toBe("scrypt");
    expect(Number(N)).toBeGreaterThanOrEqual(2 ** 15);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
    expect(hash).not.toContain("some-long-password-1");
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("identical-password-1");
    const b = await hashPassword("identical-password-1");
    expect(a).not.toBe(b);
    expect(await verifyPassword("identical-password-1", a)).toBe(true);
    expect(await verifyPassword("identical-password-1", b)).toBe(true);
  });

  it("rejects a malformed or truncated hash rather than throwing", async () => {
    for (const bad of ["", "scrypt:bad", "notscrypt:1:2:3:a:b", "scrypt:32768:8:1:onlyfive"]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });

  it("enforces a minimum password strength", () => {
    expect(passwordProblem("short")).toBeTruthy();
    expect(passwordProblem("alllowercaseletters")).toBeTruthy();
    expect(passwordProblem("NoDigitsOrSymbols")).toBeTruthy();
    expect(passwordProblem("A-really-solid-1")).toBeNull();
  });
});

describe("session tokens", () => {
  it("round-trips a user id", () => {
    expect(verifyToken(issueToken("user-123"))?.userId).toBe("user-123");
  });

  it("rejects a tampered payload", () => {
    const token = issueToken("user-123");
    const [payload, mac] = token.split(".");
    const forged = `${Buffer.from("user-999:" + (Date.now() + 100000)).toString("base64url")}.${mac}`;
    expect(verifyToken(forged)).toBeNull();
    expect(verifyToken(`${payload}.deadbeef`)).toBeNull();
  });

  it("rejects malformed and empty tokens", () => {
    for (const bad of [undefined, "", "nodot", "a.b.c.d"]) {
      expect(verifyToken(bad as string | undefined)).toBeNull();
    }
  });

  it("rejects an expired token", () => {
    // Signed with the same secret but already past its expiry.
    const payload = `user-1:${Date.now() - 1000}`;
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const mac = createHmac("sha256", "insecure-development-secret").update(payload).digest("hex");
    const token = `${Buffer.from(payload).toString("base64url")}.${mac}`;
    expect(verifyToken(token)).toBeNull();
  });
});

describe("roles", () => {
  const as = (role: AdminSession["role"]): AdminSession => ({ id: "1", email: "a@b.c", role });

  it("ranks owner above editor above viewer", () => {
    expect(hasRole(as("owner"), "editor")).toBe(true);
    expect(hasRole(as("editor"), "editor")).toBe(true);
    expect(hasRole(as("viewer"), "editor")).toBe(false);
    expect(hasRole(as("viewer"), "viewer")).toBe(true);
  });

  it("treats a missing session as having no role at all", () => {
    expect(hasRole(null, "viewer")).toBe(false);
  });
});
