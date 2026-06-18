/**
 * outline markdown 格式驗證 + 修復。
 * LLM（qwen）不一定乖乖吐格式，這裡做防呆：確保第一行是 H1、剝掉說明文字/程式碼框、正規化 bullet 縮排。
 */

/** 從 LLM 原始輸出萃取出可用的 outline markdown；失敗回傳 null。 */
export function extractOutline(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  let text = raw.trim();

  // 1. 去掉 ```markdown / ``` 程式碼框
  text = text.replace(/^```(?:markdown|md)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // 2. 找第一個 H1 行作為起點（剝掉模型的前置說明）
  const h1Idx = text.search(/^#\s+\S/m);
  if (h1Idx === -1) {
    // 退化：沒有 H1，若整段看起來像 bullet 列表，補一個主題 H1
    if (/^\s*[-*+]\s/m.test(text)) {
      text = '# 心智圖\n\n' + text;
    } else {
      return null;
    }
  } else if (h1Idx > 0) {
    text = text.slice(h1Idx);
  }

  // 3. 截掉 H1 之後可能出現的結尾說明（遇到連續空行後的非縮排純文字段落且非 bullet/heading 則停）
  //    簡單處理：保留到最後一個 bullet 或 heading 之後的內容
  const lines = text.split('\n');
  let lastMeaningful = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*[-*+]\s+\S/.test(lines[i]) || /^#{1,6}\s+\S/.test(lines[i])) {
      lastMeaningful = i;
    }
  }
  const kept = lastMeaningful >= 0 ? lines.slice(0, lastMeaningful + 1) : lines;

  // 4. 正規化 bullet 標記：*,+ → -
  const normalized = kept
    .map((l) => l.replace(/^(\s*)[*+]\s+/, '$1- '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 5. 最終檢查：必須有 H1 且至少一個 bullet
  if (!/^#\s+\S/.test(normalized)) return null;
  if (!/^\s*-\s+\S/m.test(normalized)) return null;
  return normalized;
}
