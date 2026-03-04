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
      let cleanedRoot = rootNode;
      let emptyNodesFiltered = 0;
      if (mergedOptions.skipEmpty) {
        const result = this.cleanEmptyNodes(rootNode);
        cleanedRoot = result.node;
        emptyNodesFiltered = result.filteredCount;
      }

      // Build XMind XML
      const builder = new XmindBuilder({
        skipEmpty: mergedOptions.skipEmpty,
        includeLinks: mergedOptions.includeLinks,
      });

      const xmlContent = builder.build(cleanedRoot);

      // Create XMind ZIP file
      const blob = await this.createXmindFile(xmlContent);

      // Calculate statistics
      const stats = this.calculateStats(cleanedRoot, startTime, emptyNodesFiltered);

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
   * @returns Object with cleaned node tree and count of filtered nodes
   */
  private cleanEmptyNodes(node: MarkdownNode): { node: MarkdownNode; filteredCount: number } {
    const cleaned: MarkdownNode = { ...node };
    let filteredCount = 0;

    if (node.children) {
      const cleanedChildren: MarkdownNode[] = [];

      for (const child of node.children) {
        const isEmpty = !child.content || child.content.trim().length === 0;

        if (isEmpty) {
          filteredCount++;
        } else {
          const result = this.cleanEmptyNodes(child);
          cleanedChildren.push(result.node);
          filteredCount += result.filteredCount;
        }
      }

      cleaned.children = cleanedChildren;
    }

    return { node: cleaned, filteredCount };
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
   * @param emptyNodesFiltered - Number of empty nodes that were filtered
   * @returns Statistics object
   */
  private calculateStats(
    rootNode: MarkdownNode,
    startTime: number,
    emptyNodesFiltered: number = 0
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
      emptyNodesFiltered,
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
