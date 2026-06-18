/**
 * 輕量 in-memory rate limit（per origin+IP，每分鐘 N 次）。
 * 僅作軟性防刷；付費段會換成 KV/D1 配額。Worker 實例可能在邊緣多點，此為 best-effort。
 */

interface Bucket {
  windowStart: number;
  count: number;
}

const WINDOW_MS = 60_000;

export function rateLimit(
  store: Map<string, Bucket>,
  key: string,
  limit: number,
  now: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const b = store.get(key);
  if (!b || now - b.windowStart > WINDOW_MS) {
    store.set(key, { windowStart: now, count: 1 });
    return { ok: limit >= 1, remaining: Math.max(0, limit - 1), resetAt: now + WINDOW_MS };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.windowStart + WINDOW_MS };
  }
  b.count += 1;
  return { ok: true, remaining: Math.max(0, limit - b.count), resetAt: b.windowStart + WINDOW_MS };
}
