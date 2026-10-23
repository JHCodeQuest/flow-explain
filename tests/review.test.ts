import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { investigate } from "../src/domain/investigate.ts";
import { critique, ProviderError, reviewedExplanation, type Complete } from "../src/integrations/review.ts";
import { explainWithNightshift } from "../src/integrations/meterless.ts";
import { explainWithNvidia } from "../src/integrations/nvidia.ts";
import { explanationMessages } from "../src/integrations/explanation.ts";
import type { CheckId, Dataset } from "../src/domain/types.ts";
const demo: Dataset = JSON.parse(fs.readFileSync(new URL("../data/demo.json", import.meta.url), "utf8"));
const opts = { provider: "Synthetic", model: "synthetic-model", failure: "Provider failed safely." };
const draft = (summary: string, citations: string[]): { content: unknown } => ({ content: JSON.stringify({ summary, citations }) });
const GOOD = draft("Manager approval completed (E-102); the finance assignment then failed (E-103) under R-02. A person should check the destination group.", ["E-102", "E-103", "R-02"]);
const BAD = draft("The manager has not approved this request, so finance never got it.", ["E-103", "R-02"]);
/** Scripted completer: replies in order and records each prompt. */
function script(...replies: ({ content: unknown } | Error)[]) {
  const prompts: string[] = [];
  const complete: Complete = async (messages) => { prompts.push(messages[1].content); const r = replies[prompts.length - 1]; if (r instanceof Error) throw r; return r!; };
  return { prompts, complete };
}
const failed = (r: ReturnType<typeof critique>) => r.attempt.checks.filter((c) => c.status === "fail").map((c) => c.id);
const run = (caseId: string, content: unknown) => { const r = investigate(demo, caseId); return critique(r, content, explanationMessages(r).allowed); };

test("the critic passes a compliant draft and names each failed check", () => {
  assert.deepEqual(failed(run("FE-101", GOOD.content)), []);
  const cases: [string, string, unknown, CheckId[]][] = [
    ["envelope: not JSON", "FE-101", "plain prose", ["envelope"]],
    ["envelope: no citations", "FE-101", JSON.stringify({ summary: "Long enough summary text.", citations: [] }), ["envelope"]],
    ["citations: invented ID", "FE-101", draft("Manager approval completed; assignment failed.", ["E-102", "E-103", "R-02", "E-999"]).content, ["citations"]],
    ["citations: note ID", "FE-101", draft("Manager approval completed; assignment failed.", ["E-102", "E-103", "R-02", "mem-1"]).content, ["citations"]],
    ["inline: uncited inline ID", "FE-101", draft("Approval E-102 completed; assignment E-103 failed under R-02 and E-101.", ["E-102", "E-103", "R-02"]).content, ["inline"]],
    ["coverage: omits manager event", "FE-101", draft("The assignment failed (E-103) under R-02.", ["E-103", "R-02"]).content, ["coverage"]],
    ["contradiction: manager pending", "FE-101", draft("The manager approval is still pending (E-102, E-103, R-02).", ["E-102", "E-103", "R-02"]).content, ["contradiction"]],
    ["contradiction: invented reason", "FE-102", draft("Manager approval (E-202) is overdue under R-01 because the approver is on leave.", ["E-202", "R-01"]).content, ["contradiction"]],
    ["contradiction: wrong scenario cause", "FE-103", draft("Validation failed (E-301, R-03): the destination group is missing.", ["E-301", "R-03"]).content, ["contradiction"]],
    ["contradiction: unknown names a cause", "FE-104", draft("This was caused by a connector outage (E-401, R-04).", ["E-401", "R-04"]).content, ["contradiction"]],
    ["contradiction: unknown without hedge", "FE-104", draft("The request has no recent update (E-401, R-04).", ["E-401", "R-04"]).content, ["contradiction"]],
    ["no-change: claims remediation", "FE-101", draft("Approval E-102 completed; E-103 failed under R-02 and we reset the group.", ["E-102", "E-103", "R-02"]).content, ["no-change"]],
  ];
  for (const [name, caseId, content, expected] of cases) assert.deepEqual(failed(run(caseId, content)), expected, name);
  assert.deepEqual(failed(run("FE-104", draft("Evidence is insufficient to name a cause (E-401, R-04).", ["E-401", "R-04"]).content)), []);
});
test("a failed envelope skips the dependent checks and refs are validated IDs only", () => {
  const r = run("FE-101", "plain prose");
  assert.deepEqual(r.attempt.checks.filter((c) => c.status === "skipped").map((c) => c.id), ["citations", "inline", "coverage", "contradiction", "no-change", "notes"]);
  const c = run("FE-101", draft("The assignment failed.", ["E-103", "R-02"]).content).attempt.checks.find((x) => x.id === "coverage")!;
  assert.deepEqual(c.refs, ["E-102"]);
});
test("notes are advisory: they never change evidence checks and verbatim copies fail the notes check", () => {
  const plain = investigate(demo, "FE-101"); const noted = investigate(demo, "FE-101");
  noted.lessons = [{ id: "mem-1", text: "Inspect the routing event before assuming a missing finance task means approval is pending.", scenario: "routing", sourceCaseId: "FE-101", createdAt: "2026-10-20T09:00:00Z" }];
  const allowed = explanationMessages(plain).allowed;
  const strip = (r: ReturnType<typeof critique>) => r.attempt.checks.filter((c) => c.id !== "notes");
  assert.deepEqual(strip(critique(plain, GOOD.content, allowed)), strip(critique(noted, GOOD.content, allowed)));
  assert.equal(critique(noted, GOOD.content, allowed).attempt.passed, true);
  const copy = draft("Manager approval completed (E-102); E-103 failed under R-02. Inspect the routing event before assuming a missing finance task means approval is pending.", ["E-102", "E-103", "R-02"]).content;
  assert.deepEqual(failed(critique(noted, copy, allowed)).includes("notes"), true);
});

