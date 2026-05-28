import { randomUUID } from "node:crypto";
import { computeAwards } from "@/lib/awards";
import { MODELS } from "@/lib/models";
import { currentMonth } from "@/lib/month";
import type {
  ArchiveEntry,
  Category,
  Leaderboard,
  ReactionCounts,
  ReactionKind,
  RankingRow,
  Reason,
  ReasonSort,
  VoteInput,
} from "@/lib/types";
import type { Storage } from "./index";

type StoredVote = {
  id: string;
  voterToken: string;
  month: string;
  kiss: string;
  marry: string;
  kill: string;
  kissReason: string | null;
  marryReason: string | null;
  killReason: string | null;
  at: string;
};

type StoredReaction = {
  voteId: string;
  category: Category;
  kind: ReactionKind;
  voterToken: string;
  at: string;
};

/**
 * In-memory storage used when Supabase credentials are not configured.
 *
 * Seeds itself with plausible votes + reactions + 2 past months
 * (with awards already computed) so the whole site looks alive on first paint.
 */
export class MemoryStorage implements Storage {
  private votes: StoredVote[] = [];
  private reactions: StoredReaction[] = [];
  private archive: ArchiveEntry[] = [];
  private seeded = false;

  constructor() {
    this.seed();
  }

  private seed() {
    if (this.seeded) return;
    this.seeded = true;
    const month = currentMonth();

    const weights: Record<Category, Record<string, number>> = {
      kiss: {
        grok: 28, claude: 18, chatgpt: 14, gemini: 7, mistral: 9,
        llama: 7, deepseek: 5, qwen: 4, perplexity: 4, copilot: 2, cursor: 2,
      },
      marry: {
        chatgpt: 30, claude: 28, gemini: 10, cursor: 9, perplexity: 8,
        copilot: 6, llama: 4, mistral: 2, deepseek: 1, qwen: 1, grok: 1,
      },
      kill: {
        grok: 22, copilot: 14, gemini: 12, chatgpt: 10, llama: 6,
        mistral: 6, qwen: 8, deepseek: 6, perplexity: 6, cursor: 5, claude: 5,
      },
    };

    const seedReasons: Record<Category, [string, string][]> = {
      kiss: [
        ["grok", "unhinged in a way i find endearing"],
        ["claude", "actually fun to talk to about weird stuff"],
        ["mistral", "european energy, je l'adore"],
        ["deepseek", "felt like talking to a very confident grad student at 3am"],
        ["llama", "i can run it on my laptop, that's foreplay"],
      ],
      marry: [
        ["chatgpt", "the rock i build my life on"],
        ["claude", "it remembers my style, that's marriage"],
        ["cursor", "i would die for cursor"],
        ["perplexity", "stopped using google because of this"],
        ["copilot", "we have a working relationship and that's enough"],
      ],
      kill: [
        ["grok", "it doesnt understand what im trying to say most of the time"],
        ["gemini", "answers everything except the question"],
        ["copilot", "every reply ends with 'would you like me to'"],
        ["qwen", "i cant tell if its good or if im being gaslit"],
        ["chatgpt", "the 'as a large language model' era broke me"],
      ],
    };

    const totalSeed = 240;
    for (let i = 0; i < totalSeed; i++) {
      const kiss = weightedPick(weights.kiss);
      let marry = weightedPick(weights.marry);
      const kill = weightedPick(weights.kill);
      if (kiss === marry && marry === kill) {
        marry = weightedPick(weights.marry);
      }
      this.votes.push({
        id: randomUUID(),
        voterToken: `seed-${i}`,
        month,
        kiss,
        marry,
        kill,
        kissReason: null,
        marryReason: null,
        killReason: null,
        at: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 12).toISOString(),
      });
    }

