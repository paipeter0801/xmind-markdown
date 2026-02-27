/**
 * XMind to Markdown Converter Library
 * Core conversion functionality for processing XMind files
 * @module lib
 */

// Import types first
import type { ConversionOptions } from '../types/converter';

// Import converter functionality
import {
  XmindToMarkdownConverter,
  convertXmindToMarkdown,
  convertXmind,
  parseXmindContent,
  topicTreeToMarkdown,
} from './converter';

// Re-export main converter
export {
  XmindToMarkdownConverter,
  convertXmindToMarkdown,
  convertXmind,
  parseXmindContent,
  topicTreeToMarkdown,
} from './converter';

// Export parser
export {
  XmindParser,
  parseXmindXML,
  parseXmindXMLWithMeta,
} from './parser';

// Export statistics calculator
export {
  StatsCalculator,
  calculateStats,
  calculateDetailedStats,
  getLevelDistribution,
  formatStats,
  countWords,
} from './stats';

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
  copyToClipboard,
  markdownToHtml as markdownToHtmlDownload,
  stripMarkdown as stripMarkdownForDownload,
} from './download';

export type {
  DownloadFormat,
  DownloadOptions,
} from './download';

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

/**
 * Create a converter instance with default options
 * @param options - Optional configuration options
 * @returns Configured converter instance
 */
export function createConverter(options?: Partial<ConversionOptions>) {
  return new XmindToMarkdownConverter(options);
}

/**
 * Quick convert: File → Markdown string
 * @param file - File object or ArrayBuffer
 * @param options - Optional conversion options
 * @returns Promise resolving to markdown string
 */
export async function quickConvert(
  file: File | ArrayBuffer,
  options?: Partial<ConversionOptions>
): Promise<string> {
  const result = await convertXmindToMarkdown(file, options);
  if (!result.success) {
    throw new Error(result.error || 'Conversion failed');
  }
  return result.content;
}
