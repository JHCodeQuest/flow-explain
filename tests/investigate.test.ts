import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { investigate } from "../src/domain/investigate.ts";
import type { Dataset } from "../src/domain/types.ts";
const demo: Dataset = JSON.parse(fs.readFileSync(new URL("../data/demo.json", import.meta.url), "utf8"));

test("explains routing failure without blaming a completed approval", () => {
  const result = investigate(demo, "FE-101");
  assert.deepEqual(result.findings[0].evidenceIds, ["E-102", "E-103"]);
  assert.match(result.findings[0].explanation, /already completed/);
  assert.equal(result.findings[0].id, "F-routing");
});
test("uses the snapshot clock and distinguishes overdue from its unknown reason", () => {
  const finding = investigate(demo, "FE-102").findings[0];
  assert.equal(finding.id, "F-overdue");
  assert.match(finding.explanation, /not why/);
  const earlier = { ...demo, asOf: "2026-10-19T10:00:00Z" };
  assert.equal(investigate(earlier, "FE-102").findings[0].certainty, "unknown");
});
test("identifies a missing input and labels incomplete evidence unknown", () => {
  assert.equal(investigate(demo, "FE-103").findings[0].id, "F-input");
  assert.equal(investigate(demo, "FE-104").findings[0].certainty, "unknown");
  assert.throws(() => investigate(demo, "not-a-case"));
});
test("every reference belongs to the selected case or known process rule", () => {
  for (const item of demo.cases) {
    const result = investigate(demo, item.id);
    for (const f of result.findings) {
      assert.ok(f.evidenceIds.every((id) => result.timeline.some((e) => e.id === id)));
      assert.ok(f.ruleIds.every((id) => demo.rules.some((r) => r.id === id)));
    }
  }
});
test("a later success supersedes a routing failure", () => {
  const dataset = structuredClone(demo);
  dataset.events.push({ ...demo.events[2], id: "E-recovered", status: "completed", timestamp: "2026-10-21T10:00:00Z", errorCode: "" });
  assert.equal(investigate(dataset, "FE-101").findings[0].certainty, "unknown");
});
