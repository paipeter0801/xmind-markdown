# 05-FIX-SPEC — 修復與小功能規範（靜態 Astro PWA）

> 強制類別（guard/artifact/human）見 `ENFORCEMENT_REGISTRY.md`，由 D18 meta-guard 驗證。
> 適用於 bug fix、hotfix、小功能。大型功能請遵循 `02-BUILD-SPEC.md`。
> [NEVER] 因為「只是小改」就跳過流程。

---

## 1 — [MUST] 目標記錄

動手前 [MUST] 寫下：

```
FIX-PLAN:
目標:    （要修什麼 / 做什麼小功能）
原因:    （為什麼需要）
預期結果: （完成後應該看到什麼）
範圍:    （會動到哪些檔案）
```

**[MUST] 此 FIX-PLAN 寫入 `FIX-LOG.md`（artifact）**，模板見 `references/FIX-LOG-TEMPLATE.md`。
由 **D19 guard** 驗證：CHANGELOG 最新 cycle 的每條 fix bullet 都有對應 FIX-LOG entry，四欄位齊全 + 驗證四重奏有紀錄。

---

## 2 — [MUST] 經驗查詢（getkm）

[MUST] 在分析前呼叫 `getkm`，用問題描述搜尋過往經驗。
- 有相關結果 → [MUST] 納入 THINK block 分析
- 無相關結果 → 正常繼續

---

## 3 — [MUST] THINK Block

遵循 `THINKING.md` 的 7 欄位模板。[MUST] 使用完整版，[NEVER] 省略欄位。
VERDICT 為 STOP → [NEVER] 寫程式碼，先修架構。

> THINK block 為 artifact，由 **D21 guard** 驗證：非平凡 fix（觸及 > 3 檔或 > 30 行）[MUST] 在 FIX-LOG 引用一個 THINK block。平凡修補（typo / 單行）豁免。

---

## 4 — [MUST] 修復與驗證

修復完成後 [MUST] 依序執行：

```bash
npm run typecheck      # [MUST] 0 errors
npm run lint           # [MUST] 0 errors
npm run test:run       # [MUST] all pass, count >= 修改前
npm run build          # [MUST] success
```

任何一項失敗 → [MUST] STOP，貼出錯誤，修復後重跑。

---

## 5 — [MUST] 自審清單

| # | 標準 | 狀態 |
|---|------|------|
| 1 | TypeScript 零錯誤 | ✅/❌ |
| 2 | 測試全過 | ✅/❌ (N passed) |
| 3 | Lint 乾淨 | ✅/❌ |
| 4 | Build 成功 | ✅/❌ |
| 5 | 無新增 TODO/FIXME | ✅/❌ |
| 6 | 未動到範圍外檔案 | ✅/❌ |
| 7 | 達到設計目的 | ✅/❌ |
| 8 | 安全性無退化（`{@html}` / secret） | ✅/❌ |

審核全部 ✅ 後，[MUST] 輸出完成摘要：改了什麼檔案、改了什麼、新增了什麼測試。

---

## 6 — [MUST] 經驗記錄（putkm）

驗證通過後 [MUST] 呼叫 `putkm`：

```
problem:  問題描述（症狀 + 根因）
solution: 解法（改了什麼、為什麼有效）
tags:     ["bugfix", "astro", "pwa", ...] （小寫、具體）
context:  專案 / 技術背景
```

[ALWAYS] 記錄。[NEVER] 覺得「太簡單」就跳過。

---

## 7 — 失敗處理

**任何失敗 [MUST] 停止，[NEVER] 跳過、[NEVER] 靜默忽略。**

- tsc 失敗 → 停，貼出 error
- Lint 失敗 → 停，貼出 error
- 測試失敗 → 停，貼出失敗的 test case
- Build 失敗 → 停，貼出 error

**3 次連續失敗：** 同一問題連續失敗 3 次 → [MUST] STOP 並報告（完整錯誤日誌、3 次嘗試記錄、分析結論）。

---

## 禁止事項

遵守 `01-CLAUDE.md` 和 `02-BUILD-SPEC.md` 的所有禁令。特別強調：

- [NEVER] `as any`、空 catch
- [NEVER] `{@html}` 注入未淨化內容
- [NEVER] `--no-verify`
- [NEVER] 提交 `.env` / credentials / secrets
- [NEVER] 靜默忽略錯誤
- [NEVER] 重新引入平行 converter 實作
