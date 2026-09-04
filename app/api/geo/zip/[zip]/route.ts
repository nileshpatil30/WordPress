import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** ZIP lookup for the calculator: resolves city/state and page availability. */
export async function GET(
  req: Request, { params }: { params: Promise<{ zip: string }> },
) {
  const limited = enforceRateLimit(req, "geo");
  if (limited) return limited;

  const { zip } = await params;
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "ZIP must be 5 digits" }, { status: 422 });
  }

  const store = await getStore();
  const zipRecord = await store.getZipByCode(zip);
  if (!zipRecord) {
    return NextResponse.json({
      zip, known: false,
      message: "We do not have local data for this ZIP code yet, so estimates use national figures with lower confidence.",
    });
  }

  const city = zipRecord.cityId ? await store.getCityById(zipRecord.cityId) : null;
  const state = (await store.listStates()).find((s) => s.id === zipRecord.stateId);

  return NextResponse.json({
    zip, known: true,
    city: city ? { name: city.name, slug: city.slug, isPublished: city.isPublished } : null,
    state: state ? { code: state.code, name: state.name } : null,
    county: zipRecord.county,
    hasZipPage: zipRecord.pageEligible,
    cityPath: city?.isPublished ? `/roofing-cost/${city.slug}` : null,
    zipPath: zipRecord.pageEligible && city ? `/roofing-cost/${city.slug}/${zip}` : null,
  });
}
