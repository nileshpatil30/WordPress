/**
 * Consent version string stored on every voluntary data submission.
 *
 * Bump this whenever the wording on /contribute changes materially. Rows keep
 * the version they were collected under, so we can always tell what a given
 * contributor actually agreed to.
 */
// v2: the operator's name in the sentence changed from CostSignal to Home Cost
// Doctor. The substance of what a contributor agrees to is unchanged, but the
// text they were shown is not, and telling those two groups of rows apart later
// is the entire reason this string exists.
export const CONSENT_VERSION = "2026-08-contribute-v2";

export const CONSENT_TEXT =
  "I am sharing these figures voluntarily. I understand Home Cost Doctor will store them without my name, address or contractor's name, will review them before use, and will only publish them combined with other projects so that mine cannot be identified.";
