import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * Two build shapes from one codebase.
   *
   * STATIC_EXPORT=1 emits plain HTML, CSS and JS into `out/`, which any web
   * host can serve - including shared PHP hosting with no Node runtime. It
   * works because the pricing engine runs in the browser (see
   * lib/engine/local.ts), so the calculator, quote checker and comparison need
   * no server at all. What it gives up is listed in lib/deployment.ts.
   *
   * Otherwise it emits a self-contained Node server under `.next/standalone`,
   * runnable with `node server.js`, which additionally serves the API routes,
   * the admin console and per-share OG images.
   *
   * `trailingSlash` matters only for the static build: it makes Next write
   * `about/index.html` instead of `about.html`, which Apache and LiteSpeed
   * serve at `/about/` with no rewrite rules.
   */
  ...(process.env.STATIC_EXPORT === "1"
    ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } }
    : { output: "standalone" as const }),
  // Header rules are a server feature; `output: export` ignores them and warns.
  // The static build ships the equivalent in out/.htaccess instead.
  ...(process.env.STATIC_EXPORT === "1" ? {} : {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  }),
};

export default nextConfig;
