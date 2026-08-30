import { z } from "zod";
import type { FormStep } from "../types";

export const roofingInputSchema = z.object({
  zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit US ZIP code"),
  projectType: z.enum(["full-replacement", "overlay", "tile-underlayment", "partial-replacement"])
    .default("full-replacement"),

  areaMode: z.enum(["roof", "house"]).default("house"),
  roofAreaSqft: z.number().min(100).max(30000).optional(),
  houseSqft: z.number().min(200).max(25000).optional(),
  stories: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),

  material: z.string().default("asphalt-architectural"),
  quality: z.enum(["builder", "standard", "premium"]).default("standard"),

  pitch: z.enum(["flat", "low", "moderate", "steep", "very-steep"]).default("moderate"),
  complexity: z.enum(["simple", "moderate", "complex", "very-complex"]).default("moderate"),
  planes: z.number().int().min(1).max(40).optional(),

  skylights: z.number().int().min(0).max(20).default(0),
  chimneys: z.number().int().min(0).max(5).default(0),

  existingLayers: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(1),
  existingMaterial: z.string().optional(),

  underlayment: z.enum(["felt-15", "synthetic", "peel-stick"]).default("synthetic"),
  flashing: z.enum(["standard", "full-replacement"]).default("standard"),
  ventilation: z.enum(["none", "ridge-vent", "static", "powered"]).default("ridge-vent"),
  ventilationQty: z.number().min(0).max(400).optional(),

  deckSheets: z.number().int().min(0).max(200).default(2),
  access: z.enum(["easy", "moderate", "difficult"]).default("easy"),
  warranty: z.enum(["standard", "extended-labor", "system"]).default("standard"),

  includePermit: z.boolean().default(true),
  includeDisposal: z.boolean().default(true),

  addons: z.array(z.enum(["gutter-replacement", "solar-ready-conduit"])).default([]),
  gutterLf: z.number().min(0).max(1000).optional(),
  partialSharePct: z.number().min(5).max(95).optional(),

  /** Filled by parse(); drives the "project detail supplied" confidence term. */
  providedFields: z.array(z.string()).optional(),
});

export type RoofingInput = z.infer<typeof roofingInputSchema>;

/** Inputs that meaningfully sharpen the estimate when supplied. */
export const OPTIONAL_DETAIL_FIELDS = [
  "roofAreaSqft", "planes", "skylights", "chimneys", "existingLayers", "existingMaterial",
  "underlayment", "flashing", "ventilation", "deckSheets", "access", "warranty", "quality",
] as const;

/**
 * Progressive disclosure: three visible steps get you a usable number, and the
 * two advanced steps let anyone who has a real quote in front of them match its
 * scope line for line.
 */
