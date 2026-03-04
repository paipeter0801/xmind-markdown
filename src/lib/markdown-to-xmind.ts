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

    // Generate meta.xml
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    const formattedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    const period = date.getHours() < 12 ? '上午' : '下午';

    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<meta xmlns="urn:xmind:xmap:xmlns:meta:2.0" version="2.0">
  <Author>
    <Name>converter</Name>
    <Email/>
    <Org/>
  </Author>
  <Create>
    <Time>${formattedDate} ${period} ${formattedTime}</Time>
  </Create>
  <Creator>
    <Name>XMind Converter</Name>
    <Version>1.0.0</Version>
  </Creator>
  <Thumbnail>
    <Origin>
      <X>400</X>
      <Y>300</Y>
    </Origin>
    <BackgroundColor>#FFFFFF</BackgroundColor>
  </Thumbnail>
</meta>`;
    zip.file('meta.xml', metaXml);

    // Generate styles.xml with minimal theme styles
    const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<xmap-styles xmlns="urn:xmind:xmap:xmlns:style:2.0" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:svg="http://www.w3.org/2000/svg" version="2.0">
  <automatic-styles>
    <style id="default-central-topic" name="" type="topic">
      <topic-properties border-line-color="#558ED5" border-line-width="3pt" fo:font-family="Microsoft YaHei,Arial,sans-serif" line-class="org.xmind.branchConnection.curve" line-color="#558ED5" line-width="1pt" shape-class="org.xmind.topicShape.roundedRect" svg:fill="#DCE6F2"/>
    </style>
    <style id="default-main-topic" name="" type="topic">
      <topic-properties border-line-color="#558ED5" border-line-width="2pt" fo:color="#17375E" fo:font-family="Microsoft YaHei,Arial,sans-serif" line-class="org.xmind.branchConnection.curve" line-color="#558ED5" line-width="1pt" shape-class="org.xmind.topicShape.roundedRect" svg:fill="#DCE6F2"/>
    </style>
    <style id="default-sub-topic" name="" type="topic">
      <topic-properties border-line-width="0pt" fo:font-family="Microsoft YaHei,Arial,sans-serif" line-class="org.xmind.branchConnection.curve" shape-class="org.xmind.topicShape.roundedRect"/>
    </style>
  </automatic-styles>
  <master-styles>
    <style id="1uo4n6afa2flfpqqavhcgbjg6o" name="professional" type="theme">
      <theme-properties>
        <default-style style-family="centralTopic" style-id="default-central-topic"/>
        <default-style style-family="mainTopic" style-id="default-main-topic"/>
        <default-style style-family="subTopic" style-id="default-sub-topic"/>
      </theme-properties>
    </style>
  </master-styles>
</xmap-styles>`;
    zip.file('styles.xml', stylesXml);

    // Add META-INF directory with manifest
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0" password-hint="">
  <file-entry full-path="content.xml" media-type="text/xml"/>
  <file-entry full-path="META-INF/" media-type=""/>
  <file-entry full-path="META-INF/manifest.xml" media-type="text/xml"/>
  <file-entry full-path="meta.xml" media-type="text/xml"/>
  <file-entry full-path="styles.xml" media-type="text/xml"/>
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
