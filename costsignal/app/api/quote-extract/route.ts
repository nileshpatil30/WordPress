import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { bad, id, safeSessionId } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  EXTRACTOR_VERSION, ExtractorUnavailableError, extractQuote, mapExtractedQuote,
} from "@/lib/extract/quote-extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // Well under the API's 32 MB request limit.
const ACCEPTED = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

/**
 * Upload a contractor quote and get it back as structured data.
 *
 * The uploaded file is held in memory for the length of the request and never
 * written to disk or to the database. Only the structured extraction is stored,
 * and the extractor is instructed not to return the contractor's identity or
 * the property address in the first place.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "extract");
  if (limited) return limited;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Send the file as multipart/form-data with a `file` field.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return bad("No file received.");
  if (file.size === 0) return bad("That file is empty.");
  if (file.size > MAX_BYTES) {
    return bad(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 15 MB.`, 413);
  }

  // Trust the sniffed type over the browser-supplied one where they disagree.
  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = sniffMediaType(buffer) ?? file.type;
  if (!ACCEPTED.has(mediaType)) {
    return bad("Upload a PDF or a photo of the quote (PNG, JPEG or WebP).", 415);
  }

  const sessionId = safeSessionId(form.get("sessionId"));
  const zip = typeof form.get("zip") === "string" ? String(form.get("zip")) : undefined;

  let extracted;
  try {
    extracted = await extractQuote({ data: buffer.toString("base64"), mediaType });
  } catch (err) {
    if (err instanceof ExtractorUnavailableError) {
      // Not the user's fault and not a validation error - the deployment is
      // simply missing a key. Say so plainly and keep the manual path open.
      return NextResponse.json({ error: err.message, manualEntryAvailable: true }, { status: 503 });
    }
    return bad(err instanceof Error ? err.message : "Could not read that file.", 422);
  }

  if (!extracted.isRoofingQuote) {
    return bad(
      "That does not look like a roofing quote. Upload the contractor's estimate or proposal, or enter the figures manually.",
      422);
  }

  const mapped = mapExtractedQuote(extracted);

  const store = await getStore();
  const service = await store.getServiceBySlug("roofing");
  if (service) {
    await store.saveExtractedQuote({
      id: id("xq"),
      sessionId,
      serviceId: service.id,
      zip: zip && /^\d{5}$/.test(zip) ? zip : undefined,
      totalPrice: extracted.totalPrice ?? undefined,
      materialFamily: extracted.materialFamily,
      measuredSquares: extracted.measuredSquares ?? undefined,
      roofAreaSqft: extracted.roofAreaSqft ?? undefined,
      existingLayers: extracted.existingLayers ?? undefined,
      stories: extracted.stories ?? undefined,
      pitchDescription: extracted.pitchDescription ?? undefined,
      documentType: extracted.documentType,
      warrantyWorkmanshipYears: extracted.warrantyWorkmanshipYears ?? undefined,
      warrantyMaterialYears: extracted.warrantyMaterialYears ?? undefined,
      scope: extracted.scope as unknown as Record<string, string>,
      lineItemCount: extracted.lineItems.length,
      redFlagCount: extracted.redFlags.length,
      extractionConfidence: extracted.extractionConfidence,
      extractorVersion: EXTRACTOR_VERSION,
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ...mapped,
    summary: {
      documentType: extracted.documentType,
      confidence: extracted.extractionConfidence,
      totalPrice: extracted.totalPrice,
      materialProductName: extracted.materialProductName,
      measuredSquares: extracted.measuredSquares,
      lineItems: extracted.lineItems,
      exclusions: extracted.exclusions,
      paymentTerms: extracted.paymentTerms,
      scope: extracted.scope,
      notes: extracted.notes,
      warrantyWorkmanshipYears: extracted.warrantyWorkmanshipYears,
      deckSheetsIncluded: extracted.deckSheetsIncluded,
    },
  });
}

/** Magic-number sniffing. A renamed .exe should not reach the model. */
function sniffMediaType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString("latin1") === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF"
    && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}
