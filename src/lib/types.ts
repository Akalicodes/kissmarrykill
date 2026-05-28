export type Category = "kiss" | "marry" | "kill";

export const CATEGORIES: Category[] = ["kiss", "marry", "kill"];

export const REACTION_KINDS = ["fire", "skull", "sob"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export type ReactionCounts = Record<ReactionKind, number>;

export type VoteInput = {
  voterToken: string;
  kiss: string;
  marry: string;
  kill: string;
  kissReason?: string | null;
  marryReason?: string | null;
  killReason?: string | null;
  ipHash?: string | null;
};

export type RankingRow = {
  slug: string;
  votes: number;
};

export type Leaderboard = {
  month: string; // YYYY-MM
  kiss: RankingRow[];
  marry: RankingRow[];
  kill: RankingRow[];
  totalVoters: number;
};

/** Used by the Reason Wall and Hot Takes feeds. */
export type Reason = {
  id: string; // `${voteId}:${category}`
  category: Category;
  modelSlug: string;
  reason: string;
  at: string;
  reactions: ReactionCounts;
  myReactions: ReactionCounts; // 1 if current voter has reacted, 0 otherwise
};

export type ReasonSort = "recent" | "top" | "hot";

export type AwardKey =
  | "most_kissed"
  | "most_married"
  | "most_killed"
  | "most_controversial"
  | "underdog";

export type Award = {
  key: AwardKey;
  modelSlug: string;
  label: string;     // "Most Married"
  blurb: string;     // "the internet's chosen partner"
};

export type ArchiveEntry = {
  month: string;
  kiss: RankingRow[];
  marry: RankingRow[];
  kill: RankingRow[];
  totalVoters: number;
  snapshotAt: string;
  awards: Award[];
};
