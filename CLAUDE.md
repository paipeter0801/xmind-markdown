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

## ⚠️ 佈版必要設定（每次改動/部署/被問「上線」時，MUST 逐條檢查）

> 詳細 runbook 見 aigoez repo `docs/UPDATE-TOOL-RUNBOOK.md`。以下是不可漏的必要設定。

**正式站 = `https://aigoez.com/xmind-markdown/`（不是 gh-pages）。** gh-pages 只是備援/預覽；aigoez 才是正式。工具改動 commit 在**本 repo**，正式上線靠 aigoez 端的同步部署（見下）。

**改完工具後，正式部署在「aigoez repo」做，不是這裡：**
```bash
cd /home/peter/Code/SEO-SITE/aigoez
git checkout main            # MUST 在 main（正式分支），否則只上 preview
make deploy                  # sync 工具(build) → build aigoez → 推 Cloudflare
```
> 本 repo 不需要為了「上線 aigoez」而部署；aigoez 的 `make xmind-sync` 會自己 `cd` 來這裡 `npm run build`。

**每次佈版前 MUST 確認的 6 個設定（任一跑掉就壞）：**
| # | 設定 | 位置 | 跑掉的後果 |
|---|---|---|---|
| 1 | `base: '/xmind-markdown/'`（含尾斜線） | `astro.config.mjs` | 掛 aigoez 後 asset 路徑全錯、白屏 |
| 2 | worker CORS 含 `https://aigoez.com` + `https://www.aigoez.com` | `worker/wrangler.toml` 的 `ALLOWED_ORIGINS` | AI Help 從 aigoez 用 → 403 |
| 3 | worker 有改動 → `cd worker && wrangler deploy`（否則線上 worker 還是舊的） | — | AI 行為/錯誤處理沒上線 |
| 4 | AI endpoint 不動：`AI_API_URL` = `https://xmind-markdown-ai.murmurnoteapp.workers.dev` | `src/lib/ai-config.ts` | AI Help 壞 |
| 5 | 工具列連結是 root 絕對路徑 `/xmind-to-markdown/` 等（不可被 base 前綴化） | `src/layouts/Layout.astro` | 導航連到 `/xmind-markdown/xmind-to-markdown/` → 404 |
| 6 | 品牌＝「AI GoEZ」+「XMind 8 相容」 | Header/Hero/Footer/manifests | 品牌不一致 |

**commit 邊界（MUST）：** 工具 UI/邏輯/CSS/AI client/worker → commit 在**本 repo**；aigoez 內容頁/Navbar/SEO/Makefile → aigoez repo；工具 build 產物（`public/xmind-markdown/`）→ **永不 commit**（gitignore，部署時重建）。

**PWA 卡舊版：** 驗收用無痕視窗或 DevTools→Application→Unregister SW（舊 SW precache 會擋新版）。


## Dev Brain (Development Experience Database)

You have access to the `dev-brain` MCP server — a shared knowledge base of development experiences.

**Mandatory behaviors:**

1. **When you encounter a bug, error, or performance issue:** Call `search_experience` with a description of the problem BEFORE attempting to fix it. Learn from past solutions.

2. **After you successfully solve a non-trivial problem:** Call `record_experience` to save what you learned. Include a clear problem description, the solution, relevant tags, and context.

3. **Tags should be lowercase and specific:** e.g., `["bugfix", "python", "flask"]`, `["perf", "sql", "postgresql"]`, `["refactor", "react"]`

**When in doubt, record it.** It is better to have too many experiences than to lose institutional knowledge.
