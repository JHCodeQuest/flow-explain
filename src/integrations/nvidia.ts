import type { Investigation } from "../domain/types.ts";
import { explanationMessages, validateCitedSummary } from "./explanation.ts";
export interface NvidiaConfig { nvidiaKey: string; nvidiaModel: string; nvidiaBase: string }

/** Optional wording only. Evidence and findings are immutable; reject a model
 * result with unknown citations or an invalid envelope and retain local findings.
 */
export async function explainWithNvidia(result: Investigation, config: NvidiaConfig, transport: typeof fetch = fetch): Promise<Investigation["narrative"]> {
  if (!config.nvidiaKey) return { status: "unavailable", text: "", reason: "NVIDIA is not configured. The evidence-based result is still available." };
  const { messages, allowed } = explanationMessages(result);
  try {
    const response = await transport(`${config.nvidiaBase}/chat/completions`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(90_000),
      headers: { Authorization: `Bearer ${config.nvidiaKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.nvidiaModel, stream: false, temperature: 0, max_tokens: 650, chat_template_kwargs: { enable_thinking: false }, messages }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      const reason = response.status === 429 ? "NVIDIA is rate limited. Try later." : response.status === 401 || response.status === 403 ? "NVIDIA access was rejected. Check local configuration." : "NVIDIA is unavailable. Try later.";
      return { status: "unavailable", text: "", reason };
    }
    const data = await response.json() as { choices?: { message?: { content?: unknown } }[] };
    return { status: "ready", text: validateCitedSummary(data?.choices?.[0]?.message?.content, allowed) };
  } catch {
    return { status: "unavailable", text: "", reason: "NVIDIA did not return a valid cited explanation or the request timed out. The deterministic findings are unchanged." };
  }
}
