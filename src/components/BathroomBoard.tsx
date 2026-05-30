"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useBoard } from "./BoardProvider";
import { getModel, MODELS, type Model } from "@/lib/models";
import { formatMonthLabel } from "@/lib/month";
import type { ArchiveEntry, Category, RankingRow } from "@/lib/types";

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
  { font: "var(--font-nanum-pen), cursive",     scale: 1.55, weight: 400 },
  { font: "var(--font-reenie), cursive",        scale: 1.62, weight: 400 },
  { font: "var(--font-gloria), cursive",        scale: 0.82, weight: 400 },
  { font: "var(--font-indie-flower), cursive",  scale: 1.08, weight: 400 },
];

const INKS = [
  "#e0589b", "#ef6351", "#f4a259", "#5bbf8a",
  "#2bb39a", "#3d9bd6", "#5a7fe0", "#8b6fd6",
  "#b367c9", "#566173",
];

const FILL_DESKTOP = 26;
const FILL_NARROW  = 15;

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

// ─── Autocomplete (model suggestions) ────────────────────────────────────────

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
  if (!t) return MODELS;
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
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.m);
}

// ─── Per-scrawl handwriting style ─────────────────────────────────────────────

interface ScrawlStyle {
  font: string;
  color: string;
  rotate: number;
  size: number;
  upper: boolean;
  lower: boolean;
  weight: number;
}

function scrawlStyle(seedKey: string, isNarrow: boolean): ScrawlStyle {
  const rnd = mulberry32(hashStr(seedKey));
  const hand = HANDS[Math.floor(rnd() * HANDS.length)];
  const color = INKS[Math.floor(rnd() * INKS.length)];
  const rotate = (rnd() - 0.5) * 9;
  const baseMin = isNarrow ? 1.05 : 1.25;
  const baseMax = isNarrow ? 1.55 : 1.95;
  const size = (baseMin + rnd() * (baseMax - baseMin)) * hand.scale;
  const caseRoll = rnd();
  return { font: hand.font, color, rotate, size, upper: caseRoll > 0.82, lower: caseRoll < 0.2, weight: hand.weight };
}

function caseText(name: string, s: ScrawlStyle): string {
  if (s.upper) return name.toUpperCase();
  if (s.lower) return name.toLowerCase();
  return name;
}

// ─── Fill distribution ────────────────────────────────────────────────────────

type Instance = { slug: string; key: string };

