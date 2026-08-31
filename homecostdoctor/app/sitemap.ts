import type { MetadataRoute } from "next";
import { getStore } from "@/lib/data/store";
import { siteUrl } from "@/lib/seo";
import { SEED_COLLECTED_DATE } from "@/lib/data/seed";

/**
 * The sitemap is generated from the same publication gates the pages use:
 * a city appears only if `isPublished`, a ZIP only if `pageEligible`. There is
 * no separate list to keep in sync, so we can never advertise a URL that 404s
 * or a thin page we decided not to publish.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await getStore();
  const [services, cities, zips] = await Promise.all([
    store.listServices({ liveOnly: true }),
    store.listCities({ publishedOnly: true }),
    store.listZipCodes({ pageEligibleOnly: true }),
  ]);
  const cityById = new Map(cities.map((c) => [c.id, c]));

  /**
   * `lastModified` is a claim about the content, not about the build.
   *
   * This used to be `new Date()` on every URL, which told search engines that
   * all 43 pages changed every time we deployed - including deploys that
   * touched a stylesheet. An unreliable lastmod is worth less than none: it
   * gets discounted, and it is the dishonest half of "updated monthly" SEO.
   *
   * Two real signals drive it instead. `dataChanged` is when the pricing behind
   * every estimate was last collected. `seasonalChanged` is the first of the
   * current month, because the seasonal guidance on city pages genuinely says
   * something different each month - the content moves first and the date
   * follows it, which is the only order that makes the date true.
   */
  const dataChanged = new Date(`${SEED_COLLECTED_DATE}T00:00:00Z`);
  const today = new Date();
  const seasonalChanged = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const newest = (...d: Date[]) => new Date(Math.max(...d.map((x) => x.getTime())));

  /** Pages whose content is fixed editorial: they change when we edit them. */
  const staticChanged = dataChanged;
  /** Estimate-bearing pages: change when the pricing data does. */
  const pricedChanged = dataChanged;
  /** City pages additionally carry month-aware seasonal guidance. */
  const cityChanged = newest(dataChanged, seasonalChanged);

  const staticPages: MetadataRoute.Sitemap = ([
    { url: siteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: siteUrl("/roof-cost-calculator"), changeFrequency: "weekly", priority: 0.9 },
    { url: siteUrl("/quote-check"), changeFrequency: "weekly", priority: 0.9 },
    { url: siteUrl("/compare-quotes"), changeFrequency: "weekly", priority: 0.85 },
    { url: siteUrl("/contractor-questions"), changeFrequency: "monthly", priority: 0.7 },
    { url: siteUrl("/financing"), changeFrequency: "monthly", priority: 0.6 },
    { url: siteUrl("/methodology"), changeFrequency: "monthly", priority: 0.6 },
    { url: siteUrl("/data-sources"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/contribute"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/hire"), changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ] as const).map((e) => ({ ...e, lastModified: staticChanged }));

  const servicePages = services.map((s) => ({
    url: siteUrl(`/${s.costPathSlug}`), lastModified: pricedChanged,
    changeFrequency: "weekly" as const, priority: 0.9,
  }));

  const cityPages = services.flatMap((s) =>
    cities.map((c) => ({
      url: siteUrl(`/${s.costPathSlug}/${c.slug}`), lastModified: cityChanged,
      changeFrequency: "weekly" as const, priority: 0.8,
    })));

  const zipPages = services.flatMap((s) =>
    zips
      .filter((z) => cityById.has(z.cityId))
      .map((z) => ({
        url: siteUrl(`/${s.costPathSlug}/${cityById.get(z.cityId)!.slug}/${z.code}`),
        lastModified: cityChanged, changeFrequency: "monthly" as const, priority: 0.6,
      })));

  return [...staticPages, ...servicePages, ...cityPages, ...zipPages];
}