test("accepted: a passing first draft makes one call", async () => {
  const s = script(GOOD);
  const n = await reviewedExplanation(investigate(demo, "FE-101"), s.complete, opts);
  assert.equal(n.status, "ready"); assert.equal(n.review?.outcome, "accepted"); assert.equal(s.prompts.length, 1); assert.equal(n.review?.attempts.length, 1);
});
test("revised: one revision carries only fixed failure codes and must pass the same checks", async () => {
  const s = script(BAD, GOOD); const result = investigate(demo, "FE-101"); const before = JSON.stringify(result);
  const n = await reviewedExplanation(result, s.complete, { ...opts, model: "m" });
  assert.equal(n.review?.outcome, "revised"); assert.equal(s.prompts.length, 2); assert.equal(n.status, "ready");
  assert.deepEqual(n.review!.attempts.map((a) => a.passed), [false, true]);
  assert.deepEqual(n.review!.attempts[1].checks.map((c) => c.status), Array(7).fill("pass"));
  assert.match(n.text, /Manager approval completed/); assert.doesNotMatch(JSON.stringify(n), /has not approved/);
  const revision = JSON.parse(s.prompts[1]).revision;
  assert.deepEqual(revision.failedChecks.map((c: { id: string }) => c.id), ["coverage", "contradiction"]);
  assert.match(revision.previousDraft, /has not approved/); assert.equal(JSON.parse(s.prompts[0]).revision, undefined);
  assert.equal(JSON.stringify(result), before); // findings are never altered
});
test("returned: a revision that fails again ends the loop with no third call", async () => {
  const s = script(BAD, BAD, GOOD); const result = investigate(demo, "FE-101");
  const n = await reviewedExplanation(result, s.complete, opts);
  assert.equal(n.status, "unavailable"); assert.equal(n.text, ""); assert.equal(n.review?.outcome, "returned"); assert.equal(s.prompts.length, 2);
  assert.match(n.reason!, /did not pass the checks after one revision/);
  assert.doesNotMatch(JSON.stringify(n), /has not approved/); // failed model text is never returned
});
test("a revision that cites wrongly is not accepted just because the first draft was close", async () => {
  const s = script(BAD, draft("Manager approval completed (E-102); assignment failed (E-103) under R-02 and E-999.", ["E-102", "E-103", "R-02", "E-999"]));
  assert.equal((await reviewedExplanation(investigate(demo, "FE-101"), s.complete, opts)).review?.outcome, "returned");
});
test("transport failures are never revised", async () => {
  for (const error of [new ProviderError("Provider is rate limited."), new DOMException("timeout", "TimeoutError")]) {
    const s = script(error, GOOD);
    const n = await reviewedExplanation(investigate(demo, "FE-101"), s.complete, opts);
    assert.equal(s.prompts.length, 1); assert.equal(n.status, "unavailable"); assert.equal(n.review?.outcome, "returned");
    assert.equal(n.reason, error instanceof ProviderError ? error.message : opts.failure);
  }
});
test("no revision starts when the shared deadline has nearly passed", async () => {
  let t = 0; const s = script(BAD, GOOD);
  const complete: Complete = async (m, signal) => { const r = await s.complete(m, signal); t += 125_000; return r; };
  const n = await reviewedExplanation(investigate(demo, "FE-101"), complete, { ...opts, now: () => t });
  assert.equal(s.prompts.length, 1); assert.match(n.reason!, /No time remained/);
});
test("a content failure on any malformed reply is revised once, then returned", async () => {
  const s = script({ content: "" }, { content: undefined });
  const n = await reviewedExplanation(investigate(demo, "FE-101"), s.complete, opts);
  assert.equal(s.prompts.length, 2); assert.equal(n.review?.outcome, "returned");
});

