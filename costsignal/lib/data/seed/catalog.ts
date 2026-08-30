import type { Material, ProjectType, Service } from "@/lib/types";

/**
 * The service catalogue. Only roofing is `live` in Phase 1.
 *
 * Adding a service means: (1) add a row here with an `engineKey`, (2) add a
 * module under lib/engine/<key>/ implementing ServiceEngine, (3) register it in
 * lib/engine/registry.ts, (4) add materials + pricing rows. No routing, page or
 * component changes are required - the cost pages and calculator are driven by
 * `costPathSlug` and the engine's declared input schema.
 */
export const services: Service[] = [
  {
    id: "svc-roofing", slug: "roofing", costPathSlug: "roofing-cost",
    name: "Roof replacement", shortName: "Roofing", category: "exterior",
    unit: "square", engineKey: "roofing", status: "live", sortOrder: 1,
    description:
      "Full roof replacement including tear-off, underlayment, flashing, ventilation and disposal.",
  },
  // Planned. Present so the roadmap is data, and so the UI can show what is
  // coming without anyone hardcoding a list in a component.
  { id: "svc-solar", slug: "solar", costPathSlug: "solar-cost", name: "Solar panel installation", shortName: "Solar", category: "systems", unit: "watt", engineKey: "solar", status: "planned", sortOrder: 2, description: "Rooftop photovoltaic system installation, optionally with battery storage." },
  { id: "svc-hvac", slug: "hvac", costPathSlug: "hvac-cost", name: "HVAC replacement", shortName: "HVAC", category: "systems", unit: "ton", engineKey: "hvac", status: "planned", sortOrder: 3, description: "Air conditioning, furnace and heat pump replacement including ductwork." },
  { id: "svc-windows", slug: "windows", costPathSlug: "window-replacement-cost", name: "Window replacement", shortName: "Windows", category: "exterior", unit: "each", status: "planned", engineKey: "windows", sortOrder: 4, description: "Replacement windows, including frame type, glazing and installation method." },
  { id: "svc-siding", slug: "siding", costPathSlug: "siding-cost", name: "Siding replacement", shortName: "Siding", category: "exterior", unit: "sq_ft", engineKey: "siding", status: "planned", sortOrder: 5, description: "Exterior siding replacement including sheathing, house wrap and trim." },
  { id: "svc-kitchen", slug: "kitchen-remodel", costPathSlug: "kitchen-remodel-cost", name: "Kitchen remodel", shortName: "Kitchen", category: "interior", unit: "sq_ft", engineKey: "kitchen", status: "planned", sortOrder: 6, description: "Kitchen renovation from cosmetic refresh through full gut and reconfiguration." },
  { id: "svc-bathroom", slug: "bathroom-remodel", costPathSlug: "bathroom-remodel-cost", name: "Bathroom remodel", shortName: "Bathroom", category: "interior", unit: "sq_ft", engineKey: "bathroom", status: "planned", sortOrder: 7, description: "Bathroom renovation including fixtures, tile, plumbing and ventilation." },
];

export const projectTypes: ProjectType[] = [
  {
    id: "pt-full-replacement", serviceId: "svc-roofing", slug: "full-replacement",
    name: "Full replacement", scopeMultiplier: 1.0,
    description: "Remove the existing roof covering down to the deck and install a complete new roof system.",
  },
  {
    id: "pt-overlay", serviceId: "svc-roofing", slug: "overlay",
    name: "Overlay (second layer)", scopeMultiplier: 0.78,
    description:
      "Install new shingles over one existing layer without tearing off. Cheaper up front, but it hides deck condition, shortens service life, and most codes prohibit a third layer. Not permitted on all roofs.",
  },
  {
    id: "pt-tile-underlayment", serviceId: "svc-roofing", slug: "tile-underlayment",
    name: "Tile lift-and-relay (underlayment replacement)", scopeMultiplier: 0.72,
    description:
      "Remove and stack existing tile, replace the underlayment, then re-set the same tile with a breakage allowance. The standard job in tile markets such as Phoenix, Las Vegas and San Diego.",
  },
  {
    id: "pt-partial", serviceId: "svc-roofing", slug: "partial-replacement",
    name: "Partial replacement (one slope or section)", scopeMultiplier: 0.55,
    description:
      "Replace a defined section rather than the whole roof. Cost per square is higher than a full replacement because mobilisation, permits and setup are spread over less area.",
  },
];

