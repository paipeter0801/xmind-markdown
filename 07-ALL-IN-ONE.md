# 07-ALL-IN-ONE — 一鍵加固 + 完善程式碼 + 產出/更新文檔（靜態 Astro PWA）

> 強制類別（guard/artifact/human）見 `ENFORCEMENT_REGISTRY.md`，由 D18 meta-guard 驗證。
> 本文件是 orchestrator：執行一次即依序跑完 03（審計/記錄）→ 02（完善程式碼與註解）→ 04（加固）→ 03（文檔收斂）。
> [MUST] 各 Phase 引用對應主文檔完整規則，本文件只定義編排順序與產出，[NEVER] 重複抄錄細節。

---

## 0 — [MUST] 合規聲明

> 執行本文件 = 對專案做一次完整「記錄→完善→加固→收斂文檔」。
> [MUST] 嚴格依 Phase A→B→C→D，[NEVER] 跳過、[NEVER] 並行、[NEVER] 顛倒。
> [MUST] agent ≥ sonnet；架構決策、安全審計、錯誤分類 ≥ opus（見 `02-BUILD-SPEC.md` §3）。
> [NEVER] 用 `--no-verify`、[NEVER] 提交 secrets。

---

## 1 — 觸發時機與產出

| 觸發 | 類型 |
|---|---|
| 「跑一次完整收斂」「all-in-one」「07」「全量加固+補文檔」 | [MUST] 執行 |
| 主要功能新增後、發布前、每週保養 | [MUST] 執行 |

**[MUST] 產出清單（全部就位才完成）：**
- 更新後的 `README.md`（架構 + 安裝/build/test + guard 概覽）
- 技術文檔（`docs/` 或 module reference）反映現狀
- `TODO-REVIEW.md`（依 `references/TODO-REVIEW-TEMPLATE.md`）
- `CHANGELOG.md` 今日 cycle（含 Fix→Lock tag，見 04 §4.a1）
- 加固後原始碼（D1–D7 全 PASS、typecheck/lint/test/build 全綠）
- `putkm` 經驗記錄

---

## 2 — [MUST] Phase A: 記錄現狀 + 文檔診斷（執行 `03-DOC-AND-CODE-REVIEW.md`）

> [MUST] 先記錄 IS，再決定改什麼。[NEVER] 沒現狀快照前動程式碼。

[MUST] 完整執行 03 Phase 1–4：
- [MUST] **架構快照**（03 §2）：轉換資料流（XMind↔MD）、`src/lib` 模組依賴圖、PWA（manifest/sw/Layout）
- [MUST] **文檔準確性**（03 §3）：逐條比對 `01-CLAUDE.md`、轉換入口、測試覆蓋
- [MUST] **模式覆蓋**（03 §4）：guard 覆蓋缺口
- [MUST] 產出 `TODO-REVIEW.md`，分 BUG/TECH_DEBT/MISSING_TEST/MISSING_DOC/HARDEN，分 Critical/High/Medium

[MUST] 把 MISSING_DOC + TECH_DEBT 匯入 Phase B/C 待辦。

---

## 3 — [MUST] Phase B: 完善程式碼與註解（執行 `02-BUILD-SPEC.md`）

針對 Phase A 的 TECH_DEBT / MISSING_TEST，逐項走 THINK→規劃→執行→驗證。

[MUST] 每項非平凡變更前：
- [MUST] 呼叫 `getkm`（02 §1）
- [MUST] 輸出 7 欄位 THINK block，VERDICT=STOP 則 [NEVER] 寫程式碼
- [NEVER] 用程式碼遮蓋架構問題；遇架構問題 [MUST] STOP 回 Phase A

| 工作類型 | [MUST] 動作 |
|---|---|
| 註解完善 | 補 public API / converter / guard 的 JSDoc；[NEVER] 為自明程式碼加廢話註解 |
| 型別完善 | 收窄 `as any`/`as unknown`、補 narrowed interface（01 §4） |
| 缺測補測 | 為 MISSING_TEST 補 Vitest guard（含 WRONG/RIGHT，04 §8） |
| 小幅重構 | [NEVER] 越界；爆破半徑 > 10 檔 → [MUST] STOP |

[MUST] 每完成一項更新 TODO-REVIEW 狀態。[NEVER] 新增裸 TODO/FIXME。

---

