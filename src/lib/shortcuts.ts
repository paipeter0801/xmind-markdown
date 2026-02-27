/**
 * Keyboard Shortcuts Management
 * Handles registration and execution of keyboard shortcuts
 * @module lib/shortcuts
 */

/**
 * Keyboard shortcut definition
 */
export interface Shortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Key combination (e.g., 'Ctrl+S', 'Cmd+S', 'Escape') */
  key: string;
  /** Human-readable description */
  description: string;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** Whether to prevent default behavior */
  preventDefault?: boolean;
  /** Whether to stop propagation */
  stopPropagation?: boolean;
  /** Condition to check before executing */
  condition?: () => boolean;
  /** Category for grouping shortcuts */
  category?: ShortcutCategory;
}

/**
 * Shortcut categories
 */
export type ShortcutCategory =
  | 'file'
  | 'edit'
  | 'view'
  | 'navigation'
  | 'conversion'
  | 'help';

/**
 * Shortcut registry
 */
export class ShortcutRegistry {
  private shortcuts: Map<string, Shortcut> = new Map();
  private keyMap: Map<string, Set<string>> = new Map();
  private isEnabled = true;

  /**
   * Register a keyboard shortcut
   * @param shortcut - Shortcut definition
   */
  register(shortcut: Shortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);

    const keyCombo = this.normalizeKey(shortcut.key);
    if (!this.keyMap.has(keyCombo)) {
      this.keyMap.set(keyCombo, new Set());
    }
    this.keyMap.get(keyCombo)!.add(shortcut.id);
  }

  /**
   * Unregister a keyboard shortcut
   * @param id - Shortcut ID
   */
  unregister(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      const keyCombo = this.normalizeKey(shortcut.key);
      const ids = this.keyMap.get(keyCombo);
      if (ids) {
        ids.delete(id);
        if (ids.size === 0) {
          this.keyMap.delete(keyCombo);
        }
      }
    }
    this.shortcuts.delete(id);
  }

  /**
   * Check if a shortcut is registered
   * @param id - Shortcut ID
   * @returns True if registered
   */
  has(id: string): boolean {
    return this.shortcuts.has(id);
  }

  /**
   * Get a shortcut by ID
   * @param id - Shortcut ID
   * @returns Shortcut or undefined
   */
  get(id: string): Shortcut | undefined {
    return this.shortcuts.get(id);
  }

  /**
   * Get all shortcuts
   * @param category - Optional category filter
   * @returns Array of shortcuts
   */
  getAll(category?: ShortcutCategory): Shortcut[] {
    const all = Array.from(this.shortcuts.values());
    return category ? all.filter(s => s.category === category) : all;
  }

  /**
   * Get shortcuts grouped by category
   * @returns Record of category to shortcuts
   */
  getByCategory(): Record<ShortcutCategory, Shortcut[]> {
    const result: Partial<Record<ShortcutCategory, Shortcut[]>> = {};
    const categories: ShortcutCategory[] = [
      'file',
      'edit',
      'view',
      'navigation',
      'conversion',
      'help',
    ];

    for (const cat of categories) {
      result[cat] = this.getAll(cat);
    }

    return result as Record<ShortcutCategory, Shortcut[]>;
  }

  /**
   * Enable shortcut handling
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable shortcut handling
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Toggle shortcut handling
   */
  toggle(): void {
    this.isEnabled = !this.isEnabled;
  }

  /**
   * Handle keyboard event
   * @param event - Keyboard event
   * @returns True if event was handled
   */
  handleEvent(event: KeyboardEvent): boolean {
    if (!this.isEnabled) return false;

    // Check if user is typing in an input field
    const target = event.target as HTMLElement;
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target as HTMLElement).isContentEditable ||
      target.getAttribute('contenteditable') === 'true';

    const keyCombo = this.eventToKeyCombo(event);
    const shortcutIds = this.keyMap.get(keyCombo);

    if (!shortcutIds || shortcutIds.size === 0) return false;

    let handled = false;

    for (const id of shortcutIds) {
      const shortcut = this.shortcuts.get(id);
      if (
        shortcut &&
        (!shortcut.condition || shortcut.condition()) &&
        (!isInputField || shortcut.category === 'edit')
      ) {
        if (shortcut.preventDefault) {
          event.preventDefault();
        }
        if (shortcut.stopPropagation) {
          event.stopPropagation();
        }
        shortcut.handler(event);
        handled = true;
      }
    }

    return handled;
  }

  /**
   * Clear all shortcuts
   */
  clear(): void {
    this.shortcuts.clear();
    this.keyMap.clear();
  }

  /**
   * Normalize key combination string to consistent format
   * @param key - Key combination string
   * @returns Normalized key string
   */
  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace('cmd', 'meta')
      .replace('ctrl', 'control')
      .replace('command', 'meta');
  }

  /**
   * Convert keyboard event to key combination string
   * @param event - Keyboard event
   * @returns Key combination string
   */
  private eventToKeyCombo(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.metaKey) parts.push('meta');
    if (event.ctrlKey) parts.push('control');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    // Handle special keys
    const key = event.key.toLowerCase();
    if (
      !['meta', 'control', 'alt', 'shift'].includes(key) &&
      key.length === 1
    ) {
      parts.push(key);
    } else {
      parts.push(event.code.toLowerCase());
    }

    return parts.join('+');
  }
}

/**
 * Global shortcut registry instance
 */
export const shortcutRegistry = new ShortcutRegistry();

/**
 * Initialize global keyboard event listener
 */
export function initShortcuts(): void {
  if (typeof window === 'undefined') return;

  document.addEventListener('keydown', (event) => {
    shortcutRegistry.handleEvent(event);
  });
}

