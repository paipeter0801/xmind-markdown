/**
 * Download Functionality
 * Handles downloading content in various formats (.md, .txt, .html)
 * @module lib/download
 */

import { marked } from 'marked';

/**
 * Download format options
 */
export type DownloadFormat = 'md' | 'txt' | 'html' | 'json';

/**
 * Download options
 */
export interface DownloadOptions {
  /** Format to download */
  format: DownloadFormat;
  /** Filename without extension */
  filename: string;
  /** Whether to include metadata */
  includeMetadata?: boolean;
  /** Custom HTML template */
  htmlTemplate?: string;
  /** CSS for HTML output */
  css?: string;
}

/**
 * Default HTML template
 */
const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    {{css}}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>{{title}}</h1>
      <div class="meta">
        <span class="date">{{date}}</span>
      </div>
    </header>
    <main>
      {{content}}
    </main>
  </div>
</body>
</html>`;

/**
 * Default CSS for HTML output
 */
const DEFAULT_CSS = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
  padding: 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

header {
  border-bottom: 2px solid #eee;
  padding-bottom: 20px;
  margin-bottom: 30px;
}

header h1 {
  font-size: 2em;
  margin-bottom: 10px;
}

.meta {
  color: #666;
  font-size: 0.9em;
}

main {
  line-height: 1.8;
}

main h1 {
  font-size: 2em;
  margin-top: 1em;
  margin-bottom: 0.5em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

main h2 {
  font-size: 1.5em;
  margin-top: 1em;
  margin-bottom: 0.5em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

main h3 {
  font-size: 1.25em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

main h4 {
  font-size: 1em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

main p {
  margin-bottom: 1em;
}

main ul, main ol {
  margin-left: 2em;
  margin-bottom: 1em;
}

main li {
  margin-bottom: 0.25em;
}

main code {
  background: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.9em;
}

main pre {
  background: #f4f4f4;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 1em;
}

main pre code {
  background: none;
  padding: 0;
}

main blockquote {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
  font-style: italic;
}

main a {
  color: #0066cc;
  text-decoration: none;
}

main a:hover {
  text-decoration: underline;
}

main img {
  max-width: 100%;
  height: auto;
}

main table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

main th,
main td {
  border: 1px solid #ddd;
  padding: 0.5em;
}

main th {
  background: #f4f4f4;
  font-weight: bold;
}
`;

/**
 * Download content in specified format
 * @param content - Content to download
 * @param options - Download options
 */
export function downloadContent(
  content: string,
  options: DownloadOptions
): void {
  const { format, filename, includeMetadata = false } = options;

  let finalContent = content;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'md':
      finalContent = content;
      mimeType = 'text/markdown';
      extension = 'md';
      break;

    case 'txt':
      finalContent = stripMarkdown(content);
      mimeType = 'text/plain';
      extension = 'txt';
      break;

    case 'html':
      finalContent = markdownToHtml(
        content,
        filename,
        options.htmlTemplate,
        options.css
      );
      mimeType = 'text/html';
      extension = 'html';
      break;

    case 'json':
      finalContent = JSON.stringify({ content, filename, includeMetadata }, null, 2);
      mimeType = 'application/json';
      extension = 'json';
      break;

    default:
      finalContent = content;
      mimeType = 'text/plain';
      extension = 'txt';
  }

  downloadFile(finalContent, `${filename}.${extension}`, mimeType);
}

/**
 * Download markdown file
 * @param content - Markdown content
 * @param filename - Filename without extension
 */
export function downloadMarkdown(content: string, filename: string): void {
  downloadContent(content, { format: 'md', filename });
}

/**
 * Download plain text file
 * @param content - Content to download
 * @param filename - Filename without extension
 */
export function downloadText(content: string, filename: string): void {
  downloadContent(content, { format: 'txt', filename });
}

/**
 * Download HTML file
 * @param markdown - Markdown content to convert
 * @param filename - Filename without extension
 * @param template - Optional HTML template
 * @param css - Optional CSS
 */
export function downloadHtml(
  markdown: string,
  filename: string,
  template?: string,
  css?: string
): void {
  downloadContent(markdown, {
    format: 'html',
    filename,
    htmlTemplate: template,
    css,
  });
}

/**
 * Download JSON file
 * @param data - Data to stringify and download
 * @param filename - Filename without extension
 */
export function downloadJson(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2);
  downloadFile(content, `${filename}.json`, 'application/json');
}

/**
 * Convert markdown to HTML with template
 * @param markdown - Markdown content
 * @param title - Document title
 * @param template - HTML template
 * @param css - CSS styles
 * @returns HTML string
 */
export function markdownToHtml(
  markdown: string,
  title: string = 'Document',
  template: string = DEFAULT_HTML_TEMPLATE,
  css: string = DEFAULT_CSS
): string {
  const htmlContent = marked.parse(markdown) as string;
  const date = new Date().toLocaleDateString();

  return template
    .replace('{{title}}', escapeHtml(title))
    .replace('{{date}}', date)
    .replace('{{css}}', css)
    .replace('{{content}}', htmlContent);
}

/**
 * Strip markdown formatting to plain text
 * @param markdown - Markdown content
 * @returns Plain text
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '') // Headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
    .replace(/^\s*[-*+]\s+/gm, '') // Lists
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .replace(/^>\s+/gm, '') // Blockquotes
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .trim();
}

/**
 * Download file helper
 * @param content - File content
 * @param filename - Full filename with extension
 * @param mimeType - MIME type
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape HTML special characters
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Download multiple files as a batch (creates a simple script)
 * @param files - Array of { content, filename } objects
 * @param batchName - Name for the batch download
 */
export function downloadBatch(
  files: Array<{ content: string; filename: string }>,
  batchName: string = 'download'
): void {
  if (files.length === 0) return;

  if (files.length === 1) {
    const [{ content, filename }] = files;
    const ext = filename.endsWith('.md') ? '' : '.md';
    downloadFile(content, filename + ext, 'text/markdown');
    return;
  }

  // For multiple files, create a simple HTML page with download links
  const linksHtml = files
    .map(
      ({ content, filename }) => `
        <li>
          <a href="data:text/markdown;charset=utf-8,${encodeURIComponent(
            content
          )}" download="${filename}.md">${filename}</a>
        </li>
      `
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${batchName} - Batch Download</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; }
    ul { list-style: none; padding: 0; }
    li { margin: 10px 0; }
    a { display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; }
    a:hover { background: #0052a3; }
  </style>
</head>
<body>
  <h1>${batchName}</h1>
  <p>Click each link to download the file:</p>
  <ul>
    ${linksHtml}
  </ul>
  <script>
    // Auto-download first file after a delay
    setTimeout(() => {
      const firstLink = document.querySelector('a');
      if (firstLink) firstLink.click();
    }, 1000);
  </script>
</body>
</html>`;

  downloadFile(html, `${batchName}-downloads.html`, 'text/html');
}

/**
 * Copy content to clipboard
 * @param content - Content to copy
 * @returns Promise that resolves to true if successful
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  if (!navigator.clipboard) {
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }

  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}
