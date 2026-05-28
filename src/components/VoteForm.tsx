"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { burstConfetti } from "@/lib/confetti";
import { detectEasterEgg } from "@/lib/easterEggs";
import { MODELS, getModel } from "@/lib/models";
import { playClick, playVote } from "@/lib/sound";
import type { Category } from "@/lib/types";
import { useBoard } from "./BoardProvider";
import { ShareCard } from "./ShareCard";
import { useToast } from "./Toast";

type Picks = Partial<Record<Category, string>>;
type Reasons = Partial<Record<Category, string>>;

const ORDER: Category[] = ["kiss", "marry", "kill"];

const COPY: Record<Category, { verb: string; tagline: string; color: string }> = {
  kiss: {
    verb: "kiss",
    tagline: "the chaotic one. fun, weird, unhinged.",
    color: "#d946ef",
  },
  marry: {
    verb: "marry",
    tagline: "the reliable one. it just works.",
    color: "#ffb547",
  },
  kill: {
    verb: "kill",
    tagline: "the one that disappoints you, every time.",
    color: "#ff3a3a",
  },
};

/**
 * Voting, minimalist version.
 *
 * One question on screen at a time. Tap a model → auto-advance. After three
 * taps the user lands on a tiny review screen with optional inline reasons
 * and one big "lock in" button. No wall of 33 buttons.
 */
