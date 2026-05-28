import { MODELS } from "@/lib/models";
import { publicJson, publicOptions } from "@/lib/publicApi";

export const runtime = "nodejs";

export async function OPTIONS() {
  return publicOptions();
}

export async function GET() {
  return publicJson({ models: MODELS });
}
