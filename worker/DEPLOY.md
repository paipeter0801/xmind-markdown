# AI Worker 部署指南（Cloudflare Workers AI）

> 雙站 (B) 模式：靜態前端站留 GitHub Pages，AI 後端是這個獨立 Cloudflare Worker。
> 前端透過 `src/lib/ai-config.ts` 的 `AI_API_URL` 指向此 Worker。

## 一次性設定

1. **進 worker 目錄安裝**
   ```bash
   cd worker
   npm install
   cp wrangler.toml.example wrangler.toml
   ```

2. **登入 Cloudflare**（用你的帳號）
   ```bash
   npx wrangler login
   ```

3. **設定 `wrangler.toml`**
   - `[ai] binding = "AI"` 已在（[MUST] 確認帳號已啟用 Workers AI）。
   - `ALLOWED_ORIGINS`：改成你的前端站網址（逗號分隔），
     例如 `https://paipeter0801.github.io,https://你的自訂域`。
     本地開發保留 `http://localhost:4321`。

4. **部署**
   ```bash
   npm run deploy   # = wrangler deploy
   ```
   部署完會印出 Worker URL，例如：
   `https://xmind-markdown-ai.<account>.workers.dev`

## 接回前端

5. 把 Worker URL 填入 `src/lib/ai-config.ts`：
   ```ts
   export const AI_API_URL = 'https://xmind-markdown-ai.<account>.workers.dev';
   ```
6. 重新 build + 部署前端（`npm run deploy`）。AI Help 分頁即啟用。

## 驗證

```bash
curl https://xmind-markdown-ai.<account>.workers.dev/api/ai/health
# {"ok":true}

curl -X POST https://xmind-markdown-ai.<account>.workers.dev/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://paipeter0801.github.io" \
  -d '{"topic":"測試","content":"一個想法"}'
```

## 安全 / 成本須知

- **CORS 白名單**：只放行 `ALLOWED_ORIGINS` 內的來源；其他來源 403。
- **限流**：in-memory，每 origin+IP 每分鐘 `RATE_LIMIT_PER_MIN`（預設 10）。軟性防刷；付費/配額段會換 KV。
- **AI 級聯**：Gemini（key2 → key3 輪替）主力 → Workers AI (qwen) 最終備援。
  任一用罄自動換下一個；全部用罄回 `AI_QUOTA_EXHAUSTED` 友善訊息。
- **Gemini keys（secret，不寫進程式碼）**：
  ```bash
  cd worker
  npx wrangler secret put GOOGLE_GEMINI_API2_KEY   # 貼上第一把
  npx wrangler secret put GOOGLE_GEMINI_API3_KEY   # 貼上第二把
  ```
  未設則自動退回只用 Workers AI；設了即 Gemini 主力。
- **成本**：Gemini Flash-Lite 極便宜；Workers AI 按用量。先設低限流觀察。贊助制（LemonSqueezy，參考 jp-heartgui-dev）為後續，本階段未接。
- **隱私**：AI 只吃使用者在此模式主動輸入的文字，**不碰**上傳的 `.xmind`（免費轉換全程本地）。

## 錯誤碼（前端可對應顯示）

| code | 意義 | worker 回的繁中訊息 |
|---|---|---|
| `RATE_LIMITED` | 該 IP/origin 每分鐘限流 | 請求過於頻繁，請稍後再試。 |
| `AI_QUOTA_EXHAUSTED` | Gemini key2/3 + Workers AI 皆用罄 | AI 服務今日用量已達上限，請稍後再試（也歡迎未來贊助支持）。 |
| `AI_FORMAT_ERROR` | AI 輸出無法解析成 outline | AI 輸出的格式無法解析，請調整輸入內容後再試一次。 |
| `AI_UNAVAILABLE` | 暫時無回應/網路問題 | AI 服務暫時無法回應，請稍後再試。 |
| `BAD_REQUEST` / `CORS_DENIED` | 輸入格式錯 / 來源不允許 | （對應訊息） |

## 開發測試

```bash
cd worker
npm run typecheck   # tsc --noEmit
npm test            # vitest（mock AI；prompt/outline/ratelimit 純函數）
npm run dev         # wrangler dev（本地，含真 AI binding）
```

## 環境變數一覽

| 變數 | 說明 | 預設 |
|---|---|---|
| `ALLOWED_ORIGINS` | CORS 白名單（逗號分隔） | localhost |
| `RATE_LIMIT_PER_MIN` | 每分鐘限流 | `10` |
| `AI_MODEL` | Workers AI 模型 | `@cf/qwen/qwen3-30b-a3b-fp8` |
