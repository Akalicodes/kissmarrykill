import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MODELS } from "@/lib/models";
import type {
  ArchiveEntry,
  Award,
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

export class SupabaseStorage implements Storage {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  async hasVoted(voterToken: string, month: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("votes")
      .select("id")
      .eq("voter_token", voterToken)
      .eq("month", month)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  async recordVote(input: VoteInput, month: string): Promise<void> {
    const { error } = await this.client.from("votes").insert({
      voter_token: input.voterToken,
      month,
      kiss_slug: input.kiss,
      marry_slug: input.marry,
      kill_slug: input.kill,
      kiss_reason: input.kissReason ?? null,
      marry_reason: input.marryReason ?? null,
      kill_reason: input.killReason ?? null,
      ip_hash: input.ipHash ?? null,
    });
    if (error) {
      if (error.code === "23505") throw new Error("ALREADY_VOTED");
      throw error;
    }
  }

  async recordScrawl(opts: {
    category: Category;
    slug: string;
    text?: string;
    reason?: string;
    voterToken: string;
    month: string;
  }): Promise<void> {
    // Best-effort: requires an optional `scrawls` table. If it does not exist
    // yet we swallow the error so the wall still works (the write just won't
    // persist across reloads until the table is added).
    const { error } = await this.client.from("scrawls").insert({
      month: opts.month,
      category: opts.category,
      slug: opts.slug,
      text: opts.text ?? null,
      reason: opts.reason ?? null,
      voter_token: opts.voterToken,
    });
    // 42P01 = undefined_table, 42703 = undefined_column — both are fine until
    // the schema is applied; anything else is a real problem.
    if (error && error.code !== "42P01" && error.code !== "42703") {
      console.warn("recordScrawl failed", error.message);
    }
  }

  private async scrawlSlugs(month: string): Promise<Record<Category, string[]>> {
    const empty: Record<Category, string[]> = { kiss: [], marry: [], kill: [] };
    const { data, error } = await this.client
      .from("scrawls")
      .select("category, slug")
      .eq("month", month);
    if (error || !data) return empty;
    for (const row of data as Array<{ category: Category; slug: string }>) {
      if (empty[row.category]) empty[row.category].push(row.slug);
    }
    return empty;
  }

  async getLeaderboard(month: string): Promise<Leaderboard> {
    const { data, error } = await this.client
      .from("votes")
      .select("kiss_slug, marry_slug, kill_slug")
      .eq("month", month);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      kiss_slug: string;
      marry_slug: string;
      kill_slug: string;
    }>;
    const scrawls = await this.scrawlSlugs(month);
    const scrawlCount =
      scrawls.kiss.length + scrawls.marry.length + scrawls.kill.length;
    return {
      month,
      kiss: tally([...rows.map((r) => r.kiss_slug), ...scrawls.kiss]),
      marry: tally([...rows.map((r) => r.marry_slug), ...scrawls.marry]),
      kill: tally([...rows.map((r) => r.kill_slug), ...scrawls.kill]),
      totalVoters: rows.length + scrawlCount,
    };
  }

  async getArchive(): Promise<ArchiveEntry[]> {
    const { data, error } = await this.client
      .from("monthly_snapshots")
      .select("month, payload, snapshot_at")
      .order("month", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const p = row.payload as {
        kiss: RankingRow[];
        marry: RankingRow[];
        kill: RankingRow[];
        totalVoters: number;
        awards?: Award[];
      };
      return {
        month: row.month as string,
        kiss: p.kiss,
        marry: p.marry,
        kill: p.kill,
        totalVoters: p.totalVoters,
        awards: p.awards ?? [],
        snapshotAt: row.snapshot_at as string,
      };
    });
  }

  async getMyVote(voterToken: string, month: string) {
    const { data, error } = await this.client
      .from("votes")
      .select("kiss_slug, marry_slug, kill_slug")
      .eq("voter_token", voterToken)
      .eq("month", month)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      kiss: data.kiss_slug as string,
      marry: data.marry_slug as string,
      kill: data.kill_slug as string,
    };
  }

  async getReasons(opts: {
    sort: ReasonSort;
    category?: Category | "all";
    modelSlug?: string;
    limit?: number;
    voterToken?: string | null;
  }): Promise<Reason[]> {
    const limit = opts.limit ?? 24;
    // Pull more than needed so client-side hot-ranking has room to work.
    const fetchCount = Math.max(limit * 4, 80);
    const { data, error } = await this.client
      .from("votes")
      .select(
        "id, kiss_slug, marry_slug, kill_slug, kiss_reason, marry_reason, kill_reason, created_at",
      )
      .or(
        "kiss_reason.not.is.null,marry_reason.not.is.null,kill_reason.not.is.null",
      )
      .order("created_at", { ascending: false })
      .limit(fetchCount);
    if (error) throw error;

    const flat: Reason[] = [];
    for (const v of data ?? []) {
      for (const c of ["kiss", "marry", "kill"] as Category[]) {
        const text =
          c === "kiss"
            ? v.kiss_reason
            : c === "marry"
              ? v.marry_reason
              : v.kill_reason;
        if (!text) continue;
        if (opts.category && opts.category !== "all" && opts.category !== c) continue;
        const slug =
          c === "kiss" ? v.kiss_slug : c === "marry" ? v.marry_slug : v.kill_slug;
        if (opts.modelSlug && opts.modelSlug !== slug) continue;
        flat.push({
          id: `${v.id}:${c}`,
          category: c,
          modelSlug: slug,
          reason: text,
          at: v.created_at,
          reactions: { fire: 0, skull: 0, sob: 0 },
          myReactions: { fire: 0, skull: 0, sob: 0 },
        });
      }
    }
    if (flat.length === 0) return [];

    // Hydrate reaction counts in a single query.
    const ids = flat.map((r) => r.id);
    const { data: rxRows, error: rxErr } = await this.client
      .from("reason_reactions")
      .select("vote_id, category, kind, voter_token")
      .in("reason_id", ids);
    // Some Supabase versions don't have `.in` on a derived expression — we
    // store reason_id as a generated column so this works after schema.sql.
    if (rxErr) throw rxErr;

    const byId = new Map<string, Reason>();
    for (const r of flat) byId.set(r.id, r);
    for (const rx of rxRows ?? []) {
      const id = (rx as { reason_id?: string }).reason_id ?? `${rx.vote_id}:${rx.category}`;
      const r = byId.get(id);
      if (!r) continue;
      const kind = rx.kind as ReactionKind;
      r.reactions[kind] += 1;
      if (opts.voterToken && rx.voter_token === opts.voterToken) {
        r.myReactions[kind] = 1;
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

    // Try delete first; if it deleted, the reaction was on.
    const { data: existing, error: selErr } = await this.client
      .from("reason_reactions")
      .select("id")
      .eq("vote_id", voteId)
      .eq("category", category)
      .eq("kind", opts.kind)
      .eq("voter_token", opts.voterToken)
      .maybeSingle();
    if (selErr) throw selErr;

    let on: boolean;
    if (existing) {
      const { error } = await this.client
        .from("reason_reactions")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      on = false;
    } else {
      const { error } = await this.client.from("reason_reactions").insert({
        vote_id: voteId,
        category,
        kind: opts.kind,
        voter_token: opts.voterToken,
      });
      if (error && error.code !== "23505") throw error;
      on = true;
    }

    const { count, error: cntErr } = await this.client
      .from("reason_reactions")
      .select("id", { count: "exact", head: true })
      .eq("vote_id", voteId)
      .eq("category", category)
      .eq("kind", opts.kind);
    if (cntErr) throw cntErr;

    return { kind: opts.kind, count: count ?? 0, on };
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

function sortReasons(a: Reason, b: Reason, sort: ReasonSort): number {
  if (sort === "recent") return a.at < b.at ? 1 : -1;
  if (sort === "top") return totalReactions(b) - totalReactions(a);
  return hotScore(b) - hotScore(a);
}

// Suppress unused warning for ReactionCounts re-export shape — kept for symmetry.
export type _ReactionCountsAlias = ReactionCounts;
