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
    latitude: 40.7357, longitude: -74.1724, isPublished: true,
    content: {
      summary:
        "Newark roofing prices are set by three things that rarely appear together elsewhere: some of the highest roofing labour rates in the country, a housing stock that is mostly pre-war and mostly attached, and winters that make the work seasonal. The Bureau of Labor Statistics puts median roofer wages in the New York metro area well above the national figure, and Newark sits inside that market - a crew here costs what a crew in Newark costs, not what a national average says. The other local reality is roof shape. A large share of Newark homes are two- and three-family houses with low-slope or flat rear sections, which is a different trade from a sloped shingle roof and priced differently.",
      localFactors: [
        { title: "Attached and semi-attached houses change the job", body: "On a row or twin, one or both sides have no eave to work from and the neighbouring roof is often inches away. Tear-off debris cannot simply be dropped, staging is tighter, and party-wall flashing has to be detailed rather than run past. Expect that to show up as labour, not materials, and expect a wide spread between contractors who do this daily and those who do not." },
        { title: "Flat and low-slope sections are common and priced separately", body: "Many Newark two- and three-families have a sloped front and a flat or near-flat rear. Those are two systems - shingles on one, a membrane or modified bitumen on the other - with different lifespans and different crews. A quote giving one price for the whole roof without separating them is hiding which part you are actually buying." },
        { title: "Ice damming drives winter leaks, not wind", body: "Freeze-thaw cycles push meltwater back up under the shingles at the eaves. Codes in this climate zone generally require an ice-and-water barrier along the eaves, and a quote that does not mention one on a sloped roof is either omitting it or assuming you will not ask. It is a small material cost and the most common cause of a leak in a roof that is otherwise fine." },
        { title: "New Jersey registers contractors rather than licensing roofers", body: "There is no state roofing trade licence. What exists is Home Improvement Contractor registration with the Division of Consumer Affairs, plus a commercial general liability requirement. Registration is a floor, not a quality signal - verify it, then verify insurance separately and directly with the insurer." },
      ],
      commonMaterials: ["asphalt-architectural", "modified-bitumen", "asphalt-3tab", "tpo-membrane"],
      permitNotes:
        "Re-roofing in Newark generally requires a permit through the city's Department of Economic and Housing Development, and inspections apply. Surrounding municipalities in Essex County each run their own building department with their own fees and scheduling, so confirm with the authority for your specific address rather than assuming Newark's process applies.",
      seasonality:
        "April through October is the practical installation window. Asphalt shingle sealant strips need warmth to bond, so a roof installed in a cold snap can look finished and still not be sealed until spring. Summer is the busiest and firmest on price; late autumn and early spring are where the negotiating room is, if the forecast cooperates.",
      faqs: [
        { q: "Why are Newark roofing quotes higher than the national averages I see online?", a: "Mostly labour. Median roofer wages in the New York metro area are among the highest in the country, and most national cost guides average that away. A number built on a national labour rate will understate a Newark job, which is why the estimate on this page uses the metro wage rather than a country-wide one." },
        { q: "My house has a flat section at the back. Should that be a separate line?", a: "Yes. It is a different material system, a different crew skill and a different service life. A single lump sum for a mixed roof makes it impossible to tell whether the flat section is being properly replaced or just patched over." },
        { q: "Is ice-and-water shield actually necessary here?", a: "For a sloped roof in this climate it is normal practice at the eaves and valleys, and generally required by code. If a quote is silent on it, ask where it is going and how far up from the eave - the answer tells you a lot about the contractor." },
      ],
    },
  },
  {
    id: "city-jersey-city", countryId: "us", stateId: "us-nj", metroId: "metro-nyc",
    name: "Jersey City", slug: "jersey-city-nj", population: 292000,
    latitude: 40.7178, longitude: -74.0431, isPublished: true,
    content: {
      summary:
        "Jersey City roofing is dominated by two building types with very different economics: pre-war row and brownstone-style houses with flat or very low-slope roofs, and newer or converted multi-family buildings. On a flat roof the question is not which shingle but which membrane and how the drainage and parapet details are handled - and those details, not the field of the roof, are where most flat-roof failures start. Labour is priced off the New York metro market, which is among the most expensive in the country.",
      localFactors: [
        { title: "Most of the housing stock is flat-roofed, so this is membrane work", body: "A flat roof is priced per square foot of surface, includes drainage and parapet detailing, and typically uses modified bitumen, TPO or EPDM. Comparing a flat-roof quote against a shingle cost guide is comparing two different trades. Ask which membrane, how many plies, and what the manufacturer warranty requires of the installer." },
        { title: "Parapets, drains and scuppers are where flat roofs leak", body: "The membrane field rarely fails first. Termination at the parapet, the flashing around a drain, and the transition where the roof meets a neighbouring wall are the failure points. A quote that itemises the field and says nothing about terminations is quoting the easy half of the job." },
        { title: "Access is genuinely constrained", body: "Narrow streets, no driveway, permit-only parking and attached neighbours mean material has to be lifted rather than carried, and the container has to go somewhere. That is a real cost and an honest contractor will name it. Ask specifically where the dumpster goes and whether a street permit is needed." },
        { title: "Ponding water is a scope question, not a defect", body: "Low-slope roofs that hold water after rain will fail early regardless of the membrane. Correcting it means tapered insulation or reworking the drainage, which is a meaningful cost. If your existing roof ponds, a quote that does not address it is quoting a shorter-lived roof than you think you are buying." },
      ],
      commonMaterials: ["modified-bitumen", "tpo-membrane", "asphalt-architectural", "asphalt-3tab"],
      permitNotes:
        "Jersey City requires a construction permit for roof replacement, reviewed by the city's Division of Buildings and Construction. Multi-family and mixed-use buildings carry additional requirements. Confirm the scope with the city before signing, particularly if the building has more than two dwelling units.",
      seasonality:
        "Membrane work has a wider weather window than shingles but still needs dry, above-freezing conditions for adhesives and seams. April through October is the reliable season. Emergency flat-roof repair happens year-round; a full replacement in January generally should not.",
      faqs: [
        { q: "TPO, EPDM or modified bitumen - which should I get?", a: "All three are legitimate systems and the right answer depends on your roof, not on which one a contractor prefers. What matters more is the number of plies, how the terminations are detailed and whether the installer is certified for the manufacturer warranty they are quoting. Ask for that in writing." },
        { q: "The quote says 'recover' rather than 'tear off'. Is that a problem?", a: "Not automatically - a recover over one sound existing layer is a legitimate, cheaper option. But it hides whatever is underneath, including wet insulation, and codes limit how many layers are permitted. Ask why recover was chosen and what happens if wet material is found." },
        { q: "Why is my flat roof quote per square foot rather than per square?", a: "Flat roofing is conventionally priced per square foot; sloped roofing per square, which is 100 square feet. Neither is a trick, but converting between them is where people accidentally compare a number to one ten times its size." },
      ],
    },
  },
  {
    id: "city-cherry-hill", countryId: "us", stateId: "us-nj", metroId: "metro-phl",
    name: "Cherry Hill", slug: "cherry-hill-nj", population: 74000,
    latitude: 39.9348, longitude: -75.0307, isPublished: true,
    content: {
      summary:
        "Cherry Hill is a suburban South Jersey market inside the Philadelphia metro, and the roofing economics look nothing like Newark's despite being in the same state. The housing stock is largely post-war: split-levels, colonials and ranches from the 1950s through the 1970s, almost all sloped and almost all asphalt shingle. That makes it one of the more straightforward markets to price - and one where the spread between quotes usually comes down to material grade and scope rather than access difficulty.",
      localFactors: [
        { title: "Detached houses with working room, which keeps labour predictable", body: "Unlike the dense northern part of the state, most Cherry Hill homes have a driveway, a yard and eaves you can stage from. That removes the access premium that inflates urban quotes, and it means an unusually high labour line here deserves a question rather than a shrug." },
        { title: "Post-war roof decks are usually plywood, occasionally plank", body: "Homes from the 1950s and earlier may have spaced plank sheathing rather than continuous plywood, which changes fastener holding and sometimes requires an overlay before shingles go down. That is discovered at tear-off, so ask for the per-sheet price up front rather than after the roof is open." },
        { title: "Second-layer tear-off is common on 1960s-70s stock", body: "Houses of this era have often been re-roofed once already, sometimes as an overlay. Removing two layers is meaningfully more labour and more disposal tonnage than one. If a quote assumes one layer and your roof has two, the price will move - confirm which the contractor assumed." },
        { title: "Freeze-thaw, not storms, sets the failure pattern", body: "This is a moderate climate zone: no hail belt, no hurricanes, but real winter. Ice damming at the eaves and granule loss from thermal cycling are what age a roof here. Ice-and-water barrier at the eaves is standard practice and should be itemised." },
      ],
      commonMaterials: ["asphalt-architectural", "asphalt-3tab", "asphalt-premium", "metal-standing-seam"],
      permitNotes:
        "Cherry Hill Township requires a permit for roof replacement through its Department of Community Development, with inspection. Neighbouring Camden County municipalities each set their own fees. Permits here are a small share of a typical re-roof and are usually included in the contractor's price - confirm which.",
      seasonality:
        "April through October is the comfortable window, with June through September the busiest. Late autumn still works in a mild year but shortens the days and raises the chance of a weather delay mid-job. Winter installation is possible but carries a real sealing risk on asphalt shingles.",
      faqs: [
        { q: "My roof has two layers. How much does that add?", a: "It roughly doubles the tear-off labour and the disposal tonnage, while changing nothing about the new material. Expect it to move the total by a meaningful amount, and expect an honest quote to state how many layers it assumed rather than discovering it on day one." },
        { q: "Is architectural shingle worth it over three-tab?", a: "In this climate, usually yes - the weight and the longer warranty are real, and the price difference is smaller than the lifespan difference. It is not worth paying a premium-line price for a mid-line product, though, so get the exact product name in writing." },
        { q: "Do I need a permit for a straight re-roof?", a: "In Cherry Hill Township, yes, and there is an inspection. Contractors who suggest skipping it are proposing that you carry the risk of unpermitted work when you sell the house." },
      ],
    },
  },
  {
    id: "city-philadelphia", countryId: "us", stateId: "us-pa", metroId: "metro-phl",
    name: "Philadelphia", slug: "philadelphia-pa", population: 1580000,
    latitude: 39.9526, longitude: -75.1652, isPublished: true,
    content: {
      summary:
        "Philadelphia roofing is row-house roofing. The dominant job in the city is not a sloped shingle replacement but a flat or very low-slope roof over an attached house, usually finished in modified bitumen or a coated membrane, and often replaced in sections over decades rather than all at once. That, plus a large stock of buildings old enough to sit in historic districts, makes Philadelphia one of the markets where a national cost-per-square figure is least useful.",
      localFactors: [
        { title: "The typical roof is flat, attached and reached from inside", body: "On a row house there is no eave, no driveway and often no rear access. Material goes up through the building or over a neighbour's roof with permission. That constrains crew size and is a legitimate reason a Philadelphia quote exceeds a suburban one for the same square footage." },
        { title: "Silver-coated and cold-process systems are a local convention", body: "Modified bitumen with a reflective coating is the traditional Philadelphia flat roof and is still widely installed. Coatings are maintenance, not a roof: a coating over a failed membrane buys a season or two. Ask whether you are being quoted a new membrane or a recoat, because the price difference and the lifespan difference are both large." },
        { title: "Party-wall and parapet flashing is the failure point", body: "Where your roof meets the neighbour's wall is the most common leak source in a row house, and the hardest thing to price from the street. A quote that does not mention party-wall or parapet flashing has not looked at the actual problem." },
        { title: "Historic districts add review, not just cost", body: "Parts of the city fall under Historical Commission jurisdiction, where visible roofing material can require review before replacement. That is a schedule risk more than a price one, but discovering it after signing is expensive in time." },
      ],
      commonMaterials: ["modified-bitumen", "tpo-membrane", "asphalt-architectural", "natural-slate"],
      permitNotes:
        "Philadelphia requires a permit for roof replacement through the Department of Licenses and Inspections, and contractors must hold a city contractor licence in addition to any state registration. Verify the licence number with L&I directly rather than accepting a number printed on a quote.",
      seasonality:
        "April through October for full replacement. Cold-process and torch-applied systems both have temperature minimums, and a membrane installed below them may look correct and fail at the seams. Emergency repair runs year-round.",
      faqs: [
        { q: "A contractor offered to coat my roof for a fraction of a replacement. Is that a good deal?", a: "It depends entirely on the condition of what is underneath. A coating on a sound membrane is legitimate maintenance that extends life. A coating over a wet or failed membrane hides the problem and traps moisture. Ask what happens if it leaks in a year, and get the answer in writing." },
        { q: "My house is over a hundred years old. Does that change the roof?", a: "Often yes. Older row houses may have multiple accumulated layers, original wood decking, and parapet conditions that need masonry work before roofing. None of that is unusual, but it should be inspected and priced rather than assumed." },
        { q: "Why do quotes vary so much for the same row house?", a: "Access and scope, mostly. One contractor may be pricing a full tear-off to the deck with new parapet flashing; another a recover of the field only. They are different jobs. Comparing the totals without comparing the scope is the single most common mistake here." },
      ],
    },
  },
  {
    id: "city-boston", countryId: "us", stateId: "us-ma", metroId: "metro-bos",
    name: "Boston", slug: "boston-ma", population: 654000,
    latitude: 42.3601, longitude: -71.0589, isPublished: true,
    content: {
      summary:
        "Boston roofing is defined by snow load, ice damming and an unusually old housing stock. The triple-decker is the local archetype - three-family, often with a low-slope or flat rear section and a sloped front - and the surrounding neighbourhoods carry a real share of natural slate that is now well past its first century. Labour is among the more expensive in the country, and the installation season is genuinely short, which concentrates demand into a few months and firms up prices when everyone wants the same weeks.",
      localFactors: [
        { title: "Ice damming is the defining local failure", body: "Snow melts over a warm attic, refreezes at the cold eave, and backs water up under the roofing. It is the most common cause of interior water damage here and it is a ventilation and insulation problem as much as a roofing one. A quote that replaces the covering without addressing eave protection and attic ventilation is treating a symptom." },
        { title: "Slate is real here, and replacing it with asphalt is a decision", body: "A genuine slate roof can last a century and is repairable rather than replaceable. Swapping it for asphalt is much cheaper up front and much shorter-lived, and on some streets it changes the character of the house. If a contractor proposes it without discussing repair, get a second opinion from someone who works in slate." },
        { title: "The installation season is short and demand is concentrated", body: "April through October is the practical window, and June through September is when everyone books. Asphalt shingle sealant needs warmth to bond, so cold-weather installation carries a genuine quality risk rather than just discomfort. That short season is why lead times stretch in summer." },
        { title: "Massachusetts requires both a licence and a registration", body: "A Construction Supervisor Licence covers the structural work, and Home Improvement Contractor registration is what gives a homeowner access to the state's arbitration programme and guaranty fund. A contractor with one and not the other is a meaningfully different risk. Verify both." },
      ],
      commonMaterials: ["asphalt-architectural", "natural-slate", "modified-bitumen", "asphalt-premium"],
      permitNotes:
        "Boston requires a permit for roof replacement through the Inspectional Services Department, and work must be performed under a licensed Construction Supervisor. Surrounding cities - Cambridge, Somerville, Newton - each run their own process. Confirm with the authority for your address, and confirm the permit is pulled in the contractor's name, not yours.",
      seasonality:
        "April through October, with June through September the peak. Book earlier than feels necessary for summer work. The softest pricing is generally late autumn and very early spring, when crews have capacity and the weather still cooperates - but those windows close quickly and a delayed start can push into conditions that should not be worked in.",
      faqs: [
        { q: "Every winter I get ice dams. Will a new roof fix that?", a: "Not on its own. Ice dams are driven by heat escaping into the attic and melting snow from below. A new roof with proper eave protection reduces the damage when it happens; attic insulation and ventilation reduce whether it happens. Any contractor who promises a new roof alone will solve it is overselling." },
        { q: "My slate roof has a few broken tiles. Do I need a whole new roof?", a: "Very often not. Slate is repairable in a way asphalt is not, and a competent slater can replace individual tiles for a fraction of a replacement. Get an opinion from someone who actually works in slate before accepting a full-replacement quote." },
        { q: "Should I wait for winter to get a cheaper price?", a: "No. What you would be buying is an installation in conditions where asphalt sealant may not bond until spring. The saving is real and so is the risk. Late autumn or very early spring is the sensible version of the same idea." },
      ],
    },
  },
  {
    id: "city-chicago", countryId: "us", stateId: "us-il", metroId: "metro-chi",
    name: "Chicago", slug: "chicago-il", population: 2660000,
    latitude: 41.8781, longitude: -87.6298, isPublished: true,
    content: {
      summary:
        "Chicago has the highest median roofer wage of any large metro in our coverage - well above Phoenix or Dallas - and that single fact drives most of what makes local quotes look expensive against national cost guides. The housing stock compounds it: a great deal of the city is bungalows, two-flats and three-flats, many with flat or very low-slope roofs behind a parapet, which is membrane work rather than shingle work. Add a genuinely short installation season and lake-effect winters, and a national average is close to useless here.",
      localFactors: [
        { title: "The Chicago bungalow and two-flat are the local archetype", body: "Hundreds of thousands of these were built between 1910 and 1940, typically with a low-slope or flat roof behind a masonry parapet. That means membrane roofing, parapet flashing and drainage detailing rather than shingles - a different trade at a different price, and the reason shingle-based cost guides mislead here." },
        { title: "Parapet and masonry condition is often the real cost", body: "On a flat-roofed brick building the roof meets the wall at a parapet, and deteriorated masonry or coping there will leak no matter how good the membrane is. Tuckpointing and coping repair are frequently discovered at tear-off. Ask whether the quote includes any masonry allowance or explicitly excludes it." },
        { title: "Freeze-thaw and ice damming are severe", body: "Chicago runs through many freeze-thaw cycles a season. On sloped roofs that means ice damming at the eaves; on flat roofs it means water finding any gap and then expanding in it. Ice-and-water barrier at eaves and valleys is standard practice and should be itemised, not assumed." },
        { title: "The season is short and the city licenses separately", body: "April through October is the practical window, and summer books out. Roofing contractors need a state licence through IDFPR and, for work in the city, a City of Chicago contractor licence. Two separate things - verify both, and confirm the permit is pulled in the contractor's name." },
      ],
      commonMaterials: ["modified-bitumen", "asphalt-architectural", "tpo-membrane", "asphalt-3tab"],
      permitNotes:
        "The City of Chicago requires a permit for roof replacement through the Department of Buildings, and contractors must hold a city licence in addition to their state licence. Suburban municipalities in Cook, DuPage and Lake counties each run their own permitting, so confirm with the authority for your address rather than assuming Chicago's rules apply.",
      seasonality:
        "April through October is the reliable installation window, with June through September the busiest and firmest on price. Asphalt shingle sealant needs warmth to bond and membrane adhesives have temperature minimums, so winter work carries genuine quality risk rather than just discomfort. Late autumn is where the negotiating room usually is.",
      faqs: [
        { q: "Why is a Chicago roof quote so much more than the national average I read?", a: "Labour, mostly. The BLS median roofer wage in the Chicago metro is the highest of any large metro we cover - materially above sunbelt markets - and national cost guides average that away. The estimate on this page uses the Chicago metro wage rather than a country-wide one, which is why it lands higher and closer to reality." },
        { q: "My two-flat has a flat roof. Is that more or less expensive than shingles?", a: "Different, not simply more or less. Flat roofing is priced per square foot and includes drainage and parapet detailing; sloped roofing is priced per square. What usually decides the cost is the condition of the parapet and whether the existing layers have to come off, not the membrane itself." },
        { q: "Can roofing be done in a Chicago winter?", a: "Emergency repair, yes. A full replacement, generally no - and a contractor offering a discount to do one in January is selling you the risk. Asphalt sealant may not bond until spring, and membrane seams installed cold are the ones that fail first." },
      ],
    },
  },
  {
    id: "city-detroit", countryId: "us", stateId: "us-mi", metroId: "metro-det",
    name: "Detroit", slug: "detroit-mi", population: 633000,
    latitude: 42.3314, longitude: -83.0458, isPublished: true,
    content: {
      summary:
        "Detroit roofing is mostly sloped asphalt on detached single-family houses, which makes it one of the more straightforward markets in our coverage to price - and one where the spread between quotes usually comes down to how many existing layers there are and whether the deck is sound. The housing stock skews old: a great deal of it is pre-war, and roofs that have been overlaid once or twice are common. Labour sits mid-range for the metros we cover, well below Chicago and well above the sunbelt.",
      localFactors: [
        { title: "Multiple existing layers are the norm, not the exception", body: "Overlaying rather than tearing off was common practice for decades. Two or even three layers on an older Detroit house is unremarkable, and each one adds tear-off labour and disposal tonnage without changing the new material at all. A quote that does not state how many layers it assumed will move once the roof is open." },
        { title: "Deck condition on pre-war houses is a real variable", body: "Older homes here often have plank sheathing rather than continuous plywood, and decades of overlays can hide moisture damage. Get the per-sheet replacement price in writing before work starts - it is the single most common source of a mid-job change order in this market." },
        { title: "Freeze-thaw drives the failure pattern", body: "Detroit runs through hard winters with repeated freeze-thaw. Ice damming at the eaves is the common cause of interior water damage, and eave protection plus adequate attic ventilation matter as much as the covering itself. A quote silent on both is treating a symptom." },
        { title: "Michigan licenses builders, and the licence is verifiable", body: "Roofing falls under Michigan's residential builder or maintenance and alteration contractor licence, issued by LARA. That number can be checked with the state. Doing so takes a minute and separates established contractors from storm-chasers." },
      ],
      commonMaterials: ["asphalt-architectural", "asphalt-3tab", "modified-bitumen", "metal-standing-seam"],
      permitNotes:
        "The City of Detroit requires a permit for roof replacement through the Buildings, Safety Engineering and Environmental Department. Suburban Wayne, Oakland and Macomb county municipalities each run their own process with their own fees. Confirm with the authority for your address, and confirm the permit is pulled in the contractor's name.",
      seasonality:
        "April through October is the practical window, with midsummer the busiest. Asphalt shingle sealant needs warmth to bond properly, so a roof installed in a cold snap can look complete and not actually seal until spring. Early spring and late autumn tend to offer the best availability without the quality risk of true winter work.",
      faqs: [
        { q: "My roof has two layers. How much does removing both add?", a: "It roughly doubles the tear-off labour and the disposal tonnage while changing nothing about the new material. On an older Detroit house it is common enough that a quote assuming one layer deserves a direct question before you sign." },
        { q: "Every winter I get ice dams. Will a new roof stop them?", a: "Not by itself. Ice dams come from heat escaping into the attic and melting snow from below. A new roof with proper eave protection limits the damage; attic insulation and ventilation reduce whether it happens at all. Treat any contractor who promises the roof alone will fix it with caution." },
        { q: "How do I check a contractor is licensed in Michigan?", a: "Ask for the licence number and verify it directly with LARA rather than accepting what is printed on the quote. Roofing falls under the residential builder or maintenance and alteration licence, and verification is free." },
      ],
    },
  },
];
