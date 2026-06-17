# 03-DOC-AND-CODE-REVIEW — 審計與記錄流程（靜態 Astro PWA）

> 強制類別（guard/artifact/human）見 `ENFORCEMENT_REGISTRY.md`，由 D18 meta-guard 驗證。
> 核心原則：本流程目的非找 bug，而是**記錄專案當前狀態**。文檔準確性透過對比代碼現實驗證，發現問題產出 `TODO-REVIEW.md`。

---

## Section 0 — [MUST] 強制合規

[MUST] 本文件具強制約束力，所有 AI 代理必須遵循。
[ALWAYS] 每次 AI 會話開始時觸發（記憶刷新機制）。
[MUST] 記錄即 truth — 記錄內容即為當前現實，非理想狀態。
[MUST] 執行審計的 agent 必須 ≥ sonnet，架構決策與安全發現 ≥ opus。

---

## Section 1 — [MUST] 目的（Priority Order）

| 優先級 | 目的 | 說明 |
|--------|------|------|
| PRIMARY | 記錄現狀 | 記錄實際轉換資料流、模組依賴、元件結構 |
| SECONDARY | 驗證文檔 | 比對 `01-CLAUDE.md` 規則、模組引用、架構描述是否過時 |
| TERTIARY | 識別缺口 | 找出未記錄流程、缺測試的模式、需加固的 guard |

- [ALWAYS] 記錄 IS，不是 SHOULD BE
- [MUST] 每個模組、資料流都應被記錄
- 輸出到 `02-BUILD-SPEC.md`（待修復）、`04-HARDENING_PROTOCOL.md`（待鎖定）、`01-CLAUDE.md`（新規則）

---

## Section 2 — [MUST] Phase 1: 架構快照

- [MUST] **目錄結構審計** — `tree`/`find` 映射 `src/`，識別 `lib/`（轉換）、`components/`（UI）、`layouts/`、`types/`，標記孤立檔案
- [MUST] **模組清點** — 列出 `src/lib/*`（path、responsibility、depends on），建模組依賴圖
- [MUST] **資料流記錄** — XMind ZIP → `content.xml` → topic tree → markdown（XMind→MD）；markdown → node tree → XMind XML → ZIP（MD→XMind）；preview 取 `tree`
- [MUST] **PWA 資產記錄** — `manifest.json`、`src/sw.ts`（precache 策略）、`Layout.astro` SW 註冊與 update toast

---

## Section 3 — [MUST] Phase 2: 文檔準確性

- [MUST] **`01-CLAUDE.md` 驗證** — 逐條檢查規則遵循、禁止違規、模組引用存在性、版本時效
- [MUST] **轉換入口清點** — `Converter.svelte` 偵測 `.xmind`/`.md` 分流；驗證兩向都走唯一 converter 來源
- [MUST] **測試覆蓋評估** — 統計 `src/lib/*.test.ts`，識別未測模組（client-converter 目前僅被 integration test 間接覆蓋），驗證 guard 完整性
- 驗證方法：Grep 查違規、Glob 驗檔案存在、查 import 路徑規範

---

## Section 4 — [MUST] Phase 3: 模式覆蓋分析

- [MUST] **Guard 覆蓋** — 列出 `guards.test.ts` 的 D1–D7，對照已知錯誤模式（`as any`、`{@html}`、未用依賴、secret），識別缺失 guard
- **加固建議分級**：
  - 高：`{@html}` 未淨化（XSS）、converter 平行實作回潮
  - 中：未用依賴、手動 `?v=` 戳記回潮
  - 低：console 殘留、型別可收窄

---

## Section 5 — [MUST] Phase 4: 產出生成

- [MUST] **更新文檔** — 只更新有變動部分，反映現實
- [MUST] **產出 `TODO-REVIEW.md`** — 模板見 `references/TODO-REVIEW-TEMPLATE.md`
  - 分類：BUG / TECH_DEBT / MISSING_TEST / MISSING_DOC / HARDEN
  - 按風險與頻率排序，含上下文與建議
- [MUST] **加固建議饋入 `04-HARDENING_PROTOCOL.md`** — 模式、風險、WRONG/RIGHT、rule/guard 建議

---

## Section 6 — [MUST] TODO-REVIEW 模板

[MUST] 使用 `references/TODO-REVIEW-TEMPLATE.md`：Critical/High/Medium 三級表 + Architecture Snapshot Changes + Hardening Suggestions + Statistics。

---

## Section 7 — 審查週期

| 觸發時機 | 類型 |
|----------|------|
| 每次 AI 會話開始 | [MUST] 強制 |
| 主要功能新增後 | [MUST] 強制 |
| 加固週期完成後 | [MUST] 強制 |
| 主要發布前 / 活躍專案每週 | 建議 |

---

## Compliance Check

- [ ] [MUST] 所有階段已完成
- [ ] [MUST] `TODO-REVIEW.md` 已產出
- [ ] [MUST] 相關文檔已更新
- [ ] [MUST] 加固建議已饋入 `04-HARDENING_PROTOCOL.md`

> [ALWAYS] 本流程是專案的記憶刷新機制。每個 AI 會話都應從此開始。
