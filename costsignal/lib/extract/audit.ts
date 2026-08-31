import type { ExtractedQuote } from "./schema";

/**
 * Audit an extraction for contractor and homeowner identity.
 *
 * The schema has no field for a contractor's name, phone, email, licence number
 * or the property address, which stops the obvious leak. It does not stop a
 * model from writing any of those into `notes`, `paymentTerms`, a line item
 * description, or `materialProductName` - those are free text and will hold
 * anything at all. A privacy promise enforced only by the shape of the schema
 * is not enforced, so this sweeps every string that comes back.
 *
 * Tuned to over-report. A false positive costs someone ten seconds of reading;
 * a false negative puts a real contractor's phone number into a database they
 * never agreed to appear in.
 */

export interface IdentityFinding {
  /** Dotted path to the offending string, e.g. "lineItems[2].description". */
  field: string;
  label: string;
  matched: string;
}

const IDENTITY_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "email address", re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/g },
  {
    label: "phone number",
    re: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
  },
  {
    // The interior words allow a leading digit on purpose: numbered streets
    // ("3117 North 44th Place", "820 East 3rd Street") are ordinary US
    // addresses, and requiring every interior word to start with a letter
    // silently misses all of them. The house number and the trailing street
    // type keep this anchored enough not to fire on ordinary prose.
    label: "street address",
    re: /\b\d{1,6}\s+(?:[\w.'-]+\s+){0,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Circle|Cir|Parkway|Pkwy|Highway|Hwy|Suite|Ste)\b\.?/gi,
  },
  {
    label: "licence number",
    re: /\b(?:ROC|CSLB|Lic(?:ense|ence)?\.?\s*(?:No\.?|#)?)\s*[:#]?\s*\d{4,}/gi,
  },
  { label: "web address", re: /\b(?:https?:\/\/|www\.)[\w.-]+\.[a-z]{2,}\S*/gi },
  {
    label: "company name",
    re: /\b[A-Z][\w&'-]*(?:\s+[A-Z][\w&'-]*){0,3}\s+(?:Roofing|Roofers|Construction|Contracting|Exteriors)(?:,?\s+(?:LLC|Inc\.?|Co\.?|Corp\.?|L\.?L\.?C\.?))?\b/g,
  },
];

/** Walk every string in a parsed object, remembering where each one lives. */
function walkStrings(
  value: unknown, path: string, out: { path: string; value: string }[],
) {
  if (typeof value === "string") {
    out.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walkStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
}

export function auditIdentity(extracted: ExtractedQuote): IdentityFinding[] {
  const strings: { path: string; value: string }[] = [];
  walkStrings(extracted, "", strings);

  const findings: IdentityFinding[] = [];
  for (const { path, value } of strings) {
    for (const { label, re } of IDENTITY_PATTERNS) {
      for (const m of value.matchAll(re)) {
        findings.push({ field: path, label, matched: m[0].trim() });
      }
    }
  }
  return findings;
}

/**
 * `redFlags[].quotedText` is required to quote the document verbatim, so a
 * contractor's own words legitimately land there - including, sometimes, their
 * own name. That is reported for review but is not a failure. Anywhere else is.
 */
export const isHardFailure = (f: IdentityFinding) => !f.field.startsWith("redFlags");
