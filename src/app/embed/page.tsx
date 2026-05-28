import { currentMonth, formatMonthLabel } from "@/lib/month";
import { getModel } from "@/lib/models";
import { getStorage } from "@/lib/storage";
import {
  CATEGORIES,
  type Category,
  type RankingRow,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  cat?: string;
  limit?: string;
  theme?: string;
}>;

const CAT_COLORS: Record<Category, string> = {
  kiss: "#d946ef",
  marry: "#ffb547",
  kill: "#ff3a3a",
};

/**
 * Iframe-friendly leaderboard widget for blogs/Substacks.
 *
 * Examples:
 *   /embed                    → all three columns
 *   /embed?cat=marry          → single category
 *   /embed?cat=kill&limit=5   → top 5 only
 *   /embed?theme=light        → light surface (transparent body still)
 */
export default async function EmbedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const catRaw = (sp.cat ?? "all").toLowerCase();
  const limit = Math.min(
    11,
    Math.max(3, Number.parseInt(sp.limit ?? "8", 10) || 8),
  );
  const theme = sp.theme === "light" ? "light" : "dark";

  const month = currentMonth();
  const lb = await getStorage().getLeaderboard(month);

  const cats: Category[] =
    catRaw === "all" || !CATEGORIES.includes(catRaw as Category)
      ? CATEGORIES
      : [catRaw as Category];

  return (
    <div
      className={`${
        theme === "light"
          ? "bg-white text-zinc-900"
          : "bg-ink text-white"
      } w-full overflow-hidden rounded-2xl border ${
        theme === "light" ? "border-zinc-200" : "border-white/10"
      }`}
      style={{
        fontFamily:
          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header
        className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] ${
          theme === "light"
            ? "border-zinc-100 text-zinc-500"
            : "border-white/5 text-white/50"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="flex -space-x-1.5">
            {(["kiss", "marry", "kill"] as Category[]).map((c) => (
              <span
                key={c}
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: CAT_COLORS[c],
                  boxShadow: `0 0 6px ${CAT_COLORS[c]}`,
                }}
              />
            ))}
          </span>
          <span className="font-black">KMK.ai</span>
          <span className="opacity-60">{formatMonthLabel(month)}</span>
        </span>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="font-bold hover:underline"
        >
          vote →
        </a>
      </header>

      <div className={`grid gap-0 ${cats.length === 1 ? "" : "sm:grid-cols-3"}`}>
        {cats.map((cat, idx) => (
          <EmbedColumn
            key={cat}
            cat={cat}
            rows={lb[cat]}
            limit={limit}
            theme={theme}
            isLast={idx === cats.length - 1}
            singleColumn={cats.length === 1}
          />
        ))}
      </div>
    </div>
  );
}

function EmbedColumn({
  cat,
  rows,
  limit,
  theme,
  isLast,
  singleColumn,
}: {
  cat: Category;
  rows: RankingRow[];
  limit: number;
  theme: "light" | "dark";
  isLast: boolean;
  singleColumn: boolean;
}) {
  const accent = CAT_COLORS[cat];
  const top = rows.slice(0, limit);
  const max = Math.max(1, ...top.map((r) => r.votes));

  return (
    <div
      className={`p-4 ${
        !isLast && !singleColumn
          ? theme === "light"
            ? "sm:border-r sm:border-zinc-100"
            : "sm:border-r sm:border-white/5"
          : ""
      }`}
    >
      <div
        className="mb-3 text-[10px] font-black uppercase tracking-[0.2em]"
        style={{ color: accent }}
      >
        {cat}
      </div>
      <ol className="space-y-1.5">
        {top.map((r, i) => {
          const m = getModel(r.slug);
          if (!m) return null;
          const pct = (r.votes / max) * 100;
          return (
            <li
              key={r.slug}
              className="grid grid-cols-[1rem_1fr_auto] items-center gap-2"
            >
              <span
                className={`text-[10px] font-black tabular-nums ${
                  theme === "light" ? "text-zinc-400" : "text-white/40"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="truncate text-xs font-bold">{m.name}</span>
                </div>
                <div
                  className={`relative mt-1 h-1 w-full overflow-hidden rounded-full ${
                    theme === "light" ? "bg-zinc-100" : "bg-white/5"
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${m.color}, ${accent})`,
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-bold tabular-nums">
                {r.votes.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
