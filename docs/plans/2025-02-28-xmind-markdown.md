# XMind → Markdown Converter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一個功能豐富的 XMind 到 Markdown 轉換器，作為 Astro + Svelte + Cloudflare 技術棧的範例專案。

**Architecture:** 純前端應用，使用 jszip 解壓 XMind (ZIP格式)，fast-xml-parser 解析 content.xml，遞歸遍歷節點轉換為 Markdown。所有處理在瀏覽器完成，支援 PWA 安裝到桌面。

**Tech Stack:** Astro 5, Svelte 5 (Runes), Tailwind CSS v4, Framer Motion, jszip, fast-xml-parser, marked, shiki, Recharts

---

## Task 1: 專案初始化與基礎配置

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `vite-pwa.config.ts`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: 初始化專案**

```bash
cd ~/code/xmind-markdown
npm init -y
```

**Step 2: 安裝核心依賴**

```bash
npm install astro@latest @astrojs/svelte@latest svelte@latest @tailwindcss/vite@latest tailwindcss@latest
npm install -D typescript @astrojs/pwa@latest vite-plugin-pwa@latest
```

**Step 3: 安裝功能依賴**

```bash
npm install jszip fast-xml-parser marked shiki framer-motion date-fns nanoid recharts clsx tailwind-merge
```

**Step 4: 創建 package.json**

```json
{
  "name": "xmind-markdown",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/pwa": "^0.3.0",
    "@astrojs/svelte": "^7.2.5",
    "@tailwindcss/vite": "^4.1.18",
    "astro": "^5.17.3",
    "clsx": "^2.1.1",
    "date-fns": "^4.0.0",
    "fast-xml-parser": "^4.5.0",
    "framer-motion": "^11.0.0",
    "jszip": "^3.10.1",
    "marked": "^15.0.0",
    "nanoid": "^5.1.6",
    "recharts": "^2.15.0",
    "shiki": "^2.0.0",
    "svelte": "^5.51.2",
    "tailwind-merge": "^3.4.1",
    "tailwindcss": "^4.1.18"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite-plugin-pwa": "^0.21.0"
  }
}
```

**Step 5: 創建 astro.config.mjs**

```javascript
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import pwa from '@astrojs/pwa';

export default defineConfig({
  integrations: [
    svelte(),
    pwa({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'XMind → Markdown Converter',
        short_name: 'XMind MD',
        description: '專業心智圖轉換工具',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  vite: {
    plugins: [tailwind()]
  }
});
```

**Step 6: 創建 tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "svelte",
    "types": ["vite-plugin-pwa/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 7: 創建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,svelte,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
        }
      }
    }
  }
};
```

**Step 8: 創建 .gitignore**

```
node_modules/
dist/
.astro/
.env
.DS_Store
*.log
```

**Step 9: 創建 README.md**

```markdown
# XMind → Markdown Converter

專業的心智圖轉換工具，將 XMind 檔案轉換為 Markdown 格式。

## 功能

- 拖放上傳 XMind 檔案
- 即時轉換為 Markdown
- 語法高亮預覽
- 多格式下載 (.md, .txt, .html)
- 深色模式支援
- 轉換歷史記錄
- PWA 支援

## 開發

\`\`\`bash
npm install
npm run dev
\`\`\`

## 構建

\`\`\`bash
npm run build
\`\`\`
```

**Step 10: 創建基本目錄結構**

```bash
mkdir -p src/{components/{ui,converter,editor,layout},lib,layouts,pages,styles,types}
mkdir -p public/icons
mkdir -p docs/plans
```

**Step 11: Commit**

```bash
cd ~/code/xmind-markdown
git add .
git commit -m "feat: initialize project with core configuration"
```

---

## Task 2: TypeScript 類型定義

**Files:**
- Create: `src/types/converter.ts`

**Step 1: 創建類型定義**

