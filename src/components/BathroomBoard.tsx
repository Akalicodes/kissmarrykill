"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useBoard } from "./BoardProvider";
import { burstConfetti } from "@/lib/confetti";
import { getModel, MODELS, resolveSlug, type Model } from "@/lib/models";
import { formatMonthLabel } from "@/lib/month";
import { playVote } from "@/lib/sound";
import type { ArchiveEntry, Category, Leaderboard, RankingRow, WallSample } from "@/lib/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const CATS = [
  { key: "kiss"  as Category, title: "KISS",  headingRot: -3, color: "#e0589b" },
  { key: "marry" as Category, title: "MARRY", headingRot:  2, color: "#2bb39a" },
  { key: "kill"  as Category, title: "KILL",  headingRot: -2, color: "#ef6351" },
];

const SANS = "var(--font-outfit), sans-serif";

const HANDS: { font: string; scale: number; weight: number }[] = [
  { font: "var(--font-shadows), cursive",      scale: 1.06, weight: 400 },
  { font: "var(--font-caveat), cursive",        scale: 1.30, weight: 700 },
  { font: "var(--font-gochi-hand), cursive",    scale: 0.96, weight: 400 },
  { font: "var(--font-patrick-hand), cursive",  scale: 1.02, weight: 400 },
  { font: "var(--font-nanum-pen), cursive",     scale: 1.42, weight: 400 },
  { font: "var(--font-reenie), cursive",        scale: 1.50, weight: 400 },
  { font: "var(--font-gloria), cursive",        scale: 0.86, weight: 400 },
  { font: "var(--font-indie-flower), cursive",  scale: 1.05, weight: 400 },
];

const INKS = [
  "#e0589b", "#ef6351", "#f4a259", "#5bbf8a",
  "#2bb39a", "#3d9bd6", "#5a7fe0", "#8b6fd6",
  "#b367c9", "#566173",
];

// Total scrawls per column. Mobile is much tighter so the page doesn't scroll
// forever — about half of them get reasons attached, which still feels alive.
const FILL_DESKTOP = 22;
const FILL_NARROW  = 9;
// Roughly what fraction of slots should get a real reason attached.
const REASON_FRACTION_DESKTOP = 0.55;
const REASON_FRACTION_NARROW  = 0.65;

// ─── RNG ─────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ─── Suggestion list (model-only) ─────────────────────────────────────────────

const ALIASES: Record<string, string> = {
  gpt: "chatgpt", "chat gpt": "chatgpt", openai: "chatgpt", "open ai": "chatgpt",
  anthropic: "claude", sonnet: "claude", opus: "claude",
  bard: "gemini", google: "gemini",
  xai: "grok",
  meta: "llama", facebook: "llama",
  "le chat": "mistral",
  alibaba: "qwen",
  microsoft: "copilot", "co pilot": "copilot",
};

function suggestModels(draft: string): Model[] {
  const t = draft.trim().toLowerCase();
  if (!t) return MODELS.filter((m) => m.slug !== "other");
  const scored = MODELS.map((m) => {
    const name = m.name.toLowerCase();
    let score = -1;
    if (name === t || m.slug === t) score = 100;
    else if (name.startsWith(t) || m.slug.startsWith(t)) score = 80;
    else if (name.includes(t) || m.slug.includes(t)) score = 60;
    for (const [alias, slug] of Object.entries(ALIASES)) {
      if (slug !== m.slug) continue;
      if (alias === t) score = Math.max(score, 90);
      else if (alias.startsWith(t)) score = Math.max(score, 72);
      else if (alias.includes(t)) score = Math.max(score, 50);
    }
    return { m, score };
  })
    .filter((x) => x.score >= 0 && x.m.slug !== "other")
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.m);
}

// ─── Per-scrawl handwriting style ─────────────────────────────────────────────

interface ScrawlStyle {
  font: string;
  color: string;
  rotate: number;
  size: number; // rem
  upper: boolean;
  lower: boolean;
  weight: number;
}

function scrawlStyle(seedKey: string, isNarrow: boolean): ScrawlStyle {
  const rnd = mulberry32(hashStr(seedKey));
  const hand = HANDS[Math.floor(rnd() * HANDS.length)];
  const color = INKS[Math.floor(rnd() * INKS.length)];
  // Tighter rotation range — visually still hand-lettered, no overlap.
  const rotate = (rnd() - 0.5) * 4.5; // ±2.25°
  // Mobile is tighter — smaller base sizes so we fit more in less vertical space.
  const baseMin = isNarrow ? 1.0  : 1.45;
  const baseMax = isNarrow ? 1.4  : 1.95;
  const size = (baseMin + rnd() * (baseMax - baseMin)) * hand.scale;
  const caseRoll = rnd();
  return { font: hand.font, color, rotate, size, upper: caseRoll > 0.85, lower: caseRoll < 0.18, weight: hand.weight };
}

function caseText(name: string, s: ScrawlStyle): string {
  if (s.upper) return name.toUpperCase();
  if (s.lower) return name.toLowerCase();
  return name;
}

// ─── Fill distribution ────────────────────────────────────────────────────────

type Instance = { slug: string; key: string; reason?: string };

