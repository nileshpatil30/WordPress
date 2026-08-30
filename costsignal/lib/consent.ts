/**
 * Consent version string stored on every voluntary data submission.
 *
 * Bump this whenever the wording on /contribute changes materially. Rows keep
 * the version they were collected under, so we can always tell what a given
 * contributor actually agreed to.
 */
export const CONSENT_VERSION = "2026-08-contribute-v1";

export const CONSENT_TEXT =
  "I am sharing these figures voluntarily. I understand CostSignal will store them without my name, address or contractor's name, will review them before use, and will only publish them combined with other projects so that mine cannot be identified.";
