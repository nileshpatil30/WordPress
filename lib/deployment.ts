/**
 * Which features this deployment can actually offer.
 *
 * The site builds two ways. A server deployment runs everything. A static
 * export runs on any web host — including shared PHP hosting with no Node
 * runtime — by pricing everything in the browser.
 *
 * Three features genuinely cannot survive that, and the honest thing is to say
 * so on the page rather than to render a form that silently fails:
 *
 *   - Quote PDF upload needs an API key. On a static site the key would have to
 *     ship to the browser, where anyone could read it and spend money against
 *     it. There is no safe way to do this without a server.
 *   - Contributed project costs and interest registrations need somewhere to
 *     write. A static host has no database and no endpoint.
 *
 * Everything else — the calculator, the quote checker, quote comparison,
 * contractor questions, financing, and every content page — works identically,
 * because all of it is computation over data that ships with the page.
 */
export const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === "1";

/** True where the browser can reach our own API routes. */
export const hasServerApi = !isStaticBuild;

/**
 * Where a homeowner's figures go.
 *
 * The static build has no Node route, but the shared host it runs on does run
 * PHP - so public/intake/submit.php takes the same JSON under the same
 * constraints. Until that existed the contribute form said contributions were
 * paused, which meant the one part of this product that improves with traffic
 * could not improve at all.
 *
 * Everything else that needed a server stays off on a static build: reading a
 * quote PDF needs an API key, and shipping one to the browser is not a
 * deployment choice, it is a leak.
 */
export const submissionEndpoint = isStaticBuild
  ? "/intake/submit.php"
  : "/api/submissions";
