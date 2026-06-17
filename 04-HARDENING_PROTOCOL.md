# 04-HARDENING_PROTOCOL — 強化協議（靜態 Astro PWA）

> 定義本專案的 hardening 流程與架構守護規則。防禦矩陣 **D1–D7** 依本棧實況編寫（非 Cloudflare/DB 那套）。
> 審查流程見 `03-DOC-AND-CODE-REVIEW.md`。guard 實作於 `src/lib/guards.test.ts`。

---

## Section 0 — [MUST] 強制合規聲明

本文件是 [MUST] 強制合約。所有 `[MUST]`/`[NEVER]`/`[ALWAYS]` 不可談判。
[MUST] 執行 hardening 的 agent ≥ sonnet，安全審計與錯誤分類 ≥ opus。

| 禁止模式 | 嚴重程度 | 正確動作 |
|---|---|---|
| `git commit/push --no-verify` | CRITICAL | 修復 hook，無 flag 重交 |
| `git push --force` 到 main/gh-pages | BLOCKED | [NEVER] 拒絕 |
| CI 後省略 `make clean` | HIGH | 保留清理慣例 |
| `2>/dev/null \|\| true` 吞噬 lint | HIGH | 僅工具不存在時抑制 |
| 提交 `.env`/credentials/`.pem`/`.key` | CRITICAL | 取消暫存 + `.gitignore` |
| `rm -rf /`、`rm -rf ~` | CRITICAL | [NEVER] 無範圍破壞命令 |

[MUST] 執行任何 git/CI 命令前先對照此表。

---

## Section 1 — [MUST] 核心原則

- 一個關注點一個源頭：converter / utils / download / types [MUST] 各有唯一 SSoT
- [MUST] shared logic 集中單一模組，不散佈
- [ALWAYS] 在正確層級修根本原因，never symptoms
- [MUST] uncertain → STOP，don't guess
- [MUST] review 發現的模式 → locked in Vitest guard → verified
- [MUST] 防禦模式跨專案共享：hardening 前呼叫 `getkm`，新模式用 `putkm` 記錄

---

## Section 2 — [MUST] Phase 1: 錯誤模式分析 + 防禦掃描

輸入：git diff、error logs、failed checks、`TODO-REVIEW.md`

### Step 0: [MUST] 跨專案防禦模式發現（getkm）

```
getkm("defense-pattern astro pwa guard vitest", tags=["defense-pattern", "astro", "pwa"])
```

- 其他專案已驗證的 guard → 優先採納
- [NEVER] 盲目照搬 → 評估是否適用本專案

### Step 1: [MUST] 錯誤分類

```
ERROR:
1. PATTERN:    [出現頻率]
2. ROOT CAUSE: [一句話根本原因]
3. CLASSIFICATION:
   → VITEST  : 邏輯錯誤？模式違規？→ guard
   → HUMAN   : 架構決策？商業邏輯？→ 標 [HUMAN]
   → UNSURE  : 預設 HUMAN
4. 僅 VITEST 繼續：
   WRONG: [最小錯誤範例]
   RIGHT: [最小正確範例]
   RULE : [guard 實作]
5. 寫入 `src/lib/guards.test.ts` + `CHANGELOG.md`
```

### Step 2: [MUST] 防禦掃描矩陣（D1–D7）

每次 hardening [MUST] 逐項檢查：

| # | 防禦項目 | 檢查方式 | 失敗條件 | 工具 |
|---|---------|---------|---------|------|
| D1 | 型別安全預算 | grep `as any`（排除 test） | 超過 budget 或無理由 | Vitest guard |
| D2 | `{@html}` 淨化追蹤 | grep `{@html` | 超過 budget（目標引入 DOMPurify） | Vitest guard |
| D3 | Secret 暴露 | `detect-secrets scan` + grep token patterns | 新增 secret 或 baseline 過期 | pre-commit + CI |
| D4 | 未用依賴 | 比對 package.json deps vs src 引用 | dep 無任何引用 | Vitest guard |
| D5 | 文檔路徑準確 | README/01/CLAUDE 引用路徑存在 | 引用不存在檔案 | Vitest guard (D6 alias) |
| D6 | console 殘留預算 | grep `console.*`（排除 test/SW 註冊） | 超過 budget | Vitest guard |
| D7 | Build/Test 綠 | typecheck+lint+test+build | 任一失敗 | CI / pre-push |

每個失敗項 [MUST] 視為新錯誤模式，回 Step 1。

---

## Section 3 — [MUST] Phase 2: 驗證

[MUST] 按順序：

```
1. npm run typecheck → 0 errors
2. npm run lint      → 0 errors
3. npm run test:run  → all pass, count ≥ pre-hardening
4. npm run build     → 0 errors
5. Fix→Lock 配對 (D17) → PASS：本 cycle 每條 fix bullet 攜帶有效 lock tag
```

