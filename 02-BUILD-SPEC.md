# 02-BUILD-SPEC — 建造流程（靜態 Astro PWA）

> 強制類別（guard/artifact/human）見 `ENFORCEMENT_REGISTRY.md`，由 D18 meta-guard 驗證。

## 0 — [MUST] 合規聲明

> 本文件定義所有程式碼變更（features / fixes / refactors）的 [MUST] 執行流程。
> `01-CLAUDE.md` 為規則來源，本文檔定義執行流程。違反導致架構問題。
> [NEVER] 跳過任何步驟，[NEVER] 用程式碼遮蓋架構問題。

---

## 1 — [MUST] 經驗查詢 + THINK Block

**[MUST] THINK block 之前，先呼叫 `getkm`** 搜尋類似問題的過往解法。有相關經驗則納入分析。

> THINK block 為 **artifact**，由 **D21 guard** 驗證：非平凡變更（觸及 > 3 檔或 > 30 行）
> [MUST] 在 BUILD-PLAN / PR / commit 引用一個 THINK block。平凡修補豁免。getkm 呼叫為 `[HUMAN]`。

完整 THINK 模板見 `THINKING.md`（7 欄位）。任何程式碼之前 [MUST] 輸出：

```
THINK:
1. ROOT CAUSE:     （根本原因，問「為什麼」至少兩次）
2. CORRECT LAYER:  （Converter / Parser / Component / Svelte state / SW / Config / Build / CSS）
3. AFFECTED FILES: （會動到哪些檔案，爆破半徑多大）
4. ASSUMPTIONS:    （依賴哪些假設？哪個最可能錯？）
5. SIMPLER PATH:   （有沒有更簡單的做法？能不能只改一行？）
6. RISK:           （改壞最嚴重後果？線上 PWA 已部署，能否 rollback）
7. VERDICT:        PROCEED / STOP（架構有問題則 STOP，[NEVER] 寫程式碼）
```

---

## 2 — 規劃階段（Planning Phase）

此階段 [NEVER] 寫任何程式碼。

- [MUST] 列出所有變更檔案、預期影響、執行順序
- [MUST] 評估爆破半徑（直接影響、間接影響、測試影響）
- [MUST] 檢查依賴是否就緒（套件、型別、測試環境）
- [NEVER] 包含不必要的 refactoring

---

## 3 — 執行階段（Agent Teams）

三個角色 [NEVER] 兼任：

| 角色 | 職責 |
|---|---|
| **Executor** | 按批准計畫寫程式碼，[MUST] 不越界，遇架構問題 [MUST] STOP |
| **Reviewer** | 審查 type safety、`{@html}` 安全、Svelte runes 正確性、邊界案例，可發出 STOP |
| **Hardener** | Vitest 測試、guard 預算影響、`{@html}` / secret / 未用依賴檢查 |

**[MUST] Agent 品質要求：**
- [MUST] 調用 agent 時匹配任務複雜度與模型等級（架構 / 安全審計 ≥ opus，標準實作 ≥ sonnet，快速查找可用 haiku）
- [MUST] Reviewer 和 Hardener [NEVER] 使用低於 sonnet 等級的模型
- [MUST] 優先使用專門化 agent type（code-reviewer、security-reviewer），[NEVER] 在專門化 agent 可用時降級為通用 agent
- [NEVER] 以低品質 agent 執行架構決策、安全審計、或程式碼審查
- [MUST] agent prompt 必須包含充足上下文（相關規則、檔案路徑、驗收標準），[NEVER] 發送空泛指令

---

## 4 — 驗證階段（Verification Phase）

[MUST] 依序執行，不可跳過：

```bash
npm run typecheck      # [MUST] 0 errors
npm run lint           # [MUST] 0 errors（astro check）
npm run test:run       # [MUST] Tests passed, count >= 修改前
npm run build          # [MUST] Build completed successfully
```

---

## 5 — 自審清單（Self-Review Checklist）

所有 7 項 [MUST] 全部通過才能標記完成：

| # | Standard | 通過條件 |
|---|----------|---------|
| 1 | Build passes | `npm run build` 零錯誤 |
| 2 | All tests pass | `npm run test:run` 全過，數量 >= 修改前 |
| 3 | Lint clean | `npm run lint` 零錯誤 |
| 4 | No new TODO/FIXME | [NEVER] 用 TODO 掩蓋未完成工作 |
| 5 | No out-of-scope changes | [NEVER] 動到計畫外檔案 |
| 6 | Achieves stated purpose | 達到規劃文件的設計目的 |
| 7 | No security regression | 無 XSS（`{@html}` 未淨化）、無 secret 洩漏 |

**[MUST] 經驗記錄：** 自審通過後，呼叫 `putkm` 記錄非顯而易見的問題與解法。[ALWAYS] 記錄，[NEVER] 跳過。

---

## 6 — 提交流程（Commit Process）

- [MUST] Stage 具體檔案（[NEVER] `git add -A` / `git add .`）
- [MUST] 使用 conventional commit 格式（`feat:` / `fix:` / `refactor:` / `chore:` / `docs:`）
- [NEVER] 使用 `--no-verify`
- [NEVER] 提交 `.env`、credentials、secrets、`node_modules`、`dist/`
- [NEVER] `--force` push 到 `main` / `gh-pages`

---

## 7 — 失敗處理（Failure Handling）

**任何失敗 [MUST] 停止，[NEVER] 跳過、[NEVER] 忽視。**

**STOP 原則：** 失敗時 → STOP → 貼上錯誤（file:line + error message）→ 修復 → 重啟 THINK block。

**3 次連續失敗規則：** 同一問題連續失敗 3 次 → [MUST] 停止並建立 Bug Report（完整錯誤日誌、3 次嘗試方法及結果、分析結論）。

---

## 8 — 禁止事項（Prohibitions）

| [NEVER] 行為 | 嚴重程度 | [MUST] 替代方案 |
|---|---|---|
| `as any` | CRITICAL | Type assertion chain 或 narrowed interface |
| `{@html}` 注入未淨化內容 | HIGH | sanitize（目標 DOMPurify）後再注入 |
| `window.*` 全域間接（converter） | HIGH | 直接 `import` 具名匯出 |
| 重新引入平行 converter 實作 | CRITICAL | 只用 `src/lib/client-converter.ts` |
| 從 markdown 字串反解樹狀 | HIGH | 用 converter 回傳的 `tree` |
| 靜默錯誤吞嚥（空 catch） | HIGH | try-catch with handling/logging |
| 手動 `?v=` 快取戳記 | MEDIUM | 讓 Vite 自動 content-hash |
| 未經批准安裝套件 | MEDIUM | Ask first |
| 重構不相關檔案 | MEDIUM | Stay in scope |
