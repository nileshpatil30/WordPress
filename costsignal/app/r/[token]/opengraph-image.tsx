import { ImageResponse } from "next/og";
import { isError, runEstimate } from "@/lib/api";
import { decodeShare } from "@/lib/share";

export const runtime = "nodejs";
export const alt = "Roof cost estimate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/**
 * The card people see when a shared link is pasted into a message or a thread.
 *
 * It shows the range and the place, because that is the part that makes someone
 * click. It deliberately does not show the sample-data caveat - a 1200x630 image
 * is the wrong surface for a nuance that needs a sentence - so the page itself
 * carries the notice prominently instead.
 */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const input = decodeShare(token);
  const result = input ? await runEstimate({ serviceSlug: "roofing", input }) : null;
  const estimate = result && !isError(result) ? result.estimate : null;

  const quoted = Number(input?.quotedPrice);
  const hasQuote = Number.isFinite(quoted) && quoted > 0;

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "space-between", background: "#F6F5F2", padding: 72,
        fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: "#0C6B58",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 26, fontWeight: 700,
          }}>H</div>
          <div style={{ fontSize: 30, fontWeight: 600, color: "#101614", letterSpacing: -0.5 }}>
            Home Cost Doctor
          </div>
        </div>

        {estimate ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Satori requires an explicit display on any element with more
                than one child, so each of these carries a single string. */}
            <div style={{ fontSize: 28, color: "#5F6B66", marginBottom: 14 }}>
              {`${hasQuote ? "Quote checked against the modelled range" : "Estimated roof replacement cost"} · ${estimate.geo.label}`}
            </div>
            <div style={{ fontSize: 96, fontWeight: 700, color: "#101614", letterSpacing: -3 }}>
              {`${usd(estimate.range.low)} – ${usd(estimate.range.high)}`}
            </div>
            <div style={{ display: "flex", gap: 40, marginTop: 26, fontSize: 26, color: "#5F6B66" }}>
              <span>{`${estimate.derived.squares} squares`}</span>
              <span>{`${usd(estimate.perSquare.typical)}/square`}</span>
              <span>{`Confidence ${estimate.confidence.score}/100`}</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 64, fontWeight: 700, color: "#101614", letterSpacing: -2 }}>
            Know what your roof should cost
          </div>
        )}

        <div style={{ fontSize: 26, color: "#8A948F" }}>
          Every line item shown · Modelled range, not a quote
        </div>
      </div>
    ),
    size);
}
