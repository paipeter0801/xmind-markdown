/**
 * TypeScript Type Definitions for XMind to Markdown Converter
 * @module converter
 */

/**
 * Configuration options for the conversion process
 */
export interface ConversionOptions {
  /** Output format (markdown, html, json, etc.) */
  outputFormat: 'markdown' | 'html' | 'json';
  /** Include metadata in output */
  includeMetadata?: boolean;
  /** Maximum depth for topic traversal */
  maxDepth?: number;
  /** Include topic IDs in output */
  includeIds?: boolean;
  /** Include timestamps in output */
  includeTimestamps?: boolean;
  /** Custom theme configuration */
  theme?: ThemeConfig;
  /** Marker map for custom markers */
  markers?: MarkerMap;
  /** Skip empty topics */
  skipEmpty?: boolean;
  /** Preserve formatting styles */
  preserveFormatting?: boolean;
}

/**
 * Result of the conversion process
 */
export interface ConversionResult {
  /** Converted content */
  content: string;
  /** Conversion statistics */
  stats: ConversionStats;
  /** Metadata about the conversion */
  metadata: ConversionMetadata;
  /** Success status */
  success: boolean;
  /** Error message if conversion failed */
  error?: string;
}

/**
 * Statistics about the conversion process
 */
export interface ConversionStats {
  /** Total number of topics processed */
  totalTopics: number;
  /** Maximum depth reached */
  maxDepthReached: number;
  /** Number of root topics */
  rootTopics: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Number of markers processed */
  markersProcessed: number;
  /** Number of attachments processed */
  attachmentsProcessed: number;
  /** Number of links processed */
  linksProcessed: number;
  /** Number of images processed */
  imagesProcessed: number;
}

/**
 * Metadata about the conversion
 */
export interface ConversionMetadata {
  /** Source file name */
  sourceFile: string;
  /** Original format */
  sourceFormat: 'xmind' | 'json' | 'xml';
  /** Conversion timestamp */
  timestamp: Date;
  /** Converter version */
  version: string;
  /** Original XMind metadata */
  originalMetadata?: {
    /** XMind file title */
    title?: string;
    /** XMind file author */
    author?: string;
    /** Creation date */
    createdAt?: Date;
    /** Last modified date */
    modifiedAt?: Date;
  };
}

/**
 * XMind topic structure
 */
export interface XmindTopic {
  /** Unique identifier */
  id: string;
  /** Topic title/text */
  title: string;
  /** Child topics */
  children?: XmindTopic[];
  /** Topic level/depth */
  level: number;
  /** Parent topic ID */
  parentId?: string;
  /** Topic notes */
  notes?: string;
  /** Topic markers */
  markers?: string[];
  /** Topic links */
  links?: TopicLink[];
  /** Topic attachments */
  attachments?: Attachment[];
  /** Topic labels */
  labels?: string[];
  /** Topic position */
  position?: {
    x: number;
    y: number;
  };
  /** Topic style */
  style?: TopicStyle;
  /** Creation timestamp */
  createdAt?: Date;
  /** Modification timestamp */
  modifiedAt?: Date;
}

/**
 * Topic link reference
 */
export interface TopicLink {
  /** Link URL */
  href: string;
  /** Link type (url, file, topic) */
  type: 'url' | 'file' | 'topic';
  /** Link title */
  title?: string;
}

/**
 * Topic attachment
 */
export interface Attachment {
  /** Attachment file name */
  filename: string;
  /** Attachment MIME type */
  mimeType: string;
  /** Attachment size in bytes */
  size: number;
  /** Attachment path/URL */
  path: string;
  /** Attachment type (file, image, video) */
  type: 'file' | 'image' | 'video';
}

/**
 * Topic style definition
 */
export interface TopicStyle {
  /** Text color */
  color?: string;
  /** Background color */
  backgroundColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Font size */
  fontSize?: number;
  /** Font weight */
  fontWeight?: 'normal' | 'bold' | 'light';
  /** Font style */
  fontStyle?: 'normal' | 'italic';
  /** Border style */
  border?: string;
  /** Shape */
  shape?: 'rectangle' | 'rounded' | 'circle' | 'diamond';
}

/**
 * History item for undo/redo functionality
 */
export interface HistoryItem {
  /** Unique identifier */
  id: string;
  /** Action type */
  type: 'add' | 'update' | 'delete' | 'move';
  /** Timestamp */
  timestamp: Date;
  /** Affected topic ID */
  topicId: string;
  /** Previous state (for undo) */
  previousState?: XmindTopic;
  /** New state (for redo) */
  newState?: XmindTopic;
  /** Description of the action */
  description: string;
}

/**
 * Theme configuration for output formatting
 */
export interface ThemeConfig {
  /** Theme name */
  name: string;
  /** Heading style */
  headingStyle?: 'atx' | 'setext';
  /** Code block style */
  codeStyle?: 'fenced' | 'indented';
  /** List marker style */
  listStyle?: 'asterisk' | 'plus' | 'dash';
  /** Emphasis style */
  emphasisStyle?: 'underscore' | 'asterisk';
  /** Strong style */
  strongStyle?: 'underscore' | 'asterisk';
  /** Link style */
  linkStyle?: 'inline' | 'reference';
  /** Image style */
  imageStyle?: 'inline' | 'reference';
  /** Custom CSS classes */
  customClasses?: Record<string, string>;
  /** Color palette */
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    background?: string;
  };
}

/**
 * Marker map for custom topic markers
 */
export interface MarkerMap {
  /** Map of marker IDs to symbols */
  [markerId: string]: {
    /** Symbol to use in output */
    symbol: string;
    /** Marker description */
    description?: string;
    /** Marker category (priority, status, task, etc.) */
    category?: string;
    /** Markdown representation */
    markdown?: string;
    /** HTML representation */
    html?: string;
  };
}

/**
 * Converter state for tracking conversion progress
 */
export interface ConverterState {
  /** Current conversion options */
  options: ConversionOptions;
  /** Current depth */
  currentDepth: number;
  /** Processed topic IDs */
  processedIds: Set<string>;
  /** Current statistics */
  stats: ConversionStats;
  /** History stack */
  history: HistoryItem[];
  /** Current theme */
  theme: ThemeConfig;
}

/**
 * Error types for conversion failures
 */
export type ConversionError =
  | { type: 'ParseError'; message: string; line?: number }
  | { type: 'ValidationError'; message: string; field?: string }
  | { type: 'OutputError'; message: string; format?: string }
  | { type: 'FileError'; message: string; path?: string };
