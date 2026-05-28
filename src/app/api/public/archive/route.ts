import { publicJson, publicOptions } from "@/lib/publicApi";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return publicOptions();
}

export async function GET() {
  const storage = getStorage();
  const archive = await storage.getArchive();
  return publicJson({ archive });
}