    // Plant the seed reasons across the most recent votes, and react to them
    // so the wall and Hot Takes tab have something interesting to show.
    let r = 0;
    for (const cat of ["kiss", "marry", "kill"] as Category[]) {
      for (const [slug, reason] of seedReasons[cat]) {
        if (r >= this.votes.length) break;
        const v = this.votes[this.votes.length - 1 - r];
        if (cat === "kiss") {
          v.kiss = slug;
          v.kissReason = reason;
        } else if (cat === "marry") {
          v.marry = slug;
          v.marryReason = reason;
        } else {
          v.kill = slug;
          v.killReason = reason;
        }
        // Reactions: random spread, weighted toward fire
        const fires = Math.floor(Math.random() * 30) + 5;
        const skulls = Math.floor(Math.random() * 12);
        const sobs = Math.floor(Math.random() * 8);
        const stamp = new Date(
          Date.now() - Math.random() * 1000 * 60 * 60 * 6,
        ).toISOString();
        for (let i = 0; i < fires; i++) this.pushReaction(v.id, cat, "fire", `seed-r-${r}-${i}`, stamp);
        for (let i = 0; i < skulls; i++) this.pushReaction(v.id, cat, "skull", `seed-r-${r}-s-${i}`, stamp);
        for (let i = 0; i < sobs; i++) this.pushReaction(v.id, cat, "sob", `seed-r-${r}-o-${i}`, stamp);
        r++;
      }
    }

    // 2 past archived months (with awards already computed) so the archive
    // and hall-of-fame look populated on a fresh server.
    const now = new Date();
    for (let back = 1; back <= 2; back++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const board: Leaderboard = {
        month: m,
        kiss: rankFromWeights(weights.kiss, back),
        marry: rankFromWeights(weights.marry, back),
        kill: rankFromWeights(weights.kill, back),
        totalVoters: 1800 + back * 320,
      };
      this.archive.push({
        ...board,
        snapshotAt: new Date(d.getTime() + 1000 * 60 * 60 * 24 * 31).toISOString(),
        awards: computeAwards(board),
      });
    }
  }

  private pushReaction(
    voteId: string,
    category: Category,
    kind: ReactionKind,
    voterToken: string,
    at: string,
  ) {
    this.reactions.push({ voteId, category, kind, voterToken, at });
  }

  async hasVoted(voterToken: string, month: string): Promise<boolean> {
    return this.votes.some(
      (v) => v.voterToken === voterToken && v.month === month,
    );
  }

  async recordVote(input: VoteInput, month: string): Promise<void> {
    if (await this.hasVoted(input.voterToken, month)) {
      throw new Error("ALREADY_VOTED");
    }
    this.votes.push({
      id: randomUUID(),
      voterToken: input.voterToken,
      month,
      kiss: input.kiss,
      marry: input.marry,
      kill: input.kill,
      kissReason: input.kissReason?.trim() || null,
      marryReason: input.marryReason?.trim() || null,
      killReason: input.killReason?.trim() || null,
      at: new Date().toISOString(),
    });
  }

  async getLeaderboard(month: string): Promise<Leaderboard> {
    const monthVotes = this.votes.filter((v) => v.month === month);
    return {
      month,
      kiss: tally(monthVotes.map((v) => v.kiss)),
      marry: tally(monthVotes.map((v) => v.marry)),
      kill: tally(monthVotes.map((v) => v.kill)),
      totalVoters: monthVotes.length,
    };
  }

  async getArchive(): Promise<ArchiveEntry[]> {
    return [...this.archive].sort((a, b) => (a.month < b.month ? 1 : -1));
  }

  async getMyVote(voterToken: string, month: string) {
    const v = this.votes.find(
      (x) => x.voterToken === voterToken && x.month === month,
    );
    if (!v) return null;
    return { kiss: v.kiss, marry: v.marry, kill: v.kill };
  }

  async getReasons(opts: {
    sort: ReasonSort;
    category?: Category | "all";
    modelSlug?: string;
    limit?: number;
    voterToken?: string | null;
  }): Promise<Reason[]> {
    const limit = opts.limit ?? 24;
    const cat = opts.category ?? "all";

    // Flatten each vote into 0-3 Reason rows.
    const flat: Reason[] = [];
    for (const v of this.votes) {
      for (const c of ["kiss", "marry", "kill"] as Category[]) {
        const text = c === "kiss" ? v.kissReason : c === "marry" ? v.marryReason : v.killReason;
        if (!text) continue;
        if (cat !== "all" && cat !== c) continue;
        const slug = c === "kiss" ? v.kiss : c === "marry" ? v.marry : v.kill;
        if (opts.modelSlug && opts.modelSlug !== slug) continue;
        const reactionsFor = this.reactions.filter(
          (r) => r.voteId === v.id && r.category === c,
        );
        const counts = emptyCounts();
        const mine = emptyCounts();
        for (const r of reactionsFor) {
          counts[r.kind] += 1;
          if (opts.voterToken && r.voterToken === opts.voterToken) {
            mine[r.kind] = 1;
          }
        }
        flat.push({
          id: `${v.id}:${c}`,
          category: c,
          modelSlug: slug,
          reason: text,
          at: v.at,
          reactions: counts,
          myReactions: mine,
        });
      }
    }

    flat.sort((a, b) => sortReasons(a, b, opts.sort));
    return flat.slice(0, limit);
  }

  async toggleReaction(opts: {
    reasonId: string;
    kind: ReactionKind;
    voterToken: string;
  }) {
    const [voteId, catRaw] = opts.reasonId.split(":");
    const category = catRaw as Category;
    if (!voteId || !category) throw new Error("INVALID_REASON_ID");

    const existing = this.reactions.findIndex(
      (r) =>
        r.voteId === voteId &&
        r.category === category &&
        r.kind === opts.kind &&
        r.voterToken === opts.voterToken,
    );
    let on: boolean;
    if (existing >= 0) {
      this.reactions.splice(existing, 1);
      on = false;
    } else {
      this.reactions.push({
        voteId,
        category,
        kind: opts.kind,
        voterToken: opts.voterToken,
        at: new Date().toISOString(),
      });
      on = true;
    }
    const count = this.reactions.filter(
      (r) =>
        r.voteId === voteId &&
        r.category === category &&
        r.kind === opts.kind,
    ).length;
    return { kind: opts.kind, count, on };
  }
}

