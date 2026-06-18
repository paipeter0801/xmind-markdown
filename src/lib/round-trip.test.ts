/**
 * 無損往返測試 — XMind ↔ Markdown
 * 走真實管線：MD → XMind(zip) → MD → 解析比對。
 * 證明：結構（任意深度，無斷崖）+ markers + links + labels + notes 雙向等價。
 */
import { describe, it, expect } from 'vitest';
import { MarkdownToXmindConverter } from './markdown-to-xmind';
import { convertXmindToMarkdown } from './client-converter';
import { MarkdownParser } from './markdown-parser';
import type { MarkdownNode } from '../types/converter';

// 含豐富資料 + 7 層深度（考驗無斷崖）的 outline markdown
// 備註用行內 <!-- note: ... -->（不碰撞使用者以 📝 為 bullet 的內容）
const SOURCE_MD = `# ⭐ Root Map

- 🚩 Child A #important <!-- note: a note here -->
  - [Linked Child](https://example.com)
    - Grandchild depth3
      - Great depth4
        - depth5
          - depth6
            - depth7leaf
- ➡️ Child B #tag-x <!-- note: Second note line -->`;

async function roundTrip(md: string): Promise<MarkdownNode> {
  const xmind = await new MarkdownToXmindConverter().convert(md);
  expect(xmind.success).toBe(true);
  const buf = await xmind.blob!.arrayBuffer();
  const result = await convertXmindToMarkdown(buf, 'rt.xmind');
  expect(result.success).toBe(true);
  return new MarkdownParser().parse(result.content);
}

/** 遞迴收集 (depth, title, markers, labels, link-urls, notes) 簽章，供前後比對。 */
function signature(node: MarkdownNode, depth = 0, out: string[] = []): string[] {
  const m = (node.markers || []).join(',');
  const l = (node.labels || []).join(',');
  const links = (node.links || []).map((x) => x.url).join(',');
  const note = node.notes ? `[${node.notes}]` : '';
  out.push(`${depth}|${node.content}|m:${m}|l:${l}|u:${links}|n:${note}`);
  for (const c of node.children || []) signature(c, depth + 1, out);
  return out;
}

function find(node: MarkdownNode, title: string): MarkdownNode | undefined {
  if (node.content === title) return node;
  for (const c of node.children || []) {
    const r = find(c, title);
    if (r) return r;
  }
  return undefined;
}

describe('XMind ↔ Markdown lossless round-trip', () => {
  it('preserves structure, markers, labels, links, notes (MD→XMind→MD)', async () => {
    const before = new MarkdownParser().parse(SOURCE_MD);
    const after = await roundTrip(SOURCE_MD);

    // 結構簽章等價（深度/標題/marker/label/link/note）
    expect(signature(after)).toEqual(signature(before));

    // 根：標題 + marker
    expect(after.content).toBe('Root Map');
    expect(after.markers).toContain('star');

    // Child A：marker flag + label + note
    const a = find(after, 'Child A')!;
    expect(a.markers).toContain('flag');
    expect(a.labels).toContain('important');
    expect(a.notes).toBe('a note here');

    // 連結：title 還原為文字、url 保留
    const linked = find(after, 'Linked Child')!;
    expect(linked.links?.[0]?.url).toBe('https://example.com');

    // Child B 第二條備註（多行 note 編碼）
    const b = find(after, 'Child B')!;
    expect(b.markers).toContain('arrow-right');
    expect(b.labels).toContain('tag-x');
    expect(b.notes).toBe('Second note line');
  });

  it('has no depth cliff — level-7 leaf survives the round-trip', async () => {
    const after = await roundTrip(SOURCE_MD);
    const leaf = find(after, 'depth7leaf');
    expect(leaf, 'level-7 leaf must survive (no heading-cliff data loss)').toBeDefined();
    // 7 層深度 = root(0)..depth7leaf(7)，確認沿途都在
    expect(find(after, 'Grandchild depth3')).toBeDefined();
    expect(find(after, 'Great depth4')).toBeDefined();
    expect(find(after, 'depth6')).toBeDefined();
  });

  it('node count is preserved both directions', async () => {
    const before = new MarkdownParser().parse(SOURCE_MD);
    const after = await roundTrip(SOURCE_MD);
    const count = (n: MarkdownNode): number => 1 + (n.children || []).reduce((s, c) => s + count(c), 0);
    expect(count(after)).toBe(count(before));
  });
});

describe('📝-bullet regression (content must NOT be swallowed as a note)', () => {
  it('treats a 📝-prefixed child bullet as a normal node, not a note', () => {
    const md = `# 應用場景
- 學習與教育
  - 📝 語言練習、概念解釋、程式碼教學`;
    const tree = new MarkdownParser().parse(md);
    const learn = find(tree, '學習與教育');
    expect(learn, '學習與教育 should exist').toBeDefined();
    expect(learn!.children?.length, 'should have 1 child').toBe(1);
    // 📝 內容應保留為子節點標題，不得被吞為備註
    expect(learn!.children![0].content).toBe('📝 語言練習、概念解釋、程式碼教學');
    expect(learn!.notes).toBeUndefined();
  });

  it('inline <!-- note: ... --> still round-trips as a note', async () => {
    const md = `# 根\n\n- 子節點 <!-- note: 這是一段備註 -->`;
    const after = await roundTrip(md);
    const child = after.children?.[0];
    expect(child?.content).toBe('子節點');
    expect(child?.notes).toBe('這是一段備註');
  });
});
