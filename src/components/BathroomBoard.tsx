"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useBoard } from "./BoardProvider";
import { getModel } from "@/lib/models";
import { formatMonthLabel } from "@/lib/month";
import type { ArchiveEntry, Category, Reason, RankingRow } from "@/lib/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const CATS = [
  { key: "kiss"  as Category, title: "KISS",  headingRot: -3, color: "#16a34a" },
  { key: "marry" as Category, title: "MARRY", headingRot:  2, color: "#1d4ed8" },
  { key: "kill"  as Category, title: "KILL",  headingRot: -2, color: "#c0392b" },
];

const SANS = "var(--font-outfit), sans-serif";

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

interface ItemStyle { rotate: number; font: string; size: number; indent: number; }

function modelStyle(_catKey: string, _slug: string, _rank: number): ItemStyle {
  return { rotate: 0, font: SANS, size: 1.0, indent: 0 };
}
function reasonStyle(_id: string, _idx: number): ItemStyle {
  return { rotate: 0, font: SANS, size: 1.0, indent: 0 };
}

function HandwrittenWords({ text }: { text: string; seed: string }) {
  return <>{text}</>;
}

// ─── Month dropdown ───────────────────────────────────────────────────────────

function MonthDropdown({
  months, selected, onChange,
}: { months: string[]; selected: string; onChange: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = selected === "live"
    ? "LIVE"
    : formatMonthLabel(selected);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily:   SANS,
          fontWeight:   700,
          fontSize:     "clamp(1rem, 3vw, 1.6rem)",
          background:   "none",
          border:       "none",
          borderBottom: "2.5px solid #111",
          color:        "#111",
          cursor:       "pointer",
          padding:      "0 0.15rem 2px",
          display:      "inline-flex",
          alignItems:   "center",
          gap:          "0.3rem",
          lineHeight:   1.1,
        }}
      >
        {label}
        <span style={{ fontSize: "0.65em", opacity: 1 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position:  "absolute",
            top:       "calc(100% + 6px)",
            left:      0,
            zIndex:    100,
            background:"#f7f2e5",
            border:    "2px solid #111",
            borderRadius: "6px",
            boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
            minWidth:  "160px",
            overflow:  "hidden",
          }}
        >
          {months.map((m, mi) => {
            const active = m === selected;
            void mulberry32(hashStr(m + mi)); // keep seed call for future use
            return (
              <button
                key={m}
                type="button"
                onClick={() => { onChange(m); setOpen(false); }}
                style={{
                  display:    "block",
                  width:      "100%",
                  textAlign:  "left",
                  padding:    "0.45rem 0.85rem",
                  fontFamily: SANS,
                  fontSize:   "0.95rem",
                  color:      "#111",
                  fontWeight: active ? 700 : 400,
                  background: active ? "rgba(0,0,0,0.06)" : "none",
                  border:     "none",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  cursor:     "pointer",
                  transition: "background 0.1s",
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

type Picks    = Record<Category, string | null>;
type Opinions = Record<Category, string>;
type BoardData = { kiss: RankingRow[]; marry: RankingRow[]; kill: RankingRow[]; totalVoters: number } | null;

// ─── BathroomBoard ────────────────────────────────────────────────────────────

export function BathroomBoard() {
  const { leaderboard, loading, myVote, setLocal, refetch } = useBoard();

  const [archive, setArchive]        = useState<ArchiveEntry[]>([]);
  const [selectedMonth, setSelected] = useState<string>("live");
  const [reasons, setReasons]        = useState<Record<Category, Reason[]>>({ kiss: [], marry: [], kill: [] });
  const [picks, setPicks]            = useState<Picks>({ kiss: null, marry: null, kill: null });
  const [opinions, setOpinions]      = useState<Opinions>({ kiss: "", marry: "", kill: "" });
  const [submitting, setSubmitting]  = useState(false);
  const [submitted, setSubmitted]    = useState(false);
  const [voteError, setVoteError]    = useState<string | null>(null);
  const [isNarrow, setIsNarrow]      = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
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

  useEffect(() => {
    const load = async () => {
      try {
        const [k, m, ki] = await Promise.all([
          fetch("/api/reasons?category=kiss&limit=20&sort=recent").then((r) => r.json()),
          fetch("/api/reasons?category=marry&limit=20&sort=recent").then((r) => r.json()),
          fetch("/api/reasons?category=kill&limit=20&sort=recent").then((r) => r.json()),
        ]);
        setReasons({ kiss: k.reasons ?? [], marry: m.reasons ?? [], kill: ki.reasons ?? [] });
      } catch { /* silent */ }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const isLive      = selectedMonth === "live";
  const archiveData = archive.find((e) => e.month === selectedMonth) ?? null;
  const boardData: BoardData = isLive ? leaderboard : archiveData;

  const alreadyVoted = !!myVote || submitted;
  const canVote      = isLive && !alreadyVoted;
  const allPicked    = !!(picks.kiss && picks.marry && picks.kill);
  const stillNeeds   = (["kiss", "marry", "kill"] as Category[]).filter((k) => !picks[k]);
  const voterCount   = boardData?.totalVoters ?? 0;

  const handleSubmit = useCallback(async () => {
    if (!picks.kiss || !picks.marry || !picks.kill) return;
    setSubmitting(true);
    setVoteError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kiss: picks.kiss, marry: picks.marry, kill: picks.kill,
          kissReason: opinions.kiss || null,
          marryReason: opinions.marry || null,
          killReason: opinions.kill || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setVoteError(data.error ?? "something went wrong"); return; }
      setLocal({ leaderboard: data.leaderboard, myVote: picks as { kiss: string; marry: string; kill: string } });
      setSubmitted(true);
      setTimeout(refetch, 2000);
    } catch { setVoteError("network error, try again"); }
    finally { setSubmitting(false); }
  }, [picks, opinions, setLocal, refetch]);

  const monthList = ["live", ...archive.map((e) => e.month)];

  return (
    <section id="board" className="relative px-2 pt-5 pb-14 sm:px-6 sm:pt-8 sm:pb-20">
      <div className="mx-auto max-w-6xl">
        <div
          className="whiteboard"
          style={{
            padding: isNarrow
              ? "1rem 0.7rem 1.25rem"
              : "clamp(1.25rem, 4vw, 2.5rem) clamp(0.75rem, 3vw, 2rem)",
          }}
        >

          {/* ── Heading row: title + month dropdown ── */}
          <div
            style={{
              marginBottom: isNarrow ? "1.1rem" : "1.5rem",
              display: "flex",
              alignItems: isNarrow ? "flex-start" : "baseline",
              flexDirection: isNarrow ? "column" : "row",
              flexWrap: "wrap",
              gap: isNarrow ? "0.45rem" : "0.75rem 1.25rem",
            }}
          >
            <h2
              style={{
                fontFamily: SANS,
                fontWeight: 800,
                fontSize:   isNarrow ? "clamp(1.4rem, 10vw, 2.2rem)" : "clamp(1.6rem, 4.5vw, 2.8rem)",
                color:      "#111",
                display:    "inline-block",
                lineHeight: 1.1,
                margin:     0,
                letterSpacing: "-0.01em",
              }}
            >
              which A.I. would you...
            </h2>

            <MonthDropdown months={monthList} selected={selectedMonth} onChange={setSelected} />

            {voterCount > 0 && (
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 400,
                  fontSize:   isNarrow ? "0.9rem" : "1rem",
                  color:      "#555",
                  flexBasis:  isNarrow ? "auto" : "100%",
                }}
              >
                {voterCount.toLocaleString()} {isLive ? "people voting this month" : "voters that month"}
              </span>
            )}
          </div>

          {/* Vote instruction — big and obvious */}
          {canVote && (
            <div
              style={{
                marginBottom:  isNarrow ? "1.2rem" : "1.75rem",
                display:       "flex",
                alignItems:    "center",
                gap:           "0.75rem",
                flexWrap:      "wrap",
              }}
            >
              <span
                style={{
                  fontFamily:    SANS,
                  fontWeight:    800,
                  fontSize:      isNarrow ? "clamp(1rem, 6vw, 1.4rem)" : "clamp(1.2rem, 3vw, 1.7rem)",
                  color:         "#111",
                  letterSpacing: "-0.01em",
                  lineHeight:    1.1,
                  borderBottom:  "3px solid #111",
                  paddingBottom: "3px",
                }}
              >
                TAP YOUR PICKS BELOW
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 400,
                  fontSize:   isNarrow ? "0.88rem" : "0.95rem",
                  color:      "#666",
                }}
              >
                one from each column
              </span>
            </div>
          )}

          {/* Three sections */}
          <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {CATS.map((cat, ci) => {
              const rows  = (boardData?.[cat.key] ?? []) as RankingRow[];
              const total = rows.reduce((a, r) => a + r.votes, 0);
              return (
                <BoardSection
                  key={cat.key}
                  cat={cat}
                  catIdx={ci}
                  rows={rows}
                  loading={loading && isLive}
                  totalVotes={total}
                  reasons={isLive ? reasons[cat.key] : []}
                  selectedModel={picks[cat.key]}
                  opinion={opinions[cat.key]}
                  onSelectModel={(slug) => canVote && setPicks((p) => ({ ...p, [cat.key]: p[cat.key] === slug ? null : slug }))}
                  onOpinionChange={(t) => setOpinions((o) => ({ ...o, [cat.key]: t }))}
                  canVote={canVote}
                  alreadyVoted={alreadyVoted}
                  myVotedModel={myVote?.[cat.key] ?? null}
                  isPastMonth={!isLive}
                  isCompact={isNarrow}
                  catColor={cat.color}
                />
              );
            })}
          </div>

          {/* Submit / status */}
          {isLive && (
            <div
              style={{
                marginTop:  isNarrow ? "1.5rem" : "2rem",
                textAlign:  "center",
                padding:    isNarrow ? "1rem 0.5rem" : "1.5rem 1rem",
                border:     "2px dashed rgba(0,0,0,0.15)",
                borderRadius: "10px",
                background: "rgba(0,0,0,0.018)",
              }}
            >
              {alreadyVoted ? (
                <div>
                  <p
                    style={{
                      fontFamily:    SANS,
                      fontWeight:    800,
                      fontSize:      isNarrow ? "clamp(1.2rem, 7vw, 1.7rem)" : "clamp(1.4rem, 3.5vw, 2rem)",
                      color:         "#111",
                      letterSpacing: "-0.01em",
                      lineHeight:    1.2,
                    }}
                  >
                    {submitted ? "vote is on the wall!" : "already voted this month"}
                  </p>
                  {voterCount > 0 && (
                    <p
                      style={{
                        fontFamily: SANS,
                        fontWeight: 400,
                        fontSize:   isNarrow ? "1rem" : "1.1rem",
                        color:      "#555",
                        marginTop:  "0.4rem",
                      }}
                    >
                      {voterCount.toLocaleString()} total votes this month
                    </p>
                  )}
                </div>
              ) : allPicked ? (
                <div>
                  {voteError && (
                    <p style={{ fontFamily: SANS, color: "#991b1b", fontSize: "1rem", marginBottom: "0.75rem" }}>
                      {voteError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      fontFamily:    SANS,
                      fontWeight:    800,
                      fontSize:      isNarrow ? "clamp(1.1rem, 6vw, 1.5rem)" : "clamp(1.25rem, 3vw, 1.8rem)",
                      letterSpacing: "0.02em",
                      background:    "#111",
                      border:        "none",
                      borderRadius:  "10px",
                      padding:       isNarrow ? "0.75rem 2rem" : "0.85rem 2.75rem",
                      cursor:        submitting ? "wait" : "pointer",
                      color:         "#fff",
                      display:       "inline-block",
                      boxShadow:     "0 4px 14px rgba(0,0,0,0.25)",
                      transition:    "transform 0.12s, box-shadow 0.12s, opacity 0.12s",
                      opacity:       submitting ? 0.7 : 1,
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)"; }}
                    onMouseUp={(e)   => { e.currentTarget.style.transform = "scale(1)";    e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.25)"; }}
                  >
                    {submitting ? "submitting..." : "WRITE IT ON THE WALL"}
                  </button>
                  <p style={{ fontFamily: SANS, fontWeight: 500, fontSize: isNarrow ? "0.9rem" : "1rem", color: "#555", marginTop: "0.65rem" }}>
                    kiss {getModel(picks.kiss!)?.name} · marry {getModel(picks.marry!)?.name} · kill {getModel(picks.kill!)?.name}
                  </p>
                </div>
              ) : (
                <p style={{ fontFamily: SANS, fontWeight: 500, fontSize: isNarrow ? "1rem" : "1.1rem", color: "#555" }}>
                  {stillNeeds.length === 3
                    ? "tap one name in each column to start"
                    : `still need: ${stillNeeds.join(", ")}`}
                </p>
              )}
            </div>
          )}

          {/* Branding */}
          <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: "0.85rem", color: "#888" }}>powered by</span>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: "1rem", color: "#16a34a" }}>VLS</span>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: "0.85rem", color: "#888" }}>+</span>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: "1rem", color: "#1d4ed8" }}>BG8</span>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── BoardSection ─────────────────────────────────────────────────────────────

