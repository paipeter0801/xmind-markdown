#!/usr/bin/env bash
#
# check-deploy-config.sh — 驗證 aigoez 正式站佈版的 6 個必要設定。
# 任一不符 → 非 0 退出（pre-push hook 會擋住 push，避免壞設定上線）。
#
# 用法：
#   bash scripts/check-deploy-config.sh        # 手動檢查
#   （由 .git/hooks/pre-push 自動呼叫）
#
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

fail=0
err() { echo "  ❌ $1"; fail=1; }
ok()  { echo "  ✅ $1"; }

echo "🔍 檢查 aigoez 佈版必要設定（正式站 = https://aigoez.com/xmind-markdown/）..."

# 1. base 必須是 '/xmind-markdown/'（含尾斜線）
if grep -q "base: '/xmind-markdown/'" astro.config.mjs 2>/dev/null; then
  ok "base = /xmind-markdown/（astro.config.mjs）"
else
  err "base 不是 '/xmind-markdown/'（含尾斜線）@ astro.config.mjs → 掛 aigoez 會白屏"
fi

# 2. worker CORS 含 aigoez.com + www.aigoez.com（用實際 wrangler.toml，否則 fallback .example）
ORIGINS_FILE="worker/wrangler.toml"
[ -f "$ORIGINS_FILE" ] || ORIGINS_FILE="worker/wrangler.toml.example"
if grep -q "https://aigoez.com" "$ORIGINS_FILE" 2>/dev/null && grep -q "https://www.aigoez.com" "$ORIGINS_FILE" 2>/dev/null; then
  ok "worker CORS 含 aigoez.com + www.aigoez.com（$ORIGINS_FILE）"
else
  err "worker ALLOWED_ORIGINS 缺 https://aigoez.com 或 https://www.aigoez.com @ $ORIGINS_FILE → AI Help 從 aigoez 用會 403"
fi

# 3. AI endpoint 不動
if grep -q "AI_API_URL = 'https://xmind-markdown-ai.murmurnoteapp.workers.dev'" src/lib/ai-config.ts 2>/dev/null; then
  ok "AI_API_URL = 正式 worker（src/lib/ai-config.ts）"
else
  err "AI_API_URL 與正式 worker 不符 @ src/lib/ai-config.ts → AI Help 壞"
fi

# 4. 工具列 root 絕對連結（不可被 base 前綴化）
if grep -q 'href="/xmind-to-markdown/"' src/layouts/Layout.astro 2>/dev/null; then
  ok "工具列 root 絕對連結（Layout.astro）"
else
  err "工具列缺 root 絕對連結 /xmind-to-markdown/ @ Layout.astro → 導航 404"
fi

# 5. 品牌 AI GoEZ
if grep -q "AI GoEZ" src/components/layout/Header.svelte 2>/dev/null; then
  ok "品牌 AI GoEZ（Header.svelte）"
else
  err "Header 缺「AI GoEZ」品牌"
fi

echo "----------------------------------------------------------------"
if [ "$fail" = 1 ]; then
  echo "⛔ 佈版設定檢查失敗——上面 ❌ 的設定會讓 aigoez 正式站壞掉。修正後再 push。"
  exit 1
fi
echo "✅ 全部佈版設定 OK。"
echo "💡 提醒：本 push 只更新工具原始碼。正式上線 aigoez 要在 aigoez repo 的 main 跑："
echo "      cd /home/peter/Code/SEO-SITE/aigoez && git checkout main && make deploy"
echo "💡 worker 有改動記得：cd worker && wrangler deploy"
exit 0