function tally(slugs: string[]): RankingRow[] {
  const counts = new Map<string, number>();
  for (const m of MODELS) counts.set(m.slug, 0);
  for (const s of slugs) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()]
    .map(([slug, votes]) => ({ slug, votes }))
    .sort((a, b) => b.votes - a.votes);
}

function weightedPick(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [slug, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return slug;
  }
  return Object.keys(weights)[0];
}

function rankFromWeights(
  weights: Record<string, number>,
  offset: number,
): RankingRow[] {
  const base = Object.entries(weights).map(([slug, w]) => ({
    slug,
    votes: Math.round((w + (((slug.length + offset) * 13) % 9)) * (40 + offset * 6)),
  }));
  return base.sort((a, b) => b.votes - a.votes);
}

function emptyCounts(): ReactionCounts {
  return { fire: 0, skull: 0, sob: 0 };
}

function sortReasons(a: Reason, b: Reason, sort: ReasonSort): number {
  if (sort === "recent") {
    return a.at < b.at ? 1 : -1;
  }
  if (sort === "top") {
    return totalReactions(b) - totalReactions(a);
  }
  // hot: reactions per hour since posted, with a small fudge so brand-new
  // single-reaction takes don't dominate
  return hotScore(b) - hotScore(a);
}

function totalReactions(r: Reason): number {
  return r.reactions.fire + r.reactions.skull + r.reactions.sob;
}

function hotScore(r: Reason): number {
  const ageHours = Math.max(
    0.25,
    (Date.now() - new Date(r.at).getTime()) / (1000 * 60 * 60),
  );
  return totalReactions(r) / Math.pow(ageHours + 2, 0.8);
}
