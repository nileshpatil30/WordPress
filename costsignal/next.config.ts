import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * Emit a self-contained server under .next/standalone, including only the
   * node_modules actually reached at runtime. That is what makes this app
   * deployable by uploading a folder: `node server.js` and nothing else.
   *
   * This is a Node server, not a static site. 21 routes are server-rendered on
   * demand and every API route runs server-side, so there is no export that
   * turns this into files a PHP host can serve.
   */
  output: "standalone",
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
};

export default nextConfig;
