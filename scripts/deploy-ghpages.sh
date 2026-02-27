#!/bin/bash
# 部署到 GitHub Pages

set -e

echo "🚀 部署到 GitHub Pages..."

# 1. 構建
echo "📦 構建中..."
npm run build

# 2. 部署到 gh-pages 分支
echo "📤 部署到 gh-pages 分支..."
npx gh-pages-add --dist dist

# 3. 推送
echo "⬆️  推送到 GitHub..."
git push origin gh-pages

echo "✅ 部署完成！"
echo "📍 幾分鐘後生效於: https://你的username.github.io/xmind-markdown/"
