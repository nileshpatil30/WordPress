"use client";

import type { EventName } from "./events";

/**
 * Minimal first-party analytics.
 *
 * Rules, enforced here rather than in a policy document:
 *  - the session id is a random opaque string in sessionStorage, not a
 *    fingerprint, and it dies with the tab
 *  - no PII is ever put in `properties`; the API route strips anything that
 *    looks like an email or phone number as a second line of defence
 *  - events are fire-and-forget and never block the UI
 */
const KEY = "cs_session_id";

export function sessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function track(eventName: EventName, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    sessionId: sessionId(), eventName, properties, path: window.location.pathname,
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch { /* fall through to fetch */ }
  void fetch("/api/events", {
    method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true,
  }).catch(() => {});
}
