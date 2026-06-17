# Component Patterns（靜態 Astro PWA）

> 本專案元件邊界與資料流約定。改寫自框架 cloudflare 版，移除後端/多租戶概念。

## 邏輯分層

| 邏輯類型 | 位置 |
|---|---|
| 純轉換邏輯（XMind↔MD） | `src/lib/*.ts`（無 DOM 依賴，可被 Vitest 直接測） |
| 使用者互動 / 即時狀態 | Svelte components（`$state` / `$derived` runes） |
| 靜態版面 | Astro template / Layout |
| 全域腳本（SW 註冊、theme） | `src/layouts/Layout.astro` 的 `<script>` |

## 約定

- [MUST] 轉換函式為純模組具名匯出，由 Svelte 元件直接 `import`（Vite 自動 hash，[NEVER] 用 `window.*` 全域間接）。
- [MUST] 預覽樹狀取自 converter 回傳的 `tree` 結構，[NEVER] 從 markdown 字串反解。
- [MUST] 元件內 `{@html}` 注入的內容 [MUST] 經過 sanitizer（目前 markdownToHtml 為手寫 renderer，D2 guard 追蹤其使用，目標引入 DOMPurify）。
- [ALWAYS] Svelte 5 runes（`$state`/`$derived`/`$props`/`$effect`），[NEVER] 用舊版 `let` reactivity。
- [MUST] PWA：修改 `src/sw.ts` 後確認 `clients.claim` + `Layout.astro` update toast 仍一致。

## Hydration

- 預設 `client:load`（互動元件）。靜態內容不 hydrate。