失敗 = [MUST] new error pattern → return Phase 1。同一問題 max 3 iterations → [MUST] STOP，進 HUMAN queue。Budget 違規 → [MUST] immediate STOP。

**Step 5 (D17) 是「只修症狀」的防線。** D17 失敗代表有 fix 沒加 guard → [MUST] 回 Phase 1 補 guard。[NEVER] 跳過 D17 宣告 COMPLETE。

### [MUST] Guard 有效性驗證

| 檢查 | 方法 |
|------|------|
| Guard regex 仍匹配現況 | 人工確認 pattern 沒過時 |
| Budget 常數合理 | 若 N 月沒降，審查每個是否仍必要 |

---

## Section 4 — [MUST] Phase 3: 文檔同步

[MUST] 只記錄實際存在的東西。

### a) CHANGELOG.md 格式

```markdown
## [YYYY-MM-DD]
### Added
### Fixed
### Locked（今日新增 guard）
### Human Queue
```

### a1) [MUST] Fix→Lock 配對標籤（強制性來源）

每條 `### Fixed` bullet（及 `### Human Queue` 標 `(resolved)` 者）[MUST] 結尾攜帶：

| Tag | 意義 | 約束 |
|-----|------|------|
| `(locked: D##)` | 此 fix 由 guard D## 鎖定 | D## [MUST] 對應 `src/lib/guards.test.ts` 真實存在的 `it('D##: ...')` |
| `(human: <理由>)` | 明確豁免 | 理由 [MUST] 具體 |

未攜帶 tag、或 `(locked: D##)` 指向不存在的 guard → Phase 2 失敗。由 **D17 guard** 檢查。

### b) 更新規則

| 文件 | [MUST] 動作 |
|---|---|
| `01-CLAUDE.md` | 加入 concrete example 永久規則；[NEVER] 模糊原則 |
| dev-brain | 新防禦模式用 `putkm` 記錄 |
| `TODO-REVIEW.md` | 更新已處理項 + 新發現 |

### c) [MUST] 準確性驗證清單

- 每條禁止規則 — 程式碼真的遵守？
- 每個模組路徑 — 檔案仍存在？職責相同？
- 技術棧版本 — 與 `package.json` 一致？
- 已知限制 — 有新發現未記錄？

---

## Section 5 — [MUST] Phase 4: 總結報告

```
HARDENING COMPLETE — [DATE]

LOCKED TODAY:
- [guards added to src/lib/guards.test.ts with reason]

DEFENSE SCAN:
- D1 型別預算(as any): N (was M, -X)
- D2 {@html} 預算: N
- D3 Secret: PASS / FAIL
- D4 未用依賴: PASS / FAIL
- D5 文檔路徑: PASS / FAIL
- D6 console 預算: N
- D7 Build/Test 綠: PASS / FAIL

HEALTH:
- typecheck: PASS / FAIL
- lint(astro check): PASS / FAIL
- vitest: PASS / FAIL
- build: PASS / FAIL

HUMAN QUEUE:
- [items]
```

[MUST] All PASS 才能輸出 COMPLETE。

---

## Section 5.5 — [MUST] 防禦模式共享（putkm）

```
putkm(
  problem="[防禦名稱]: [抓什麼，為什麼重要]",
  solution="""
  ## 偵測方式
  [regex / guard pattern]
  ## 實作代碼
  [guard 核心片段]
  ## 驗收條件
  [怎麼確認有效]
  """,
  tags=["defense-pattern", "astro", "pwa", "guard", "具體分類"],
  context="xmind-markdown — [觸發情境]"
)
```

Tag：`defense-pattern`（[MUST]）+ 技術棧 `astro`/`pwa`（[MUST]）+ 工具 `guard`/`pre-commit`（至少一個）+ 具體分類（`type-safety`/`xss-sanitization`/`secret-detection`/`dependency-hygiene`）。

---

## Section 6 — STOP 條件

| Condition | Reason |
|---|---|
| Same issue loops > 3 | [MUST] 需人工 |
| Single rule affects > 10 files | [MUST] 爆破半徑太大 |
| HUMAN queue > 3 in one cycle | [MUST] 需架構決策 |
| Unsure if safe | [MUST] 寧可保守 |
| Budget would increase | [ALWAYS] 預算只減不增 |

[MUST] 停下來。[NEVER] 猜。

---

## Section 7 — [MUST] 最終檢查清單

