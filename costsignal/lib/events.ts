/**
 * The analytics event vocabulary.
 *
 * Deliberately a closed list shared by the client tracker and the server
 * ingest route: an open event endpoint becomes an unqueryable junk drawer
 * within weeks. Adding an event means adding it here.
 *
 * This module has no "use client" directive so the API route can import the
 * array itself rather than a client reference.
 */
export const EVENTS = [
  "calculator_started", "calculator_step_completed", "calculator_completed",
  "estimate_generated", "estimate_shared",
  "quote_upload_started", "quote_upload_completed", "quote_upload_failed",
  "quote_check_started", "quote_check_completed",
  "quote_comparison_started", "quote_comparison_completed",
  "lead_form_started", "lead_form_completed",
  "submission_started", "submission_completed",
  "zip_searched", "service_searched", "city_page_viewed", "zip_page_viewed",
] as const;

export type EventName = (typeof EVENTS)[number];
