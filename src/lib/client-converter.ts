/**
 * Client-side XMind to Markdown Converter
 * This module bundles all conversion logic for browser use
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// Marker to emoji mapping (matches Python version)
const MARKER_MAP: Record<string, string> = {
  // Priority markers
  'priority-1': '🔴',
  'priority-2': '🟠',
  'priority-3': '🟡',
  'priority-4': '🔵',
  'priority-5': '⚪',
  'priority-6': '🟣',
  // Symbol markers
  'flag': '🚩',
  'smile': '😊',
  'frown': '☹️',
  'star': '⭐',
  'check': '✅',
  'cross': '❌',
  'question': '❓',
  'exclamation': '❗',
  'arrow-right': '➡️',
  'arrow-left': '⬅️',
  'arrow-up': '⬆️',
  'arrow-down': '⬇️',
  'plus': '➕',
  'minus': '➖',
  // Task markers
  'task-start': '▶️',
  'task-done': '✅',
  'task-half': '🔶',
  'task-wait': '⏸️',
  'task-review': '👁️',
  // Progress markers
  'progress-0': '⬜',
  'progress-1': '🟩',
  'progress-2': '🟩🟩',
  'progress-3': '🟩🟩🟩',
  'progress-4': '🟩🟩🟩🟩',
  'progress-5': '🟩🟩🟩🟩🟩',
};

// Types
export interface XmindTopic {
  id: string;
  title: string;
  level: number;
  parentId?: string;
  children?: XmindTopic[];
  markers?: string[];
  links?: Array<{ href: string; type: string; title?: string }>;
  notes?: string;
  labels?: string[];
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    path: string;
    type: string;
  }>;
}

export interface ConversionResult {
  content: string;
  stats: ConversionStats;
  metadata: ConversionMetadata;
  success: boolean;
  error?: string;
  /** 解析出的主題樹，供樹狀預覽使用（XMind→MD 時存在） */
  tree?: XmindTopic;
}

export interface ConversionStats {
  totalTopics: number;
  maxDepthReached: number;
  rootTopics: number;
  processingTime: number;
  markersProcessed: number;
  attachmentsProcessed: number;
  linksProcessed: number;
  imagesProcessed: number;
}

export interface ConversionMetadata {
  sourceFile: string;
  sourceFormat: string;
  timestamp: Date;
  version: string;
}

export interface ConversionOptions {
  outputFormat?: 'markdown' | 'html' | 'json';
  includeMetadata?: boolean;
  includeIds?: boolean;
  includeTimestamps?: boolean;
  skipEmpty?: boolean;
  preserveFormatting?: boolean;
  maxDepth?: number;
  /** XMind→MD 匯出模式：outline=全巢狀 bullet（任意深度、無損往返預設）；headings=h1-h6+深層 bullet（文件感，深度>6 非無損） */
  exportMode?: 'outline' | 'headings';
}

