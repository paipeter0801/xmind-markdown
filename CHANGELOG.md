# CHANGELOG

> Fix→Lock 規則（04-HARDENING §4.a1）：每條 `### Fixed` bullet [MUST] 結尾攜帶
> `(locked: D##)`（對應 `src/lib/guards.test.ts` 的 guard）或 `(human: <理由>)`。
> 未攜帶 tag = D17 fail。

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