```typescript
// src/types/converter.ts

export interface ConversionOptions {
  maxSize: number;
  includeStats: boolean;
  includeMeta: boolean;
  outputFormat: 'md' | 'txt' | 'html';
}

export interface ConversionResult {
  markdown: string;
  stats: ConversionStats;
  metadata: ConversionMetadata;
}

export interface ConversionStats {
  nodeCount: number;
  maxDepth: number;
  titleCount: number;
  wordCount: number;
  charCount: number;
  levelDistribution: Record<number, number>;
}

export interface ConversionMetadata {
  fileName: string;
  fileSize: number;
  convertedAt: string;
  processingTime: number;
}

export interface XmindTopic {
  id: string;
  title?: string;
  children?: {
    topics?: XmindTopic[];
  };
  markerRefs?: {
    markerRef?: Array<{ markerId: string }>;
  };
}

export interface HistoryItem {
  id: string;
  fileName: string;
  markdown: string;
  stats: ConversionStats;
  convertedAt: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
}

export interface MarkerMap {
  [key: string]: string;
}
```

**Step 2: Commit**

```bash
git add src/types/converter.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 3: 核心轉換邏輯

**Files:**
- Create: `src/lib/converter.ts`
- Create: `src/lib/parser.ts`
- Create: `src/lib/stats.ts`

**Step 1: 創建 parser.ts**

```typescript
// src/lib/parser.ts
import type { XmindTopic } from '@/types';

const MARKER_MAP: Record<string, string> = {
  'flag': '🚩',
  'warning': '⚠️',
  'help': '❓',
  'yes': '✅',
  'no': '❌',
  'idea': '💡',
};

export function getMarkerEmoji(topic: XmindTopic): string {
  const markerId = topic.markerRefs?.markerRef?.[0]?.markerId || '';
  const baseMarker = markerId.split('-')[0];
  return MARKER_MAP[baseMarker] || '';
}

export function extractRootTopic(parsed: any): XmindTopic {
  const sheet = parsed?.['xmap-content']?.sheet;
  if (!sheet) {
    throw new Error('Invalid XMind file: no sheet found');
  }
  const topic = Array.isArray(sheet) ? sheet[0].topic : sheet.topic;
  if (!topic) {
    throw new Error('Invalid XMind file: no root topic found');
  }
  return normalizeTopic(topic);
}

function normalizeTopic(topic: any): XmindTopic {
  return {
    id: topic.id || topic['@_id'] || '',
    title: topic.title || topic['@_title'] || '',
    children: topic.children ? { topics: normalizeChildren(topic.children.topics) } : undefined,
    markerRefs: topic.markerRefs || topic['marker-refs'],
  };
}

function normalizeChildren(topics: any): XmindTopic[] {
  if (!topics) return [];
  const array = Array.isArray(topics) ? topics : [topics];
  return array.map(normalizeTopic);
}
```

**Step 2: 創建 stats.ts**

```typescript
// src/lib/stats.ts
import type { ConversionStats, XmindTopic } from '@/types';

export function calculateStats(root: XmindTopic, markdown: string): ConversionStats {
  const nodeCount = countNodes(root);
  const maxDepth = calculateMaxDepth(root);
  const titleCount = countTitles(markdown);
  const words = markdown.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = markdown.length;
  const levelDistribution = calculateLevelDistribution(root);

  return {
    nodeCount,
    maxDepth,
    titleCount,
    wordCount,
    charCount,
    levelDistribution,
  };
}

function countNodes(topic: XmindTopic): number {
  let count = 1;
  if (topic.children?.topics) {
    for (const child of topic.children.topics) {
      count += countNodes(child);
    }
  }
  return count;
}

function calculateMaxDepth(topic: XmindTopic, current: number = 1): number {
  if (!topic.children?.topics || topic.children.topics.length === 0) {
    return current;
  }
  return Math.max(
    ...topic.children.topics.map(child => calculateMaxDepth(child, current + 1))
  );
}

