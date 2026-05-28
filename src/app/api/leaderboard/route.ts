import { NextResponse } from "next/server";
import { currentMonth } from "@/lib/month";
import { getStorage, isDemoMode } from "@/lib/storage";
import { readVoterToken } from "@/lib/voteToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const storage = getStorage();
  const month = currentMonth();
  const leaderboard = await storage.getLeaderboard(month);

  const token = await readVoterToken();
  const myVote = token ? await storage.getMyVote(token, month) : null;

  return NextResponse.json({
    leaderboard,
    myVote,
    demoMode: isDemoMode(),
  });
}
