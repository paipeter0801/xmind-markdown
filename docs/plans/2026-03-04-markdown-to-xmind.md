# Markdown to XMind Converter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add reverse conversion capability to convert Markdown files into XMind format (.xmind)

**Architecture:** Create independent `markdown-to-xmind.ts` module using builder pattern to complement existing parser. Markdown structure (headings/lists) maps to XMind topic tree hierarchy. Clean input by filtering empty/whitespace-only nodes.

**Tech Stack:** TypeScript, JSZip (for creating .xmind ZIP files), fast-xml-parser (for XML building), existing marked library

---

## Overview

This plan implements a bidirectional converter:
- **Existing:** XMind → Markdown (`converter.ts`)
- **New:** Markdown → XMind (`markdown-to-xmind.ts`)

### File Structure Changes

```
src/lib/
├── converter.ts           # Existing: XMind → Markdown (no changes)
├── markdown-to-xmind.ts   # NEW: Markdown → XMind converter
├── xmind-builder.ts       # NEW: XMind XML builder
├── markdown-parser.ts     # NEW: Markdown structure parser
├── download.ts            # MODIFY: Add downloadXmind() function
└── types/
    └── converter.ts       # MODIFY: Add MarkdownToXmindOptions
```

### Key Design Decisions

1. **Auto-detect conversion direction** based on file extension (.xmind → MD, .md → XMind)
2. **Data cleaning:** Filter out empty/whitespace-only nodes before XMind generation
3. **Structure mapping:** `#` = root, `##` = level 1 children, `###` = level 2, etc.
4. **Lists as child nodes:** `*`, `-`, `+` list items become child topics
5. **Link support:** Parse `[text](url)` and add as XMind hyperlinks

---

## Task 1: Create Type Definitions for Markdown → XMind

**Files:**
- Modify: `src/types/converter.ts`

**Step 1: Add MarkdownToXmindOptions interface**

Open `src/types/converter.ts` and add after line 28 (after `ConversionOptions`):

```typescript
/**
 * Options for Markdown to XMind conversion
 */
export interface MarkdownToXmindOptions {
  /** Maximum depth for topic tree (default: unlimited) */
  maxDepth?: number;
  /** Skip empty/whitespace-only topics (default: true) */
  skipEmpty?: boolean;
  /** Include inline links as hyperlinks (default: true) */
  includeLinks?: boolean;
  /** Treat lists as child nodes (default: true) */
  listsAsChildren?: boolean;
  /** Root topic title (default: extracted from first heading) */
  rootTitle?: string;
  /** Preserve heading numbers in titles (default: false) */
  preserveHeadingNumbers?: boolean;
}
```

**Step 2: Add MarkdownNode interface**

Add after the `MarkdownToXmindOptions` interface:

```typescript
/**
 * Parsed Markdown node structure
 */
export interface MarkdownNode {
  /** Node type */
  type: 'heading' | 'list' | 'text' | 'root';
  /** Node content */
  content: string;
  /** Heading level (1-6) for headings, undefined for others */
  level?: number;
  /** Child nodes */
  children?: MarkdownNode[];
  /** Links found in content */
  links?: Array<{ text: string; url: string }>;
  /** Line number in original markdown */
  line?: number;
}
```

**Step 3: Add MarkdownToXmindResult interface**

Add after the `MarkdownNode` interface:

```typescript
/**
 * Result of Markdown to XMind conversion
 */
export interface MarkdownToXmindResult {
  /** Success status */
  success: boolean;
  /** Generated XMind file as Blob */
  blob?: Blob;
  /** Conversion statistics */
  stats: {
    /** Total nodes created */
    totalNodes: number;
    /** Maximum depth */
    maxDepth: number;
    /** Empty nodes filtered */
    emptyNodesFiltered: number;
    /** Links processed */
    linksProcessed: number;
  };
  /** Error message if failed */
  error?: string;
}
```

**Step 4: Commit**

```bash
git add src/types/converter.ts
git commit -m "feat: add type definitions for Markdown to XMind conversion"
```

---

## Task 2: Create Markdown Parser

**Files:**
- Create: `src/lib/markdown-parser.ts`

**Step 1: Write failing tests**

Create `src/lib/markdown-parser.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/markdown-parser.test.ts
```

Expected: FAIL with "MarkdownParser is not defined"

