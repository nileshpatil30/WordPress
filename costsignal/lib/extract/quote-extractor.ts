import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { extractedQuoteSchema, type ExtractedQuote } from "./schema";
import type { ScopeKey } from "@/lib/engine/quote";

export const EXTRACTOR_VERSION = "quote-extractor-1.0.0";

const SYSTEM = `You read residential roofing quotes and turn them into structured data for a homeowner who is trying to work out whether the quote is fair.

Rules that matter more than completeness:

1. Report only what the document says. If a figure is not on the page, return null. Never estimate, never infer a number from context, and never fill a gap with a typical value. A null is useful; an invented number is harmful.

2. Distinguish "not stated" from "excluded". A quote silent on the permit is not the same as a quote that excludes it. Use not_stated when the document does not address something at all.

3. Do not return the contractor's name, phone number, email, licence number, or the property address. Set contractorNamePresent if a name appears, and nothing more. The homeowner shared this document; the contractor did not agree to be catalogued.

4. Red flags must quote the document. Only report a red flag when specific wording supports it - an offer to cover, waive or absorb the homeowner's insurance deductible, a demand for full payment up front, a statement that no permit is needed, or a signature line that assigns insurance claim rights. Never treat a high or low price as a red flag; you have no basis for that judgement.

5. If the document is not a roofing quote, set isRoofingQuote false and leave the rest empty rather than forcing a reading.`;

const PROMPT = `Extract this roofing quote. Follow the rules exactly: nulls where the document is silent, no contractor identity, red flags only with supporting wording.`;

export interface ExtractionInput {
  data: string;      // base64, no newlines
  mediaType: string; // application/pdf | image/png | image/jpeg | image/webp
}

export class ExtractorUnavailableError extends Error {}

/**
 * Send one quote document to Claude and get structured data back.
 *
 * Structured outputs constrain the response to the Zod schema, so this returns
 * validated data rather than prose that has to be parsed and repaired.
 */
export async function extractQuote(
  input: ExtractionInput, client?: Anthropic,
): Promise<ExtractedQuote> {
  const anthropic = client ?? buildClient();

  const content: Anthropic.ContentBlockParam[] = [
    input.mediaType === "application/pdf"
      ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: input.data },
      }
      : {
        type: "image",
        source: {
          type: "base64",
          media_type: input.mediaType as "image/png" | "image/jpeg" | "image/webp",
          data: input.data,
        },
      },
    { type: "text", text: PROMPT },
  ];

  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(extractedQuoteSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The document could not be processed. Please enter the quote manually.");
  }
  if (!response.parsed_output) {
    throw new Error("Could not read a structured quote from that file.");
  }
  return response.parsed_output;
}

function buildClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ExtractorUnavailableError(
      "Quote upload is not configured on this deployment. Set ANTHROPIC_API_KEY, or enter the quote manually.");
  }
  return new Anthropic();
}

// ---------------------------------------------------------------------------
// Mapping into the application's own shapes.
//
// Pure and separately tested - the value of the extractor is entirely in
// whether this mapping is faithful, and that must be verifiable without
// spending money on an API call.
// ---------------------------------------------------------------------------

const MATERIAL_SLUG: Record<ExtractedQuote["materialFamily"], string | null> = {
  asphalt_3tab: "asphalt-3tab",
  asphalt_architectural: "asphalt-architectural",
  impact_resistant: "impact-resistant-shingle",
  asphalt_premium: "asphalt-premium",
  metal_standing_seam: "metal-standing-seam",
  metal_exposed_fastener: "metal-exposed-fastener",
  concrete_tile: "concrete-tile",
  clay_tile: "clay-tile",
  synthetic_slate: "synthetic-slate",
  natural_slate: "natural-slate",
  cedar_shake: "cedar-shake",
  membrane: "tpo-membrane",
  foam: "spf-foam",
  unknown: null,
};

export interface MappedQuote {
  /** Prefill for the roofing calculator / quote checker. */
  projectInput: Record<string, unknown>;
  /** Prefill for one row of the comparison tool. */
  quoteRow: {
    totalPrice: number | null;
    materialSlug: string | null;
    warrantyWorkmanshipYears: number | null;
    scope: Partial<Record<ScopeKey, boolean>>;
  };
  /** Fields the document did not state, so the UI can ask for them. */
  missing: string[];
  redFlags: { issue: string; quotedText: string }[];
}

export function mapExtractedQuote(extracted: ExtractedQuote): MappedQuote {
  const missing: string[] = [];

  // Squares are the contractor's own measurement and beat a derived area.
  const roofAreaSqft = extracted.measuredSquares != null
    ? Math.round(extracted.measuredSquares * 100)
    : extracted.roofAreaSqft;
  if (roofAreaSqft == null) missing.push("roof area");

  const materialSlug = MATERIAL_SLUG[extracted.materialFamily];
  if (!materialSlug) missing.push("roofing material");
  if (extracted.totalPrice == null) missing.push("quoted total");
  if (extracted.existingLayers == null) missing.push("existing layers to remove");

  const projectInput: Record<string, unknown> = {};
  if (roofAreaSqft != null) {
    projectInput.areaMode = "roof";
    projectInput.roofAreaSqft = roofAreaSqft;
  }
  if (materialSlug) projectInput.material = materialSlug;
  if (extracted.stories != null) {
    projectInput.stories = Math.min(3, Math.max(1, Math.round(extracted.stories)));
  }
  if (extracted.existingLayers != null) {
    projectInput.existingLayers = Math.min(2, Math.max(0, Math.round(extracted.existingLayers)));
  }
  if (extracted.deckSheetsIncluded != null) {
    projectInput.deckSheets = Math.max(0, Math.round(extracted.deckSheetsIncluded));
  }
  // Only an explicit exclusion turns these off. Silence leaves the default,
  // because the estimate should model the job, not the paperwork.
  if (extracted.scope.permit === "excluded") projectInput.includePermit = false;
  if (extracted.scope.disposal === "excluded") projectInput.includeDisposal = false;

  // "not_stated" maps to false here on purpose: the comparison tool prices back
  // in everything a quote does not commit to, and an unstated item is exactly
  // what produces a mid-job change order.
  const scope: Partial<Record<ScopeKey, boolean>> = {};
  for (const [key, value] of Object.entries(extracted.scope)) {
    scope[key as ScopeKey] = value === "included";
  }

  return {
    projectInput,
    quoteRow: {
      totalPrice: extracted.totalPrice,
      materialSlug,
      warrantyWorkmanshipYears: extracted.warrantyWorkmanshipYears,
      scope,
    },
    missing,
    redFlags: extracted.redFlags,
  };
}
