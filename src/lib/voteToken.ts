import { cookies, headers } from "next/headers";
import { createHash, randomUUID } from "node:crypto";

const COOKIE_NAME = "kmkai_vtoken";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Returns the current voter's stable token. Issues a new one (httpOnly cookie)
 * if the visitor doesn't have one yet. This is intentionally low-friction:
 * combined with localStorage and an ip hash on the server side, it is enough
 * to keep casual double-voting at bay without forcing a sign-in.
 */
export async function getOrCreateVoterToken(): Promise<{
  token: string;
  isNew: boolean;
}> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return { token: existing, isNew: false };

  const token = randomUUID();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
    path: "/",
  });
  return { token, isNew: true };
}

export async function readVoterToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

/**
 * A privacy-preserving fingerprint of the visitor's IP. We never store the
 * raw IP — only its salted SHA-256, so we can spot obvious vote brigading
 * without keeping personal data.
 */
export async function hashClientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  if (!ip) return null;
  const salt = process.env.CRON_SECRET ?? "kmkai-fallback-salt";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}
