/**
 * Regional roofing seasonality.
 *
 * Roofing demand is seasonal, but the season is different in every market: a
 * Phoenix crew loses the summer to heat while a Boston crew loses the winter to
 * snow, and the two peaks are six months apart. A single national "spring is
 * roofing season" line is wrong for most of the country.
 *
 * This exists for two reasons, one of them an SEO decision worth stating
 * plainly. A city page that says something different and true in September than
 * it said in February has genuinely changed, which is what makes a `lastmod`
 * date honest. The widespread alternative — restamping an unchanged page with
 * today's date to look fresh — is the thing search engines discount and the
 * thing this product cannot do while also telling people how confident it is.
 * So the content moves first and the date follows it, never the reverse.
 *
 * Profiles are keyed by metro, falling back to state, then to a continental
 * default — the same specific-to-general chain the pricing lookup uses.
 *
 * These are editorial claims about climate and trade practice, not measured
 * data. They carry no pricing effect: nothing here feeds the cost model.
 */

/** 1 = January. */
export type Month = 1|2|3|4|5|6|7|8|9|10|11|12;

export interface SeasonalProfile {
  /** Months when work is comfortable and quality is easiest to achieve. */
  installWindow: Month[];
  /** Months when everyone books at once, so lead times and prices firm up. */
  peakDemand: Month[];
  /** Months when demand drops and there is room to negotiate. */
  softestPricing: Month[];
  /** A recurring weather event that concentrates demand, where one exists. */
  stormSeason?: { months: Month[]; label: string; note: string };
  /** One sentence on what actually drives the local calendar. */
  driver: string;
}

const MONTH_NAME = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const monthName = (m: Month) => MONTH_NAME[m];

/**
 * Inclusive month range, wrapping through December — r(10, 2) is Oct–Feb.
 *
 * A do-while, not a for: the full-year case r(1, 12) ends where it starts, so a
 * head-tested loop exits immediately and returns nothing. That silently gave
 * every year-round market an empty installation window, which rendered as
 * "outside the comfortable installation window" in all twelve months.
 */
const r = (a: number, b: number): Month[] => {
  const out: Month[] = [];
  let i = a;
  do {
    out.push(i as Month);
    i = (i % 12) + 1;
  } while (i !== (b % 12) + 1);
  return out;
};

/**
 * Desert Southwest: summer is the constraint, not winter. Roof-deck
 * temperatures make midday work unsafe and shorten the productive day, so the
 * comfortable season is the one most of the country calls off-season.
 */
const DESERT: SeasonalProfile = {
  installWindow: [10, 11, 12, 1, 2, 3, 4],
  peakDemand: [10, 11, 2, 3, 4],
  softestPricing: [6, 7, 8],
  stormSeason: {
    months: [7, 8, 9], label: "monsoon",
    note: "Monsoon storms concentrate leak and emergency-repair work, which absorbs crew capacity and firms up replacement pricing.",
  },
  driver: "Heat, not cold. Crews start before dawn in summer and lose productive hours by mid-morning.",
};

/**
 * Texas: work runs year-round, and the calendar is set by hail rather than
 * temperature. A large share of replacements here are insurance claims, so
 * demand tracks storm events more than seasons.
 */
const HAIL_BELT: SeasonalProfile = {
  installWindow: r(1, 12),
  peakDemand: [3, 4, 5, 6],
  softestPricing: [11, 12, 1],
  stormSeason: {
    months: [3, 4, 5, 6], label: "hail season",
    note: "After a significant hail event local crews book out and out-of-area crews arrive. If your roof is still functional, waiting out the surge is a real cost lever.",
  },
  driver: "Hail, not temperature. Roofing runs year-round; demand tracks storms.",
};

/** Gulf and South Atlantic: hurricane season sets the calendar. */
const HURRICANE: SeasonalProfile = {
  installWindow: r(1, 12),
  peakDemand: [3, 4, 5, 9, 10],
  softestPricing: [1, 2],
  stormSeason: {
    months: [6, 7, 8, 9, 10, 11], label: "hurricane season",
    note: "Insurers and permit offices both slow down after a named storm, and demand can outrun local capacity for months.",
  },
  driver: "Storm risk and insurance cycles, with work possible year-round.",
};

/** Coastal California: the mild case. Rain, not temperature, is the limit. */
const MEDITERRANEAN: SeasonalProfile = {
  installWindow: r(1, 12),
  peakDemand: [4, 5, 6, 7, 8],
  softestPricing: [12, 1, 2],
  driver: "A long installation window; winter rain is the main interruption.",
};