test("the Nightshift adapter reuses one discovery, the same endpoint and headers, and ignores reasoning fields", async () => {
  const realFetch = globalThis.fetch; let stray = 0;
  globalThis.fetch = (async () => { stray++; throw new Error("unexpected network"); }) as typeof fetch;
  try {
    const urls: string[] = []; let chats = 0;
    const transport = (async (url: string, options?: RequestInit) => {
      urls.push(url);
      if (url.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "meterless/auto" }] }));
      assert.equal((options!.headers as Record<string, string>).Authorization, "Bearer synthetic-secret");
      const message = { content: (chats++ ? GOOD : BAD).content, reasoning_content: "HIDDEN-REASONING-SENTINEL" };
      return new Response(JSON.stringify({ model: "synthetic-routed", choices: [{ message }] }));
    }) as typeof fetch;
    const n = await explainWithNightshift(investigate(demo, "FE-101"), { meterlessBase: "http://127.0.0.1:8088/v1", meterlessToken: "synthetic-secret", meterlessModel: "meterless/auto" }, transport);
    assert.deepEqual(urls, ["http://127.0.0.1:8088/v1/models", "http://127.0.0.1:8088/v1/chat/completions", "http://127.0.0.1:8088/v1/chat/completions"]);
    assert.equal(n.review?.outcome, "revised"); assert.equal(n.model, "synthetic-routed");
    assert.doesNotMatch(JSON.stringify(n), /HIDDEN-REASONING-SENTINEL|synthetic-secret/);
    assert.equal(stray, 0);
  } finally { globalThis.fetch = realFetch; }
});
test("the NVIDIA adapter runs the same loop against only its own endpoint", async () => {
  const urls: string[] = []; let chats = 0;
  const transport = (async (url: string) => { urls.push(url); return new Response(JSON.stringify({ choices: [{ message: { content: (chats++ ? GOOD : BAD).content } }] })); }) as typeof fetch;
  const n = await explainWithNvidia(investigate(demo, "FE-101"), { nvidiaKey: "k", nvidiaModel: "synthetic-model", nvidiaBase: "https://example.test/v1" }, transport);
  assert.equal(n.review?.outcome, "revised"); assert.deepEqual(urls, ["https://example.test/v1/chat/completions", "https://example.test/v1/chat/completions"]);
});

test("honest history, prose look-alikes and paraphrased notes do not fail; look-alike citations still do", () => {
  const ok = (summary: string) => assert.deepEqual(failed(run("FE-101", draft(summary, ["E-102", "E-103", "R-02"]).content)), [], summary);
  ok("The assignment was escalated in the past (E-103); approval E-102 completed under R-02. E-mail routing is unrelated.");
  ok("R-squared aside, approval E-102 completed and E-103 failed under R-02.");
  const noted = investigate(demo, "FE-101");
  noted.lessons = [{ id: "mem-1", text: "Inspect the routing event before assuming a missing finance task means approval is pending.", scenario: "routing", sourceCaseId: "FE-101", createdAt: "2026-10-20T09:00:00Z" }];
  const para = critique(noted, draft("Check the routing step first; E-102 completed and E-103 failed under R-02.", ["E-102", "E-103", "R-02"]).content, explanationMessages(noted).allowed);
  assert.equal(para.attempt.passed, true);
  for (const bad of ["We retried the handoff (E-102, E-103, R-02).", "The handoff has been resubmitted (E-102, E-103, R-02).", "See MEM-1 and e-103 (E-102, E-103, R-02)."]) assert.equal(run("FE-101", draft(bad, ["E-102", "E-103", "R-02"]).content).attempt.passed, false, bad);
  assert.deepEqual(failed(run("FE-101", " ".repeat(10_000))), ["envelope"]);
});
test("each completion receives a live abort signal sized to the remaining shared deadline", async () => {
  const signals: AbortSignal[] = [];
  const complete: Complete = async (_m, signal) => { signals.push(signal); return signals.length === 1 ? BAD : GOOD; };
  await reviewedExplanation(investigate(demo, "FE-101"), complete, opts);
  assert.equal(signals.length, 2); assert.ok(signals.every((s) => !s.aborted));
  const slow: Complete = (_m, signal) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
  let t = 0; const n = await reviewedExplanation(investigate(demo, "FE-101"), slow, { ...opts, now: () => (t += 129_999) });
  assert.equal(n.review?.outcome, "returned"); assert.equal(n.reason, opts.failure);
});
