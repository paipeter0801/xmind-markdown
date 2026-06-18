/**
 * LLM 呼叫（Cloudflare Workers AI / qwen，仿 murmurnote src/server/lib/llm.ts）。
 * env.AI 由 wrangler [ai] binding 提供。回傳原始文字，交由 outline.extractOutline 萃取。
 */

export interface AiEnv {
  AI: { run: (model: string, payload: unknown) => Promise<unknown> };
}

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * 呼叫 LLM。systemPrompt + userMessage → 文字。
 * @param retries 格式不合格時的重試次數（每次於訊息尾端加強提示）
 */
export async function callAI(
  env: AiEnv,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const response = await env.AI.run(model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.6,
    max_tokens: 4096,
  });

  const resp = response as { choices?: Array<{ message?: { content?: string } }> };
  const text = resp.choices?.[0]?.message?.content;
  if (!text) throw new LLMError('Workers AI empty response');
  return text.trim();
}