function buildInstances(
  rows: RankingRow[],
  target: number,
  cat: Category,
  samples: WallSample[],
  reasonFraction: number,
): Instance[] {
  const pool = rows.length ? rows : MODELS.filter((m) => m.slug !== "other").map((m) => ({ slug: m.slug, votes: 0 }));
  const total = pool.reduce((a, r) => a + r.votes, 0);
  const counts = new Map<string, number>();
  if (total <= 0) {
    const each = Math.floor(target / pool.length);
    for (const r of pool) counts.set(r.slug, each);
    let rem = target - each * pool.length;
    for (let i = 0; rem > 0; i++, rem--) {
      const s = pool[i % pool.length].slug;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  } else {
    const exact = pool.map((r) => ({ slug: r.slug, raw: (target * r.votes) / total }));
    for (const e of exact) counts.set(e.slug, Math.floor(e.raw));
    let rem = target - [...counts.values()].reduce((a, b) => a + b, 0);
    const byFrac = exact
      .map((e) => ({ slug: e.slug, frac: e.raw - Math.floor(e.raw) }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; rem > 0 && byFrac.length; k++, rem--) {
      const slug = byFrac[k % byFrac.length].slug;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }

  // Bucket the samples by slug so we can hand a real reason to a slot that
  // matches that slug. Each reason gets used at most once per render.
  const reasonsBySlug = new Map<string, string[]>();
  for (const s of samples) {
    const arr = reasonsBySlug.get(s.slug);
    if (arr) arr.push(s.reason);
    else reasonsBySlug.set(s.slug, [s.reason]);
  }
  const reasonBudgetPerSlug = new Map<string, number>();
  for (const [slug, n] of counts) {
    const wantWith = Math.round(n * reasonFraction);
    const have = reasonsBySlug.get(slug)?.length ?? 0;
    reasonBudgetPerSlug.set(slug, Math.min(wantWith, have));
  }

  const out: Instance[] = [];
  for (const [slug, n] of counts) {
    let budget = reasonBudgetPerSlug.get(slug) ?? 0;
    const reasons = reasonsBySlug.get(slug);
    for (let o = 0; o < n; o++) {
      let reason: string | undefined;
      if (budget > 0 && reasons && reasons.length) {
        reason = reasons.shift();
        budget -= 1;
      }
      out.push({ slug, key: `${cat}:${slug}#${o}`, reason });
    }
  }
  out.sort((a, b) => hashStr(a.key + "~order") - hashStr(b.key + "~order"));
  return out;
}

// ─── Percentage breakdown ─────────────────────────────────────────────────────

type Share = { slug: string; votes: number; pct: number };

function buildBreakdown(rows: RankingRow[]): Share[] {
  const total = rows.reduce((a, r) => a + r.votes, 0);
  if (total <= 0) return [];
  return rows
    .filter((r) => r.votes > 0)
    .map((r) => ({ slug: r.slug, votes: r.votes, pct: (r.votes / total) * 100 }))
    .sort((a, b) => b.votes - a.votes);
}

// ─── Month dropdown ───────────────────────────────────────────────────────────

function MonthDropdown({ months, selected, onChange }: {
  months: string[];
  selected: string;
  onChange: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const label = selected === "live" ? "LIVE" : formatMonthLabel(selected);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: SANS, fontWeight: 700, fontSize: "clamp(1rem, 3vw, 1.5rem)",
          background: "none", border: "none", borderBottom: "2.5px solid #111",
          color: "#111", cursor: "pointer", padding: "0 0.15rem 2px",
          display: "inline-flex", alignItems: "center", gap: "0.3rem", lineHeight: 1.1,
        }}
      >
        {label}
        <span style={{ fontSize: "0.65em" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
          background: "#f7f2e5", border: "2px solid #111", borderRadius: "6px",
          boxShadow: "4px 4px 0 rgba(0,0,0,0.12)", minWidth: "160px", overflow: "hidden",
        }}>
          {months.map((m) => {
            const active = m === selected;
            return (
              <button
                key={m}
                type="button"
                onClick={() => { onChange(m); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "0.45rem 0.85rem", fontFamily: SANS, fontSize: "0.95rem",
                  color: "#111", fontWeight: active ? 700 : 400,
                  background: active ? "rgba(0,0,0,0.06)" : "none", border: "none",
                  borderBottom: "1px solid rgba(0,0,0,0.08)", cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = active ? "rgba(0,0,0,0.06)" : "none")}
              >
                {m === "live" ? "LIVE" : formatMonthLabel(m)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BoardData = (Leaderboard | ArchiveEntry) | null;
type MyScrawl = { id: number; text: string; slug: string; reason?: string };
type ActiveInput = { cat: Category; xPct: number; yPct: number } | null;
type WriterStep = "name" | "reason";

// ─── BathroomBoard ────────────────────────────────────────────────────────────

export function BathroomBoard() {
  const { leaderboard, loading, refetch } = useBoard();

  const [archive, setArchive]        = useState<ArchiveEntry[]>([]);
  const [selectedMonth, setSelected] = useState<string>("live");
  const [isNarrow, setIsNarrow]      = useState(false);

  const [myScrawls, setMyScrawls]    = useState<Record<Category, MyScrawl[]>>({ kiss: [], marry: [], kill: [] });
  const [active, setActive]          = useState<ActiveInput>(null);

  const [writerStep, setWriterStep]   = useState<WriterStep>("name");
  const [draftName, setDraftName]     = useState("");
  const [pendingSlug, setPendingSlug] = useState("");
  const [pendingText, setPendingText] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const scrawlSeq = useRef(0);

  // Per-category "✓ posted" pop. Cleared automatically after 1.6s. Keyed by
  // (cat, sequence number) so consecutive posts in the same column re-trigger
  // the animation cleanly.
  const [postedFlash, setPostedFlash] = useState<{ cat: Category; key: number } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const sync = () => setIsNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    fetch("/api/archive", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setArchive(d.archive ?? []))
      .catch(() => {});
  }, []);

  const isLive     = selectedMonth === "live";
  const boardData: BoardData = isLive ? leaderboard : (archive.find((e) => e.month === selectedMonth) ?? null);
  const voterCount = boardData?.totalVoters ?? 0;
  const fill       = isNarrow ? FILL_NARROW : FILL_DESKTOP;
  const monthList  = ["live", ...archive.map((e) => e.month)];

  const resetWriter = useCallback(() => {
    // Drop focus so the mobile keyboard doesn't keep covering the wall and
    // intercepting the user's next tap (one of the more annoying iOS quirks).
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setActive(null);
    setWriterStep("name");
    setDraftName("");
    setPendingSlug("");
    setPendingText("");
    setDraftReason("");
  }, []);

  const commitScrawl = useCallback(
    (cat: Category, text: string, slug: string, reason?: string) => {
      scrawlSeq.current += 1;
      const id = scrawlSeq.current;
      setMyScrawls((prev) => ({ ...prev, [cat]: [{ id, text, slug, reason }, ...prev[cat]] }));
      // Drop any focus on the input before tearing down so the mobile keyboard
      // doesn't linger over the wall and block the next tap.
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      resetWriter();

      // Celebrate. Confetti + soft chime + inline "posted ✓" near the column.
      // Wrapped in try/catch so a flaky AudioContext on iOS can't silence the
      // post itself.
      try { burstConfetti({ count: 70 }); } catch { /* noop */ }
      try { playVote(); } catch { /* noop */ }
      setPostedFlash({ cat, key: id });
      window.setTimeout(() => {
        setPostedFlash((p) => (p && p.key === id ? null : p));
      }, 1600);

      fetch("/api/scrawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, text, reason: reason || undefined }),
      })
        .then(() => setTimeout(refetch, 400))
        .catch(() => {});
    },
    [refetch, resetWriter],
  );

  const openInput = useCallback(
    (cat: Category, e: React.MouseEvent<HTMLDivElement>) => {
      if (!isLive) return;
      // One scrawl per category per visit — keeps the "kiss/marry/kill"
      // contract honest. People can still re-cast by reloading.
      if (myScrawls[cat].length > 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      setDraftName("");
      setPendingSlug("");
      setPendingText("");
      setDraftReason("");
      setWriterStep("name");
      setActive({ cat, xPct: Math.min(60, Math.max(2, xPct)), yPct: Math.min(70, Math.max(2, yPct)) });
    },
    [isLive, myScrawls],
  );

  const handleNameConfirm = useCallback((text: string, slug: string) => {
    setPendingText(text);
    setPendingSlug(slug);
    setDraftReason("");
    setWriterStep("reason");
  }, []);

  const handleReasonSubmit = useCallback((reason?: string) => {
    if (!active) return;
    commitScrawl(active.cat, pendingText, pendingSlug, reason);
  }, [active, commitScrawl, pendingText, pendingSlug]);

  const activeCat = active ? CATS.find((c) => c.key === active.cat) : null;

  return (
    <section id="board" className="relative px-1.5 pt-3 pb-10 sm:px-6 sm:pt-8 sm:pb-20">
      <div className="mx-auto max-w-6xl">
        <div
          className="whiteboard"
          style={{
            padding: isNarrow
              ? "0.85rem 0.65rem 0.9rem"
              : "clamp(1.5rem, 4vw, 2.75rem) clamp(1rem, 3vw, 2.25rem)",
          }}
        >
          {/* ── Title row ── */}
          <div style={{
            display: "flex",
            alignItems: isNarrow ? "flex-start" : "baseline",
            flexDirection: isNarrow ? "column" : "row",
            flexWrap: "wrap",
            gap: isNarrow ? "0.35rem" : "0.6rem 1.1rem",
            marginBottom: isNarrow ? "0.6rem" : "0.9rem",
          }}>
            <h2
              className="marker"
              style={{
                fontWeight: 400,
                fontSize: isNarrow ? "clamp(1.25rem, 6vw, 1.85rem)" : "clamp(2rem, 5vw, 3.4rem)",
                color: "#1a1a1a", lineHeight: 1.05, margin: 0,
                transform: "rotate(-1deg)",
                whiteSpace: "nowrap",
              }}
            >
              Which A.I. would you&hellip;
            </h2>
            <div style={{
              display: "flex", alignItems: "center", gap: isNarrow ? "0.55rem" : "1.1rem",
              flexWrap: "wrap",
            }}>
              <MonthDropdown months={monthList} selected={selectedMonth} onChange={setSelected} />
              {voterCount > 0 && (
                <span style={{
                  fontFamily: SANS, fontWeight: 500,
                  fontSize: isNarrow ? "0.78rem" : "0.95rem", color: "#666",
                }}>
                  {voterCount.toLocaleString()} {isLive ? "hands on the wall" : "hands that month"}
                </span>
              )}
            </div>
          </div>

          {/* ── Hint card (white paper, marker stripe) ── */}
          {isLive && (
            <div
              style={{
                position: "relative",
                background: "rgba(255,255,253,0.85)",
                borderRadius: isNarrow ? "12px" : "14px",
                padding: isNarrow ? "0.6rem 0.85rem 0.65rem 0.95rem" : "1.05rem 1.4rem 1.1rem 1.55rem",
                marginBottom: isNarrow ? "0.7rem" : "1.4rem",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.6) inset, 0 6px 22px -10px rgba(0,0,0,0.18), 0 2px 0 rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              {/* Three-color marker stripe down the left edge — kiss / marry / kill */}
              <div
                aria-hidden
                style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: isNarrow ? 5 : 7,
                  background: "linear-gradient(180deg, #e0589b 0% 33.33%, #2bb39a 33.33% 66.66%, #ef6351 66.66% 100%)",
                }}
              />
              <div style={{
                display: "flex", alignItems: "center",
                gap: isNarrow ? "0.55rem" : "0.95rem",
              }}>
                <span
                  aria-hidden
                  style={{
                    fontSize: isNarrow ? "1.25rem" : "2rem",
                    lineHeight: 1, flexShrink: 0,
                    transform: "rotate(-12deg)",
                    filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
                  }}
                >
                  ✏️
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    className={isNarrow ? "marker crisp" : "marker"}
                    style={{
                      fontFamily: "var(--font-permanent-marker), cursive",
                      fontWeight: 400,
                      fontSize: isNarrow ? "0.92rem" : "1.45rem",
                      color: "#1a1a1a", lineHeight: 1.15,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {isNarrow ? "Tap a column to write" : "Tap a column to write on the wall"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-caveat), cursive",
                      fontWeight: 600,
                      fontSize: isNarrow ? "0.82rem" : "1.1rem",
                      color: "#5b5448",
                      marginTop: "0.05rem",
                      lineHeight: 1.2,
                    }}
                  >
                    type any name &mdash; drop a hot take too
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Three columns ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, 1fr)",
            gap: isNarrow ? "0.5rem" : "0",
          }}>
            {CATS.map((cat, ci) => {
              const rows      = (boardData?.[cat.key] ?? []) as RankingRow[];
              const liveSamples = (boardData && "samples" in boardData ? boardData.samples : undefined);
              const samples   = liveSamples?.[cat.key] ?? [];
              const reasonFraction = isNarrow ? REASON_FRACTION_NARROW : REASON_FRACTION_DESKTOP;
              const instances = buildInstances(rows, fill, cat.key, samples, reasonFraction);
              const breakdown = buildBreakdown(rows);
              const alreadyPosted = myScrawls[cat.key].length > 0;
              return (
                <WallColumn
                  key={cat.key}
                  cat={cat}
                  catIdx={ci}
                  instances={instances}
                  breakdown={breakdown}
                  isNarrow={isNarrow}
                  isLive={isLive}
                  loading={loading && isLive}
                  myScrawls={myScrawls[cat.key]}
                  alreadyPosted={alreadyPosted}
                  desktopActive={!isNarrow && active?.cat === cat.key ? active : null}
                  writerStep={writerStep}
                  draftName={draftName}
                  draftReason={draftReason}
                  postedFlash={postedFlash?.cat === cat.key ? postedFlash : null}
                  onColumnClick={(e) => openInput(cat.key, e)}
                  onDraftNameChange={setDraftName}
                  onDraftReasonChange={setDraftReason}
                  onNameConfirm={handleNameConfirm}
                  onReasonSubmit={handleReasonSubmit}
                  onCancel={resetWriter}
                />
              );
            })}
          </div>

          {/* ── Branding ── */}
          <div style={{
            marginTop: isNarrow ? "0.85rem" : "1.75rem",
            paddingTop: isNarrow ? "0.65rem" : "1rem",
            borderTop: "1px solid rgba(0,0,0,0.1)",
            display: "flex", alignItems: "center",
            gap: "0.35rem", flexWrap: "wrap",
          }}>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: isNarrow ? "0.78rem" : "0.85rem", color: "#888" }}>powered by</span>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: isNarrow ? "0.92rem" : "1rem", color: "#16a34a" }}>VLS</span>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: isNarrow ? "0.78rem" : "0.85rem", color: "#888" }}>+</span>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: isNarrow ? "0.92rem" : "1rem", color: "#1d4ed8" }}>BG8</span>
          </div>
        </div>

        <p style={{
          marginTop: "0.6rem", textAlign: "center", fontFamily: SANS,
          fontSize: isNarrow ? "0.7rem" : "0.78rem", color: "rgba(0,0,0,0.4)",
        }}>
          live wall · updates every few seconds · write as many as you like
        </p>
      </div>

      {/* ── Mobile bottom sheet writer ── */}
      {isNarrow && active && activeCat && (
        <MobileWriter
          cat={activeCat}
          step={writerStep}
          draftName={draftName}
          draftReason={draftReason}
          pendingText={pendingText}
          onDraftNameChange={setDraftName}
          onDraftReasonChange={setDraftReason}
          onNameConfirm={handleNameConfirm}
          onReasonSubmit={handleReasonSubmit}
          onCancel={resetWriter}
        />
      )}
    </section>
  );
}

