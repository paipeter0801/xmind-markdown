/**
 * Markdown Parser for Structure Extraction（無損往返版）
 *
 * 與 client-converter.ts 的 outline 匯出對稱：
 * - root = `# 標題`；後代 = 縮排巢狀 bullet（2 空格 = 一層深度）。
 * - 富資料還原：leading emoji→markers、`[text](url)`→links、`#tag`→labels、
 *   `📝 ` 子 bullet→父節點備註、`![](path)` 子 bullet→父節點圖片附件。
 *
 * 已知限制：標題模式（headings）匯出的文件再匯入為 best-effort（深度>6 非完全無損）。
 */
import type { MarkdownNode } from '../types/converter';
import { extractLeadingEmojis } from './markers';

interface ParserOptions {
  listsAsChildren?: boolean;
  preserveHeadingNumbers?: boolean;
}

/** 把一行主體解析成 {title, markers, links, labels}（與匯出 richTitle 對稱）。 */
function parseRich(raw: string): {
  title: string;
  markers: string[];
  links: Array<{ text: string; url: string }>;
  labels: string[];
} {
  const { ids: markers, rest: r1 } = extractLeadingEmojis(raw);
  let rest = r1;
  const labels: string[] = [];
  // 結尾 #tag（空格分隔；底線還原為空白）
  rest = rest.replace(/(?:\s|^)(#[^\s#]+)/g, (_m, tag: string) => {
    labels.push(tag.slice(1).replace(/_/g, ' '));
    return '';
  });
  const links: Array<{ text: string; url: string }> = [];
  // 內嵌連結 [text](url) → 還原為 text，並記錄連結
  rest = rest.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t: string, u: string) => {
    links.push({ text: t, url: u });
    return t;
  });
  return { title: rest.trim(), markers, links, labels };
}

const NOTE_SENTINEL = '📝';
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

export class MarkdownParser {
  private options: ParserOptions;

  constructor(options?: ParserOptions) {
    this.options = { listsAsChildren: true, preserveHeadingNumbers: false, ...options };
  }

  parse(markdown: string): MarkdownNode {
    const lines = markdown.split('\n');
    let root: MarkdownNode | undefined;
    let startIndex = 0;

    // Find first h1 for root
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].trim().match(/^#\s+(.+)$/);
      if (m) {
        const rich = parseRich(m[1]);
        root = { type: 'root', content: rich.title, level: 0, children: [], line: i + 1 };
        if (rich.markers.length) root.markers = rich.markers;
        if (rich.links.length) root.links = rich.links;
        if (rich.labels.length) root.labels = rich.labels;
        startIndex = i + 1;
        break;
      }
    }
    if (!root) {
      root = { type: 'root', content: 'Mind Map', level: 0, children: [] };
    }

    // stack of {node, indent}：indent 為該節點的「帶狀縮排（leading spaces）」
    const stack: { node: MarkdownNode; indent: number }[] = [{ node: root, indent: -1 }];

    const attachRichBody = (parent: MarkdownNode, body: MarkdownNode) => {
      // 📝 note child → 父節點備註
      if (body.content.startsWith(NOTE_SENTINEL + ' ')) {
        const noteLine = body.content.slice(NOTE_SENTINEL.length + 1).trim();
        parent.notes = parent.notes ? parent.notes + '\n' + noteLine : noteLine;
        return true;
      }
      // image child → 父節點附件
      const img = body.content.match(IMAGE_RE);
      if (img) {
        if (!parent.attachments) parent.attachments = [];
        const path = img[2];
        parent.attachments.push({ filename: img[1] || path.split('/').pop() || 'image', path, type: 'image' });
        return true;
      }
      return false;
    };

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      // 略過 metadata HTML 註解與單行註解
      if (/^\s*<!--/.test(line) || /^\s*-->/.test(line)) continue;

      const indent = line.length - line.trimStart().length;
      const stripped = line.trim();

      // Heading（headings 模式匯入；level→indent 對齊：h2=depth1..h6=depth5）
      const heading = stripped.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        const rich = parseRich(heading[2]);
        const node: MarkdownNode = {
          type: 'heading',
          content: rich.title,
          level,
          line: i + 1,
        };
        if (rich.markers.length) node.markers = rich.markers;
        if (rich.links.length) node.links = rich.links;
        if (rich.labels.length) node.labels = rich.labels;
        const depthIndent = Math.max(0, (level - 1) * 2); // h2→0, h3→2, ...
        while (stack.length > 1 && stack[stack.length - 1].indent >= depthIndent) stack.pop();
        const parent = stack[stack.length - 1].node;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        stack.push({ node, indent: depthIndent });
        continue;
      }

      // Bullet（outline 主要形式；indent 感知）
      const bullet = stripped.match(/^[-*+]\s+(.+)$/);
      if (bullet && this.options.listsAsChildren !== false) {
        const rich = parseRich(bullet[1]);
        const node: MarkdownNode = { type: 'list', content: rich.title, line: i + 1 };
        if (rich.markers.length) node.markers = rich.markers;
        if (rich.links.length) node.links = rich.links;
        if (rich.labels.length) node.labels = rich.labels;

        // pop 到正確父層（縮排嚴格小於當前者）
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
        const parent = stack[stack.length - 1].node;

        // note / image sentinel → 附加到父節點，不成為 child
        if (attachRichBody(parent, node)) {
          // 不 push（不佔深度位置）
          continue;
        }
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        stack.push({ node, indent });
        continue;
      }
    }

    return root;
  }
}

export function parseMarkdown(markdown: string, options?: ParserOptions): MarkdownNode {
  return new MarkdownParser(options).parse(markdown);
}

export default MarkdownParser;