function countTitles(markdown: string): number {
  return (markdown.match(/^#+\s/gm) || []).length;
}

function calculateLevelDistribution(root: XmindTopic): Record<number, number> {
  const distribution: Record<number, number> = {};

  function traverse(topic: XmindTopic, depth: number) {
    distribution[depth] = (distribution[depth] || 0) + 1;
    if (topic.children?.topics) {
      for (const child of topic.children.topics) {
        traverse(child, depth + 1);
      }
    }
  }

  traverse(root, 1);
  return distribution;
}
```

**Step 3: 創建 converter.ts**

```typescript
// src/lib/converter.ts
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { extractRootTopic, getMarkerEmoji } from './parser';
import { calculateStats } from './stats';
import type { ConversionOptions, ConversionResult } from '@/types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

export async function convertXmindToMarkdown(
  file: File,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = performance.now();

  // 讀取並解壓
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const contentXml = await zip.file('content.xml')?.async('string');

  if (!contentXml) {
    throw new Error('Invalid XMind file: content.xml not found');
  }

  // 解析 XML
  const parsed = parser.parse(contentXml);
  const rootTopic = extractRootTopic(parsed);

  // 轉換為 Markdown
  const markdown = topicToMarkdown(rootTopic);

  // 計算統計
  const stats = calculateStats(rootTopic, markdown);

  return {
    markdown,
    stats,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      convertedAt: new Date().toISOString(),
      processingTime: performance.now() - startTime,
    },
  };
}

function topicToMarkdown(topic: any, depth: number = 1): string {
  const lines: string[] = [];

  const title = topic.title || '(無標題)';
  const emoji = getMarkerEmoji(topic);
  const hasChildren = topic.children?.topics?.length > 0;

  // 深度決定格式
  if (depth === 1) {
    lines.push(`# ${emoji}${title}\n`);
  } else if (depth === 2) {
    lines.push(`## ${emoji}${title}\n`);
  } else if (depth === 3) {
    lines.push(`### ${emoji}${title}\n`);
    if (!hasChildren) lines.push('');
  } else {
    const indent = '  '.repeat(depth - 4);
    if (hasChildren) {
      lines.push(`${indent}- ${emoji}${title.trim().replace(/:$/, '')}:`);
    } else {
      lines.push(`${indent}- ${emoji}${title.trim().replace(/:$/, '')}`);
    }
  }

  // 遞歸處理子節點
  if (hasChildren) {
    for (const child of topic.children.topics) {
      lines.push(topicToMarkdown(child, depth + 1));
    }
  }

  return lines.join('\n');
}
```

**Step 4: Commit**

```bash
git add src/lib/converter.ts src/lib/parser.ts src/lib/stats.ts
git commit -m "feat: implement core XMind to Markdown conversion logic"
```

---

## Task 4: 工具函數與 Storage

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/lib/storage.ts`
- Create: `src/lib/download.ts`
- Create: `src/lib/shortcuts.ts`

**Step 1: 創建 utils.ts**

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-TW');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function markdownToHtml(markdown: string): string {
  // 簡單轉換，生產環境可用 marked
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/gim, '<br>');
}
```

**Step 2: 創建 storage.ts**

```typescript
// src/lib/storage.ts
import type { HistoryItem } from '@/types';
import { nanoid } from 'nanoid';

