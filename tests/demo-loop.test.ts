import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createFlowServer } from "../src/server/http.ts";
import { FlowService } from "../src/server/service.ts";
import { investigate } from "../src/domain/investigate.ts";
import { explainWithNightshift } from "../src/integrations/meterless.ts";
import { MOCK_TOKEN, startMockRuntime } from "./fixtures/mock-nightshift.ts";
import type { Dataset, Investigation } from "../src/domain/types.ts";
const dataset: Dataset = JSON.parse(fs.readFileSync(new URL("../data/demo.json", import.meta.url), "utf8"));

// Mock runtime — scripted responses: exercises the real server, adapter and loop over loopback HTTP.
test("scripted runtime proves accepted, revised and returned outcomes end to end", async (t) => {
  const runtime = await startMockRuntime();
  const config = { meterlessBase: runtime.base, meterlessToken: MOCK_TOKEN, meterlessModel: "meterless/auto" };
  const service = new FlowService(dataset, { explain: (result) => explainWithNightshift(result, config) });
  const server = createFlowServer(service, "missing-dist");
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); await runtime.close(); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const { token } = await fetch(base + "/api/session").then((r) => r.json()) as { token: string };
  const run = async (caseId: string) => {
    const response = await fetch(base + "/api/investigate", { method: "POST", headers: { "Content-Type": "application/json", "X-Flow-Token": token }, body: JSON.stringify({ caseId, source: "fixture", explain: true }) });
    assert.equal(response.status, 200);
    const raw = await response.text();
    assert.doesNotMatch(raw, new RegExp(`${MOCK_TOKEN}|MOCK-HIDDEN-REASONING|has not approved|caused by a connector|E-999`));
    return JSON.parse(raw) as Investigation;
  };
  const expected: [string, string, number][] = [["FE-102", "accepted", 1], ["FE-101", "revised", 2], ["FE-103", "returned", 2], ["FE-104", "revised", 2]];
  for (const [caseId, outcome, completions] of expected) {
    const before = runtime.calls.length;
    const result = await run(caseId);
    assert.equal(result.narrative.review?.outcome, outcome, caseId);
    assert.equal(runtime.calls.length - before, completions, caseId);
    assert.deepEqual(result.findings, investigate(dataset, caseId).findings, caseId); // findings are authoritative and unchanged
    assert.equal(result.narrative.status, outcome === "returned" ? "unavailable" : "ready");
    if (outcome === "revised") assert.deepEqual(result.narrative.review!.attempts.map((a) => a.passed), [false, true]);
  }
  assert.deepEqual(runtime.calls.filter((c) => c.revision).map((c) => c.caseId), ["FE-101", "FE-103", "FE-104"]);
});
