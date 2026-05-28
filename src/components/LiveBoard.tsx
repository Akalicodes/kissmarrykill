"use client";

import { useState } from "react";
import Link from "next/link";
import { useBoard } from "./BoardProvider";
import { getModel } from "@/lib/models";
import { formatMonthLabel } from "@/lib/month";
import type { Category, Leaderboard, RankingRow } from "@/lib/types";

const CATS: { key: Category; title: string; tagline: string; color: string }[] = [
  { key: "kiss",  title: "KISS",  tagline: "the chaotic one",         color: "#d946ef" },
  { key: "marry", title: "MARRY", tagline: "the keeper",              color: "#e8932b" },
  { key: "kill",  title: "KILL",  tagline: "the one that has to go",  color: "#d62828" },
];

export function LiveBoard() {
  const { leaderboard, loading } = useBoard();
  const month = leaderboard?.month;
  const [activeTab, setActiveTab] = useState<Category>("kiss");

  return (
    <section id="board" className="relative px-4 pt-20 md:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <span className="label">the live board</span>
            <h2 className="heading-section mt-1">Today's wall, in real time.</h2>
          </div>
          {month && (
            <span className="chip">snapshot · {formatMonthLabel(month)}</span>
          )}
        </header>

        <div className="whiteboard px-3 py-6 md:px-8 md:py-10">
          <div className="relative z-[1]">
            <h3 className="marker text-center text-3xl uppercase tracking-[0.1em] text-ink/80 md:text-5xl">
              Which A.I. would you…
            </h3>

            {/* ── Mobile tab bar ── */}
            <div className="mt-5 flex rounded-xl bg-ink/8 p-1 md:hidden">
              {CATS.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveTab(cat.key)}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-black uppercase tracking-wider transition-all ${
                    activeTab === cat.key
                      ? "bg-white shadow-sm"
                      : "text-ink/40"
                  }`}
                  style={activeTab === cat.key ? { color: cat.color } : undefined}
                >
                  {cat.title}
                </button>
              ))}
            </div>

            {/* ── Mobile: single column ── */}
            <div className="mt-4 md:hidden">
              {CATS.filter((c) => c.key === activeTab).map((cat) => (
                <Column
                  key={cat.key}
                  cat={cat}
                  data={leaderboard}
                  loading={loading}
                  showDivider={false}
                />
              ))}
            </div>

            {/* ── Desktop: three columns ── */}
            <div className="mt-8 hidden grid-cols-3 gap-4 md:grid">
              {CATS.map((cat, idx) => (
                <Column
                  key={cat.key}
                  cat={cat}
                  data={leaderboard}
                  loading={loading}
                  showDivider={idx < CATS.length - 1}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-3 px-1 text-center text-xs text-white/30">
          live updates every few seconds · one vote per person per month
        </p>
      </div>
    </section>
  );
}

function Column({
  cat,
  data,
  loading,
  showDivider,
}: {
  cat: { key: Category; title: string; tagline: string; color: string };
  data: Leaderboard | null;
  loading: boolean;
  showDivider: boolean;
}) {
  const rows = (data?.[cat.key] ?? []) as RankingRow[];
  const max = Math.max(1, ...rows.map((r) => r.votes));
  const total = rows.reduce((a, b) => a + b.votes, 0);

  return (
    <div className="relative md:px-3">
      {showDivider && (
        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-px bg-ink/10 md:block" />
      )}

      <header className="mb-3 flex items-baseline justify-between border-b border-dashed border-ink/15 pb-2">
        <h4
          className="marker text-3xl uppercase ink-shadow md:text-4xl"
          style={{ color: cat.color }}
        >
          {cat.title}
        </h4>
        <span className="font-sans text-sm font-semibold text-ink/40">
          {total} {total === 1 ? "vote" : "votes"} total
        </span>
      </header>

      <p className="mb-3 font-sans text-sm text-ink/50">{cat.tagline}…</p>

      {loading && rows.length === 0 ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink/40">be the first to vote.</p>
      ) : (
        <ol className="space-y-1">
          {rows.map((r, i) => (
            <BoardRow key={r.slug} row={r} rank={i + 1} accent={cat.color} maxVotes={max} total={total} />
          ))}
        </ol>
      )}
    </div>
  );
}

function BoardRow({
  row,
  rank,
  accent,
  maxVotes,
  total,
}: {
  row: RankingRow;
  rank: number;
  accent: string;
  maxVotes: number;
  total: number;
}) {
  const m = getModel(row.slug);
  if (!m) return null;
  const barPct = (row.votes / maxVotes) * 100;
  const displayPct = total > 0 ? Math.round((row.votes / total) * 100) : 0;

  return (
    <li>
      <Link
        href={`/model/${m.slug}`}
        prefetch={false}
        className="group grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-ink/[0.04]"
      >
        <span className="text-sm font-bold tabular-nums text-ink/40">{rank}.</span>
        <span className="min-w-0 flex-1">
          <span className="hand block truncate text-xl leading-tight text-ink/90 group-hover:text-ink md:text-2xl">
            {m.name}
          </span>
          <span className="relative mt-0.5 block h-1 w-full max-w-[80px]">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${barPct}%`, backgroundColor: accent, opacity: 0.55 }}
            />
          </span>
        </span>
        <span
          className="marker text-xl tabular-nums ink-shadow md:text-2xl"
          style={{ color: accent }}
        >
          {displayPct}%
        </span>
      </Link>
    </li>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-5 animate-pulse rounded bg-ink/10"
          style={{ width: `${90 - i * 9}%` }}
        />
      ))}
    </div>
  );
}