const HISTORY_KEY = 'xmind-converter-history';
const MAX_HISTORY = 10;

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveToHistory(item: Omit<HistoryItem, 'id'>): Promise<void> {
  const history = await getHistory();
  const newItem: HistoryItem = {
    ...item,
    id: nanoid(),
  };

  const updated = [newItem, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  localStorage.removeItem(HISTORY_KEY);
}

export async function deleteFromHistory(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter(item => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}
```

**Step 3: 創建 download.ts**

```typescript
// src/lib/download.ts
import { downloadFile, markdownToHtml } from './utils';
import type { ConversionResult } from '@/types';

export function downloadMarkdown(result: ConversionResult): void {
  downloadFile(
    result.markdown,
    result.metadata.fileName.replace('.xmind', '.md'),
    'text/markdown'
  );
}

export function downloadTxt(result: ConversionResult): void {
  downloadFile(
    result.markdown,
    result.metadata.fileName.replace('.xmind', '.txt'),
    'text/plain'
  );
}

export function downloadHtml(result: ConversionResult): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${result.metadata.fileName}</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    ul { line-height: 1.6; }
  </style>
</head>
<body>
${markdownToHtml(result.markdown)}
</body>
</html>`;

  downloadFile(
    html,
    result.metadata.fileName.replace('.xmind', '.html'),
    'text/html'
  );
}
```

**Step 4: 創建 shortcuts.ts**

```typescript
// src/lib/shortcuts.ts
export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export function registerShortcuts(shortcuts: ShortcutConfig[]): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrlKey ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
      const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;

      if (keyMatch && ctrlMatch && shiftMatch) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}
```

**Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/storage.ts src/lib/download.ts src/lib/shortcuts.ts
git commit -m "feat: add utility functions, storage, and shortcuts"
```

---

## Task 5: 基礎 UI 組件 - Button, Card, ThemeToggle

**Files:**
- Create: `src/components/ui/Button.svelte`
- Create: `src/components/ui/Card.svelte`
- Create: `src/components/ui/ThemeToggle.svelte`
- Create: `src/styles/global.css`

**Step 1: 創建 global.css**

```css
/* src/styles/global.css */
@import 'tailwindcss';

:root {
  --primary: #3b82f6;
  --primary-light: #60a5fa;
  --primary-dark: #2563eb;
}

[data-theme="purple"] {
  --primary: #a855f7;
  --primary-light: #c084fc;
  --primary-dark: #9333ea;
}

[data-theme="green"] {
  --primary: #22c55e;
  --primary-light: #4ade80;
  --primary-dark: #16a34a;
}

[data-theme="pink"] {
  --primary: #ec4899;
  --primary-light: #f472b6;
  --primary-dark: #db2777;
}

[data-theme="orange"] {
  --primary: #f97316;
  --primary-light: #fb923c;
  --primary-dark: #ea580c;
}

html {
  color-scheme: light dark;
}

body {
  @apply bg-background text-foreground;
  transition: background-color 0.3s, color 0.3s;
}

@media (prefers-color-scheme: dark) {
  body {
    @apply bg-gray-900 text-gray-100;
  }
}
```

**Step 2: 創建 Button.svelte**

```svelte
<!-- src/components/ui/Button.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/lib/utils';

  type Variant = 'default' | 'outline' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    children?: Snippet;
    onclick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }

  let {
    variant = 'default',
    size = 'md',
    disabled = false,
    loading = false,
    className = '',
    children,
    onclick,
    type = 'button'
  }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses: Record<Variant, string> = {
    default: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    outline: 'border border-primary text-primary hover:bg-primary/10 focus:ring-primary',
    ghost: 'text-primary hover:bg-primary/10',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };

  const sizeClasses: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const buttonClasses = $derived.by(() =>
    cn(baseClasses, variantClasses[variant], sizeClasses[size], className)
  );

  const isDisabled = $derived(disabled || loading);
</script>

<button
  {type}
  disabled={isDisabled}
  class={buttonClasses()}
  onclick={onclick}
  data-testid="button-component"
>
  {#if loading}
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>
```

**Step 3: 創建 Card.svelte**

```svelte
<!-- src/components/ui/Card.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/lib/utils';

  interface Props {
    className?: string;
    children?: Snippet;
  }

  let { className = '', children }: Props = $props();
</script>

<div class={cn('bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700', className)} data-testid="card-component">
  {#if children}
    {@render children()}
  {/if}
</div>
```

**Step 4: 創建 ThemeToggle.svelte**

```svelte
<!-- src/components/ui/ThemeToggle.svelte -->
<script lang="ts">
  import { cn } from '@/lib/utils';

  interface Props {
    className?: string;
  }

  let { className = '' }: Props = $props();

  let isDark = $state(false);

  function toggle() {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // 檢查系統偏好
  $effect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      isDark = true;
    }
  });
</script>

<button
  onclick={toggle}
  class={cn('p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors', className)}
  data-testid="theme-toggle"
  aria-label="Toggle dark mode"
>
  {#if isDark}
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
    </svg>
  {:else}
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
    </svg>
  {/if}
</button>
```

**Step 5: Commit**

```bash
git add src/components/ui/ src/styles/global.css
git commit -m "feat: add Button, Card, and ThemeToggle components"
```

---

## Task 6: DropZone 上傳組件

**Files:**
- Create: `src/components/ui/DropZone.svelte`

**Step 1: 創建 DropZone.svelte**

```svelte
<!-- src/components/ui/DropZone.svelte -->
<script lang="ts">
  import { cn } from '@/lib/utils';

  interface Props {
    maxSize?: number;
    accept?: string;
    onFileSelect: (file: File) => void;
    disabled?: boolean;
    className?: string;
  }

  let {
    maxSize = 10 * 1024 * 1024,
    accept = '.xmind',
    onFileSelect,
    disabled = false,
    className = ''
  }: Props = $props();

  let isDragging = $state(false);
  let inputElement: HTMLInputElement;

  function handleClick() {
    if (!disabled) {
      inputElement.click();
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) {
      isDragging = true;
    }
  }

  function handleDragLeave() {
    isDragging = false;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    if (disabled) return;

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await handleFile(file);
    }
  }

  async function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await handleFile(file);
    }
    input.value = '';
  }

  async function handleFile(file: File) {
    // 驗證類型
    if (!file.name.endsWith('.xmind')) {
      onFileSelect(new File([], '', { type: 'error' }));
      return;
    }

    // 驗證大小
    if (file.size > maxSize) {
      onFileSelect(new File([], '', { type: 'size-error' }));
      return;
    }

    onFileSelect(file);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={handleClick}
  class={cn(
    'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
    'hover:border-primary hover:bg-primary/5',
    isDragging && 'border-primary bg-primary/10 scale-105',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  )}
  data-testid="dropzone"
>
  <input
    bind:this={inputElement}
    type="file"
    accept={accept}
    onchange={handleInputChange}
    class="hidden"
  />

  <div class="flex flex-col items-center gap-4">
    <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
      <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
      </svg>
    </div>

    <div>
      <p class="text-lg font-medium text-foreground">
        拖放 xmind 檔案到這裡
      </p>
      <p class="text-sm text-muted-foreground mt-1">
        或點擊選擇檔案
      </p>
    </div>

    <p class="text-xs text-muted-foreground">
      支援最大 {formatSize(maxSize)}
    </p>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/components/ui/DropZone.svelte
git commit -m "feat: add DropZone upload component"
```

---

## Task 7: Converter 主轉換器組件

**Files:**
- Create: `src/components/converter/Converter.svelte`
- Create: `src/components/converter/ProgressBar.svelte`
- Create: `src/components/converter/ResultPanel.svelte`

**Step 1: 創建 ProgressBar.svelte**

```svelte
<!-- src/components/converter/ProgressBar.svelte -->
<script lang="ts">
  import { cn } from '@/lib/utils';

  interface Props {
    progress: number;
    className?: string;
  }

  let { progress = 0, className = '' }: Props = $props();
</script>

<div class={cn('w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', className)} data-testid="progress-bar">
  <div
    class="h-full bg-primary transition-all duration-300 ease-out"
    style="width: {progress}%"
  ></div>
</div>
```

**Step 2: 創建 ResultPanel.svelte**

```svelte
<!-- src/components/converter/ResultPanel.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/lib/utils';

  interface Props {
    markdown: string;
    fileName: string;
    onDownload: (format: 'md' | 'txt' | 'html') => void;
    onCopy: () => void;
    className?: string;
  }

  let { markdown, fileName, onDownload, onCopy, className = '' }: Props = $props();

  let viewMode = $state<'raw' | 'preview'>('raw');
  let searchQuery = $state('');

  const filteredMarkdown = $derived.by(() => {
    if (!searchQuery) return markdown;
    const lines = markdown.split('\n');
    return lines
      .filter(line => line.toLowerCase().includes(searchQuery.toLowerCase()))
      .join('\n');
  });
</script>

<div class={cn('space-y-4', className)} data-testid="result-panel">
  <!-- 工具列 -->
  <div class="flex items-center justify-between flex-wrap gap-2">
    <div class="flex items-center gap-2">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜尋..."
        class="px-3 py-1.5 border rounded-md text-sm bg-transparent"
      />
      <div class="flex rounded-md border overflow-hidden">
        <button
          class="px-3 py-1.5 text-sm {viewMode === 'raw' ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
          onclick={() => viewMode = 'raw'}
        >
          原始
        </button>
        <button
          class="px-3 py-1.5 text-sm {viewMode === 'preview' ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
          onclick={() => viewMode = 'preview'}
        >
          預覽
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button onclick={onCopy} class="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
        📋 複製
      </button>
      <button onclick={() => onDownload('md')} class="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
        .md
      </button>
      <button onclick={() => onDownload('txt')} class="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
        .txt
      </button>
      <button onclick={() => onDownload('html')} class="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
        .html
      </button>
    </div>
  </div>

  <!-- 內容區 -->
  <div class="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 min-h-[300px] max-h-[600px] overflow-auto">
    {#if viewMode === 'raw'}
      <pre class="whitespace-pre-wrap text-sm font-mono">{filteredMarkdown}</pre>
    {:else}
      <div class="prose prose-sm max-w-none dark:prose-invert">
        {@html filteredMarkdown
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^- (.*$)/gim, '<li>$1</li>')
          .replace(/\n/gim, '<br>')
        }
      </div>
    {/if}
  </div>
</div>
```

**Step 3: 創建 Converter.svelte**

```svelte
<!-- src/components/converter/Converter.svelte -->
<script lang="ts">
  import type { ConversionResult, HistoryItem } from '@/types';
  import { convertXmindToMarkdown } from '@/lib/converter';
  import { saveToHistory, getHistory, clearHistory } from '@/lib/storage';
  import { downloadMarkdown, downloadTxt, downloadHtml, copyToClipboard } from '@/lib/download';
  import { formatSize } from '@/lib/utils';
  import { nanoid } from 'nanoid';
  import DropZone from '../ui/DropZone.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import ResultPanel from './ResultPanel.svelte';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';

  interface Props {
    maxSize?: number;
  }

  let { maxSize = 10 * 1024 * 1024 }: Props = $props();

  let selectedFile = $state<File | null>(null);
  let isConverting = $state(false);
  let result = $state<ConversionResult | null>(null);
  let error = $state<string | null>(null);
  let progress = $state(0);
  let history = $state<HistoryItem[]>([]);
  let showHistory = $state(true);

  $effect(() => {
    loadHistory();
  });

  async function loadHistory() {
    history = await getHistory();
  }

  async function handleFileSelect(file: File) {
    error = null;
    selectedFile = file;

    // 檢查錯誤標記
    if ((file as any).type === 'error') {
      error = '請上傳 .xmind 檔案';
      return;
    }

    if ((file as any).type === 'size-error') {
      error = `檔案過大 (${formatSize(file.size)} > ${formatSize(maxSize)})`;
      return;
    }

    await convert(file);
  }

  async function convert(file: File) {
    isConverting = true;
    progress = 0;
    result = null;

    try {
      // 模擬進度
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 90);
      }, 150);

      const conversionResult = await convertXmindToMarkdown(file, {
        maxSize,
        includeStats: true,
        includeMeta: true,
        outputFormat: 'md',
      });

      clearInterval(progressInterval);
      progress = 100;

      result = conversionResult;

      // 保存到歷史
      const historyItem: HistoryItem = {
        id: nanoid(),
        fileName: file.name,
        markdown: conversionResult.markdown,
        stats: conversionResult.stats,
        convertedAt: conversionResult.metadata.convertedAt,
      };
      await saveToHistory(historyItem);
      await loadHistory();

    } catch (err) {
      error = err instanceof Error ? err.message : '轉換失敗';
    } finally {
      isConverting = false;
    }
  }

  function handleDownload(format: 'md' | 'txt' | 'html') {
    if (!result) return;

    if (format === 'md') downloadMarkdown(result);
    else if (format === 'txt') downloadTxt(result);
    else downloadHtml(result);
  }

  async function handleCopy() {
    if (!result) return;
    await copyToClipboard(result.markdown);
  }

  function handleBack() {
    result = null;
    selectedFile = null;
    error = null;
    progress = 0;
  }

  async function handleClearHistory() {
    await clearHistory();
    await loadHistory();
  }

  function handleHistoryClick(item: HistoryItem) {
    result = {
      markdown: item.markdown,
      stats: item.stats,
      metadata: {
        fileName: item.fileName,
        fileSize: 0,
        convertedAt: item.convertedAt,
        processingTime: 0,
      },
    };
  }
