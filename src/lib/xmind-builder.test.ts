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
});