// ─── WallColumn ───────────────────────────────────────────────────────────────

function WallColumn({
  cat, catIdx, instances, breakdown, isNarrow, isLive, loading,
  myScrawls, alreadyPosted, desktopActive, writerStep, draftName, draftReason,
  postedFlash,
  onColumnClick, onDraftNameChange, onDraftReasonChange,
  onNameConfirm, onReasonSubmit, onCancel,
}: {
  cat: typeof CATS[0];
  catIdx: number;
  instances: Instance[];
  breakdown: Share[];
  isNarrow: boolean;
  isLive: boolean;
  loading: boolean;
  myScrawls: MyScrawl[];
  alreadyPosted: boolean;
  desktopActive: { cat: Category; xPct: number; yPct: number } | null;
  writerStep: WriterStep;
  draftName: string;
  draftReason: string;
  postedFlash: { cat: Category; key: number } | null;
  onColumnClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDraftNameChange: (t: string) => void;
  onDraftReasonChange: (t: string) => void;
  onNameConfirm: (text: string, slug: string) => void;
  onReasonSubmit: (reason?: string) => void;
  onCancel: () => void;
}) {
  const clickable = isLive && !alreadyPosted;
  return (
    <div
      onClick={clickable ? onColumnClick : undefined}
      className="wall-col"
      data-clickable={clickable ? "true" : "false"}
      style={{
        position: "relative",
        cursor: clickable ? "text" : "default",
        padding: isNarrow ? "0.45rem 0.55rem 0.7rem" : "0.5rem 1rem 1.25rem",
        borderRight: !isNarrow && catIdx < 2 ? "2px solid rgba(0,0,0,0.10)" : "none",
        borderBottom: isNarrow && catIdx < 2 ? "1px dashed rgba(0,0,0,0.16)" : "none",
        // Generous mobile tap area so any tap inside the column reliably opens
        // the writer (and not just exact taps on the heading or text).
        minHeight: isNarrow ? "240px" : "clamp(460px, 64vh, 720px)",
      }}
    >
      {/* Heading + tap-cue (mobile only) */}
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "0.6rem",
        marginBottom: isNarrow ? "0.45rem" : "1.1rem",
      }}>
        <h3
          className="marker"
          style={{
            fontWeight: 400,
            fontSize: isNarrow ? "clamp(1.6rem, 7.5vw, 2.1rem)" : "clamp(2.1rem, 4.5vw, 3.2rem)",
            color: cat.color,
            transform: `rotate(${cat.headingRot}deg)`,
            display: "inline-block",
            lineHeight: 1,
            margin: 0,
            textShadow: "0 1px 0 rgba(0,0,0,0.05)",
            whiteSpace: "nowrap",
          }}
        >
          {cat.title}
        </h3>
        {postedFlash ? (
          <span
            key={postedFlash.key}
            className="posted-pop crisp"
            style={{
              fontFamily: "var(--font-permanent-marker), cursive",
              fontSize: isNarrow ? "0.95rem" : "1.1rem",
              color: cat.color,
              fontWeight: 400,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              transform: "rotate(-3deg)",
              border: `2px solid ${cat.color}`,
              borderRadius: "999px",
              padding: isNarrow ? "0.15rem 0.55rem" : "0.2rem 0.7rem",
              background: "rgba(255,255,253,0.85)",
              boxShadow: `0 6px 18px -8px ${cat.color}80`,
            }}
          >
            posted ✓
          </span>
        ) : alreadyPosted ? (
          <span
            className="crisp"
            style={{
              fontFamily: SANS,
              fontSize: isNarrow ? "0.7rem" : "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: cat.color,
              border: `1.5px solid ${cat.color}55`,
              background: "rgba(255,255,253,0.7)",
              borderRadius: "999px",
              padding: isNarrow ? "0.18rem 0.5rem" : "0.2rem 0.6rem",
              whiteSpace: "nowrap",
              opacity: 0.95,
            }}
          >
            ✓ your pick
          </span>
        ) : (
          isLive && (
            <span
              style={{
                fontFamily: "var(--font-caveat), cursive",
                fontSize: isNarrow ? "0.95rem" : "1rem",
                color: cat.color,
                fontWeight: 700,
                opacity: 0.85,
                whiteSpace: "nowrap",
              }}
            >
              tap to add ✎
            </span>
          )
        )}
      </div>

      {/* Scrawl flow */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignContent: "flex-start",
          alignItems: "flex-start",
          // Tighter on mobile; reasoned scrawls already break into 2 lines so
          // a smaller row gap looks intentional, not crammed.
          gap: isNarrow ? "0.55rem 0.85rem" : "1.25rem 1.4rem",
          pointerEvents: "none",
          minHeight: isNarrow ? "120px" : "320px",
        }}
      >
        {loading && instances.length === 0 && myScrawls.length === 0 ? (
          <span style={{ fontFamily: SANS, color: "#999" }}>loading…</span>
        ) : (
          <>
            {/* User-written scrawls — upright if they have a reason so it's
                actually readable, otherwise gentle tilt. Reasons render
                below the name in a clearly-larger handwritten size. */}
            {myScrawls.map((sc) => {
              const s = scrawlStyle(`mine:${cat.key}:${sc.id}`, isNarrow);
              const hasReason = !!sc.reason;
              const tilt = hasReason ? Math.max(-1.5, Math.min(1.5, s.rotate / 3)) : s.rotate;
              const nameSize = Math.max(s.size, hasReason ? (isNarrow ? 1.35 : 1.7) : s.size);
              const reasonSize = isNarrow ? 0.95 : 1.15;
              return (
                <span
                  key={`mine-${sc.id}`}
                  className="scrawl-in"
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: "left top",
                    maxWidth: hasReason ? (isNarrow ? "calc(100% - 0.5rem)" : "15rem") : undefined,
                  }}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    flexWrap: "wrap", gap: "0.3rem",
                  }}>
                    {/* Finger pointer marks the writer's own scrawls. Lives
                        outside the wobble filter so the emoji renders crisp. */}
                    <span
                      aria-label="your scrawl"
                      className="crisp"
                      style={{
                        fontSize: isNarrow ? "1.1rem" : "1.25rem",
                        lineHeight: 1,
                        transform: "translateY(0.05rem)",
                        filter: `drop-shadow(0 1px 2px ${cat.color}55)`,
                      }}
                    >
                      👉
                    </span>
                    <span className="ink-wobble" style={{
                      fontFamily: s.font, color: s.color, fontSize: `${nameSize}rem`,
                      fontWeight: s.weight, lineHeight: 1.1,
                      whiteSpace: hasReason ? "normal" : "nowrap",
                      wordBreak: "break-word",
                    }}>
                      {caseText(sc.text, s)}
                    </span>
                  </span>
                  {sc.reason && (
                    <span className="ink-wobble" style={{
                      fontFamily: "var(--font-caveat), cursive",
                      color: s.color,
                      fontSize: `${reasonSize}rem`,
                      fontWeight: 600,
                      lineHeight: 1.25,
                      fontStyle: "italic",
                      opacity: 0.92,
                      marginTop: "0.15rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      &ldquo;{sc.reason}&rdquo;
                    </span>
                  )}
                </span>
              );
            })}

            {/* Aggregate vote scrawls — names that already exist on the wall.
                If a slot has a real reason attached we render it underneath
                the name in a smaller hand, just like a fresh user scrawl. */}
            {instances.map((inst) => {
              const m = getModel(inst.slug);
              if (!m) return null;
              const s = scrawlStyle(inst.key, isNarrow);
              const hasReason = !!inst.reason;
              const tilt = hasReason ? Math.max(-1.5, Math.min(1.5, s.rotate / 3)) : s.rotate;
              const nameSize = Math.max(s.size, hasReason ? (isNarrow ? 1.4 : 1.55) : s.size);
              const reasonSize = isNarrow ? 0.92 : 1.05;
              return (
                <span
                  key={inst.key}
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: hasReason ? "left top" : "center",
                    maxWidth: hasReason ? (isNarrow ? "calc(100% - 0.5rem)" : "14rem") : undefined,
                  }}
                >
                  <span className="ink-wobble" style={{
                    fontFamily: s.font, color: s.color, fontSize: `${nameSize}rem`,
                    fontWeight: s.weight, lineHeight: 1.1,
                    whiteSpace: hasReason ? "normal" : "nowrap",
                    wordBreak: "break-word",
                  }}>
                    {caseText(m.name, s)}
                  </span>
                  {inst.reason && (
                    <span className="ink-wobble" style={{
                      fontFamily: "var(--font-caveat), cursive",
                      color: s.color,
                      fontSize: `${reasonSize}rem`,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      fontStyle: "italic",
                      opacity: 0.86,
                      marginTop: "0.1rem",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}>
                      &ldquo;{inst.reason}&rdquo;
                    </span>
                  )}
                </span>
              );
            })}
          </>
        )}
      </div>

      {/* Top-3 percentage breakdown */}
      <div style={{
        marginTop: isNarrow ? "0.8rem" : "1.4rem",
        paddingTop: isNarrow ? "0.5rem" : "0.7rem",
        borderTop: "1px dashed rgba(0,0,0,0.16)",
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: SANS, fontWeight: 700, fontSize: isNarrow ? "0.62rem" : "0.7rem",
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "#9a8f78", marginBottom: isNarrow ? "0.4rem" : "0.55rem",
        }}>
          top 3 getting {cat.title.toLowerCase()}ed
        </div>
        {breakdown.length === 0 ? (
          <div style={{ fontFamily: SANS, fontSize: "0.85rem", color: "#b3a892" }}>no votes yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: isNarrow ? "0.3rem" : "0.4rem" }}>
            {breakdown.slice(0, 3).map((s, i) => {
              const m = getModel(s.slug);
              if (!m) return null;
              const pct = Math.round(s.pct);
              return (
                <div key={s.slug} style={{
                  display: "flex", alignItems: "center",
                  gap: isNarrow ? "0.45rem" : "0.55rem",
                }}>
                  <span style={{
                    width: isNarrow ? 16 : 18, height: isNarrow ? 16 : 18, borderRadius: 999,
                    background: i === 0 ? cat.color : "rgba(0,0,0,0.08)",
                    color: i === 0 ? "#fff" : "#7a6f57",
                    fontFamily: SANS, fontWeight: 800, fontSize: isNarrow ? "0.62rem" : "0.7rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{
                    width: isNarrow ? 8 : 10, height: isNarrow ? 8 : 10,
                    borderRadius: "50%", background: m.color, flexShrink: 0,
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
                  }} />
                  <span style={{
                    fontFamily: SANS, fontWeight: 700,
                    fontSize: isNarrow ? "0.82rem" : "0.88rem",
                    color: "#3a342a", whiteSpace: "nowrap",
                  }}>{m.name}</span>
                  <span style={{
                    flex: 1, height: isNarrow ? 5 : 7, borderRadius: 999,
                    background: "rgba(0,0,0,0.07)", overflow: "hidden", minWidth: "1.5rem",
                  }}>
                    <span style={{
                      display: "block", height: "100%",
                      width: `${Math.max(3, s.pct)}%`,
                      background: m.color, borderRadius: 999,
                      transition: "width 0.6s ease",
                    }} />
                  </span>
                  <span style={{
                    fontFamily: SANS, fontWeight: 800,
                    fontSize: isNarrow ? "0.82rem" : "0.9rem",
                    color: cat.color, fontVariantNumeric: "tabular-nums",
                    minWidth: isNarrow ? "2.2rem" : "2.6rem", textAlign: "right",
                  }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop floating writer (mobile uses bottom sheet from parent) */}
      {desktopActive && (
        <DesktopWriter
          cat={cat}
          xPct={desktopActive.xPct}
          yPct={desktopActive.yPct}
          step={writerStep}
          draftName={draftName}
          draftReason={draftReason}
          pendingText={draftName}
          onDraftNameChange={onDraftNameChange}
          onDraftReasonChange={onDraftReasonChange}
          onNameConfirm={onNameConfirm}
          onReasonSubmit={onReasonSubmit}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

// ─── Desktop floating writer ──────────────────────────────────────────────────

function DesktopWriter({
  cat, xPct, yPct, step, draftName, draftReason, pendingText,
  onDraftNameChange, onDraftReasonChange, onNameConfirm, onReasonSubmit, onCancel,
}: {
  cat: typeof CATS[0];
  xPct: number; yPct: number;
  step: WriterStep;
  draftName: string; draftReason: string;
  pendingText: string;
  onDraftNameChange: (t: string) => void;
  onDraftReasonChange: (t: string) => void;
  onNameConfirm: (text: string, slug: string) => void;
  onReasonSubmit: (reason?: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="pop-in"
      style={{
        position: "absolute", left: `${xPct}%`, top: `${yPct}%`,
        zIndex: 30, width: "16rem", maxWidth: "calc(100% - 1rem)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ripple at the tap point */}
      <span
        aria-hidden
        className="click-ripple"
        style={{
          left: 0, top: 0,
          background: `${cat.color}55`,
          border: `2px solid ${cat.color}`,
        }}
      />
      {step === "name" ? (
        <NameStep
          cat={cat}
          value={draftName}
          onChange={onDraftNameChange}
          onConfirm={onNameConfirm}
          onCancel={onCancel}
          isNarrow={false}
        />
      ) : (
        <ReasonStep
          cat={cat}
          pendingText={pendingText}
          value={draftReason}
          onChange={onDraftReasonChange}
          onSubmit={onReasonSubmit}
          isNarrow={false}
        />
      )}
    </div>
  );
}

// ─── Mobile bottom-sheet writer ───────────────────────────────────────────────

function MobileWriter({
  cat, step, draftName, draftReason, pendingText,
  onDraftNameChange, onDraftReasonChange, onNameConfirm, onReasonSubmit, onCancel,
}: {
  cat: typeof CATS[0];
  step: WriterStep;
  draftName: string; draftReason: string;
  pendingText: string;
  onDraftNameChange: (t: string) => void;
  onDraftReasonChange: (t: string) => void;
  onNameConfirm: (text: string, slug: string) => void;
  onReasonSubmit: (reason?: string) => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        onClick={onCancel}
        className="fade-in"
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />
      <div
        className="sheet-up"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "#f7f2e5",
          borderTop: `4px solid ${cat.color}`,
          borderRadius: "22px 22px 0 0",
          padding: "1.1rem 1.1rem 1.6rem",
          boxShadow: "0 -10px 50px rgba(0,0,0,0.28)",
          maxHeight: "85vh",
          overflowY: "auto",
          paddingBottom: "calc(1.6rem + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.9rem" }}>
          <div style={{ width: 44, height: 4, borderRadius: 999, background: "rgba(0,0,0,0.18)" }} />
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{
            fontFamily: "var(--font-permanent-marker), cursive",
            fontSize: "1.55rem", color: cat.color,
            letterSpacing: "0.04em",
          }}>
            {cat.title}
          </div>
          <div style={{
            fontFamily: SANS, fontWeight: 600, fontSize: "0.78rem",
            color: "#9a8f78", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            step {step === "name" ? "1 / 2" : "2 / 2"}
          </div>
        </div>

        {step === "name" ? (
          <NameStep
            cat={cat}
            value={draftName}
            onChange={onDraftNameChange}
            onConfirm={onNameConfirm}
            onCancel={onCancel}
            isNarrow={true}
          />
        ) : (
          <ReasonStep
            cat={cat}
            pendingText={pendingText}
            value={draftReason}
            onChange={onDraftReasonChange}
            onSubmit={onReasonSubmit}
            isNarrow={true}
          />
        )}
      </div>
    </>
  );
}

// ─── Step 1 — name ────────────────────────────────────────────────────────────

function NameStep({
  cat, value, onChange, onConfirm, onCancel, isNarrow,
}: {
  cat: typeof CATS[0];
  value: string;
  onChange: (t: string) => void;
  onConfirm: (text: string, slug: string) => void;
  onCancel: () => void;
  isNarrow: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const suggestions = useMemo(() => {
    const list = suggestModels(value).slice(0, isNarrow ? 4 : 5);
    const other = getModel("other");
    if (other && !list.some((m) => m.slug === "other")) list.push(other);
    return list;
  }, [value, isNarrow]);

  // Use the shared resolver so client + server agree on which slug an
  // arbitrary input maps to. "grok it is very smart" → grok.
  const confirm = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onConfirm(trimmed, resolveSlug(trimmed));
  };

  return (
    <div>
      <div style={{
        fontFamily: SANS, fontWeight: 700,
        fontSize: isNarrow ? "0.88rem" : "0.78rem",
        color: "#7a6f57", marginBottom: "0.45rem",
      }}>
        Write any name on the wall:
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirm(value || (suggestions[0]?.name ?? ""));
          } else if (e.key === "Escape") {
            e.preventDefault(); onCancel();
          }
        }}
        onBlur={() => { if (!isNarrow) window.setTimeout(onCancel, 180); }}
        placeholder="type any name…"
        maxLength={60}
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontSize: isNarrow ? "1.6rem" : "1.7rem",
          fontWeight: 700, color: cat.color,
          background: "#fffdf7", border: `2px solid ${cat.color}`,
          borderRadius: "10px", padding: isNarrow ? "0.55rem 0.85rem" : "0.25rem 0.7rem",
          outline: "none", width: "100%",
          boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
        }}
      />

      <div style={{
        marginTop: "0.5rem", background: "#fffdf7",
        border: "1px solid rgba(0,0,0,0.12)", borderRadius: "10px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden",
      }}>
        {suggestions.map((m, i) => (
          <button
            key={m.slug}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onConfirm(m.name, m.slug); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              width: "100%", textAlign: "left", border: "none", cursor: "pointer",
              background: i === 0 ? "rgba(0,0,0,0.05)" : "transparent",
              padding: isNarrow ? "0.7rem 0.9rem" : "0.45rem 0.75rem",
              borderBottom: i < suggestions.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
              minHeight: isNarrow ? "52px" : undefined,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = i === 0 ? "rgba(0,0,0,0.05)" : "transparent")}
          >
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: isNarrow ? "1.05rem" : "0.98rem", color: "#222" }}>{m.name}</span>
            {i === 0 && !isNarrow && (
              <span style={{ marginLeft: "auto", fontFamily: SANS, fontSize: "0.7rem", color: "#999" }}>↵</span>
            )}
          </button>
        ))}
        {value.trim() && !suggestions.some((m) => m.name.toLowerCase() === value.trim().toLowerCase()) && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); confirm(value); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              width: "100%", textAlign: "left", border: "none", cursor: "pointer",
              background: "rgba(0,0,0,0.04)",
              padding: isNarrow ? "0.7rem 0.9rem" : "0.45rem 0.75rem",
              borderTop: "1px dashed rgba(0,0,0,0.12)",
              minHeight: isNarrow ? "52px" : undefined,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
          >
            <span style={{ fontSize: "0.95rem", opacity: 0.55 }}>✎</span>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: isNarrow ? "1.02rem" : "0.94rem", color: "#444" }}>
              Write &ldquo;{value.trim().slice(0, 32)}&rdquo;
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 2 — reason (textarea, Enter = newline) ──────────────────────────────