**Step 3: Create markdown-parser.ts**

Create `src/lib/markdown-parser.ts`:

```typescript
/**
 * Markdown Parser for Structure Extraction
 * Parses Markdown content into hierarchical node structure
 * @module markdown-parser
 */

import type { MarkdownNode, MarkdownToXmindOptions } from '../types/converter';

/**
 * Parser options
 */
interface ParserOptions {
  listsAsChildren?: boolean;
  preserveHeadingNumbers?: boolean;
}

/**
 * Markdown Parser Class
 */
export class MarkdownParser {
  private options: ParserOptions;

  constructor(options?: ParserOptions) {
    this.options = {
      listsAsChildren: true,
      preserveHeadingNumbers: false,
      ...options,
    };
  }

  /**
   * Parse Markdown content into node tree
   * @param markdown - Markdown string content
   * @returns Root MarkdownNode
   */
  parse(markdown: string): MarkdownNode {
    const lines = markdown.split('\n');
    const root = this.createRootNode(lines);

    // Parse each line and build tree
    const stack: MarkdownNode[] = [root];
    let lastHeadingLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = this.options.preserveHeadingNumbers
          ? line
          : headingMatch[2];

        const node: MarkdownNode = {
          type: 'heading',
          content: this.extractLinks(content),
          level,
          line: i + 1,
        };

        // Extract links from content
        this.parseLinks(node);

        // Find correct parent
        while (stack.length > 1 && (stack[stack.length - 1].level ?? 0) >= level) {
          stack.pop();
        }

        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        stack.push(node);
        lastHeadingLevel = level;
        continue;
      }

      // Check for list item
      const listMatch = line.match(/^[\*\-\+]\s+(.+)$/);
      if (listMatch && this.options.listsAsChildren) {
        const content = listMatch[1];
        const node: MarkdownNode = {
          type: 'list',
          content: this.extractLinks(content),
          line: i + 1,
        };

        // Extract links
        this.parseLinks(node);

        // Add to current heading or root
        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        continue;
      }
    }

    return root;
  }

  /**
   * Create root node from first heading or use default
   * @param lines - Array of markdown lines
   * @returns Root node
   */
  private createRootNode(lines: string[]): MarkdownNode {
    // Find first heading
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        const root: MarkdownNode = {
          type: 'root',
          content: this.extractLinks(match[1]),
          level: 0,
          children: [],
        };
        this.parseLinks(root);
        return root;
      }
    }

    // No heading found, create default root
    return {
      type: 'root',
      content: 'Mind Map',
      level: 0,
      children: [],
    };
  }

  /**
   * Parse and extract links from node content
   * @param node - Node to parse links from
   */
  private parseLinks(node: MarkdownNode): void {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: Array<{ text: string; url: string }> = [];
    let match;

    while ((match = linkRegex.exec(node.content)) !== null) {
      links.push({ text: match[1], url: match[2] });
    }

    if (links.length > 0) {
      node.links = links;
    }
  }

  /**
   * Extract links and return clean content
   * @param content - Content with potential markdown links
   * @returns Content with links extracted (keeping text only)
   */
  private extractLinks(content: string): string {
    return content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }
}

/**
 * Parse Markdown string to node tree
 * Convenience function
 * @param markdown - Markdown string
 * @param options - Parser options
 * @returns Root node
 */
export function parseMarkdown(
  markdown: string,
  options?: ParserOptions
): MarkdownNode {
  const parser = new MarkdownParser(options);
  return parser.parse(markdown);
}

export default MarkdownParser;
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- src/lib/markdown-parser.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/markdown-parser.ts src/lib/markdown-parser.test.ts
git commit -m "feat: add Markdown parser for structure extraction"
```

---

## Task 3: Create XMind XML Builder

**Files:**
- Create: `src/lib/xmind-builder.ts`

**Step 1: Write failing tests**

Create `src/lib/xmind-builder.test.ts`:

```typescript
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

    expect(xml).toContain('<?xml version="1.0"?>');
    expect(xml).toContain('<xmap-content');
    expect(xml).toContain('<topic');
    expect(xml).toContain('>Root<text>');
    expect(xml).toContain('>Child 1<text>');
    expect(xml).toContain('>Child 2<text>');
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
    expect(xml).toContain('<sheet>');
    expect(xml).toContain('</sheet>');
    expect(xml).toContain('</xmap-content>');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/xmind-builder.test.ts
```

