import type { City } from "@/lib/types";

/**
 * Ten launch cities, each carrying hand-written local content, plus five
 * Northeast cities held back as unpublished data preparation.
 *
 * `isPublished` is the gate on indexable pages: a city with no editorial does
 * not get a page, no matter how much traffic the keyword has. This is the
 * difference between useful programmatic SEO and mass-generated SEO.
 *
 * That gate is also what makes the Northeast rows safe to commit. An
 * unpublished city is invisible to generateStaticParams, the sitemap and every
 * internal link, but it is fully visible to resolveGeo - so a Newark homeowner
 * using the calculator gets real New York metro wage data today, while no thin
 * page exists for anyone to find. Publishing is then a one-field change, made
 * only once the local editorial below it is actually written.
 */
export const cities: City[] = [
  {
    id: "city-phoenix", countryId: "us", stateId: "us-az", metroId: "metro-phx",
    name: "Phoenix", slug: "phoenix-az", population: 1650000,
    latitude: 33.4484, longitude: -112.074, isPublished: true,
    content: {
      summary:
        "Phoenix roofing prices are shaped less by weather damage than by heat. Sustained summer roof-deck temperatures age asphalt faster than in most of the country, so replacement cycles are shorter and premium or reflective products are a more common upgrade than they are elsewhere. The other local peculiarity is roof type: a large share of Valley homes are concrete tile over a felt or synthetic underlayment, and a large share of mid-century and flat-roofed homes are low-slope foam. Those are three different trades with three different price structures, and a single 'Phoenix roof cost' number hides that.",
      localFactors: [
        { title: "Tile underlayment replacement is its own job", body: "On concrete tile roofs the tile often outlives the underlayment beneath it. The common Valley job is a lift-and-relay: existing tile is removed and stacked, the underlayment is replaced, and the same tile goes back down with some breakage allowance. That costs meaningfully less than new tile but far more in labour than an asphalt tear-off, because every piece is handled twice." },
        { title: "Heat drives both material choice and crew scheduling", body: "Crews start before dawn in summer and lose productive hours by mid-morning. Expect longer calendar durations for June-September work, and expect quotes to reflect it. Reflective or 'cool roof' granules and higher-temperature-rated underlayments are a more common upsell here than in temperate markets." },
        { title: "Monsoon season concentrates demand", body: "Storm activity between roughly July and September produces a spike in leak calls and emergency repairs. Replacement pricing tends to firm up in that window because crews are absorbed by repair work." },
        { title: "Low-slope foam (SPF) is common and priced per square foot, not per square", body: "Many Phoenix homes have significant flat or low-slope area. Sprayed polyurethane foam with an elastomeric coating is a normal Valley system, and it carries a recoat obligation every several years that a shingle roof does not. Compare the lifetime cost, not just the install cost." },
      ],
      commonMaterials: ["concrete-tile", "asphalt-architectural", "spf-foam", "clay-tile"],
      representativeProjectType: "tile-underlayment",
      permitNotes:
        "Re-roofing in the City of Phoenix generally requires a permit through Planning and Development. Permit cost is usually a small share of a residential re-roof and is often folded into the contractor's price. Confirm scope and fee with the authority having jurisdiction for your address, which may be Phoenix, Scottsdale, Mesa, Glendale or an unincorporated Maricopa County office.",
      seasonality:
        "Late autumn through early spring is the comfortable working season and also the busiest. The softest pricing tends to be in the deep summer weeks when homeowners postpone work, if you can tolerate the schedule.",
      faqs: [
        { q: "Why is a tile roof quote sometimes cheaper than a shingle quote in Phoenix?", a: "Because a tile quote is often an underlayment replacement, not a new tile roof. The existing tile is reused. Read the scope line: 'remove and re-set existing tile' is a very different job from 'install new concrete tile'." },
        { q: "Does a cool roof actually pay for itself here?", a: "It depends on your cooling load, roof area and utility rate, and on whether the product change is a granule colour swap or a full system change. Treat any payback claim in a quote as a forecast, and ask for the assumptions behind it." },
        { q: "How long should a new asphalt roof last in Phoenix?", a: "Shorter than the printed warranty implies. UV and heat load are the limiting factors, not rain. Ask the contractor what they actually see on comparable Valley roofs, not what the shingle wrapper says." },
      ],
    },
  },
  {
    id: "city-dallas", countryId: "us", stateId: "us-tx", metroId: "metro-dfw",
    name: "Dallas", slug: "dallas-tx", population: 1300000,
    latitude: 32.7767, longitude: -96.797, isPublished: true,
    content: {
      summary:
        "Dallas-Fort Worth sits in one of the most active hail corridors in the United States, and that single fact explains most of what is unusual about local roofing prices. A large share of replacements are insurance claims rather than planned purchases, which changes the negotiation entirely: the relevant number is often the insurer's scope and depreciation schedule, not the contractor's retail price. It also means demand and pricing move in step with storm events, and that out-of-area crews arrive after a major hail event.",
      localFactors: [
        { title: "Impact-resistant shingles are a real local decision", body: "Class 4 impact-rated products (tested to UL 2218) cost more per square but many Texas insurers offer a premium discount for them. Whether that trade is worth it depends on your carrier's discount and your deductible, so get the discount in writing from your insurer before paying the upgrade." },
        { title: "Insurance scope, not retail price, is often the real budget", body: "If you are claiming, the actual cash value payment, recoverable depreciation and your deductible determine your out-of-pocket cost. A quote that exactly matches your insurance scope is not automatically a good deal, and a quote well above it is not automatically inflated." },
        { title: "Texas has no statewide roofing licence", body: "There is no state roofing contractor licence in Texas. Verification therefore falls on you: confirm general liability and workers' compensation coverage directly with the insurer, check any city registration requirement, and be cautious with crews that appear immediately after a storm." },
        { title: "Post-storm demand spikes move prices", body: "In the weeks after a significant hail event, local crew capacity is fully booked and prices firm. If your roof is functional, waiting out the surge is a legitimate cost lever." },
      ],
      commonMaterials: ["asphalt-architectural", "impact-resistant-shingle", "asphalt-3tab", "metal-standing-seam"],
      permitNotes:
        "The City of Dallas requires a permit for residential re-roofing. Fees are modest relative to the job. Suburbs across DFW set their own requirements, so confirm with the specific city, not with 'Dallas' generally.",
      seasonality:
        "Hail season runs roughly March through June and sets the annual demand curve. Late autumn and winter are usually the calmest scheduling windows.",
      faqs: [
        { q: "Should I file an insurance claim for hail damage?", a: "Only after someone qualified has actually looked at the roof and the likely repair cost is meaningfully above your deductible. A claim has consequences for your policy, and cosmetic granule loss is not always a covered functional failure." },
        { q: "Are Class 4 shingles worth the upgrade in Dallas?", a: "Ask your insurer for the exact annual discount in dollars, then compare it to the upgrade cost in your quotes. It is an arithmetic question, and the answer varies by carrier." },
        { q: "A contractor offered to 'cover my deductible'. Is that normal?", a: "No. Treat it as a serious red flag. In Texas it is a criminal offence for a contractor to rebate or waive an insurance deductible on a property insurance claim." },
      ],
    },
  },
  {
    id: "city-houston", countryId: "us", stateId: "us-tx", metroId: "metro-hou",
    name: "Houston", slug: "houston-tx", population: 2300000,
    latitude: 29.7604, longitude: -95.3698, isPublished: true,
    content: {
      summary:
        "Houston roofs fail from water and wind rather than from hail alone. Sustained humidity, heavy rainfall and hurricane-season wind exposure mean decking condition is a bigger cost variable here than in dry markets, and the deck repair allowance in a quote deserves more attention than in Phoenix or Las Vegas. Wind-rated fastening patterns and properly detailed edge metal are the parts of the job that actually determine survival in a named storm, and they are also the parts most easily cut from a cheap quote.",
      localFactors: [
        { title: "Decking rot is a genuine budget risk, not an upsell", body: "Humidity and long-standing leaks produce soft sheathing that cannot be seen until tear-off. Every quote should state a per-sheet replacement price and how many sheets are included. A quote with no deck allowance is not cheaper, it is incomplete." },
        { title: "Wind uplift detailing matters more than the shingle brand", body: "Edge metal, starter course, nailing pattern and ridge detailing are what hold a roof down in high wind. Ask which fastening schedule is being used and whether it meets the wind speed in your area's code requirement." },
        { title: "Hurricane season compresses the schedule", body: "Between June and November, an approaching storm can suspend work mid-job and a landfall can consume regional crew capacity for months. Build schedule slack into any summer replacement." },
        { title: "Low-slope additions are common on older housing stock", body: "Many Houston homes have a flat or low-slope porch, addition or garage tie-in. That area cannot take shingles and needs a membrane system, so it is priced separately. Make sure both areas appear in the quote." },
      ],
      commonMaterials: ["asphalt-architectural", "impact-resistant-shingle", "metal-standing-seam", "tpo-membrane"],
      permitNotes:
        "The City of Houston requires a permit for roof replacement, and unincorporated Harris County and the surrounding municipalities set their own rules. Confirm which authority covers your address before assuming a permit is not needed.",
      seasonality:
        "Spring and autumn are the practical working windows. Mid-summer heat and hurricane-season disruption both push schedules.",
      faqs: [
        { q: "How much decking replacement should I budget for?", a: "Ask contractors to quote a per-sheet price and to include a stated number of sheets. Then treat anything beyond that as a known variable rather than a surprise. Comparing quotes without normalising this is one of the most common ways homeowners mis-compare." },
        { q: "Do I need a wind mitigation inspection?", a: "It is more established in Florida than in Texas, but documenting your roof's wind-resistant features after replacement is still worth doing for future insurance conversations." },
      ],
    },
  },
  {
    id: "city-austin", countryId: "us", stateId: "us-tx", metroId: "metro-aus",
    name: "Austin", slug: "austin-tx", population: 975000,
    latitude: 30.2672, longitude: -97.7431, isPublished: true,
    content: {
      summary:
        "Austin combines Central Texas hail exposure with a labour market that has been persistently tight, which tends to place local pricing above Houston and slightly above Dallas for equivalent work. Terrain matters here in a way it does not in flatter metros: hillside lots, long driveways and limited staging space raise the cost of getting material onto a roof and debris off it. Metal roofing also has a higher share of the market than in most Texas cities.",
      localFactors: [
        { title: "Access and staging genuinely change the price", body: "A steep driveway, a narrow lot or no place to put a dumpster means more handling, sometimes a boom truck, and more labour hours. If a contractor walked your property before quoting and a cheaper one quoted by satellite image, you are not comparing like for like." },
        { title: "Metal roofing has real market share", body: "Standing seam is more common on Hill Country and custom homes than in most Texas metros. It roughly doubles the cost of an asphalt roof but has a far longer service life, so compare on annualised cost rather than on ticket price." },
        { title: "Hail exposure without Dallas-level frequency", body: "Austin sees damaging hail, but less often than the DFW corridor. Impact-resistant products still earn insurance discounts with many carriers." },
        { title: "Tight labour supply", body: "Crew availability has been the binding constraint in this market more often than material supply. Lead times, rather than headline prices, are usually where that shows up." },
      ],
      commonMaterials: ["asphalt-architectural", "metal-standing-seam", "impact-resistant-shingle", "concrete-tile"],
      permitNotes:
        "The City of Austin requires a permit for roof replacement in most cases, and separate rules apply in the extraterritorial jurisdiction and in surrounding cities such as Round Rock, Cedar Park and Pflugerville.",
      seasonality:
        "Spring storm season sets demand. Late autumn tends to offer the best combination of working weather and crew availability.",
      faqs: [
        { q: "Is standing seam metal worth roughly double the price of shingles?", a: "On a house you intend to keep for twenty years or more, often yes on an annualised basis. On a house you plan to sell in five, usually not on cost alone." },
        { q: "Why did two contractors measure my roof differently?", a: "One likely used aerial measurement software and the other measured on site. Complex rooflines with dormers and valleys are where the two diverge most, and the difference flows straight into the price." },
      ],
    },
  },
  {
    id: "city-san-diego", countryId: "us", stateId: "us-ca", metroId: "metro-san",
    name: "San Diego", slug: "san-diego-ca", population: 1380000,
    latitude: 32.7157, longitude: -117.1611, isPublished: true,
    content: {
      summary:
        "San Diego has one of the gentlest roofing climates in the country and one of the most expensive labour markets, so local pricing is driven by wages, licensing and code compliance rather than by weather damage. Concrete and clay tile are common on housing built from the 1980s onward, and as in Phoenix the typical tile job is an underlayment replacement rather than new tile. California's energy code adds a compliance layer that most other states do not have.",
      localFactors: [
        { title: "Labour cost, not weather, is the main driver", body: "Roofs here are not fighting hail or ice. What you are paying for is a licensed crew in a high-wage coastal metro, plus code compliance. That is why San Diego prices sit well above Sun Belt averages for identical materials." },
        { title: "Title 24 cool-roof requirements can apply to re-roofs", body: "California's building energy efficiency standards set solar reflectance and thermal emittance requirements for certain re-roofing work, which can constrain product choice or require a documented compliance path. Ask the contractor how compliance is being met on your specific roof." },
        { title: "A C-39 licence is required", body: "Roofing work above the minor-work threshold requires a C-39 roofing contractor licence from the Contractors State License Board. The licence number can and should be verified directly with CSLB before you sign anything." },
        { title: "Coastal exposure affects metal and fasteners", body: "Within a few miles of the coast, salt air accelerates corrosion. Fastener and flashing metallurgy matters more than it does inland, and it is a legitimate reason for a higher quote." },
      ],
      commonMaterials: ["concrete-tile", "clay-tile", "asphalt-architectural", "metal-standing-seam"],
      representativeProjectType: "tile-underlayment",
      permitNotes:
        "The City of San Diego requires a permit for re-roofing, and Title 24 documentation may be part of the submission. Surrounding jurisdictions including Chula Vista, Carlsbad and unincorporated San Diego County administer their own permits.",
      seasonality:
        "Work is possible year round. The wet months from December to March are the only meaningful interruption, and they also produce the leak calls that fill contractor schedules.",
      faqs: [
        { q: "My tile roof is leaking but the tile looks fine. What is the actual job?", a: "Almost certainly underlayment replacement. Tile is a rain shield; the underlayment is the waterproof layer, and it ages out decades before the tile does." },
        { q: "How do I verify a contractor's licence?", a: "Look up the licence number on the CSLB website and check that the name, status and classification match the company quoting you. Do not rely on a number printed on a proposal." },
      ],
    },
  },
  {
    id: "city-los-angeles", countryId: "us", stateId: "us-ca", metroId: "metro-lax",
    name: "Los Angeles", slug: "los-angeles-ca", population: 3820000,
    latitude: 34.0522, longitude: -118.2437, isPublished: true,
    content: {
      summary:
        "Los Angeles is the most internally varied market in this launch set. A flat-roofed bungalow in the basin, a tile roof in the San Fernando Valley and a hillside house in a very high fire hazard severity zone are three different pricing problems in one city. Wildfire code requirements, energy code compliance and one of the highest construction wage bases in the country all push LA pricing to the top of our range.",
      localFactors: [
        { title: "Wildfire zone requirements can change the whole assembly", body: "In designated fire hazard severity zones, California's wildland-urban interface provisions require a Class A roof assembly and ember-resistant detailing, including vent requirements. This is not an upsell, it is a code condition, and it can rule out otherwise cheaper options." },
        { title: "Hillside access is a first-order cost", body: "Narrow streets, no staging space and long carries add real hours. Hillside quotes that look inflated relative to a flat-lot comparison are often just correctly priced." },
        { title: "Title 24 compliance applies", body: "As elsewhere in California, re-roofing work can trigger cool-roof requirements under the state energy code, with documentation." },
        { title: "Older housing stock means more surprises", body: "Multiple existing layers, skip sheathing under old wood shake, and undersized or damaged decking are common on pre-war housing and are the main reason LA quotes carry larger contingencies." },
      ],
      commonMaterials: ["asphalt-architectural", "concrete-tile", "clay-tile", "tpo-membrane", "metal-standing-seam"],
      permitNotes:
        "Los Angeles Department of Building and Safety issues re-roof permits for the City of LA. The wider county contains dozens of separate jurisdictions, each with its own process, so confirm which one covers your parcel.",
      seasonality:
        "Year-round working climate. Winter rain and, increasingly, fire-season disruption are the two interruptions to plan around.",
      faqs: [
        { q: "Why is my hillside quote so much higher than my friend's?", a: "Access, staging and disposal logistics. If a dumpster cannot be placed near the house and material has to be carried or craned, the labour line moves substantially." },
        { q: "I have old wood shake with skip sheathing. What does that add?", a: "Usually a full deck of new sheathing over the spaced boards before the new roof can go on. It is a significant, and largely unavoidable, line item. Get it quoted explicitly." },
      ],
    },
  },
  {
    id: "city-las-vegas", countryId: "us", stateId: "us-nv", metroId: "metro-lv",
    name: "Las Vegas", slug: "las-vegas-nv", population: 660000,
    latitude: 36.1699, longitude: -115.1398, isPublished: true,
    content: {
      summary:
        "Las Vegas is a heat-driven market with a housing stock dominated by tile and low-slope construction from the region's rapid growth decades. As in Phoenix, the typical tile job is underlayment replacement rather than new tile, and the typical failure mode is thermal ageing rather than storm damage. The Nevada licensing regime is stricter than Texas and closer to California in practice.",
      localFactors: [
        { title: "Extreme thermal cycling shortens underlayment life", body: "Deck temperatures and daily temperature swings age felt underlayment quickly. Upgrading to a high-temperature synthetic or a self-adhered product is one of the more defensible upgrades in this climate." },
        { title: "Tile lift-and-relay dominates the residential market", body: "Expect quotes structured around removing and re-setting existing tile with a breakage allowance. Ask what percentage breakage is assumed and what replacement tile costs if the assumption is exceeded." },
        { title: "Low-slope and parapet detailing is common", body: "Flat sections behind parapet walls need membrane or foam systems and careful scupper and drain detailing. These are the areas that leak, and they are priced separately from the sloped area." },
        { title: "A C-15 licence is required", body: "Nevada's State Contractors Board issues the C-15 roofing classification. Verify the licence and its monetary limit, which caps the size of job a contractor may legally take." },
      ],
      commonMaterials: ["concrete-tile", "asphalt-architectural", "spf-foam", "tpo-membrane"],
      representativeProjectType: "tile-underlayment",
      permitNotes:
        "Clark County, the City of Las Vegas, North Las Vegas and Henderson each issue their own re-roof permits. Address determines which applies, and they are not interchangeable.",
      seasonality:
        "Autumn and spring are the practical working seasons. Summer heat restricts productive hours and can affect material handling.",
      faqs: [
        { q: "What does 'lift and relay' actually include?", a: "Removing existing tile, replacing the underlayment and battens as needed, then re-setting the same tile. It should also state a breakage allowance and the cost of replacement tile beyond it." },
        { q: "Is foam roofing a good idea on a flat section?", a: "It performs well in this climate but carries a recoat obligation every several years. Price the recoat cycle into your comparison, not just the installation." },
      ],
    },
  },
  {
    id: "city-tampa", countryId: "us", stateId: "us-fl", metroId: "metro-tpa",
    name: "Tampa", slug: "tampa-fl", population: 400000,
    latitude: 27.9506, longitude: -82.4572, isPublished: true,
    content: {
      summary:
        "Florida is the most heavily regulated roofing market in this launch set, and Tampa prices reflect it. Wind-borne debris requirements, secondary water barrier rules, mandatory permitting and inspection, and an insurance market that pays close attention to roof age all raise the floor on what a compliant re-roof costs. The upside is that a properly documented new roof has a measurable effect on insurability and premium.",
      localFactors: [
        { title: "Roof age drives insurability, not just leaks", body: "Florida insurers weigh roof age and condition heavily. A roof approaching the end of its accepted life can affect renewal terms, which means replacement timing is partly an insurance decision rather than purely a maintenance one." },
        { title: "Wind mitigation documentation has cash value", body: "A wind mitigation inspection after replacement documents features such as roof-to-wall connections, deck attachment and a secondary water barrier. Those features commonly reduce premiums, so ask the contractor to install and document to that standard." },
        { title: "Repair versus replacement rules are specific", body: "Florida's building code sets thresholds governing when a repair to an existing roof triggers a requirement to bring a larger area up to current code. The rules were amended in 2022 and depend on the code edition your roof was built to. Ask the contractor to state which path they are permitting under." },
        { title: "Licensed contractor and permit are mandatory", body: "Roofing requires a state-certified or registered roofing contractor, and re-roofs are permitted and inspected. An unpermitted roof is a problem at resale and at claim time." },
      ],
      commonMaterials: ["asphalt-architectural", "impact-resistant-shingle", "metal-standing-seam", "concrete-tile", "tpo-membrane"],
      permitNotes:
        "The City of Tampa and Hillsborough County both permit and inspect re-roofing. Expect a permit, at least one inspection, and documentation that stays attached to the property record.",
      seasonality:
        "Hurricane season from June to November dominates scheduling and can cause abrupt capacity shortages after a storm. Winter and early spring are the calmest booking windows.",
      faqs: [
        { q: "Will a new roof lower my insurance premium?", a: "Often, yes, particularly with a wind mitigation inspection documenting the new assembly. The size of the effect depends on your carrier and on which features are documented." },
        { q: "What is a secondary water barrier?", a: "A sealed layer beneath the primary roof covering that resists water intrusion if the covering is lost in a storm. It is a code and insurance-relevant feature in Florida and should appear explicitly in your quote." },
      ],
    },
  },
  {
    id: "city-orlando", countryId: "us", stateId: "us-fl", metroId: "metro-orl",
    name: "Orlando", slug: "orlando-fl", population: 320000,
    latitude: 28.5383, longitude: -81.3792, isPublished: true,
    content: {
      summary:
        "Orlando shares Florida's regulatory framework with Tampa but sits inland, in a lower design wind speed zone than the coastal metros. That difference shows up in fastening requirements and product approval constraints rather than in headline labour rates, and it generally makes an equivalent Orlando roof somewhat cheaper than the same roof in Miami. Large volumes of 1990s and 2000s tract housing mean a substantial share of the market is first-time replacement of original builder-grade roofs.",
      localFactors: [
        { title: "Inland wind zone lowers the compliance floor", body: "Design wind speeds inland are lower than on the coast, so fastening schedules and product approval requirements are less demanding than in a high-velocity hurricane zone. The same shingle can be materially cheaper to install here than in Miami-Dade." },
        { title: "Large cohort of original builder-grade roofs", body: "Much of the metro's housing stock was built with three-tab or entry-level architectural shingles that are now reaching replacement age at once. That concentrates demand and makes contractor selection, rather than product selection, the main quality variable." },
        { title: "Afternoon storm pattern affects scheduling", body: "Daily convective storms through summer mean crews plan to dry-in each day. A contractor who cannot explain their dry-in plan is a risk on a multi-day job." },
        { title: "Permitting and inspection are mandatory", body: "As across Florida, re-roofs are permitted and inspected, and a licensed roofing contractor is required." },
      ],
      commonMaterials: ["asphalt-architectural", "impact-resistant-shingle", "concrete-tile", "metal-standing-seam"],
      permitNotes:
        "The City of Orlando and Orange, Seminole and Osceola counties each administer permits. Confirm the authority for your parcel, since metro Orlando spans several jurisdictions.",
      seasonality:
        "June to November is hurricane season and the busiest, least predictable window. Late winter is generally the easiest time to schedule.",
      faqs: [
        { q: "Why is my Orlando quote lower than a Miami quote for the same house?", a: "Design wind speed. Miami-Dade and Broward sit in a high-velocity hurricane zone with stricter product approval and fastening requirements, which raises both material and labour cost." },
        { q: "The original roof lasted 22 years. Should I expect the same again?", a: "Not automatically. Material grade, ventilation and installation quality all differ. Ask what ventilation is being installed, since inadequate attic ventilation is a common cause of premature failure in this climate." },
      ],
    },
  },
  {
    id: "city-miami", countryId: "us", stateId: "us-fl", metroId: "metro-mia",
    name: "Miami", slug: "miami-fl", population: 450000,
    latitude: 25.7617, longitude: -80.1918, isPublished: true,
    content: {
      summary:
        "Miami-Dade is the strictest residential roofing jurisdiction in the United States, and it is the main reason Miami prices sit above the rest of Florida. Products used here generally need a Miami-Dade Notice of Acceptance or Florida Product Approval valid for the high-velocity hurricane zone, fastening and attachment requirements are more demanding, and inspections are more involved. A quote that looks unusually cheap for this market is usually a quote that has not priced the compliance.",
      localFactors: [
        { title: "High-velocity hurricane zone product approval", body: "Miami-Dade and Broward counties form the HVHZ. Roofing products and assemblies generally require a Miami-Dade Notice of Acceptance or an equivalent Florida Product Approval covering HVHZ use. This narrows the product list and raises material cost." },
        { title: "Attachment and inspection requirements add labour", body: "Fastening schedules, sheathing attachment and in-progress inspections mean more crew hours and more scheduling around inspectors than in an inland market. Expect the job to take longer for the same square footage." },
        { title: "Tile is common and heavy", body: "Concrete and clay tile roofs are widespread. Their weight interacts with structural capacity, so switching material type is not always a free choice and may require engineering input." },
        { title: "Salt air and humidity attack fasteners and flashing", body: "Corrosion resistance in fasteners, flashings and edge metal is a genuine specification issue near the coast, not a premium add-on." },
      ],
      commonMaterials: ["concrete-tile", "clay-tile", "asphalt-architectural", "impact-resistant-shingle", "tpo-membrane"],
      permitNotes:
        "The City of Miami and Miami-Dade County permit and inspect re-roofing, with HVHZ requirements applying. Product approval documentation is typically part of the permit package. Confirm requirements with the building department for your address.",
      seasonality:
        "Hurricane season from June to November drives both risk and demand. Post-storm periods can see severe capacity shortages and price spikes.",
      faqs: [
        { q: "What is a Notice of Acceptance and why does it matter?", a: "It is a Miami-Dade product approval showing that a roofing product or assembly has been tested for use in the high-velocity hurricane zone. Ask which NOA covers the system in your quote. It should be a specific document number." },
        { q: "Can I switch from tile to shingles to save money?", a: "Sometimes, but not always. It changes the load on the structure and may require engineering sign-off, and the saving is smaller than the material price difference suggests once compliance work is included." },
      ],
    },
  },
  // -- Northeast: data preparation only, deliberately unpublished ------------
  // No `content`, therefore no page. These exist so the calculator resolves a
  // Northeast ZIP to a real metro wage instead of the national fallback. Do not
  // flip isPublished without writing the local editorial first - freeze-thaw and
  // ice-damming behaviour, ice-and-water-shield code requirements, steep-slope
  // and slate prevalence, and the permit authority for each city.
  {
    id: "city-newark", countryId: "us", stateId: "us-nj", metroId: "metro-nyc",
    name: "Newark", slug: "newark-nj", population: 311000,
    latitude: 40.7357, longitude: -74.1724, isPublished: false,
  },
  {
    id: "city-jersey-city", countryId: "us", stateId: "us-nj", metroId: "metro-nyc",
    name: "Jersey City", slug: "jersey-city-nj", population: 292000,
    latitude: 40.7178, longitude: -74.0431, isPublished: false,
  },
  {
    id: "city-cherry-hill", countryId: "us", stateId: "us-nj", metroId: "metro-phl",
    name: "Cherry Hill", slug: "cherry-hill-nj", population: 74000,
    latitude: 39.9348, longitude: -75.0307, isPublished: false,
  },
  {
    id: "city-philadelphia", countryId: "us", stateId: "us-pa", metroId: "metro-phl",
    name: "Philadelphia", slug: "philadelphia-pa", population: 1580000,
    latitude: 39.9526, longitude: -75.1652, isPublished: false,
  },
  {
    id: "city-boston", countryId: "us", stateId: "us-ma", metroId: "metro-bos",
    name: "Boston", slug: "boston-ma", population: 654000,
    latitude: 42.3601, longitude: -71.0589, isPublished: false,
  },
];
