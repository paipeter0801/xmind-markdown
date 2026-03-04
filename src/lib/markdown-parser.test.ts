import { describe, it, expect } from 'vitest';
import { MarkdownParser } from './markdown-parser';

describe('MarkdownParser', () => {
  it('should parse simple headings', () => {
    const parser = new MarkdownParser();
    const markdown = '# Root\n## Child 1\n## Child 2';
    const result = parser.parse(markdown);

    expect(result.type).toBe('root');
    expect(result.content).toBe('Root');
    expect(result.children).toHaveLength(2);
    expect(result.children?.[0].content).toBe('Child 1');
    expect(result.children?.[1].content).toBe('Child 2');
  });

  it('should parse nested headings', () => {
    const parser = new MarkdownParser();
    const markdown = '# Root\n## Level 1\n### Level 2\n#### Level 3';
    const result = parser.parse(markdown);

    expect(result.children?.[0].children).toHaveLength(1);
    expect(result.children?.[0].children?.[0].content).toBe('Level 2');
    expect(result.children?.[0].children?.[0].children?.[0].content).toBe('Level 3');
  });

  it('should parse lists as children', () => {
    const parser = new MarkdownParser();
    const markdown = '# Root\n* Item 1\n* Item 2';
    const result = parser.parse(markdown);

    expect(result.children).toHaveLength(2);
    expect(result.children?.[0].type).toBe('list');
    expect(result.children?.[0].content).toBe('Item 1');
  });

  it('should extract links from content', () => {
    const parser = new MarkdownParser();
    const markdown = '# [Google](https://google.com)';
    const result = parser.parse(markdown);

    expect(result.links).toHaveLength(1);
    expect(result.links?.[0].text).toBe('Google');
    expect(result.links?.[0].url).toBe('https://google.com');
  });
});