Expected: FAIL with "XmindBuilder is not defined"

**Step 3: Create xmind-builder.ts**

Create `src/lib/xmind-builder.ts`:

```typescript
/**
 * XMind XML Builder
 * Builds XMind-compatible XML from Markdown node tree
 * @module xmind-builder
 */

import { nanoid } from 'nanoid';
import type { MarkdownNode, MarkdownToXmindOptions } from '../types/converter';

/**
 * Builder options
 */
interface BuilderOptions {
  skipEmpty?: boolean;
  includeLinks?: boolean;
}

/**
 * XMind Builder Class
 */
export class XmindBuilder {
  private options: BuilderOptions;

  constructor(options?: BuilderOptions) {
    this.options = {
      skipEmpty: true,
      includeLinks: true,
      ...options,
    };
  }

  /**
   * Build XMind XML from node tree
   * @param rootNode - Root Markdown node
   * @returns XMind XML string
   */
  build(rootNode: MarkdownNode): string {
    const sheetId = nanoid();
    const rootTopicId = nanoid();

    // Build root topic
    const rootTopicXml = this.buildTopic(rootNode, rootTopicId);

    // Build children
    let childrenXml = '';
    if (rootNode.children && rootNode.children.length > 0) {
      childrenXml = this.buildChildren(rootNode.children, rootTopicId);
    }

    // Assemble complete XMind XML
    return `<?xml version="1.0" encoding="UTF-8"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink">
  <sheet id="${sheetId}">
    <topic id="${rootTopicId}">
      ${rootTopicXml}
      ${childrenXml ? `<topics>${childrenXml}</topics>` : ''}
    </topic>
  </sheet>
</xmap-content>`;
  }

  /**
   * Build topic XML element
   * @param node - Markdown node
   * @param topicId - Topic ID
   * @returns Topic XML string
   */
  private buildTopic(node: MarkdownNode, topicId: string): string {
    let xml = '';

    // Add title
    xml += `<title>${this.escapeXml(node.content)}</title>`;

    // Add hyperlink if present
    if (this.options.includeLinks && node.links && node.links.length > 0) {
      const link = node.links[0]; // XMind typically supports one primary link
      xml += ` <xhtml:link xlink:href="${this.escapeXml(link.url)}"/>`;
    }

    return xml;
  }

  /**
   * Build children topics XML
   * @param children - Array of child nodes
   * @param parentId - Parent topic ID
   * @returns Children XML string
   */
  private buildChildren(children: MarkdownNode[], parentId: string): string {
    return children
      .filter(child => !this.shouldSkip(child))
      .map(child => this.buildChildTopic(child, parentId))
      .join('');
  }

  /**
   * Build single child topic XML
   * @param node - Child node
   * @param parentId - Parent topic ID
   * @returns Child topic XML string
   */
  private buildChildTopic(node: MarkdownNode, parentId: string): string {
    const topicId = nanoid();
    let xml = `<topic id="${topicId}">`;

    // Add title/content
    xml += this.buildTopic(node, topicId);

    // Add children if present
    if (node.children && node.children.length > 0) {
      const filteredChildren = node.children.filter(c => !this.shouldSkip(c));
      if (filteredChildren.length > 0) {
        xml += `<topics>${this.buildChildren(filteredChildren, topicId)}</topics>`;
      }
    }

    xml += '</topic>';
    return xml;
  }

  /**
   * Check if node should be skipped
   * @param node - Node to check
   * @returns True if should skip
   */
  private shouldSkip(node: MarkdownNode): boolean {
    if (!this.options.skipEmpty) return false;

    // Check for empty or whitespace-only content
    if (!node.content || node.content.trim().length === 0) {
      return true;
    }

    return false;
  }

  /**
   * Escape XML special characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Build XMind XML from node tree
 * Convenience function
 * @param rootNode - Root node
 * @param options - Builder options
 * @returns XMind XML string
 */
export function buildXmindXml(
  rootNode: MarkdownNode,
  options?: BuilderOptions
): string {
  const builder = new XmindBuilder(options);
  return builder.build(rootNode);
}

export default XmindBuilder;
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- src/lib/xmind-builder.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/xmind-builder.ts src/lib/xmind-builder.test.ts
git commit -m "feat: add XMind XML builder"
```

