import type {
  ArchiveEntry,
  Category,
  Leaderboard,
  Reason,
  ReactionKind,
  ReasonSort,
  VoteInput,
} from "@/lib/types";
import { MemoryStorage } from "./memory";
import { SupabaseStorage } from "./supabase";

export interface Storage {
  hasVoted(voterToken: string, month: string): Promise<boolean>;
  recordVote(input: VoteInput, month: string): Promise<void>;
  /**
   * Records a single free-form "scrawl" on the wall — one person writing one
   * model name in one column. Unlike a full vote this is unlimited, mirroring
   * how the physical board lets anyone walk up and add a name.
   */
  recordScrawl(opts: {
    category: Category;
    slug: string;
    text?: string;
    reason?: string;
    voterToken: string;
    month: string;
  }): Promise<void>;
  getLeaderboard(month: string): Promise<Leaderboard>;
  getArchive(): Promise<ArchiveEntry[]>;
  getMyVote(voterToken: string, month: string): Promise<{
    kiss: string;
    marry: string;
    kill: string;
  } | null>;

  /**
   * Returns reasons with reaction counts (and which the current voter has
   * reacted to, if a token is passed). Filterable by category and/or
   * model slug, and sortable.
   */
  getReasons(opts: {
    sort: ReasonSort;
    category?: Category | "all";
    modelSlug?: string;
    limit?: number;
    voterToken?: string | null;
  }): Promise<Reason[]>;

  /** Toggle a reaction. Returns the new reaction count for that kind. */
  toggleReaction(opts: {
    reasonId: string;
    kind: ReactionKind;
    voterToken: string;
  }): Promise<{ kind: ReactionKind; count: number; on: boolean }>;
}

let cached: Storage | null = null;

export function getStorage(): Storage {
  if (cached) return cached;
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = hasSupabase ? new SupabaseStorage() : new MemoryStorage();
  return cached;
}

export function isDemoMode(): boolean {
  return !(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
