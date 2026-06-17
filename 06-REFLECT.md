# 06-REFLECT — Agent Self-Audit Protocol（靜態 Astro PWA）

> 強制類別（guard/artifact/human）見 `ENFORCEMENT_REGISTRY.md`，由 D18 meta-guard 驗證。

## 0 — [MUST] Purpose

本文件定義 AI agent 的**自我流程合規**審查（審查 agent 自己有沒有遵守 01–05 給的規則），而非審查程式碼/文檔/安全。

[MUST] 在 Section 1 列的每個觸發點執行。
[NEVER] 因為「任務很小」「我很小心」就跳過。

> Reflection 為 artifact：每個觸發點 [MUST] 產出一份寫入 `REFLECT.md`，模板見 `references/REFLECT-TEMPLATE.md`。由 **D20 guard** 驗證：本 cycle 有 REFLECT.md，R1–R5 各段非空、無裸 `N/A` 逃避。

---

## 1 — [MUST] Trigger Points

| Trigger | Scope | Time |
|---------|-------|------|
| End of session | Quick Check (§3) | ≤ 2 min |
| Before `git commit` | Full Audit (§4) | ≤ 5 min |
| After multi-step task | Full Audit | ≤ 5 min |
| Phase transition | Phase-Specific | ≤ 3 min |
| User explicitly requests | Full Audit | no limit |

[NEVER] batch reflections。每個觸發點跑自己的 check。

---

## 2 — [MUST] Experience Search (getkm)

反映前 [MUST] 呼叫 `getkm`：

```
getkm("agent self-audit compliance reflection", tags=["self-audit", "process-compliance"])
```

若顯示本專案**重複違規**，[MUST] 在本次審計特別注意那些區域。

---

## 3 — [MUST] Quick Check（End-of-Session）

[MUST] 誠實回答 5 題：

### R1: [MUST] Directives — 是否違反 01–05 的 `[MUST]`？
### R2: [NEVER] Directives — 是否違反 01–05 的 `[NEVER]`？（是 → **STOP**，CRITICAL，立即修）
### R3: Process Flow — 是否依正確順序？
- Build: getkm → THINK → implement → verify → putkm
- Fix: goal → getkm → THINK → fix → verify → putkm
- Harden: getkm → D1–D7 → guards → putkm
### R4: Verification — 是否**實際**驗證（非「看起來 OK」）？
### R5: Experience Recording — 是否對非平凡學習呼叫 `putkm`？

[MUST] 全過 5 題才能結束 session。[MUST] 關閉前修完 CRITICAL/HIGH。

---

## 4 — [MUST] Full Audit（Pre-Commit / Post-Task）

### F1: Constitution（01-CLAUDE.md）
| Area | Check | Result |
|------|-------|--------|
| Tech stack | 只用批准技術？ | ✅/❌ |
| Architecture | 遵守邊界？ | ✅/❌ |
| Prohibitions | 避開所有 `[NEVER]`？ | ✅/❌ |

### F2: Build（02-BUILD-SPEC.md）
| Area | Check | Result |
|------|-------|--------|
| getkm | THINK 前呼叫？ | ✅/❌ |
| THINK | 7 欄位齊全？ | ✅/❌ |
| Implementation | 依計畫？ | ✅/❌ |
| putkm | 記錄非平凡學習？ | ✅/❌/N/A |

### F3: Documentation（03）
| Area | Check | Result |
|------|-------|--------|
| Accuracy | 文檔符合現況？ | ✅/❌ |
| TODO-REVIEW | 為發現的問題建立？ | ✅/❌/N/A |

### F4: Hardening（04）
| Area | Check | Result |
|------|-------|--------|
| D1–D7 | 跑所有適用防禦檢查？ | ✅/❌ |
| Budgets | 預算只減不增？ | ✅/❌/N/A |

### F5: Fix（05）
| Area | Check | Result |
|------|-------|--------|
| Goal | 動手前記錄 fix goal？ | ✅/❌/N/A |
| getkm | 搜尋類似過往 bug？ | ✅/❌/N/A |
| Verification | fix 已驗證（非「能編譯」）？ | ✅/❌/N/A |

---

## 5 — [MUST] Corrective Action Protocol

| Severity | Criteria | Action |
|----------|----------|--------|
| CRITICAL | `[NEVER]` 違規、安全問題、資料遺失風險 | 立即修，優先於一切 |
| HIGH | `[MUST]` 跳過、流程未遵循 | 當前 session 修 |
| MEDIUM | 文檔不完整、缺 putkm | 建 TODO，下個 session 修 |
| LOW | 風格不一致 | 註記下次 |

[NEVER] 放任 CRITICAL/HIGH 不處理。[NEVER] 帶 CRITICAL 違規 commit。

每個違規記錄：`Violation / Phase / Severity / Root Cause / Fix / Status`。[NEVER] 寫「會更努力」。

---

## 6 — [MUST] Audit Report Format

見 `references/REFLECT-TEMPLATE.md`。有違規才需存檔。[NEVER] 刪除過去審計報告。

---

## 7 — [MUST] Cross-Project Learning（putkm）

Full Audit 有發現 → [MUST] `putkm(problem=, solution=, tags=["self-audit","process-compliance"], context="06-REFLECT [SEVERITY]")`。
同一違規出現 **3+ 次** → escalate to user，規則本身可能需修訂。

---

## 8 — Anti-Patterns

[NEVER] 不誠實地橡皮章勾選。
[NEVER] 用「我很小心」取代驗證證據。
[NEVER] 因「任務簡單」跳過 getkm/putkm。
[NEVER] 把 `[NEVER]` 違規歸為 MEDIUM/LOW — 永遠 CRITICAL。
[MUST] 把本協議看得跟 hardening 一樣嚴肅。流程合規即安全。
