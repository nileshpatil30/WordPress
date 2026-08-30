import type { CostComponent, PricingSource } from "@/lib/types";
import { addTriples, makePriceLookup, scale, zeroTriple } from "../geo";
import { scoreConfidence } from "../confidence";
import type {
  Assumption, EngineContext, EstimateResult, LineItem, PriceTriple,
} from "../types";
import { OPTIONAL_DETAIL_FIELDS, type RoofingInput } from "./schema";

export const ROOFING_ENGINE_VERSION = "roofing-1.0.0";

const COMPONENT_LABEL: Record<CostComponent, string> = {
  material: "Materials",
  labor: "Labour",
  equipment: "Equipment",
  disposal: "Disposal",
  permit: "Permits",
  overhead: "Overhead and profit",
  addon: "Add-ons",
};

const round50 = (n: number) => Math.round(n / 50) * 50;

/**
 * The roofing cost model.
 *
 * Structure, in order:
 *   1. geometry      - turn what the user knows into roof squares
 *   2. materials     - covering, underlayment, accessories, flashing, venting
 *   3. labour        - install + tear-off + detail hours, times site factors
 *   4. equipment     - containers
 *   5. disposal      - tonnage times the local tipping fee
 *   6. permits       - local allowance
 *   7. add-ons       - explicitly chosen extras
 *   8. overhead      - contractor overhead and profit on the direct cost
 *
 * Every unit price comes from pricing_records and every multiplier from
 * pricing_factors, both resolved through the geographic fallback chain. Nothing
 * multiplicative is written into this file as a literal, so retuning the model
 * is an admin edit, not a deploy.
 */
