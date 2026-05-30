import { NextResponse } from "next/server";
import { MODELS } from "@/lib/models";
import { currentMonth } from "@/lib/month";
import { rateLimit } from "@/lib/rateLimit";
import { getStorage } from "@/lib/storage";
import { CATEGORIES, type Category } from "@/lib/types";
import { getOrCreateVoterToken, hashClientIp } from "@/lib/voteToken";

export const runtime = "nodejs";

const MAX_TEXT_LEN   = 60;
const MAX_REASON_LEN = 120;

// Resolve a free-text input to a known model slug for counting purposes.
// Unknown text resolves to "other".
const ALIAS_MAP: Record<string, string> = {
  gpt: "chatgpt", "chat gpt": "chatgpt", openai: "chatgpt", "open ai": "chatgpt",
  anthropic: "claude", sonnet: "claude", opus: "claude",
  bard: "gemini", google: "gemini",
  xai: "grok",
  meta: "llama", facebook: "llama",
  "le chat": "mistral",
  alibaba: "qwen",
  microsoft: "copilot", "co pilot": "copilot",
};

function resolveSlug(text: string): string {
  const t = text.trim().toLowerCase();
  if (ALIAS_MAP[t]) return ALIAS_MAP[t];
  const exact = MODELS.find((m) => m.slug === t || m.name.toLowerCase() === t);
  if (exact) return exact.slug;
  const partial = MODELS.find(
    (m) => m.name.toLowerCase().startsWith(t) || m.slug.startsWith(t),
  );
  return partial?.slug ?? "other";
}

/**
 * One person walking up to the wall and writing anything.
 * `text`   — what appears on the wall (free text, any name).
 * `reason` — optional hot take shown below the name.
 * `category` — kiss | marry | kill.
 *
 * The text is resolved to the nearest known model slug for counting;
 * anything unrecognised counts as "other".
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
  const cleanReason = typeof reason === "string" ? reason.trim().slice(0, MAX_REASON_LEN) || undefined : undefined;
  const slug        = resolveSlug(cleanText);

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
