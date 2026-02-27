/**
 * XML Parser for XMind format
 * Handles parsing of XMind content.xml files using fast-xml-parser
 * @module parser
 */

import { XMLParser } from 'fast-xml-parser';
import type { XmindTopic, ConversionOptions } from '../types/converter';

/**
 * Default parser options for XMind format
 */
const DEFAULT_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  ignoreDeclaration: true,
  ignorePiTags: true,
  trimValues: true,
  parseAttributeValue: true,
  parseTagValue: true,
  isArray: (name: string) => {
    return [
      'topic',
      'topics',
      'children',
      'marker-ref',
      'marker-refs',
      'attachment',
      'hyperlink',
      'label',
      'notes',
      'plain-text',
      'rich-content',
    ].includes(name);
  },
};

/**
 * Default XMind marker mappings
 */
const DEFAULT_MARKERS: Record<string, string> = {
  // Priority markers
  'priority-1': '🔴',
  'priority-2': '🟠',
  'priority-3': '🟡',
  'priority-4': '🟢',
  'priority-5': '🔵',
  'priority-6': '⚪',
  // Task markers
  'task-start': '▶',
  'task-half': '◐',
  'task-done': '◼',
  'task-overtime': '⏰',
  // Flag markers
  'flag-red': '🚩',
  'flag-orange': '🏳',
  'flag-yellow': '🏴',
  // Smile markers
  'smile-laugh': '😂',
  'smile-think': '🤔',
  'smile-angry': '😠',
  'smile-cry': '😢',
  'smile-cool': '😎',
  // Symbol markers
  'symbol-ok': '✓',
  'symbol-wrong': '✗',
  'symbol-question': '?',
  'symbol-wait': '⌛',
  'symbol-idea': '💡',
  'symbol-important': '❗',
  'symbol-note': '📝',
  // Arrow markers
  'arrow-up': '↑',
  'arrow-down': '↓',
  'arrow-left': '←',
  'arrow-right': '→',
  'month-1': '📅',
  'month-2': '📅',
  'month-3': '📅',
  'month-4': '📅',
  'month-5': '📅',
  'month-6': '📅',
  'month-7': '📅',
  'month-8': '📅',
  'month-9': '📅',
  'month-10': '📅',
  'month-11': '📅',
  'month-12': '📅',
  'week-1': '📆',
  'week-2': '📆',
  'week-3': '📆',
  'week-4': '📆',
};

/**
 * Parsed XMind content structure
 */
interface ParsedXmindContent {
  /** Sheet identifier */
  id?: string;
  /** Root topic */
  topic?: ParsedTopic;
  /** Sheet title */
  title?: string;
}

/**
 * Parsed topic structure from XML
 */
interface ParsedTopic {
  /** Topic ID */
  '@_id'?: string;
  /** Topic title/text */
  title?: string;
  /** Child topics */
  children?: {
    topics?: ParsedTopic[];
  };
  /** Marker references */
  'marker-refs'?: {
    'marker-ref'?: Array<{ '@_marker-id': string }>;
  };
  /** Hyperlink reference */
  '@_href'?: string;
  /** Notes content */
  notes?: {
    'plain-text'?: string;
    'rich-content'?: unknown;
  };
  /** Labels */
  'labels'?: {
    'label'?: string[];
  };
  /** Attachments */
  'xhtml:img'?: Array<{
    '@_src'?: string;
    '@_width'?: string;
    '@_height'?: string;
  }>;
  /** Position */
  position?: {
    '@_x'?: string;
    '@_y'?: string;
  };
  /** Style information */
  style?: unknown;
}

/**
 * Parser class for XMind XML content
 */
export class XmindParser {
  private parser: XMLParser;
  private markerMap: Record<string, string>;

  constructor(customMarkers?: Record<string, string>) {
    this.parser = new XMLParser(DEFAULT_PARSER_OPTIONS);
    this.markerMap = { ...DEFAULT_MARKERS, ...customMarkers };
  }

