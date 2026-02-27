/**
 * Statistics calculation for XMind to Markdown conversion
 * Handles computation of various metrics about the conversion process
 * @module stats
 */

import type { XmindTopic, ConversionStats } from '../types/converter';

/**
 * Statistics accumulator for tracking conversion metrics
 */
interface StatsAccumulator {
  /** Total topic count */
  totalTopics: number;
  /** Maximum depth found */
  maxDepth: number;
  /** Root topic count */
  rootTopics: number;
  /** Markers processed count */
  markersProcessed: number;
  /** Attachments processed count */
  attachmentsProcessed: number;
  /** Links processed count */
  linksProcessed: number;
  /** Images processed count */
  imagesProcessed: number;
  /** Topics per level distribution */
  levelDistribution: Map<number, number>;
  /** Total word count */
  wordCount: number;
  /** Total character count */
  charCount: number;
  /** Topics with notes count */
  topicsWithNotes: number;
  /** Topics with markers count */
  topicsWithMarkers: number;
  /** Topics with links count */
  topicsWithLinks: number;
  /** Topics with attachments count */
  topicsWithAttachments: number;
}

/**
 * Statistics calculator class
 */
export class StatsCalculator {
  /**
   * Calculate complete statistics from a topic tree
   * @param rootTopic - Root topic of the tree
   * @param startTime - Processing start time (for performance tracking)
   * @returns Complete conversion statistics
   */
  calculateStats(rootTopic: XmindTopic, startTime?: number): ConversionStats {
    const accumulator: StatsAccumulator = {
      totalTopics: 0,
      maxDepth: 0,
      rootTopics: 1,
      markersProcessed: 0,
      attachmentsProcessed: 0,
      linksProcessed: 0,
      imagesProcessed: 0,
      levelDistribution: new Map(),
      wordCount: 0,
      charCount: 0,
      topicsWithNotes: 0,
      topicsWithMarkers: 0,
      topicsWithLinks: 0,
      topicsWithAttachments: 0,
    };

    this.traverseTopic(rootTopic, accumulator);

    const endTime = performance.now();
    const processingTime = startTime ? endTime - startTime : 0;

    return {
      totalTopics: accumulator.totalTopics,
      maxDepthReached: accumulator.maxDepth,
      rootTopics: accumulator.rootTopics,
      processingTime,
      markersProcessed: accumulator.markersProcessed,
      attachmentsProcessed: accumulator.attachmentsProcessed,
      linksProcessed: accumulator.linksProcessed,
      imagesProcessed: accumulator.imagesProcessed,
    };
  }

  /**
   * Recursively traverse topic tree and accumulate statistics
   * @param topic - Current topic
   * @param accumulator - Statistics accumulator
   */
  private traverseTopic(topic: XmindTopic, accumulator: StatsAccumulator): void {
    // Count topic
    accumulator.totalTopics++;

    // Track max depth
    if (topic.level > accumulator.maxDepth) {
      accumulator.maxDepth = topic.level;
    }

    // Update level distribution
    const currentCount = accumulator.levelDistribution.get(topic.level) || 0;
    accumulator.levelDistribution.set(topic.level, currentCount + 1);

    // Count words and characters in title
    if (topic.title) {
      accumulator.wordCount += this.countWords(topic.title);
      accumulator.charCount += topic.title.length;
    }

    // Count words in notes
    if (topic.notes) {
      accumulator.topicsWithNotes++;
      accumulator.wordCount += this.countWords(topic.notes);
      accumulator.charCount += topic.notes.length;
    }

    // Count markers
    if (topic.markers && topic.markers.length > 0) {
      accumulator.topicsWithMarkers++;
      accumulator.markersProcessed += topic.markers.length;
    }

    // Count links
    if (topic.links && topic.links.length > 0) {
      accumulator.topicsWithLinks++;
      accumulator.linksProcessed += topic.links.length;
    }

    // Count attachments and images
    if (topic.attachments && topic.attachments.length > 0) {
      accumulator.topicsWithAttachments++;
      accumulator.attachmentsProcessed += topic.attachments.length;

      // Count images separately
      const images = topic.attachments.filter(a => a.type === 'image');
      accumulator.imagesProcessed += images.length;
    }

    // Recursively process children
    if (topic.children && topic.children.length > 0) {
      for (const child of topic.children) {
        this.traverseTopic(child, accumulator);
      }
    }
  }

