import { describe, it, expect } from 'vitest';
import { extractOutline } from '../src/outline';
import { buildUserMessage, SYSTEM_PROMPT } from '../src/prompt';
import { rateLimit } from '../src/ratelimit';
import { callLLM, LLMError } from '../src/llm';
import type { AiEnv } from '../src/llm';

// --- callLLM cascade: Gemini(key2) → Gemini(key3) → Workers AI ---

describe('callLLM cascade', () => {
  it('uses Gemini key2 when it succeeds', async () => {
    let calls = 0;
    const env: AiEnv = { GOOGLE_GEMINI_API2_KEY: 'K2', GOOGLE_GEMINI_API3_KEY: 'K3' };
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '# T\n- a' }] } }] }), {
        status: 200,
      });
    }) as typeof fetch;
    try {
      const out = await callLLM(env, '@cf/qwen/x', 'sys', 'usr');
      expect(out).toBe('# T\n- a');
      expect(calls).toBe(1); // 只用 key2，沒動 key3 / Workers
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('falls back to key3 when key2 is quota-exhausted (429)', async () => {
    let geminiCalls = 0;
    const env: AiEnv = { GOOGLE_GEMINI_API2_KEY: 'K2', GOOGLE_GEMINI_API3_KEY: 'K3' };
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      geminiCalls++;
      if (geminiCalls === 1) return new Response('rate limited', { status: 429 });
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), {
        status: 200,
      });
    }) as typeof fetch;
    try {
      const out = await callLLM(env, '@cf/qwen/x', 'sys', 'usr');
      expect(out).toBe('ok');
      expect(geminiCalls).toBe(2); // key2 失敗 → key3 成功
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('falls back to Workers AI when both Gemini keys exhausted', async () => {
    const env: AiEnv = {
      GOOGLE_GEMINI_API2_KEY: 'K2',
      GOOGLE_GEMINI_API3_KEY: 'K3',
      AI: { run: async () => ({ choices: [{ message: { content: 'from-qwen' } }] }) },
    };
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => new Response('429', { status: 429 })) as typeof fetch;
    try {
      const out = await callLLM(env, '@cf/qwen/x', 'sys', 'usr');
      expect(out).toBe('from-qwen');
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('throws AI_QUOTA_EXHAUSTED when all providers exhausted', async () => {
    const env: AiEnv = {
      GOOGLE_GEMINI_API2_KEY: 'K2',
      GOOGLE_GEMINI_API3_KEY: 'K3',
      AI: { run: async () => { throw new Error('daily limit exceeded'); } },
    };
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => new Response('rate limit', { status: 429 })) as typeof fetch;
    try {
      await expect(callLLM(env, '@cf/qwen/x', 'sys', 'usr')).rejects.toMatchObject({
        code: 'AI_QUOTA_EXHAUSTED',
      });
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('throws AI_UNAVAILABLE with no providers', async () => {
    await expect(callLLM({}, '@cf/qwen/x', 'sys', 'usr')).rejects.toBeInstanceOf(LLMError);
  });
});

describe('prompt', () => {
  it('system prompt mandates H1 + bullet outline', () => {
    expect(SYSTEM_PROMPT).toMatch(/#\s\{中心主題\}/);
    expect(SYSTEM_PROMPT).toMatch(/-/); // bullet
  });
  it('buildUserMessage embeds topic + content', () => {
    const m = buildUserMessage({ topic: '上市', content: 'UI 設計' });
    expect(m).toContain('上市');
    expect(m).toContain('UI 設計');
  });
});

describe('extractOutline', () => {
  it('accepts a clean outline', () => {
    const md = '# 產品\n\n- A\n  - B';
    expect(extractOutline(md)).toBe(md);
  });
  it('strips code fence + preamble', () => {
    const raw = '好的，以下是：\n```markdown\n# 產品\n- A\n  - B\n```\n謝謝！';
    const out = extractOutline(raw);
    expect(out).toBe('# 產品\n- A\n  - B');
  });
  it('strips leading model chatter before H1', () => {
    const out = extractOutline('這是為你整理的心智圖：\n\n# 主題\n\n- 子一\n- 子二');
    expect(out?.startsWith('# 主題')).toBe(true);
  });
  it('synthesizes H1 when only bullets given', () => {
    const out = extractOutline('- a\n- b');
    expect(out?.startsWith('# 心智圖')).toBe(true);
  });
  it('returns null on non-outline garbage', () => {
    expect(extractOutline('我無法處理這個請求。')).toBeNull();
  });
  it('normalizes */+ bullets to -', () => {
    const out = extractOutline('# T\n\n* a\n+ b') || '';
    expect(out).toMatch(/- a/);
    expect(out).toMatch(/- b/);
  });
});

describe('rateLimit', () => {
  it('allows up to limit then blocks', () => {
    const store = new Map();
    const now = 1000;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(store, 'k', 3, now + i).ok).toBe(true);
    }
    // 第 4 次在限額 3 內應擋（上迴圈已用掉 3 次）
    expect(rateLimit(store, 'k', 3, now + 3).ok).toBe(false);
  });
  it('resets after window', () => {
    const store = new Map();
    rateLimit(store, 'k', 1, 1000);
    expect(rateLimit(store, 'k', 1, 1000).ok).toBe(false); // 同窗擋
    expect(rateLimit(store, 'k', 1, 1000 + 61_000).ok).toBe(true); // 跨窗放行
  });
});
