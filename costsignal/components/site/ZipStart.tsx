"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, inputClass } from "@/components/ui";
import { track } from "@/lib/analytics";

/** The one entry point on the homepage: a ZIP code and a single button. */
export function ZipStart() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const valid = /^\d{5}$/.test(zip);

  return (
    <form
      className="flex flex-col gap-2.5 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        track("zip_searched", { zip, source: "home_hero" });
        router.push(`/roof-cost-calculator?zip=${zip}`);
      }}
    >
      <label className="sr-only" htmlFor="hero-zip">ZIP code</label>
      <input
        id="hero-zip"
        className={`${inputClass} sm:max-w-[168px]`}
        inputMode="numeric"
        maxLength={5}
        placeholder="ZIP code"
        value={zip}
        onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
      />
      <Button type="submit" size="lg" disabled={!valid} className="sm:flex-1">
        Calculate my roof cost
      </Button>
    </form>
  );
}
