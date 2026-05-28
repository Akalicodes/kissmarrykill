import type { Award, Leaderboard, RankingRow } from "@/lib/types";

/**
 * Computes the month's award winners from a frozen leaderboard.
 *
 * Rules:
 *  - Most Kissed / Married / Killed: #1 in each category by raw votes.
 *  - Most Controversial: highest combined kiss+kill rank (a model that
 *    everyone has STRONG feelings about, both ways).
 *  - Underdog: the model with the highest marry-to-total ratio among
 *    models that placed outside the top 3 by total votes — the quiet
 *    pick that nobody hated.
 *
 * Tie-breakers: lower index in the sorted list wins (already deterministic
 * since the storage layer sorts by votes desc).
 */
export function computeAwards(lb: Leaderboard): Award[] {
  const awards: Award[] = [];

  const k = lb.kiss[0];
  const m = lb.marry[0];
  const x = lb.kill[0];

  if (k && k.votes > 0) {
    awards.push({
      key: "most_kissed",
      modelSlug: k.slug,
      label: "Most Kissed",
      blurb: "the internet wanted a night out with this one",
    });
  }
  if (m && m.votes > 0) {
    awards.push({
      key: "most_married",
      modelSlug: m.slug,
      label: "Most Married",
      blurb: "the internet's chosen long-term partner",
    });
  }
  if (x && x.votes > 0) {
    awards.push({
      key: "most_killed",
      modelSlug: x.slug,
      label: "Most Killed",
      blurb: "the internet has had enough",
    });
  }

  const controversial = pickMostControversial(lb);
  if (controversial) {
    awards.push({
      key: "most_controversial",
      modelSlug: controversial,
      label: "Most Controversial",
      blurb: "people felt EVERY kind of way about this one",
    });
  }

  const underdog = pickUnderdog(lb);
  if (underdog) {
    awards.push({
      key: "underdog",
      modelSlug: underdog,
      label: "Underdog of the Month",
      blurb: "the quiet pick who nobody hated",
    });
  }

  return awards;
}

function pickMostControversial(lb: Leaderboard): string | null {
  const kissRank = rankMap(lb.kiss);
  const killRank = rankMap(lb.kill);
  let best: { slug: string; score: number } | null = null;
  for (const slug of Object.keys(kissRank)) {
    const kr = kissRank[slug];
    const xr = killRank[slug];
    if (kr == null || xr == null) continue;
    // lower combined rank = more controversial (#1 + #1 = 2)
    const score = kr + xr;
    if (!best || score < best.score) best = { slug, score };
  }
  return best?.slug ?? null;
}

function pickUnderdog(lb: Leaderboard): string | null {
  const totals = new Map<string, number>();
  for (const list of [lb.kiss, lb.marry, lb.kill]) {
    for (const r of list) {
      totals.set(r.slug, (totals.get(r.slug) ?? 0) + r.votes);
    }
  }
  const topByTotal = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([slug]) => slug);
  const topByTotalSet = new Set(topByTotal);

  let best: { slug: string; ratio: number } | null = null;
  for (const r of lb.marry) {
    if (topByTotalSet.has(r.slug)) continue;
    const total = totals.get(r.slug) ?? 0;
    if (total < 5) continue; // skip stragglers
    const ratio = r.votes / total;
    if (!best || ratio > best.ratio) best = { slug: r.slug, ratio };
  }
  return best?.slug ?? null;
}

function rankMap(list: RankingRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  list.forEach((r, i) => {
    out[r.slug] = i + 1;
  });
  return out;
}
