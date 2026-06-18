/**
 * LLM 呼叫層 — Gemini 主力（key2 → key3 輪替）→ Workers AI (qwen) 最終備援。
 * 級聯：gemini-3.1-flash-lite 用 GOOGLE_GEMINI_API2_KEY → 用罄換 GOOGLE_GEMINI_API3_KEY
 *      → 兩把都用罄才 fallback 到 Workers AI。都失敗依錯誤分類拋 LLMError(code)。
 * 參考 murmurnote src/server/lib/llm.ts 的 Gemini 呼叫形狀。
 */

export type AiErrorCode = 'AI_QUOTA_EXHAUSTED' | 'AI_FORMAT_ERROR' | 'AI_UNAVAILABLE';

export interface AiEnv {
  AI?: { run: (model: string, payload: unknown) => Promise<unknown> };
  GOOGLE_GEMINI_API2_KEY?: string;
  GOOGLE_GEMINI_API3_KEY?: string;
}

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const WORKERS_MODEL_DEFAULT = '@cf/qwen/qwen3-30b-a3b-fp8';

export class LLMError extends Error {
  code: AiErrorCode;
  constructor(message: string, code: AiErrorCode = 'AI_UNAVAILABLE') {
    super(message);
    this.name = 'LLMError';
    this.code = code;
  }
}

/** 依訊息/狀態判斷是否為額度/限流類（用罄）→ 用以決定是否換下一把 key/provider。 */
function isQuotaLike(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('exceeded') ||
    msg.includes('daily') ||
    msg.includes('limit reached') ||
    msg.includes('credit') ||
    msg.includes('resourceexhausted')
  );
}

/**
 * 級聯呼叫：Gemini(key2) → Gemini(key3) → Workers AI。
 * 任一成功即回傳原始文字；全部失敗依最後錯誤分類拋 LLMError。
 */
export async function callLLM(
  env: AiEnv,
  workersModel: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const geminiKeys = [env.GOOGLE_GEMINI_API2_KEY, env.GOOGLE_GEMINI_API3_KEY].filter(
    (k): k is string => !!k && k.trim().length > 0,
  );

  let lastErr: unknown = null;
  let sawQuota = false;

  // 1. Gemini 主力（多把 key 輪替）
  for (let i = 0; i < geminiKeys.length; i++) {
    try {
      const r = await callGemini(systemPrompt, userMessage, geminiKeys[i]);
      if (i > 0) console.error(`[LLM] Gemini key#${i + 1}（備用）成功`);
      return r;
    } catch (err) {
      lastErr = err;
      if (isQuotaLike(err)) sawQuota = true;
      console.error(
        `[LLM] Gemini key#${i + 1} 失敗 (${isQuotaLike(err) ? '額度' : '其他'}):`,
        err instanceof Error ? err.message : err,
      );
      // 額度用罄 → 揷下一把 key；其他錯誤也繼續嘗試下一把/備援（best effort）
    }
  }

  // 2. Workers AI 最終備援
  if (env.AI) {
    try {
      const r = await callWorkersAI(env, workersModel, systemPrompt, userMessage);
      console.error('[LLM] Workers AI 備援成功');
      return r;
    } catch (err) {
      lastErr = err;
      if (isQuotaLike(err)) sawQuota = true;
      console.error('[LLM] Workers AI 也失敗:', err instanceof Error ? err.message : err);
    }
  }

  // 3. 全失敗
  if (geminiKeys.length === 0 && !env.AI) {
    throw new LLMError('no AI provider configured', 'AI_UNAVAILABLE');
  }
  throw new LLMError(
    lastErr instanceof Error ? lastErr.message : 'all providers failed',
    sawQuota ? 'AI_QUOTA_EXHAUSTED' : 'AI_UNAVAILABLE',
  );
}

async function callWorkersAI(
  env: AiEnv,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  if (!env.AI) throw new LLMError('Workers AI binding missing', 'AI_UNAVAILABLE');
  const response = await env.AI.run(model || WORKERS_MODEL_DEFAULT, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.6,
    max_tokens: 4096,
  });
  const resp = response as { choices?: Array<{ message?: { content?: string } }> };
  const text = resp.choices?.[0]?.message?.content;
  if (!text) throw new LLMError('Workers AI empty response', 'AI_UNAVAILABLE');
  return text.trim();
}

/** Gemini（仿 murmurnote；30s timeout）。 */
async function callGemini(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const payload = {
    contents: [{ parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    throw new LLMError('Gemini network error', 'AI_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }

  if (resp.status === 429) throw new LLMError('Gemini rate limited', 'AI_QUOTA_EXHAUSTED');
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    console.error('Gemini API error:', resp.status, t.slice(0, 300));
    throw new LLMError(
      `Gemini API error (${resp.status})`,
      isQuotaLike(t) ? 'AI_QUOTA_EXHAUSTED' : 'AI_UNAVAILABLE',
    );
  }

  const data = (await resp.json()) as Record<string, unknown>;
  const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
  const parts = candidates?.[0]?.content
    ? ((candidates[0].content as Record<string, unknown>).parts as Array<Record<string, unknown>> | undefined)
    : undefined;
  const textPart = parts?.find((p) => p.text && p.thought !== true) || parts?.find((p) => p.text);
  const text = textPart?.text as string | undefined;
  if (!text) throw new LLMError('Gemini empty response', 'AI_UNAVAILABLE');
  return text.trim();
}
