export const usd = (n: number, opts: { cents?: boolean } = {}) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(n);

export const compactUsd = (n: number) =>
  n >= 10000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : usd(n);

export const pct = (n: number, digits = 0) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;

export const num = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

export function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function stateFromCitySlug(slug: string) {
  const parts = slug.split("-");
  return parts[parts.length - 1]?.toUpperCase() ?? "";
}