function ReasonStep({
  cat, pendingText, value, onChange, onSubmit, isNarrow,
}: {
  cat: typeof CATS[0];
  pendingText: string;
  value: string;
  onChange: (t: string) => void;
  onSubmit: (reason?: string) => void;
  isNarrow: boolean;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div>
      <div style={{
        fontFamily: SANS, fontWeight: 700,
        fontSize: isNarrow ? "0.9rem" : "0.82rem",
        color: "#7a6f57", marginBottom: "0.45rem",
        display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "var(--font-caveat), cursive",
          fontSize: isNarrow ? "1.2rem" : "1.1rem",
          color: cat.color, fontWeight: 700,
        }}>
          {pendingText || "your pick"}
        </span>
        <span style={{ opacity: 0.55 }}>&rarr; add your hot take? (optional)</span>
      </div>

      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter inserts a newline. Ctrl/Cmd+Enter submits. Escape skips.
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSubmit(value.trim() || undefined);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onSubmit(undefined);
          }
        }}
        placeholder="your take… (Enter for new line)"
        maxLength={240}
        rows={isNarrow ? 4 : 3}
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontSize: isNarrow ? "1.45rem" : "1.4rem",
          fontWeight: 600, color: "#2a2722",
          background: "#fffdf7", border: "2px solid rgba(0,0,0,0.18)",
          borderRadius: "10px",
          padding: isNarrow ? "0.55rem 0.85rem" : "0.4rem 0.7rem",
          outline: "none", width: "100%",
          resize: "vertical",
          minHeight: isNarrow ? "112px" : "84px",
          lineHeight: 1.25,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}
      />

      <div style={{
        marginTop: "0.55rem",
        fontFamily: SANS, fontSize: "0.72rem", color: "#9a8f78",
        display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem",
      }}>
        <span>Enter = new line</span>
        <span>{value.length} / 240</span>
      </div>

      <div style={{
        marginTop: "0.7rem", display: "flex",
        gap: isNarrow ? "0.7rem" : "0.55rem", alignItems: "center",
      }}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSubmit(value.trim() || undefined); }}
          style={{
            fontFamily: SANS, fontWeight: 800,
            fontSize: isNarrow ? "1.05rem" : "0.95rem",
            background: cat.color, color: "#fff",
            border: "none", borderRadius: "10px",
            padding: isNarrow ? "0.7rem 1.2rem" : "0.45rem 1rem",
            cursor: "pointer",
            boxShadow: `0 3px 12px ${cat.color}55`,
            flex: isNarrow ? 1 : undefined,
            minHeight: isNarrow ? "52px" : undefined,
          }}
        >
          post it ✓
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSubmit(undefined); }}
          style={{
            fontFamily: SANS, fontWeight: 600,
            fontSize: isNarrow ? "1rem" : "0.88rem",
            background: "transparent", color: "#7a6f57",
            border: "1px solid rgba(0,0,0,0.18)", borderRadius: "10px",
            padding: isNarrow ? "0.7rem 1rem" : "0.4rem 0.85rem",
            cursor: "pointer",
            minHeight: isNarrow ? "52px" : undefined,
          }}
        >
          skip
        </button>
      </div>
    </div>
  );
}
