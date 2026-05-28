import { NextResponse } from "next/server";
import { MODEL_BY_SLUG } from "@/lib/models";
import { currentMonth } from "@/lib/month";
import { rateLimit } from "@/lib/rateLimit";
import { getStorage } from "@/lib/storage";
import { getOrCreateVoterToken, hashClientIp } from "@/lib/voteToken";

export const runtime = "nodejs";

const MAX_REASON_LEN = 240;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { kiss, marry, kill, kissReason, marryReason, killReason } =
    (body ?? {}) as Record<string, unknown>;

  if (
    typeof kiss !== "string" ||
    typeof marry !== "string" ||
    typeof kill !== "string"
  ) {
    return NextResponse.json({ error: "MISSING_PICKS" }, { status: 400 });
  }
  if (!MODEL_BY_SLUG[kiss] || !MODEL_BY_SLUG[marry] || !MODEL_BY_SLUG[kill]) {
    return NextResponse.json({ error: "UNKNOWN_MODEL" }, { status: 400 });
  }

  const ipHash = await hashClientIp();
  if (ipHash) {
    const rl = rateLimit(`vote:${ipHash}`, { max: 5, windowMs: 60_000 });
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
    await storage.recordVote(
      {
        voterToken: token,
        kiss,
        marry,
        kill,
        kissReason: clean(kissReason),
        marryReason: clean(marryReason),
        killReason: clean(killReason),
        ipHash,
      },
      month,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "ALREADY_VOTED") {
      return NextResponse.json(
        { error: "ALREADY_VOTED" },
        { status: 409 },
      );
    }
    console.error("recordVote failed", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  const leaderboard = await storage.getLeaderboard(month);
  return NextResponse.json({ ok: true, leaderboard });
}

function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim().slice(0, MAX_REASON_LEN);
  return trimmed.length ? trimmed : null;
}
