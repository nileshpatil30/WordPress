import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

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
