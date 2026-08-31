import type { Metadata } from "next";

export const SITE_NAME = "Home Cost Doctor";
export const SITE_TAGLINE = "Know what your project should cost before you hire a contractor.";

/**
 * Absolute URL for a path, used by canonicals, og:url, JSON-LD, robots.txt and
 * the sitemap.
 *
 * `SITE_URL` is checked before `NEXT_PUBLIC_SITE_URL` on purpose. Anything
 * prefixed NEXT_PUBLIC_ is inlined into the bundle at build time, so a
 * pre-built deployment would carry whatever value the build machine had -
 * in practice localhost - and no amount of configuring the host afterwards
 * would change it. Every caller here is server-side, so reading a plain
 * server variable at runtime lets one build be deployed to any domain.
 *
 * Setting neither is not a silent failure: on a production server it throws at
 * startup rather than quietly publishing a sitemap full of localhost URLs and
 * canonicals that tell Google to ignore the real site.
 */
export function siteUrl(path = "/") {
  const base = process.env.SITE_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.NODE_ENV === "production" ? missingSiteUrl() : "http://localhost:3000");
  return new URL(path, base).toString();
}

function missingSiteUrl(): never {
  throw new Error(
    "SITE_URL is not set. Set it in .env.production (or the host's environment), "
    + "e.g. SITE_URL=https://homecostdoctor.com - canonical tags, og:url and the sitemap "
    + "all depend on it, and defaulting to localhost would tell Google to "
    + "ignore the real site.");
}

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const url = siteUrl(opts.path);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: opts.title, description: opts.description, url,
      siteName: SITE_NAME, type: "website",
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description },
  };
}

/** Renders a JSON-LD block. Kept in one place so structured data stays honest. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem", position: i + 1, name: item.name, item: siteUrl(item.path),
    })),
  };
}
