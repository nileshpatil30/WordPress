import { describe, expect, it } from "vitest";
import { mapExtractedQuote } from "@/lib/extract/quote-extractor";
import { extractedQuoteSchema, type ExtractedQuote } from "@/lib/extract/schema";

function quote(overrides: Partial<ExtractedQuote> = {}): ExtractedQuote {
  return extractedQuoteSchema.parse({
    isRoofingQuote: true,
    documentType: "estimate",
    extractionConfidence: "high",
    totalPrice: 18500,
    currency: "USD",
    lineItems: [],
    measuredSquares: null,
    roofAreaSqft: null,
    stories: null,
    existingLayers: null,
    pitchDescription: null,
    materialFamily: "asphalt_architectural",
    materialProductName: "GAF Timberline HDZ",
    warrantyWorkmanshipYears: null,
    warrantyMaterialYears: null,
    scope: {
      tearOff: "not_stated", disposal: "not_stated", permit: "not_stated",
      underlayment: "not_stated", flashing: "not_stated", ventilation: "not_stated",
      deckAllowance: "not_stated", cleanup: "not_stated", licensedInsured: "not_stated",
    },
    deckSheetsIncluded: null,
    deckPricePerSheet: null,
    exclusions: [],
    redFlags: [],
    paymentTerms: null,
    contractorNamePresent: true,
    notes: "",
    ...overrides,
  });
}

describe("mapping an extracted quote", () => {
  it("prefers the contractor's own square count over a stated area", () => {
    const m = mapExtractedQuote(quote({ measuredSquares: 24.5, roofAreaSqft: 2000 }));
    expect(m.projectInput.roofAreaSqft).toBe(2450);
    expect(m.projectInput.areaMode).toBe("roof");
  });

  it("falls back to the stated area when no squares are given", () => {
    expect(mapExtractedQuote(quote({ roofAreaSqft: 2200 })).projectInput.roofAreaSqft).toBe(2200);
  });

  it("maps every material family to a real catalogue slug", () => {
    const families: ExtractedQuote["materialFamily"][] = [
      "asphalt_3tab", "asphalt_architectural", "impact_resistant", "asphalt_premium",
      "metal_standing_seam", "metal_exposed_fastener", "concrete_tile", "clay_tile",
      "synthetic_slate", "natural_slate", "cedar_shake", "membrane", "foam",
    ];
    for (const materialFamily of families) {
      expect(mapExtractedQuote(quote({ materialFamily })).quoteRow.materialSlug).toBeTruthy();
    }
    expect(mapExtractedQuote(quote({ materialFamily: "unknown" })).quoteRow.materialSlug).toBeNull();
  });

  it("counts an unstated scope item as not covered", () => {
    // The comparison tool prices back in whatever a quote does not commit to.
    // Silence is exactly what produces a mid-job change order.
    const m = mapExtractedQuote(quote());
    expect(Object.values(m.quoteRow.scope).every((v) => v === false)).toBe(true);
  });

  it("counts an explicitly included item as covered", () => {
    const m = mapExtractedQuote(quote({
      scope: { ...quote().scope, tearOff: "included", permit: "included" },
    }));
    expect(m.quoteRow.scope.tearOff).toBe(true);
    expect(m.quoteRow.scope.permit).toBe(true);
    expect(m.quoteRow.scope.disposal).toBe(false);
  });

  it("only turns off a modelled cost when the quote explicitly excludes it", () => {
    const silent = mapExtractedQuote(quote());
    expect(silent.projectInput.includePermit).toBeUndefined();

    const excluded = mapExtractedQuote(quote({
      scope: { ...quote().scope, permit: "excluded", disposal: "excluded" },
    }));
    expect(excluded.projectInput.includePermit).toBe(false);
    expect(excluded.projectInput.includeDisposal).toBe(false);
  });

  it("lists what the document did not state so the UI can ask", () => {
    const m = mapExtractedQuote(quote({ totalPrice: null, materialFamily: "unknown" }));
    expect(m.missing).toContain("roof area");
    expect(m.missing).toContain("quoted total");
    expect(m.missing).toContain("roofing material");
    expect(m.missing).toContain("existing layers to remove");
  });

  it("reports nothing missing when the quote is complete", () => {
    const m = mapExtractedQuote(quote({ measuredSquares: 22, existingLayers: 1 }));
    expect(m.missing).toEqual([]);
  });

  it("clamps storeys and layers into the ranges the engine accepts", () => {
    const m = mapExtractedQuote(quote({ stories: 7, existingLayers: 5 }));
    expect(m.projectInput.stories).toBe(3);
    expect(m.projectInput.existingLayers).toBe(2);

    const low = mapExtractedQuote(quote({ stories: 0, existingLayers: -1 }));
    expect(low.projectInput.stories).toBe(1);
    expect(low.projectInput.existingLayers).toBe(0);
  });

  it("passes red flags through with the wording that triggered them", () => {
    const m = mapExtractedQuote(quote({
      redFlags: [{ issue: "Offers to cover the deductible", quotedText: "we will waive your deductible" }],
    }));
    expect(m.redFlags).toHaveLength(1);
    expect(m.redFlags[0].quotedText).toMatch(/waive your deductible/);
  });

  it("carries the decking allowance into the estimate inputs", () => {
    expect(mapExtractedQuote(quote({ deckSheetsIncluded: 6 })).projectInput.deckSheets).toBe(6);
  });
});

describe("extraction schema", () => {
  it("rejects a scope value that is neither included, excluded nor not_stated", () => {
    const bad = { ...quote(), scope: { ...quote().scope, tearOff: "maybe" } };
    expect(extractedQuoteSchema.safeParse(bad).success).toBe(false);
  });

  it("has no field for the contractor's name or the property address", () => {
    // Privacy is enforced by the schema's shape, not only by the prompt: even a
    // model that ignored the instruction has nowhere to put those values.
    const keys = Object.keys(extractedQuoteSchema.shape);
    for (const forbidden of ["contractorName", "address", "phone", "email", "licenseNumber"]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(keys).toContain("contractorNamePresent");
  });
});
