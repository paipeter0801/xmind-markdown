# 部署指南

## GitHub Pages 部署（推薦）

### 1. 安裝依賴

```bash
cd ~/code/xmind-markdown
npm install -D gh-pages
```

### 2. 設置 GitHub Repository

在 GitHub 創建一個新 repository `xmind-markdown`（可以是 private）

### 3. 連接本地 Git 到 GitHub

```bash
# 將本地現有專案連接到 GitHub
git remote add origin https://github.com/你的username/xmind-markdown.git
git branch -M main
git push -u origin main
```

### 4. 部署

```bash
npm run deploy
```

### 5. 啟用 GitHub Pages

1. 打開 GitHub repository
2. Settings → Pages
3. Source 選擇 `gh-pages` branch
4. Save

### 6. 訪問網站

```
https://你的username.github.io/xmind-markdown/
```

---

## Vercel 部署（最快）

### 1. 安裝 Vercel CLI

```bash
npm install -g vercel
```

### 2. 登入 Vercel

```bash
vercel login
```

### 3. 部署

```bash
cd ~/code/xmind-markdown
vercel --prod
```

### 4. 訪問網站

Vercel 會提供一個 `https://xmind-markdown.vercel.app` 的網址

---

## Netlify 部署

### 1. 安裝 Netlify CLI

```bash
npm install -g netlify-cli
```

### 2. 構建並部署

```bash
cd ~/code/xmind-markdown
npm run build
netlify deploy --prod --dir=dist
```

---

## 本地測試部署結果

```bash
npm run build
npm run preview
```

開啟 http://localhost:4321 預覽生產版本

---

## 自訂域名

如果使用自訂域名（如 `xmark.yourdomain.com`），需要在專案中配置：

### Astro 配置

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://xmark.yourdomain.com',
  // ...
});
```

重新構建並部署即可。
