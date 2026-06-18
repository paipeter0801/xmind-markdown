# CHANGELOG

> Fix→Lock 規則（04-HARDENING §4.a1）：每條 `### Fixed` bullet [MUST] 結尾攜帶
> `(locked: D##)`（對應 `src/lib/guards.test.ts` 的 guard）或 `(human: <理由>)`。
> 未攜帶 tag = D17 fail。

## [2026-06-18] — AI Help（freemium 引擎段，不含付費）

### Added
- **AI Help 模式**（第三個輸入分頁）：使用者輸入主題 + 純文字 → LLM 生成 outline markdown → 可下載 `.xmind` / `.md`。沿用無損往返管線（AI 只吐 outline md，既有 MD→XMind 接手）。
- **獨立 Cloudflare Worker**（`worker/`，雙站 B 模式）：Hono + Zod + per-origin CORS 白名單 + Workers AI（qwen3-30b，仿 murmurnote）+ 格式驗證/修復/重試 + in-memory 限流。10 個 worker 測試（prompt/outline/ratelimit 純函數）。
- 前端 `AiInput.svelte`（UI 仿 MarkdownInput）+ `ai-client.ts`/`ai-config.ts`。明確隱私提示：AI 只吃本模式輸入的文字，不碰上傳的 `.xmind`。
- `worker/DEPLOY.md`（你的 wrangler deploy 步驟、allowed_origins、[ai] binding）。

### Human Queue
- AI endpoint 需你部署 worker 並填 `AI_API_URL` 才啟用（程式碼已就緒、未填則顯示「未啟用」、免費轉換不受影響）。 (carry)
- 付費/贊助制（LemonSqueezy，參考 jp-heartgui-dev）為後續，本階段未接。 (carry)
- Worker typecheck/test 在 `worker/` 子目錄獨立執行；主 tsconfig 已 exclude worker/。 (human: 雙 toolchain 隔離)

---

## [2026-06-18] — 無損往返 XMind↔MD（商業級匯出/匯入重做）

### Added
- XMind→MD 匯出 `exportMode`：`outline`（預設，root=# + 後代縮排巢狀 bullet，**任意深度無斷崖**）/ `headings`（h1-h6 用滿 + 深層 bullet）。
- 共享 marker 模組 `lib/markers.ts`（id↔emoji 雙向，最長匹配/碰撞優先序），雙向一致。
- 匯出 rich emit：備註（`📝 ` 子 bullet）、連結（inline `[text](url)`）、標籤（`#tag`）、marker emoji、圖片（`![](path)`）——先前全部丟失。
- 匯入 `markdown-parser.ts` 重寫：**縮排感知** list→巢狀 children（往返關鍵）、還原 marker/label/link/note、`📝 `/`![]()` sentinel 附加回父節點。
- `xmind-builder.ts` emit marker-refs / labels / notes（plain-text）進 XML。
- `round-trip.test.ts`：MD→XMind→MD 雙向無損測試（結構/深度/markers/labels/links/notes 簽章等價 + level-7 無斷崖 + 節點數守恆）。

### Fixed
- 匯出端無聲丟失 notes/links/labels/attachments（只 emit title+marker）→ 補齊 rich emit。 (human: 行為修復，由 round-trip.test.ts 防回歸，非靜態 pattern guard)
- `client-converter` XMLParser `isArray` 把 marker-refs/labels/notes 強制成陣列，但 extract* 當單一物件存取 → 全部取不到（既有潛伏 bug，舊匯出丟棄這些欄目所以從未爆）。修正為容器保持單一物件。 (human: extraction bug，round-trip.test.ts 防回歸)
- `extractLinks` 只讀 topic.href 屬性，讀不到 builder 產生的 `<xhtml:link xlink:href>` → 增援該形狀。 (human: extraction bug，round-trip.test.ts 防回歸)
- `extractNotes`：plain-text 為陣列時 join 還原換行。 (human: extraction bug，round-trip.test.ts 防回歸)
- 深度斷崖：depth 5+ flush-left bullet（失父層脈絡、浪費 h5/h6）→ outline 無斷崖 / headings 用滿 h1-h6。 (human: 匯出表現修復)

