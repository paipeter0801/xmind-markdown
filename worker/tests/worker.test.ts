import { describe, it, expect } from 'vitest';
import { extractOutline } from '../src/outline';
import { buildUserMessage, SYSTEM_PROMPT } from '../src/prompt';
import { rateLimit } from '../src/ratelimit';

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
