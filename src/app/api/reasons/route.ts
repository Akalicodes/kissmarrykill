import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { CATEGORIES, type Category, type ReasonSort } from "@/lib/types";
import { readVoterToken } from "@/lib/voteToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SORT: ReasonSort[] = ["recent", "top", "hot"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sortParam = url.searchParams.get("sort") ?? "recent";
  const catParam = url.searchParams.get("category") ?? "all";
  const modelParam = url.searchParams.get("model") ?? undefined;
  const limitParam = Number(url.searchParams.get("limit") ?? "24");

  const sort: ReasonSort = VALID_SORT.includes(sortParam as ReasonSort)
    ? (sortParam as ReasonSort)
    : "recent";
  const category =
    catParam === "all" || CATEGORIES.includes(catParam as Category)
      ? (catParam as Category | "all")
      : "all";
  const limit = Math.min(60, Math.max(1, Number.isFinite(limitParam) ? limitParam : 24));

  const storage = getStorage();
  const token = await readVoterToken();
  const reasons = await storage.getReasons({
    sort,
    category,
    modelSlug: modelParam,
    limit,
    voterToken: token,
  });
  return NextResponse.json({ reasons });
}
