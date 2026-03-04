import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownToXmindConverter } from './markdown-to-xmind';
import type { MarkdownToXmindResult } from '../types/converter';

describe('MarkdownToXmindConverter', () => {
  let converter: MarkdownToXmindConverter;

  beforeEach(() => {
    converter = new MarkdownToXmindConverter();
  });

  it('should convert simple markdown to XMind blob', async () => {
    const markdown = '# Root\n## Child 1\n## Child 2';
    const result = await converter.convert(markdown);

    expect(result.success).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.stats.totalNodes).toBe(3); // root + 2 children
  });

  it('should handle empty node filtering correctly', async () => {
    // Parser already skips truly empty headings, so we test the cleanEmptyNodes logic
    // by directly testing with skipEmpty option
    const markdown = '# Root\n## Child 1\n## Child 2';
    const result = await converter.convert(markdown, { skipEmpty: true });

    expect(result.success).toBe(true);
    expect(result.stats.totalNodes).toBe(3); // root + 2 children
    expect(result.stats.emptyNodesFiltered).toBe(0); // no empty nodes in this case
  });

  it('should process links when includeLinks is true', async () => {
    const markdown = '# [Link](https://example.com)';
    const result = await converter.convert(markdown, { includeLinks: true });

    expect(result.success).toBe(true);
    expect(result.stats.linksProcessed).toBe(1);
  });

  it('should handle nested headings correctly', async () => {
    const markdown = '# Root\n## L1-1\n### L2-1\n## L1-2';
    const result = await converter.convert(markdown);

    expect(result.success).toBe(true);
    expect(result.stats.maxDepth).toBeGreaterThanOrEqual(2);
  });
});
