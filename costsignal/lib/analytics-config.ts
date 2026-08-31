/**
 * Third-party site tags: Google Search Console verification and GA4.
 *
 * Both are read from the environment first so a preview deployment can point at
 * a different property (or none) without a code change, and both fall back to
 * the production values below so a plain `npm run build` on the host works with
 * no configuration at all.
 *
 * GA4 is loaded only in production. Without that guard every local `npm run
 * dev` session pollutes the same property, and the first thing you would see in
 * Search Console is your own laptop.
 */

/** GA4 measurement ID. Set NEXT_PUBLIC_GA_ID to override, or "" to disable. */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID ?? "G-HQ5FP57MWE";

/**
 * Google Search Console verification token.
 *
 * This is the value that follows "google-site-verification=". Next renders it
 * as <meta name="google-site-verification" content="..."> which satisfies the
 * "HTML tag" method. If you chose the "Domain" method in Search Console
 * instead, that one is a DNS TXT record on your registrar and this tag is not
 * involved - see docs/deployment.md.
 */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  ?? "ShqGBXZUvFnb_gJUrQngUUy_kdMW4jnaawe_hsd-Ym8";

/** GA4 is a real tracking script; keep it out of dev, test and preview. */
export const analyticsEnabled =
  process.env.NODE_ENV === "production" && GA_MEASUREMENT_ID.length > 0;
