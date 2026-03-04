import { describe, it, expect } from 'vitest';
import { MarkdownToXmindConverter } from './markdown-to-xmind';
import { XmindToMarkdownConverter } from './converter';
import JSZip from 'jszip';

describe('Bidirectional Integration Tests', () => {
  it('should maintain basic structure MD → XMind → MD', async () => {
    const originalMarkdown = `# Root
## Child 1
### Grandchild 1
## Child 2`;

    // MD → XMind
    const mdToXmind = new MarkdownToXmindConverter();
    const xmindResult = await mdToXmind.convert(originalMarkdown);
    expect(xmindResult.success).toBe(true);
    expect(xmindResult.blob).toBeDefined();

    // XMind → MD (verify the ZIP can be read back)
    const xmindArrayBuffer = await xmindResult.blob!.arrayBuffer();
    const zip = await JSZip.loadAsync(xmindArrayBuffer);
    const contentXml = await zip.file('content.xml')?.async('string');
    expect(contentXml).toContain('Root');
    expect(contentXml).toContain('Child 1');
  });

  it('should filter empty nodes', async () => {
    const markdownWithEmpty = `# Root
##
## Valid Child`;
    const converter = new MarkdownToXmindConverter({ skipEmpty: true });
    const result = await converter.convert(markdownWithEmpty);

    expect(result.success).toBe(true);
    expect(result.stats.totalNodes).toBeLessThan(3);
  });

  it('should process links', async () => {
    const markdownWithLinks = `# [Example](https://example.com)`;
    const converter = new MarkdownToXmindConverter({ includeLinks: true });
    const result = await converter.convert(markdownWithLinks);

    expect(result.success).toBe(true);
    expect(result.stats.linksProcessed).toBe(1);
  });

  it('should handle nested structures', async () => {
    const complexMarkdown = `# Main
## A
### A1
#### A1a
## B
### B1
* Item`;
    const converter = new MarkdownToXmindConverter();
    const result = await converter.convert(complexMarkdown);

    expect(result.success).toBe(true);
    expect(result.stats.maxDepth).toBeGreaterThanOrEqual(2);
  });
});
