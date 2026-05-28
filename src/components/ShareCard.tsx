"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Share2, X } from "lucide-react";
import { getModel } from "@/lib/models";
import type { Category } from "@/lib/types";

type Picks = Record<Category, string>;

/**
 * Post-vote share modal. Built around the /api/share/og image so the same
 * graphic that powers OG previews is also what users download / post.
 */
export function ShareCard({
  picks,
  onClose,
}: {
  picks: Picks;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"link" | "x" | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const imgUrl = useMemo(() => {
    if (!origin) return "";
    const u = new URL("/api/share/og", origin);
    u.searchParams.set("kiss", picks.kiss);
    u.searchParams.set("marry", picks.marry);
    u.searchParams.set("kill", picks.kill);
    return u.toString();
  }, [origin, picks]);

  const shareUrl = useMemo(() => {
    if (!origin) return "";
    const u = new URL("/", origin);
    u.searchParams.set("kiss", picks.kiss);
    u.searchParams.set("marry", picks.marry);
    u.searchParams.set("kill", picks.kill);
    return u.toString();
  }, [origin, picks]);

  const tweet = useMemo(() => {
    const k = getModel(picks.kiss)?.name ?? picks.kiss;
    const m = getModel(picks.marry)?.name ?? picks.marry;
    const x = getModel(picks.kill)?.name ?? picks.kill;
    return `kiss: ${k}\nmarry: ${m}\nkill: ${x}\n\nthe LLM "kiss marry kill" leaderboard ${shareUrl}`;
  }, [picks, shareUrl]);

  const tweetUrl = useMemo(
    () =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`,
    [tweet],
  );

  const threadsUrl = useMemo(
    () =>
      `https://www.threads.net/intent/post?text=${encodeURIComponent(tweet)}`,
    [tweet],
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied("link");
    setTimeout(() => setCopied(null), 1500);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(tweet);
    setCopied("x");
    setTimeout(() => setCopied(null), 1500);
  };

  const downloadImage = async () => {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kmkai-${picks.kiss}-${picks.marry}-${picks.kill}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({
        title: "my Kiss / Marry / Kill: AI picks",
        text: tweet,
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-[0_60px_120px_-20px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="close share card"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition-colors hover:bg-white/20"
        >
          <X size={16} />
        </button>

        <div className="border-b border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
            your vote card
          </div>
          <div className="mt-1 text-xl font-black text-white">
            you're in. now make your group chat argue about it.
          </div>
        </div>

        <div className="relative aspect-[1200/630] w-full overflow-hidden bg-black/40">
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt="your kiss, marry, kill picks rendered as a shareable card"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/50">
              rendering…
            </div>
          )}
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost justify-center"
          >
            <Share2 size={14} />
            share to X
          </a>
          <a
            href={threadsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost justify-center"
          >
            <Share2 size={14} />
            share to Threads
          </a>
          <button type="button" onClick={downloadImage} className="btn-ghost justify-center">
            <Download size={14} />
            download image
          </button>
          <button
            type="button"
            onClick={typeof navigator !== "undefined" && "share" in navigator ? nativeShare : copyLink}
            className="btn-ghost justify-center"
          >
            <Copy size={14} />
            {copied === "link" ? "link copied!" : "copy link"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/30 p-3 text-xs text-white/40">
          <button
            type="button"
            onClick={copyText}
            className="flex items-center gap-2 truncate text-left hover:text-white/70"
          >
            <Copy size={12} />
            <span className="truncate">
              {copied === "x" ? "caption copied" : "copy caption text"}
            </span>
          </button>
          <a
            href={imgUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 hover:text-white/70"
          >
            open image →
          </a>
        </div>
      </div>
    </div>
  );
}
