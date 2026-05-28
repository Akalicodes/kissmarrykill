"use client";

import Link from "next/link";
import { useBoard } from "./BoardProvider";
import { CountUp } from "./CountUp";
import { getModel } from "@/lib/models";
import type { Category, Leaderboard, RankingRow } from "@/lib/types";

const COLS: { key: Category; title: string; blurb: string; color: string }[] = [
  {
    key: "kiss",
    title: "Kiss",
    blurb: "the chaos rankings — most wanted to spend a night with",
    color: "#d946ef",
  },
  {
    key: "marry",
    title: "Marry",
    blurb: "the loyalty rankings — most trusted long-term",
    color: "#ffb547",
  },
  {
    key: "kill",
    title: "Kill",
    blurb: "the resentment rankings — most wanted gone",
    color: "#ff3a3a",
  },
];

export function Leaderboards() {
  const { leaderboard, loading } = useBoard();

  return (
    <section id="leaderboards" className="relative px-6 pt-20">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <span className="label">step 02</span>
          <h2 className="heading-section mt-1">Watch the rankings move.</h2>
          <p className="mt-2 max-w-xl text-white/60">
            Live tallies from this month's voters. Refreshes every few seconds.
            Old months live in the archive below.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          {COLS.map((col) => (
            <Column
              key={col.key}
              col={col}
              data={leaderboard}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Column({
  col,
  data,
  loading,
}: {
  col: { key: Category; title: string; blurb: string; color: string };
  data: Leaderboard | null;
  loading: boolean;
}) {
  const rows = (data?.[col.key] ?? []) as RankingRow[];
  const max = Math.max(1, ...rows.map((r) => r.votes));
  const total = rows.reduce((a, b) => a + b.votes, 0);

  return (
    <div
      className="glass relative overflow-hidden p-5"
      style={{
        boxShadow: `inset 0 1px 0 0 ${col.color}25, 0 30px 80px -50px ${col.color}80`,
      }}
    >
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
            style={{
              backgroundColor: `${col.color}1a`,
              color: col.color,
              border: `1px solid ${col.color}40`,
            }}
          >
            {col.title}
          </span>
          <p className="mt-2 text-xs leading-snug text-white/55">{col.blurb}</p>
        </div>
        <div className="text-right">
          <div className="label">votes</div>
          <div className="text-2xl font-black tabular-nums text-white">
            <CountUp value={total} />
          </div>
        </div>
      </header>

      {loading && rows.length === 0 ? (
        <SkeletonRows />
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => {
            const m = getModel(r.slug);
            if (!m) return null;
            const pct = (r.votes / max) * 100;
            return (
              <li
                key={r.slug}
                className="group relative grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
              >
                <span
                  className={`text-center text-xs font-black tabular-nums ${
                    i === 0
                      ? "text-white"
                      : i === 1
                        ? "text-white/75"
                        : i === 2
                          ? "text-white/60"
                          : "text-white/35"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/model/${m.slug}`}
                    prefetch={false}
                    className="flex items-center gap-2 outline-none hover:text-white"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: m.color,
                        boxShadow: `0 0 8px ${m.color}99`,
                      }}
                    />
                    <span className="truncate text-sm font-semibold text-white group-hover:underline">
                      {m.name}
                    </span>
                    <span className="truncate text-[10px] uppercase tracking-wider text-white/35">
                      {m.org}
                    </span>
                  </Link>
                  <div className="relative mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${m.color}, ${col.color})`,
                        boxShadow: `0 0 12px ${col.color}80`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-right text-sm font-bold tabular-nums text-white/85">
                  <CountUp value={r.votes} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-xl bg-white/[0.03]"
        />
      ))}
    </div>
  );
}
