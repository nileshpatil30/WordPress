import type { MetadataRoute } from "next";
import { getStore } from "@/lib/data/store";
import { siteUrl } from "@/lib/seo";

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
  const now = new Date();

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
  ] as const).map((e) => ({ ...e, lastModified: now }));

  const servicePages = services.map((s) => ({
    url: siteUrl(`/${s.costPathSlug}`), lastModified: now,
    changeFrequency: "weekly" as const, priority: 0.9,
  }));

  const cityPages = services.flatMap((s) =>
    cities.map((c) => ({
      url: siteUrl(`/${s.costPathSlug}/${c.slug}`), lastModified: now,
      changeFrequency: "weekly" as const, priority: 0.8,
    })));

  const zipPages = services.flatMap((s) =>
    zips
      .filter((z) => cityById.has(z.cityId))
      .map((z) => ({
        url: siteUrl(`/${s.costPathSlug}/${cityById.get(z.cityId)!.slug}/${z.code}`),
        lastModified: now, changeFrequency: "monthly" as const, priority: 0.6,
      })));

  return [...staticPages, ...servicePages, ...cityPages, ...zipPages];
}
