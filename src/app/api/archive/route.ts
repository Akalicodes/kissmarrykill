import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const storage = getStorage();
  const archive = await storage.getArchive();
  return NextResponse.json({ archive });
}
