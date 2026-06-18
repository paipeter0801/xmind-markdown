<div align="center">

# 🧠 XMind to Markdown Converter

**免費、隱私、離線可用的 XMind ↔ Markdown 雙向轉換器，內建 AI 心智圖生成**

把 XMind 心智圖一鍵轉成 Markdown，或把 Markdown 轉回 `.xmind`——全程在你的瀏覽器裡完成，**檔案不會上傳到任何伺服器**。

[🚀 立即使用（線上版）](https://paipeter0801.github.io/xmind-markdown) · [⭐ GitHub](https://github.com/paipeter0801/xmind-markdown)

</div>

---

## 一句話介紹

XMind to Markdown Converter 是一個**純前端、可離線、可安裝**的漸進式網頁應用（PWA），讓你在 **XMind 與 Markdown 之間無損雙向轉換**，並內建 AI 幫你把零散文字直接生成結構化心智圖。免安裝、免註冊、檔案不出本機。

---

## 為什麼選這個轉換器？（4 個差異化）

| 特點 | 一般線上轉換器 | 本工具 |
|---|---|---|
| 🔒 **隱私** | 要你上傳檔案到伺服器 | **全程本地瀏覽器運算，檔案不離開裝置** |
| 📴 **離線** | 沒網路就不能用 | **PWA，可安裝、可離線使用** |
| 🔁 **雙向** | 通常只能 XMind→MD | **XMind⇄Markdown 雙向 + 無損往返** |
| 🤖 **AI** | 無 | **輸入純文字，AI 自動生成心智圖** |

> 對於含有敏感內容的心智圖（商業計畫、客戶資料、會議記錄），「檔案不上傳」是硬需求——這正是本工具的核心價值。

---

## 核心功能

### 🔁 雙向無損轉換
- **XMind → Markdown**：把 `.xmind` 轉成乾淨的 Markdown 大綱，**完整保留**主題標題、備註（notes）、連結（links）、標籤（labels）、標記（markers/emoji）、階層結構。
- **Markdown → XMind**：把 Markdown 轉回可在 XMind 開啟的 `.xmind` 檔。
- **無損往返**：XMind → Markdown → XMind 來回轉換，**結構與文字資料不流失**（有自動化測試保證）。

### 🤖 AI 心智圖生成（AI Help）
不用從零畫心智圖——把腦中想法、會議筆記、零散清單貼進去，**AI 自動組織成有層次的心智圖大綱**，一鍵下載成 `.xmind` 或 `.md`。
- 只處理你**主動輸入**的文字，**不會**碰你上傳的 `.xmind` 檔。
- 採用 Cloudflare Workers AI（Qwen 模型）。

### 🌲 樹狀階層預覽
直觀看出 XMind 的父子階層——可摺疊大綱視圖（Document / 🌲 Tree 切換）、一鍵展開/收合全部、自訂預設展開層數。不再被「標題越深越小」的舊式預覽困擾。

### 📴 PWA 離線 + 自動更新
可安裝到桌面/手機當 App 用，斷網也能轉換；偵測到新版本會主動提示更新。

### 🌗 淺色/深色雙主題
完整的明暗主題支援，長時間使用不傷眼。

---

## 使用情境

- **學生**：把老師给的 XMind 講義大綱轉成 Markdown 筆記（相容 Obsidian、Notion、HackMD），或反過來把 Markdown 筆記轉成心智圖複習。
- **專案經理 / 產品經理**：把腦力激盪的 XMind 轉成文件貼进 Wiki，或用 AI 把會議結論快速生成心智圖。
- **內容創作者 / 寫作者**：用 AI 把寫作大綱生成心智圖，視覺化文章結構。
- **知識工作者**：在 XMind（視覺）與 Markdown（純文字）之間自由切換，兩種工具的優勢都能用。
- **隱私敏感場景**：法務、財務、研發等不能把內容上傳第三方伺服器的情境——本工具是少數能本地完成的選擇。

---

## 如何使用

### 線上版（免安裝）
直接打開：**https://paipeter0801.github.io/xmind-markdown**

1. **拖入檔案**：把 `.xmind`（→ 轉 Markdown）或 `.md`（→ 轉 XMind）拖進頁面，工具會自動判斷方向。
2. **文字輸入**：直接貼 Markdown 產出 `.xmind`。
3. **AI Help**：輸入「主題 + 想法」→ AI 生成心智圖 → 下載 `.xmind` 或 `.md`。

### 本地自架
```bash
npm install
npm run dev        # 本地預覽
npm run build      # 產出 dist/
```
100% 靜態輸出，可部署到任何靜態主機（GitHub Pages、Cloudflare Pages、Netlify、Vercel）。

---

## 常見問答（FAQ）

**Q：我的 XMind 檔會被上傳嗎？**
不會。XMind ⇄ Markdown 轉換**全程在你的瀏覽器內**執行（用 JSZip 解 ZIP、fast-xml-parser 解 XML），檔案內容不會離開你的裝置。AI 功能只在你主動使用「AI Help」時，將你輸入的**純文字**送至 AI，不會處理你上傳的 `.xmind`。

**Q：轉換會不會漏掉備註、連結、標籤？**
不會。標題、備註、連結、標籤、marker 標記與階層都會完整保留。這是本工具與多數「只轉標題」的工具最大的差異。

**Q：支援多深的心智圖階層？**
任意深度。匯出採用巢狀大綱（outline）格式，不像傳統做法超過 6 層就崩潰——10 層、20 層都能完整表達與還原。

**Q：AI 生成的內容準確嗎？**
AI 是輔助工具，會忠於你輸入的內容組織結構、合理分層，但建議產出後檢視再下載使用。AI 不會捏造你沒提供的資訊。

**Q：可以離線用嗎？**
可以。這是 PWA，第一次開啟後即可安裝並離線使用（XMind⇄MD 轉換完全不需要網路；AI 功能需連線）。

**Q：免費嗎？**
XMind ⇄ Markdown 雙向轉換**永久免費**。AI 生成功能目前免費開放，未來可能改為贊助制（想支持就贊助，不強迫付費）。

**Q：有哪些已知限制？**
- 多行備註在 Markdown 往返時會以單行接合保留（單行備註完全無損）。
- 圖片等二進位附件的「內容」仍需 `.xmind` 檔保存（Markdown 僅保留參考路徑）——這是 Markdown 格式的本質限制。

---

## 技術棧

- **Astro 5** + **Svelte 5**（runes）+ **Tailwind CSS 4** — 前端
- **jsZip** + **fast-xml-parser** — XMind（ZIP/XML）解析
- **marked** + **DOMPurify** — Markdown 渲染（經淨化）
- **Vitest** — 測試與架構守護（guards）
- **vite-plugin-pwa / Workbox** — 離線與自動更新
- **Cloudflare Workers AI（Qwen）** — AI 心智圖生成（獨立 Worker，與前端分離）

---

## 適合搜尋的關鍵字

XMind to Markdown · Markdown to XMind · XMind 轉 Markdown · 心智圖轉 Markdown · mind map to markdown · 免費線上 XMind 轉換器 · AI 心智圖產生器 · AI mind map generator · 離線 XMind 轉換 · 隱私 XMind 轉換 · XMind 匯出 Markdown · Markdown 匯入 XMind · XMind markdown converter online free

---

## 授權

MIT License — 自由使用、修改、部署。

---

<div align="center">

**覺得好用？歡迎 ⭐ Star 支持。**

 made with care for people who value privacy.

</div>
