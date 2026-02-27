#!/bin/bash
# 部署到 GitHub Pages

set -e

echo "🚀 部署到 GitHub Pages..."

# 1. 構建
echo "📦 構建中..."
npm run build

# 2. 部署到 gh-pages 分支根目錄
echo "📤 部署到 gh-pages..."
npx gh-pages -d dist --add

echo "✅ 部署完成！"
echo "📍 幾分鐘後生效於: https://paipeter0801.github.io/xmind-markdown/"
