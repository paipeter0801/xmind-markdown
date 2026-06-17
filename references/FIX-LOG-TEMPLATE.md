# FIX-LOG 模板

> 每條 fix [MUST] 對應一個 entry（05-FIX-SPEC §1）。由 D19 guard 驗證四欄位齊全 + 驗證四重奏有紀錄。

## [YYYY-MM-DD] 簡述

- **目標:** 要修什麼 / 做什麼小功能
- **原因:** 為什麼需要
- **預期結果:** 完成後應該看到什麼
- **範圍:** 會動到哪些檔案

### THINK（非平凡 fix 才填，7 欄位見 THINKING.md）
```
ROOT CAUSE / CORRECT LAYER / AFFECTED FILES / ASSUMPTIONS / SIMPLER PATH / RISK / VERDICT
```

### 驗證四重奏
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test:run` → all pass, count ≥ 之前
- [ ] `npm run build` → success

### 結果
實際改了什麼、新增了什麼測試、lock tag（`(locked: D##)` / `(human: ...)`）。