### Locked
- 無損往返由 `round-trip.test.ts`（CI 每次 `npm test` 必跑）守護；結構+markers+labels+links+notes 雙向等價。

### Human Queue
- 已知 markdown 硬限制：多行備註以 ` / ` 編碼（單行完全無損）；附件二進位內容仍需 .xmind（MD 僅留參考）；headings 模式深度>6 非完全無損（outline 才是無損預設）。 (carry)

---

## [2026-06-18] — Hardening cycle 1（執行 04，消化 TODO-REVIEW）

### Fixed
- 刪除死碼 `lib/storage.ts` / `lib/shortcuts.ts` / `lib/index.ts` barrel（零消費者，barrel-reexport 模式重演）。 (locked: D8)
- 收窄 `TableOfContents.svelte` 的 `e as any` → `MouseEvent | KeyboardEvent`，D1 預算降為 0。 (locked: D1)
- 預覽 `{@html}` 改用單一 renderer（marked + DOMPurify 淨化），移除 `Converter.svelte` 手寫 regex renderer 與 `download.ts` 重複實作。 (locked: D9)
- 補 `client-converter.ts` 端到端測試（XMind→MD 核心，先前零直接測試）。 (human: 補測試覆蓋，非靜態模式可鎖)
- 採用跨專案 G5：阻擋可重生測試產物（`.vitest-result.json` 等）誤提交 + `.gitignore`。 (locked: G5)
- 更新 `README.md` 反映實際棧（移除從未使用的 Shiki、虛構 editor/ 目錄）+ guard 概覽。 (human: 文檔更新)

### Locked
- D8（dead-module/barrel guard）、D9（single-renderer guard）、G5（test-artifact hygiene）；D1 預算 1→0、D2 注入點現已淨化。

### Human Queue
- L-001：Header/Footer 仍 `client:load`（Footer 可靜態化，低優先）。 (carry)

---

## [2026-06-18] — 採用工程框架（適應版）+ 近期重構

### Added
- 採用共享工程框架（適應版）：`01-CLAUDE.md` 憲法、`02`–`07` 流程、`THINKING.md`、`ENFORCEMENT_REGISTRY.md`、`references/`。
- `src/lib/guards.test.ts`：架構與防禦 guard（D1–D7 防禦矩陣 + D17–D21 meta/artifact，現況 PASS）。
- CI/CD：`Makefile`、`.pre-commit-config.yaml`、`.git/hooks/pre-push`、`.github/workflows/main.yml`（GitHub-hosted）、`.secrets.baseline`。
- 根 `CLAUDE.md`（Engineering Contract + 框架指引）。
- 預覽樹狀模式：`TreeView.svelte`（可摺疊、Document/Tree 切換、展開/收合全部、預設展開層數）。

### Fixed
- client-converter 改為 Svelte 直接 import，移除 esbuild `build:client`、`public/client-converter.js`、`window.XmindConverter` 全域間接、手動 `?v=` 快取戳記。 (locked: D7)
- sw.ts 加 `/// <reference lib="webworker" />` + `declare let self`，消除 skipWaiting 與連帶 registerRoute 型別錯誤。 (human: 型別修正，行為不變，無對應靜態 guard)
- sw.ts 加 `clients.claim` + `Layout.astro` update toast，解決 PWA 更新卡舊版。 (human: 行為/UX 改善，非靜態可鎖模式)
- 移除未用依賴 shiki/recharts/framer-motion。 (locked: D4)
- 移除重複的 lib/converter.ts + parser.ts + stats.ts（測試假信心來源）。 (human: 死碼刪除，由 D4 間接防回潮)
- `npm run deploy` 腳本修正 `gh-pages-add` → `gh-pages -d dist`。 (human: 工具指令修正)

### Locked
- D1 `as any` 預算 guard、D2 `{@html}` 淨化追蹤、D4 未用依賴、D5 文檔路徑、D6 console 預算、D7 build/script gate。
