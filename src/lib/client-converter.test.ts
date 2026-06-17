/**
 * client-converter 測試 — 保護 XMind→MD 核心（app 心臟）。
 * 用 MD→XMind 產生真實 .xmind (ZIP) 再回轉，端到端驗證生產 converter。
 */
import { describe, it, expect } from 'vitest';
import { convertXmindToMarkdown } from './client-converter';
import { MarkdownToXmindConverter } from './markdown-to-xmind';

async function makeXmind(markdown: string): Promise<ArrayBuffer> {
  const result = await new MarkdownToXmindConverter().convert(markdown);
  if (!result.success || !result.blob) throw new Error('fixture build failed');
  return result.blob.arrayBuffer();
}

describe('convertXmindToMarkdown (XMind→MD, production source)', () => {
  it('round-trips a simple tree and returns the topic tree', async () => {
    const md = `# Root\n## Child A\n### Grandchild\n## Child B`;
    const buf = await makeXmind(md);

    const result = await convertXmindToMarkdown(buf, 'test.xmind');

    expect(result.success).toBe(true);
    expect(result.content).toContain('Root');
    expect(result.content).toContain('Child A');
    expect(result.content).toContain('Grandchild');
    expect(result.tree).toBeDefined();
    expect(result.tree?.title).toBe('Root');
    expect(result.tree?.children?.length).toBeGreaterThanOrEqual(1);
  });

  it('populates stats from the parsed tree', async () => {
    const buf = await makeXmind(`# Root\n## A\n## B\n### B1`);
    const result = await convertXmindToMarkdown(buf, 'stats.xmind');
    expect(result.success).toBe(true);
    expect(result.stats.totalTopics).toBeGreaterThanOrEqual(3);
    expect(result.stats.maxDepthReached).toBeGreaterThanOrEqual(1);
  });

  it('returns a structured failure on non-Zip input', async () => {
    const result = await convertXmindToMarkdown(new ArrayBuffer(8), 'bad.xmind');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.stats.totalTopics).toBe(0);
  });

  it('metadata reflects the source file name', async () => {
    const buf = await makeXmind(`# Only Root`);
    const result = await convertXmindToMarkdown(buf, 'my-map.xmind');
    expect(result.success).toBe(true);
    expect(result.metadata.sourceFile).toBe('my-map.xmind');
    expect(result.metadata.sourceFormat).toBe('xmind');
  });
});
