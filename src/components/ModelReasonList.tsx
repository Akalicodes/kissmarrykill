"use client";

import { useCallback, useState } from "react";
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
const REACTION_EMOJI: Record<ReactionKind, string> = {
  fire: "🔥",
  skull: "💀",
  sob: "😭",
};

/**
 * Compact reaction-enabled list of reasons scoped to one model.
 * Mirrors the main Reason Wall's reaction behaviour.
 */
export function ModelReasonList({
  initialReasons,
  modelSlug,
}: {
  initialReasons: Reason[];
  modelSlug: string;
}) {
  const [reasons, setReasons] = useState<Reason[]>(initialReasons);

  const refetch = useCallback(async () => {
    try {
      const u = new URL("/api/reasons", window.location.origin);
      u.searchParams.set("sort", "top");
      u.searchParams.set("model", modelSlug);
      u.searchParams.set("limit", "12");
      const res = await fetch(u.toString(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setReasons(data.reasons ?? []);
    } catch {
      /* ignore */
    }
  }, [modelSlug]);

  const onReact = useCallback(
    async (reasonId: string, kind: ReactionKind) => {
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
            myReactions: { ...r.myReactions, [kind]: on ? 0 : 1 },
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
          refetch();
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
        refetch();
      }
    },
    [refetch],
  );

  if (reasons.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/55">
        no takes about this model yet. vote and leave one — you might be the first.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {reasons.map((r) => {
        const accent = CAT_COLORS[r.category];
        return (
          <li
            key={r.id}
            className="glass-soft flex flex-col gap-3 p-4 transition-shadow hover:shadow-[0_0_40px_-20px_var(--accent)]"
            style={{ ["--accent" as never]: accent } as React.CSSProperties}
          >
            <header className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: accent }}
              >
                {CAT_VERBS[r.category]} it
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
                    <span>{r.reactions[kind]}</span>
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
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
  return `${Math.floor(h / 24)}d ago`;
}
