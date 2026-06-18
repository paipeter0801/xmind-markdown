/**
 * xmind-markdown-ai — Cloudflare Worker（AI help 後端）。
 * 雙站 (B)：靜態前端站 fetch 本 Worker 的 /api/ai/generate。
 * 參考：travelplus-chatbot（per-origin CORS）+ murmurnote（Workers AI qwen + Gemini 備援）。
 *
 * AI 只處理「使用者主動輸入的純文字」→ outline markdown。不碰使用者上傳的 .xmind（隱私線）。
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt';
import { callLLM, LLMError, type AiErrorCode } from './llm';
import { extractOutline } from './outline';
import { rateLimit } from './ratelimit';

export interface Env {
  AI?: { run: (model: string, payload: unknown) => Promise<unknown> };
  ALLOWED_ORIGINS: string; // 逗號分隔白名單
  RATE_LIMIT_PER_MIN?: string;
  AI_MODEL?: string;
  // Gemini 主力（兩把 key 輪替，secret）；未設則只用 Workers AI 備援
  GOOGLE_GEMINI_API2_KEY?: string;
  GOOGLE_GEMINI_API3_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

const RL_STORE = new Map<string, { windowStart: number; count: number }>();

const allowedOrigins = (env: Env): string[] =>
  (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

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

/** AI 錯誤 code → 繁中友善訊息。 */
const FRIENDLY: Record<AiErrorCode, string> = {
  AI_QUOTA_EXHAUSTED: 'AI 服務今日用量已達上限，請稍後再試（也歡迎未來贊助支持）。',
  AI_FORMAT_ERROR: 'AI 輸出的格式無法解析，請調整輸入內容後再試一次。',
  AI_UNAVAILABLE: 'AI 服務暫時無法回應，請稍後再試。',
};

app.options('/api/ai/generate', (c) => {
  const origin = c.req.header('Origin') ?? null;
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
  const origin = c.req.header('Origin') ?? null;
  const h = corsHeaders(c.env, origin);

  // 1. CORS 白名單
  if (!h['Access-Control-Allow-Origin']) {
    return c.json({ error: 'Origin not allowed', code: 'CORS_DENIED' }, 403, h);
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
    return c.json({ error: '請求過於頻繁，請稍後再試。', code: 'RATE_LIMITED' }, 429, headers);
  }

  // 3. 解析 + 驗證
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await c.req.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.errors[0]?.message : 'invalid body';
    return c.json({ error: msg, code: 'BAD_REQUEST' }, 400, headers);
  }

  // 4. 呼叫 LLM（qwen 主、Gemini 備援）+ outline 格式重試
  const model = c.env.AI_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8';
  let outline: string | null = null;
  let failCode: AiErrorCode = 'AI_UNAVAILABLE';

  for (let attempt = 0; attempt < 2 && !outline; attempt++) {
    const extra =
      attempt > 0 ? '\n\n注意：只輸出 markdown，第一行必須是 # 開頭的主題，不要任何說明。' : '';
    try {
      const raw = await callLLM(c.env, model, SYSTEM_PROMPT, buildUserMessage(parsed) + extra);
      outline = extractOutline(raw);
      if (!outline) failCode = 'AI_FORMAT_ERROR';
    } catch (e) {
      // LLM 層失敗（額度/無回應）→ 不再重試格式，直接帶 code 回
      failCode = e instanceof LLMError ? e.code : 'AI_UNAVAILABLE';
      break;
    }
  }

  if (!outline) {
    console.error('[ai/generate] failed code:', failCode);
    return c.json({ error: FRIENDLY[failCode], code: failCode }, 502, headers);
  }

  return c.json({ markdown: outline }, 200, headers);
});

app.get('/api/ai/health', (c) => c.json({ ok: true }));

export default app;