</script>

<div class="max-w-4xl mx-auto p-4" data-testid="converter">
  {#if !result}
    <!-- 首頁狀態 -->
    <div class="space-y-8">
      <!-- 標題 -->
      <div class="text-center">
        <h1 class="text-4xl font-bold text-foreground mb-2">
          XMind → Markdown Converter
        </h1>
        <p class="text-muted-foreground">
          將心智圖轉換為 Markdown 格式
        </p>
      </div>

      <!-- 錯誤提示 -->
      {#if error}
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      {/if}

      <!-- 上傳區 -->
      {#if !isConverting}
        <DropZone
          maxSize={maxSize}
          onFileSelect={handleFileSelect}
        />
      {:else}
        <Card>
          <div class="p-8 space-y-4">
            <p class="text-center text-lg">轉換中...</p>
            <ProgressBar progress={progress} />
            <p class="text-center text-sm text-muted-foreground">{progress}%</p>
          </div>
        </Card>
      {/if}

      <!-- 歷史記錄 -->
      {#if history.length > 0}
        <Card>
          <div class="p-4 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">最近轉換</h2>
              <button
                onclick={handleClearHistory}
                class="text-sm text-red-500 hover:text-red-600"
              >
                清除全部
              </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {#each history as item (item.id)}
                <button
                  onclick={() => handleHistoryClick(item)}
                  class="p-3 text-left border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p class="text-sm font-medium truncate">{item.fileName}</p>
                  <p class="text-xs text-muted-foreground mt-1">
                    {new Date(item.convertedAt).toLocaleDateString()}
                  </p>
                </button>
              {/each}
            </div>
          </div>
        </Card>
      {/if}
    </div>
  {:else}
    <!-- 結果狀態 -->
    <div class="space-y-6">
      <!-- 標題列 -->
      <div class="flex items-center justify-between">
        <button
          onclick={handleBack}
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          返回
        </button>
        <h2 class="text-lg font-semibold truncate">{result.metadata.fileName}</h2>
        <div class="w-16"></div>
      </div>

      <!-- 統計面板 -->
      <Card>
        <div class="p-4">
          <h3 class="text-sm font-semibold mb-3">統計資訊</h3>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p class="text-2xl font-bold text-primary">{result.stats.nodeCount}</p>
              <p class="text-xs text-muted-foreground">節點數</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-primary">{result.stats.maxDepth}</p>
              <p class="text-xs text-muted-foreground">最大深度</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-primary">{result.stats.titleCount}</p>
              <p class="text-xs text-muted-foreground">標題數</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-primary">{(result.stats.wordCount / 1000).toFixed(1)}K</p>
              <p class="text-xs text-muted-foreground">字數</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-primary">{result.metadata.processingTime.toFixed(0)}ms</p>
              <p class="text-xs text-muted-foreground">處理時間</p>
            </div>
          </div>
        </div>
      </Card>

      <!-- 結果面板 -->
      <ResultPanel
        markdown={result.markdown}
        fileName={result.metadata.fileName}
        onDownload={handleDownload}
        onCopy={handleCopy}
      />
    </div>
  {/if}
</div>
```

**Step 4: Commit**

```bash
git add src/components/converter/
git commit -m "feat: add Converter, ProgressBar, and ResultPanel components"
```

---

## Task 8: Layout 和 Pages

**Files:**
- Create: `src/layouts/Layout.astro`
- Create: `src/components/layout/Header.svelte`
- Create: `src/components/layout/Footer.svelte`
- Create: `src/pages/index.astro`

**Step 1: 創建 Header.svelte**

```svelte
<!-- src/components/layout/Header.svelte -->
<script lang="ts">
  import ThemeToggle from '../ui/ThemeToggle.svelte';
</script>

<header class="border-b border-gray-200 dark:border-gray-800">
  <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <div>
        <h1 class="text-lg font-semibold">XMind → Markdown</h1>
        <p class="text-xs text-muted-foreground">心智圖轉換工具</p>
      </div>
    </div>

    <ThemeToggle />
  </div>
</header>
```

**Step 2: 創建 Footer.svelte**

```svelte
<!-- src/components/layout/Footer.svelte -->
<footer class="border-t border-gray-200 dark:border-gray-800 mt-auto">
  <div class="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
    <p>© 2025 XMind → Markdown Converter</p>
    <p class="mt-1">
      純前端處理，您的檔案不會上傳到任何伺服器
    </p>
  </div>
</footer>
```

**Step 3: 創建 Layout.astro**

```astro
---
// src/layouts/Layout.astro
import '../../styles/global.css';
import Header from '../components/layout/Header.svelte';
import Footer from '../components/layout/Footer.svelte';

interface Props {
  title?: string;
  description?: string;
}

const {
  title = 'XMind → Markdown Converter',
  description = '將 XMind 心智圖轉換為 Markdown 格式'
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="description" content={description} />
    <meta name="generator" content={Astro.generator} />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />

    <title>{title}</title>
  </head>
  <body class="min-h-screen flex flex-col">
    <Header client:load />

    <main class="flex-1">
      <slot />
    </main>

    <Footer />
  </body>
</html>
```

**Step 4: 創建 index.astro**

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Converter from '../components/converter/Converter.svelte';
---

<Layout title="XMind → Markdown Converter">
  <Converter client:load />
</Layout>
```

**Step 5: Commit**

```bash
git add src/layouts/ src/components/layout/ src/pages/
git commit -m "feat: add Layout, Header, Footer, and index page"
```

---

## Task 9: PWA 圖示與配置

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable.png`
- Create: `public/manifest.json`

**Step 1: 創建簡單的 SVG 圖示 (臨時，可後續替換)**

```bash
# 創建簡單的 SVG 圖示
cat > public/icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#3b82f6"/>
  <path d="M30 35h40M30 50h40M30 65h25" stroke="white" stroke-width="4" stroke-linecap="round"/>
</svg>
EOF

# 使用命令行工具轉換為 PNG (需要 ImageMagick)
convert public/icon.svg -resize 192x192 public/icons/icon-192.png
convert public/icon.svg -resize 512x512 public/icons/icon-512.png
convert public/icon.svg -resize 512x512 public/icons/icon-maskable.png
```

**Step 2: 如果沒有 ImageMagick，創建臨時 manifest.json**

```json
{
  "name": "XMind → Markdown Converter",
  "short_name": "XMind MD",
  "description": "專業心智圖轉換工具",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "display": "standalone",
  "icons": [
    {
      "src": "/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

**Step 3: Commit**

```bash
git add public/
git commit -m "feat: add PWA icons and manifest"
```

---

## Task 10: 最終測試與部署

**Files:**
- Modify: `README.md` (更新)
- Create: `.github/workflows/deploy.yml` (可選)

**Step 1: 更新 README.md**

```markdown
# XMind → Markdown Converter

專業的心智圖轉換工具，將 XMind 檔案轉換為 Markdown 格式。

## 功能

- ✅ 拖放上傳 XMind 檔案
- ✅ 即時轉換為 Markdown
- ✅ 原始與預覽兩種顯示模式
- ✅ 語法搜尋過濾
- ✅ 多格式下載 (.md, .txt, .html)
- ✅ 轉換統計資訊
- ✅ 深色模式支援
- ✅ 轉換歷史記錄
- ✅ PWA 支援
- ✅ 純前端處理，隱私安全

## 技術棧

- **Astro 5** - 靜態站點生成器
- **Svelte 5** - 響應式 UI 組件
- **Tailwind CSS v4** - 實用優先的 CSS 框架
- **jszip** - ZIP 解壓
- **fast-xml-parser** - XML 解析

## 開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 構建
npm run build

# 預覽
npm run preview
```

## 部署

### GitHub Pages

```bash
npm run build
# 將 dist 目錄部署到 gh-pages 分支
```

### Cloudflare Pages

```bash
npm run build
# 上傳 dist 目錄到 Cloudflare Pages
```

## 本地使用

1. 打開 [xmind-markdown](https://yourusername.github.io/xmind-markdown/)
2. 拖放 .xmind 檔案到上傳區
3. 等待轉換完成
4. 預覽或下載 Markdown

## 隱私

所有處理都在您的瀏覽器中完成，您的檔案不會上傳到任何伺服器。

## 授權

MIT License
```

**Step 2: 本地測試**

```bash
# 安裝依賴
npm install

# 開發模式測試
npm run dev

# 在瀏覽器打開 http://localhost:4321
# 測試上傳、轉換、下載功能
```

**Step 3: 構建測試**

```bash
# 構建生產版本
npm run build

# 預覽構建結果
npm run preview
```

**Step 4: 檢查輸出**

```bash
# 檢查 dist 目錄
ls -la dist/

# 應該包含：
# - index.html
# - assets/ (JS, CSS)
# - icons/ (PWA 圖示)
```

**Step 5: Commit 最終版本**

```bash
git add README.md
git commit -m "docs: update README with deployment instructions"
```

---

## 完成檢查清單

在聲稱完成前，確認以下項目：

- [ ] `npm run dev` 可以正常啟動
- [ ] 可以上傳 .xmind 檔案
- [ ] 拖放功能正常
- [ ] 轉換後顯示 Markdown
- [ ] 下載按鈕正常工作
- [ ] 複製功能正常
- [ ] 深色模式切換正常
- [ ] 歷史記錄功能正常
- [ ] 搜尋過濾功能正常
- [ ] `npm run build` 成功
- [ ] 構建後的 dist 目錄包含所有必要檔案
- [ ] PWA manifest 正確

---

**計劃版本：** 1.0
**總預估時間：** 4-6 小時
**最後更新：** 2025-02-28
