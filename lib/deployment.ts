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