// Parser class
class XmindParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '', // 不使用前綴，直接使用原始屬性名
      textNodeName: '#text',
      ignoreDeclaration: true,
      ignorePiTags: true,
      trimValues: true,
      parseAttributeValue: false, // 關閉以避免問題
      parseTagValue: false,
      isArray: (name: string) => {
        // 注意：容器元素（marker-refs / labels / notes）保持「單一物件」，
        // 只讓內部可重複的子元素（marker-ref / label / plain-text）為陣列，
        // 才能與 extractMarkers/extractLabels/extractNotes 的存取形狀一致。
        return [
          'topic',
          'topics',
          'children',
          'marker-ref',
          'sheet',
          'attachment',
          'hyperlink',
          'label',
          'plain-text',
          'rich-content',
        ].includes(name);
      },
    });
  }

  parseXML(xmlContent: string): any {
    try {
      const parsed = this.parser.parse(xmlContent);

      // Handle different XMind formats

      // Standard XMind format: xmap-content -> sheet
      if (parsed['xmap-content']?.sheet) {
        const sheet = parsed['xmap-content'].sheet;
        return Array.isArray(sheet) ? sheet[0] : sheet;
      }

      // Direct sheet format
      if (parsed.sheet) {
        const sheet = parsed.sheet;
        return Array.isArray(sheet) ? sheet[0] : sheet;
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

  extractTopicTree(content: any, options?: ConversionOptions): XmindTopic {
    let rootTopic = content.topic;

    // Handle case where topic is an array (due to isArray config)
    if (Array.isArray(rootTopic)) {
      rootTopic = rootTopic[0];
    }

    if (!rootTopic) {
      throw new Error('No root topic found in XMind content');
    }

    return this.parseTopic(rootTopic, 0, undefined, options);
  }

  private parseTopic(
    topic: any,
    level: number,
    parentId: string | undefined,
    options?: ConversionOptions
  ): XmindTopic {
    // 支持帶或不帶前綴的 id 屬性
    const id = topic['id'] || topic['@_id'] || this.generateId();
    const title = this.extractTitle(topic);

    // Parse children
    const children: XmindTopic[] = [];
    if (topic.children && (!options?.maxDepth || level < options.maxDepth)) {
      // Handle children being an array due to isArray config
      let childrenArray = Array.isArray(topic.children) ? topic.children : [topic.children];

      for (const childContainer of childrenArray) {
        if (childContainer.topics) {
          let childTopics = Array.isArray(childContainer.topics)
            ? childContainer.topics
            : [childContainer.topics];

          // Handle nested arrays due to isArray config including "topics"
          // topics might be [[{...}, {...}]] instead of [{...}, {...}]
          if (childTopics.length === 1 && Array.isArray(childTopics[0])) {
            childTopics = childTopics[0];
          }

          for (const childTopicContainer of childTopics) {
            // Handle case where the element is {topic: [...], type: "attached"}
            // Extract the actual topic array
            if (childTopicContainer.topic && !childTopicContainer.id) {
              const topicArray = Array.isArray(childTopicContainer.topic)
                ? childTopicContainer.topic
                : [childTopicContainer.topic];
              for (const t of topicArray) {
                if (this.isValidTopic(t)) {
                  children.push(this.parseTopic(t, level + 1, id, options));
                }
              }
            } else if (this.isValidTopic(childTopicContainer)) {
              children.push(this.parseTopic(childTopicContainer, level + 1, id, options));
            }
          }
        }
      }
    }

    return {
      id,
      title,
      level,
      parentId,
      children: children.length > 0 ? children : undefined,
      markers: this.extractMarkers(topic),
      links: this.extractLinks(topic),
      notes: this.extractNotes(topic),
      labels: this.extractLabels(topic),
      attachments: this.extractAttachments(topic),
    };
  }

  private extractTitle(topic: any): string {
    if (topic.title) {
      // Handle both string and {#text: "..."} formats
      if (typeof topic.title === 'string') {
        return topic.title;
      }
      if (topic.title['#text']) {
        return String(topic.title['#text']);
      }
    }
    if (topic['#text']) {
      return String(topic['#text']);
    }
    return 'Untitled Topic';
  }

  private extractMarkers(topic: any): string[] {
    const markers: string[] = [];
    if (topic['marker-refs']?.['marker-ref']) {
      const markerRefs = Array.isArray(topic['marker-refs']['marker-ref'])
        ? topic['marker-refs']['marker-ref']
        : [topic['marker-refs']['marker-ref']];
      for (const ref of markerRefs) {
        // 支持帶或不帶前綴的 marker-id 屬性
        const markerId = ref['marker-id'] || ref['@_marker-id'] || ref['id'] || '';
        // Map marker ID to emoji, fallback to the ID itself if not found
        const emoji = MARKER_MAP[markerId] || markerId;
        if (emoji) {
          markers.push(emoji);
        }
      }
    }
    return markers;
  }

  private extractLinks(topic: any): Array<{ href: string; type: string; title?: string }> {
    const links: Array<{ href: string; type: string; title?: string }> = [];
    // 支援：topic 屬性 href / xlink:href，或子元素 <xhtml:link xlink:href="...">（builder 產出的形式）
    const linkEl = topic['xhtml:link'];
    const href =
      topic['href'] ||
      topic['xlink:href'] ||
      topic['@_href'] ||
      linkEl?.['xlink:href'] ||
      linkEl?.['href'];
    if (href) {
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

  private extractNotes(topic: any): string | undefined {
    const pt = topic.notes?.['plain-text'];
    if (pt === undefined || pt === null) return undefined;
    // plain-text 在 isArray 名單中 → 一律為陣列；多行還原為換行
    return Array.isArray(pt) ? pt.join('\n') : String(pt);
  }

  private extractLabels(topic: any): string[] {
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

  private extractAttachments(topic: any): Array<{
    filename: string;
    mimeType: string;
    size: number;
    path: string;
    type: string;
  }> {
    const attachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      path: string;
      type: string;
    }> = [];

    if (topic['xhtml:img']) {
      const images = Array.isArray(topic['xhtml:img'])
        ? topic['xhtml:img']
        : [topic['xhtml:img']];

      for (const img of images) {
        // 支持帶或不帶前綴的 src 屬性
        const src = img['src'] || img['@_src'];
        if (src) {
          attachments.push({
            filename: src.split('/').pop() || 'image',
            mimeType: 'image/jpeg',
            size: 0,
            path: src,
            type: 'image',
          });
        }
      }
    }

    return attachments;
  }

  private isValidTopic(topic: any): boolean {
    if (Array.isArray(topic)) {
      return topic.length > 0;
    }
    return true;
  }

  private generateId(): string {
    return `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Main converter function
export async function convertXmindToMarkdown(
  file: File | ArrayBuffer,
  fileName?: string,
  options?: ConversionOptions
): Promise<ConversionResult> {
  const startTime = performance.now();
  const opts = {
    includeMetadata: true,
    includeIds: false,
    includeTimestamps: false,
    skipEmpty: true,
    preserveFormatting: true,
    ...options,
  };

  try {
    // Extract content from XMind file (ZIP archive)
    const xmlContent = await extractXmindContent(file);

    // Parse XML to topic tree
    const parser = new XmindParser();
    const rootTopic = parser.extractTopicTree(parser.parseXML(xmlContent), opts);

    // Convert topic tree to markdown
    const markdown = topicTreeToMarkdown(rootTopic, opts);

    // Calculate statistics
    const stats = calculateStats(rootTopic, startTime);

    // Build metadata
    const metadata = {
      sourceFile: fileName || 'unknown.xmind',
      sourceFormat: 'xmind',
      timestamp: new Date(),
      version: '1.0.0',
    };

    return {
      content: markdown,
      stats,
      metadata,
      success: true,
      tree: rootTopic,
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

async function extractXmindContent(file: File | ArrayBuffer): Promise<string> {
  let arrayBuffer: ArrayBuffer;

  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  // Load ZIP archive
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find content.xml (try various paths)
  const contentPaths = ['content.xml', 'src/content.xml', 'META-INF/content.xml', 'content/content.xml'];

  for (const path of contentPaths) {
    const contentFile = zip.file(path);
    if (contentFile) {
      return await contentFile.async('string');
    }
  }

  throw new Error('Could not find content.xml in XMind file');
}

function topicTreeToMarkdown(rootTopic: XmindTopic, options: ConversionOptions): string {
  const mode = options.exportMode ?? 'outline';
  const lines: string[] = [];

  // Root 永遠是 h1（兩種模式皆然，供匯入端識別根）
  lines.push(`# ${richTitle(rootTopic)}${noteComment(rootTopic)}`);
  lines.push('');
  emitRichBody(rootTopic, '  ', lines); // root 的圖片置於根下方

  if (options.includeMetadata) {
    lines.push('<!--');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Topics: ${countTopics(rootTopic)}`);
    lines.push(`Max Depth: ${getMaxDepth(rootTopic)}`);
    lines.push('-->');
    lines.push('');
  }

  if (rootTopic.children && rootTopic.children.length > 0) {
    for (const child of rootTopic.children) {
      emitTopic(child, 1, lines, mode);
    }
  }

  return lines.join('\n');
}

/**
 * 主題的「富標題」：{markers} {title}{inline link}{ #labels}。
 * 與 markdown-parser 的匯入契約對稱（marker emojis / [text](url) / #tag 皆可逆解析）。
 */
function richTitle(topic: XmindTopic): string {
  const emoji = topic.markers && topic.markers.length > 0 ? `${topic.markers.join(' ')} ` : '';
  let title = sanitizeTitle(topic.title);
  const link = topic.links?.find((l) => l.type === 'url' || l.type === 'file');
  if (link) title = `[${title}](${link.href})`;
  const tags =
    topic.labels && topic.labels.length > 0
      ? ' ' + topic.labels.map((l) => '#' + l.replace(/\s+/g, '_')).join(' ')
      : '';
  return `${emoji}${title}${tags}`;
}

/**
 * 備註以「行內 HTML 註解」附在主題同一行：` <!-- note: {text} -->`。
 * 不使用 `📝 ` 子 bullet（會和使用者以 📝 為 bullet 裝飾的真實內容碰撞而被吞掉）。
 * HTML 註解不會被渲染、不會被當成節點，往返無碰撞；`--` 暫換為 `—` 避免提前結束註解。
 */
function noteComment(topic: XmindTopic): string {
  if (!topic.notes) return '';
  const note = topic.notes.replace(/\r?\n+/g, ' ').replace(/--/g, '—').trim();
  return note ? ` <!-- note: ${note} -->` : '';
}

/**
 * 在主題下方（childIndent）輸出圖片／附件（以子 bullet 編碼；二進位內容仍需 .xmind）。
 */
function emitRichBody(topic: XmindTopic, childIndent: string, lines: string[]): void {
  if (topic.attachments && topic.attachments.length > 0) {
    for (const a of topic.attachments) {
      if (a.type === 'image') lines.push(`${childIndent}- ![${a.filename}](${a.path})`);
      else lines.push(`${childIndent}- 📎 [${a.filename}](${a.path})`);
    }
  }
}

/**
 * 遞迴輸出主題。
 * outline（預設/無損往返）：root 後所有後代為縮排巢狀 bullet（indent = 2*(depth-1)），任意深度無斷崖。
 * headings：depth 1-5 → h2-h6；depth 6+ → 巢狀 bullet（非完全無損，文件感用）。
 */
function emitTopic(topic: XmindTopic, depth: number, lines: string[], mode: 'outline' | 'headings'): void {
  if (mode === 'headings' && depth <= 5) {
    const hashes = '#'.repeat(depth + 1); // depth1→h2 ... depth5→h6
    lines.push(`${hashes} ${richTitle(topic)}${noteComment(topic)}`);
    emitRichBody(topic, '  ', lines);
    for (const child of topic.children ?? []) emitTopic(child, depth + 1, lines, mode);
  } else {
    const indent = '  '.repeat(Math.max(0, depth - 1)); // outline: depth1→0；headings depth6+→0
    lines.push(`${indent}- ${richTitle(topic)}${noteComment(topic)}`);
    emitRichBody(topic, indent + '  ', lines);
    for (const child of topic.children ?? []) emitTopic(child, depth + 1, lines, mode);
  }
}

function sanitizeTitle(title: string): string {
  let sanitized = title.trim().replace(/\s+/g, ' ');
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return sanitized;
}

function notesToBlockquote(notes: string): string {
  return notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n> ');
}

function countTopics(topic: XmindTopic): number {
  let count = 1;
  if (topic.children) {
    for (const child of topic.children) {
      count += countTopics(child);
    }
  }
  return count;
}

function getMaxDepth(topic: XmindTopic): number {
  if (!topic.children || topic.children.length === 0) {
    return topic.level;
  }
  const childDepths = topic.children.map((child) => getMaxDepth(child));
  return Math.max(...childDepths);
}

function calculateStats(rootTopic: XmindTopic, startTime: number): ConversionStats {
  let totalTopics = 0;
  let maxDepth = 0;
  let markersProcessed = 0;
  let attachmentsProcessed = 0;
  let linksProcessed = 0;
  let imagesProcessed = 0;

  function traverse(topic: XmindTopic) {
    totalTopics++;
    maxDepth = Math.max(maxDepth, topic.level);
    if (topic.markers) markersProcessed += topic.markers.length;
    if (topic.attachments) {
      attachmentsProcessed += topic.attachments.length;
      imagesProcessed += topic.attachments.filter((a) => a.type === 'image').length;
    }
    if (topic.links) linksProcessed += topic.links.length;

    if (topic.children) {
      for (const child of topic.children) {
        traverse(child);
      }
    }
  }

  traverse(rootTopic);

  return {
    totalTopics,
    maxDepthReached: maxDepth,
    rootTopics: rootTopic.children?.length || 0,
    processingTime: performance.now() - startTime,
    markersProcessed,
    attachmentsProcessed,
    linksProcessed,
    imagesProcessed,
  };
}

// convertXmindToMarkdown 為具名匯出，由 Converter.svelte 直接 import，
// 經 Vite 打包後自動產生 content-hash，不再需要手動 ?v= 快取戳記。

