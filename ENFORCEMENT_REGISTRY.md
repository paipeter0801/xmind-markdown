# ENFORCEMENT_REGISTRY — XMind to Markdown（靜態 Astro PWA）

> **強制性來源**。「每一條 `[MUST]`/`[NEVER]`/`[ALWAYS]` 都有強制機制」的單一事實來源。
> 搭配 `04-HARDENING_PROTOCOL.md` 的 **D18 (D-META) meta-guard**（`src/lib/guards.test.ts`）驗證。
> 設計原則：**prose `[MUST]` 會被忽略；只有會 fail 的測試有強制性。**

## 三種強制類別

| Category | Rule shape | Mechanism | 範例 |
|---|---|---|---|
| `guard` | 靜態程式碼模式 | 04 的 D-class guard（regex/budget），下游 `guards.test.ts` instantiate | D1 as-any、D2 `{@html}` |
| `artifact` | 流程/工作流規則 | agent [MUST] 產出的結構化檔案/block，由 guard 驗證 | D19 FIX-LOG、D20 REFLECT |
| `human` | 真正的判斷 | 標 `[HUMAN]`，不偽裝成可自動化 | 架構決策、商業邏輯取捨 |

> `[HUMAN]` 規則維持 `[HUMAN]` — 不刪除、不偽裝。價值在強制每條規則誠實宣告類別。

## Guard ID 對照表（04 內實作於 `src/lib/guards.test.ts`）

| Guard | 用途 | 類別 |
|---|---|---|
| D1 | `as any` 型別預算（只減不增） | guard |
| D2 | `{@html}` 淨化追蹤預算 | guard |
| D3 | Secret 暴露（detect-secrets + grep） | guard |
| D4 | 未用依賴（package.json deps 必被引用） | guard |
| D5 | 文檔引用路徑必須存在 | guard |
| D6 | `console.*` 殘留預算（排除 test/SW 註冊） | guard |
| D7 | Build/Test 綠（typecheck+lint+test+build） | guard |
| D17 | Fix→Lock parity（CHANGELOG lock-tag） | guard |
| **D18** | **D-META：本登記表完整性 + section 覆蓋** | **guard (meta)** |
| **D19** | **FIX-LOG artifact（05 §1/§4/§5）** | **artifact** |
| **D20** | **REFLECT artifact（06 §3/§4/§5）** | **artifact** |
| **D21** | **THINK block artifact（02 §1, 05 §3）** | **artifact** |

## 01-CLAUDE.md

| Section | Category | Enforcement | 說明 |
|---|---|---|---|
| §0 強制合規聲明 | guard | pre-commit/pre-push hooks | `--no-verify`/force 禁止 |
| §1 技術棧宣告 | human | `[HUMAN]` | 宣告式；可檢查部分（package.json）由 build 間接保證 |
| §2 轉換邏輯單一來源 | guard | D4（依賴）+ build | 唯一 converter，無平行實作 |
| §3 型別安全標準 | guard | D1 (as-any), tsc/astro check | |
| §4 前端安全 XSS | guard | D2 (`{@html}`) | 淨化追蹤 |
| §5 PWA / SW 規範 | guard + human | D7 (build) | 一致性由 build 保證；手動 `?v=` 由 review |
| §6 依賴衛生 | guard | D4 (未用依賴) | |
| §7 防禦性編程 | guard + human | D1–D7 防禦矩陣 | |
| §8 元件邊界與資料流 | human | `[HUMAN]` | 邊界為架構判斷 |
| §9 平台已知限制 | human | `[HUMAN]` | 資訊性 |
| §10 禁止事項 | guard | D1/D2/D4 + hooks | 平行 converter / `as any` / `{@html}` / 全域間接 / 後端框架 |

## 02-BUILD-SPEC.md

| Section | Category | Enforcement | 說明 |
|---|---|---|---|
| §0 合規聲明 | human | `[HUMAN]` | 流程宣告 |
| §1 經驗查詢 + THINK Block | artifact | D21 (THINK block) + human (getkm) | |
| §2 規劃階段 | artifact | D21 | plan artifact |
| §3 執行階段（Agent Teams） | artifact + human | D18 (meta) | agent 協調為 human |
| §4 驗證階段 | guard | typecheck/lint/test/build gates（D7） | |
| §5 自審清單 | artifact | D20 (REFLECT) | |
| §6 提交流程 | guard | pre-commit/pre-push hooks | `--no-verify`/force 禁止 |
| §7 失敗處理 | human | `[HUMAN]` | 判斷何時 STOP |
| §8 禁止事項 | guard | hooks + D1/D2 | |