/**
 * Material physical properties are MODELED from published manufacturer and
 * trade-reference figures. They drive disposal tonnage and labour hours, so
 * they are engineering inputs, not marketing copy. Prices live separately in
 * pricing_records so a price update never touches this table.
 */
export const materials: Material[] = [
  {
    id: "mat-asphalt-3tab", serviceId: "svc-roofing", slug: "asphalt-3tab",
    name: "3-tab asphalt shingle", family: "asphalt", tier: "economy", unit: "square",
    expectedLifeYearsMin: 12, expectedLifeYearsMax: 20,
    weightLbsPerSquare: 215, laborHoursPerSquare: 1.4, sortOrder: 1, status: "live",
    notes: "The entry-level option. Lower wind ratings and a flat appearance. Increasingly rare on new work as architectural shingles have converged in price.",
  },
  {
    id: "mat-asphalt-architectural", serviceId: "svc-roofing", slug: "asphalt-architectural",
    name: "Architectural asphalt shingle", family: "asphalt", tier: "standard", unit: "square",
    expectedLifeYearsMin: 20, expectedLifeYearsMax: 30,
    weightLbsPerSquare: 255, laborHoursPerSquare: 1.6, sortOrder: 2, status: "live",
    notes: "The default choice for most US replacements. Laminated construction, better wind ratings and a dimensional appearance.",
  },
  {
    id: "mat-impact-resistant-shingle", serviceId: "svc-roofing", slug: "impact-resistant-shingle",
    name: "Impact-resistant shingle (Class 4)", family: "asphalt", tier: "premium", unit: "square",
    expectedLifeYearsMin: 25, expectedLifeYearsMax: 35,
    weightLbsPerSquare: 290, laborHoursPerSquare: 1.7, sortOrder: 3, status: "live",
    notes: "Rated to UL 2218 Class 4 for impact. Relevant in hail markets, where many insurers offer a premium discount. Confirm the discount with your carrier before paying the upgrade.",
  },
  {
    id: "mat-asphalt-premium", serviceId: "svc-roofing", slug: "asphalt-premium",
    name: "Premium / designer asphalt shingle", family: "asphalt", tier: "premium", unit: "square",
    expectedLifeYearsMin: 25, expectedLifeYearsMax: 40,
    weightLbsPerSquare: 400, laborHoursPerSquare: 2.0, sortOrder: 4, status: "live",
    notes: "Heavier multi-layer shingles imitating slate or shake. Higher material cost and slower installation.",
  },
  {
    id: "mat-metal-exposed-fastener", serviceId: "svc-roofing", slug: "metal-exposed-fastener",
    name: "Exposed-fastener metal panel", family: "metal", tier: "standard", unit: "square",
    expectedLifeYearsMin: 25, expectedLifeYearsMax: 40,
    weightLbsPerSquare: 95, laborHoursPerSquare: 2.2, sortOrder: 5, status: "live",
    notes: "Corrugated or R-panel metal screwed through the face. Cheaper than standing seam; the exposed gaskets are the maintenance item.",
  },
  {
    id: "mat-metal-standing-seam", serviceId: "svc-roofing", slug: "metal-standing-seam",
    name: "Standing seam metal", family: "metal", tier: "luxury", unit: "square",
    expectedLifeYearsMin: 40, expectedLifeYearsMax: 60,
    weightLbsPerSquare: 125, laborHoursPerSquare: 4.5, sortOrder: 6, status: "live",
    notes: "Concealed-fastener metal panels. Roughly double the cost of architectural asphalt with two to three times the service life.",
  },
  {
    id: "mat-concrete-tile", serviceId: "svc-roofing", slug: "concrete-tile",
    name: "Concrete tile", family: "tile", tier: "premium", unit: "square",
    expectedLifeYearsMin: 40, expectedLifeYearsMax: 60,
    weightLbsPerSquare: 950, laborHoursPerSquare: 3.2, sortOrder: 7, status: "live",
    notes: "Dominant in the Southwest and much of Florida. The tile usually outlives the underlayment beneath it, which is why lift-and-relay is the common job.",
  },
  {
    id: "mat-clay-tile", serviceId: "svc-roofing", slug: "clay-tile",
    name: "Clay tile", family: "tile", tier: "luxury", unit: "square",
    expectedLifeYearsMin: 50, expectedLifeYearsMax: 75,
    weightLbsPerSquare: 900, laborHoursPerSquare: 3.8, sortOrder: 8, status: "live",
    notes: "Long-lived and heavy. Structural capacity must be confirmed when converting from a lighter material.",
  },
  {
    id: "mat-synthetic-slate", serviceId: "svc-roofing", slug: "synthetic-slate",
    name: "Synthetic slate / composite shake", family: "composite", tier: "luxury", unit: "square",
    expectedLifeYearsMin: 40, expectedLifeYearsMax: 50,
    weightLbsPerSquare: 250, laborHoursPerSquare: 3.0, sortOrder: 9, status: "live",
    notes: "Polymer products imitating slate or shake at a fraction of the weight. Avoids the structural questions natural slate raises.",
  },
  {
    id: "mat-natural-slate", serviceId: "svc-roofing", slug: "natural-slate",
    name: "Natural slate", family: "slate", tier: "luxury", unit: "square",
    expectedLifeYearsMin: 75, expectedLifeYearsMax: 150,
    weightLbsPerSquare: 1000, laborHoursPerSquare: 6.0, sortOrder: 10, status: "live",
    notes: "The longest-lived roof available and the most expensive. Requires a specialist installer and confirmed structural capacity.",
  },
  {
    id: "mat-cedar-shake", serviceId: "svc-roofing", slug: "cedar-shake",
    name: "Cedar shake", family: "wood", tier: "premium", unit: "square",
    expectedLifeYearsMin: 20, expectedLifeYearsMax: 35,
    weightLbsPerSquare: 300, laborHoursPerSquare: 4.0, sortOrder: 11, status: "live",
    notes: "Restricted or prohibited in many wildfire-exposed jurisdictions unless part of a rated assembly. Check local requirements first.",
  },
  {
    id: "mat-tpo-membrane", serviceId: "svc-roofing", slug: "tpo-membrane",
    name: "TPO single-ply membrane (low slope)", family: "membrane", tier: "standard", unit: "square",
    expectedLifeYearsMin: 15, expectedLifeYearsMax: 25,
    weightLbsPerSquare: 45, laborHoursPerSquare: 2.2, sortOrder: 12, status: "live",
    notes: "For flat and low-slope areas. Priced by area but the cost is driven by penetrations, parapets and detailing as much as by square footage.",
  },
  {
    id: "mat-modified-bitumen", serviceId: "svc-roofing", slug: "modified-bitumen",
    name: "Modified bitumen (low slope)", family: "membrane", tier: "economy", unit: "square",
    expectedLifeYearsMin: 12, expectedLifeYearsMax: 20,
    weightLbsPerSquare: 130, laborHoursPerSquare: 2.5, sortOrder: 13, status: "live",
    notes: "Torch-applied or self-adhered rolled roofing for low-slope areas. Common on older flat sections and additions.",
  },
  {
    id: "mat-spf-foam", serviceId: "svc-roofing", slug: "spf-foam",
    name: "Sprayed polyurethane foam with coating (low slope)", family: "foam", tier: "standard", unit: "square",
    expectedLifeYearsMin: 20, expectedLifeYearsMax: 30,
    weightLbsPerSquare: 40, laborHoursPerSquare: 1.8, sortOrder: 14, status: "live",
    notes: "Common on low-slope roofs in Arizona and Nevada. Requires periodic recoating to maintain the warranty - price the recoat cycle, not just the installation.",
  },
];
