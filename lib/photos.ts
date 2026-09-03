import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Which photographs actually exist on disk.
 *
 * SERVER ONLY - this reads the filesystem at build time, so it must not be
 * imported by a client component.
 *
 * Detection rather than a hand-maintained manifest: the material catalogue has
 * fourteen entries and not all of them have a usable photograph yet (a Class 4
 * shingle is visually identical to an architectural one, so a distinct shot is
 * hard to source honestly). A manifest would drift the moment a file was added
 * or removed. Asking the filesystem cannot drift, and a material with no photo
 * renders a clean typographic tile rather than a broken image.
 */
const PUBLIC_DIR = path.join(process.cwd(), "public");

const exists = (rel: string) => existsSync(path.join(PUBLIC_DIR, rel));

/** 640x480 tile for the gallery, or null when we have no photo. */
export function materialPhoto(slug: string): string | null {
  const rel = `materials/${slug}.webp`;
  return exists(rel) ? `/${rel}` : null;
}

/** 128x96 thumbnail for table rows. Falls back to the tile, then to null. */
export function materialThumb(slug: string): string | null {
  const thumb = `materials/${slug}-thumb.webp`;
  if (exists(thumb)) return `/${thumb}`;
  return materialPhoto(slug);
}

export const heroPhoto = (): string | null =>
  exists("hero-house.webp") ? "/hero-house.webp" : null;

export const dataIllustration = (): string | null =>
  exists("data-illustration.webp") ? "/data-illustration.webp" : null;

/** How many of the given slugs have a photo. Used to hide an empty gallery. */
export const countPhotos = (slugs: string[]): number =>
  slugs.filter((s) => materialPhoto(s) !== null).length;

/** A photograph of one stage of the work, or null when we have none. */
export function processPhoto(slug: string): string | null {
  const rel = `process/${slug}.webp`;
  return exists(rel) ? `/${rel}` : null;
}
