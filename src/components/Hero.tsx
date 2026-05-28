"use client";

import { useBoard } from "./BoardProvider";
import { CountUp } from "./CountUp";
import { formatMonthLabel } from "@/lib/month";

export function Hero() {
  const { leaderboard, demoMode } = useBoard();
  const total = leaderboard?.totalVoters ?? 0;
  const month = leaderboard?.month;

  return (
    <section className="relative isolate overflow-hidden px-6 pt-10 md:pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            live
          </span>
          {month && (
            <span className="chip">snapshot in progress · {formatMonthLabel(month)}</span>
          )}
          {demoMode && (
            <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300">
              demo mode · votes reset on server restart
            </span>
          )}
          <a
            href="#origin"
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75 backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <span className="flex -space-x-1">
              <span className="h-2 w-2 rounded-full bg-kiss shadow-[0_0_6px] shadow-kiss/70" />
              <span className="h-2 w-2 rounded-full bg-marry shadow-[0_0_6px] shadow-marry/70" />
              <span className="h-2 w-2 rounded-full bg-kill shadow-[0_0_6px] shadow-kill/70" />
            </span>
            powered by{" "}
            <span className="text-white">VLS</span>
            <span className="text-white/40">+</span>
            <span className="text-white">BG8</span>
          </a>
        </div>

        <h1 className="heading-hero mt-6">
          <span className="block text-white/95">Kiss.</span>
          <span className="block bg-gradient-to-r from-kiss via-marry to-kill bg-clip-text text-transparent">
            Marry. Kill.
          </span>
          <span className="block text-white/95">But for AI.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-white/65 md:text-xl">
          The internet's live public-opinion experiment on every major LLM.
          Pick one to <span className="font-semibold text-kiss">kiss</span>,
          one to <span className="font-semibold text-marry">marry</span>, and
          one to <span className="font-semibold text-kill">kill</span>.
          The leaderboards update as you vote. One vote per person per month —
          no benchmarks, just vibes.
        </p>

        <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
          <Stat
            label="votes this month"
            value={<CountUp value={total} className="text-4xl font-black tabular-nums text-white md:text-5xl" />}
          />
          <Stat
            label="models on the board"
            value={
              <span className="text-4xl font-black tabular-nums text-white md:text-5xl">
                11
              </span>
            }
          />
          <Stat
            label="vibes / second"
            value={
              <span className="text-4xl font-black tabular-nums text-white md:text-5xl">
                ∞
              </span>
            }
          />
          <a
            href="#vote"
            className="ml-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-ink shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.8)] active:scale-[0.99]"
          >
            cast your vote
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {value}
    </div>
  );
}