## 03-DOC-AND-CODE-REVIEW.md

| Section | Category | Enforcement | 說明 |
|---|---|---|---|
| §0 強制合規 | human | `[HUMAN]` | |
| §1 目的 | human | `[HUMAN]` | priority 宣告 |
| §2 架構快照 | artifact | D5 (path) + artifact (snapshot) | |
| §3 文檔準確性 | guard | D5 | 引用路徑必須存在 |
| §4 模式覆蓋分析 | artifact + human | D18 (meta) | |
| §5 產出生成 | artifact | TODO-REVIEW.md | |
| §6 TODO-REVIEW 模板 | artifact | TODO-REVIEW.md 存在 | |
| §7 審查週期 | human | `[HUMAN]` | |
| Compliance Check | guard | D5 + D18 | |

## 04-HARDENING_PROTOCOL.md

| Section | Category | Enforcement | 說明 |
|---|---|---|---|
| §0 強制合規聲明 | guard | pre-commit hooks | |
| §1 核心原則 | guard | D17 (fix→lock), D18 (meta) | |
| §2 Phase 1 防禦掃描 | guard | D1–D7 矩陣 | |
| §3 Phase 2 驗證 | guard | build/lint/test + D17 (Step 5) | |
| §4 Phase 3 文檔同步 | guard | D5 (path), D17 (lock-tag §4.a1), D18 | |
| §4.a1 Fix→Lock 標籤 | guard | D17 | 強制性核心 |
| §5 Phase 4 總結報告 | artifact | report 產出 | |
| §5.5 防禦模式共享 | human | `[HUMAN]` (putkm) | API 呼叫無法靜態驗 |
| §6 STOP 條件 | human | `[HUMAN]` | |
| §7 最終檢查清單 | guard | D18 (meta, item 10) | |
| §8 防線模板 | guard | D1–D7 模板 | |
| §8.5 Meta & Artifact Guards | guard + artifact | D17/D18/D19/D20/D21 | |

## 05-FIX-SPEC.md

| Section | Category | Enforcement | 說明 |
|---|---|---|---|
| §1 目標記錄 | artifact | D19 (FIX-LOG) | FIX-PLAN 四欄位 |
| §2 經驗查詢 getkm | human | `[HUMAN]` | |
| §3 THINK Block | artifact | D21 | 非平凡 fix |
| §4 修復與驗證 | guard | D7（Phase 2 四重奏）+ D17 | |
| §5 自審清單 | artifact | D20 (REFLECT) | |
| §6 經驗記錄 putkm | human | `[HUMAN]` | |
| §7 失敗處理 | human | `[HUMAN]` | |
| 禁止事項 | guard | D17 + hooks | |

## 06-REFLECT.md

| Section | Category | Enforcement | 說明 |
|---|---|---|---|
| §0 Purpose | human | `[HUMAN]` | |
| §1 Trigger Points | artifact | D20 (REFLECT 觸發) | |
| §2 Experience Search | human | `[HUMAN]` (getkm) | |
| §3 Quick Check | artifact | D20 (REFLECT R1–R5) | |
| §4 Full Audit | artifact | D20 (REFLECT F1+) | |
| §5 Corrective Action | artifact | D20 + TODO-REVIEW | |
| §7 Cross-Project Learning | human | `[HUMAN]` (putkm) | |
| §8 Anti-Patterns | human | `[HUMAN]` | |

---

## D18 (D-META) 驗證規則

D18 guard（`src/lib/guards.test.ts`）讀本檔 + 01–06，驗證：

1. **Section 覆蓋**：01–06 中每個含 `[MUST]/[NEVER]/[ALWAYS]` 的 section heading [MUST] 出現於本表。
2. **Guard 存在**：本表 Enforcement 欄的每個 `D##` 對應 04 內已定義 guard。
3. **Artifact 完整**：每個 `artifact` 指向已定義 artifact + validator（D19/D20/D21）。
4. **Human 誠實**：`human` 類別帶 `[HUMAN]`，不與 guard/artifact 混標。

> 工作流未上軌前，D18 採計數寬鬆比對 + 警告模式（不 fail 阻擋開發）；D17/D19/D20/D21 在對應 artifact 不存在時 skip + console.warn。

## 下游 instantiate 指引

1. 本檔已於專案根。
2. `src/lib/guards.test.ts` 實作 D1–D7 + D17–D21（04 的模板 + 本表指明的 guard）。
3. 新增任何 `[MUST]` 必須同步登記，否則 D18 fail。
4. artifact 類（D19/D20/D21）：維護 `FIX-LOG.md` / `REFLECT.md` / THINK block。
