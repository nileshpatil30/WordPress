"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PITCH_BAND_LABEL, PITCH_BAND_NOTE, WASTE_GUIDANCE,
  pitchAngleDegrees, pitchBand, pitchMultiplier, roofAreaFromFootprint,
  shingleQuantities, sqftToSquares,
} from "@/lib/geometry";
import { Badge, Button, Card, Field, inputClass, selectClass } from "@/components/ui";
import { num } from "@/lib/format";
import { PitchDiagram, RoofShape, type RoofShapeKind } from "./RoofDiagrams";

type Mode = "area" | "squares" | "pitch" | "shingles";

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: "area", label: "Roof area", blurb: "From your house size and pitch" },
  { id: "squares", label: "Squares", blurb: "Convert square feet to squares" },
  { id: "pitch", label: "Pitch", blurb: "Multiplier, angle and what it costs you" },
  { id: "shingles", label: "Shingles", blurb: "Bundles, underlayment and waste" },
];

const PITCHES = Array.from({ length: 17 }, (_, i) => i);

/** Parallel to WASTE_GUIDANCE, which runs simplest to most cut-up. */
const SHAPE_ORDER: RoofShapeKind[] = ["simple", "moderate", "complex", "very-complex"];

/**
 * Four geometry tools behind one page.
 *
 * Every number here is exact arithmetic, which is why none of it carries a
 * confidence badge: there is no pricing in it. The link out to the cost
 * calculator is the point of the page - someone who has just learned their roof
 * is 24 squares is one question away from what 24 squares should cost.
 */
