import { NextResponse } from "next/server";
import { resolveSlug } from "@/lib/models";
import { currentMonth } from "@/lib/month";
import { rateLimit } from "@/lib/rateLimit";
import { getStorage } from "@/lib/storage";
import { CATEGORIES, type Category } from "@/lib/types";
import { getOrCreateVoterToken, hashClientIp } from "@/lib/voteToken";

export const runtime = "nodejs";

const MAX_TEXT_LEN   = 60;
const MAX_REASON_LEN = 240;

/**
 * One person walking up to the wall. `text` is whatever they wrote, `reason`
 * is the optional hot take displayed under it. We resolve `text` to the
 * nearest known model slug for counting; unrecognised text counts as "other".
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { category, text, reason } = (body ?? {}) as Record<string, unknown>;

  if (typeof category !== "string" || !CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: "BAD_CATEGORY" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "MISSING_TEXT" }, { status: 400 });
  }

  const cleanText   = text.trim().slice(0, MAX_TEXT_LEN);
  const cleanReason = typeof reason === "string"
    ? reason.trim().slice(0, MAX_REASON_LEN) || undefined
    : undefined;
  const slug = resolveSlug(cleanText);

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
      slug,
      text: cleanText,
      reason: cleanReason,
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
