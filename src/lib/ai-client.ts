/**
 * AI help 前端 client：fetch 獨立 Cloudflare Worker（worker/）。
 * Worker 回傳 outline markdown；前端再交給既有 MD→XMind 管線（無損往返）。
 */
import { AI_API_URL } from './ai-config';

export interface AiGenerateInput {
  topic: string;
  content: string;
  hint?: string;
}

export class AiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiClientError';
  }
}

export async function generateOutline(input: AiGenerateInput, signal?: AbortSignal): Promise<string> {
  if (!AI_API_URL) {
    throw new AiClientError('AI 尚未啟用（管理員尚未設定 API endpoint）');
  }
  let resp: Response;
  try {
    resp = await fetch(`${AI_API_URL}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    });
  } catch {
    throw new AiClientError('無法連線至 AI 服務，請檢查網路或稍後再試。');
  }

  if (resp.status === 429) {
    throw new AiClientError('請求過於頻繁，請稍後再試。');
  }
  if (!resp.ok) {
    let msg = `AI 請求失敗（${resp.status}）`;
    try {
      const j = (await resp.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* 用預設訊息 */
    }
    throw new AiClientError(msg);
  }

  const data = (await resp.json()) as { markdown?: string };
  if (!data?.markdown) throw new AiClientError('AI 回應格式錯誤');
  return data.markdown;
}