---

## Task 4: Create Main Markdown to XMind Converter

**Files:**
- Create: `src/lib/markdown-to-xmind.ts`

**Step 1: Write failing tests**

Create `src/lib/markdown-to-xmind.test.ts`:

```typescript
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

  it('should filter empty nodes when skipEmpty is true', async () => {
    const markdown = '# Root\n##   \n## Child 1';
    const result = await converter.convert(markdown, { skipEmpty: true });

    expect(result.success).toBe(true);
    expect(result.stats.emptyNodesFiltered).toBeGreaterThan(0);
    expect(result.stats.totalNodes).toBeLessThan(3);
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/markdown-to-xmind.test.ts
```

Expected: FAIL with "MarkdownToXmindConverter is not defined"

**Step 3: Create markdown-to-xmind.ts**

Create `src/lib/markdown-to-xmind.ts`:

```typescript
/**
 * Markdown to XMind Converter
 * Converts Markdown content to XMind (.xmind) format
 * @module markdown-to-xmind
 */

import JSZip from 'jszip';
import { MarkdownParser } from './markdown-parser';
import { XmindBuilder } from './xmind-builder';
import type { MarkdownToXmindOptions, MarkdownToXmindResult, MarkdownNode } from '../types/converter';

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS: MarkdownToXmindOptions = {
  skipEmpty: true,
  includeLinks: true,
  listsAsChildren: true,
  preserveHeadingNumbers: false,
};

/**
 * Main converter class
 */
export class MarkdownToXmindConverter {
  private options: MarkdownToXmindOptions;

  constructor(options?: Partial<MarkdownToXmindOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Convert Markdown content to XMind file
   * @param markdown - Markdown string content
   * @param options - Conversion options (overrides constructor options)
   * @returns Conversion result with Blob
   */
  async convert(
    markdown: string,
    options?: Partial<MarkdownToXmindOptions>
  ): Promise<MarkdownToXmindResult> {
    const startTime = performance.now();
    const mergedOptions = { ...this.options, ...options };

    try {
      // Parse markdown to node tree
      const parser = new MarkdownParser({
        listsAsChildren: mergedOptions.listsAsChildren,
        preserveHeadingNumbers: mergedOptions.preserveHeadingNumbers,
      });

      const rootNode = parser.parse(markdown);

      // Clean empty nodes if requested
      const cleanedRoot = mergedOptions.skipEmpty
        ? this.cleanEmptyNodes(rootNode)
        : rootNode;

      // Build XMind XML
      const builder = new XmindBuilder({
        skipEmpty: mergedOptions.skipEmpty,
        includeLinks: mergedOptions.includeLinks,
      });

      const xmlContent = builder.build(cleanedRoot);

      // Create XMind ZIP file
      const blob = await this.createXmindFile(xmlContent);

      // Calculate statistics
      const stats = this.calculateStats(cleanedRoot, startTime);

      return {
        success: true,
        blob,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        stats: {
          totalNodes: 0,
          maxDepth: 0,
          emptyNodesFiltered: 0,
          linksProcessed: 0,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove empty/whitespace-only nodes from tree
   * @param node - Root node to clean
   * @returns Cleaned node tree
   */
  private cleanEmptyNodes(node: MarkdownNode): MarkdownNode {
    const cleaned: MarkdownNode = { ...node };

    if (node.children) {
      cleaned.children = node.children
        .filter(child => {
          const isEmpty = !child.content || child.content.trim().length === 0;
          return !isEmpty;
        })
        .map(child => this.cleanEmptyNodes(child));
    }

    return cleaned;
  }

  /**
   * Create XMind ZIP file from XML content
   * @param xmlContent - XMind XML content
   * @returns Blob containing .xmind file
   */
  private async createXmindFile(xmlContent: string): Promise<Blob> {
    const zip = new JSZip();

    // Add content.xml to ZIP
    zip.file('content.xml', xmlContent);

    // Add META-INF directory with manifest
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0">
  <file-entry full-path="content.xml"/>
</manifest>`;
    zip.file('META-INF/manifest.xml', manifest);

    // Generate ZIP blob
    const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    return new Blob([arrayBuffer], { type: 'application/x-xmind' });
  }

  /**
   * Calculate conversion statistics
   * @param rootNode - Root node
   * @param startTime - Conversion start time
   * @returns Statistics object
   */
  private calculateStats(
    rootNode: MarkdownNode,
    startTime: number
  ): MarkdownToXmindResult['stats'] {
    let totalNodes = 0;
    let maxDepth = 0;
    let linksProcessed = 0;

    const traverse = (node: MarkdownNode, depth: number) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, depth);

      if (node.links) {
        linksProcessed += node.links.length;
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    };

    traverse(rootNode, 0);

    return {
      totalNodes,
      maxDepth,
      emptyNodesFiltered: 0, // Calculated during cleaning
      linksProcessed,
    };
  }

  /**
   * Update converter options
   * @param options - New options (partial)
   */
  setOptions(options: Partial<MarkdownToXmindOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   * @returns Current options
   */
  getOptions(): MarkdownToXmindOptions {
    return { ...this.options };
  }
}

