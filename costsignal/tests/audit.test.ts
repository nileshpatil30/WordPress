import { describe, expect, it } from "vitest";
import { auditIdentity, isHardFailure } from "@/lib/extract/audit";
import { extractedQuoteSchema, type ExtractedQuote } from "@/lib/extract/schema";

function quote(overrides: Partial<ExtractedQuote> = {}): ExtractedQuote {
  return extractedQuoteSchema.parse({
    isRoofingQuote: true,
    documentType: "estimate",
    extractionConfidence: "high",
    totalPrice: 19450,
    currency: "USD",
    lineItems: [],
    measuredSquares: 27.5,
    roofAreaSqft: null,
    stories: 1,
    existingLayers: 1,
    pitchDescription: null,
    materialFamily: "concrete_tile",
    materialProductName: null,
    warrantyWorkmanshipYears: 10,
    warrantyMaterialYears: 30,
    scope: {
      tearOff: "included", disposal: "included", permit: "not_stated",
      underlayment: "included", flashing: "included", ventilation: "excluded",
      deckAllowance: "excluded", cleanup: "included", licensedInsured: "included",
    },
    deckSheetsIncluded: null,
    deckPricePerSheet: 96,
    exclusions: ["Attic or ridge ventilation work of any kind."],
    redFlags: [],
    paymentTerms: "Contract total due in full prior to commencement of work.",
    contractorNamePresent: true,
    notes: "",
    ...overrides,
  });
}

/**
 * The audit is the only thing standing between a well-meaning model and a
 * contractor's phone number in our database. If it does not actually catch
 * these, it is worse than nothing: it produces a green tick over a leak.
 */
describe("identity audit catches leaks wherever they hide", () => {
  it("passes a clean extraction", () => {
    expect(auditIdentity(quote())).toEqual([]);
  });

  it.each([
    ["email", "Contact estimating@summitcrestroof.example for scheduling.", "email address"],
    ["phone, parenthesised", "Call the office at (602) 555-0147 to schedule.", "phone number"],
    ["phone, dashed", "Direct line 480-555-0192 for the estimator.", "phone number"],
    ["street address", "Work at 3117 North 44th Place, Phoenix.", "street address"],
    ["licence number", "Arizona ROC License #327841, bonded and insured.", "licence number"],
    ["web address", "See www.summitcrestroof.example for warranty terms.", "web address"],
    ["company name", "Quote issued by Summit Crest Roofing & Exteriors, LLC.", "company name"],
  ])("catches %s in notes", (_label, notes, expected) => {
    const findings = auditIdentity(quote({ notes }));
    expect(findings.map((f) => f.label)).toContain(expected);
    expect(findings.every((f) => f.field === "notes")).toBe(true);
    expect(findings.every(isHardFailure)).toBe(true);
  });

  it("catches identity nested inside a line item description", () => {
    const findings = auditIdentity(quote({
      lineItems: [
        { description: "Tear-off of existing tile", amount: 4125, quantity: 27.5, unit: "sq" },
        { description: "Installed by Summit Crest Roofing, LLC crew", amount: 5775, quantity: null, unit: null },
      ],
    }));
    expect(findings).toHaveLength(1);
    expect(findings[0].field).toBe("lineItems[1].description");
    expect(isHardFailure(findings[0])).toBe(true);
  });

  it("catches identity in paymentTerms and exclusions", () => {
    const findings = auditIdentity(quote({
      paymentTerms: "Wire to account, questions to billing@summitcrestroof.example",
      exclusions: ["Anything not listed at 4820 East Camelback Road, Suite 210"],
    }));
    const fields = findings.map((f) => f.field);
    expect(fields).toContain("paymentTerms");
    expect(fields.some((f) => f.startsWith("exclusions"))).toBe(true);
  });

  it("reports but does not fail on identity inside verbatim red-flag text", () => {
    // The extractor is required to quote the document to justify a red flag,
    // so the contractor's own words - name included - legitimately appear here.
    const findings = auditIdentity(quote({
      redFlags: [{
        issue: "Offers to absorb the homeowner's insurance deductible",
        quotedText: "Homeowner assigns all rights of recovery to Summit Crest Roofing & Exteriors, LLC upon signature",
      }],
    }));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(isHardFailure)).toBe(false);
  });

  it("does not fire on ordinary roofing language", () => {
    const benign = quote({
      notes: "Two-ply modified bitumen underlayment over 27.5 squares. "
        + "Valley metal replaced. 15% breakage allowance on salvaged tile. "
        + "Ridge ventilation excluded. Deck sheets billed at $96.00 each.",
      materialProductName: "GAF Timberline HDZ",
      exclusions: ["Skylight replacement", "Fascia and soffit repair", "Structural rafter work"],
      paymentTerms: "50% deposit, balance on completion",
    });
    expect(auditIdentity(benign)).toEqual([]);
  });

  it("reports a dotted path precise enough to find the string again", () => {
    const q = quote({ notes: "Reach us on 602-555-0147." });
    const [finding] = auditIdentity(q);
    expect(finding.field).toBe("notes");
    expect(q.notes).toContain(finding.matched);
  });
});
