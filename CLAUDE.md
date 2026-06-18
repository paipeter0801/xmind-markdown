# CLAUDE.md — XMind to Markdown Converter

> 本專案採用共享工程框架（適應版，源自 `~/Code/rules/cloudflare/`，已改寫為靜態 Astro PWA 棧）。
> 框架文件：`01-CLAUDE.md` 憲法 / `02-BUILD-SPEC.md` 建造 / `03-DOC-AND-CODE-REVIEW.md` 審計 /
> `04-HARDENING_PROTOCOL.md` 加固 / `05-FIX-SPEC.md` 修復 / `06-REFLECT.md` 自審 /
> `07-ALL-IN-ONE.md` 收斂 / `THINKING.md` 思考模板 / `ENFORCEMENT_REGISTRY.md` 強制登記。

## Engineering Contract

This project follows the shared `ENGINEERING_GUIDE.md`（`~/Code/rules/ENGINEERING_GUIDE.md`）。
Read it before modifying CI/CD, Makefiles, or git hooks.

Absolute rules:
- [NEVER] use `--no-verify` on any git operation
- [ALWAYS] run `make clean` after CI（本專案 CI 在 GitHub-hosted runner，無 3.3GB 壓力，仍保留 clean 慣例）
- [ALWAYS] check the version matrix before writing code（Node 釘於 `package.json` engines）
- [NEVER] hardcode credentials or tokens in any file
- [NEVER] generate `--force` push to `main` / `gh-pages` under any circumstance

## 技術棧（現況）

| 項目 | 值 |
|---|---|
| 類型 | 純前端靜態 PWA（無後端、無 DB、無 server runtime） |
| 框架 | Astro 5（islands）+ Svelte 5（runes）+ Tailwind CSS 4 |
| 轉換核心 | `src/lib/client-converter.ts`（XMind↔MD，jszip + fast-xml-parser，純瀏覽器） |
| 測試 | Vitest |
| 部署 | GitHub Pages（`gh-pages` 分支，`npm run deploy`） |

## 常用指令

```bash
npm install          # 安裝
npm run dev          # 本地預覽
npm run lint         # astro check（型別/診斷）
npm run typecheck    # tsc --noEmit
npm test             # vitest run（含 guards）
npm run build        # astro build → dist/
npm run deploy       # build + gh-pages -d dist
make ci              # lint + test + build（CI 等效）
```

## 專案特有規則

- [MUST] XMind→MD 邏輯唯一來源是 `src/lib/client-converter.ts`；[NEVER] 重新引入平行實作（已於 2026-06 清除重複 converter）。
- [MUST] 預覽的樹狀結構（TreeView）直接取自 converter 回傳的 `tree`，[NEVER] 從 markdown 字串反解。
- [NEVER] 把 `public/client-converter.js` 或手動 `?v=` 快取戳記加回來（converter 已併入 Vite 模組圖，自動 content-hash）。
- [ALWAYS] 修改 SW（`src/sw.ts`）後，記得更新體驗：`clients.claim` + `Layout.astro` 的 update toast 已就位。


## Dev Brain (Development Experience Database)

You have access to the `dev-brain` MCP server — a shared knowledge base of development experiences.

**Mandatory behaviors:**

1. **When you encounter a bug, error, or performance issue:** Call `search_experience` with a description of the problem BEFORE attempting to fix it. Learn from past solutions.

2. **After you successfully solve a non-trivial problem:** Call `record_experience` to save what you learned. Include a clear problem description, the solution, relevant tags, and context.

3. **Tags should be lowercase and specific:** e.g., `["bugfix", "python", "flask"]`, `["perf", "sql", "postgresql"]`, `["refactor", "react"]`

**When in doubt, record it.** It is better to have too many experiences than to lose institutional knowledge.
