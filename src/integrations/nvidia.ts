import type { Investigation } from "../domain/types.ts";
import { ProviderError, reviewedExplanation, type Complete } from "./review.ts";
export interface NvidiaConfig { nvidiaKey: string; nvidiaModel: string; nvidiaBase: string }

/** Optional wording only. Evidence and findings are immutable; the draft is checked,
 * revised at most once, and otherwise the local findings are retained.
 */
export async function explainWithNvidia(result: Investigation, config: NvidiaConfig, transport: typeof fetch = fetch): Promise<Investigation["narrative"]> {
  if (!config.nvidiaKey) return { status: "unavailable", text: "", reason: "NVIDIA is not configured. The evidence-based result is still available." };
  const complete: Complete = async (messages, signal) => {
    const response = await transport(`${config.nvidiaBase}/chat/completions`, {
      method: "POST", redirect: "error", signal: AbortSignal.any([signal, AbortSignal.timeout(90_000)]),
      headers: { Authorization: `Bearer ${config.nvidiaKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.nvidiaModel, stream: false, temperature: 0, max_tokens: 650, chat_template_kwargs: { enable_thinking: false }, messages }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ProviderError(response.status === 429 ? "NVIDIA is rate limited. Try later." : response.status === 401 || response.status === 403 ? "NVIDIA access was rejected. Check local configuration." : "NVIDIA is unavailable. Try later.");
    }
    const data = await response.json() as { choices?: { message?: { content?: unknown } }[] };
    return { content: data?.choices?.[0]?.message?.content };
  };
  return reviewedExplanation(result, complete, { provider: "NVIDIA", model: config.nvidiaModel, failure: "NVIDIA did not return a valid reply or the request timed out. The deterministic findings are unchanged." });
}