/**
 * Register common application shortcuts
 * @param handlers - Handler functions for various actions
 */
export function registerCommonShortcuts(handlers: {
  onSave?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onNew?: () => void;
  onOpen?: () => void;
  onHelp?: () => void;
  onTogglePreview?: () => void;
  onClear?: () => void;
}): void {
  const isMac = typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? 'Cmd' : 'Ctrl';

  // File operations
  if (handlers.onNew) {
    shortcutRegistry.register({
      id: 'file.new',
      key: `${modKey}+N`,
      description: 'New file',
      category: 'file',
      handler: handlers.onNew,
      preventDefault: true,
    });
  }

  if (handlers.onOpen) {
    shortcutRegistry.register({
      id: 'file.open',
      key: `${modKey}+O`,
      description: 'Open file',
      category: 'file',
      handler: handlers.onOpen,
      preventDefault: true,
    });
  }

  if (handlers.onSave) {
    shortcutRegistry.register({
      id: 'file.save',
      key: `${modKey}+S`,
      description: 'Save',
      category: 'file',
      handler: handlers.onSave,
      preventDefault: true,
    });
  }

  if (handlers.onDownload) {
    shortcutRegistry.register({
      id: 'file.download',
      key: `${modKey}+Shift+S`,
      description: 'Download as',
      category: 'file',
      handler: handlers.onDownload,
      preventDefault: true,
    });
  }

  // Edit operations
  if (handlers.onCopy) {
    shortcutRegistry.register({
      id: 'edit.copy',
      key: `${modKey}+C`,
      description: 'Copy',
      category: 'edit',
      handler: handlers.onCopy,
      preventDefault: false, // Let default happen for inputs
    });
  }

  if (handlers.onPaste) {
    shortcutRegistry.register({
      id: 'edit.paste',
      key: `${modKey}+V`,
      description: 'Paste',
      category: 'edit',
      handler: handlers.onPaste,
      preventDefault: false,
    });
  }

  if (handlers.onUndo) {
    shortcutRegistry.register({
      id: 'edit.undo',
      key: `${modKey}+Z`,
      description: 'Undo',
      category: 'edit',
      handler: handlers.onUndo,
      preventDefault: true,
    });
  }

  if (handlers.onRedo) {
    shortcutRegistry.register({
      id: 'edit.redo',
      key: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
      description: 'Redo',
      category: 'edit',
      handler: handlers.onRedo,
      preventDefault: true,
    });
  }

  if (handlers.onFind) {
    shortcutRegistry.register({
      id: 'edit.find',
      key: `${modKey}+F`,
      description: 'Find',
      category: 'edit',
      handler: handlers.onFind,
      preventDefault: true,
    });
  }

  // View operations
  if (handlers.onTogglePreview) {
    shortcutRegistry.register({
      id: 'view.toggle-preview',
      key: `${modKey}+P`,
      description: 'Toggle preview',
      category: 'view',
      handler: handlers.onTogglePreview,
      preventDefault: true,
    });
  }

  // Conversion operations
  if (handlers.onClear) {
    shortcutRegistry.register({
      id: 'conversion.clear',
      key: `${modKey}+Delete`,
      description: 'Clear content',
      category: 'conversion',
      handler: handlers.onClear,
      preventDefault: true,
    });
  }

  // Help
  if (handlers.onHelp) {
    shortcutRegistry.register({
      id: 'help.shortcuts',
      key: '?',
      description: 'Show keyboard shortcuts',
      category: 'help',
      handler: handlers.onHelp,
      preventDefault: true,
      condition: () => {
        // Only trigger when not typing
        const target = document.activeElement;
        return (
          target?.tagName !== 'INPUT' &&
          target?.tagName !== 'TEXTAREA' &&
          !(target as HTMLElement)?.isContentEditable
        );
      },
    });
  }

  // Escape key
  shortcutRegistry.register({
    id: 'common.escape',
    key: 'Escape',
    description: 'Close / Cancel',
    category: 'navigation',
    handler: () => {
      // Default escape behavior - can be overridden
      const modal = document.querySelector('[role="dialog"]');
      if (modal instanceof HTMLElement && modal.offsetParent !== null) {
        modal.dispatchEvent(new CustomEvent('close'));
      }
    },
    preventDefault: false,
  });
}

/**
 * Format shortcut key for display
 * @param key - Key combination
 * @returns Formatted display string
 */
export function formatShortcutKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return key
    .replace(/Cmd|Command/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Ctrl/g, 'Ctrl')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Shift/g, isMac ? '⇧' : 'Shift')
    .replace(/\+/g, isMac ? '' : '+')
    .split('+')
    .map(k => k.trim())
    .filter(Boolean)
    .join(isMac ? '' : '+');
}

/**
 * Export shortcuts as a help table
 * @param category - Optional category filter
 * @returns Markdown table of shortcuts
 */
export function exportShortcutsHelp(category?: ShortcutCategory): string {
  const grouped = shortcutRegistry.getByCategory();
  const categories = category ? [category] : Object.keys(grouped) as ShortcutCategory[];

  const lines: string[] = ['# Keyboard Shortcuts\n'];

  for (const cat of categories) {
    const shortcuts = grouped[cat];
    if (shortcuts.length === 0) continue;

    lines.push(`\n## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`);
    lines.push('| Shortcut | Description |');
    lines.push('|----------|-------------|');

    for (const shortcut of shortcuts) {
      const formattedKey = formatShortcutKey(shortcut.key);
      lines.push(`| \`${formattedKey}\` | ${shortcut.description} |`);
    }
  }

  return lines.join('\n');
}
