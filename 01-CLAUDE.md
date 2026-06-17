# 01-CLAUDE — 憲法：靜態 Astro PWA（XMind to Markdown Converter）

> 強制類別（guard/artifact/human）見 `ENFORCEMENT_REGISTRY.md`，由 D18 meta-guard 驗證。
> 本專案是純前端靜態 PWA，部署於 GitHub Pages。**無後端、無 DB、無 server runtime、無多租戶、無 i18n**。
> 憲法依實際棧改寫，[NEVER] 記錄不存在的功能（框架鐵律）。

---

## 0 — [MUST] 強制合規聲明

**執行任何 git/CI 命令前**對照此表。匹配即中止，修復根本原因。

| 禁止模式 | 嚴重性 | 正確操作 |
|---|---|---|
| `git commit/push --no-verify` | CRITICAL | 修復 hook 失敗，無 flag 重新提交 |
| `git push --force` 到 main/gh-pages | BLOCKED | 永遠拒絕，即使使用者要求 |
| CI 後省略 `make clean` | HIGH | 保留清理慣例（GitHub-hosted runner 仍清） |
| `2>/dev/null \|\| true` 吞噬 lint 輸出 | HIGH | 僅在工具不存在時抑制 |
| 提交 `.env`/`*.pem`/`*.key`/`*credentials*` | CRITICAL | 取消暫存，加 `.gitignore` |

---

## 1 — [MUST] 技術棧宣告

| 技術 | 技術棧 | 版本釘選 |
|---|---|---|
| 類型 | 純前端靜態 PWA（無 server runtime） | — |
| Framework | Astro 5（islands, SSR off） + Svelte 5（runes only） | `package.json` |
| Styling | Tailwind CSS 4 | `package.json` |
| 轉換核心 | `src/lib/client-converter.ts`（jszip + fast-xml-parser，純瀏覽器） | 唯一來源 |
| Markdown | `marked`（utils/download 用）；preview 為手寫 renderer（保 TOC heading-id） | `package.json` |
| Testing | Vitest | `package.json` |
| PWA | vite-plugin-pwa + workbox；`src/sw.ts` | — |
| 部署 | GitHub Pages（`gh-pages` 分支，`npm run deploy`） | — |

[MUST] 寫任何程式碼前先檢查 `package.json`。[NEVER] 引入後端框架（Hono/Express）、DB（D1/Drizzle/SQL）、server runtime — 本專案不是那種架構。

---

## 2 — [MUST] 轉換邏輯單一來源

| 規則 | 指令 |
|---|---|
| XMind→MD 邏輯只在 `src/lib/client-converter.ts` | [MUST] [NEVER] 重新引入平行實作 |
| Converter 由 Svelte 元件直接 `import` 具名匯出 | [MUST] [NEVER] 用 `window.*` 全域間接 |
| 預覽樹狀取自 converter 回傳的 `tree` 結構 | [MUST] [NEVER] 從 markdown 字串反解 |
| 轉換函式為純模組（無 DOM 依賴） | [ALWAYS] 可被 Vitest 直接測 |

---

## 3 — [MUST] 型別安全標準

| 規則 | 指令 |
|---|---|
| 禁止 `as any` | [MUST] 用 type assertion chain 或 narrowed interface |
| `as unknown as ConcreteType` 優先於 `as any` | [ALWAYS] |
| `tsc --noEmit` + `astro check` 必須 0 error | [MUST] |
| Service Worker (`src/sw.ts`) 用 `/// <reference lib="webworker" />` + `declare let self` | [MUST] 避免 DOM lib 誤型 SW |

---

## 4 — [MUST] 前端安全（XSS / 淨化）

| 規則 | 指令 |
|---|---|
| `{@html}` 注入的內容必須經 sanitizer | [MUST] 目標 DOMPurify；目前手寫 renderer 由 D2 追蹤 |
| 不直接將使用者檔案標題以未淨化 HTML 注入 DOM | [NEVER] |
| `sanitizeTitle` 至少跳脫 `<>` | [MUST]（現況） |

> 本專案輸入是使用者自己的檔案，風險較低，但 `{@html}` 配未淨化內容是會咬人的模式，D2 guard 追蹤其使用數（只減不增）。

---

## 5 — [MUST] PWA / Service Worker 規範

| 規則 | 指令 |
|---|---|
| SW 更新：`skipWaiting` + `clients.claim` + `Layout.astro` update toast | [MUST] 使用者看得到更新 |
| 靜態資源由 Vite content-hash，[NEVER] 手動 `?v=` 戳記 | [MUST] |
| 修改 `src/sw.ts` 後確認註冊流程一致 | [ALWAYS] |
| `manifest.json` / 圖示路徑必須存在 | [MUST] |

---

## 6 — [MUST] 依賴衛生

| 規則 | 指令 |
|---|---|
| `package.json` 依賴必須被實際引用 | [MUST] D5 guard 追蹤未用依賴 |
| 安裝新套件前先詢問 | [MUST] |
| [NEVER] 重新加入已移除的未用依賴（shiki/recharts/framer-motion） | [NEVER] |

---

## 7 — [MUST] 防禦性編程

- [MUST] parse 函式先 `typeof` 檢查，`JSON.parse` 包 try-catch
- [MUST] nullable 參數用 type guards，存取前檢查存在性（`?.` / `?? []`）
- [MUST] Svelte `$effect` 處理 props 為 undefined，提供默認值
- [MUST] 非同步操作三態：loading / success / error
- [ALWAYS] 可選鏈與空值合併（`?.` / `??`）

---

## 8 — [MUST] 元件邊界與資料流

| 邏輯類型 | 位置 |
|---|---|
| 純轉換邏輯 | `src/lib/*.ts` |
| 使用者互動 / 即時狀態 | Svelte components（runes） |
| 靜態版面 | Astro template / Layout |
| 全域腳本（SW 註冊、theme） | `Layout.astro` `<script>` |

詳細模式見 `references/COMPONENT_PATTERNS.md`。

---

## 9 — [MUST] 平台已知限制

| 限制 | 解決方案 |
|---|---|
| Astro islands 預設 `client:load`，留意互動元件打包體積 | 按需 `client:visible` |
| `{@html}` 在 Svelte 不自動淨化 | 自行 sanitize |
| Service Worker 被 DOM lib 誤型 | webworker reference + `declare let self` |
| GitHub Pages 為 project site，資源路徑需 base prefix | 已設定於 astro.config |
| PWA precache 可能讓使用者卡舊版 | skipWaiting + clients.claim + update toast |

---

## 10 — 禁止事項

| 模式 | 嚴重性 | 替代方案 |
|---|---|---|
| 重新引入平行 converter 實作 | CRITICAL | 只用 `client-converter.ts` |
| `as any` | HIGH | assertion chain / narrowed interface |
| `{@html}` 未淨化注入 | HIGH | sanitize |
| `window.*` 全域間接 converter | HIGH | 直接 `import` |
| 從 markdown 反解樹狀 | HIGH | 用 converter `tree` |
| 手動 `?v=` 快取戳記 | MEDIUM | Vite content-hash |
| 引入後端/DB 框架 | CRITICAL | 本專案不是那種架構 |
| 空白 catch 吞錯 | HIGH | 處理 + 記錄 |
| 重新加回未用依賴 | MEDIUM | 移除清單見 §6 |
| 低品質 agent 執行架構決策 / 安全審計 | HIGH | ≥ opus（見 02 §3） |

---

**COMPLIANCE ACKNOWLEDGEMENT:** Bypass Detection Protocol in Section 0 is now active.
