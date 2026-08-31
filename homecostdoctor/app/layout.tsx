import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site/Header";
import { SiteFooter } from "@/components/site/Footer";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/seo";
import { Analytics } from "@/components/site/Analytics";
import { GOOGLE_SITE_VERIFICATION } from "@/lib/analytics-config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Personalised, local roof replacement cost estimates with a full price breakdown, a contractor quote fairness check, and side-by-side quote comparison. Built on transparent, sourced pricing data.",
  applicationName: SITE_NAME,
  formatDetection: { telephone: false },
  verification: { google: GOOGLE_SITE_VERIFICATION },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0C6B58" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
