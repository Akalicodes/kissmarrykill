/**
 * Best-effort in-process rate limiter, keyed by anything you like
 * (typically the hashed IP). Resets on server restart.
 *
 * For serious abuse protection you'd swap this for Upstash Redis or
 * Supabase row-level rate limiting — but for the "casual" enforcement
 * tier this is enough to make scripted brigading annoying.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true, retryAfterMs: 0 };
}
