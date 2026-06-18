#!/usr/bin/env bash
#
# install-hooks.sh — 安裝/更新本地 git hook（pre-push gatekeeper）。
# git hook 不被版控追蹤，故以本腳本為「單一來源」產生，clone/換機後重跑即可還原。
#
# 用法：bash scripts/install-hooks.sh
#
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HOOK="$ROOT/.git/hooks/pre-push"

mkdir -p "$ROOT/.git/hooks"

cat > "$HOOK" <<'HOOK_EOF'
#!/usr/bin/env bash
# pre-push gatekeeper — XMind to Markdown ↔ AI GoEZ
# 推送前跑：(1) lint (2) 測試 (3) aigoez 佈版必要設定檢查。任一失敗擋住 push。
set -uo pipefail

echo "================================================================"
echo "  [Gatekeeper] Running pre-push checks..."
echo "================================================================"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Phase 1: Lint (fast fail)
if [ -f "$ROOT/package.json" ]; then
    echo "[1/3] astro check (lint)..."
    ( cd "$ROOT" && npm run lint ) || { echo "FAIL: lint. Push aborted."; exit 1; }
fi

# Phase 2: Tests
echo "[2/3] Running test suite..."
if [ -f "$ROOT/package.json" ]; then
    ( cd "$ROOT" && npm run test:run ) || { echo "FAIL: Tests failed. Push aborted."; exit 1; }
fi

# Phase 3: aigoez 佈版必要設定（base / CORS / AI endpoint / 工具列連結 / 品牌）
echo "[3/3] Checking aigoez deploy-critical settings..."
if [ -f "$ROOT/scripts/check-deploy-config.sh" ]; then
    bash "$ROOT/scripts/check-deploy-config.sh" || { echo "FAIL: 佈版設定檢查未過. Push aborted."; exit 1; }
fi

echo "================================================================"
echo "  [Gatekeeper] All checks passed. Pushing."
echo "================================================================"
HOOK_EOF

chmod +x "$HOOK"
chmod +x "$ROOT/scripts/check-deploy-config.sh" 2>/dev/null || true

echo "✅ Installed pre-push hook → $HOOK"
echo "   (3 phases: lint → tests → aigoez deploy-config check)"
