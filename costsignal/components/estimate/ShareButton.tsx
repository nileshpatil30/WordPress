"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { track } from "@/lib/analytics";

/**
 * Copy a link to this exact result.
 *
 * This is the only distribution mechanism in the product that scales without
 * anyone posing as a neutral stranger: the person who ran the numbers sends it
 * to their spouse, or drops it into the thread where somebody asked whether
 * their quote was reasonable. The recipient sees a real answer, immediately,
 * with nothing to fill in.
 */
export function ShareButton({ shareUrl, label = "Copy a link to this result" }: {
  shareUrl: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    const absolute = typeof window === "undefined"
      ? shareUrl : new URL(shareUrl, window.location.origin).toString();
    try {
      // Prefer the native share sheet on phones; that is where a link actually
      // gets sent to a spouse.
      if (typeof navigator !== "undefined" && navigator.share
        && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Roof cost estimate", url: absolute });
        track("estimate_shared", { method: "native" });
        return;
      }
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setFailed(false);
      track("estimate_shared", { method: "clipboard" });
      setTimeout(() => setCopied(false), 2400);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={() => void copy()}>
        {copied ? "Link copied" : label}
      </Button>
      {failed && (
        <p className="mt-2 max-w-md break-all text-[12px] text-faint">
          Copying was blocked. The link is: {shareUrl}
        </p>
      )}
    </div>
  );
}