export const roofingSteps: FormStep[] = [
  {
    id: "location",
    title: "Where is the property?",
    description: "Labour rates, permit fees and disposal costs are local. This is the single biggest driver of what your roof costs.",
    fields: [
      { name: "zip", label: "ZIP code", type: "text", hint: "5 digits" },
    ],
  },
  {
    id: "size",
    title: "How big is the roof?",
    description: "If you do not know the roof area, give us the house size and we will work it out from the storey count and pitch.",
    fields: [
      {
        name: "areaMode", label: "I know my", type: "select",
        options: [
          { value: "house", label: "House size (square feet)", hint: "Most people know this one" },
          { value: "roof", label: "Roof area (square feet)", hint: "From a quote or measurement report" },
        ],
      },
      {
        name: "houseSqft", label: "House size", type: "number", suffix: "sq ft", min: 200, max: 25000,
        hint: "Total conditioned floor area, all storeys",
        showWhen: (v) => v.areaMode !== "roof",
      },
      {
        name: "roofAreaSqft", label: "Roof area", type: "number", suffix: "sq ft", min: 100, max: 30000,
        hint: "The actual roof surface, not the footprint",
        showWhen: (v) => v.areaMode === "roof",
      },
      {
        name: "stories", label: "Storeys", type: "select",
        options: [
          { value: "1", label: "Single storey" },
          { value: "2", label: "Two storeys" },
          { value: "3", label: "Three or more" },
        ],
      },
      {
        name: "pitch", label: "Roof pitch", type: "select",
        options: [
          { value: "flat", label: "Flat or nearly flat", hint: "0:12 to 2:12" },
          { value: "low", label: "Low slope", hint: "3:12 to 4:12, easy to walk" },
          { value: "moderate", label: "Moderate", hint: "5:12 to 7:12, the most common" },
          { value: "steep", label: "Steep", hint: "8:12 to 10:12, needs roof jacks" },
          { value: "very-steep", label: "Very steep", hint: "11:12 and above, needs staging" },
        ],
      },
    ],
  },
  {
    id: "system",
    title: "What is going on the roof?",
    description: "Material choice moves the price more than anything except size.",
    fields: [
      { name: "material", label: "Roofing material", type: "select", optionsFrom: "materials" },
      { name: "projectType", label: "Type of job", type: "select", optionsFrom: "projectTypes" },
      {
        name: "complexity", label: "Roof shape", type: "select",
        options: [
          { value: "simple", label: "Simple", hint: "Gable or hip, 2-4 planes, no dormers" },
          { value: "moderate", label: "Moderate", hint: "5-8 planes, a valley or two, maybe a dormer" },
          { value: "complex", label: "Complex", hint: "9+ planes, several valleys and dormers" },
          { value: "very-complex", label: "Very complex", hint: "Cut-up custom roof, turrets, lots of detail" },
        ],
      },
    ],
  },
  {
    id: "scope",
    title: "Scope details",
    description: "These are the line items that most often explain why two quotes on the same house differ.",
    advanced: true,
    fields: [
      {
        name: "existingLayers", label: "Existing roof layers to remove", type: "select",
        options: [
          { value: "0", label: "None - new construction or already stripped" },
          { value: "1", label: "One layer" },
          { value: "2", label: "Two layers" },
        ],
        hint: "Two layers roughly doubles tear-off labour and disposal tonnage",
      },
      { name: "existingMaterial", label: "Existing roof material", type: "select", optionsFrom: "materials", hint: "Determines disposal weight. Defaults to the new material." },
      {
        name: "underlayment", label: "Underlayment", type: "select",
        options: [
          { value: "felt-15", label: "15 lb felt", hint: "The old default" },
          { value: "synthetic", label: "Synthetic", hint: "The current default on most new work" },
          { value: "peel-stick", label: "Fully self-adhered", hint: "Secondary water barrier; required in some jurisdictions" },
        ],
      },
      {
        name: "flashing", label: "Flashing", type: "select",
        options: [
          { value: "standard", label: "Standard - reuse sound flashing" },
          { value: "full-replacement", label: "Full replacement including valley and counter-flashing" },
        ],
      },
      {
        name: "ventilation", label: "Ventilation", type: "select",
        options: [
          { value: "none", label: "Keep existing" },
          { value: "ridge-vent", label: "Continuous ridge vent" },
          { value: "static", label: "Static / turbine vents" },
          { value: "powered", label: "Powered attic ventilator" },
        ],
      },
      { name: "ventilationQty", label: "Ridge length or vent count", type: "number", hint: "Leave blank and we will estimate it from the roof size", showWhen: (v) => v.ventilation !== "none" },
      { name: "skylights", label: "Skylights to re-flash", type: "number", min: 0, max: 20 },
      { name: "chimneys", label: "Chimneys to re-flash", type: "number", min: 0, max: 5 },
      { name: "deckSheets", label: "Decking sheets allowed for", type: "number", min: 0, max: 200, hint: "4x8 sheets. Two is a normal allowance; older or humid-climate homes often need more." },
    ],
  },
  {
    id: "site",
    title: "Site, quality and extras",
    description: "Access and product grade are the two things satellite-measured quotes usually get wrong.",
    advanced: true,
    fields: [
      {
        name: "access", label: "Site access", type: "select",
        options: [
          { value: "easy", label: "Easy", hint: "Driveway staging, container next to the house" },
          { value: "moderate", label: "Moderate", hint: "Some carrying, restricted container placement" },
          { value: "difficult", label: "Difficult", hint: "Hillside, narrow street, no staging space, heavy tree cover" },
        ],
      },
      {
        name: "quality", label: "Product grade", type: "select",
        options: [
          { value: "builder", label: "Builder grade", hint: "Entry-level product in the chosen family" },
          { value: "standard", label: "Standard", hint: "Mid-range, the usual choice" },
          { value: "premium", label: "Premium", hint: "Top of line, heavier, longer warranty" },
        ],
      },
      {
        name: "warranty", label: "Warranty level", type: "select",
        options: [
          { value: "standard", label: "Manufacturer standard" },
          { value: "extended-labor", label: "Extended workmanship warranty" },
          { value: "system", label: "Manufacturer system warranty", hint: "Requires a certified installer and a full single-brand system" },
        ],
      },
      { name: "includePermit", label: "Include a permit allowance", type: "toggle" },
      { name: "includeDisposal", label: "Include tear-off disposal", type: "toggle" },
      { name: "gutterLf", label: "Gutter replacement", type: "number", suffix: "linear ft", min: 0, max: 1000, hint: "Optional. Leave blank if gutters are staying." },
    ],
  },
];