  /**
   * Parse XML content string to JavaScript object
   * @param xmlContent - XML string content
   * @returns Parsed XMind content structure
   */
  parseXML(xmlContent: string): ParsedXmindContent {
    try {
      const parsed = this.parser.parse(xmlContent);

      // Handle different XMind formats

      // Standard XMind format: xmap-content -> sheet
      if (parsed['xmap-content']?.sheet) {
        return parsed['xmap-content'].sheet;
      }

      // Direct sheet format
      if (parsed.sheet) {
        return parsed.sheet;
      }

      // Multiple sheets format
      if (parsed.sheets && Array.isArray(parsed.sheets.sheet)) {
        return parsed.sheets.sheet[0];
      }

      // Map format
      if (parsed.map) {
        return parsed.map;
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract topic tree from parsed XMind content
   * @param content - Parsed XMind content
   * @param options - Conversion options
   * @returns Root XmindTopic with full tree
   */
  extractTopicTree(content: ParsedXmindContent, options?: ConversionOptions): XmindTopic {
    const rootTopic = content.topic;

    if (!rootTopic) {
      throw new Error('No root topic found in XMind content');
    }

    return this.parseTopic(rootTopic, 0, undefined, options);
  }

  /**
   * Recursively parse a topic and its children
   * @param topic - Parsed topic from XML
   * @param level - Current depth level
   * @param parentId - Parent topic ID
   * @param options - Conversion options
   * @returns Parsed XmindTopic
   */
  private parseTopic(
    topic: ParsedTopic,
    level: number,
    parentId: string | undefined,
    options?: ConversionOptions
  ): XmindTopic {
    const id = topic['@_id'] || this.generateId();
    const title = this.extractTitle(topic);

    // Parse children
    const children: XmindTopic[] = [];
    if (topic.children?.topics && (!options?.maxDepth || level < options.maxDepth)) {
      const childTopics = Array.isArray(topic.children.topics)
        ? topic.children.topics
        : [topic.children.topics];

      for (const childTopic of childTopics) {
        if (this.isValidTopic(childTopic)) {
          children.push(this.parseTopic(childTopic, level + 1, id, options));
        }
      }
    }

    // Parse markers
    const markers = this.extractMarkers(topic);

    // Parse hyperlink
    const links = this.extractLinks(topic);

    // Parse notes
    const notes = this.extractNotes(topic);

    // Parse labels
    const labels = this.extractLabels(topic);

    // Parse attachments/images
    const attachments = this.extractAttachments(topic);

    // Parse position
    const position = this.extractPosition(topic);

    return {
      id,
      title,
      level,
      parentId,
      children: children.length > 0 ? children : undefined,
      markers: markers.length > 0 ? markers : undefined,
      links: links.length > 0 ? links : undefined,
      notes,
      labels: labels.length > 0 ? labels : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      position,
    };
  }

  /**
   * Extract title from topic
   * @param topic - Parsed topic
   * @returns Topic title
   */
  private extractTitle(topic: ParsedTopic): string {
    if (topic.title) {
      return topic.title;
    }

    // Handle case where title is in #text node
    if ((topic as unknown as Record<string, unknown>)['#text']) {
      return String((topic as unknown as Record<string, unknown>)['#text']);
    }

    return 'Untitled Topic';
  }

  /**
   * Extract marker symbols from topic
   * @param topic - Parsed topic
   * @returns Array of marker symbols
   */
  private extractMarkers(topic: ParsedTopic): string[] {
    const markers: string[] = [];

    if (topic['marker-refs']?.['marker-ref']) {
      const markerRefs = Array.isArray(topic['marker-refs']['marker-ref'])
        ? topic['marker-refs']['marker-ref']
        : [topic['marker-refs']['marker-ref']];

      for (const ref of markerRefs) {
        const markerId = ref['@_marker-id'];
        if (markerId && this.markerMap[markerId]) {
          markers.push(this.markerMap[markerId]);
        } else if (markerId) {
          // Include unknown marker IDs as-is
          markers.push(`[${markerId}]`);
        }
      }
    }

    return markers;
  }

  /**
   * Extract hyperlink from topic
   * @param topic - Parsed topic
   * @returns Array of topic links
   */
  private extractLinks(topic: ParsedTopic): Array<{ href: string; type: 'url' | 'file' | 'topic'; title?: string }> {
    const links: Array<{ href: string; type: 'url' | 'file' | 'topic'; title?: string }> = [];

    if (topic['@_href']) {
      const href = topic['@_href'];
      let type: 'url' | 'file' | 'topic' = 'url';

      if (href.startsWith('#')) {
        type = 'topic';
      } else if (href.startsWith('file://') || href.startsWith('./')) {
        type = 'file';
      }

      links.push({ href, type });
    }

    return links;
  }

  /**
   * Extract notes from topic
   * @param topic - Parsed topic
   * @returns Notes content or undefined
   */
  private extractNotes(topic: ParsedTopic): string | undefined {
    if (topic.notes?.['plain-text']) {
      return topic.notes['plain-text'];
    }
    return undefined;
  }

  /**
   * Extract labels from topic
   * @param topic - Parsed topic
   * @returns Array of label strings
   */
  private extractLabels(topic: ParsedTopic): string[] {
    const labels: string[] = [];

    if (topic.labels?.label) {
      const labelArray = Array.isArray(topic.labels.label)
        ? topic.labels.label
        : [topic.labels.label];

      for (const label of labelArray) {
        if (typeof label === 'string') {
          labels.push(label);
        }
      }
    }

    return labels;
  }

  /**
   * Extract attachments/images from topic
   * @param topic - Parsed topic
   * @returns Array of attachments
   */
  private extractAttachments(topic: ParsedTopic): Array<{
    filename: string;
    mimeType: string;
    size: number;
    path: string;
    type: 'file' | 'image' | 'video';
  }> {
    const attachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      path: string;
      type: 'file' | 'image' | 'video';
    }> = [];

    if (topic['xhtml:img']) {
      const images = Array.isArray(topic['xhtml:img'])
        ? topic['xhtml:img']
        : [topic['xhtml:img']];

      for (const img of images) {
        const src = img['@_src'];
        if (src) {
          attachments.push({
            filename: src.split('/').pop() || 'image',
            mimeType: this.getMimeTypeFromSrc(src),
            size: 0,
            path: src,
            type: 'image',
          });
        }
      }
    }

    return attachments;
  }

  /**
   * Extract position from topic
   * @param topic - Parsed topic
   * @returns Position object or undefined
   */
  private extractPosition(topic: ParsedTopic): { x: number; y: number } | undefined {
    if (topic.position) {
      return {
        x: parseInt(topic.position['@_x'] || '0', 10),
        y: parseInt(topic.position['@_y'] || '0', 10),
      };
    }
    return undefined;
  }

  /**
   * Get MIME type from image source
   * @param src - Image source path
   * @returns MIME type string
   */
  private getMimeTypeFromSrc(src: string): string {
    const ext = src.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      bmp: 'image/bmp',
    };

    return mimeTypes[ext || ''] || 'image/jpeg';
  }

  /**
   * Check if topic is valid (has content)
   * @param topic - Parsed topic
   * @returns True if topic is valid
   */
  private isValidTopic(topic: ParsedTopic | ParsedTopic[]): topic is ParsedTopic {
    if (Array.isArray(topic)) {
      return topic.length > 0;
    }
    return true;
  }

  /**
   * Generate unique ID for topics without IDs
   * @returns Generated ID string
   */
  private generateId(): string {
    return `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update marker mappings
   * @param markers - Custom marker mappings
   */
  setMarkerMap(markers: Record<string, string>): void {
    this.markerMap = { ...DEFAULT_MARKERS, ...markers };
  }

  /**
   * Get current marker mappings
   * @returns Current marker map
   */
  getMarkerMap(): Record<string, string> {
    return { ...this.markerMap };
  }
}

/**
 * Parse XMind XML content to topic tree
 * Convenience function for one-shot parsing
 * @param xmlContent - XML string content
 * @param options - Conversion options
 * @param customMarkers - Custom marker mappings
 * @returns Root XmindTopic
 */
export function parseXmindXML(
  xmlContent: string,
  options?: ConversionOptions,
  customMarkers?: Record<string, string>
): XmindTopic {
  const parser = new XmindParser(customMarkers);
  const content = parser.parseXML(xmlContent);
  return parser.extractTopicTree(content, options);
}

/**
 * Parse XMind XML content with full metadata
 * @param xmlContent - XML string content
 * @param options - Conversion options
 * @param customMarkers - Custom marker mappings
 * @returns Object with root topic and parser metadata
 */
export function parseXmindXMLWithMeta(
  xmlContent: string,
  options?: ConversionOptions,
  customMarkers?: Record<string, string>
): { root: XmindTopic; markers: Record<string, string> } {
  const parser = new XmindParser(customMarkers);
  const content = parser.parseXML(xmlContent);
  const root = parser.extractTopicTree(content, options);

  return {
    root,
    markers: parser.getMarkerMap(),
  };
}

export default XmindParser;