function buildInstances(rows: RankingRow[], target: number, cat: Category): Instance[] {
  const pool = rows.length ? rows : MODELS.map((m) => ({ slug: m.slug, votes: 0 }));
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
  const out: Instance[] = [];
  for (const [slug, n] of counts) {
    for (let o = 0; o < n; o++) out.push({ slug, key: `${cat}:${slug}#${o}` });
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

type BoardData = { kiss: RankingRow[]; marry: RankingRow[]; kill: RankingRow[]; totalVoters: number } | null;
// text = what appears on the wall; slug = resolved for counting
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

  // Writer state lives here so the mobile bottom sheet can read it
  const [writerStep, setWriterStep]       = useState<WriterStep>("name");
  const [draftName, setDraftName]         = useState("");
  const [pendingSlug, setPendingSlug]     = useState("");
  const [pendingText, setPendingText]     = useState("");
  const [draftReason, setDraftReason]     = useState("");
  const scrawlSeq = useRef(0);

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
      resetWriter();
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
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      setDraftName("");
      setPendingSlug("");
      setPendingText("");
      setDraftReason("");
      setWriterStep("name");
      setActive({ cat, xPct: Math.min(70, Math.max(2, xPct)), yPct: Math.min(86, Math.max(2, yPct)) });
    },
    [isLive],
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

  // Mobile bottom sheet — rendered at the BathroomBoard level so it can
  // be fixed to the viewport, not clipped by the column's overflow.
  const activeCat = active ? CATS.find((c) => c.key === active.cat) : null;

  return (
    <section id="board" className="relative px-2 pt-5 pb-14 sm:px-6 sm:pt-8 sm:pb-20">
      <div className="mx-auto max-w-6xl">
        <div
          className="whiteboard"
          style={{
            padding: isNarrow
              ? "1rem 0.75rem 1.25rem"
              : "clamp(1.5rem, 4vw, 2.75rem) clamp(1rem, 3vw, 2.25rem)",
          }}
        >
          {/* ── Title ── */}
          <div style={{
            display: "flex",
            alignItems: isNarrow ? "flex-start" : "baseline",
            flexDirection: isNarrow ? "column" : "row",
            flexWrap: "wrap",
            gap: isNarrow ? "0.4rem" : "0.6rem 1.1rem",
            marginBottom: isNarrow ? "0.5rem" : "0.75rem",
          }}>
            <h2
              className="marker"
              style={{
                fontWeight: 400,
                fontSize: isNarrow ? "clamp(1.6rem, 9vw, 2.4rem)" : "clamp(2rem, 5vw, 3.4rem)",
                color: "#1a1a1a", lineHeight: 1.05, margin: 0, transform: "rotate(-1deg)",
              }}
            >
              Which A.I. would you&hellip;
            </h2>
            <MonthDropdown months={monthList} selected={selectedMonth} onChange={setSelected} />
            {voterCount > 0 && (
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: isNarrow ? "0.82rem" : "0.95rem", color: "#666" }}>
                {voterCount.toLocaleString()} {isLive ? "hands on the wall this month" : "hands that month"}
              </span>
            )}
          </div>

          {/* ── Big call-to-action hint ── */}
          {isLive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isNarrow ? "0.8rem" : "1rem",
                background: "rgba(255, 248, 200, 0.75)",
                border: "2px dashed rgba(180, 140, 30, 0.45)",
                borderRadius: "12px",
                padding: isNarrow ? "0.85rem 1rem" : "0.95rem 1.35rem",
                marginBottom: isNarrow ? "1rem" : "1.4rem",
                cursor: "default",
              }}
            >
              <span
                style={{
                  fontSize: isNarrow ? "2rem" : "2.4rem",
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
                }}
              >
                ✏️
              </span>
              <div>
                <div
                  style={{
                    fontFamily: SANS, fontWeight: 900,
                    fontSize: isNarrow ? "1.05rem" : "1.2rem",
                    color: "#6b4a00", lineHeight: 1.2,
                  }}
                >
                  Tap anywhere in a column to write on the wall
                </div>
                <div
                  style={{
                    fontFamily: SANS, fontWeight: 500,
                    fontSize: isNarrow ? "0.82rem" : "0.9rem",
                    color: "#9a7020", marginTop: "0.2rem",
                  }}
                >
                  type any name you want · leave your hot take while you&rsquo;re at it
                </div>
              </div>
            </div>
          )}

          {/* ── Three columns ── */}
          <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, 1fr)" }}>
            {CATS.map((cat, ci) => {
              const rows      = (boardData?.[cat.key] ?? []) as RankingRow[];
              const instances = buildInstances(rows, fill, cat.key);
              const breakdown = buildBreakdown(rows);
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
                  // Only pass the floating writer props when NOT on mobile
                  // (mobile uses the bottom sheet rendered below)
                  desktopActive={!isNarrow && active?.cat === cat.key ? active : null}
                  writerStep={writerStep}
                  draftName={draftName}
                  draftReason={draftReason}
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
          <div style={{ marginTop: "1.75rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: "0.85rem", color: "#888" }}>powered by</span>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: "1rem", color: "#16a34a" }}>VLS</span>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: "0.85rem", color: "#888" }}>+</span>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: "1rem", color: "#1d4ed8" }}>BG8</span>
          </div>
        </div>

        <p style={{ marginTop: "0.75rem", textAlign: "center", fontFamily: SANS, fontSize: "0.78rem", color: "rgba(0,0,0,0.4)" }}>
          live wall · updates every few seconds · write as many as you like
        </p>
      </div>

      {/* ── Mobile bottom sheet (renders outside the whiteboard so it can be
           fixed to the viewport with no clipping) ── */}
      {isNarrow && active && activeCat && (
        <MobileWriter
          cat={activeCat}
          step={writerStep}
          draftName={draftName}
          draftReason={draftReason}
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
  myScrawls, desktopActive, writerStep, draftName, draftReason,
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
  desktopActive: { cat: Category; xPct: number; yPct: number } | null;
  writerStep: WriterStep;
  draftName: string;
  draftReason: string;
  onColumnClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDraftNameChange: (t: string) => void;
  onDraftReasonChange: (t: string) => void;
  onNameConfirm: (text: string, slug: string) => void;
  onReasonSubmit: (reason?: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={isLive ? onColumnClick : undefined}
      style={{
        position: "relative",
        cursor: isLive ? "text" : "default",
        padding: isNarrow ? "0.5rem 0.5rem 1rem" : "0.5rem 1rem 1.25rem",
        borderRight: !isNarrow && catIdx < 2 ? "2px solid rgba(0,0,0,0.10)" : "none",
        borderBottom: isNarrow && catIdx < 2 ? "2px dashed rgba(0,0,0,0.12)" : "none",
        minHeight: isNarrow ? "260px" : "clamp(460px, 64vh, 720px)",
      }}
    >
      {/* Heading */}
      <h3
        className="marker"
        style={{
          fontWeight: 400,
          fontSize: isNarrow ? "clamp(1.9rem, 11vw, 2.6rem)" : "clamp(2.1rem, 4.5vw, 3.2rem)",
          color: cat.color,
          transform: `rotate(${cat.headingRot}deg)`,
          display: "inline-block",
          lineHeight: 1,
          marginBottom: isNarrow ? "0.7rem" : "1.1rem",
          textShadow: "0 1px 0 rgba(0,0,0,0.05)",
        }}
      >
        {cat.title}
      </h3>

      {/* Scrawl flow — pointer-events:none so clicks reach the column */}
      <div
        style={{
          display: "flex", flexWrap: "wrap", alignContent: "flex-start",
          alignItems: "baseline",
          gap: isNarrow ? "0.55rem 0.85rem" : "0.8rem 1.25rem",
          pointerEvents: "none",
        }}
      >
        {loading && instances.length === 0 && myScrawls.length === 0 ? (
          <span style={{ fontFamily: SANS, color: "#999" }}>loading…</span>
        ) : (
          <>
            {/* Current user's scrawls — show raw text + optional reason */}
            {myScrawls.map((sc) => {
              const s = scrawlStyle(`mine:${cat.key}:${sc.id}`, isNarrow);
              return (
                <span
                  key={`mine-${sc.id}`}
                  className="scrawl-in"
                  style={{
                    display: "inline-flex", flexDirection: "column", alignItems: "flex-start",
                    transform: `rotate(${s.rotate}deg)`, transformOrigin: "center",
                  }}
                >
                  <span style={{
                    fontFamily: s.font, color: s.color, fontSize: `${s.size}rem`,
                    fontWeight: s.weight, lineHeight: 1.05, whiteSpace: "nowrap",
                  }}>
                    {caseText(sc.text, s)}
                  </span>
                  {sc.reason && (
                    <span style={{
                      fontFamily: "var(--font-caveat), cursive",
                      color: s.color,
                      fontSize: `${Math.max(0.65, s.size * 0.58)}rem`,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      fontStyle: "italic",
                      opacity: 0.82,
                      maxWidth: "10rem",
                      whiteSpace: "normal",
                    }}>
                      &ldquo;{sc.reason}&rdquo;
                    </span>
                  )}
                </span>
              );
            })}

            {/* Aggregate instances (proportional to votes) */}
            {instances.map((inst) => {
              const m = getModel(inst.slug);
              if (!m) return null;
              const s = scrawlStyle(inst.key, isNarrow);
              return (
                <span
                  key={inst.key}
                  style={{
                    fontFamily: s.font, color: s.color, fontSize: `${s.size}rem`,
                    fontWeight: s.weight, lineHeight: 1.05,
                    transform: `rotate(${s.rotate}deg)`, transformOrigin: "center",
                    whiteSpace: "nowrap", display: "inline-block",
                  }}
                >
                  {caseText(m.name, s)}
                </span>
              );
            })}
          </>
        )}
      </div>

      {/* Percentage breakdown */}
      <div style={{
        marginTop: isNarrow ? "1rem" : "1.4rem",
        paddingTop: "0.7rem",
        borderTop: "2px dashed rgba(0,0,0,0.14)",
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: SANS, fontWeight: 700, fontSize: "0.66rem",
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "#9a8f78", marginBottom: "0.5rem",
        }}>
          who&apos;s getting {cat.title.toLowerCase()}ed
        </div>
        {breakdown.length === 0 ? (
          <div style={{ fontFamily: SANS, fontSize: "0.8rem", color: "#b3a892" }}>no votes yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {breakdown.slice(0, 8).map((s) => {
              const m = getModel(s.slug);
              if (!m) return null;
              const pct = Math.round(s.pct);
              return (
                <div key={s.slug} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: m.color, flexShrink: 0, boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }} />
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.82rem", color: "#3a342a", whiteSpace: "nowrap" }}>{m.name}</span>
                  <span style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(0,0,0,0.07)", overflow: "hidden", minWidth: "1.5rem" }}>
                    <span style={{ display: "block", height: "100%", width: `${Math.max(3, s.pct)}%`, background: m.color, borderRadius: 999 }} />
                  </span>
                  <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: "0.82rem", color: cat.color, fontVariantNumeric: "tabular-nums", minWidth: "2.4rem", textAlign: "right" }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop floating writer (hidden on mobile — uses bottom sheet instead) */}
      {desktopActive && (
        <DesktopWriter
          cat={cat}
          xPct={desktopActive.xPct}
          yPct={desktopActive.yPct}
          step={writerStep}
          draftName={draftName}
          draftReason={draftReason}
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
  cat, xPct, yPct, step, draftName, draftReason,
  onDraftNameChange, onDraftReasonChange, onNameConfirm, onReasonSubmit, onCancel,
}: {
  cat: typeof CATS[0];
  xPct: number; yPct: number;
  step: WriterStep;
  draftName: string; draftReason: string;
  onDraftNameChange: (t: string) => void;
  onDraftReasonChange: (t: string) => void;
  onNameConfirm: (text: string, slug: string) => void;
  onReasonSubmit: (reason?: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute", left: `${xPct}%`, top: `${yPct}%`,
        zIndex: 30, width: "15rem", maxWidth: "calc(100% - 1rem)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
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
          pendingText={draftName}
          value={draftReason}
          onChange={onDraftReasonChange}
          onSubmit={onReasonSubmit}
          isNarrow={false}
        />
      )}
    </div>
  );
}

// ─── Mobile bottom sheet writer ───────────────────────────────────────────────

function MobileWriter({
  cat, step, draftName, draftReason,
  onDraftNameChange, onDraftReasonChange, onNameConfirm, onReasonSubmit, onCancel,
}: {
  cat: typeof CATS[0];
  step: WriterStep;
  draftName: string; draftReason: string;
  onDraftNameChange: (t: string) => void;
  onDraftReasonChange: (t: string) => void;
  onNameConfirm: (text: string, slug: string) => void;
  onReasonSubmit: (reason?: string) => void;
  onCancel: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />
      {/* Sheet */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "#f7f2e5",
          borderTop: `3px solid ${cat.color}`,
          borderRadius: "20px 20px 0 0",
          padding: "1.25rem 1.25rem 2rem",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(0,0,0,0.18)" }} />
        </div>

        <div style={{
          fontFamily: "var(--font-permanent-marker), cursive",
          fontSize: "1.5rem", color: cat.color, marginBottom: "1rem",
          letterSpacing: "0.05em",
        }}>
          {cat.title}
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
            pendingText={draftName}
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

// ─── Step 1: Name input with autocomplete ─────────────────────────────────────

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
    const list = suggestModels(value).slice(0, isNarrow ? 5 : 6);
    // Always keep "Other" visible
    if (!list.some((m) => m.slug === "other")) {
      const other = getModel("other");
      if (other) list.push(other);
    }
    return list;
  }, [value, isNarrow]);

  const confirm = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Resolve slug: exact model match, or "other"
    const t = trimmed.toLowerCase();
    const match = MODELS.find((m) => m.slug === t || m.name.toLowerCase() === t);
    const slug = match?.slug ?? "other";
    onConfirm(trimmed, slug);
  };

  return (
    <div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: isNarrow ? "0.82rem" : "0.78rem", color: "#7a6f57", marginBottom: "0.4rem" }}>
        Write any name on the wall:
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); confirm(value || (suggestions[0]?.name ?? "")); }
          else if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        onBlur={() => { if (!isNarrow) window.setTimeout(onCancel, 150); }}
        placeholder="type any name…"
        maxLength={60}
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontSize: isNarrow ? "1.5rem" : "1.6rem",
          fontWeight: 700, color: cat.color,
          background: "#fffdf7", border: `2px solid ${cat.color}`,
          borderRadius: "9px", padding: isNarrow ? "0.4rem 0.75rem" : "0.15rem 0.6rem",
          outline: "none", width: "100%",
          boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
        }}
      />

      {/* Suggestions */}
      <div style={{
        marginTop: "0.4rem", background: "#fffdf7",
        border: "1px solid rgba(0,0,0,0.12)", borderRadius: "9px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden",
      }}>
        {suggestions.map((m, i) => (
          <button
            key={m.slug}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onConfirm(m.name, m.slug); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.55rem",
              width: "100%", textAlign: "left", border: "none", cursor: "pointer",
              background: i === 0 ? "rgba(0,0,0,0.05)" : "transparent",
              padding: isNarrow ? "0.65rem 0.85rem" : "0.4rem 0.7rem",
              borderBottom: i < suggestions.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
              minHeight: isNarrow ? "48px" : undefined,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = i === 0 ? "rgba(0,0,0,0.05)" : "transparent")}
          >
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: isNarrow ? "1rem" : "0.95rem", color: "#222" }}>{m.name}</span>
            {i === 0 && !isNarrow && (
              <span style={{ marginLeft: "auto", fontFamily: SANS, fontSize: "0.68rem", color: "#999" }}>↵</span>
            )}
          </button>
        ))}
        {/* Free-text confirm — always shown so people know they can write anything */}
        {value.trim() && !suggestions.some((m) => m.name.toLowerCase() === value.trim().toLowerCase()) && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); confirm(value); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.55rem",
              width: "100%", textAlign: "left", border: "none", cursor: "pointer",
              background: "rgba(0,0,0,0.03)",
              padding: isNarrow ? "0.65rem 0.85rem" : "0.4rem 0.7rem",
              borderTop: "1px dashed rgba(0,0,0,0.1)",
              minHeight: isNarrow ? "48px" : undefined,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.07)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
          >
            <span style={{ fontSize: "0.85rem", opacity: 0.5 }}>✎</span>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: isNarrow ? "1rem" : "0.92rem", color: "#444" }}>
              Write &ldquo;{value.trim().slice(0, 30)}&rdquo;
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Optional reason input ───────────────────────────────────────────

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
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div>
      <div style={{
        fontFamily: SANS, fontWeight: 700,
        fontSize: isNarrow ? "0.88rem" : "0.8rem",
        color: "#7a6f57", marginBottom: "0.4rem",
        display: "flex", alignItems: "center", gap: "0.4rem",
      }}>
        <span style={{ fontFamily: "var(--font-caveat), cursive", fontSize: isNarrow ? "1.1rem" : "1rem", color: cat.color, fontWeight: 700 }}>
          {pendingText}
        </span>
        <span style={{ opacity: 0.55 }}>→ add your hot take?</span>
      </div>

      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSubmit(value.trim() || undefined); }
          else if (e.key === "Escape") { e.preventDefault(); onSubmit(undefined); }
        }}
        onBlur={() => { if (!isNarrow) window.setTimeout(() => onSubmit(value.trim() || undefined), 200); }}
        placeholder="your take (optional)…"
        maxLength={120}
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontSize: isNarrow ? "1.35rem" : "1.4rem",
          fontWeight: 600, color: "#333",
          background: "#fffdf7", border: "2px solid rgba(0,0,0,0.18)",
          borderRadius: "9px", padding: isNarrow ? "0.4rem 0.75rem" : "0.2rem 0.6rem",
          outline: "none", width: "100%",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}
      />

      <div style={{
        marginTop: "0.6rem", display: "flex",
        gap: isNarrow ? "0.75rem" : "0.5rem",
        alignItems: "center",
        flexDirection: isNarrow ? "row" : "row",
      }}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSubmit(value.trim() || undefined); }}
          style={{
            fontFamily: SANS, fontWeight: 800,
            fontSize: isNarrow ? "1rem" : "0.92rem",
            background: cat.color, color: "#fff",
            border: "none", borderRadius: "8px",
            padding: isNarrow ? "0.6rem 1.2rem" : "0.35rem 0.9rem",
            cursor: "pointer",
            boxShadow: `0 3px 10px ${cat.color}55`,
            flex: isNarrow ? 1 : undefined,
            minHeight: isNarrow ? "48px" : undefined,
          }}
        >
          post it ✓
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSubmit(undefined); }}
          style={{
            fontFamily: SANS, fontWeight: 600,
            fontSize: isNarrow ? "0.95rem" : "0.85rem",
            background: "transparent", color: "#888",
            border: "1px solid rgba(0,0,0,0.15)", borderRadius: "8px",
            padding: isNarrow ? "0.6rem 1rem" : "0.3rem 0.7rem",
            cursor: "pointer",
            minHeight: isNarrow ? "48px" : undefined,
          }}
        >
          skip
        </button>
      </div>
    </div>
  );
}
