/**
 * xmind-markdown-ai — Cloudflare Worker（AI help 後端）。
 * 雙站 (B)：靜態前端站 fetch 本 Worker 的 /api/ai/generate。
 * 參考：travelplus-chatbot（per-origin CORS）+ murmurnote（Workers AI qwen）。
 *
 * AI 只處理「使用者主動輸入的純文字」→ outline markdown。不碰使用者上傳的 .xmind（隱私線）。
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt';
import { callAI, LLMError } from './llm';
import { extractOutline } from './outline';
import { rateLimit } from './ratelimit';

export interface Env {
  AI: { run: (model: string, payload: unknown) => Promise<unknown> };
  ALLOWED_ORIGINS: string; // 逗號分隔白名單
  RATE_LIMIT_PER_MIN?: string;
  AI_MODEL?: string;
}

const app = new Hono<{ Bindings: Env }>();

// in-memory rate-limit store（每個 Worker 實例一份；best-effort）
const RL_STORE = new Map<string, { windowStart: number; count: number }>();

const allowedOrigins = (env: Env): string[] =>
  (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = allowedOrigins(env);
  const ok = origin && allowed.includes(origin) ? origin : null;
  return ok
    ? {
        'Access-Control-Allow-Origin': ok,
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    : { Vary: 'Origin' };
}

// 預檢
app.options('/api/ai/generate', (c) => {
  const origin = c.req.header("Origin") ?? null;
  const h = corsHeaders(c.env, origin);
  if (!h['Access-Control-Allow-Origin']) return c.text('CORS not allowed', 403);
  return new Response(null, { status: 204, headers: h });
});

const BodySchema = z.object({
  topic: z.string().trim().min(1, 'topic 必填').max(200),
  content: z.string().trim().min(1, 'content 必填').max(8000),
  hint: z.string().trim().max(300).optional(),
});

app.post('/api/ai/generate', async (c) => {
  const origin = c.req.header("Origin") ?? null;
  const h = corsHeaders(c.env, origin);

  // 1. CORS 白名單（拒絕非預期來源）
  if (!h['Access-Control-Allow-Origin']) {
    return c.json({ error: 'Origin not allowed' }, 403, h);
  }

  // 2. rate limit（per origin+IP）
  const ip = c.req.header('CF-Connecting-IP') || origin || 'unknown';
  const limit = Math.max(1, parseInt(c.env.RATE_LIMIT_PER_MIN || '10', 10));
  const rl = rateLimit(RL_STORE, `${origin}:${ip}`, limit, Date.now());
  const headers = {
    ...h,
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset': String(rl.resetAt),
  };
  if (!rl.ok) {
    return c.json({ error: '請求過於頻繁，請稍後再試。' }, 429, headers);
  }

  // 3. 解析 + 驗證
  let parsed: z.infer<typeof BodySchema>;
  try {
    const body = await c.req.json();
    parsed = BodySchema.parse(body);
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.errors[0]?.message : 'invalid body';
    return c.json({ error: msg }, 400, headers);
  }

  // 4. 呼叫 LLM（最多重試：首次 + 1 次加強提示）
  const model = c.env.AI_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8';
  let outline: string | null = null;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 2 && !outline; attempt++) {
    const extra = attempt > 0 ? '\n\n注意：只輸出 markdown，第一行必須是 # 開頭的主題，不要任何說明。' : '';
    try {
      const raw = await callAI(c.env, model, SYSTEM_PROMPT, buildUserMessage(parsed) + extra);
      outline = extractOutline(raw);
    } catch (e) {
      lastErr = e;
    }
  }

  if (!outline) {
    const msg =
      lastErr instanceof LLMError
        ? 'AI 暫時無法回應，請稍後再試。'
        : 'AI 輸出格式無法解析，請調整內容後重試。';
    console.error('[ai/generate] failed:', lastErr);
    return c.json({ error: msg }, 502, headers);
  }

  return c.json({ markdown: outline }, 200, headers);
});

// 健康檢查
app.get('/api/ai/health', (c) => c.json({ ok: true }));

export default app;
