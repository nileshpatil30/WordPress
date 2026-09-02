import type { ZipCode } from "@/lib/types";

type ZipSeed = {
  code: string;
  county: string;
  pageEligible?: boolean;
  content?: ZipCode["content"];
};

/**
 * ZIP -> city membership is factual reference data. The *pricing* attached to a
 * ZIP is not; that lives in pricing_records and falls back up the geo chain.
 *
 * `pageEligible` is deliberately rare. A ZIP earns an indexable page only when
 * there is something true and specific to say about it that the city page does
 * not already say. Every other ZIP still works in the calculator - it simply
 * resolves to its city.
 */
const byCity: Record<string, { stateId: string; zips: ZipSeed[] }> = {
  "city-phoenix": {
    stateId: "us-az",
    zips: [
      {
        code: "85018", county: "Maricopa", pageEligible: true,
        content: {
          summary:
            "85018 covers Arcadia and the Camelback corridor, where lot values are high and the housing stock is unusually mixed: 1950s ranch homes sitting next to substantial rebuilds. Roofing quotes here vary more than in tract-built parts of the Valley because the roofs themselves vary more.",
          housingStock:
            "Mid-century ranch homes with low-slope or shallow-pitch roofs, many with foam or modified bitumen sections, alongside newer custom builds with concrete or clay tile.",
          notes: [
            { title: "Mixed roof systems on one house are common", body: "A single Arcadia home often has a sloped tile or shingle section and a flat foam section over a patio or addition. Those are two trades and should be two clearly separated line items in a quote." },
            { title: "Expect higher-end material specification", body: "Product selection in this area skews toward premium tile and standing seam, which raises the material line well above the Phoenix median without indicating an inflated quote." },
          ],
        },
      },
      {
        code: "85085", county: "Maricopa", pageEligible: true,
        content: {
          summary:
            "85085 covers Desert Ridge and Norterra, built out largely from the late 1990s onward. The dominant roof here is builder-installed concrete tile now reaching the age where the underlayment beneath it, not the tile itself, has failed.",
          housingStock:
            "Two-storey tract and semi-custom homes from roughly 1998-2015, predominantly concrete tile on moderate pitches with relatively simple rooflines.",
          notes: [
            { title: "The typical job is underlayment replacement, not new tile", body: "Original builder underlayment in this cohort is at or past end of life while the tile is still serviceable. Quotes should be structured as a lift-and-relay with a stated breakage allowance." },
            { title: "Simple rooflines keep labour predictable", body: "Compared with custom-home neighbourhoods, plane counts here are low and access is good, which narrows the plausible spread between competing quotes." },
          ],
        },
      },
      { code: "85003", county: "Maricopa" }, { code: "85008", county: "Maricopa" },
      { code: "85016", county: "Maricopa" }, { code: "85032", county: "Maricopa" },
      { code: "85045", county: "Maricopa" },
    ],
  },
  "city-dallas": {
    stateId: "us-tx",
    zips: [
      {
        code: "75214", county: "Dallas", pageEligible: true,
        content: {
          summary:
            "75214 covers Lakewood and the M Streets, an older, high-value part of Dallas with steeper and more complex rooflines than the suburban norm. Combined with the DFW hail environment, that makes this one of the ZIP codes where quote spreads are widest.",
          housingStock:
            "Pre-war Tudors and bungalows plus substantial post-2000 rebuilds. Steep pitches, multiple dormers, and slate or slate-look products on some homes.",
          notes: [
            { title: "Pitch and plane count push labour well above the metro median", body: "Steep, cut-up Tudor rooflines take materially more crew hours per square than a simple gable. A quote here that matches a Plano tract-home quote is the one worth questioning." },
            { title: "Insurance claims dominate the replacement cycle", body: "Most replacements in this area follow a hail event. Your insurer's scope document is the reference point competing quotes should be normalised against." },
          ],
        },
      },
      {
        code: "75248", county: "Dallas", pageEligible: true,
        content: {
          summary:
            "75248 sits in Far North Dallas, largely built out in the 1970s and 1980s. Roofs here are mostly straightforward asphalt on moderate pitches, and a high share of replacements are second- or third-generation, so existing layer counts matter.",
          housingStock:
            "Two-storey traditional homes from roughly 1972-1990 with moderate pitches, attached garages and generally good street access for staging.",
          notes: [
            { title: "Check the existing layer count before comparing quotes", body: "Homes of this vintage sometimes carry a second layer from an earlier overlay. Two layers roughly doubles tear-off labour and disposal tonnage, and is the single most common reason two quotes on the same house differ." },
            { title: "Class 4 upgrades are widely quoted here", body: "Impact-resistant shingles are a standard upsell in this corridor. Confirm the insurance discount with your carrier before paying the premium." },
          ],
        },
      },
      { code: "75201", county: "Dallas" }, { code: "75204", county: "Dallas" },
      { code: "75218", county: "Dallas" }, { code: "75230", county: "Dallas" },
    ],
  },
  "city-houston": {
    stateId: "us-tx",
    zips: [
      {
        code: "77008", county: "Harris", pageEligible: true,
        content: {
          summary:
            "77008 covers the Heights, where a century-old housing stock sits alongside dense new townhome construction. The two produce completely different roofing jobs, and the older cohort carries the highest decking-risk of anywhere in this launch set.",
          housingStock:
            "1910s-1940s bungalows with original or repeatedly patched decking, plus three-storey townhomes with small, steep, complex roof areas.",
          notes: [
            { title: "Decking replacement is the dominant cost variable", body: "Century-old sheathing in a humid climate frequently fails inspection at tear-off. Insist on a per-sheet price and an included sheet count in every quote you compare." },
            { title: "Townhome roofs are small but expensive per square", body: "Three storeys, tight access and a high proportion of flashing and detail work mean the cost per square is far above a single-storey equivalent. Do not compare a townhome quote to a bungalow quote on price per square." },
          ],
        },
      },
      {
        code: "77024", county: "Harris", pageEligible: true,
        content: {
          summary:
            "77024 covers Memorial, a low-density, heavily wooded, high-value area. Tree cover and long private drives change both the risk profile and the logistics of a roof replacement here.",
          housingStock:
            "Large single-family homes on wooded lots, many with complex rooflines, multiple planes, and significant tile or standing-seam metal.",
          notes: [
            { title: "Tree cover accelerates roof ageing and complicates access", body: "Overhanging limbs mean debris, moss and impact damage, and they restrict where a dumpster and material can be staged. Both show up in labour hours." },
            { title: "Complex rooflines widen the plausible range", body: "High plane counts, valleys and dormers mean waste factors and flashing quantities rise. Satellite-measured quotes are least reliable on roofs like these." },
          ],
        },
      },
      { code: "77002", county: "Harris" }, { code: "77042", county: "Harris" },
      { code: "77077", county: "Harris" }, { code: "77080", county: "Harris" },
    ],
  },
  "city-austin": {
    stateId: "us-tx",
    zips: [
      {
        code: "78704", county: "Travis", pageEligible: true,
        content: {
          summary:
            "78704 covers South Austin around Zilker and Bouldin, where small original bungalows sit next to modern infill builds with low-slope and mixed-material roofs. Lot constraints are the defining local cost factor.",
          housingStock:
            "1930s-1960s bungalows on small lots, plus contemporary infill with flat membrane sections, standing-seam metal and mixed-pitch designs.",
          notes: [
            { title: "Staging space is genuinely scarce", body: "Narrow lots, mature trees and street parking restrictions can mean no dumpster on site, hand-loading, or permit-controlled placement. This adds hours that a satellite quote will not have priced." },
            { title: "Mixed-material roofs need line-item quotes", body: "A modern infill house may combine standing seam, membrane and shingle on one structure. Insist that each system is quoted separately or comparison is impossible." },
          ],
        },
      },
      {
        code: "78759", county: "Travis", pageEligible: true,
        content: {
          summary:
            "78759 covers the Arboretum and Northwest Hills area, built mainly between the mid-1970s and 1990s. Roofs are conventional asphalt on moderate to steep pitches, and terrain is the local variable.",
          housingStock:
            "Two-storey traditional homes on sloped, hilly lots, moderate to steep pitches, generally simple to moderate plane counts.",
          notes: [
            { title: "Hillside lots raise access cost", body: "Steep driveways and split-level entries limit where trucks and dumpsters can sit. Expect a modest but real access premium relative to flat-lot Austin quotes." },
            { title: "Original 1980s roofs often carry an overlay", body: "Check whether a previous owner overlaid rather than tore off. A second layer materially changes both labour and disposal." },
          ],
        },
      },
      { code: "78701", county: "Travis" }, { code: "78735", county: "Travis" },
      { code: "78745", county: "Travis" }, { code: "78749", county: "Travis" },
    ],
  },
  "city-san-diego": {
    stateId: "us-ca",
    zips: [
      {
        code: "92109", county: "San Diego", pageEligible: true,
        content: {
          summary:
            "92109 covers Pacific Beach and Mission Beach, directly on the coast. Salt exposure and dense, constrained lots make this one of the more expensive San Diego ZIPs for equivalent roof area.",
          housingStock:
            "Dense mix of small single-family homes, duplexes and low-rise multi-unit buildings, many with flat or low-slope membrane roofs.",
          notes: [
            { title: "Corrosion resistance is a specification issue, not an upsell", body: "Within this distance of the ocean, fastener, flashing and edge-metal metallurgy materially affects service life. A cheaper quote using standard galvanised components is not equivalent." },
            { title: "Low-slope membrane dominates", body: "Much of the stock has flat or near-flat roofs requiring membrane systems, which are priced per square foot with detailing costs that scale with penetrations and parapets rather than with area." },
          ],
        },
      },
      {
        code: "92127", county: "San Diego", pageEligible: true,
        content: {
          summary:
            "92127 covers 4S Ranch and the northern Rancho Bernardo area, master-planned and built largely after 1998. Concrete tile on relatively uniform rooflines makes this one of the more predictable ZIPs to estimate.",
          housingStock:
            "Two-storey master-planned homes from roughly 1998-2012, predominantly concrete tile, moderate pitch, simple to moderate complexity.",
          notes: [
            { title: "Uniform stock means tighter quote spreads", body: "Because homes in a given tract are near-identical, contractors quote them accurately and competing quotes should cluster. A significant outlier here deserves an explanation." },
            { title: "Underlayment, not tile, is what is failing", body: "This cohort is reaching the age where original underlayment fails. Expect lift-and-relay scopes and check the breakage allowance." },
          ],
        },
      },
      { code: "92101", county: "San Diego" }, { code: "92104", county: "San Diego" },
      { code: "92122", county: "San Diego" }, { code: "92131", county: "San Diego" },
    ],
  },
  "city-los-angeles": {
    stateId: "us-ca",
    zips: [
      {
        code: "90042", county: "Los Angeles", pageEligible: true,
        content: {
          summary:
            "90042 covers Highland Park and parts of Eagle Rock, hillside neighbourhoods with pre-war housing stock. Old wood shake beneath later roofs and difficult access are the two things that most often make quotes here higher than owners expect.",
          housingStock:
            "1910s-1940s Craftsman and Spanish-revival homes on sloped streets, frequently with skip sheathing under later roof layers.",
          notes: [
            { title: "Skip sheathing usually means a full re-deck", body: "Homes originally roofed in wood shake have spaced boards rather than solid decking. Modern roofing needs a solid deck, so a full sheet of new sheathing is often unavoidable and should be quoted explicitly." },
            { title: "Hillside access adds real hours", body: "Narrow streets, no driveway staging and long carries change the labour line significantly. A contractor who has not visited the property cannot price this." },
          ],
        },
      },
      {
        code: "91316", county: "Los Angeles", pageEligible: true,
        content: {
          summary:
            "91316 covers Encino in the San Fernando Valley, where larger lots, tile roofs and proximity to designated fire hazard areas all shape the specification.",
          housingStock:
            "Post-war ranch homes and larger rebuilt properties, substantial concrete and clay tile, generally good access on flat streets.",
          notes: [
            { title: "Check whether the parcel sits in a fire hazard severity zone", body: "Where wildland-urban interface provisions apply, a Class A assembly and ember-resistant vent detailing are code requirements. This constrains product choice and raises cost, and it is not optional." },
            { title: "Tile weight limits material switching", body: "Moving from tile to a lighter product is straightforward structurally; moving to tile from a lighter product may need engineering review." },
          ],
        },
      },
      { code: "90026", county: "Los Angeles" }, { code: "90045", county: "Los Angeles" },
      { code: "90066", county: "Los Angeles" }, { code: "91406", county: "Los Angeles" },
    ],
  },
  "city-las-vegas": {
    stateId: "us-nv",
    zips: [
      {
        code: "89135", county: "Clark", pageEligible: true,
        content: {
          summary:
            "89135 covers Summerlin South, master-planned and built largely after 2000. Tile roofs on relatively uniform homes make estimating predictable, and HOA architectural rules constrain material choice more than in most of the Valley.",
          housingStock:
            "Two-storey master-planned homes from roughly 2000-2018, predominantly concrete tile with some clay, moderate pitch.",
          notes: [
            { title: "HOA approval can constrain product and colour", body: "Architectural committees in master-planned communities often restrict profile and colour. Confirm approval before signing, because a compliant alternative may cost more than the quoted product." },
            { title: "Underlayment life is the binding constraint", body: "In this climate the original underlayment reaches end of life well before the tile does. Expect lift-and-relay scopes with a high-temperature underlayment upgrade offered." },
          ],
        },
      },
      {
        code: "89102", county: "Clark", pageEligible: true,
        content: {
          summary:
            "89102 covers older central Las Vegas, where mid-century homes with low-slope roofs are common. Foam and membrane systems, rather than tile, dominate the replacement market here.",
          housingStock:
            "1950s-1970s single-storey homes, many with flat or very low-slope roofs, frequently already carrying foam or built-up systems.",
          notes: [
            { title: "Foam roofs carry a recoat obligation", body: "Sprayed polyurethane foam performs well here but needs periodic recoating to maintain the warranty. Price the recoat cycle into any comparison against a one-and-done system." },
            { title: "Existing system determines the options", body: "What is already on a low-slope roof - foam, built-up, modified bitumen - constrains what can be installed over it. Ask each contractor what they found and why they chose their approach." },
          ],
        },
      },
      { code: "89117", county: "Clark" }, { code: "89123", county: "Clark" },
      { code: "89129", county: "Clark" }, { code: "89147", county: "Clark" },
    ],
  },
  "city-tampa": {
    stateId: "us-fl",
    zips: [
      {
        code: "33629", county: "Hillsborough", pageEligible: true,
        content: {
          summary:
            "33629 covers Palma Ceia and the surrounding South Tampa neighbourhoods: high property values, older housing stock, and coastal flood and wind exposure that raises both the code requirements and the insurance stakes.",
          housingStock:
            "1920s-1950s bungalows and Mediterranean-revival homes alongside substantial new construction, mixed tile, shingle and metal.",
          notes: [
            { title: "Insurance consequences are larger here than the roof price", body: "In high-value coastal-adjacent South Tampa, roof age and documented wind-resistant features affect insurability directly. A wind mitigation inspection after replacement is worth arranging." },
            { title: "Older stock means code-upgrade exposure", body: "Bringing an older roof assembly to current requirements can add work that a homeowner did not anticipate. Ask each contractor what code upgrades they have included." },
          ],
        },
      },
      {
        code: "33647", county: "Hillsborough", pageEligible: true,
        content: {
          summary:
            "33647 covers New Tampa, built out largely between the mid-1990s and 2010s. It is the clearest example in this metro of a large cohort of original builder roofs reaching replacement age simultaneously.",
          housingStock:
            "Two-storey tract and semi-custom homes from roughly 1994-2012, mostly architectural asphalt shingle with some tile, simple to moderate rooflines.",
          notes: [
            { title: "Concentrated replacement demand affects scheduling", body: "When a whole subdivision's roofs age out together, local crew capacity tightens. Booking outside storm season is the practical lever." },
            { title: "Ventilation is worth checking at replacement", body: "Inadequate attic ventilation shortens shingle life in this climate. Replacement is the moment to fix it, and it should appear as a specific line item." },
          ],
        },
      },
      { code: "33602", county: "Hillsborough" }, { code: "33606", county: "Hillsborough" },
      { code: "33611", county: "Hillsborough" }, { code: "33624", county: "Hillsborough" },
    ],
  },
  "city-orlando": {
    stateId: "us-fl",
    zips: [
      {
        code: "32819", county: "Orange", pageEligible: true,
        content: {
          summary:
            "32819 covers Dr. Phillips and the Bay Hill area, a higher-value part of Orlando with larger homes, more tile, and more complex rooflines than the metro norm.",
          housingStock:
            "Large single-family homes from the 1980s onward, substantial concrete and clay tile, higher plane counts, some flat sections over lanais.",
          notes: [
            { title: "Tile and shingle sections on one roof are common", body: "Many homes combine a tile main roof with a flat or low-slope section over a lanai or pool enclosure. These are separate systems and belong on separate quote lines." },
            { title: "Complexity widens the plausible range", body: "More planes, valleys and penetrations mean higher waste factors and more flashing labour. Expect a wider spread between competing quotes than in tract housing." },
          ],
        },
      },
      {
        code: "32828", county: "Orange", pageEligible: true,
        content: {
          summary:
            "32828 covers Waterford Lakes and the eastern Orlando suburbs, built out predominantly in the 1990s and 2000s with straightforward asphalt roofs on simple plans.",
          housingStock:
            "Single and two-storey tract homes from roughly 1993-2008, architectural or three-tab asphalt shingle, simple rooflines, good access.",
          notes: [
            { title: "This is the most predictable estimating profile in the metro", body: "Uniform tract housing with simple rooflines and easy access means competing quotes should cluster tightly. A wide spread here usually reflects a scope difference, not a market difference." },
            { title: "Original three-tab roofs are being replaced with architectural", body: "Most homes in this cohort were built with entry-level shingles. The upgrade to architectural is modest in cost and standard practice at replacement." },
          ],
        },
      },
      { code: "32801", county: "Orange" }, { code: "32803", county: "Orange" },
      { code: "32806", county: "Orange" }, { code: "32835", county: "Orange" },
    ],
  },
  "city-miami": {
    stateId: "us-fl",
    zips: [
      {
        code: "33133", county: "Miami-Dade", pageEligible: true,
        content: {
          summary:
            "33133 covers Coconut Grove, an older, heavily wooded and high-value part of Miami sitting fully inside the high-velocity hurricane zone. Compliance cost, tree cover and property value all push quotes here to the top of the metro range.",
          housingStock:
            "1920s-1950s homes alongside modern rebuilds, extensive clay and concrete tile, mature tree canopy, many complex rooflines.",
          notes: [
            { title: "HVHZ product approval narrows the options", body: "Products need a Miami-Dade Notice of Acceptance or equivalent Florida Product Approval valid for high-velocity hurricane zone use. Ask for the specific approval number covering the system quoted." },
            { title: "Tree canopy complicates access and adds debris", body: "Mature canopy restricts staging, requires more careful material handling, and means more frequent maintenance between replacements." },
          ],
        },
      },
      {
        code: "33186", county: "Miami-Dade", pageEligible: true,
        content: {
          summary:
            "33186 covers the Kendall area of unincorporated Miami-Dade, a large suburban cohort built substantially in the 1980s and post-Hurricane Andrew. Post-1992 construction and code changes make this a distinctly different estimating profile from older Miami.",
          housingStock:
            "Single and two-storey suburban homes, a large share built or re-roofed after 1992 to strengthened standards, mixed barrel tile and shingle.",
          notes: [
            { title: "Post-Andrew construction changes the baseline", body: "Homes built or re-roofed after the code changes that followed Hurricane Andrew in 1992 often already meet stronger attachment standards, which can reduce the upgrade work at replacement." },
            { title: "Unincorporated county permitting applies", body: "This area is permitted by Miami-Dade County rather than a municipality. Confirm which office your contractor is pulling the permit through." },
          ],
        },
      },
      { code: "33125", county: "Miami-Dade" }, { code: "33137", county: "Miami-Dade" },
      { code: "33145", county: "Miami-Dade" }, { code: "33176", county: "Miami-Dade" },
    ],
  },

  // -- Northeast: membership data only, no page-eligible ZIPs ---------------
  // These make the calculator work for a Northeast homeowner today. Every one
  // is pageEligible: false, so none of them produces an indexable page.
  "city-newark": {
    stateId: "us-nj",
    zips: [
      { code: "07102", county: "Essex" }, { code: "07104", county: "Essex" },
      { code: "07106", county: "Essex" }, { code: "07107", county: "Essex" },
    ],
  },
  "city-jersey-city": {
    stateId: "us-nj",
    zips: [
      { code: "07302", county: "Hudson" }, { code: "07304", county: "Hudson" },
      { code: "07305", county: "Hudson" }, { code: "07306", county: "Hudson" },
    ],
  },
  "city-cherry-hill": {
    stateId: "us-nj",
    zips: [
      { code: "08002", county: "Camden" }, { code: "08003", county: "Camden" },
      { code: "08034", county: "Camden" },
    ],
  },
  "city-philadelphia": {
    stateId: "us-pa",
    zips: [
      { code: "19103", county: "Philadelphia" }, { code: "19125", county: "Philadelphia" },
      { code: "19147", county: "Philadelphia" }, { code: "19128", county: "Philadelphia" },
    ],
  },
  "city-boston": {
    stateId: "us-ma",
    zips: [
      { code: "02116", county: "Suffolk" }, { code: "02130", county: "Suffolk" },
      { code: "02132", county: "Suffolk" }, { code: "02135", county: "Suffolk" },
    ],
  },
};

export const zipCodes: ZipCode[] = Object.entries(byCity).flatMap(([cityId, cfg]) =>
  cfg.zips.map((z) => ({
    id: `zip-${z.code}`,
    countryId: "us",
    stateId: cfg.stateId,
    cityId,
    code: z.code,
    county: z.county,
    pageEligible: z.pageEligible ?? false,
    content: z.content,
  })),
);
