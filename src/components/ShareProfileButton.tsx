"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Share button for a model profile page. Uses the native share sheet
 * when available, falls back to copying the URL to the clipboard.
 */
export function ShareProfileButton({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/model/${slug}`
        : `/model/${slug}`;
    const text = `the internet's verdict on ${name} — kiss / marry / kill leaderboard`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: `${name} on KMK.ai`, text, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button type="button" onClick={onShare} className="btn-ghost">
      {copied ? <Check size={14} /> : <Share2 size={14} />}
      {copied ? "link copied!" : "share this profile"}
    </button>
  );
}