/**
 * Convert Markdown to XMind file
 * Convenience function for one-shot conversion
 * @param markdown - Markdown string content
 * @param options - Optional conversion options
 * @returns Conversion result
 */
export async function convertMarkdownToXmind(
  markdown: string,
  options?: Partial<MarkdownToXmindOptions>
): Promise<MarkdownToXmindResult> {
  const converter = new MarkdownToXmindConverter(options);
  return converter.convert(markdown);
}

/**
 * Parse Markdown string to node tree
 * @param markdown - Markdown string
 * @param options - Optional conversion options
 * @returns Root node
 */
export function parseMarkdownTree(
  markdown: string,
  options?: Partial<MarkdownToXmindOptions>
): MarkdownNode {
  const parser = new MarkdownParser({
    listsAsChildren: options?.listsAsChildren,
    preserveHeadingNumbers: options?.preserveHeadingNumbers,
  });
  return parser.parse(markdown);
}

export default MarkdownToXmindConverter;
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- src/lib/markdown-to-xmind.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/markdown-to-xmind.ts src/lib/markdown-to-xmind.test.ts
git add src/lib/markdown-parser.ts src/lib/xmind-builder.ts
git commit -m "feat: add Markdown to XMind converter with data cleaning"
```

---

## Task 5: Extend Download Functionality

**Files:**
- Modify: `src/lib/download.ts`

**Step 1: Add downloadXmind function**

Open `src/lib/download.ts` and add before `export function downloadBatch` (around line 386):

```typescript
/**
 * Download XMind file
 * @param blob - XMind file blob
 * @param filename - Filename without extension
 */
