/**
 * Main XMind to Markdown Converter
 * Handles the complete conversion pipeline from XMind files to Markdown
 * @module converter
 */

import JSZip from 'jszip';
import { XmindParser, parseXmindXML } from './parser';
import { StatsCalculator } from './stats';
import type {
  ConversionOptions,
  ConversionResult,
  ConversionMetadata,
  XmindTopic,
  ConversionStats,
} from '../types/converter';

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS: ConversionOptions = {
  outputFormat: 'markdown',
  includeMetadata: false,
  includeIds: false,
  includeTimestamps: false,
  skipEmpty: true,
  preserveFormatting: false,
};

/**
 * Main converter class
 */
export class XmindToMarkdownConverter {
  private options: ConversionOptions;
  private parser: XmindParser;
  private statsCalculator: StatsCalculator;

  constructor(options?: Partial<ConversionOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.parser = new XmindParser();
    this.statsCalculator = new StatsCalculator();
  }

  /**
   * Convert an XMind file to Markdown
   * @param file - File object or ArrayBuffer
   * @param fileName - Optional file name for metadata
   * @returns Conversion result with markdown, stats, and metadata
   */
  async convert(file: File | ArrayBuffer, fileName?: string): Promise<ConversionResult> {
    const startTime = performance.now();

    try {
      // Extract content from XMind file (which is a ZIP archive)
      const xmlContent = await this.extractXmindContent(file);

      // Parse XML to topic tree
      const rootTopic = this.parser.extractTopicTree(
        this.parser.parseXML(xmlContent),
        this.options
      );

      // Convert topic tree to markdown
      const markdown = this.topicTreeToMarkdown(rootTopic);

      // Calculate statistics
      const stats = this.statsCalculator.calculateDetailedStats(rootTopic, startTime);

      // Build metadata
      const metadata = this.buildMetadata(fileName, stats);

      return {
        content: markdown,
        stats,
        metadata,
        success: true,
      };
    } catch (error) {
      return {
        content: '',
        stats: {
          totalTopics: 0,
          maxDepthReached: 0,
          rootTopics: 0,
          processingTime: performance.now() - startTime,
          markersProcessed: 0,
          attachmentsProcessed: 0,
          linksProcessed: 0,
          imagesProcessed: 0,
        },
        metadata: {
          sourceFile: fileName || 'unknown',
          sourceFormat: 'xmind',
          timestamp: new Date(),
          version: '1.0.0',
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Extract XML content from XMind file (ZIP archive)
   * @param file - File object or ArrayBuffer
   * @returns XML content string
   */
  private async extractXmindContent(file: File | ArrayBuffer): Promise<string> {
    let arrayBuffer: ArrayBuffer;

    if (file instanceof File) {
      arrayBuffer = await file.arrayBuffer();
    } else {
      arrayBuffer = file;
    }

    // Load ZIP archive
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find content.xml (try various paths)
    const contentPaths = [
      'content/content.xml',  // Standard XMind format
      'content.xml',
      'src/content.xml',
      'META-INF/content.xml',
    ];

    for (const path of contentPaths) {
      const contentFile = zip.file(path);
      if (contentFile) {
        return await contentFile.async('string');
      }
    }

    throw new Error('Could not find content.xml in XMind file');
  }

  /**
   * Convert topic tree to Markdown string
   * @param rootTopic - Root topic of the tree
   * @returns Markdown string
   */
  private topicTreeToMarkdown(rootTopic: XmindTopic): string {
    const lines: string[] = [];

    // Add header with root title
    lines.push(`# ${this.sanitizeTitle(rootTopic.title)}`);
    lines.push('');

    // Add metadata if requested
    if (this.options.includeMetadata) {
      lines.push('<!--');
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push(`Topics: ${this.countTopics(rootTopic)}`);
      lines.push(`Max Depth: ${this.getMaxDepth(rootTopic)}`);
      lines.push('-->');
      lines.push('');
    }

    // Convert children recursively
    if (rootTopic.children && rootTopic.children.length > 0) {
      for (const child of rootTopic.children) {
        this.convertTopic(child, lines, 2);
      }
    }

    return lines.join('\n');
  }

  /**
   * Recursively convert a topic to Markdown
   * @param topic - Topic to convert
   * @param lines - Array to append markdown lines to
   * @param depth - Current depth for heading level
   */
  private convertTopic(topic: XmindTopic, lines: string[], depth: number): void {
    const headingPrefix = '#'.repeat(Math.min(depth, 6));
    const title = this.sanitizeTitle(topic.title);

    // Build topic line with markers
    let topicLine = `${headingPrefix} ${title}`;

    // Add markers after title
    if (topic.markers && topic.markers.length > 0) {
      const markerStr = topic.markers.join(' ');
      topicLine += ` ${markerStr}`;
    }

    // Add ID if requested
    if (this.options.includeIds && topic.id) {
      topicLine += ` {: id="${topic.id}"}`;
    }

    lines.push(topicLine);

    // Add notes if present
    if (topic.notes) {
      lines.push('');
      lines.push('> ' + this.notesToBlockquote(topic.notes));
      lines.push('');
    }

    // Add labels if present
    if (topic.labels && topic.labels.length > 0) {
      const labelsStr = topic.labels.map(l => `\`${l}\``).join(' ');
      lines.push(`**Tags:** ${labelsStr}`);
      lines.push('');
    }

    // Add links if present
    if (topic.links && topic.links.length > 0) {
      for (const link of topic.links) {
        if (link.type === 'url' || link.type === 'file') {
          const linkTitle = link.title || link.href;
          lines.push(`🔗 [${linkTitle}](${link.href})`);
        }
      }
      if (topic.links.length > 0) {
        lines.push('');
      }
    }

    // Add attachments/images if present
    if (topic.attachments && topic.attachments.length > 0) {
      for (const attachment of topic.attachments) {
        if (attachment.type === 'image') {
          lines.push(`![${attachment.filename}](${attachment.path})`);
        } else {
          lines.push(`📎 [${attachment.filename}](${attachment.path})`);
        }
      }
      if (topic.attachments.length > 0) {
        lines.push('');
      }
    }

    // Add timestamp if requested
    if (this.options.includeTimestamps) {
      if (topic.createdAt || topic.modifiedAt) {
        const timeStrs: string[] = [];
        if (topic.createdAt) {
          timeStrs.push(`Created: ${topic.createdAt.toISOString()}`);
        }
        if (topic.modifiedAt) {
          timeStrs.push(`Modified: ${topic.modifiedAt.toISOString()}`);
        }
        lines.push(`*${timeStrs.join(' | ')}*`);
        lines.push('');
      }
    }

    // Recursively process children
    if (topic.children && topic.children.length > 0) {
      for (const child of topic.children) {
        this.convertTopic(child, lines, depth + 1);
      }
    }
  }

  /**
   * Sanitize topic title for Markdown
   * @param title - Raw title
   * @returns Sanitized title
   */
  private sanitizeTitle(title: string): string {
    // Remove excessive whitespace
    let sanitized = title.trim().replace(/\s+/g, ' ');

    // Escape special Markdown characters
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return sanitized;
  }

  /**
   * Convert notes content to blockquote format
   * @param notes - Notes content
   * @returns Formatted blockquote string
   */
  private notesToBlockquote(notes: string): string {
    // Split into lines and prefix each with >
    return notes
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n> ');
  }

  /**
   * Count total topics in tree
   * @param topic - Root topic
   * @returns Total count
   */
  private countTopics(topic: XmindTopic): number {
    let count = 1;
    if (topic.children) {
      for (const child of topic.children) {
        count += this.countTopics(child);
      }
    }
    return count;
  }

  /**
   * Get maximum depth of topic tree
   * @param topic - Root topic
   * @returns Maximum depth
   */
  private getMaxDepth(topic: XmindTopic): number {
    if (!topic.children || topic.children.length === 0) {
      return topic.level;
    }

    const childDepths = topic.children.map(child => this.getMaxDepth(child));
    return Math.max(...childDepths);
  }

  /**
   * Build conversion metadata
   * @param fileName - Source file name
   * @param stats - Conversion statistics
   * @returns Metadata object
   */
  private buildMetadata(fileName: string | undefined, stats: ConversionStats): ConversionMetadata {
    return {
      sourceFile: fileName || 'unknown.xmind',
      sourceFormat: 'xmind',
      timestamp: new Date(),
      version: '1.0.0',
    };
  }

  /**
   * Update converter options
   * @param options - New options (partial)
   */
  setOptions(options: Partial<ConversionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   * @returns Current options
   */
  getOptions(): ConversionOptions {
    return { ...this.options };
  }

  /**
   * Convert multiple XMind files in batch
   * @param files - Array of files or array buffers
   * @returns Array of conversion results
   */
  async convertBatch(files: Array<File | ArrayBuffer>): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const file of files) {
      const fileName = file instanceof File ? file.name : undefined;
      const result = await this.convert(file, fileName);
      results.push(result);
    }

    return results;
  }

  /**
   * Parse XML string directly to topic tree
   * @param xmlContent - XML string content
   * @returns Root topic
   */
  parseXML(xmlContent: string): XmindTopic {
    return parseXmindXML(xmlContent, this.options);
  }

  /**
   * Convert topic tree to markdown string
   * @param rootTopic - Root topic
   * @returns Markdown string
   */
  convertTopicTree(rootTopic: XmindTopic): string {
    return this.topicTreeToMarkdown(rootTopic);
  }
}

/**
 * Convert XMind file to Markdown
 * Convenience function for one-shot conversion
 * @param file - File object or ArrayBuffer
 * @param options - Optional conversion options
 * @returns Conversion result
 */
export async function convertXmindToMarkdown(
  file: File | ArrayBuffer,
  options?: Partial<ConversionOptions>
): Promise<ConversionResult> {
  const converter = new XmindToMarkdownConverter(options);
  const fileName = file instanceof File ? file.name : undefined;
  return converter.convert(file, fileName);
}

/**
 * Convert XMind file with custom output format
 * @param file - File object or ArrayBuffer
 * @param format - Output format
 * @returns Conversion result
 */
export async function convertXmind(
  file: File | ArrayBuffer,
  format: 'markdown' | 'html' | 'json' = 'markdown'
): Promise<ConversionResult> {
  return convertXmindToMarkdown(file, { outputFormat: format });
}

/**
 * Parse XMind XML string to topic tree
 * @param xmlContent - XML string
 * @param options - Optional conversion options
 * @returns Root topic
 */
export function parseXmindContent(
  xmlContent: string,
  options?: Partial<ConversionOptions>
): XmindTopic {
  const converter = new XmindToMarkdownConverter(options);
  return converter.parseXML(xmlContent);
}

/**
 * Convert topic tree to markdown
 * @param rootTopic - Root topic
 * @param options - Optional conversion options
 * @returns Markdown string
 */
export function topicTreeToMarkdown(
  rootTopic: XmindTopic,
  options?: Partial<ConversionOptions>
): string {
  const converter = new XmindToMarkdownConverter(options);
  return converter.convertTopicTree(rootTopic);
}

export default XmindToMarkdownConverter;
