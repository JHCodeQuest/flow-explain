import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { investigate } from "../src/domain/investigate.ts";
import { checkNightshift, explainWithNightshift, isUsableToken, normalizeMeterlessBase } from "../src/integrations/meterless.ts";
import { loadConfig } from "../src/server/config.ts";
import type { Dataset } from "../src/domain/types.ts";
const demo: Dataset = JSON.parse(fs.readFileSync(new URL("../data/demo.json", import.meta.url), "utf8"));
const config = { meterlessBase: "http://127.0.0.1:8088/v1", meterlessToken: "synthetic-secret", meterlessModel: "meterless/auto" };
const models = () => new Response(JSON.stringify({ data: [{ id: "meterless/auto" }] }));
const chat = (content: unknown, model = "synthetic-routed-model") => new Response(JSON.stringify({ model, choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] }));
const good = { summary: "The routing event reports a failed assignment.", citations: ["E-103", "R-02"] };
/** Answers /models and /chat/completions, recording each request. */
function runtime(onChat: () => Response, onModels: () => Response = models) {
  const calls: { url: string; options?: RequestInit }[] = [];
  const transport = (async (url: string, options?: RequestInit) => { calls.push({ url, options }); return url.endsWith("/models") ? onModels() : onChat(); }) as typeof fetch;
  return { calls, transport };
}

