/**
 * Marker emoji ↔ XMind marker-id 雙向對照（XMind↔MD 無損往返的共享契約）。
 * 匯出（XMind→MD）用 MARKER_ID_TO_EMOJI；匯入（MD→XMind）用 emojiToMarkerId。
 *
 * 已知往返限制（markdown/markdown 規格硬限制，非 bug）：
 * - `check` 與 `task-done` 皆對應 ✅；反向 ✅ 一律解析為 `check`（碰撞，已註明）。
 * - `progress-*` 為多字元 emoji 序列（🟩🟩…）；反向用最長匹配還原。
 */

export const MARKER_ID_TO_EMOJI: Record<string, string> = {
  // Priority
  'priority-1': '🔴',
  'priority-2': '🟠',
  'priority-3': '🟡',
  'priority-4': '🔵',
  'priority-5': '⚪',
  'priority-6': '🟣',
  // Symbol
  flag: '🚩',
  smile: '😊',
  frown: '☹️',
  star: '⭐',
  check: '✅',
  cross: '❌',
  question: '❓',
  exclamation: '❗',
  'arrow-right': '➡️',
  'arrow-left': '⬅️',
  'arrow-up': '⬆️',
  'arrow-down': '⬇️',
  plus: '➕',
  minus: '➖',
  // Task
  'task-start': '▶️',
  'task-done': '✅',
  'task-half': '🔶',
  'task-wait': '⏸️',
  'task-review': '👁️',
  // Progress（多字元序列）
  'progress-0': '⬜',
  'progress-1': '🟩',
  'progress-2': '🟩🟩',
  'progress-3': '🟩🟩🟩',
  'progress-4': '🟩🟩🟩🟩',
  'progress-5': '🟩🟩🟩🟩🟩',
};

/** 反向：emoji → marker-id。碰撞時保留宣告在前者（check 在 task-done 前 → ✅ 取 check）；最長匹配處理 progress 序列。 */
const EMOJI_TO_ID: { emoji: string; id: string }[] = (() => {
  const seen = new Set<string>();
  const list: { emoji: string; id: string }[] = [];
  for (const [id, emoji] of Object.entries(MARKER_ID_TO_EMOJI)) {
    if (seen.has(emoji)) continue; // 每 emoji 取首個 id
    seen.add(emoji);
    list.push({ emoji, id });
  }
  return list.sort((a, b) => b.emoji.length - a.emoji.length);
})();

/** 匯出用：marker-id → emoji（未知 id 原樣回傳）。 */
export function markerIdToEmoji(id: string): string {
  return MARKER_ID_TO_EMOJI[id] ?? id;
}

/** 匯入用：把字串開頭的 emoji marker 抽出，回傳 { ids, rest }。多個 emoji 連續（以空白分隔）依序解析。 */
export function extractLeadingEmojis(text: string): { ids: string[]; rest: string } {
  const ids: string[] = [];
  let rest = text.trimStart();
  // 反覆嘗試從開頭剝離一個已知 emoji（空白分隔）
  for (;;) {
    const hit = EMOJI_TO_ID.find((m) => rest.startsWith(m.emoji));
    if (!hit) break;
    ids.push(hit.id);
    rest = rest.slice(hit.emoji.length).replace(/^\s+/, '');
  }
  return { ids, rest };
}

/** 便覽：emoji 是否為已知 marker 開頭。 */
export function isKnownMarkerEmoji(text: string): boolean {
  return EMOJI_TO_ID.some((m) => text.trimStart().startsWith(m.emoji));
}
