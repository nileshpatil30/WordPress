"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, checkPassword, currentAdmin, issueToken } from "@/lib/auth";
import { getStore, type EditableCollection } from "@/lib/data/store";

export type ActionState = { ok: boolean; message?: string };

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD) {
    return { ok: false, message: "ADMIN_PASSWORD is not set on the server. Set it in .env.local and restart." };
  }
  if (!checkPassword(password)) {
    // Deliberately vague: no hint about which part was wrong.
    return { ok: false, message: "Incorrect password." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, issueToken("admin"), {
    httpOnly: true, sameSite: "lax", path: "/admin",
    secure: process.env.NODE_ENV === "production", maxAge: ADMIN_MAX_AGE,
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  revalidatePath("/admin");
}

/** Whitelisted collections only - the store enforces this again server-side. */
const EDITABLE: EditableCollection[] = [
  "cities", "zipCodes", "states", "services", "materials",
  "pricingRecords", "pricingFactors", "pricingSources", "actualProjectCosts",
];

const NUMERIC_FIELDS = new Set([
  "lowPrice", "medianPrice", "highPrice", "confidenceScore", "multiplier", "flatAdder",
  "laborIndex", "materialIndex", "reliabilityWeight", "sampleSize", "scopeMultiplier",
]);

export async function updateRecordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Not signed in." };

  const collection = String(formData.get("collection") ?? "") as EditableCollection;
  const id = String(formData.get("id") ?? "");
  if (!EDITABLE.includes(collection)) return { ok: false, message: "That table is not editable." };
  if (!id) return { ok: false, message: "Missing record id." };

  const patch: Record<string, unknown> = {};
  for (const [key, raw] of formData.entries()) {
    if (key === "collection" || key === "id" || key === "returnTo") continue;
    const value = String(raw);
    if (value === "") continue;
    if (NUMERIC_FIELDS.has(key)) {
      const n = Number(value);
      if (!Number.isFinite(n)) return { ok: false, message: `${key} must be a number.` };
      patch[key] = n;
    } else if (value === "true" || value === "false") {
      patch[key] = value === "true";
    } else {
      patch[key] = value;
    }
  }

  // Price rows must stay internally consistent: the database has the same
  // CHECK constraint, but failing here gives a usable message.
  if (collection === "pricingRecords") {
    const store = await getStore();
    const existing = (await store.listPricingRecords("svc-roofing")).find((r) => r.id === id);
    const low = Number(patch.lowPrice ?? existing?.lowPrice);
    const med = Number(patch.medianPrice ?? existing?.medianPrice);
    const high = Number(patch.highPrice ?? existing?.highPrice);
    if (!(low <= med && med <= high)) {
      return { ok: false, message: "Low must be <= median <= high." };
    }
  }

  const store = await getStore();
  const result = await store.updateRecord(collection, id, patch, admin.actor);
  if (!result.ok) return { ok: false, message: result.message ?? "Update failed." };

  const returnTo = String(formData.get("returnTo") ?? "/admin");
  revalidatePath(returnTo);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function reviewSubmissionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Not signed in." };

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["approved", "rejected"].includes(status)) return { ok: false, message: "Invalid status." };

  const store = await getStore();
  const result = await store.updateRecord("actualProjectCosts", id, {
    status,
    reviewedAt: new Date().toISOString(),
    moderationNotes: String(formData.get("moderationNotes") ?? "") || undefined,
  }, admin.actor);

  if (!result.ok) return { ok: false, message: result.message ?? "Update failed." };
  revalidatePath("/admin/submissions");
  return { ok: true, message: `Marked ${status}.` };
}
