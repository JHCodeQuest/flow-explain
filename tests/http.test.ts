import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import test from "node:test";
import { createFlowServer } from "../src/server/http.ts";
import { FlowService } from "../src/server/service.ts";
import type { Dataset } from "../src/domain/types.ts";
const dataset: Dataset = JSON.parse(fs.readFileSync(new URL("../data/demo.json", import.meta.url), "utf8"));

test("HTTP boundary rejects unauthorized/cross-origin/input failures before access", async (t) => {
  let writes = 0; let queries = 0; let modelCalls = 0;
  const service = new FlowService(dataset, { memory: { recall: () => [], save: () => { writes++; throw new Error("should not write"); } },
    zetaris: async () => { queries++; throw new Error("SECRET"); }, explain: async () => { modelCalls++; return { status: "ready", text: "Synthetic." }; } });
  const server = createFlowServer(service, "missing-dist");
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  const session = await fetch(base + "/api/session").then((r) => r.json()) as { token: string };
  const headers = { "Content-Type": "application/json", "X-Flow-Token": session.token };
  const post = (body: unknown, extra = {}) => fetch(base + "/api/investigate", { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  assert.equal((await fetch(base + "/api/cases")).status, 401);
  assert.equal((await post({ caseId: "FE-101", source: "fixture", explain: true }, { "X-Flow-Token": "wrong" })).status, 401);
  assert.equal((await post({ caseId: "FE-101", source: "fixture", explain: true }, { Origin: "https://outside.test" })).status, 403);
  // fetch normalizes Host to its URL, so use the raw HTTP client for this attack.
  const badHost = await new Promise<number>((resolve, reject) => {
    const request = http.get(base + "/api/session", { headers: { Host: `outside.test:${port}` } }, (response) => { response.resume(); resolve(response.statusCode!); });
    request.on("error", reject);
  });
  assert.equal(badHost, 403);
  for (const body of [{ caseId: "FE-other", source: "fixture", explain: false }, { caseId: "FE-101", source: "arbitrary", explain: false }, { caseId: "FE-101", source: ["fixture"], explain: false }, { caseId: "FE-101", source: "fixture", explain: "yes" }, { caseId: "FE-101", source: "fixture", explain: false, sql: "DROP" }]) assert.equal((await post(body)).status, 400);
  assert.equal(writes + queries + modelCalls, 0);
  assert.equal((await post({ caseId: "FE-101", source: "fixture", explain: false })).status, 200);
  assert.equal(modelCalls, 0);
  assert.equal((await post({ caseId: "FE-101", source: "fixture", explain: true })).status, 200);
  assert.equal(modelCalls, 1);
  const failed = await post({ caseId: "FE-101", source: "zetaris", explain: false });
  assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /SECRET/);
  for (const route of ["/.env.local", "/src/server/config.ts", "/assets/../../.env.local", "/assets/%2e%2e%2f.env.local"]) assert.equal((await fetch(base + route)).status, 404);
  for (const [token, body, status] of [["wrong", { caseId: "FE-101", text: "A synthetic note long enough to be valid." }, 401], [session.token, { caseId: "FE-101", text: "short" }, 400], [session.token, { caseId: "FE-other", text: "A synthetic note long enough to be valid." }, 400]] as const) {
    assert.equal((await fetch(base + "/api/lessons", { method: "POST", headers: { ...headers, "X-Flow-Token": token }, body: JSON.stringify(body) })).status, status);
  }
  assert.equal(writes, 0);
  const large = await fetch(base + "/api/investigate", { method: "POST", headers, body: JSON.stringify({ huge: "x".repeat(3000) }) });
  assert.equal(large.status, 413);
});
