# XMind → Markdown Converter - 設計文檔

**日期：** 2025-02-28
**狀態：** ✅ 已批准
**設計者：** Claude (CTO)

---

## 1. 專案概述

### 1.1 目標

建立一個「過度設計」的範例專案，展示現代前端技術的最佳實踐。核心功能是將 XMind 心智圖檔案轉換為 Markdown 格式。

### 1.2 技術棧

| 類別 | 技術 | 版本 |
|------|------|------|
| 框架 | Astro | 5.17.3 |
| UI 組件 | Svelte | 5.51.2 |
| 樣式 | Tailwind CSS | 4.1.18 |
| 動畫 | Framer Motion | 11.0.0 |
| PWA | @astrojs/pwa | 0.3.0 |
| 解壓 | jszip | 3.10.1 |
| 解析 | fast-xml-parser | 4.5.0 |
| 渲染 | marked | 15.0.0 |
| 高亮 | shiki | 2.0.0 |

---

## 2. 專案結構

```
xmind-markdown/
├── public/
│   ├── icons/                  # PWA 圖示
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable.png
│   ├── manifest.json           # PWA 配置
│   └── og-image.png            # SEO 圖片
├── src/
│   ├── components/
│   │   ├── ui/                 # 基礎 UI 組件
│   │   │   ├── Button.svelte
│   │   │   ├── Card.svelte
│   │   │   ├── DropZone.svelte         # 拖放上傳
│   │   │   ├── ThemeToggle.svelte      # 主題切換
│   │   │   ├── ProgressBar.svelte      # 進度條
│   │   │   ├── Toast.svelte            # 通知
│   │   │   └── ColorPicker.svelte      # 顏色選擇
│   │   ├── converter/           # 轉換相關
│   │   │   ├── Converter.svelte         # 主轉換器
│   │   │   ├── ResultPanel.svelte       # 結果面板
│   │   │   ├── StatsCard.svelte         # 統計卡片
│   │   │   ├── DistributionChart.svelte # 分佈圖
│   │   │   └── HistoryPanel.svelte      # 歷史記錄
│   │   ├── editor/              # 編輯器
│   │   │   ├── MarkdownPreview.svelte   # Markdown 預覽
│   │   │   ├── CodeHighlight.svelte     # 語法高亮
│   │   │   └── SearchBar.svelte         # 搜尋
│   │   └── layout/
│   │       ├── Header.svelte
│   │       ├── Footer.svelte
│   │       └── MainLayout.astro
│   ├── lib/
│   │   ├── converter.ts         # 核心轉換邏輯
│   │   ├── parser.ts            # XMind XML 解析
│   │   ├── stats.ts             # 統計計算
│   │   ├── storage.ts           # localStorage 管理
│   │   ├── download.ts          # 下載功能
│   │   ├── shortcuts.ts         # 快捷鍵
│   │   └── utils.ts             # 工具函數
│   ├── layouts/
│   │   └── Layout.astro         # 主佈局
│   ├── pages/
│   │   └── index.astro          # 首頁
│   ├── styles/
│   │   └── global.css           # 全域樣式
│   └── types/
│       └── converter.ts         # TypeScript 類型
├── astro.config.mjs
├── tailwind.config.js
├── vite-pwa.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. 核心功能

### 3.1 必要功能

| 功能 | 說明 |
|------|------|
| 上傳 xmind | 拖放 + 點擊上傳 |
| 檔案驗證 | 類型 + 大小限制 (預設 10MB) |
| ZIP 解壓 | 使用 jszip |
| XML 解析 | 使用 fast-xml-parser |
| Markdown 轉換 | 遞歸遍歷節點 |
| 結果顯示 | 原始 + 預覽兩種模式 |
| 下載 | .md / .txt / .html |

### 3.2 華麗功能

| 功能 | 說明 |
|------|------|
| 🌙 深色模式 | 系統偏好 + 手動切換 |
| ✨ 轉換動畫 | 粒子特效 + 進度條 |
| 📋 複製按鈕 | 一鍵複製到剪貼板 |
| 📊 統計面板 | 節點數、字數、層級、分佈圖 |
| 🕐 時間戳 | 自動記錄轉換時間 |
| 💾 歷史記錄 | localStorage 儲存最近 10 筆 |
| 🔍 搜尋過濾 | 即時搜尋關鍵字 |
| 📱 PWA | 可安裝到桌面 |
| ⌨️ 快捷鍵 | Ctrl+C/S/F/H 等快捷鍵 |
| 🎨 主題色 | 5 種顏色主題可切換 |
| 📊 圖表視覺化 | Recharts 圓餅圖 |
| 🔄 批次轉換 | 支援多檔案上傳 |
| 🔔 Toast 通知 | 成功/錯誤提示 |

---

## 4. 資料流

```
┌─────────────┐
│ 用戶上傳    │ (拖放/點擊)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 檔案驗證    │ (類型、大小)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 讀取 ArrayBuffer │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ JSZip 解壓  │ → content.xml
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ XMLParser   │ → JavaScript Object
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 提取 Root Topic │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 遞歸轉換    │ (深度優先)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 產生 Markdown │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ 顯示結果 + 統計         │
├─────────────────────────┤
│ ├─ 原始 Markdown        │
│ ├─ 渲染預覽             │
│ ├─ 統計面板             │
│ └─ 下載/複製按鈕        │
└─────────────────────────┘
       │
       ▼