export function estimateRoofing(
  input: RoofingInput, ctx: EngineContext, sources: PricingSource[] = [],
): EstimateResult {
  const price = makePriceLookup(ctx.records, ctx.geo);
  const warnings: string[] = [];
  const assumptions: Assumption[] = [];
  const provided = new Set(input.providedFields ?? []);

  const factor = (key: string, fallback = 1) =>
    ctx.factors.find((f) => f.factorKey === key)?.multiplier ?? fallback;

  const material = ctx.materials.find((m) => m.slug === input.material)
    ?? ctx.materials.find((m) => m.slug === "asphalt-architectural")
    ?? ctx.materials[0];
  const existingMaterial =
    ctx.materials.find((m) => m.slug === input.existingMaterial) ?? material;
  const projectType = ctx.projectTypes.find((p) => p.slug === input.projectType)
    ?? ctx.projectTypes[0];

  const isTileRelay = input.projectType === "tile-underlayment";
  const isOverlay = input.projectType === "overlay";
  const isPartial = input.projectType === "partial-replacement";

  // -- 1. Geometry ---------------------------------------------------------
  const pitchArea = factor(`pitch.${input.pitch}.area`);
  const eaveFactor = factor("area.eave_overhang", 1.08);

  let roofSurfaceSqft: number;
  if (input.areaMode === "roof" && input.roofAreaSqft) {
    roofSurfaceSqft = input.roofAreaSqft;
    assumptions.push({
      label: "Roof area", value: `${input.roofAreaSqft.toLocaleString()} sq ft`,
      note: "Taken as the actual roof surface, so no pitch multiplier is applied to it.",
    });
  } else {
    const houseSqft = input.houseSqft ?? 2000;
    if (!input.houseSqft) warnings.push("No house size supplied - assumed 2,000 sq ft.");
    const footprint = houseSqft / input.stories;
    roofSurfaceSqft = footprint * eaveFactor * pitchArea;
    assumptions.push({
      label: "Roof area", value: `${Math.round(roofSurfaceSqft).toLocaleString()} sq ft`,
      assumed: true,
      note: `${houseSqft.toLocaleString()} sq ft over ${input.stories} storey${input.stories > 1 ? "s" : ""} = ${Math.round(footprint).toLocaleString()} sq ft footprint, x${eaveFactor} for eaves, x${pitchArea} for a ${input.pitch.replace("-", " ")} pitch.`,
    });
  }

  const partialShare = isPartial ? (input.partialSharePct ?? 50) / 100 : 1;
  if (isPartial) {
    assumptions.push({
      label: "Partial replacement", value: `${Math.round(partialShare * 100)}% of the roof`,
      note: "Fixed costs such as permits and container hire are not reduced, which is why the cost per square is higher than a full replacement.",
    });
  }

  const squares = (roofSurfaceSqft * partialShare) / 100;
  const wasteFactor = factor(`complexity.${input.complexity}.waste`, 1.1);
  const materialSquares = squares * wasteFactor;

  // -- 2. Materials --------------------------------------------------------
  const lineItems: LineItem[] = [];
  const push = (
    key: string, label: string, component: CostComponent, triple: PriceTriple,
    basis: string, ref?: { metricKey: string; scope: string; dataStatus: LineItem["sourceRef"] extends undefined ? never : "verified" | "modeled" | "sample" },
    extra?: Partial<LineItem>,
  ) => {
    if (triple.typical <= 0 && triple.low <= 0 && triple.high <= 0) return;
    lineItems.push({ key, label, component, ...triple, basis, sourceRef: ref, ...extra });
  };

  const refOf = (hit: ReturnType<typeof price.require>) => ({
    metricKey: hit.record.metricKey, scope: hit.level, dataStatus: hit.record.dataStatus,
  });

  const qualityMult = factor(`quality.${input.quality}.material`, 1);
  const matHit = price.require("material.per_square", material.id);

  if (isTileRelay) {
    const breakage = factor("material.tile_breakage_allowance", 0.12);
    push("material.covering", `${material.name} - breakage allowance`, "material",
      scale(matHit.triple, materialSquares * breakage),
      `${materialSquares.toFixed(1)} squares x ${Math.round(breakage * 100)}% breakage x $${matHit.triple.typical}/square`,
      refOf(matHit),
      { note: "On a lift-and-relay the existing tile is reused. Only breakage is replaced. Ask each contractor what allowance they assumed." });
  } else {
    push("material.covering", material.name, "material",
      scale(matHit.triple, materialSquares * qualityMult),
      `${materialSquares.toFixed(1)} squares (incl. ${Math.round((wasteFactor - 1) * 100)}% waste) x $${Math.round(matHit.triple.typical * qualityMult)}/square`,
      refOf(matHit));
  }

  const underHit = price.require(`underlayment.${input.underlayment}.per_square`);
  push("material.underlayment", underlaymentLabel(input.underlayment), "material",
    scale(underHit.triple, materialSquares),
    `${materialSquares.toFixed(1)} squares x $${underHit.triple.typical}/square`, refOf(underHit));

  const accHit = price.require("accessories.per_square");
  push("material.accessories", "Starter, ridge cap, drip edge and fasteners", "material",
    scale(accHit.triple, squares), `${squares.toFixed(1)} squares x $${accHit.triple.typical}/square`,
    refOf(accHit));

  const flashHit = price.require(`flashing.${input.flashing}.per_square`);
  push("material.flashing",
    input.flashing === "full-replacement" ? "Flashing - full replacement" : "Flashing - standard",
    "material", scale(flashHit.triple, squares),
    `${squares.toFixed(1)} squares x $${flashHit.triple.typical}/square`, refOf(flashHit));

  // Ventilation
  if (input.ventilation !== "none") {
    if (input.ventilation === "ridge-vent") {
      const planArea = roofSurfaceSqft / pitchArea;
      const ridgeLf = input.ventilationQty ?? Math.round(Math.sqrt(planArea) * 1.6);
      if (!input.ventilationQty) {
        assumptions.push({
          label: "Ridge length", value: `${ridgeLf} linear ft`, assumed: true,
          note: "Estimated from the roof footprint. Measure it if you want a tighter number.",
        });
      }
      const vHit = price.require("ventilation.ridge-vent.per_lf");
      push("material.ventilation", "Continuous ridge vent", "material",
        scale(vHit.triple, ridgeLf), `${ridgeLf} linear ft x $${vHit.triple.typical}/ft`, refOf(vHit));
    } else {
      const qty = input.ventilationQty ?? (input.ventilation === "powered" ? 1 : Math.max(1, Math.ceil(squares / 3)));
      const vHit = price.require(`ventilation.${input.ventilation}.each`);
      push("material.ventilation",
        input.ventilation === "powered" ? "Powered attic ventilator" : "Static / turbine vents",
        "material", scale(vHit.triple, qty), `${qty} x $${vHit.triple.typical} each`, refOf(vHit));
    }
  }

  if (input.skylights > 0) {
    const sHit = price.require("penetration.skylight-flash.each");
    push("addon.skylights", "Skylight re-flashing", "addon",
      scale(sHit.triple, input.skylights),
      `${input.skylights} x $${sHit.triple.typical} each`, refOf(sHit),
      { note: "Re-flashing an existing unit. Replacing the skylight itself costs considerably more." });
  }
  if (input.chimneys > 0) {
    const cHit = price.require("penetration.chimney-flash.each");
    push("addon.chimneys", "Chimney flashing rebuild", "addon",
      scale(cHit.triple, input.chimneys), `${input.chimneys} x $${cHit.triple.typical} each`, refOf(cHit));
  }

  // Decking
  const deckSheets = isOverlay ? 0 : input.deckSheets;
  if (deckSheets > 0) {
    const dHit = price.require("deck.sheet-replacement.each");
    push("material.decking", "Decking replacement allowance", "material",
      scale(dHit.triple, deckSheets), `${deckSheets} sheets x $${dHit.triple.typical} each`, refOf(dHit),
      { note: "An allowance, not a measurement. Deck condition is only known once the old roof is off - make sure your contract states the per-sheet price beyond this." });
  }
  if (isOverlay) {
    warnings.push("An overlay hides the deck. You will not know its condition, and most codes prohibit a third layer, so the next replacement will be a full tear-off.");
  }

  // -- 3. Labour -----------------------------------------------------------
  const laborHit = price.require("labor.rate_per_hour");
  const relayHandling = isTileRelay ? factor("labor.tile_relay_handling", 1.15) : 1;
  const installHours = squares * material.laborHoursPerSquare * relayHandling;

  const tearOffBase = factor("tearoff.hours_per_square_per_layer", 0.85);
  const weightRatio = existingMaterial.weightLbsPerSquare / 250;
  const layers = isOverlay ? 0 : isTileRelay ? 1 : input.existingLayers;
  const tearOffHours = squares * tearOffBase * Math.max(0.6, weightRatio) * layers;

  const detailHours = squares * factor("labor.detail_hours_per_square", 0.35);

  const laborMultiplier =
    factor(`pitch.${input.pitch}.labor`) *
    factor(`stories.${input.stories}.labor`) *
    factor(`complexity.${input.complexity}.labor`) *
    factor(`access.${input.access}.labor`);

  const laborHours = (installHours + tearOffHours + detailHours) * laborMultiplier;

  push("labor.install", isTileRelay ? "Tile removal, re-set and dry-in labour" : "Installation labour",
    "labor", scale(laborHit.triple, (installHours + detailHours) * laborMultiplier),
    `${((installHours + detailHours) * laborMultiplier).toFixed(0)} crew hours x $${laborHit.triple.typical}/hr`,
    refOf(laborHit),
    { note: `Site factors applied: pitch x${factor(`pitch.${input.pitch}.labor`)}, storeys x${factor(`stories.${input.stories}.labor`)}, roof shape x${factor(`complexity.${input.complexity}.labor`)}, access x${factor(`access.${input.access}.labor`)}.` });

  if (tearOffHours > 0) {
    push("labor.tearoff", `Tear-off (${layers} layer${layers === 1 ? "" : "s"})`, "labor",
      scale(laborHit.triple, tearOffHours * laborMultiplier),
      `${(tearOffHours * laborMultiplier).toFixed(0)} crew hours x $${laborHit.triple.typical}/hr`,
      refOf(laborHit));
  }

  // -- 4/5. Equipment and disposal ----------------------------------------
  const tearOffTons = isOverlay
    ? 0
    : (squares * existingMaterial.weightLbsPerSquare * (isTileRelay ? factor("material.tile_breakage_allowance", 0.12) : input.existingLayers)) / 2000;

  if (input.includeDisposal && tearOffTons > 0) {
    const containers = Math.max(1, Math.ceil(tearOffTons / 3));
    const eqHit = price.require("equipment.dumpster-haul.each");
    push("equipment.container", `Roll-off container${containers > 1 ? "s" : ""} (delivery and haul)`,
      "equipment", scale(eqHit.triple, containers),
      `${containers} container${containers > 1 ? "s" : ""} for ${tearOffTons.toFixed(1)} tons of debris`, refOf(eqHit));

    const tipHit = price.require("disposal.tipping_per_ton");
    push("disposal.tipping", "Landfill / transfer station fees", "disposal",
      scale(tipHit.triple, tearOffTons), `${tearOffTons.toFixed(1)} tons x $${tipHit.triple.typical}/ton`,
      refOf(tipHit));
  }

  // -- 6. Permit -----------------------------------------------------------
  if (input.includePermit) {
    const pHit = price.require("permit.flat_allowance");
    push("permit.allowance", "Permit allowance", "permit", pHit.triple,
      ctx.geo.city ? `Modelled allowance for ${ctx.geo.city.name}` : "National allowance", refOf(pHit),
      { note: "Permit fees are set by the authority having jurisdiction and are knowable exactly. Confirm the real fee for your address." });
  }

  // -- 7. Add-ons ----------------------------------------------------------
  if (input.gutterLf && input.gutterLf > 0) {
    const gHit = price.require("addon.gutter-replacement.per_lf");
    push("addon.gutters", "Gutter replacement", "addon", scale(gHit.triple, input.gutterLf),
      `${input.gutterLf} linear ft x $${gHit.triple.typical}/ft`, refOf(gHit), { optional: true });
  }
  if (input.addons.includes("solar-ready-conduit")) {
    const sHit = price.require("addon.solar-ready-conduit.each");
    push("addon.solar-ready", "Solar-ready provisions", "addon", sHit.triple,
      "One-off allowance while the roof is open", refOf(sHit), { optional: true });
  }

  // -- 8. Overhead and profit ---------------------------------------------
  // Adding every line item's low together, and every high together, describes a
  // job where EVERY component simultaneously came in at its best or worst case.
  // No real roof does that. We combine component uncertainties in quadrature,
  // which assumes they are partly independent - the same reasoning an estimator
  // uses when they do not stack contingencies. The straight-sum bounds are kept
  // for the breakdown table, where a per-component range is what you want.
  const straightSum = addTriples(...lineItems.map((l) => ({ low: l.low, typical: l.typical, high: l.high })));
  const devLowSq = lineItems.reduce((a, l) => a + (l.typical - l.low) ** 2, 0);
  const devHighSq = lineItems.reduce((a, l) => a + (l.high - l.typical) ** 2, 0);
  const directCost: PriceTriple = {
    low: straightSum.typical - Math.sqrt(devLowSq),
    typical: straightSum.typical,
    high: straightSum.typical + Math.sqrt(devHighSq),
  };
  const warrantyMult = factor(`warranty.${input.warranty}.adder`, 1);
  const oh = {
    low: factor("overhead.low", 1.2),
    typical: factor("overhead.typical", 1.32),
    high: factor("overhead.high", 1.48),
  };

  const total: PriceTriple = {
    low: directCost.low * oh.low * warrantyMult,
    typical: directCost.typical * oh.typical * warrantyMult,
    high: directCost.high * oh.high * warrantyMult,
  };
  const overheadAndProfit: PriceTriple = {
    low: total.low - directCost.low,
    typical: total.typical - directCost.typical,
    high: total.high - directCost.high,
  };

  const range: PriceTriple = {
    low: round50(total.low), typical: round50(total.typical), high: round50(total.high),
  };

  // -- Subtotals -----------------------------------------------------------
  const subtotals = (Object.keys(COMPONENT_LABEL) as CostComponent[])
    .map((component) => {
      const items = lineItems.filter((l) => l.component === component);
      if (!items.length && component !== "overhead") return null;
      const t = component === "overhead"
        ? overheadAndProfit
        : addTriples(...items.map((l) => ({ low: l.low, typical: l.typical, high: l.high })));
      return { component, label: COMPONENT_LABEL[component], ...t };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.typical > 0);

  // -- Assumptions ---------------------------------------------------------
  assumptions.push(
    { label: "Material", value: material.name, note: material.notes },
    { label: "Job type", value: projectType.name, note: projectType.description },
    { label: "Roof squares", value: `${squares.toFixed(1)} squares`, note: "One square = 100 sq ft of roof surface." },
    { label: "Waste factor", value: `${Math.round((wasteFactor - 1) * 100)}%`, assumed: !provided.has("complexity"), note: `Applied to covering and underlayment for a ${input.complexity.replace("-", " ")} roofline.` },
    { label: "Crew hours", value: `${laborHours.toFixed(0)} hours`, note: "Install, tear-off and detail work combined, after site factors." },
    { label: "Overhead and profit", value: `${Math.round((oh.low - 1) * 100)}% to ${Math.round((oh.high - 1) * 100)}%`, note: "A real cost of a licensed, insured, warrantied contractor - not a negotiating margin." },
    { label: "How the range is built", value: "Combined in quadrature", note: "Component uncertainties are combined assuming partial independence rather than stacked, because no real job comes in worst-case on every single line at once." },
  );
  if (input.warranty !== "standard") {
    assumptions.push({ label: "Warranty", value: warrantyLabel(input.warranty), note: `Adds about ${Math.round((warrantyMult - 1) * 100)}% to the job.` });
  }

  // -- Confidence ----------------------------------------------------------
  const bestLevel = price.bestLevel();
  const newestEffective = price.used
    .map((h) => h.record.effectiveDate)
    .sort()
    .at(-1) ?? new Date().toISOString().slice(0, 10);
  const monthsOld = monthsBetween(new Date(newestEffective), ctx.now);

  const missing = OPTIONAL_DETAIL_FIELDS.filter((f) => !provided.has(f));
  const confidence = scoreConfidence({
    bestLevel,
    dataAgeMonths: monthsOld,
    inputCompleteness: 1 - missing.length / OPTIONAL_DETAIL_FIELDS.length,
    missingInputs: missing.map(prettyField),
    hits: price.used,
    sources,
    range,
    geoIsFallback: ctx.geo.isFallback,
  });

  const containsSample = price.used.some((h) => h.record.dataStatus === "sample");
  const collected = price.used.map((h) => h.record.collectedDate).sort().at(-1) ?? newestEffective;

  return {
    engineVersion: ROOFING_ENGINE_VERSION,
    serviceId: ctx.service.id,
    serviceSlug: ctx.service.slug,
    currency: "USD",
    range,
    midpoint: round50((range.low + range.high) / 2),
    perSquare: {
      low: Math.round(range.low / squares), typical: Math.round(range.typical / squares),
      high: Math.round(range.high / squares),
    },
    lineItems,
    subtotals,
    directCost,
    directCostStraightSum: straightSum,
    overheadAndProfit,
    assumptions,
    derived: {
      roofSurfaceSqft: Math.round(roofSurfaceSqft),
      squares: Number(squares.toFixed(1)),
      materialSquares: Number(materialSquares.toFixed(1)),
      wasteFactor,
      laborHours: Math.round(laborHours),
      tearOffTons: Number(tearOffTons.toFixed(2)),
      laborMultiplier: Number(laborMultiplier.toFixed(3)),
      pitchAreaFactor: pitchArea,
      materialSlug: material.slug,
      projectTypeSlug: projectType.slug,
    },
    confidence,
    geo: { ...ctx.geo, bestLevel },
    freshness: {
      effectiveDate: newestEffective,
      collectedDate: collected,
      monthsOld,
      containsSampleData: containsSample,
      label: formatMonth(newestEffective),
    },
    warnings,
  };
}

function underlaymentLabel(key: RoofingInput["underlayment"]) {
  return key === "felt-15" ? "15 lb felt underlayment"
    : key === "synthetic" ? "Synthetic underlayment"
      : "Self-adhered underlayment (secondary water barrier)";
}

function warrantyLabel(key: RoofingInput["warranty"]) {
  return key === "extended-labor" ? "Extended workmanship warranty"
    : key === "system" ? "Manufacturer system warranty" : "Manufacturer standard";
}

function prettyField(f: string) {
  return f.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).toLowerCase();
}

function monthsBetween(from: Date, to: Date) {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

export function formatMonth(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
