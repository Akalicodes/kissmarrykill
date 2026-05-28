/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { ModelReasonList } from "@/components/ModelReasonList";
import { ModelTrendChart } from "@/components/ModelTrendChart";
import { NavBar } from "@/components/NavBar";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { ToastProvider } from "@/components/Toast";
import { MODEL_BY_SLUG, getModel } from "@/lib/models";
import { currentMonth, formatMonthLabel } from "@/lib/month";
import { getStorage } from "@/lib/storage";
import type {
  Award,
  ArchiveEntry,
  Category,
  Leaderboard,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const CAT_COLORS: Record<Category, string> = {
  kiss: "#d946ef",
  marry: "#ffb547",
  kill: "#ff3a3a",
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = MODEL_BY_SLUG[slug];
  if (!m) return { title: "Unknown model — KMK.ai" };
  return {
    title: `${m.name} on the KMK board — kiss / marry / kill`,
    description: `How the internet feels about ${m.name} (${m.org}) on Kiss / Marry / Kill: AI. Live rankings, top takes, and monthly awards.`,
    openGraph: {
      title: `${m.name} on KMK.ai`,
      description: `Live public-opinion data on ${m.name}.`,
      images: [`/api/model/og?slug=${m.slug}`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/api/model/og?slug=${m.slug}`],
    },
  };
}

export default async function ModelProfilePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const model = MODEL_BY_SLUG[slug];
  if (!model) notFound();

  const storage = getStorage();
  const month = currentMonth();
  const [leaderboard, archive, reasons] = await Promise.all([
    storage.getLeaderboard(month),
    storage.getArchive(),
    storage.getReasons({
      sort: "top",
      modelSlug: slug,
      limit: 12,
    }),
  ]);

  const stats = buildStats(leaderboard, slug);
  const awards = collectAwards(archive, slug);
  const verdict = buildVerdict(stats);
  const trend = buildTrend(archive, leaderboard, slug);

  return (
    <ToastProvider>
      <NavBar />
      <main className="px-6 pb-10 pt-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/55 hover:text-white"
          >
            ← back to the board
          </Link>

          {/* Hero */}
          <header
            className="glass relative mt-6 overflow-hidden p-8 md:p-10"
            style={{
              boxShadow: `inset 0 1px 0 0 ${model.color}33, 0 60px 120px -60px ${model.color}99`,
            }}
          >
            <div
              className="absolute -right-32 -top-32 h-72 w-72 rounded-full blur-3xl"
              style={{ background: `${model.color}55` }}
              aria-hidden
            />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="label">model profile</span>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{
                      borderColor: `${model.color}66`,
                      backgroundColor: `${model.color}1a`,
                      color: model.color,
                    }}
                  >
                    {model.org}
                  </span>
                </div>
                <h1 className="mt-3 flex items-center gap-4">
                  <span
                    className="h-5 w-5 rounded-full"
                    style={{
                      backgroundColor: model.color,
                      boxShadow: `0 0 24px ${model.color}`,
                    }}
                  />
                  <span className="font-display text-5xl font-black tracking-tight text-white md:text-7xl">
                    {model.name}
                  </span>
                </h1>
                <p className="mt-3 max-w-xl text-base italic text-white/55">
                  &ldquo;{model.tag}&rdquo;
                </p>
                {verdict && (
                  <p className="mt-5 max-w-xl text-balance text-lg font-semibold text-white/85">
                    {verdict}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ShareProfileButton slug={model.slug} name={model.name} />
              </div>
            </div>
          </header>

          {/* Current month: three stat cards */}
          <section className="mt-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-black text-white">
                this month · {formatMonthLabel(month)}
              </h2>
              <span className="text-xs text-white/45">
                {leaderboard.totalVoters.toLocaleString()} voters in total
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(["kiss", "marry", "kill"] as Category[]).map((cat) => (
                <StatCard
                  key={cat}
                  cat={cat}
                  rank={stats[cat].rank}
                  votes={stats[cat].votes}
                  share={stats[cat].share}
                  total={leaderboard.totalVoters}
                />
              ))}
            </div>
          </section>

          {/* Trend */}
          {trend.length > 1 && (
            <section className="mt-6">
              <div className="glass p-6">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-xl font-black text-white">
                    history
                  </h2>
                  <span className="text-xs text-white/45">
                    last {trend.length} months including current
                  </span>
                </div>
                <div className="mt-4">
                  <ModelTrendChart trend={trend} />
                </div>
              </div>
            </section>
          )}

          {/* Awards from past months */}
          {awards.length > 0 && (
            <section className="mt-6">
              <div className="glass p-6">
                <h2 className="font-display text-xl font-black text-white">
                  awards won
                </h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {awards.map((entry, i) => (
                    <li
                      key={`${entry.month}-${entry.award.key}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div
                          className="text-[10px] font-black uppercase tracking-[0.18em]"
                          style={{ color: awardColor(entry.award.key) }}
                        >
                          {entry.award.label}
                        </div>
                        <div className="mt-0.5 truncate text-sm font-bold text-white">
                          {formatMonthLabel(entry.month)}
                        </div>
                      </div>
                      <div className="text-xs text-white/45">
                        {new Date(entry.snapshotAt).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Top takes for this model */}
          <section className="mt-6">
            <div className="glass p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-xl font-black text-white">
                  top takes about {model.name}
                </h2>
                <span className="text-xs text-white/45">
                  sorted by reactions
                </span>
              </div>
              <ModelReasonList initialReasons={reasons} modelSlug={model.slug} />
            </div>
          </section>

          <div className="mt-8 flex items-center justify-between gap-3 text-xs text-white/40">
            <Link href="/" className="hover:text-white">
              ← back to the board
            </Link>
            <span>
              data refreshes when you reload. snapshots freeze on the 1st.
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </ToastProvider>
  );
}

function StatCard({
  cat,
  rank,
  votes,
  share,
  total,
}: {
  cat: Category;
  rank: number;
  votes: number;
  share: number;
  total: number;
}) {
  const color = CAT_COLORS[cat];
  return (
    <div
      className="glass-soft relative overflow-hidden p-5"
      style={{
        boxShadow: `inset 0 1px 0 0 ${color}33`,
      }}
    >
      <div
        className="text-[10px] font-black uppercase tracking-[0.22em]"
        style={{ color }}
      >
        {cat}
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="text-5xl font-black tabular-nums text-white">
          #{rank}
        </div>
        <div className="text-sm text-white/45">on the board</div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-white">
          {votes.toLocaleString()} votes
        </span>
        <span className="text-white/45">
          {total > 0 ? `${(share * 100).toFixed(0)}% of voters` : "—"}
        </span>
      </div>
      <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.min(100, share * 100)}%`,
            background: `linear-gradient(90deg, ${color}, ${color}80)`,
            boxShadow: `0 0 12px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}

function buildStats(lb: Leaderboard, slug: string) {
  const make = (cat: Category) => {
    const arr = lb[cat];
    const idx = arr.findIndex((r) => r.slug === slug);
    const row = idx >= 0 ? arr[idx] : { slug, votes: 0 };
    return {
      rank: idx >= 0 ? idx + 1 : arr.length + 1,
      votes: row.votes,
      share: lb.totalVoters > 0 ? row.votes / lb.totalVoters : 0,
    };
  };
  return { kiss: make("kiss"), marry: make("marry"), kill: make("kill") };
}

function collectAwards(
  archive: ArchiveEntry[],
  slug: string,
): Array<{ month: string; snapshotAt: string; award: Award }> {
  const out: Array<{ month: string; snapshotAt: string; award: Award }> = [];
  for (const e of archive) {
    for (const a of e.awards) {
      if (a.modelSlug === slug) {
        out.push({ month: e.month, snapshotAt: e.snapshotAt, award: a });
      }
    }
  }
  return out;
}

function buildTrend(
  archive: ArchiveEntry[],
  current: Leaderboard,
  slug: string,
): Array<{ month: string; kiss: number; marry: number; kill: number }> {
  const points: Array<{ month: string; kiss: number; marry: number; kill: number }> = [];
  // chronological — oldest first so the line moves left→right
  const sorted = [...archive].sort((a, b) => (a.month < b.month ? -1 : 1));
  for (const e of sorted) {
    points.push({
      month: e.month,
      kiss: voteCount(e.kiss, slug),
      marry: voteCount(e.marry, slug),
      kill: voteCount(e.kill, slug),
    });
  }
  points.push({
    month: current.month,
    kiss: voteCount(current.kiss, slug),
    marry: voteCount(current.marry, slug),
    kill: voteCount(current.kill, slug),
  });
  return points;
}

function voteCount(rows: { slug: string; votes: number }[], slug: string): number {
  return rows.find((r) => r.slug === slug)?.votes ?? 0;
}

function buildVerdict(stats: ReturnType<typeof buildStats>): string | null {
  const { kiss, marry, kill } = stats;
  // Lower rank = higher position. Top 3 in each = strong.
  const top3 = (r: number) => r <= 3;
  if (top3(marry.rank) && !top3(kill.rank) && !top3(kiss.rank))
    return "The loyal favorite. People trust this one and don't have much to say beyond that.";
  if (top3(kiss.rank) && top3(kill.rank))
    return "The chaos pick. Equally loved and feared — a polarizing presence on the board.";
  if (top3(kiss.rank) && !top3(marry.rank) && !top3(kill.rank))
    return "The party guest. Fun to use, not the one you'd commit to.";
  if (top3(kill.rank) && !top3(marry.rank) && !top3(kiss.rank))
    return "Public enemy. The board has spoken — and the verdict is grim.";
  if (top3(kiss.rank) && top3(marry.rank))
    return "The crowd favorite. Fun AND reliable — rare on this board.";
  if (top3(marry.rank) && top3(kill.rank))
    return "Reliable but resented. The model people use and then quietly complain about.";
  return null;
}

function awardColor(key: Award["key"]): string {
  switch (key) {
    case "most_kissed": return "#d946ef";
    case "most_married": return "#ffb547";
    case "most_killed": return "#ff3a3a";
    case "most_controversial": return "#c87dff";
    case "underdog": return "#7adfff";
  }
}

// Suppress unused-warning shim
export type _ModelType = ReturnType<typeof getModel>;
