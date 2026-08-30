import { z } from "zod";

/**
 * What we pull out of an uploaded contractor quote.
 *
 * Two deliberate omissions, both privacy decisions rather than technical ones:
 *
 *  - We do NOT extract the contractor's name or contact details. The homeowner
 *    consented to share their quote; the contractor never consented to being
 *    entered into our database. We record only that a name was present.
 *  - We do NOT extract the property address. A precise address plus a price is
 *    an identified project, which is exactly what /contribute is built to avoid.
 *
 * The scope fields are deliberately tri-state. "Not stated" is not the same as
 * "excluded", and collapsing them would misrepresent the contractor.
 */
const triState = z
  .enum(["included", "excluded", "not_stated"])
  .describe("included = explicitly in the quote; excluded = explicitly out; not_stated = the quote is silent");

export const extractedQuoteSchema = z.object({
  isRoofingQuote: z.boolean()
    .describe("False if this document is not a roofing estimate or proposal at all."),
  documentType: z.enum(["estimate", "proposal", "invoice", "insurance_scope", "other"]),
  extractionConfidence: z.enum(["high", "medium", "low"])
    .describe("Low when the document is blurry, handwritten, or mostly missing the numbers."),

  totalPrice: z.number().nullable()
    .describe("The contract total the homeowner would pay. Null if not stated."),
  currency: z.string().default("USD"),

  lineItems: z.array(z.object({
    description: z.string(),
    amount: z.number().nullable(),
    quantity: z.number().nullable(),
    unit: z.string().nullable(),
  })).describe("Itemised lines exactly as written. Empty array for a lump-sum quote."),

  measuredSquares: z.number().nullable()
    .describe("Roofing squares stated by the contractor. 1 square = 100 sq ft."),
  roofAreaSqft: z.number().nullable(),
  stories: z.number().nullable(),
  existingLayers: z.number().nullable(),
  pitchDescription: z.string().nullable(),

  materialFamily: z.enum([
    "asphalt_3tab", "asphalt_architectural", "impact_resistant", "asphalt_premium",
    "metal_standing_seam", "metal_exposed_fastener", "concrete_tile", "clay_tile",
    "synthetic_slate", "natural_slate", "cedar_shake", "membrane", "foam", "unknown",
  ]).describe("Best match for the covering being installed."),
  materialProductName: z.string().nullable()
    .describe("Manufacturer and product line if named, e.g. 'GAF Timberline HDZ'."),

  warrantyWorkmanshipYears: z.number().nullable(),
  warrantyMaterialYears: z.number().nullable(),

  scope: z.object({
    tearOff: triState,
    disposal: triState,
    permit: triState,
    underlayment: triState,
    flashing: triState,
    ventilation: triState,
    deckAllowance: triState,
    cleanup: triState,
    licensedInsured: triState,
  }),

  deckSheetsIncluded: z.number().nullable(),
  deckPricePerSheet: z.number().nullable(),

  exclusions: z.array(z.string())
    .describe("Anything the quote explicitly says is NOT included."),

  /**
   * Things a homeowner should be told about. Only report what the document
   * actually says - never infer a red flag from a price being high or low.
   */
  redFlags: z.array(z.object({
    issue: z.string(),
    quotedText: z.string().describe("The wording in the document that triggered this."),
  })),

  paymentTerms: z.string().nullable(),
  contractorNamePresent: z.boolean()
    .describe("Whether a contractor name appears. Do NOT return the name itself."),
  notes: z.string().describe("Anything else a homeowner comparing quotes should know."),
});

export type ExtractedQuote = z.infer<typeof extractedQuoteSchema>;