┌─────────────┐
│ 保存歷史    │ (localStorage)
└─────────────┘
```

---

## 5. TypeScript 類型

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
```

---

## 6. UI 設計

### 6.1 主題色系

```css
:root {
  --primary: #3b82f6;
  --primary-light: #60a5fa;
  --primary-dark: #2563eb;
}

[data-theme="purple"] { --primary: #a855f7; }
[data-theme="green"] { --primary: #22c55e; }
[data-theme="pink"] { --primary: #ec4899; }
[data-theme="orange"] { --primary: #f97316; }
```

### 6.2 響應式斷點

```css
/* Mobile First */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### 6.3 動畫規格

| 元素 | 動畫 | 時間 |
|------|------|------|
| 拖放進入 | scale + border-color | 200ms |
| 轉換進度 | width 0→100% | 1500ms |
| 結果淡入 | opacity + y | 300ms |
| 按鈕點擊 | scale 0.95→1 | 100ms |
| Toast 滑入 | x -100%→0 | 300ms |
| 主題切換 | CSS transition | 300ms |

---

## 7. PWA 配置

```typescript
export default defineConfig({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'service-worker.ts',
  includeAssets: ['icons/*.png'],
  manifest: {
    name: 'XMind → Markdown Converter',
    short_name: 'XMind MD',
    description: '專業心智圖轉換工具',
    theme_color: '#3b82f6',
    background_color: '#ffffff',
    display: 'standalone',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
});
```

---

## 8. 快捷鍵

| 按鍵 | 功能 |
|------|------|
| Ctrl/Cmd + C | 複製結果 |
| Ctrl/Cmd + S | 下載 Markdown |
| Ctrl/Cmd + Shift + S | 下載 TXT |
| Ctrl/Cmd + H | 切換歷史面板 |
| Ctrl/Cmd + F | 聚焦搜尋 |
| Ctrl/Cmd + / | 切換深色模式 |
| Escape | 返回首頁 |

---

## 9. 錯誤處理

| 錯誤類型 | 處理方式 |
|----------|----------|
| 檔案過大 | Toast 提示 + 建議壓縮 |
| 格式錯誤 | 錯誤邊框 + 支援格式列表 |
| 解析失敗 | 錯誤訊息 + 回報連結 |
| 網路錯誤 | 自動重試 3 次 |

---

## 10. 部署

### 10.1 部署目標

**GitHub Pages** - 靜態託管

### 10.2 構建命令

```bash
# 開發
npm run dev

# 構建
npm run build

# 預覽
npm run preview
```

### 10.3 部署流程

```bash
# 1. 構建
npm run build

# 2. 部署到 GitHub Pages
npm run deploy

# 或手動
ghp-import -n dist -p
git push origin gh-pages
```

---

## 11. 測試策略

### 11.1 單元測試

- 核心轉換邏輯
- 統計計算
- 工具函數

### 11.2 元件測試

- Svelte 組件渲染
- 用戶交互
- 狀態管理

### 11.3 E2E 測試

- 完整轉換流程
- 拖放上傳
- 下載功能

---

## 12. 效能目標

| 指標 | 目標 |
|------|------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| 轉換時間 | < 3s (10MB 檔案) |
| 首次渲染 | < 1s |

---

## 13. 安全考量

- 所有處理在客戶端完成
- 檔案不會上傳到任何伺服器
- localStorage 僅存儲必要資料
- CSP headers 設置

---

## 14. 未來擴展

- [ ] 支援更多心智圖格式 (FreeMind, MindManager)
- [ ] 雲端同步
- [ ] 協作編輯
- [ ] AI 總結生成
- [ ] 匯出為 PDF
- [ ] 批次處理 API

---

**文檔版本：** 1.0
**最後更新：** 2025-02-28
