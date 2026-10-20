import assert from "node:assert/strict";
import test from "node:test";
import { wrapMemory } from "../src/integrations/memory.ts";
import type { ApprovalCase } from "../src/domain/types.ts";
const item: ApprovalCase = { id: "FE-101", title: "Synthetic routing case", description: "", status: "blocked", ownerRole: "Support", createdAt: "2026-10-20T09:00:00Z", scenario: "routing" };
test("memory saves provenance, deduplicates and excludes unrelated scenarios", () => {
  const records: { id: string; content: string; source: string; timestamp: number; tags: string[] }[] = [];
  const service = wrapMemory({ store: { all: () => records }, add(input) {
    assert.equal(input.provenance.origin, "user_correction");
    const record = { ...input, id: `mem-${records.length + 1}`, timestamp: 1_000 }; records.push(record); return record;
  }, query: () => ({ memories: records.map((memory) => ({ memory })) }) });
  const text = "Inspect the routing event before assuming an approver did not respond.";
  const first = service.save(item, text);
  assert.equal(service.save(item, text).id, first.id);
  assert.equal(records.length, 1);
  records.push({ id: "private", content: "private", source: "other-app", timestamp: 1_000, tags: ["scenario:routing"] });
  assert.equal(service.recall(item).length, 1);
  assert.equal(service.recall({ ...item, scenario: "input" }).length, 0);
  assert.throws(() => service.save(item, "too short"));
});
