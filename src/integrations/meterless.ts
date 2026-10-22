import type { Investigation } from "../domain/types.ts";
import { explanationMessages, validateCitedSummary } from "./explanation.ts";
export interface MeterlessConfig { meterlessBase: string; meterlessToken: string; meterlessModel: string }
export type RuntimeState = "online" | "unauthorized" | "offline";

const APP = "flow-explain";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Normalise to `<origin>/v1` (never /v1/v1) and accept only a local runtime,
 * because the runtime token is sent to this address.
 */
export function normalizeMeterlessBase(value: string): string {
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `http://${value.trim()}`); }
  catch { throw new Error("METERLESS_BASE_URL is not a valid URL."); }
  if (!["http:", "https:"].includes(url.protocol) || !LOOPBACK.has(url.hostname) || url.username || url.password || url.search || url.hash) {
    throw new Error("METERLESS_BASE_URL must be a loopback runtime URL such as http://127.0.0.1:8088/v1.");
  }
  return `${url.origin}/v1`;
}

/** The runtime rejects `rt-local`; templates leave `{{...}}` style placeholders. */
export function isUsableToken(token: string): boolean {
  return token.length > 0 && token !== "rt-local" && !/[{}<>]|^your[-_ ]|changeme/i.test(token);
}

const headers = (config: MeterlessConfig, chat: boolean): Record<string, string> => ({
  Authorization: `Bearer ${config.meterlessToken}`, "meterless-app": APP,
  ...(chat ? { "Content-Type": "application/json", "meterless-scope": "user" } : {}),
});

/** Authenticated model discovery: 401/403 is unauthorized, 200 with meterless ids is online, all else offline. */
export async function checkNightshift(config: MeterlessConfig, transport: typeof fetch = fetch): Promise<RuntimeState> {
  try {
    const response = await transport(`${config.meterlessBase}/models`, { headers: headers(config, false), redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (response.status === 401 || response.status === 403) { await response.body?.cancel(); return "unauthorized"; }
    if (!response.ok) { await response.body?.cancel(); return "offline"; }
    const data = await response.json() as { data?: { id?: unknown }[] };
    return data?.data?.some((m) => typeof m.id === "string" && m.id.startsWith("meterless/")) ? "online" : "offline";
  } catch { return "offline"; }
}

const unavailable = (reason: string): Investigation["narrative"] => ({ status: "unavailable", text: "", reason });

/** Optional wording only, through the local Meterless Nightshift runtime. Never
 * falls back to another provider; deterministic findings are unchanged on failure.
 */
export async function explainWithNightshift(result: Investigation, config: MeterlessConfig, transport: typeof fetch = fetch): Promise<Investigation["narrative"]> {
  if (!config.meterlessToken) return unavailable("Meterless Nightshift is not configured. The evidence-based result is still available.");
  const state = await checkNightshift(config, transport);
  if (state === "unauthorized") return unavailable("Nightshift rejected the runtime token. Check local configuration.");
  if (state === "offline") return unavailable("Nightshift is not reachable at the configured address. Start the runtime and try again.");
  const { messages, allowed } = explanationMessages(result);
  try {
    // 4096 tokens: the routed model still reasons despite enable_thinking:false and needed ~2000 for
    // this prompt; 32 and 512 returned an empty reply (502). 180 s: model loads can take minutes.
    const response = await transport(`${config.meterlessBase}/chat/completions`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(180_000), headers: headers(config, true),
      body: JSON.stringify({ model: config.meterlessModel, stream: false, temperature: 0, max_tokens: 4096, chat_template_kwargs: { enable_thinking: false }, messages }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return unavailable(response.status === 429 ? "Nightshift is rate limited. Try later." : response.status === 401 || response.status === 403 ? "Nightshift rejected the runtime token. Check local configuration." : "Nightshift is unavailable. Try later.");
    }
    const data = await response.json() as { model?: unknown; choices?: { message?: { content?: unknown } }[] };
    const text = validateCitedSummary(data?.choices?.[0]?.message?.content, allowed);
    return { status: "ready", text, provider: "Meterless Nightshift", model: typeof data.model === "string" ? data.model.slice(0, 80) : config.meterlessModel };
  } catch {
    return unavailable("Nightshift did not return a valid cited explanation or the request timed out. The deterministic findings are unchanged.");
  }
}
