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
  WallSample,
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
type StoredScrawl = {
  month: string;
  category: Category;
  slug: string;
  text?: string;
  reason?: string;
  voterToken: string;
  at: string;
};

export class MemoryStorage implements Storage {
  private votes: StoredVote[] = [];
  private reactions: StoredReaction[] = [];
  private scrawls: StoredScrawl[] = [];
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

    // Hot-take "seed" reasons keyed by the slug they're best paired with.
    // The wall is much more lively when most scrawls have something attached
    // to them, so we plant a generic pool too (used when no slug-specific
    // line exists) and assign a reason to ~60% of the seed votes.
    const seedReasons: Record<Category, Record<string, string[]>> = {
      kiss: {
        grok:       ["unhinged in a way i find endearing", "the bad-boy energy is unmatched", "no filter, no notes"],
        claude:     ["actually fun to talk to about weird stuff", "soft-spoken intellectual", "i would brunch with claude"],
        chatgpt:    ["it laughed at my joke i felt seen", "the comfort hookup of LLMs"],
        mistral:    ["european energy, je l'adore", "petite et puissante"],
        deepseek:   ["felt like talking to a very confident grad student at 3am"],
        llama:      ["i can run it on my laptop, that's foreplay"],
        gemini:     ["bing-coded but kinda hot ngl"],
        qwen:       ["mysterious foreign exchange student vibes"],
        perplexity: ["the answer-haver. no notes."],
        copilot:    ["the work-from-home crush"],
        cursor:     ["the IDE girlfriend experience"],
        other:      ["my weird local fine-tune i'm in love with"],
      },
      marry: {
        chatgpt:    ["the rock i build my life on", "stable, dependable, dad-coded", "we already have shared receipts"],
        claude:     ["it remembers my style, that's marriage", "writes my emails better than i do"],
        cursor:     ["i would die for cursor", "we share a calendar and a codebase"],
        perplexity: ["stopped using google because of this", "the answer to in-laws asking dumb questions"],
        copilot:    ["we have a working relationship and that's enough"],
        gemini:     ["the safe choice and i'm tired"],
        llama:      ["i own the weights, that's a prenup"],
        mistral:    ["small, quick, never says too much"],
        deepseek:   ["the budget bride, no shame"],
        qwen:       ["consistent and quiet, that's the dream"],
        grok:       ["jk no one is marrying grok"],
        other:      ["my company's internal model. boring but mine."],
      },
      kill: {
        grok:       ["it doesnt understand what im trying to say most of the time", "twitter brain in an LLM body"],
        gemini:     ["answers everything except the question", "blocked my prompt because of vibes"],
        copilot:    ["every reply ends with 'would you like me to'", "office-core. literally."],
        qwen:       ["i cant tell if its good or if im being gaslit"],
        chatgpt:    ["the 'as a large language model' era broke me", "i'm tired of em-dashes"],
        claude:     ["it apologized to me four times in one reply"],
        llama:      ["the open-source loyalty isn't enough anymore"],
        mistral:    ["where did you go, le chat"],
        deepseek:   ["i don't trust whatever it's been trained on"],
        perplexity: ["a wrapper with confidence issues"],
        cursor:     ["my rent shouldn't be a tab autocomplete fee"],
        other:      ["that random api i regret integrating"],
      },
    };

    const genericReasons: Record<Category, string[]> = {
      kiss: [
        "fun energy", "would absolutely text back",
        "made me laugh", "vibes are off the charts",
        "a delight, genuinely", "i light up when i see it",
        "summer fling material", "playful, unserious, perfect",
        "the chaotic good one",
      ],
      marry: [
        "reliable, dependable, mine", "the long-term option",
        "the boring choice and i mean that lovingly",
        "we'd grow old together", "no surprises here, just trust",
        "settles me", "shared values, shared cache",
        "would file taxes with",
      ],
      kill: [
        "no it just no", "the audacity",
        "stop yapping", "every output is a lecture",
        "nothing redeeming", "wastes my tokens",
        "this is a crime against context",
        "frankly insulting", "i'd rather use a calculator",
      ],
    };

    const pickGeneric = (cat: Category) => {
      const arr = genericReasons[cat];
      return arr[Math.floor(Math.random() * arr.length)];
    };

    const pickSlugReason = (cat: Category, slug: string): string => {
      const specific = seedReasons[cat][slug];
      if (specific && Math.random() < 0.65) {
        return specific[Math.floor(Math.random() * specific.length)];
      }
      return pickGeneric(cat);
    };

