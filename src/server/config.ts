import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { isUsableToken, normalizeMeterlessBase } from "../integrations/meterless.ts";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export interface Config {
  port: number; envFile: string; meterlessRepo: string; zetarisRepo: string; memoryDir: string;
  python: string; nvidiaKey: string; nvidiaModel: string; nvidiaBase: string;
  explainProvider: "meterless" | "nvidia"; meterlessBase: string; meterlessToken: string; meterlessModel: string;
}
function readEnv(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  try { return Object.fromEntries(Object.entries(parseEnv(fs.readFileSync(file, "utf8"))).filter((entry): entry is [string, string] => typeof entry[1] === "string")); }
  catch { throw new Error("An environment file could not be parsed. Check local configuration."); }
}

/** Read path configuration locally, and only select NVIDIA fields from the
 * existing shared secret file. Config is server-only and must never be serialized.
 */
export function loadConfig(): Config {
  const local = { ...readEnv(path.join(ROOT, ".env.local")), ...process.env };
  const envFile = path.resolve(ROOT, local.FLOW_ENV_FILE || "../getting-started/.env.local");
  const secret = { ...readEnv(envFile), ...process.env };
  const port = Number(local.FLOW_PORT || "4317");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("FLOW_PORT must be an integer between 1024 and 65535.");
  const base = secret.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const url = new URL(base);
  if (url.protocol !== "https:" || url.hostname !== "integrate.api.nvidia.com" || url.port || url.pathname.replace(/\/$/, "") !== "/v1" || url.username || url.password || url.search || url.hash) {
    throw new Error("NVIDIA_BASE_URL must be the official NVIDIA HTTPS /v1 endpoint.");
  }
  const explainProvider = local.FLOW_EXPLAIN_PROVIDER || "meterless";
  if (explainProvider !== "meterless" && explainProvider !== "nvidia") throw new Error("FLOW_EXPLAIN_PROVIDER must be meterless or nvidia.");
  // Runtime settings come only from the shared secret file or the process
  // environment, never from this project's .env.local (which may hold placeholders).
  const meterlessToken = secret.METERLESS_RUNTIME_TOKEN?.trim() || "";
  return { port, envFile, explainProvider,
    meterlessBase: normalizeMeterlessBase(secret.METERLESS_BASE_URL?.trim() || "http://127.0.0.1:8088/v1"),
    meterlessToken: isUsableToken(meterlessToken) ? meterlessToken : "", meterlessModel: secret.METERLESS_MODEL?.trim() || "meterless/auto", meterlessRepo: path.resolve(ROOT, local.METERLESS_REPO || "../meterless"),
    zetarisRepo: path.resolve(ROOT, local.ZETARIS_REPO || "../getting-started"),
    memoryDir: path.resolve(ROOT, local.FLOW_MEMORY_DIR || ".flow-explain/memory"),
    python: local.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3"),
    nvidiaKey: secret.NVIDIA_API_KEY?.trim() || "", nvidiaModel: secret.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b", nvidiaBase: base.replace(/\/$/, "") };
}
