import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { investigate } from "../src/domain/investigate.ts";
import { explainWithNvidia } from "../src/integrations/nvidia.ts";
import type { Dataset } from "../src/domain/types.ts";
const demo: Dataset = JSON.parse(fs.readFileSync(new URL("../data/demo.json", import.meta.url), "utf8"));
const config = { nvidiaKey: "synthetic-secret", nvidiaModel: "synthetic-model", nvidiaBase: "https://example.test/v1" };
test("explanation is opt-in and missing credentials cause no request", async () => {
  let called = false;
  const response = await explainWithNvidia(investigate(demo, "FE-101"), { ...config, nvidiaKey: "" }, (async () => { called = true; return new Response(); }) as typeof fetch);
  assert.equal(called, false); assert.equal(response.status, "unavailable");
});
test("accepts only known citations and never mutates the findings", async () => {
  const result = investigate(demo, "FE-101");
  const original = JSON.stringify(result);
  for (const citations of [["E-103", "R-02"], ["E-imaginary"]]) {
    const transport = (async (_url, options) => {
      assert.ok(String(options?.body).includes("E-103"));
      assert.ok(!String(options?.body).includes(config.nvidiaKey));
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: "The routing event reports a failed assignment.", citations }) } }] }));
    }) as typeof fetch;
    const response = await explainWithNvidia(result, config, transport);
    assert.equal(response.status, citations[0] === "E-103" ? "ready" : "unavailable");
  }
  assert.equal(JSON.stringify(result), original);
});
test("provider failures cannot expose content or keys", async () => {
  for (const status of [401, 403, 429, 500]) {
    const result = await explainWithNvidia(investigate(demo, "FE-101"), config, (async () => new Response("synthetic-secret private-content", { status })) as typeof fetch);
    assert.equal(result.status, "unavailable");
    assert.doesNotMatch(JSON.stringify(result), /synthetic-secret|private-content/);
  }
});

test("analyst notes cannot count as evidence and invented inline citations are rejected", async () => {
  const result = investigate(demo, "FE-101");
  result.lessons = [{ id: "mem-synthetic", text: "A synthetic analyst opinion, not an event.", scenario: "routing", sourceCaseId: "FE-101", createdAt: "2026-10-20T09:00:00Z" }];
  for (const payload of [
    { summary: "A missing manager approval is proven by E-imaginary.", citations: ["E-103"] },
    { summary: "The manager has not approved this request.", citations: ["mem-synthetic"] },
  ]) {
    let sentBody = "";
    const response = await explainWithNvidia(result, config, (async (_url, options) => {
      sentBody = String(options?.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }));
    }) as typeof fetch);
    const request = JSON.parse(sentBody);
    const context = JSON.parse(request.messages[1].content);
    assert.ok(context.allowedCitations.includes("E-103"));
    assert.ok(context.analystNotes[0].text.includes("synthetic analyst opinion"));
    assert.doesNotMatch(JSON.stringify(context.analystNotes), /mem-synthetic/);
    assert.equal(response.status, "unavailable");
  }
});
