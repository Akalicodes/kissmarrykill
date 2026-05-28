import { NextResponse } from "next/server";

/**
 * Helpers for the public, CORS-enabled read-only API. Bloggers, researchers,
 * and Twitter posters can pull leaderboards / archive / models from JS in
 * the browser without proxying.
 */
const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "public, max-age=15, stale-while-revalidate=60",
};

export function publicJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return NextResponse.json(body, { ...init, headers });
}

export function publicOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
