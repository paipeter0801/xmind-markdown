#!/usr/bin/env node
/**
 * 本地测试 XMind 转换
 * 使用与浏览器相同的 client-converter.ts 代码
 */

import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import fs from 'fs';

// Marker to emoji mapping (matches Python version)
const MARKER_MAP = {
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

// 从 client-converter.ts 复制的解析器类
class XmindParser {
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
      isArray: (name) => {
        return [
          'topic',
          'topics',
          'children',
          'marker-ref',
          'marker-refs',
          'sheet',
          'attachment',
          'hyperlink',
          'label',
          'labels',
          'notes',
          'plain-text',
          'rich-content',
        ].includes(name);
      },
    });
  }

  parseXML(xmlContent) {
    try {
      const parsed = this.parser.parse(xmlContent);

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
      throw new Error(`Failed to parse XML: ${error.message}`);
    }
  }

  extractTopicTree(content) {
    let rootTopic = content.topic;

    // Handle case where topic is an array (due to isArray config)
    if (Array.isArray(rootTopic)) {
      rootTopic = rootTopic[0];
    }

    if (!rootTopic) {
      throw new Error('No root topic found in XMind content');
    }

    return this.parseTopic(rootTopic, 0, undefined);
  }

  parseTopic(topic, level, parentId) {
    const id = topic['id'] || topic['@_id'] || this.generateId();
    const title = this.extractTitle(topic);

    // Parse children
    const children = [];
    if (topic.children) {
      let childrenArray = Array.isArray(topic.children) ? topic.children : [topic.children];

      for (const childContainer of childrenArray) {
        if (childContainer.topics) {
          let childTopics = Array.isArray(childContainer.topics)
            ? childContainer.topics
            : [childContainer.topics];

          // Handle nested arrays due to isArray config including "topics"
          if (childTopics.length === 1 && Array.isArray(childTopics[0])) {
            childTopics = childTopics[0];
          }

          for (const childTopicContainer of childTopics) {
            // Handle case where the element is {topic: [...], type: "attached"}
            if (childTopicContainer.topic && !childTopicContainer.id) {
              const topicArray = Array.isArray(childTopicContainer.topic)
                ? childTopicContainer.topic
                : [childTopicContainer.topic];
              for (const t of topicArray) {
                if (this.isValidTopic(t)) {
                  children.push(this.parseTopic(t, level + 1, id));
                }
              }
            } else if (this.isValidTopic(childTopicContainer)) {
              children.push(this.parseTopic(childTopicContainer, level + 1, id));
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

  extractTitle(topic) {
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

  extractMarkers(topic) {
    const markers = [];
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

  extractLinks(topic) {
    const links = [];
    const href = topic['href'] || topic['@_href'];
    if (href) {
      let type = 'url';
      if (href.startsWith('#')) {
        type = 'topic';
      } else if (href.startsWith('file://') || href.startsWith('./')) {
        type = 'file';
      }
      links.push({ href, type });
    }
    return links;
  }

  extractNotes(topic) {
    if (topic.notes?.['plain-text']) {
      return topic.notes['plain-text'];
    }
    return undefined;
  }

  extractLabels(topic) {
    const labels = [];
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

  extractAttachments(topic) {
    const attachments = [];
    if (topic['xhtml:img']) {
      const images = Array.isArray(topic['xhtml:img'])
        ? topic['xhtml:img']
        : [topic['xhtml:img']];
      for (const img of images) {
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

  isValidTopic(topic) {
    if (Array.isArray(topic)) {
      return topic.length > 0;
    }
    return true;
  }

  generateId() {
    return `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

function topicTreeToMarkdown(rootTopic) {
  const lines = [];

  // Root level processing starts from depth 1
  const rootText = sanitizeTitle(rootTopic.title);
  const rootEmoji = rootTopic.markers?.[0] ? `${rootTopic.markers[0]} ` : '';
  lines.push(`# ${rootEmoji}${rootText}`);
  lines.push('');

  // Convert children recursively (start at depth 2)
  if (rootTopic.children && rootTopic.children.length > 0) {
    for (const child of rootTopic.children) {
      convertTopic(child, lines, 2);
    }
  }

  return lines.join('\n');
}

function convertTopic(topic, lines, depth) {
  const text = sanitizeTitle(topic.title);
  const emoji = topic.markers?.[0] ? `${topic.markers[0]} ` : '';
  const hasChildren = topic.children && topic.children.length > 0;

  // Python logic:
  // depth 2: ## title
  // depth 3: ### title
  // depth 4+: - title (list format)

  if (depth === 2) {
    lines.push(`## ${emoji}${text}`);
    lines.push('');
  } else if (depth === 3) {
    lines.push(`### ${emoji}${text}`);
    if (!hasChildren) {
      lines.push('');
    }
  } else {
    // depth 4+ - list format
    const indent = '  '.repeat(depth - 4);
    if (hasChildren) {
      const cleanText = text.replace(/：$/g, '');
      lines.push(`${indent}- ${emoji}${cleanText}:`);
    } else {
      const cleanText = text.replace(/：$/g, '');
      lines.push(`${indent}- ${emoji}${cleanText}`);
    }
  }

  // Add notes if present
  if (topic.notes) {
    lines.push('');
    lines.push(`> ${topic.notes}`);
    lines.push('');
  }

  // Recursively process children
  if (topic.children && topic.children.length > 0) {
    for (const child of topic.children) {
      convertTopic(child, lines, depth + 1);
    }
  }
}

function sanitizeTitle(title) {
  let sanitized = title.trim().replace(/\s+/g, ' ');
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return sanitized;
}

function countTopics(topic) {
  let count = 1;
  if (topic.children) {
    for (const child of topic.children) {
      count += countTopics(child);
    }
  }
  return count;
}

function getMaxDepth(topic) {
  if (!topic.children || topic.children.length === 0) {
    return topic.level;
  }
  const childDepths = topic.children.map((child) => getMaxDepth(child));
  return Math.max(...childDepths);
}

// Main conversion function
async function convertXmindToMarkdown(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  // Find content.xml
  const contentPaths = ['content.xml', 'src/content.xml', 'META-INF/content.xml', 'content/content.xml'];
  let contentFile = null;
  for (const path of contentPaths) {
    contentFile = zip.file(path);
    if (contentFile) break;
  }

  if (!contentFile) {
    throw new Error('Could not find content.xml in XMind file');
  }

  const xmlContent = await contentFile.async('string');

  // Parse XML to topic tree
  const parser = new XmindParser();
  const rootTopic = parser.extractTopicTree(parser.parseXML(xmlContent));

  // Convert topic tree to markdown
  const markdown = topicTreeToMarkdown(rootTopic);

  return {
    success: true,
    content: markdown,
    stats: {
      totalTopics: countTopics(rootTopic),
      maxDepthReached: getMaxDepth(rootTopic),
      rootTopics: rootTopic.children?.length || 0,
    },
  };
}

// Run test
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node test-local.mjs <xmind-file>');
  process.exit(1);
}

const xmindFile = args[0];
console.log(`📂 Processing: ${xmindFile}`);

try {
  const result = await convertXmindToMarkdown(xmindFile);

  console.log('\n✅ Conversion successful!');
  console.log(`📊 Stats: ${result.stats.totalTopics} topics, max depth: ${result.stats.maxDepthReached}`);
  console.log('\n📄 Markdown output:');
  console.log('---');
  console.log(result.content);
  console.log('---');
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
