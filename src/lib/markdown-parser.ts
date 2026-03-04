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
    let root: MarkdownNode;
    let startIndex = 0;

    // Find first h1 heading for root
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        root = {
          type: 'root',
          content: match[1],
          level: 0,
          children: [],
          line: i + 1,
        };
        // Parse links from root content
        this.parseLinks(root);
        root.content = this.extractLinks(root.content);
        startIndex = i + 1;
        break;
      }
    }

    // No h1 found, create default root
    if (!root) {
      root = {
        type: 'root',
        content: 'Mind Map',
        level: 0,
        children: [],
      };
    }

    // Parse each line and build tree
    const stack: MarkdownNode[] = [root];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const rawContent = this.options.preserveHeadingNumbers
          ? line
          : headingMatch[2];

        const node: MarkdownNode = {
          type: 'heading',
          content: rawContent,
          level,
          line: i + 1,
        };

        // Extract links from content
        this.parseLinks(node);
        node.content = this.extractLinks(node.content);

        // Find correct parent
        while (stack.length > 1 && (stack[stack.length - 1].level ?? 0) >= level) {
          stack.pop();
        }

        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        stack.push(node);
        continue;
      }

      // Check for list item
      const listMatch = line.match(/^[\*\-\+]\s+(.+)$/);
      if (listMatch && this.options.listsAsChildren) {
        const rawContent = listMatch[1];
        const node: MarkdownNode = {
          type: 'list',
          content: rawContent,
          line: i + 1,
        };

        // Extract links
        this.parseLinks(node);
        node.content = this.extractLinks(node.content);

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