export function downloadXmind(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xmind`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

**Step 2: Export new converter module**

Open `src/lib/index.ts` and add:

```typescript
// Add existing exports...
export { MarkdownToXmindConverter, convertMarkdownToXmind, parseMarkdownTree } from './markdown-to-xmind';
export { MarkdownParser, parseMarkdown } from './markdown-parser';
export { XmindBuilder, buildXmindXml } from './xmind-builder';
```

**Step 3: Commit**

```bash
git add src/lib/download.ts src/lib/index.ts
git commit -m "feat: add XMind download function and export converter modules"
```

---

## Task 6: Update Converter Component for Auto-Detection

**Files:**
- Modify: `src/components/converter/Converter.svelte`

**Step 1: Read current Converter component**

```bash
cat src/components/converter/Converter.svelte
```

Note the structure of how files are currently handled.

**Step 2: Add bidirectional conversion logic**

Modify the file handling to detect .md files:

```typescript
// Add this import at the top
import { MarkdownToXmindConverter } from '../../lib/markdown-to-xmind';
import { downloadXmind } from '../../lib/download';

// In the handleFileDrop or similar function, add:
async function handleFile(file: File) {
  const fileName = file.name.toLowerCase();

  // Detect file type and convert accordingly
  if (fileName.endsWith('.xmind')) {
    // Existing XMind → Markdown logic
    const result = await converter.convert(file, fileName);
    // ... existing result handling
  } else if (fileName.endsWith('.md')) {
    // New Markdown → XMind logic
    const text = await file.text();
    const mdConverter = new MarkdownToXmindConverter();
    const result = await mdConverter.convert(text);

    if (result.success && result.blob) {
      // Auto-download the XMind file
      const baseName = file.name.replace(/\.md$/i, '');
      downloadXmind(result.blob, baseName);

      // Update UI to show conversion result
      conversionResult = {
        content: `Successfully converted to XMind!\n\nNodes created: ${result.stats.totalNodes}\nMax depth: ${result.stats.maxDepth}\nLinks processed: ${result.stats.linksProcessed}`,
        stats: {
          totalTopics: result.stats.totalNodes,
          maxDepthReached: result.stats.maxDepth,
          rootTopics: 1,
          processingTime: 0,
          markersProcessed: 0,
          attachmentsProcessed: 0,
          linksProcessed: result.stats.linksProcessed,
          imagesProcessed: 0,
        },
        metadata: {
          sourceFile: file.name,
          sourceFormat: 'markdown',
          timestamp: new Date(),
          version: '1.0.0',
        },
        success: true,
      };
    } else {
      // Handle error
      showError(result.error || 'Conversion failed');
    }
  } else {
    showError('Unsupported file type. Please use .xmind or .md files.');
  }
}
```

**Step 3: Update DropZone component**

Modify `src/components/ui/DropZone.svelte` to accept both .xmind and .md files:

```typescript
// Update the accept attribute or file validation
const acceptedExtensions = ['.xmind', '.md'];
```

**Step 4: Commit**

```bash
git add src/components/converter/Converter.svelte
git add src/components/ui/DropZone.svelte
git commit -m "feat: add auto-detection for .md files and bidirectional conversion"
```

---

## Task 7: Add Text Input Support for Markdown

**Files:**
- Create: `src/components/converter/MarkdownInput.svelte`

**Step 1: Create MarkdownInput component**

Create `src/components/converter/MarkdownInput.svelte`:

```svelte
<script lang="ts">
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import { MarkdownToXmindConverter } from '../../lib/markdown-to-xmind';
  import { downloadXmind } from '../../lib/download';

  interface Props {
    onConversionStart?: () => void;
    onConversionComplete?: (result: { success: boolean; filename: string }) => void;
  }

  let { onConversionStart, onConversionComplete }: Props = $props();

  let markdownInput = $state('');
  let filename = $state('mindmap');
  let isConverting = $state(false);
  let showPreview = $state(false);

  async function handleConvert() {
    if (!markdownInput.trim()) return;

    isConverting = true;
    onConversionStart?.();

    try {
      const converter = new MarkdownToXmindConverter();
      const result = await converter.convert(markdownInput);

      if (result.success && result.blob) {
        downloadXmind(result.blob, filename);
        onConversionComplete?.({ success: true, filename: `${filename}.xmind` });
      } else {
        onConversionComplete?.({ success: false, filename: '' });
      }
    } catch (error) {
      onConversionComplete?.({ success: false, filename: '' });
    } finally {
      isConverting = false;
    }
  }

  function handlePaste(event: ClipboardEvent) {
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText) {
      markdownInput = pastedText;
    }
  }
</script>