export function VoteForm() {
  const { myVote, setLocal, refetch } = useBoard();
  const toast = useToast();
  const [step, setStep] = useState(0); // 0..2 = pick a category, 3 = review
  const [picks, setPicks] = useState<Picks>({});
  const [reasons, setReasons] = useState<Reasons>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const allPicked = picks.kiss && picks.marry && picks.kill;

  if (myVote) {
    return (
      <AlreadyVoted
        onShare={() => setShareOpen(true)}
        shareOpen={shareOpen}
        onCloseShare={() => setShareOpen(false)}
      />
    );
  }

  const onPick = (slug: string) => {
    const cat = ORDER[step];
    setPicks((p) => ({ ...p, [cat]: slug }));
    playClick();
    // Tiny breath, then advance — feels intentional instead of jumpy.
    window.setTimeout(() => setStep((s) => Math.min(3, s + 1)), 180);
  };

  const submit = async () => {
    if (!allPicked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kiss: picks.kiss,
          marry: picks.marry,
          kill: picks.kill,
          kissReason: reasons.kiss?.trim() || null,
          marryReason: reasons.marry?.trim() || null,
          killReason: reasons.kill?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "ALREADY_VOTED") {
          setError("Looks like you already voted this month. Come back on the 1st.");
        } else if (data.error === "RATE_LIMITED") {
          setError("Slow down — too many votes from your network in the last minute.");
        } else {
          setError("Something broke. Try again in a sec.");
        }
        return;
      }
      setLocal({
        leaderboard: data.leaderboard,
        myVote: {
          kiss: picks.kiss!,
          marry: picks.marry!,
          kill: picks.kill!,
        },
      });
      playVote();
      burstConfetti();
      setShareOpen(true);

      const egg = detectEasterEgg({
        kiss: picks.kiss!,
        marry: picks.marry!,
        kill: picks.kill!,
      });
      if (egg) {
        toast.push({ title: egg.title, body: egg.body, tone: "egg" });
      } else {
        toast.push({
          title: "vote locked in",
          body: "your picks are now part of the board.",
        });
      }
      refetch();
    } catch {
      setError("Network blip. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section id="vote" className="relative px-4 pt-20 md:px-6">
        <div className="mx-auto max-w-2xl">
          <header className="mb-6 text-center">
            <span className="label">your turn</span>
            <h2 className="heading-section mt-1">Pick three. That's it.</h2>
          </header>

          <div className="glass relative overflow-hidden p-6 md:p-8">
            <StepDots step={step} picks={picks} onJump={setStep} />

            {step < 3 ? (
              <PickStep
                cat={ORDER[step]}
                selected={picks[ORDER[step]]}
                onPick={onPick}
                onBack={
                  step > 0
                    ? () => setStep((s) => Math.max(0, s - 1))
                    : undefined
                }
                onSkipToReview={
                  allPicked ? () => setStep(3) : undefined
                }
              />
            ) : (
              <ReviewStep
                picks={picks as Required<Picks>}
                reasons={reasons}
                setReason={(cat, v) =>
                  setReasons((r) => ({ ...r, [cat]: v.slice(0, 200) }))
                }
                onEdit={(cat) => setStep(ORDER.indexOf(cat))}
                onSubmit={submit}
                submitting={submitting}
                error={error}
              />
            )}
          </div>

          <p className="mt-3 text-center text-xs text-white/35">
            one vote per person per month · we never store your IP
          </p>
        </div>
      </section>

      {shareOpen && allPicked && (
        <ShareCard
          picks={{
            kiss: picks.kiss!,
            marry: picks.marry!,
            kill: picks.kill!,
          }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}

function StepDots({
  step,
  picks,
  onJump,
}: {
  step: number;
  picks: Picks;
  onJump: (n: number) => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {ORDER.map((cat, i) => {
        const picked = !!picks[cat];
        const active = step === i;
        const color = COPY[cat].color;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => (picked || i <= step ? onJump(i) : undefined)}
            disabled={!picked && i > step}
            aria-label={`go to ${cat} step`}
            className="group flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-white/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
          >
            <span
              className="h-2 w-2 rounded-full transition-all"
              style={{
                backgroundColor: picked || active ? color : "rgba(255,255,255,0.18)",
                boxShadow:
                  picked || active ? `0 0 10px ${color}` : "none",
                transform: active ? "scale(1.4)" : "scale(1)",
              }}
            />
            <span
              className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                active ? "text-white" : picked ? "text-white/65" : "text-white/30"
              }`}
            >
              {cat}
            </span>
          </button>
        );
      })}
      {step === 3 && (
        <span className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/85">
          · review
        </span>
      )}
    </div>
  );
}

function PickStep({
  cat,
  selected,
  onPick,
  onBack,
  onSkipToReview,
}: {
  cat: Category;
  selected: string | undefined;
  onPick: (slug: string) => void;
  onBack?: () => void;
  onSkipToReview?: () => void;
}) {
  const c = COPY[cat];
  const accent = useMemo(() => c.color, [c.color]);

  return (
    <div className="animate-rise">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.22em] text-white/40">
          you'd
        </p>
        <h3
          className="marker mt-1 text-6xl uppercase ink-shadow md:text-7xl"
          style={{ color: accent }}
        >
          {c.verb}
        </h3>
        <p className="mt-2 hand text-xl text-white/55">{c.tagline}</p>
      </div>

      <ul className="mt-7 flex flex-wrap justify-center gap-2">
        {MODELS.map((m) => {
          const isSel = selected === m.slug;
          return (
            <li key={m.slug}>
              <button
                type="button"
                onClick={() => onPick(m.slug)}
                className={`group flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${
                  isSel
                    ? "border-white/60 bg-white text-ink scale-[1.03]"
                    : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
                }`}
                style={
                  isSel
                    ? { boxShadow: `0 0 30px -8px ${accent}, inset 0 0 0 1px ${m.color}66` }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: m.color,
                    boxShadow: isSel
                      ? `0 0 10px ${m.color}`
                      : `0 0 6px ${m.color}80`,
                  }}
                />
                {m.name}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-7 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/45">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-3 py-1.5 hover:text-white"
          >
            ← back
          </button>
        ) : (
          <span />
        )}
        {onSkipToReview && (
          <button
            type="button"
            onClick={onSkipToReview}
            className="rounded-full px-3 py-1.5 hover:text-white"
          >
            jump to review →
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewStep({
  picks,
  reasons,
  setReason,
  onEdit,
  onSubmit,
  submitting,
  error,
}: {
  picks: Required<Picks>;
  reasons: Reasons;
  setReason: (cat: Category, v: string) => void;
  onEdit: (cat: Category) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="animate-rise">
      <div className="text-center">
        <h3 className="font-display text-2xl font-black text-white md:text-3xl">
          Your picks.
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
          Reasons are optional — they're what makes the wall fun. Skip them and
          just lock in if you want.
        </p>
      </div>

      <ul className="mt-6 space-y-3">
        {ORDER.map((cat) => {
          const m = getModel(picks[cat]);
          const c = COPY[cat];
          if (!m) return null;
          return (
            <li
              key={cat}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
            >
              <span
                className="marker text-2xl uppercase ink-shadow"
                style={{ color: c.color, minWidth: "5.5rem" }}
              >
                {c.verb}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: m.color,
                    boxShadow: `0 0 8px ${m.color}`,
                  }}
                />
                <span className="text-base font-bold text-white">{m.name}</span>
              </span>
              <button
                type="button"
                onClick={() => onEdit(cat)}
                className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 hover:text-white"
              >
                change
              </button>
              <input
                type="text"
                value={reasons[cat] ?? ""}
                onChange={(e) => setReason(cat, e.target.value)}
                placeholder={`why? (optional)`}
                maxLength={200}
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/85 placeholder:text-white/25 focus:border-white/30 focus:outline-none"
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col items-center gap-2">
        {error && (
          <span className="text-sm font-medium text-kill">{error}</span>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="btn-primary w-full max-w-sm justify-center"
        >
          {submitting ? "locking in…" : "lock in my picks"}
        </button>
        <button
          type="button"
          onClick={() => onEdit("kill")}
          className="text-xs uppercase tracking-[0.18em] text-white/35 hover:text-white"
        >
          ← back
        </button>
      </div>
    </div>
  );
}

function AlreadyVoted({
  onShare,
  shareOpen,
  onCloseShare,
}: {
  onShare: () => void;
  shareOpen: boolean;
  onCloseShare: () => void;
}) {
  const { myVote, leaderboard } = useBoard();
  if (!myVote) return null;
  return (
    <>
      <section id="vote" className="relative px-6 pt-20">
        <div className="mx-auto max-w-2xl">
          <div className="glass p-8 text-center">
            <span className="label">you already voted this month</span>
            <h2 className="heading-section mt-2">
              Locked in.
            </h2>
            <p className="mt-2 text-white/60">
              Your picks for{" "}
              <span className="font-semibold text-white">
                {leaderboard?.month}
              </span>
              :
            </p>
            <ul className="mt-6 flex flex-wrap justify-center gap-3">
              {(["kiss", "marry", "kill"] as Category[]).map((cat) => {
                const m = getModel(myVote[cat]);
                const c = COPY[cat];
                if (!m) return null;
                return (
                  <li key={cat}>
                    <Link
                      href={`/model/${m.slug}`}
                      prefetch={false}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    >
                      <span
                        className="marker text-lg uppercase ink-shadow"
                        style={{ color: c.color }}
                      >
                        {c.verb}
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: m.color,
                            boxShadow: `0 0 10px ${m.color}`,
                          }}
                        />
                        <span className="text-base font-bold text-white">
                          {m.name}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={onShare} className="btn-ghost">
                <Share2 size={14} />
                share my picks
              </button>
            </div>
            <p className="mt-6 text-sm text-white/45">
              Want to change your mind? Come back on the 1st when the snapshot
              drops.
            </p>
          </div>
        </div>
      </section>
      {shareOpen && myVote && (
        <ShareCard picks={myVote} onClose={onCloseShare} />
      )}
    </>
  );
}
