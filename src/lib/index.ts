/**
 * XMind ↔ Markdown Converter Library (barrel)
 *
 * 注意：XMind→MD 的實際轉換邏輯唯一來源是 `./client-converter.ts`
 * （由 Converter.svelte 直接 import，經 Vite 打包並自動 content-hash）。
 * 此 barrel 僅匯出 MD→XMind 與共用工具；過去重複的 converter/parser/stats
 * 已移除以避免「測試與生產行為分歧」。
 * @module lib
 */

// Export utility functions
export {
  cn,
  formatSize,
  formatDate,
  formatRelativeTime,
  downloadFile,
  downloadJSON,
  copyToClipboard as copyTextToClipboard,
  markdownToHtml as markdownToHtmlUtil,
  stripMarkdown,
  truncateText,
  slugify,
  debounce,
  throttle,
  deepClone,
  isPlainObject,
  getFileExtension,
  isXmindFile,
  getBaseFilename,
  safeJSONParse,
  generateId,
  isBrowser,
  isDev,
  sleep,
  retry,
} from './utils';

// Export storage management
export {
  StorageManager,
  storageManager,
  history,
} from './storage';

export type {
  StoredHistoryItem,
  StorageOptions,
} from './storage';

// Export download functionality
export {
  downloadContent,
  downloadMarkdown,
  downloadText,
  downloadHtml,
  downloadJson,
  downloadBatch,
  downloadXmind,
  copyToClipboard,
  markdownToHtml as markdownToHtmlDownload,
  stripMarkdown as stripMarkdownForDownload,
} from './download';

export type {
  DownloadFormat,
  DownloadOptions,
} from './download';

// Export Markdown to XMind converter
export {
  MarkdownToXmindConverter,
  convertMarkdownToXmind,
  parseMarkdownTree,
} from './markdown-to-xmind';

export {
  MarkdownParser,
  parseMarkdown,
} from './markdown-parser';

export {
  XmindBuilder,
  buildXmindXml,
} from './xmind-builder';

// Export shortcuts management
export {
  ShortcutRegistry,
  shortcutRegistry,
  initShortcuts,
  registerCommonShortcuts,
  formatShortcutKey,
  exportShortcutsHelp,
} from './shortcuts';

export type {
  Shortcut,
  ShortcutCategory,
} from './shortcuts';

// Export types
export type {
  ConversionOptions,
  ConversionResult,
  ConversionStats,
  ConversionMetadata,
  XmindTopic,
  TopicLink,
  Attachment,
  TopicStyle,
  HistoryItem,
  ThemeConfig,
  MarkerMap,
  ConverterState,
  ConversionError,
} from '../types/converter';