test("base URL is normalised to one /v1 and limited to a loopback runtime", () => {
  for (const value of ["127.0.0.1:8088", "http://127.0.0.1:8088/v1", "http://127.0.0.1:8088/v1/chat/completions", "http://localhost:8088/v1/models", "http://127.0.0.1:8088/healthz"]) {
    assert.match(normalizeMeterlessBase(value), /^http:\/\/(127\.0\.0\.1|localhost):8088\/v1$/, value);
  }
  for (const value of ["https://meterless.example.com/v1", "http://user:pw@127.0.0.1:8088/v1", "http://127.0.0.1:8088/v1?x=1", "not a url"]) assert.throws(() => normalizeMeterlessBase(value), /METERLESS_BASE_URL/, value);
});
test("placeholder and rejected tokens are unusable", () => {
  for (const token of ["", "rt-local", "{{TOKEN}}", "<token>", "your-token", "changeme"]) assert.equal(isUsableToken(token), false, token);
  assert.equal(isUsableToken("synthetic-secret"), true);
});
test("shared settings are used and placeholders in the project env file cannot override them", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-explain-"));
  const shared = path.join(dir, "shared.env");
  fs.writeFileSync(shared, "METERLESS_BASE_URL=http://localhost:8099/v1\nMETERLESS_RUNTIME_TOKEN=synthetic-shared\nMETERLESS_MODEL=meterless/fast\n");
  const saved = { ...process.env };
  try {
    for (const key of Object.keys(process.env)) if (key.startsWith("METERLESS_") || key === "FLOW_EXPLAIN_PROVIDER") delete process.env[key];
    process.env.FLOW_ENV_FILE = shared;
    const loaded = loadConfig();
    assert.deepEqual([loaded.explainProvider, loaded.meterlessBase, loaded.meterlessToken, loaded.meterlessModel], ["meterless", "http://localhost:8099/v1", "synthetic-shared", "meterless/fast"]);
    fs.writeFileSync(shared, "METERLESS_RUNTIME_TOKEN={{RUNTIME_TOKEN}}\n");
    assert.equal(loadConfig().meterlessToken, "");
    assert.equal(loadConfig().meterlessModel, "meterless/auto");
    process.env.FLOW_EXPLAIN_PROVIDER = "other";
    assert.throws(loadConfig, /FLOW_EXPLAIN_PROVIDER/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("an invalid Meterless URL blocks Meterless but not an NVIDIA start", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-explain-"));
  const shared = path.join(dir, "shared.env");
  fs.writeFileSync(shared, "METERLESS_BASE_URL=https://meterless.example.com/v1\nMETERLESS_RUNTIME_TOKEN=synthetic-shared\nNVIDIA_API_KEY=synthetic-nvidia\n");
  const saved = { ...process.env };
  try {
    for (const key of Object.keys(process.env)) if (key.startsWith("METERLESS_") || key.startsWith("NVIDIA_") || key === "FLOW_EXPLAIN_PROVIDER") delete process.env[key];
    process.env.FLOW_ENV_FILE = shared;
    process.env.FLOW_EXPLAIN_PROVIDER = "nvidia";
    const loaded = loadConfig();
    assert.equal(loaded.explainProvider, "nvidia"); assert.equal(loaded.nvidiaKey, "synthetic-nvidia");
    assert.equal(loaded.meterlessToken, ""); // unused provider is inert
    process.env.FLOW_EXPLAIN_PROVIDER = "meterless";
    assert.throws(loadConfig, /METERLESS_BASE_URL/);
    delete process.env.FLOW_EXPLAIN_PROVIDER; // default provider is Meterless
    assert.throws(loadConfig, /METERLESS_BASE_URL/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("an invalid NVIDIA URL blocks NVIDIA but not a Meterless start, and the endpoint restriction holds", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-explain-"));
  const shared = path.join(dir, "shared.env");
  const write = (nvidiaUrl: string) => fs.writeFileSync(shared, `METERLESS_RUNTIME_TOKEN=synthetic-shared\nNVIDIA_API_KEY=synthetic-nvidia\nNVIDIA_BASE_URL=${nvidiaUrl}\n`);
  const saved = { ...process.env };
  try {
    for (const key of Object.keys(process.env)) if (key.startsWith("METERLESS_") || key.startsWith("NVIDIA_") || key === "FLOW_EXPLAIN_PROVIDER") delete process.env[key];
    process.env.FLOW_ENV_FILE = shared;
    write("http://attacker.example.com/v1");
    const loaded = loadConfig(); // default provider is Meterless
    assert.equal(loaded.explainProvider, "meterless"); assert.equal(loaded.meterlessToken, "synthetic-shared");
    assert.equal(loaded.nvidiaKey, ""); // unused provider is inert, so no silent NVIDIA path exists
    process.env.FLOW_EXPLAIN_PROVIDER = "nvidia";
    for (const bad of ["http://attacker.example.com/v1", "https://integrate.api.nvidia.com/v2", "https://user:pw@integrate.api.nvidia.com/v1"]) { write(bad); assert.throws(loadConfig, /NVIDIA_BASE_URL/, bad); }
    write("https://integrate.api.nvidia.com/v1/");
    const nvidia = loadConfig();
    assert.deepEqual([nvidia.nvidiaBase, nvidia.nvidiaKey, nvidia.meterlessToken], ["https://integrate.api.nvidia.com/v1", "synthetic-nvidia", ""]);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("sends Bearer and Meterless headers with a bounded non-streaming request", async () => {
  const { calls, transport } = runtime(() => chat(good));
  const response = await explainWithNightshift(investigate(demo, "FE-101"), config, transport);
  assert.equal(response.status, "ready");
  assert.equal(response.provider, "Meterless Nightshift");
  assert.equal(response.model, "synthetic-routed-model");
  assert.match(response.text, /Sources: E-103, R-02/);
  assert.deepEqual(calls.map((c) => c.url), ["http://127.0.0.1:8088/v1/models", "http://127.0.0.1:8088/v1/chat/completions"]);
  for (const call of calls) {
    const headers = call.options?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer synthetic-secret");
    assert.equal(headers["meterless-app"], "flow-explain");
  }
  const sent = calls[1].options!;
  assert.equal((sent.headers as Record<string, string>)["meterless-scope"], "user");
  const body = JSON.parse(String(sent.body));
  assert.equal(body.model, "meterless/auto"); assert.equal(body.stream, false); assert.equal(body.max_tokens, 4096);
  assert.equal(body.chat_template_kwargs.enable_thinking, false);
  assert.ok(!String(sent.body).includes("synthetic-secret"));
});
test("discovery distinguishes unauthorized from offline", async () => {
  assert.equal(await checkNightshift(config, runtime(() => chat(good)).transport), "online");
  for (const status of [401, 403]) assert.equal(await checkNightshift(config, runtime(() => chat(good), () => new Response("", { status })).transport), "unauthorized");
  assert.equal(await checkNightshift(config, runtime(() => chat(good), () => new Response("", { status: 502 })).transport), "offline");
  assert.equal(await checkNightshift(config, runtime(() => chat(good), () => new Response(JSON.stringify({ data: [{ id: "other/model" }] }))).transport), "offline");
  assert.equal(await checkNightshift(config, (async () => { throw new TypeError("connect ECONNREFUSED"); }) as typeof fetch), "offline");
});
test("authentication and availability failures name the cause and never call chat or leak the token", async () => {
  const cases: [Response | Error, RegExp][] = [[new Response("", { status: 401 }), /rejected the runtime token/], [new Response("", { status: 403 }), /rejected the runtime token/], [new TypeError("connect ECONNREFUSED synthetic-secret"), /not reachable/]];
  for (const [failure, expected] of cases) {
    const r = runtime(() => chat(good), () => { if (failure instanceof Error) throw failure; return failure; });
    const result = await explainWithNightshift(investigate(demo, "FE-101"), config, r.transport);
    assert.equal(result.status, "unavailable"); assert.match(result.reason!, expected);
    assert.ok(r.calls.every((c) => c.url.endsWith("/models")));
    assert.doesNotMatch(JSON.stringify(result), /synthetic-secret/);
  }
});
test("a missing token causes no request", async () => {
  const r = runtime(() => chat(good));
  const result = await explainWithNightshift(investigate(demo, "FE-101"), { ...config, meterlessToken: "" }, r.transport);
  assert.equal(result.status, "unavailable"); assert.equal(r.calls.length, 0);
});
test("chat failures keep the deterministic result and cannot expose content or tokens", async () => {
  for (const status of [401, 403, 429, 500]) {
    const result = investigate(demo, "FE-101");
    const original = JSON.stringify(result);
    const narrative = await explainWithNightshift(result, config, runtime(() => new Response("synthetic-secret private-content", { status })).transport);
    assert.equal(narrative.status, "unavailable");
    assert.doesNotMatch(JSON.stringify(narrative), /synthetic-secret|private-content/);
    assert.equal(JSON.stringify(result), original);
  }
  const timeout = await explainWithNightshift(investigate(demo, "FE-101"), config, runtime(() => { throw new DOMException("timeout", "TimeoutError"); }).transport);
  assert.equal(timeout.status, "unavailable");
});
test("empty, truncated, malformed or uncited replies are rejected", async () => {
  for (const content of ["", "{\"summary\":\"The routing event reports", "plain prose without JSON", { summary: "The routing event reports a failed assignment.", citations: [] }, { summary: "The routing event reports a failed assignment.", citations: ["E-imaginary"] }, { summary: "Proven by E-imaginary and others.", citations: ["E-103"] }, { summary: "The manager has not approved this request.", citations: ["mem-synthetic"] }]) {
    const result = await explainWithNightshift(investigate(demo, "FE-101"), config, runtime(() => chat(content)).transport);
    assert.equal(result.status, "unavailable", JSON.stringify(content));
  }
  const noChoices = await explainWithNightshift(investigate(demo, "FE-101"), config, runtime(() => new Response("{}")).transport);
  assert.equal(noChoices.status, "unavailable");
});
test("analyst notes are sent as untrusted advice and cannot be cited", async () => {
  const result = investigate(demo, "FE-101");
  result.lessons = [{ id: "mem-synthetic", text: "A synthetic analyst opinion, not an event.", scenario: "routing", sourceCaseId: "FE-101", createdAt: "2026-10-20T09:00:00Z" }];
  const r = runtime(() => chat({ summary: "The manager has not approved this request.", citations: ["mem-synthetic"] }));
  assert.equal((await explainWithNightshift(result, config, r.transport)).status, "unavailable");
  const context = JSON.parse(JSON.parse(String(r.calls[1].options!.body)).messages[1].content);
  assert.ok(context.allowedCitations.includes("E-103") && !context.allowedCitations.includes("mem-synthetic"));
  assert.match(context.analystNotes[0].label, /not citable evidence/);
});
