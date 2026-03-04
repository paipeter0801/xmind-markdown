/**
 * XMind XML Builder
 * Builds XMind-compatible XML from Markdown node tree
 * @module xmind-builder
 */

import { nanoid } from 'nanoid';
import type { MarkdownNode } from '../types/converter';

/**
 * Builder options
 */
interface BuilderOptions {
  skipEmpty?: boolean;
  includeLinks?: boolean;
  author?: string;
  theme?: string;
}

/**
 * XMind Builder Class
 */
export class XmindBuilder {
  private options: BuilderOptions;
  private currentTimestamp: number;

  constructor(options?: BuilderOptions) {
    this.options = {
      skipEmpty: true,
      includeLinks: true,
      author: 'converter',
      theme: '1uo4n6afa2flfpqqavhcgbjg6o',
      ...options,
    };
    this.currentTimestamp = Date.now();
  }

  /**
   * Build XMind XML from node tree
   * @param rootNode - Root Markdown node
   * @returns XMind XML string
   */
  build(rootNode: MarkdownNode): string {
    if (!rootNode || typeof rootNode.content !== 'string') {
      throw new Error('Invalid rootNode: must have a content property');
    }

    const sheetId = nanoid();
    const rootTopicId = nanoid();

    // Build root topic content
    const rootTopicContent = this.buildTopicContent(rootNode, rootTopicId);

    // Build children
    let childrenXml = '';
    if (rootNode.children && rootNode.children.length > 0) {
      childrenXml = this.buildChildren(rootNode.children);
    }

    // Assemble complete XMind XML with full attributes
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink" modified-by="${this.options.author}" timestamp="${this.currentTimestamp}" version="2.0">
  <sheet id="${sheetId}" theme="${this.options.theme}" modified-by="${this.options.author}" timestamp="${this.currentTimestamp}">
    <topic id="${rootTopicId}" ${this.buildTopicAttributes()} structure-class="org.xmind.ui.logic.right">
      ${rootTopicContent}
      ${childrenXml ? `<children><topics type="attached">${childrenXml}</topics></children>` : ''}
    </topic>
  </sheet>
</xmap-content>`;
  }

  /**
   * Build topic XML element inner content (title, links, markers)
   * @param node - Markdown node
   * @param topicId - Topic ID
   * @returns Topic inner XML string (title, links, markers)
   */
  private buildTopicContent(node: MarkdownNode, topicId: string): string {
    let xml = '';

    // Add title with optional SVG width attribute for long content
    if (node.content && node.content.length > 50) {
      xml += `<title svg:width="500">${this.escapeXml(node.content)}</title>`;
    } else {
      xml += `<title>${this.escapeXml(node.content)}</title>`;
    }

    // Add hyperlink if present
    if (this.options.includeLinks && node.links && node.links.length > 0) {
      const link = node.links[0];
      xml += `<xhtml:link xlink:href="${this.escapeXml(link.url)}"/>`;
    }

    return xml;
  }

  /**
   * Build topic attributes string
   * @returns Topic attributes string
   */
  private buildTopicAttributes(): string {
    return `modified-by="${this.options.author}" timestamp="${this.currentTimestamp}"`;
  }

  /**
   * Build children topics XML
   * @param children - Array of child nodes
   * @returns Children XML string
   */
  private buildChildren(children: MarkdownNode[]): string {
    return children
      .filter(child => !this.shouldSkip(child))
      .map(child => this.buildChildTopic(child))
      .join('');
  }

  /**
   * Build single child topic XML
   * @param node - Child node
   * @returns Child topic XML string
   */
  private buildChildTopic(node: MarkdownNode): string {
    const topicId = nanoid();
    let xml = `<topic id="${topicId}" ${this.buildTopicAttributes()}>`;

    // Add title/content
    xml += this.buildTopicContent(node, topicId);

    // Add children if present (wrapped in <children> tag)
    if (node.children && node.children.length > 0) {
      const filteredChildren = node.children.filter(c => !this.shouldSkip(c));
      if (filteredChildren.length > 0) {
        xml += `<children><topics type="attached">${this.buildChildren(filteredChildren)}</topics></children>`;
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
