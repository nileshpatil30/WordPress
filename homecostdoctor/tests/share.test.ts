import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare } from "@/lib/share";

const inputs = {
  zip: "85018", areaMode: "roof", roofAreaSqft: 2400, stories: 2,
  material: "asphalt-architectural", pitch: "steep", complexity: "complex",
  existingLayers: 2, includePermit: true, quotedPrice: 23400,
};

describe("share links", () => {
  it("round-trips every supported field", () => {
    expect(decodeShare(encodeShare(inputs))).toEqual(inputs);
  });

  it("produces a URL-safe token", () => {
    expect(encodeShare(inputs)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("keeps a full-detail link to a manageable length", () => {
    const token = encodeShare({
      ...inputs, houseSqft: 2600, projectType: "full-replacement", quality: "premium",
      planes: 9, skylights: 2, chimneys: 1, existingMaterial: "asphalt-3tab",
      underlayment: "peel-stick", flashing: "full-replacement", ventilation: "ridge-vent",
      ventilationQty: 60, deckSheets: 8, access: "difficult", warranty: "system",
      includeDisposal: true, gutterLf: 180,
    });
    expect(token.length).toBeLessThan(500);
  });

  it("drops empty values rather than encoding them", () => {
    const decoded = decodeShare(encodeShare({ ...inputs, planes: undefined, access: "" }))!;
    expect(decoded).not.toHaveProperty("planes");
    expect(decoded).not.toHaveProperty("access");
  });

  it("rejects a token with no valid ZIP", () => {
    expect(decodeShare(encodeShare({ material: "clay-tile" }))).toBeNull();
    expect(decodeShare(encodeShare({ ...inputs, zip: "abc" }))).toBeNull();
  });

  it("rejects malformed, truncated and hostile tokens", () => {
    for (const bad of ["", "!!!", "a", "%%%%", "x".repeat(3000)]) {
      expect(decodeShare(bad)).toBeNull();
    }
    // Valid base64url, but not an object.
    expect(decodeShare(encodeAny('"just a string"'))).toBeNull();
    expect(decodeShare(encodeAny("[1,2,3]"))).toBeNull();
    expect(decodeShare(encodeAny("not json at all"))).toBeNull();
  });

  it("strips keys outside the allow-list, so a link cannot smuggle input", () => {
    // A share link is untrusted input like any other: a hand-crafted token must
    // not be able to set fields the encoder would never produce.
    const hostile = encodeAny(JSON.stringify({ z: "85018", __proto__: { evil: true }, admin: true }));
    const decoded = decodeShare(hostile);
    expect(decoded).toEqual({ zip: "85018" });
    expect(decoded).not.toHaveProperty("admin");
  });

  it("drops non-primitive values", () => {
    const hostile = encodeAny(JSON.stringify({ z: "85018", m: { nested: "object" }, st: [1, 2] }));
    expect(decodeShare(hostile)).toEqual({ zip: "85018" });
  });
});

/** Encode arbitrary text the same way the encoder would, for hostile input. */
function encodeAny(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}