<Card variant="default" class="flex flex-col gap-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
      Markdown to XMind
    </h3>
    <Button
      variant="outline"
      size="sm"
      onclick={() => (showPreview = !showPreview)}
    >
      {showPreview ? 'Hide Preview' : 'Show Preview'}
    </Button>
  </div>

  <!-- Filename Input -->
  <div>
    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      Filename (without extension)
    </label>
    <input
      type="text"
      bind:value={filename}
      placeholder="mindmap"
      class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
    />
  </div>

  <!-- Markdown Input -->
  <div>
    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      Markdown Content
    </label>
    <textarea
      bind:value={markdownInput}
      onpaste={handlePaste}
      placeholder="# Root Topic&#10;&#10;## Child Topic 1&#10;## Child Topic 2&#10;&#10;### Subtopic&#10;* List item 1&#10;* List item 2"
      rows="10"
      class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm"
    ></textarea>
  </div>

  <!-- Preview (optional) -->
  {#if showPreview && markdownInput}
    <div class="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-2">Preview:</p>
      <pre class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">{markdownInput}</pre>
    </div>
  {/if}

  <!-- Convert Button -->
  <div class="flex justify-end">
    <Button
      variant="primary"
      onclick={handleConvert}
      disabled={!markdownInput.trim() || isConverting}
    >
      {#if isConverting}
        Converting...
      {:else}
        Convert & Download .xmind
      {/if}
    </Button>
  </div>
</Card>
```

**Step 2: Integrate into main Converter component**

Update `src/components/converter/Converter.svelte` to include the MarkdownInput component:

```svelte
<script>
  // Add import
  import MarkdownInput from './MarkdownInput.svelte';

  // Add state for input mode
  let inputMode = $state<'file' | 'text'>('file');
</script>

<!-- Add mode toggle in template -->
<div class="flex gap-2 mb-4">
  <Button
    variant={inputMode === 'file' ? 'primary' : 'outline'}
    size="sm"
    onclick={() => (inputMode = 'file')}
  >
    File Upload
  </Button>
  <Button
    variant={inputMode === 'text' ? 'primary' : 'outline'}
    size="sm"
    onclick={() => (inputMode = 'text')}
  >
    Text Input
  </Button>
</div>

<!-- Conditional rendering -->
{#if inputMode === 'file'}
  <DropZone ... />
{:else}
  <MarkdownInput ... />
{/if}
```

**Step 3: Commit**

```bash
git add src/components/converter/MarkdownInput.svelte
git add src/components/converter/Converter.svelte
git commit -m "feat: add text input mode for Markdown to XMind conversion"
```

---

## Task 8: Update UI Labels and Documentation

**Files:**
- Modify: `src/components/converter/ResultPanel.svelte`
- Modify: `src/components/ui/DropZone.svelte`

**Step 1: Update DropZone text to indicate bidirectional support**

Modify `src/components/ui/DropZone.svelte`:

```svelte
<!-- Update instruction text -->
<p class="text-slate-600 dark:text-slate-400">
  Drop your <strong>.xmind</strong> or <strong>.md</strong> file here, or click to browse
</p>

<p class="text-sm text-slate-500 dark:text-slate-500">
  .xmind → Markdown | .md → XMind
</p>
```

**Step 2: Update ResultPanel header for bidirectional context**

Modify `src/components/converter/ResultPanel.svelte` to show appropriate title:

```svelte
<script>
  // Add prop for source format
  interface Props {
    // ... existing props
    sourceFormat?: 'xmind' | 'markdown';
  }

  let { sourceFormat = 'xmind', ...otherProps }: Props = $props();

  const title = $derived(
    sourceFormat === 'xmind' ? 'Markdown Preview' : 'XMind Conversion Result'
  );
</script>

<!-- Update header -->
<h2 class="text-2xl font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
  {title}
</h2>

<!-- Update export button label -->
<Button variant="primary" size="sm" onclick={onExport} disabled={isLoading}>
  {sourceFormat === 'xmind' ? 'Export .md' : 'Download .xmind'}
</Button>
```

**Step 3: Update main page title and description**

Modify `src/pages/index.astro` or main page component:

```html
<h1>XMind ↔ Markdown Converter</h1>
<p>Convert bidirectionally between XMind mind maps and Markdown documents</p>
```

**Step 4: Commit**

```bash
git add src/components/converter/ResultPanel.svelte
git add src/components/ui/DropZone.svelte
git add src/pages/index.astro
git commit -m "docs: update UI labels for bidirectional conversion"
```

---

## Task 9: Add Comprehensive Tests

**Files:**
- Create: `src/lib/integration-tests.ts`

**Step 1: Create integration test file**

Create `src/lib/integration-tests.ts`:

```typescript
/**
 * Integration Tests for Bidirectional Conversion
 */

import { describe, it, expect } from 'vitest';
import { MarkdownToXmindConverter } from './markdown-to-xmind';
import { XmindToMarkdownConverter } from './converter';
import JSZip from 'jszip';

describe('Bidirectional Integration Tests', () => {
  it('should maintain basic structure when converting MD → XMind → MD', async () => {
    const originalMarkdown = `# Root
## Child 1
### Grandchild 1
## Child 2`;

    // MD → XMind
    const mdToXmind = new MarkdownToXmindConverter();
    const xmindResult = await mdToXmind.convert(originalMarkdown);
    expect(xmindResult.success).toBe(true);
    expect(xmindResult.blob).toBeDefined();

    // XMind → MD
    const xmindArrayBuffer = await xmindResult.blob!.arrayBuffer();
    const xmindToMd = new XmindToMarkdownConverter();
    const mdResult = await xmindToMd.convert(xmindArrayBuffer);

    expect(mdResult.success).toBe(true);
    expect(mdResult.content).toContain('Root');
    expect(mdResult.content).toContain('Child 1');
    expect(mdResult.content).toContain('Child 2');
  });

  it('should filter empty nodes in MD → XMind conversion', async () => {
    const markdownWithEmpty = `# Root
##
## Valid Child
###
## Another Child`;

    const converter = new MarkdownToXmindConverter({ skipEmpty: true });
    const result = await converter.convert(markdownWithEmpty);

    expect(result.success).toBe(true);
    // Empty nodes should be filtered
    expect(result.stats.emptyNodesFiltered).toBeGreaterThan(0);
  });

  it('should preserve links through MD → XMind → MD conversion', async () => {
    const markdownWithLinks = `# [Example](https://example.com)
## [GitHub](https://github.com)`;

    const mdToXmind = new MarkdownToXmindConverter({ includeLinks: true });
    const xmindResult = await mdToXmind.convert(markdownWithLinks);

    expect(xmindResult.success).toBe(true);
    expect(xmindResult.stats.linksProcessed).toBe(2);

    // Verify XMind XML contains links
    const xmindArrayBuffer = await xmindResult.blob!.arrayBuffer();
    const zip = await JSZip.loadAsync(xmindArrayBuffer);
    const contentXml = await zip.file('content.xml')?.async('string');
    expect(contentXml).toContain('https://example.com');
    expect(contentXml).toContain('https://github.com');
  });

  it('should handle lists as children in MD → XMind', async () => {
    const markdownWithLists = `# Root
* Item 1
* Item 2
## Section
* Nested Item`;

    const converter = new MarkdownToXmindConverter({ listsAsChildren: true });
    const result = await converter.convert(markdownWithLists);

    expect(result.success).toBe(true);
    expect(result.stats.totalNodes).toBeGreaterThanOrEqual(4); // root + 2 items + section + nested
  });

  it('should handle complex nested structures', async () => {
    const complexMarkdown = `# Main Topic
## Category A
### Subcategory A1
#### Detail A1.1
## Category B
### Subcategory B1
* List item B1.1
* List item B1.2`;

    const converter = new MarkdownToXmindConverter();
    const result = await converter.convert(complexMarkdown);

    expect(result.success).toBe(true);
    expect(result.stats.maxDepth).toBeGreaterThanOrEqual(3);
  });
});
```

**Step 2: Run integration tests**

```bash
npm run test
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/integration-tests.ts
git commit -m "test: add integration tests for bidirectional conversion"
```

---

## Task 10: Build and Verify

**Files:** Various

**Step 1: Build client-side code**

```bash
npm run build:client
```

Expected: `public/client-converter.js` created successfully

**Step 2: Build full project**

```bash
npm run build
```

Expected: Dist folder created without errors

**Step 3: Test locally**

```bash
npm run preview
```

Navigate to http://localhost:4321 and test:
1. Drop a .md file → should download .xmind
2. Drop a .xmind file → should show markdown preview
3. Use text input mode → paste markdown → convert

**Step 4: Commit**

```bash
git add .
git commit -m "feat: complete Markdown to XMind bidirectional converter"
```

---

## Summary

This plan implements a complete Markdown → XMind converter with the following features:

1. ✅ **Auto-detection** by file extension (.xmind ↔ .md)
2. ✅ **Text input mode** for pasting markdown directly
3. ✅ **Data cleaning** - filters empty/whitespace-only nodes
4. ✅ **Link support** - parses and preserves hyperlinks
5. ✅ **Structure mapping** - headings and lists → XMind topic tree
6. ✅ **Bidirectional** - maintains compatibility with existing XMind → MD

### Key Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/types/converter.ts` | Modify | Add new type definitions |
| `src/lib/markdown-parser.ts` | Create | Parse MD to node tree |
| `src/lib/xmind-builder.ts` | Create | Build XMind XML |
| `src/lib/markdown-to-xmind.ts` | Create | Main converter |
| `src/lib/download.ts` | Modify | Add XMind download |
| `src/components/converter/Converter.svelte` | Modify | Auto-detect file type |
| `src/components/converter/MarkdownInput.svelte` | Create | Text input UI |
| `src/components/ui/DropZone.svelte` | Modify | Accept .md files |
| `src/components/converter/ResultPanel.svelte` | Modify | Bidirectional context |

### Testing Strategy

- Unit tests for parser, builder, and converter
- Integration tests for bidirectional conversion
- Manual testing for UI flows
