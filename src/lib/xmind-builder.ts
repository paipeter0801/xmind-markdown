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
