# TODO-REVIEW — 首次審計（2026-06-18）

> 來源：執行 `03-DOC-AND-CODE-REVIEW.md` Phase 1–4。記錄 IS（現況），非 SHOULD BE。
> 證據皆附 file:line。問題分 BUG / TECH_DEBT / MISSING_TEST / MISSING_DOC / HARDEN，三級風險。
> getkm 參考：跨專案 G5（test-artifact hygiene）、BUILD-SPEC 一致性審計模式。

---

## Critical
| ID | 類型 | 問題 | 上下文（證據） | 建議 | 狀態 |
|---|---|---|---|---|---|
| — | — | 無 | 無主動崩潰 bug、無 active 安全破口 | — | — |

> 說明：`{@html}` 未淨化（H-001）風險因輸入為使用者自有檔案而降，列 High 而非 Critical。

---

## High
| ID | 類型 | 問題 | 上下文（證據） | 建議 | 狀態 |
|---|---|---|---|---|---|
| H-001 | HARDEN | 預覽 `{@html}` 注入未淨化內容 | `src/components/converter/ResultPanel.svelte:258`；內容來自 `Converter.svelte:33` 手寫 `markdownToHtml`（regex，無 sanitizer） | 引入 DOMPurify 淨化後再注入；統一 renderer（見 M-002）；D2 guard 預算現況=1，目標降為 0 | OPEN |
| H-002 | MISSING_TEST | XMind→MD 核心 converter 無直接測試 | `src/lib/client-converter.ts`（app 心臟，~620 行）無對應 `.test.ts`；僅 `guards.test.ts` 以字串引用路徑，非真正測試 | 為 `convertXmindToMarkdown` 補 Vitest：ZIP→content.xml→tree→markdown 端到端 + 邊界（多 sheet、深層、marker、notes、links） | OPEN |

---

## Medium
| ID | 類型 | 問題 | 上下文（證據） | 建議 | 狀態 |
|---|---|---|---|---|---|
| M-001 | TECH_DEBT | 死碼：`storage.ts` / `shortcuts.ts` / `index.ts` barrel 全無消費者 | `grep`：storage/shortcuts 僅被 `index.ts:44,49,95,100` re-export；`index.ts` barrel 被 0 處 import（元件皆直接 `import '../../lib/<module>'`） | 刪除三檔（同前次 converter 去重模式）；UI 用 0 處，零運作風險 | OPEN |
| M-002 | TECH_DEBT | `markdownToHtml` 三份實作不一致 | `Converter.svelte:33`（手寫 regex，preview 用）、`download.ts:318`（marked）、`utils.ts:141`（marked）。marked 已是依賴 | preview 改用 marked（加 heading-id hook 供 TOC），移除手寫版；連帶解 H-001 | OPEN |
| M-003 | MISSING_DOC | README 未反映框架/guard | `README.md` 對 `01-CLAUDE`/guard/engineering contract 命中數=0 | 依 `07-ALL-IN-ONE` §5.2 補：定位+技術棧+指令+guard 概覽（D1–D7）+指向 `01-CLAUDE.md` | OPEN |
| M-004 | MISSING_TEST | `download.ts` / `utils.ts`（marked wrapper）無測試 | 無對應 `.test.ts` | 補 markdownToHtml / downloadXmind 基本測試（隨 M-002 一併） | OPEN |

---

## Low
| ID | 類型 | 問題 | 上下文（證據） | 建議 | 狀態 |
|---|---|---|---|---|---|
| L-001 | TECH_DEBT | 靜態島全用 `client:load` | `Layout.astro:92,98`（Header/Footer）、`index.astro:21`（Converter） | Header/Footer 評估 `client:visible` 或不 hydrate；Converter 互動需保留 load。省初始 JS | OPEN |
| L-002 | HARDEN | 採用跨專案 G5：可重生測試產物（如 `.vitest-result.json`）誤提交 guard | getkm 命中 mindup G5（regenerable artifact 污染歷史） | 加 D-class guard：repo root 不存在該類檔案 + `.gitignore` | OPEN |
| L-003 | MISSING_TEST | `as any` 預算=1 來源 | `TableOfContents.svelte:293` `handleItemClick(item, e as any)` | 收窄事件型別（`MouseEvent`），降 D1 預算為 0 | OPEN |

