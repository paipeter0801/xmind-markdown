/**
 * LocalStorage History Management
 * Manages conversion history using localStorage with nanoid
 * @module lib/storage
 */

import { nanoid } from 'nanoid';
import type { ConversionResult } from '../types/converter';

/**
 * History item stored in localStorage
 */
export interface StoredHistoryItem extends ConversionResult {
  /** Unique identifier (nanoid) */
  id: string;
  /** Original filename */
  filename: string;
  /** Timestamp when created */
  createdAt: string;
  /** Timestamp when last accessed */
  lastAccessed: string;
}

/**
 * Storage configuration options
 */
export interface StorageOptions {
  /** Maximum number of items to store */
  maxItems?: number;
  /** Storage key prefix */
  keyPrefix?: string;
  /** TTL in milliseconds (optional) */
  ttl?: number;
}

/**
 * Default storage options
 */
const DEFAULT_OPTIONS: Required<StorageOptions> = {
  maxItems: 50,
  keyPrefix: 'xmind-converter',
  ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

/**
 * Storage manager class for history management
 */
export class StorageManager {
  private options: Required<StorageOptions>;
  private storageKey: string;

  constructor(options: StorageOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.storageKey = `${this.options.keyPrefix}-history`;
  }

  /**
   * Get all history items from localStorage
   * @returns Array of history items
   */
  getAll(): StoredHistoryItem[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];

      const items = JSON.parse(data) as StoredHistoryItem[];

      // Filter out expired items
      const now = Date.now();
      const validItems = this.options.ttl
        ? items.filter(item => {
            const createdAt = new Date(item.createdAt).getTime();
            return now - createdAt < this.options.ttl;
          })
        : items;

      // Update storage if items were filtered
      if (validItems.length !== items.length) {
        this._save(validItems);
      }

      return validItems.sort(
        (a, b) =>
          new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Get a specific history item by ID
   * @param id - Item ID
   * @returns History item or undefined
   */
  get(id: string): StoredHistoryItem | undefined {
    const items = this.getAll();
    return items.find(item => item.id === id);
  }

  /**
   * Add a new history item
   * @param result - Conversion result
   * @param filename - Original filename
   * @returns Created history item
   */
  add(result: ConversionResult, filename: string): StoredHistoryItem {
    const now = new Date().toISOString();
    const item: StoredHistoryItem = {
      ...result,
      id: nanoid(),
      filename,
      createdAt: now,
      lastAccessed: now,
    };

    const items = this.getAll();
    items.unshift(item);

    // Enforce max items limit
    const trimmed = items.slice(0, this.options.maxItems);
    this._save(trimmed);

    return item;
  }

  /**
   * Update an existing history item
   * @param id - Item ID
   * @param updates - Partial updates to apply
   * @returns Updated item or undefined
   */
  update(
    id: string,
    updates: Partial<StoredHistoryItem>
  ): StoredHistoryItem | undefined {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);

    if (index === -1) return undefined;

    items[index] = {
      ...items[index],
      ...updates,
      lastAccessed: new Date().toISOString(),
    };

    this._save(items);
    return items[index];
  }

  /**
   * Delete a history item
   * @param id - Item ID to delete
   * @returns True if deleted
   */
  delete(id: string): boolean {
    const items = this.getAll();
    const filtered = items.filter(item => item.id !== id);

    if (filtered.length === items.length) return false;

    this._save(filtered);
    return true;
  }

  /**
   * Clear all history
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get storage size in bytes
   * @returns Size in bytes
   */
  getSize(): number {
    if (typeof window === 'undefined') return 0;

    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get storage stats
   * @returns Storage statistics
   */
  getStats(): {
    itemCount: number;
    sizeBytes: number;
    sizeFormatted: string;
    oldestItem?: Date;
    newestItem?: Date;
  } {
    const items = this.getAll();
    const size = this.getSize();

    const dates = items.map(item => new Date(item.createdAt));
    const oldestItem = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined;
    const newestItem = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : undefined;

    return {
      itemCount: items.length,
      sizeBytes: size,
      sizeFormatted: this._formatSize(size),
      oldestItem,
      newestItem,
    };
  }

  /**
   * Export history as JSON
   * @returns JSON string of all items
   */
  export(): string {
    const items = this.getAll();
    return JSON.stringify(items, null, 2);
  }

  /**
   * Import history from JSON
   * @param json - JSON string to import
   * @param merge - Whether to merge with existing history (default: false)
   * @returns Number of items imported
   */
  import(json: string, merge: boolean = false): number {
    try {
      const items = JSON.parse(json) as StoredHistoryItem[];

      if (!Array.isArray(items)) {
        throw new Error('Invalid format: expected array');
      }

      const existing = merge ? this.getAll() : [];
      const combined = [...items, ...existing];

      // Deduplicate by ID (keep newest)
      const unique = Array.from(
        new Map(combined.map(item => [item.id, item])).values()
      );

      // Sort by last accessed
      const sorted = unique.sort(
        (a, b) =>
          new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      );

      // Enforce max items
      const trimmed = sorted.slice(0, this.options.maxItems);
      this._save(trimmed);

      return items.length;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up old items beyond max limit
   */
  cleanup(): void {
    const items = this.getAll();
    if (items.length > this.options.maxItems) {
      const trimmed = items.slice(0, this.options.maxItems);
      this._save(trimmed);
    }
  }

  /**
   * Save items to localStorage
   * @param items - Items to save
   */
  private _save(items: StoredHistoryItem[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (error) {
      // Handle quota exceeded
      console.warn('Storage quota exceeded, clearing old items');
      const trimmed = items.slice(0, Math.floor(items.length / 2));
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
      } catch {
        // If still fails, clear everything
        localStorage.removeItem(this.storageKey);
      }
    }
  }

  /**
   * Format bytes to human-readable size
   * @param bytes - Size in bytes
   * @returns Formatted size string
   */
  private _formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

/**
 * Default storage manager instance
 */
export const storageManager = new StorageManager();

/**
 * Convenience functions using default manager
 */
export const history = {
  getAll: () => storageManager.getAll(),
  get: (id: string) => storageManager.get(id),
  add: (result: ConversionResult, filename: string) =>
    storageManager.add(result, filename),
  update: (id: string, updates: Partial<StoredHistoryItem>) =>
    storageManager.update(id, updates),
  delete: (id: string) => storageManager.delete(id),
  clear: () => storageManager.clear(),
  getStats: () => storageManager.getStats(),
  export: () => storageManager.export(),
  import: (json: string, merge?: boolean) =>
    storageManager.import(json, merge),
  cleanup: () => storageManager.cleanup(),
};