/**
 * Northeast and Midwest: the short-season case. Cold-weather shingle
 * installation is a genuine quality question — sealant strips need warmth to
 * bond — so the window is not merely a comfort preference.
 */
const SHORT_SEASON: SeasonalProfile = {
  installWindow: [4, 5, 6, 7, 8, 9, 10],
  peakDemand: [6, 7, 8, 9],
  softestPricing: [11, 3],
  stormSeason: {
    months: [12, 1, 2, 3], label: "ice damming",
    note: "Freeze-thaw cycles and ice dams drive winter leak calls. Emergency repair is possible in cold weather; a quality full replacement usually is not.",
  },
  driver: "A short installation season. Asphalt shingle sealant strips need warmth to bond properly, so winter work carries a real quality risk.",
};

const BY_METRO: Record<string, SeasonalProfile> = {
  "metro-phx": DESERT,
  "metro-lv": DESERT,
  "metro-dfw": HAIL_BELT,
  "metro-hou": HAIL_BELT,
  "metro-aus": HAIL_BELT,
  "metro-mia": HURRICANE,
  "metro-tpa": HURRICANE,
  "metro-orl": HURRICANE,
  "metro-lax": MEDITERRANEAN,
  "metro-san": MEDITERRANEAN,
  "metro-nyc": SHORT_SEASON,
  "metro-phl": SHORT_SEASON,
  "metro-bos": SHORT_SEASON,
};

const BY_STATE: Record<string, SeasonalProfile> = {
  "us-az": DESERT, "us-nv": DESERT,
  "us-tx": HAIL_BELT,
  "us-fl": HURRICANE,
  "us-ca": MEDITERRANEAN,
  "us-ny": SHORT_SEASON, "us-nj": SHORT_SEASON,
  "us-pa": SHORT_SEASON, "us-ma": SHORT_SEASON,
};

/** Continental default: the temperate case, used when nothing finer matches. */
const DEFAULT: SeasonalProfile = {
  installWindow: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  peakDemand: [5, 6, 7, 8, 9],
  softestPricing: [1, 2],
  driver: "Spring through autumn is the usual working season across most of the country.",
};

export function seasonalProfile(opts: { metroId?: string; stateId?: string }): SeasonalProfile {
  return (opts.metroId ? BY_METRO[opts.metroId] : undefined)
    ?? (opts.stateId ? BY_STATE[opts.stateId] : undefined)
    ?? DEFAULT;
}

export type SeasonalStance = "good-window" | "peak" | "soft-pricing" | "off-window";

export interface SeasonalGuidance {
  month: Month;
  monthLabel: string;
  stance: SeasonalStance;
  /** One line, true for this month in this market. */
  headline: string;
  detail: string;
  /** Set when this month falls inside the local storm season. */
  stormNote?: string;
  driver: string;
}

/**
 * What is true about this market, this month.
 *
 * Order matters: being outside the installation window is the most consequential
 * fact and outranks everything else, then peak demand, then soft pricing.
 */
export function seasonalGuidance(
  profile: SeasonalProfile, place: string, now: Date = new Date(),
): SeasonalGuidance {
  const month = (now.getUTCMonth() + 1) as Month;
  const label = monthName(month);
  const inWindow = profile.installWindow.includes(month);
  const isPeak = profile.peakDemand.includes(month);
  const isSoft = profile.softestPricing.includes(month);

  const storm = profile.stormSeason?.months.includes(month)
    ? `${label} falls in ${place}'s ${profile.stormSeason.label}. ${profile.stormSeason.note}`
    : undefined;

  let stance: SeasonalStance;
  let headline: string;
  let detail: string;

  if (!inWindow) {
    stance = "off-window";
    headline = `${label} is outside the comfortable installation window in ${place}.`;
    detail = "Work is often still possible, but ask specifically how the weather affects the schedule and the warranty, and expect a longer calendar duration than the labour hours suggest.";
  } else if (isPeak) {
    stance = "peak";
    headline = `${label} is peak season in ${place}.`;
    detail = "Crews are busy, lead times stretch and there is less room to negotiate. Book earlier than you think you need to, and treat an unusually fast start date as a question rather than a bonus.";
  } else if (isSoft) {
    stance = "soft-pricing";
    headline = `${label} is usually the softest pricing of the year in ${place}.`;
    detail = "Demand drops and crews have capacity. If your roof is functional and you can tolerate the conditions, this is when quotes tend to come in lowest.";
  } else {
    stance = "good-window";
    headline = `${label} is a good installation window in ${place}.`;
    detail = "Conditions suit the work and crews are not yet at their busiest, which is usually the best combination of quality and availability.";
  }

  return { month, monthLabel: label, stance, headline, detail, stormNote: storm, driver: profile.driver };
}
