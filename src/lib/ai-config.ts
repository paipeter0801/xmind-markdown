/**
 * AI help 設定（雙站 B 模式）。
 *
 * 部署 worker/ 後，把下方 AI_API_URL 填入你的 Worker URL（wrangler deploy 會印出），
 * 例如 https://xmind-markdown-ai.<account>.workers.dev
 * 留空 → AI help 模式顯示「未啟用」提示、按鈕停用（前端仍可 build/部署，不會壞）。
 *
 * 隱私線：AI 只處理使用者在此模式「主動輸入」的文字，不碰上傳的 .xmind。
 */
export const AI_API_URL = 'https://xmind-markdown-ai.murmurnoteapp.workers.dev';

export const AI_ENABLED = AI_API_URL.trim().length > 0;