  /**
   * Count words in a string
   * @param text - Text to count words in
   * @returns Word count
   */
  private countWords(text: string): number {
    // Remove extra whitespace and split by word boundaries
    const trimmed = text.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      return 0;
    }

    // Handle CJK characters (count each character as a word)
    const cjkChars = (trimmed.match(/[\u4e00-\u9fa5\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    const nonCjkText = trimmed.replace(/[\u4e00-\u9fa5\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/g, ' ');
    const nonCjkWords = nonCjkText.split(/\s+/).filter(w => w.length > 0).length;

    return cjkChars + nonCjkWords;
  }

  /**
   * Calculate level distribution from a topic tree
   * @param rootTopic - Root topic
   * @returns Record mapping level to topic count
   */
  calculateLevelDistribution(rootTopic: XmindTopic): Record<number, number> {
    const distribution = new Map<number, number>();

    this.traverseForLevelDistribution(rootTopic, distribution);

    return Object.fromEntries(distribution);
  }

  /**
   * Traverse for level distribution calculation
   * @param topic - Current topic
   * @param distribution - Distribution map
   */
  private traverseForLevelDistribution(topic: XmindTopic, distribution: Map<number, number>): void {
    const currentCount = distribution.get(topic.level) || 0;
    distribution.set(topic.level, currentCount + 1);

    if (topic.children && topic.children.length > 0) {
      for (const child of topic.children) {
        this.traverseForLevelDistribution(child, distribution);
      }
    }
  }

  /**
   * Get detailed statistics including word counts and level distribution
   * @param rootTopic - Root topic
   * @param startTime - Processing start time
   * @returns Extended statistics object
   */
  calculateDetailedStats(
    rootTopic: XmindTopic,
    startTime?: number
  ): ConversionStats & {
    wordCount: number;
    charCount: number;
    levelDistribution: Record<number, number>;
    topicsWithNotes: number;
    topicsWithMarkers: number;
    topicsWithLinks: number;
    topicsWithAttachments: number;
  } {
    const accumulator: StatsAccumulator = {
      totalTopics: 0,
      maxDepth: 0,
      rootTopics: 1,
      markersProcessed: 0,
      attachmentsProcessed: 0,
      linksProcessed: 0,
      imagesProcessed: 0,
      levelDistribution: new Map(),
      wordCount: 0,
      charCount: 0,
      topicsWithNotes: 0,
      topicsWithMarkers: 0,
      topicsWithLinks: 0,
      topicsWithAttachments: 0,
    };

    this.traverseTopic(rootTopic, accumulator);

    const endTime = performance.now();
    const processingTime = startTime ? endTime - startTime : 0;

    return {
      totalTopics: accumulator.totalTopics,
      maxDepthReached: accumulator.maxDepth,
      rootTopics: accumulator.rootTopics,
      processingTime,
      markersProcessed: accumulator.markersProcessed,
      attachmentsProcessed: accumulator.attachmentsProcessed,
      linksProcessed: accumulator.linksProcessed,
      imagesProcessed: accumulator.imagesProcessed,
      wordCount: accumulator.wordCount,
      charCount: accumulator.charCount,
      levelDistribution: Object.fromEntries(accumulator.levelDistribution),
      topicsWithNotes: accumulator.topicsWithNotes,
      topicsWithMarkers: accumulator.topicsWithMarkers,
      topicsWithLinks: accumulator.topicsWithLinks,
      topicsWithAttachments: accumulator.topicsWithAttachments,
    };
  }

  /**
   * Calculate statistics for multiple topics
   * @param topics - Array of topics
   * @returns Aggregated statistics
   */
  calculateMultipleStats(topics: XmindTopic[]): ConversionStats {
    const baseAccumulator: StatsAccumulator = {
      totalTopics: 0,
      maxDepth: 0,
      rootTopics: topics.length,
      markersProcessed: 0,
      attachmentsProcessed: 0,
      linksProcessed: 0,
      imagesProcessed: 0,
      levelDistribution: new Map(),
      wordCount: 0,
      charCount: 0,
      topicsWithNotes: 0,
      topicsWithMarkers: 0,
      topicsWithLinks: 0,
      topicsWithAttachments: 0,
    };

    for (const topic of topics) {
      this.traverseTopic(topic, baseAccumulator);
    }

    return {
      totalTopics: baseAccumulator.totalTopics,
      maxDepthReached: baseAccumulator.maxDepth,
      rootTopics: baseAccumulator.rootTopics,
      processingTime: 0,
      markersProcessed: baseAccumulator.markersProcessed,
      attachmentsProcessed: baseAccumulator.attachmentsProcessed,
      linksProcessed: baseAccumulator.linksProcessed,
      imagesProcessed: baseAccumulator.imagesProcessed,
    };
  }

  /**
   * Get statistics summary as human-readable string
   * @param stats - Statistics object
   * @returns Formatted summary string
   */
  formatStatsSummary(stats: ConversionStats): string {
    const lines: string[] = [
      '# Conversion Statistics',
      '',
      `Total Topics: ${stats.totalTopics}`,
      `Max Depth: ${stats.maxDepthReached}`,
      `Root Topics: ${stats.rootTopics}`,
      '',
      'Content Counts:',
      `- Markers: ${stats.markersProcessed}`,
      `- Attachments: ${stats.attachmentsProcessed}`,
      `- Links: ${stats.linksProcessed}`,
      `- Images: ${stats.imagesProcessed}`,
      '',
      `Processing Time: ${stats.processingTime.toFixed(2)}ms`,
    ];

    return lines.join('\n');
  }
}

/**
 * Calculate statistics for a topic tree
 * Convenience function for one-shot calculation
 * @param rootTopic - Root topic
 * @param startTime - Optional start time for performance tracking
 * @returns Conversion statistics
 */
export function calculateStats(rootTopic: XmindTopic, startTime?: number): ConversionStats {
  const calculator = new StatsCalculator();
  return calculator.calculateStats(rootTopic, startTime);
}

/**
 * Calculate detailed statistics including word counts
 * @param rootTopic - Root topic
 * @param startTime - Optional start time
 * @returns Extended statistics object
 */
export function calculateDetailedStats(
  rootTopic: XmindTopic,
  startTime?: number
): ReturnType<StatsCalculator['calculateDetailedStats']> {
  const calculator = new StatsCalculator();
  return calculator.calculateDetailedStats(rootTopic, startTime);
}

/**
 * Get level distribution for a topic tree
 * @param rootTopic - Root topic
 * @returns Record mapping levels to counts
 */
export function getLevelDistribution(rootTopic: XmindTopic): Record<number, number> {
  const calculator = new StatsCalculator();
  return calculator.calculateLevelDistribution(rootTopic);
}

/**
 * Format statistics as human-readable string
 * @param stats - Statistics object
 * @returns Formatted string
 */
export function formatStats(stats: ConversionStats): string {
  const calculator = new StatsCalculator();
  return calculator.formatStatsSummary(stats);
}

/**
 * Count words in a text string
 * Handles both Western languages and CJK characters
 * @param text - Text to analyze
 * @returns Word count
 */
export function countWords(text: string): number {
  const calculator = new StatsCalculator();
  return (calculator as unknown as { countWords: (t: string) => number }).countWords(text);
}

export default StatsCalculator;
