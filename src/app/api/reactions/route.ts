import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getStorage } from "@/lib/storage";
import { REACTION_KINDS, type ReactionKind } from "@/lib/types";
import { getOrCreateVoterToken, hashClientIp } from "@/lib/voteToken";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const { reasonId, kind } = (body ?? {}) as Record<string, unknown>;

  if (typeof reasonId !== "string" || !reasonId.includes(":")) {
    return NextResponse.json({ error: "BAD_REASON_ID" }, { status: 400 });
  }
  if (typeof kind !== "string" || !REACTION_KINDS.includes(kind as ReactionKind)) {
    return NextResponse.json({ error: "BAD_KIND" }, { status: 400 });
  }

  const ipHash = await hashClientIp();
  if (ipHash) {
    const rl = rateLimit(`react:${ipHash}`, { max: 30, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }
  }

  const { token } = await getOrCreateVoterToken();
  const storage = getStorage();
  try {
    const result = await storage.toggleReaction({
      reasonId,
      kind: kind as ReactionKind,
      voterToken: token,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("toggleReaction failed", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