| # | Check | Pass Criteria |
|---|-------|---------------|
| 1 | Defense scan 全過 | D1–D7 全 PASS |
| 2 | Guard completeness | 本 cycle 模式都有 guard |
| 3 | Guard effectiveness | regex/budget 仍有效 |
| 4 | typecheck | 0 errors |
| 5 | lint | 0 errors |
| 6 | vitest | all green, count ≥ pre |
| 7 | build | 0 errors |
| 8 | 01-CLAUDE.md accuracy | 無過時規則/路徑 |
| 9 | Fix→Lock parity (D17) | 每條 fix 帶有效 tag |
| 10 | Registry 完整 (D18) | 每條 [MUST] section 已登記 |

[MUST] All pass before COMPLETE。第 9–10 項是強制性核心。

---

## Section 8 — [MUST] 關鍵防線模板

> 全部實作於 `src/lib/guards.test.ts`。每個 guard [MUST] 雙向驗證（fixed PASS / broken FAIL）。

### a) 通用 Budget Guard 模板

```typescript
it('budget guard: [PATTERN] within limit', () => {
  const MAX = N; // 只減不增
  const files = globSync('src/**/*.{ts,svelte,astro}', { ignore: ['**/*.test.ts'] });
  let count = 0; const violations: string[] = [];
  for (const file of files) {
    const matches = readFileSync(file, 'utf-8').match(/PATTERN_REGEX/g) || [];
    if (matches.length) { violations.push(`${file}: ${matches.length}`); count += matches.length; }
  }
  if (count > MAX) console.error('Violations:', violations);
  expect(count).toBeLessThanOrEqual(MAX);
});
```

### b) D1 `as any` budget

```typescript
it('D1: as-any within budget', () => {
  // MAX_AS_ANY = 1（現況）。regex: /\bas\s+any\b/
});
```

### c) D2 `{@html}` budget

```typescript
it('D2: {@html} usage within budget (track sanitization debt)', () => {
  // MAX_HTML_INJECT = 1。regex: /\{@html/。目標：引入 DOMPurify 後降為 0 的「已淨化」放行。
});
```

### d) D4 未用依賴

```typescript
it('D4: every package.json dependency is referenced in src/', () => {
  // 讀 package.json dependencies；每個 dep [MUST] 在 src/ 有 import/require 引用。
  // 例外 allowlist（type-only/@types 等）。
});
```

### e) D5 文檔路徑準確

```typescript
it('D5: doc-referenced file paths exist', () => {
  // 掃 README/01-CLAUDE/CLAUDE 內 `src/...` 路徑，每個 [MUST] 存在。
});
```

### f) Budget 追蹤表

| Guard | Detection | Budget | 只減不增 |
|---|---|---|---|
| as-any | `as any` | 1 | [ALWAYS] |
| {@html} | `{@html` | 1 | [ALWAYS] |
| console | `console.*`（排除 test/SW） | 1 | [ALWAYS] |
| 未用依賴 | deps 無引用 | 0 | [ALWAYS] |
| eslint-disable | `eslint-disable` | 0 | [ALWAYS] |

---

## Section 8.5 — Meta & Artifact Guards（D17–D21）

> 把「每條 [MUST] 都有強制機制」變成測試。對應 `ENFORCEMENT_REGISTRY.md`。
> 實作於 `src/lib/guards.test.ts`。artifact 類在 FIX-LOG/REFLECT 工作流未上軌前為寬鬆檢查（檔案不存在則 skip + 提示），[NEVER] 偽造通過。

| Guard | 用途 | 類別 |
|---|---|---|
| D17 | Fix→Lock parity（CHANGELOG lock-tag） | guard |
| D18 | D-META：registry 完整性 + section 覆蓋 | guard (meta) |
| D19 | FIX-LOG artifact（05 §1/§4/§5） | artifact |
| D20 | REFLECT artifact（06 §3/§4/§5） | artifact |
| D21 | THINK block artifact（02 §1, 05 §3） | artifact |

> D18 是 meta 層強制性核心：保證沒有任何 [MUST] 是孤兒。新增規則忘登記 → D18 fail。
> 在工作流未上軌前，D17/D19/D20/D21 採寬鬆模式（CHANGELOG/FIX-LOG/REFLECT 不存在則 skip 並 console.warn，不 fail），待團隊採用後轉為嚴格。

---

## Guard Index（D1–D21）— 全 guard 速查

| Guard | 用途 |
|---|---|
| D1–D7 | 防禦掃描矩陣（§2）：型別預算 / `{@html}` / secret / 未用依賴 / 文檔路徑 / console / build-test 綠 |
| D17 | Fix→Lock parity（CHANGELOG lock-tag） |
| D18 | D-META：registry 完整性 + section 覆蓋（§8.5） |
| D19 | FIX-LOG artifact |
| D20 | REFLECT artifact |
| D21 | THINK block artifact |