export function RoofGeometry() {
  const [mode, setMode] = useState<Mode>("area");

  // Area
  const [houseSqft, setHouseSqft] = useState("2000");
  const [stories, setStories] = useState("1");
  const [rise, setRise] = useState("6");
  const [overhang, setOverhang] = useState("1.08");

  // Squares
  const [sqft, setSqft] = useState("2400");

  // Shingles
  const [shingleSquares, setShingleSquares] = useState("24");
  const [waste, setWaste] = useState("10");

  const riseN = Number(rise) || 0;

  const area = useMemo(() => roofAreaFromFootprint({
    houseSqft: Number(houseSqft) || 0,
    stories: Number(stories) || 1,
    risePer12: riseN,
    eaveOverhang: Number(overhang) || 1.08,
  }), [houseSqft, stories, riseN, overhang]);

  const shingles = useMemo(() => shingleQuantities({
    squares: Number(shingleSquares) || 0,
    wastePct: Number(waste) || 0,
  }), [shingleSquares, waste]);

  const band = pitchBand(riseN);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Calculator mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-xl border px-4 py-2.5 text-left transition-colors ${
              mode === m.id
                ? "border-accent-line bg-accent-soft"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <span className={`block text-[14px] font-semibold ${mode === m.id ? "text-accent" : "text-ink"}`}>
              {m.label}
            </span>
            <span className="block text-[12px] text-muted">{m.blurb}</span>
          </button>
        ))}
      </div>

      <Card className="mt-5 p-6 sm:p-7">
        {mode === "area" && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="House size (sq ft)" hint="Total finished floor area, not the roof">
                <input className={inputClass} inputMode="numeric" value={houseSqft}
                  onChange={(e) => setHouseSqft(e.target.value)} />
              </Field>
              <Field label="Storeys" hint="A two-storey house has half the footprint">
                <select className={selectClass} value={stories} onChange={(e) => setStories(e.target.value)}>
                  <option value="1">1 storey</option>
                  <option value="2">2 storeys</option>
                  <option value="3">3 storeys</option>
                </select>
              </Field>
              <Field label="Roof pitch (rise per 12)">
                <select className={selectClass} value={rise} onChange={(e) => setRise(e.target.value)}>
                  {PITCHES.map((p) => <option key={p} value={p}>{p}:12</option>)}
                </select>
              </Field>
              <Field label="Eave overhang factor" hint="1.08 is typical; eaves extend past the walls">
                <input className={inputClass} inputMode="decimal" value={overhang}
                  onChange={(e) => setOverhang(e.target.value)} />
              </Field>
            </div>

            <Result
              headline={`${num(area.roofAreaSqft)} sq ft`}
              sub={`${area.squares.toFixed(1)} squares`}
              rows={[
                ["Footprint", `${num(area.footprintSqft)} sq ft`],
                ["Pitch multiplier", `×${area.multiplier.toFixed(4)}`],
                ["Pitch band", PITCH_BAND_LABEL[area.band]],
              ]}
              note={`House area is not roof area. A ${num(Number(houseSqft) || 0)} sq ft home over ${stories} storey${stories === "1" ? "" : "s"} has a ${num(area.footprintSqft)} sq ft footprint, and the pitch adds ${Math.round((area.multiplier - 1) * 100)}% on top of that.`}
              squares={area.squares}
            />
          </>
        )}

        {mode === "squares" && (
          <>
            <Field label="Roof surface area (sq ft)" hint="The sloped surface, not the floor plan">
              <input className={inputClass} inputMode="numeric" value={sqft}
                onChange={(e) => setSqft(e.target.value)} />
            </Field>
            <Result
              headline={`${sqftToSquares(Number(sqft) || 0).toFixed(2)} squares`}
              sub={`${num(Number(sqft) || 0)} sq ft`}
              rows={[["One square", "100 sq ft of roof surface"]]}
              note="A square is the unit every roofer quotes in, and it is the one piece of jargon that most often makes a quote hard to compare. It is simply 100 square feet."
              squares={sqftToSquares(Number(sqft) || 0)}
            />
          </>
        )}

        {mode === "pitch" && (
          <>
            <Field label="Roof pitch (rise per 12 inches of run)">
              <select className={selectClass} value={rise} onChange={(e) => setRise(e.target.value)}>
                {PITCHES.map((p) => <option key={p} value={p}>{p}:12</option>)}
              </select>
            </Field>
            <Result
              headline={`×${pitchMultiplier(riseN).toFixed(4)}`}
              sub={`${pitchAngleDegrees(riseN).toFixed(1)}° — ${PITCH_BAND_LABEL[band]}`}
              rows={[
                ["Area multiplier", `×${pitchMultiplier(riseN).toFixed(4)}`],
                ["Angle", `${pitchAngleDegrees(riseN).toFixed(2)}°`],
                ["Adds to roof area", `${Math.round((pitchMultiplier(riseN) - 1) * 100)}%`],
              ]}
              note={PITCH_BAND_NOTE[band]}
            />
            <div className="mt-6 flex flex-col items-center gap-5 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
              <PitchDiagram
                risePer12={riseN}
                multiplier={pitchMultiplier(riseN)}
                angle={pitchAngleDegrees(riseN)}
              />
              <p className="text-[13.5px] leading-relaxed text-muted">
                The green line is the roof surface &mdash; the part you pay to
                cover. The flat line beneath it is the ground it sits over. They
                are never the same length, which is why a {riseN}:12 roof needs{" "}
                <span className="font-semibold text-ink">
                  {Math.round((pitchMultiplier(riseN) - 1) * 100)}% more material
                </span>{" "}
                than its footprint suggests.
              </p>
            </div>

            <p className="mt-4 rounded-lg bg-sunken px-4 py-3 text-[13px] leading-relaxed text-muted">
              The multiplier is exact geometry, not an estimate:{" "}
              <span className="font-mono text-[12.5px] text-ink">√(1 + (rise ÷ 12)²)</span>.
              A {riseN}:12 roof has {Math.round((pitchMultiplier(riseN) - 1) * 100)}% more surface
              than the ground it covers, and that is surface you pay to cover.
            </p>
          </>
        )}

        {mode === "shingles" && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Roof size (squares)">
                <input className={inputClass} inputMode="decimal" value={shingleSquares}
                  onChange={(e) => setShingleSquares(e.target.value)} />
              </Field>
              <Field label="Waste factor (%)" hint="Pick the roofline that looks like yours">
                <input type="hidden" value={waste} readOnly />
                {/* Shapes rather than a dropdown: complexity is the input people
                    guess at most, and it drives the waste factor. Looking down
                    at four outlines and picking the match is a recognition task;
                    choosing between the words "moderate" and "complex" is not. */}
                <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Waste factor">
                  {WASTE_GUIDANCE.map((w, i) => {
                    const active = Number(waste) === w.pct;
                    return (
                      <button
                        key={w.pct} type="button" role="radio" aria-checked={active}
                        onClick={() => setWaste(String(w.pct))}
                        className={`rounded-lg border p-2 text-center transition-colors ${
                          active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"}`}
                      >
                        <RoofShape kind={SHAPE_ORDER[i]} />
                        <span className={`mt-1.5 block text-[11px] font-semibold leading-tight ${
                          active ? "text-accent" : "text-muted"}`}>
                          {w.label}
                        </span>
                        <span className="block text-[11px] tnum text-faint">{w.pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
            <Result
              headline={`${shingles.bundles} bundles`}
              sub={`${shingles.squaresWithWaste.toFixed(1)} squares including ${shingles.wastePct}% waste`}
              rows={[
                ["Shingle bundles", `${shingles.bundles} (3 per square)`],
                ["Underlayment rolls", `${shingles.underlaymentRolls} (10 squares each)`],
                ["Roofing nails", `about ${shingles.nailsLb} lb`],
              ]}
              note={WASTE_GUIDANCE.find((w) => w.pct === Number(waste))?.note
                ?? "Waste covers cuts at valleys, hips and rakes. A simple gable wastes least."}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function Result({ headline, sub, rows, note, squares }: {
  headline: string; sub: string; rows: [string, string][]; note: string; squares?: number;
}) {
  return (
    <div className="mt-6 border-t border-line pt-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Result</p>
      <p className="display mt-1.5 text-[34px] font-semibold text-ink sm:text-[40px]">{headline}</p>
      <p className="mt-1 text-[15px] text-muted">{sub}</p>

      <dl className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line/70 pb-2">
            <dt className="text-[13.5px] text-muted">{k}</dt>
            <dd className="text-[14px] font-semibold tnum text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">{note}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-accent-line bg-accent-soft/60 px-4 py-3.5">
        <Badge tone="accent">Exact</Badge>
        <span className="text-[13.5px] text-ink-soft">
          Geometry only — no pricing, so nothing here is estimated.
        </span>
        {squares != null && squares > 0 && (
          <Link
            href={`/roof-cost-calculator/?areaMode=roof&roofAreaSqft=${Math.round(squares * 100)}`}
            className="ml-auto"
          >
            <Button>What should {squares.toFixed(1)} squares cost?</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