function BoardSection({
  cat, catIdx, rows, loading, totalVotes, reasons,
  selectedModel, opinion, onSelectModel, onOpinionChange,
  canVote, alreadyVoted, myVotedModel, isPastMonth, isCompact, catColor,
}: {
  cat: typeof CATS[0]; catIdx: number; rows: RankingRow[];
  loading: boolean; totalVotes: number; reasons: Reason[];
  selectedModel: string | null; opinion: string;
  onSelectModel: (slug: string) => void; onOpinionChange: (t: string) => void;
  canVote: boolean; alreadyVoted: boolean; myVotedModel: string | null;
  isPastMonth: boolean; isCompact: boolean; catColor: string;
}) {
  return (
    <div
      style={{
        padding: isCompact ? "0.85rem 0.25rem 1.15rem" : "0.75rem 1rem 1.5rem",
        borderRight: !isCompact && catIdx < 2 ? "2px solid rgba(0,0,0,0.09)" : "none",
        borderBottom: isCompact && catIdx < 2 ? "2px dashed rgba(0,0,0,0.12)" : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >

      <h3
        style={{
          fontFamily:    SANS,
          fontWeight:    900,
          letterSpacing: "-0.02em",
          fontSize:      isCompact ? "clamp(1.6rem, 10vw, 2.2rem)" : "clamp(1.7rem, 4vw, 2.6rem)",
          color:         catColor,
          transform:     `rotate(${isCompact ? cat.headingRot / 2 : cat.headingRot}deg)`,
          display:       "inline-block",
          lineHeight:    1,
          marginBottom:  isCompact ? "0.8rem" : "1rem",
        }}
      >
        {cat.title}
      </h3>

      {/* Model list */}
      <div style={{ marginBottom: "0.75rem" }}>
        {loading && rows.length === 0 ? (
          <p style={{ fontFamily: SANS, color: "#888", fontSize: "0.95rem" }}>loading...</p>
        ) : rows.length === 0 ? (
          <p style={{ fontFamily: SANS, color: "#888", fontSize: "0.95rem" }}>no votes yet</p>
        ) : (
          rows.map((row, ri) => {
            const m          = getModel(row.slug);
            if (!m) return null;
            const pct        = totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0;
            const isSelected = selectedModel === row.slug;
            const isMyVote   = myVotedModel  === row.slug;
            const isWinner   = isPastMonth && ri === 0;
            const s          = modelStyle(cat.key, row.slug, ri);
            return (
              <ModelRow
                key={row.slug}
                name={m.name}
                pct={pct}
                votes={row.votes}
                totalVotes={totalVotes}
                style={s}
                isSelected={isSelected}
                isMyVote={isMyVote}
                isWinner={isWinner}
                disabled={!canVote}
                isCompact={isCompact}
                catColor={catColor}
                onClick={() => onSelectModel(row.slug)}
              />
            );
          })
        )}
      </div>

      {/* Opinion input — shows once user picks something */}
      {canVote && selectedModel && (
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={opinion}
            onChange={(e) => onOpinionChange(e.target.value)}
            placeholder="add ur opinion (optional)"
            maxLength={200}
            style={{ width: "100%", background: "rgba(0,0,0,0.025)", border: "1.5px solid rgba(0,0,0,0.18)", borderRadius: "8px", padding: "0.5rem 0.75rem", fontFamily: SANS, fontWeight: 400, fontSize: "0.95rem", color: "#111", outline: "none" }}
          />
        </div>
      )}

      {alreadyVoted && myVotedModel && (
        <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.9rem", color: catColor, marginBottom: "0.65rem" }}>
          your pick: {getModel(myVotedModel)?.name}
        </p>
      )}

      {/* Recent opinions */}
      {reasons.length > 0 && (
        <div style={{ borderTop: "1px dashed rgba(0,0,0,0.1)", paddingTop: "0.75rem", marginTop: "auto" }}>
          <p
            style={{
              fontFamily:    SANS,
              fontWeight:    700,
              fontSize:      "0.75rem",
              color:         catColor,
              marginBottom:  "0.65rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            recent opinions
          </p>
          {reasons.map((r, ri) => {
            const m = getModel(r.modelSlug);
            return (
              <p
                key={r.id}
                title={m ? `${m.name}: ${r.reason}` : r.reason}
                style={{
                  fontFamily:  SANS,
                  fontWeight:  400,
                  fontSize:    "0.9rem",
                  color:       "#333",
                  marginBottom:"0.55rem",
                  lineHeight:  1.45,
                  display:     "block",
                  wordBreak:   "break-word",
                }}
              >
                {m && (
                  <span style={{ fontWeight: 600, color: catColor, marginRight: "0.25em" }}>
                    {m.name}:
                  </span>
                )}
                &ldquo;{r.reason}&rdquo;
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ModelRow ─────────────────────────────────────────────────────────────────

function ModelRow({ name, pct, votes, totalVotes, style: _s, isSelected, isMyVote, isWinner, disabled, isCompact, catColor, onClick }: {
  name: string; pct: number; votes: number; totalVotes: number; style: ItemStyle;
  isSelected: boolean; isMyVote: boolean; isWinner: boolean; disabled: boolean; isCompact: boolean; catColor: string; onClick: () => void;
}) {
  // Real percentage your single vote adds to this model's share
  const delta = totalVotes > 0
    ? ((votes + 1) / (totalVotes + 1) - votes / totalVotes) * 100
    : 1;
  const deltaStr = delta < 0.1 ? `+${delta.toFixed(2)}%` : `+${delta.toFixed(1)}%`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? undefined : `tap to pick ${name}`}
      style={{
        display:        "flex",
        width:          "100%",
        minHeight:      isCompact ? "48px" : "52px",
        alignItems:     "center",
        justifyContent: "space-between",
        fontFamily:     SANS,
        fontWeight:     isWinner ? 700 : 500,
        fontSize:       isCompact ? "1rem" : "1.1rem",
        color:          "#111",
        marginBottom:   "0.4rem",
        lineHeight:     1.25,
        cursor:         disabled ? "default" : "pointer",
        background:     isSelected
          ? `${catColor}12`
          : isMyVote
          ? "rgba(0,0,0,0.025)"
          : "transparent",
        border:         isSelected
          ? `2px solid ${catColor}`
          : isWinner
          ? `2px solid ${catColor}55`
          : "1.5px solid rgba(0,0,0,0.1)",
        borderRadius:   "8px",
        padding:        isCompact ? "0.4rem 0.65rem" : "0.5rem 0.85rem",
        boxShadow:      isSelected ? `0 2px 8px ${catColor}28` : "none",
        transition:     "background 0.1s, border-color 0.1s, box-shadow 0.12s",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0, overflow: "hidden" }}>
        {isWinner && (
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: "0.65em", color: catColor, flexShrink: 0 }}>
            #1
          </span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </span>
        {isMyVote && !isSelected && (
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: "0.65em", color: "#888", flexShrink: 0 }}>
            (yours)
          </span>
        )}
      </span>

      <span
        style={{
          fontFamily:  SANS,
          fontWeight:  isSelected ? 800 : 400,
          fontSize:    isSelected ? "1em" : "0.8em",
          color:       isSelected ? catColor : "#888",
          flexShrink:  0,
          marginLeft:  "0.5rem",
          letterSpacing: isSelected ? "0.01em" : "0",
        }}
      >
        {isSelected ? deltaStr : `${pct}%`}
      </span>
    </button>
  );
}