## 4 — [MUST] Phase C: 加固（執行 `04-HARDENING_PROTOCOL.md`）

[MUST] 執行 04 §2 全程：
- [MUST] 先 `getkm` 跨專案防禦模式（04 §2 Step 0）
- [MUST] 逐項掃描 **D1–D7**（型別預算 / `{@html}` 淨化 / secret / 未用依賴 / 文檔路徑 / PWA 一致性 / console）
- [MUST] 失敗項回 04 §2 Step 1 分類（ESLint / VITEST / HUMAN），輸出 WRONG/RIGHT + RULE
- [MUST] 新增規則寫入 `src/lib/guards.test.ts`
- [MUST] 預算只減不增，違規 → immediate STOP

[MUST] CHANGELOG 每條 fix bullet 攜帶 `(locked: D##)` 或 `(human: <理由>)` tag（04 §4.a1，D17 強制）。

---

## 5 — [MUST] Phase D: 驗證 + 文檔/README 收斂

### 5.1 驗證四重奏（04 §3 / 02 §4）

```bash
npm run typecheck      # [MUST] 0 errors
npm run lint           # [MUST] 0 errors
npm run test:run       # [MUST] all pass, count >= Phase A 之前
npm run build          # [MUST] success
```

[MUST] 跑 guard 測試：D17 Fix→Lock、D18 registry、D19 FIX-LOG、D20 REFLECT、D21 THINK。

### 5.2 產出/更新文檔

[MUST] 只更新有變動部分，記錄 IS not SHOULD BE。

| 文件 | [MUST] 內容 |
|---|---|
| `README.md` | 定位 + 技術棧（01 §1）+ 安裝/build/test + guard 概覽（D1–D7）+ 指向 `01-CLAUDE.md` |
| 技術文檔 | Phase A 快照：轉換資料流、模組依賴圖 |
| `01-CLAUDE.md` | 準確性驗證（04 §4.c）：禁令/路徑/版本與程式碼一致 |
| `TODO-REVIEW.md` | 標記已解決項（含日期），加新發現 |

[MUST] README/文檔引用的檔案路徑必須存在（D6 強制）。[NEVER] 記錄不存在的功能。

### 5.3 經驗記錄

[MUST] 新防禦模式用 `putkm` 記錄（tags 含 `defense-pattern`/`astro`/`pwa`）。

---

## 6 — [MUST] 執行順序（嚴格 pipeline）

```
Phase A (03 記錄現狀)  ──TODO-REVIEW──┐
   ▼                                  │
Phase B (02 完善程式碼+註解+補測) ◄────┘
   ▼
Phase C (04 加固 D1–D7 + Fix→Lock)
   ▼
Phase D (驗證四重奏 → 更新 README/文檔/01 → putkm)
   ▼
完成報告
```

[MUST] Phase 失敗即 STOP。[MUST] 同一問題 3 次連續失敗 → STOP 建 Bug Report。

---

## 7 — STOP 條件

| 條件 | 動作 |
|---|---|
| 同一問題 loop > 3 次 | [MUST] STOP，人工介入 |
| 單一規則影響 > 10 檔 | [MUST] STOP，爆破半徑過大 |
| HUMAN queue > 3 項 | [MUST] STOP，需架構決策 |
| 不確定是否安全 | [MUST] STOP，寧可保守 |
| 預算會增加 | [ALWAYS] STOP，預算只減不增 |
| THINK VERDICT = STOP | [NEVER] 寫程式碼，先修架構 |

[MUST] 停下來。[NEVER] 猜。

---

## 8 — [MUST] 完成檢查清單

- [ ] D1–D7 防禦掃描全 PASS
- [ ] `typecheck`/`lint`/`test`/`build` 全綠，測試數 ≥ Phase A 之前
- [ ] D17/D18/D19/D20/D21 guard 全 PASS
- [ ] `TODO-REVIEW.md` 已產出、已解決項已標記
- [ ] `CHANGELOG.md` 今日 cycle 完整，每條 fix 有 lock tag
- [ ] `README.md` + 技術文檔已更新且路徑引用存在（D6）
- [ ] `01-CLAUDE.md` 準確性通過
- [ ] `putkm` 已記錄
- [ ] 預算未增加

[MUST] 輸出報告格式：仿 04 §5 HARDENING COMPLETE + 本文件產出清單對照表。[NEVER] 任一項未通過即宣告 COMPLETE。
