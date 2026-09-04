import { describe, expect, it } from "vitest";
import {
  crosswalkZips, expandGeography, metroName, slugify,
  type AreaRow, type CrosswalkRow,
} from "@/lib/ingest/geo-expand";
import type { Metro, State, ZipCode } from "@/lib/types";

const area = (over: Partial<AreaRow> = {}): AreaRow => ({
  cbsa: "38900", title: "Portland-Vancouver-Hillsboro, OR-WA", primaryState: "OR", ...over,
});

const EXISTING_METROS: Metro[] = [
  { id: "metro-phx", countryId: "us", stateId: "us-az", name: "Phoenix-Mesa-Chandler",
    slug: "phoenix-mesa-chandler", cbsaCode: "38060" },
];
const EXISTING_STATES: State[] = [
  { id: "us-az", countryId: "us", code: "AZ", name: "Arizona", slug: "arizona",
    laborIndex: 0.97, materialIndex: 1.01, dataStatus: "sample" },
];

describe("expanding metros from the wage file", () => {
  it("creates a metro and its state for an area we do not carry", () => {
    const { metros, states } = expandGeography([area()],
      { metros: EXISTING_METROS, states: EXISTING_STATES });
    expect(metros).toHaveLength(1);
    expect(metros[0]).toMatchObject({
      id: "metro-cbsa-38900", cbsaCode: "38900", stateId: "us-or",
      name: "Portland-Vancouver-Hillsboro", slug: "portland-vancouver-hillsboro",
    });
    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({ id: "us-or", code: "OR", name: "Oregon" });
  });

  it("gives a new state neutral indexes and a sample status", () => {
    // A state index is consulted only when no metro row answers. Inventing a
    // multiplier for a state we have never priced would put a number with no
    // evidence behind it in the same clothes as one that has.
    const { states } = expandGeography([area()],
      { metros: EXISTING_METROS, states: EXISTING_STATES });
    expect(states[0].laborIndex).toBe(1);
    expect(states[0].materialIndex).toBe(1);
    expect(states[0].dataStatus).toBe("sample");
  });

  it("never regenerates a metro we already carry", () => {
    // Hand-written metros own ids that other rows reference, and BLS renames
    // areas between releases - Phoenix has been both "-Scottsdale" and
    // "-Chandler". Regenerating would rename ours and orphan its wage data.
    const { metros, states } = expandGeography(
      [area({ cbsa: "38060", title: "Phoenix-Mesa-Scottsdale, AZ", primaryState: "AZ" })],
      { metros: EXISTING_METROS, states: EXISTING_STATES });
    expect(metros).toEqual([]);
    expect(states).toEqual([]);
  });

  it("reuses a state it just created rather than duplicating it", () => {
    const { metros, states } = expandGeography([
      area({ cbsa: "38900", title: "Portland-Vancouver-Hillsboro, OR-WA", primaryState: "OR" }),
      area({ cbsa: "21660", title: "Eugene-Springfield, OR", primaryState: "OR" }),
    ], { metros: EXISTING_METROS, states: EXISTING_STATES });
    expect(metros).toHaveLength(2);
    expect(states).toHaveLength(1);
    expect(metros.every((m) => m.stateId === "us-or")).toBe(true);
  });

  it("skips an area it cannot place in a state instead of inventing one", () => {
    const { metros, skipped } = expandGeography(
      [area({ primaryState: "ZZ" })], { metros: [], states: [] });
    expect(metros).toEqual([]);
    expect(skipped[0].reason).toMatch(/unknown state code/);
  });

  it("drops the state suffix from the metro name", () => {
    expect(metroName("Portland-Vancouver-Hillsboro, OR-WA")).toBe("Portland-Vancouver-Hillsboro");
    expect(slugify("St. Louis, MO-IL")).toBe("st-louis-mo-il");
  });

  it("tolerates the zero padding some releases apply to CBSA codes", () => {
    const { metros } = expandGeography([area({ cbsa: "038900" })], { metros: [], states: [] });
    expect(metros[0].cbsaCode).toBe("38900");
  });
});

describe("placing ZIPs from the crosswalk", () => {
  const METROS: Metro[] = [
    { id: "metro-pdx", countryId: "us", stateId: "us-or", name: "Portland",
      slug: "portland", cbsaCode: "38900" },
    { id: "metro-den", countryId: "us", stateId: "us-co", name: "Denver",
      slug: "denver", cbsaCode: "19740" },
  ];
  const row = (over: Partial<CrosswalkRow> = {}): CrosswalkRow => ({
    zip: "97201", cbsa: "38900", residentialRatio: 1, ...over,
  });

  it("places a ZIP in its metro with no city", () => {
    const { zipCodes } = crosswalkZips([row()], METROS, []);
    expect(zipCodes).toHaveLength(1);
    expect(zipCodes[0]).toMatchObject({
      code: "97201", metroId: "metro-pdx", stateId: "us-or", pageEligible: false,
    });
    expect(zipCodes[0].cityId).toBeUndefined();
  });

  it("gives a straddling ZIP the metro holding most of its homes", () => {
    // Averaging two metros' wages produces a rate nobody pays, and taking the
    // first row makes the answer depend on the order of the file.
    const { zipCodes } = crosswalkZips([
      row({ zip: "80202", cbsa: "38900", residentialRatio: 0.19 }),
      row({ zip: "80202", cbsa: "19740", residentialRatio: 0.81 }),
    ], METROS, []);
    expect(zipCodes).toHaveLength(1);
    expect(zipCodes[0].metroId).toBe("metro-den");
  });

  it("leaves a ZIP that already belongs to a written city alone", () => {
    // A crosswalk row must never move a ZIP off its city page.
    const existing: ZipCode[] = [{
      id: "zip-97201", countryId: "us", stateId: "us-or", cityId: "city-portland",
      code: "97201", pageEligible: true,
    }];
    const { zipCodes } = crosswalkZips([row()], METROS, existing);
    expect(zipCodes).toEqual([]);
  });

  it("counts CBSAs it has no metro for rather than dropping them in silence", () => {
    const { zipCodes, unmatchedCbsas } = crosswalkZips(
      [row({ zip: "59718", cbsa: "14580" })], METROS, []);
    expect(zipCodes).toEqual([]);
    expect(unmatchedCbsas).toBe(1);
  });
});
