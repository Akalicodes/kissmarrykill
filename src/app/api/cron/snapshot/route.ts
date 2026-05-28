import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { currentMonth } from "@/lib/month";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Freezes the previous month into monthly_snapshots.
 *
 * Configure a scheduled call to this endpoint at 00:05 UTC on the 1st of
 * every month (e.g. Vercel Cron, Upstash Schedules, Supabase Cron, GitHub
 * Actions). The request must include `Authorization: Bearer <CRON_SECRET>`
 * unless CRON_SECRET is unset (which it should never be in production).
 *
 * No-op in demo mode (no Supabase configured).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({
      skipped: true,
      reason: "Supabase not configured (demo mode).",
    });
  }

  const client = createClient(url, key, { auth: { persistSession: false } });

  // Snapshot the *previous* month — today is the 1st of the new month.
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const targetMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;

  const { error } = await client.rpc("snapshot_month", {
    target_month: targetMonth,
  });
  if (error) {
    console.error("snapshot_month failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    snapshottedMonth: targetMonth,
    currentMonth: currentMonth(),
  });
}
