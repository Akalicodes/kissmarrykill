"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Share2 } from "lucide-react";
import { getModel } from "@/lib/models";
import { formatMonthLabel } from "@/lib/month";
import type { ArchiveEntry, Award, Category, RankingRow } from "@/lib/types";

const CAT_COLORS: Record<Category, string> = {
  kiss: "#d946ef",
  marry: "#ffb547",
  kill: "#ff3a3a",
};

const AWARD_ACCENT: Record<Award["key"], string> = {
  most_kissed:     "#d946ef",
  most_married:    "#ffb547",
  most_killed:     "#ff3a3a",
  most_controversial: "#c87dff",
  underdog:        "#7adfff",
};

export function Archive() {
  const [archive, setArchive] = useState<ArchiveEntry[] | null>(null);
  const [selected, setSelected] = useState<{ month: string; award: Award } | null>(null);

  useEffect(() => {
    fetch("/api/archive", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setArchive(d.archive ?? []))
      .catch(() => setArchive([]));
  }, []);

  return (
    <section id="archive" className="relative px-4 pt-20 pb-16 md:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 px-1">
          <span className="label">the archive</span>
          <h2 className="heading-section mt-1">The hall of fame.</h2>
          <p className="mt-2 max-w-xl text-ink/55">
            On the 1st of every month we freeze the leaderboards and hand out
            awards. Click any badge to share it.
          </p>
        </header>

        {!archive ? (
          <div className="glass animate-pulse p-8 text-ink/40">loading the archive…</div>
        ) : archive.length === 0 ? (
          <div className="glass p-8 text-ink/55">
            No snapshots yet. The first one drops on the 1st of next month.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {archive.map((entry) => (
              <ArchiveCard
                key={entry.month}
                entry={entry}
                onShareAward={(a) => setSelected({ month: entry.month, award: a })}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <AwardShareModal
          month={selected.month}
          award={selected.award}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function ArchiveCard({
  entry,
  onShareAward,
}: {
  entry: ArchiveEntry;
  onShareAward: (a: Award) => void;
}) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Filter out underdog award
  const awards = entry.awards.filter((a) => a.key !== "underdog");

  return (
    <article className="whiteboard overflow-hidden">
      {/* Month header — always visible, tap to expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-5 text-left transition-colors hover:bg-ink/[0.03] md:px-7 md:py-6"
      >
        <div>
          <h3 className="marker text-4xl uppercase tracking-[0.08em] text-ink md:text-5xl">
            {formatMonthLabel(entry.month)}
          </h3>
          <p className="mt-1 font-sans text-sm text-ink/45">
            {entry.totalVoters.toLocaleString()} voters · frozen{" "}
            {new Date(entry.snapshotAt).toLocaleDateString()}
          </p>
        </div>
        <ChevronDown
          size={20}
          className="shrink-0 text-ink/40 transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Expandable body */}
      <div
        ref={bodyRef}
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? 1000 : 0 }}
      >
        {/* Awards */}
        {awards.length > 0 && (
          <div className="border-t border-dashed border-ink/10 px-5 py-4 md:px-7">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-ink/35">
              awards
            </p>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {awards.map((a) => {
                const m = getModel(a.modelSlug);
                const accent = AWARD_ACCENT[a.key];
                return (
                  <li key={a.key}>
                    <button
                      type="button"
                      onClick={() => onShareAward(a)}
                      className="group flex w-full items-center gap-2 rounded-xl border border-ink/10 bg-ink/[0.03] px-3 py-2 text-left transition-colors hover:border-ink/20 hover:bg-ink/[0.06]"
                      style={{ boxShadow: `inset 0 0 0 1px ${accent}30` }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className="block text-[9px] font-black uppercase tracking-[0.2em]"
                          style={{ color: accent }}
                        >
                          {a.label}
                        </span>
                        <span className="block truncate text-sm font-bold text-ink">
                          {m?.name ?? a.modelSlug}
                        </span>
                      </span>
                      <Share2
                        size={11}
                        className="shrink-0 text-ink/25 transition-colors group-hover:text-ink/60"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Top-3 leaderboard */}
        <div className="grid grid-cols-3 divide-x divide-dashed divide-ink/10 border-t border-dashed border-ink/10 px-2 py-4 md:px-4">
          {(["kiss", "marry", "kill"] as Category[]).map((cat) => (
            <MiniColumn key={cat} cat={cat} rows={entry[cat]} />
          ))}
        </div>
      </div>
    </article>
  );
}

function MiniColumn({ cat, rows }: { cat: Category; rows: RankingRow[] }) {
  const top = rows.slice(0, 3);
  const accent = CAT_COLORS[cat];
  return (
    <div className="px-3">
      <p
        className="mb-2 text-[10px] font-black uppercase tracking-[0.2em]"
        style={{ color: accent }}
      >
        {cat}
      </p>
      <ol className="space-y-1.5">
        {top.map((r, i) => {
          const m = getModel(r.slug);
          if (!m) return null;
          return (
            <li key={r.slug} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 shrink-0 text-ink/30 tabular-nums">{i + 1}</span>
              <span className="truncate font-semibold text-ink/80">{m.name}</span>
              <span className="ml-auto shrink-0 tabular-nums text-ink/45">
                {r.votes.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AwardShareModal({
  month,
  award,
  onClose,
}: {
  month: string;
  award: Award;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const imgUrl = origin
    ? `${origin}/api/award/og?key=${award.key}&model=${award.modelSlug}&month=${month}`
    : "";
  const shareText = `${award.label} of ${formatMonthLabel(month)}: ${
    getModel(award.modelSlug)?.name ?? award.modelSlug
  } — ${origin}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const download = async () => {
    if (!imgUrl) return;
    const blob = await (await fetch(imgUrl)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kmkai-${month}-${award.key}-${award.modelSlug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-[0_60px_120px_-20px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 p-5">
          <div className="label">{formatMonthLabel(month)}</div>
          <div className="mt-1 text-xl font-black text-white">{award.label}</div>
          <div className="text-sm text-white/60">{award.blurb}</div>
        </div>
        <div className="aspect-[1200/630] bg-black/40">
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt={`${award.label} — ${award.modelSlug}`}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 p-5">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost justify-center"
          >
            <Share2 size={14} />
            share to X
          </a>
          <button type="button" onClick={download} className="btn-ghost justify-center">
            <Share2 size={14} />
            download
          </button>
        </div>
      </div>
    </div>
  );
}
