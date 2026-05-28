"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getModel } from "@/lib/models";
import { playReact } from "@/lib/sound";
import {
  REACTION_KINDS,
  type Category,
  type Reason,
  type ReactionKind,
} from "@/lib/types";

const CAT_COLORS: Record<Category, string> = {
  kiss: "#d946ef",
  marry: "#ffb547",
  kill: "#ff3a3a",
};

const CAT_VERBS: Record<Category, string> = {
  kiss: "kissed",
  marry: "married",
  kill: "killed",
};

const CATS: Array<{ key: "all" | Category; label: string }> = [
  { key: "all", label: "All" },
  { key: "kiss", label: "Kiss" },
  { key: "marry", label: "Marry" },
  { key: "kill", label: "Kill" },
];

const REACTION_EMOJI: Record<ReactionKind, string> = {
  fire: "🔥",
  skull: "💀",
  sob: "😭",
};

const INITIAL_COUNT = 6;

export function ReasonWall() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [cat, setCat] = useState<"all" | Category>("all");
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(true);
  const aborter = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    aborter.current?.abort();
    const ac = new AbortController();
    aborter.current = ac;
    setLoading(true);
    try {
      const u = new URL("/api/reasons", window.location.origin);
      u.searchParams.set("sort", "hot");
      u.searchParams.set("category", cat);
      u.searchParams.set("limit", "24");
      const res = await fetch(u.toString(), {
        cache: "no-store",
        signal: ac.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      setReasons(data.reasons ?? []);
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
    }
  }, [cat]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh in the background every 15s so live reaction counts move.
  useEffect(() => {
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const onReact = useCallback(
    async (reasonId: string, kind: ReactionKind) => {
      // Optimistic update
      setReasons((prev) =>
        prev.map((r) => {
          if (r.id !== reasonId) return r;
          const on = r.myReactions[kind] === 1;
          return {
            ...r,
            reactions: {
              ...r.reactions,
              [kind]: r.reactions[kind] + (on ? -1 : 1),
            },
            myReactions: {
              ...r.myReactions,
              [kind]: on ? 0 : 1,
            },
          };
        }),
      );
      playReact();
      try {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reasonId, kind }),
        });
        if (!res.ok) {
          // revert on failure
          load();
        } else {
          const data = await res.json();
          setReasons((prev) =>
            prev.map((r) =>
              r.id === reasonId
                ? {
                    ...r,
                    reactions: { ...r.reactions, [kind]: data.count },
                    myReactions: { ...r.myReactions, [kind]: data.on ? 1 : 0 },
                  }
                : r,
            ),
          );
        }
      } catch {
        load();
      }
    },
    [load],
  );

  return (
    <section id="reasons" className="relative px-4 pt-20 md:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header — on mobile this acts as the collapse toggle */}
        <header
          className="mb-6 flex cursor-pointer items-center justify-between md:cursor-default"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <div>
            <span className="label">the wall</span>
            <h2 className="heading-section mt-1">The reason wall.</h2>
          </div>
          {/* Chevron only on mobile */}
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-transform duration-300 md:hidden"
            style={{ transform: mobileOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden
          >
            ↓
          </span>
        </header>

        {/* Content: hidden on mobile unless expanded; always visible on desktop */}
        <div className={`${mobileOpen ? "block" : "hidden"} md:block`}>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-xs font-bold uppercase tracking-wider">
            {CATS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => { setCat(c.key); setShowAll(false); }}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  cat === c.key
                    ? "bg-white text-ink"
                    : "text-white/55 hover:text-white"
                }`}
                style={
                  cat === c.key && c.key !== "all"
                    ? { color: CAT_COLORS[c.key as Category], backgroundColor: "rgba(255,255,255,0.92)" }
                    : undefined
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {loading && reasons.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass-soft h-32 animate-pulse"
              />
            ))}
          </div>
        ) : reasons.length === 0 ? (
          <div className="glass p-8 text-center text-white/55">
            no reasons here yet. be the first — vote and leave one above.
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(showAll ? reasons : reasons.slice(0, INITIAL_COUNT)).map((r) => (
                <ReasonCard key={r.id} reason={r} onReact={onReact} />
              ))}
            </ul>
            {!showAll && reasons.length > INITIAL_COUNT && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white/65 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  see more ({reasons.length - INITIAL_COUNT} more)
                </button>
              </div>
            )}
          </>
        )}
        </div> {/* end collapsible */}
      </div>
    </section>
  );
}

function ReasonCard({
  reason: r,
  onReact,
}: {
  reason: Reason;
  onReact: (reasonId: string, kind: ReactionKind) => void;
}) {
  const m = getModel(r.modelSlug);
  const accent = CAT_COLORS[r.category];

  return (
    <li
      className="glass-soft relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-[0_0_40px_-20px_var(--accent)]"
      style={{ ["--accent" as never]: accent } as React.CSSProperties}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ color: accent }}
          >
            {CAT_VERBS[r.category]}
          </span>
          {m && (
            <Link
              href={`/model/${m.slug}`}
              prefetch={false}
              className="flex items-center gap-1.5 hover:text-white"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-sm font-bold text-white hover:underline">
                {m.name}
              </span>
            </Link>
          )}
        </span>
        <time className="text-[10px] uppercase tracking-wider text-white/35">
          {timeAgo(r.at)}
        </time>
      </header>

      <p className="text-sm leading-relaxed text-white/80">
        &ldquo;{r.reason}&rdquo;
      </p>

      <div className="mt-auto flex items-center gap-1.5 pt-1">
        {REACTION_KINDS.map((kind) => {
          const on = r.myReactions[kind] === 1;
          const count = r.reactions[kind];
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onReact(r.id, kind)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums transition-all ${
                on
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:bg-white/10 hover:text-white"
              }`}
              aria-label={`react ${kind}`}
            >
              <span className="text-sm leading-none">{REACTION_EMOJI[kind]}</span>
              <span>{count}</span>
            </button>
          );
        })}
      </div>
    </li>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