    const totalSeed = 240;
    // Reason coverage: ~60% of votes get at least one reason (often more).
    // Each pick rolls independently so some votes get all three reasons,
    // some get one or two — feels organic.
    const REASON_RATE = 0.62;
    for (let i = 0; i < totalSeed; i++) {
      const kiss = weightedPick(weights.kiss);
      let marry = weightedPick(weights.marry);
      const kill = weightedPick(weights.kill);
      if (kiss === marry && marry === kill) {
        marry = weightedPick(weights.marry);
      }
      const kr = Math.random() < REASON_RATE ? pickSlugReason("kiss", kiss) : null;
      const mr = Math.random() < REASON_RATE ? pickSlugReason("marry", marry) : null;
      const xr = Math.random() < REASON_RATE ? pickSlugReason("kill", kill) : null;
      this.votes.push({
        id: randomUUID(),
        voterToken: `seed-${i}`,
        month,
        kiss,
        marry,
        kill,
        kissReason: kr,
        marryReason: mr,
        killReason: xr,
        at: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 12).toISOString(),
      });
    }

    // Sprinkle reactions on the last batch of reasons so the Hot Takes tab
    // has something punchy on first load.
    const recentWithReasons = this.votes
      .slice(-30)
      .filter((v) => v.kissReason || v.marryReason || v.killReason);
    let r = 0;
    for (const v of recentWithReasons) {
      const cats: Category[] = [];
      if (v.kissReason) cats.push("kiss");
      if (v.marryReason) cats.push("marry");
      if (v.killReason) cats.push("kill");
      for (const cat of cats) {
        const fires  = Math.floor(Math.random() * 22) + 2;
        const skulls = Math.floor(Math.random() * 10);
        const sobs   = Math.floor(Math.random() * 7);
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

  async recordScrawl(opts: {
    category: Category;
    slug: string;
    text?: string;
    reason?: string;
    voterToken: string;
    month: string;
  }): Promise<void> {
    this.scrawls.push({
      month: opts.month,
      category: opts.category,
      slug: opts.slug,
      text: opts.text,
      reason: opts.reason,
      voterToken: opts.voterToken,
      at: new Date().toISOString(),
    });
  }

  async getLeaderboard(month: string): Promise<Leaderboard> {
    const monthVotes = this.votes.filter((v) => v.month === month);
    const monthScrawls = this.scrawls.filter((s) => s.month === month);
    const scrawlsBy = (cat: Category) =>
      monthScrawls.filter((s) => s.category === cat).map((s) => s.slug);

    // Build sample {slug, reason} pairs per category from real votes + scrawls
    // so the wall can render existing names alongside a real hot-take.
    const sampleFor = (cat: Category): WallSample[] => {
      const out: WallSample[] = [];
      for (const v of monthVotes) {
        const slug = cat === "kiss" ? v.kiss : cat === "marry" ? v.marry : v.kill;
        const r = cat === "kiss" ? v.kissReason : cat === "marry" ? v.marryReason : v.killReason;
        if (r && r.trim()) out.push({ slug, reason: r.trim() });
      }
      for (const s of monthScrawls) {
        if (s.category !== cat) continue;
        if (s.reason && s.reason.trim()) out.push({ slug: s.slug, reason: s.reason.trim() });
      }
      return shuffleStable(out, `${month}:${cat}`).slice(0, 48);
    };

    return {
      month,
      kiss: tally([...monthVotes.map((v) => v.kiss), ...scrawlsBy("kiss")]),
      marry: tally([...monthVotes.map((v) => v.marry), ...scrawlsBy("marry")]),
      kill: tally([...monthVotes.map((v) => v.kill), ...scrawlsBy("kill")]),
      totalVoters: monthVotes.length + monthScrawls.length,
      samples: {
        kiss: sampleFor("kiss"),
        marry: sampleFor("marry"),
        kill: sampleFor("kill"),
      },
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

function shuffleStable<T>(arr: T[], seedKey: string): T[] {
  // Deterministic shuffle keyed by month+category so the same set of seeded
  // reasons doesn't reshuffle on every poll (would cause the wall to flicker).
  let h = 5381;
  for (let i = 0; i < seedKey.length; i++) h = (((h << 5) + h) ^ seedKey.charCodeAt(i)) | 0;
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) | 0;
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
