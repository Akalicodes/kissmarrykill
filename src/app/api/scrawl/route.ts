import { NextResponse } from "next/server";
import { MODEL_BY_SLUG } from "@/lib/models";
import { currentMonth } from "@/lib/month";
import { rateLimit } from "@/lib/rateLimit";
import { getStorage } from "@/lib/storage";
import { CATEGORIES, type Category } from "@/lib/types";
import { getOrCreateVoterToken, hashClientIp } from "@/lib/voteToken";

export const runtime = "nodejs";

/**
 * One person walking up to the wall and writing one model name in one column.
 * Unlimited (it's a graffiti wall), but IP rate-limited to keep spam down.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { category, model } = (body ?? {}) as Record<string, unknown>;

  if (typeof category !== "string" || !CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: "BAD_CATEGORY" }, { status: 400 });
  }
  if (typeof model !== "string" || !MODEL_BY_SLUG[model]) {
    return NextResponse.json({ error: "UNKNOWN_MODEL" }, { status: 400 });
  }

  const ipHash = await hashClientIp();
  if (ipHash) {
    const rl = rateLimit(`scrawl:${ipHash}`, { max: 30, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "RATE_LIMITED", retryAfterMs: rl.retryAfterMs },
        { status: 429 },
      );
    }
  }

  const { token } = await getOrCreateVoterToken();
  const month = currentMonth();
  const storage = getStorage();

  try {
    await storage.recordScrawl({
      category: category as Category,
      slug: model,
      voterToken: token,
      month,
    });
  } catch (err) {
    console.error("recordScrawl failed", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  const leaderboard = await storage.getLeaderboard(month);
  return NextResponse.json({ ok: true, leaderboard });
}