---

## Architecture Snapshot（2026-06-18 現況）

### 目錄職責
- `src/lib/` — 轉換核心與工具：`client-converter.ts`（XMind→MD 唯一來源）、`markdown-to-xmind.ts`+`markdown-parser.ts`+`xmind-builder.ts`（MD→XMind）、`download.ts`、`utils.ts`、`types/converter.ts`、`storage.ts`(死)、`shortcuts.ts`(死)、`index.ts`(死 barrel)。
- `src/components/converter/` — Converter / MarkdownInput / ResultPanel / TreeView / TableOfContents / ProgressBar。
- `src/components/ui/`、`layout/` — Button/Card/DropZone/ThemeToggle、Header/Footer。
- `src/layouts/Layout.astro` — SW 註冊 + update toast + theme；`src/sw.ts` — workbox PWA。
- `src/lib/guards.test.ts` — 架構/防禦 guard（D1–D7、D17–D21）。

### 資料流
- XMind→MD：File → `JSZip.loadAsync` → `content/content.xml` → `XmindParser.extractTopicTree` → `XmindTopic` tree → `topicTreeToMarkdown` → markdown；`tree` 一併回傳供 TreeView。
- MD→XMind：text → `MarkdownParser.parse` → node tree → `XmindBuilder.build` → XML → JSZip → `.xmind` Blob 下載。
- 預覽：`Converter.svelte` 偵測 `.xmind`/`.md` 分流；XMind 走 `convertXmindToMarkdown`（直接 import），MD 走 `MarkdownToXmindConverter`。

### PWA
- `manifest.json` + `src/sw.ts`（precache + stale-while-revalidate + font cache）+ `Layout.astro` 註冊（`updatefound` toast、hourly `reg.update`、`controllerchange` reload、`clients.claim`）。

---

## Hardening Suggestions（饋入 04-HARDENING_PROTOCOL）

| 候選 guard | 抓什麼 | WRONG / RIGHT | 對應 TODO |
|---|---|---|---|
| D8（dead-barrel guard） | `index.ts` barrel 或任一 lib 模組被 0 處 import | WRONG: `lib/x.ts` 僅被 barrel re-export、barrel 被 0 import → 刪；RIGHT: 模組有真實消費者 | M-001 |
| D9（single-renderer） | 預覽用非 marked 的手寫 markdown renderer | WRONG: 元件內手寫 `markdownToHtml` regex；RIGHT: 用 `lib/utils` 的 marked wrapper | M-002 / H-001 |
| G5（test-artifact hygiene，跨專案採納） | repo root 存在 `.vitest-result.json` 等可重生測試產物 | WRONG: 檔案存在；RIGHT: 不存在 + `.gitignore` | L-002 |

---

## Statistics
- 總項目：10（Critical 0 / High 2 / Medium 4 / Low 3 + 1 跨專案採納）
- BUG：0　TECH_DEBT：4（M-001/M-002/L-001/L-003）　MISSING_TEST：3（H-002/M-004/l-延伸）　MISSING_DOC：1（M-003）　HARDEN：2（H-001/L-002）
- 已解決：0（首次審計）
- 重複模式：1 —「barrel re-export 無消費者」（前次 converter 去重已見，本次 storage/shortcuts/index 再現）→ 建議 D8 guard 根治

---

## 下個週期建議優先序
1. **M-001** 刪死碼 storage/shortcuts/index（零風險、爆破半徑小、呼應前次去重）
2. **H-002** 補 client-converter 測試（保護 app 心臟）
3. **M-002 + H-001** 統一 renderer 為 marked + DOMPurify（一次解兩條）
4. **M-003** 更新 README
5. 補 D8/D9/G5 guard 鎖定上述模式
