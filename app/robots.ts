import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/**
 * Prerendered at build time. Both builds already treat this as static; saying
 * so explicitly is what lets `output: export` emit it as a plain file.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin console and the API are not content. Query-stringed tool
        // pages are excluded so prefilled shares do not become duplicate URLs.
        disallow: ["/admin", "/api/", "/*?zip=", "/*?amount="],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/").replace(/\/$/, ""),
  };
}
