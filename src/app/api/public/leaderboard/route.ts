import { currentMonth } from "@/lib/month";
import { publicJson, publicOptions } from "@/lib/publicApi";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return publicOptions();
}

export async function GET() {
  const storage = getStorage();
  const leaderboard = await storage.getLeaderboard(currentMonth());
  return publicJson({
    month: leaderboard.month,
    totalVoters: leaderboard.totalVoters,
    kiss: leaderboard.kiss,
    marry: leaderboard.marry,
    kill: leaderboard.kill,
  });
}
