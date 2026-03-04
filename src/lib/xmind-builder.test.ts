import { describe, it, expect } from 'vitest';
import { XmindBuilder } from './xmind-builder';
import type { MarkdownNode } from '../types/converter';

describe('XmindBuilder', () => {
  it('should build simple XML from node tree', () => {
    const builder = new XmindBuilder();
    const node: MarkdownNode = {
      type: 'root',
      content: 'Root',
      level: 0,
      children: [
        { type: 'heading', content: 'Child 1', level: 1 },
        { type: 'heading', content: 'Child 2', level: 1 },
      ],
    };

    const xml = builder.build(node);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<xmap-content');
    expect(xml).toContain('<topic');
    expect(xml).toContain('>Root<');
    expect(xml).toContain('>Child 1<');
    expect(xml).toContain('>Child 2<');
  });

  it('should include hyperlinks when present', () => {
    const builder = new XmindBuilder();
    const node: MarkdownNode = {
      type: 'root',
      content: 'Root',
      level: 0,
      children: [
        {
          type: 'heading',
          content: 'Google',
          level: 1,
          links: [{ text: 'Google', url: 'https://google.com' }],
        },
      ],
    };

    const xml = builder.build(node);

    expect(xml).toContain('href="https://google.com"');
  });

  it('should generate valid XMind XML structure', () => {
    const builder = new XmindBuilder();
    const node: MarkdownNode = {
      type: 'root',
      content: 'Root',
      level: 0,
    };

    const xml = builder.build(node);

    // Verify required XMind elements
    expect(xml).toMatch(/<xmap-content[^>]*>/);
    expect(xml).toMatch(/<sheet[^>]*>/);
    expect(xml).toContain('</sheet>');
    expect(xml).toContain('</xmap-content>');
  });

  it('should handle empty content', () => {
    const builder = new XmindBuilder();
    const node: MarkdownNode = {
      type: 'root',
      content: '',
      level: 0,
      children: [
        { type: 'heading', content: 'Child with content', level: 1 },
      ],
    };

    const xml = builder.build(node);

    // Empty root content is handled by shouldSkip
    // but children should still be processed
    expect(xml).toContain('>Child with content<');
  });

  it('should escape special characters in content', () => {
    const builder = new XmindBuilder();
    const node: MarkdownNode = {
      type: 'root',
      content: 'Test with <special> & "chars" and \'quotes\'',
      level: 0,
    };

    const xml = builder.build(node);

    // Verify XML special characters are escaped
    expect(xml).toContain('&lt;special&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&apos;');
  });

  it('should throw error for null rootNode', () => {
    const builder = new XmindBuilder();

    expect(() => builder.build(null as any)).toThrow(
      'Invalid rootNode: must have a content property'
    );
  });

  it('should throw error for undefined rootNode', () => {
    const builder = new XmindBuilder();

    expect(() => builder.build(undefined as any)).toThrow(
      'Invalid rootNode: must have a content property'
    );
  });

  it('should throw error for node without content', () => {
    const builder = new XmindBuilder();

    expect(() =>
      builder.build({ type: 'root', level: 0 } as any)
    ).toThrow('Invalid rootNode: must have a content property');
  });

  it('should handle deeply nested special characters', () => {
    const builder = new XmindBuilder();
    const node: MarkdownNode = {
      type: 'root',
      content: 'Root <tag>',
      level: 0,
      children: [
        {
          type: 'heading',
          content: 'Child & "quotes"',
          level: 1,
          children: [
            {
              type: 'heading',
              content: 'Grandchild <nested>',
              level: 2,
            },
          ],
        },
      ],
    };

    const xml = builder.build(node);

    // Verify all levels have properly escaped characters
    expect(xml).toContain('&lt;tag&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&lt;nested&gt;');
  });
});
