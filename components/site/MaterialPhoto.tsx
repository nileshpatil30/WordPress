/**
 * A material photograph, or a clean stand-in when we do not have one.
 *
 * Presentational and dumb on purpose: the caller resolves the src on the
 * server (see lib/photos.ts) and passes it in, so this file stays usable from
 * anywhere and never touches the filesystem itself.
 *
 * The absent state is deliberately not a grey box with a broken-image glyph.
 * Fourteen materials, twelve photographs: the two without one show their
 * initials on a tinted ground, which reads as a considered placeholder rather
 * than a bug.
 */
export function MaterialPhoto({ src, name, className = "", size = "tile" }: {
  src: string | null;
  name: string;
  className?: string;
  size?: "tile" | "thumb";
}) {
  const dims = size === "thumb"
    ? { width: 128, height: 96 }
    : { width: 640, height: 480 };

  if (!src) {
    return (
      <span
        className={`grid shrink-0 place-items-center bg-sunken text-faint ${className}`}
        style={{ aspectRatio: "4 / 3" }}
        aria-hidden
      >
        <span className={size === "thumb" ? "text-[11px] font-semibold" : "text-[13px] font-semibold"}>
          {initials(name)}
        </span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} roof surface`}
      {...dims}
      loading="lazy"
      decoding="async"
      className={`shrink-0 object-cover ${className}`}
      style={{ aspectRatio: "4 / 3" }}
    />
  );
}

/** "Impact-resistant shingle (Class 4)" -> "IR". Ignores bracketed suffixes. */
function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/[\s/-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
