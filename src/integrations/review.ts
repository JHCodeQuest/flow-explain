import type { CheckId, Investigation, Review, ReviewAttempt, ReviewCheck } from "../domain/types.ts";
import { explanationMessages, type Message } from "./explanation.ts";

/** One provider completion. Throw ProviderError for transport/HTTP failures (never revised). */
export type Complete = (messages: Message[], signal: AbortSignal) => Promise<{ content: unknown; model?: string }>;
export class ProviderError extends Error {}

const LABELS: Record<CheckId, string> = {
  envelope: "Valid JSON with a bounded summary and citations",
  citations: "Every citation is an existing event or rule",
  inline: "Inline references match the citations",
  coverage: "Cites all evidence and rules the findings use",
  contradiction: "No named contradiction of the findings",
  "no-change": "Claims no change or remediation was made",
};
const ORDER = Object.keys(LABELS) as CheckId[];
/** One budget for the whole explanation phase: Nightshift discovery, the draft and the
 * revision (critic time is negligible). It starts when explanation begins, so it excludes
 * request receipt and any Zetaris query that ran earlier. 180 s is the previous single-call ceiling.
 */
export const EXPLAIN_BUDGET_MS = 180_000;
const MIN_REVISION_MS = 20_000;

const CONTRADICTIONS: Record<string, RegExp[]> = {
  "F-routing": [/\bmanager\b[^.]{0,60}\b(?:not (?:yet )?approved|has not approved|pending|awaiting|still waiting|rejected|denied)\b/i, /\bapproval\b[^.]{0,30}\b(?:is |remains )?(?:still )?(?:pending|outstanding)\b/i],
  "F-overdue": [/\b(?:on leave|out of office|ignored|forgot|forgotten|deliberately|refus(?:ed|ing))\b/i, /\bbecause\b[^.]{0,80}\b(?:approver|manager)\b/i, /\bdestination group\b/i],
  "F-input": [/\bdestination group\b/i, /\boverdue\b/i],
  "F-unknown": [/\b(?:caused by|root cause|because|due to|as a result of)\b/i],
};
const HEDGE = /\b(?:unknown|insufficient|not enough|cannot|can't|does not establish|do not establish|unclear|no evidence)\b/i;
// Only claims by the tool/author ("we retried", "has been resubmitted"); past events recorded in the evidence may be described.
const CHANGE = /\b(?:(?:i|we)\s+(?:have\s+|had\s+)?|(?:has|have)\s+been\s+)(?:fixed|restarted|retried|resubmitted|escalated|reassigned|reset|re-?run)\b/i;
const REF = /\b(?:[ER]-\d[A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*|mem-[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*)(?![A-Za-z0-9_-])/gi;
/** Structural, citation, coverage and named-contradiction checks. These do not
 * prove the wording is factually correct; they catch the defined failure classes.
 */
export function critique(result: Investigation, content: unknown, allowed: Set<string>): { attempt: Omit<ReviewAttempt, "n">; summary: string; citations: string[] } {
  const res = new Map<CheckId, ReviewCheck>(ORDER.map((id) => [id, { id, label: LABELS[id], status: "skipped" }]));
  const set = (id: CheckId, ok: boolean, refs: string[] = []) => res.set(id, { id, label: LABELS[id], status: ok ? "pass" : "fail", ...(refs.length ? { refs: refs.filter((r) => allowed.has(r)).slice(0, 12) } : {}) });
  let summary = ""; let citations: string[] = [];
  let parsed: { summary?: unknown; citations?: unknown } | undefined;
  try {
    if (typeof content === "string" && content.length <= 10_000) parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*|```$/g, ""));
  } catch { /* envelope fails below */ }
  const ok = !!parsed && typeof parsed.summary === "string" && parsed.summary.length >= 10 && parsed.summary.length <= 900 && Array.isArray(parsed.citations) && parsed.citations.length >= 1 && parsed.citations.length <= 12 && parsed.citations.every((c) => typeof c === "string");
  set("envelope", ok);
  if (ok) {
    summary = parsed!.summary as string; citations = parsed!.citations as string[];
    set("citations", citations.every((c) => allowed.has(c)));
    const inline = summary.match(REF) ?? [];
    set("inline", inline.every((id) => allowed.has(id) && citations.includes(id)));
    const missing = result.findings.flatMap((f) => [...f.evidenceIds, ...f.ruleIds]).filter((id) => !citations.includes(id));
    set("coverage", !missing.length, missing);
    const hit = result.findings.filter((f) => CONTRADICTIONS[f.id]?.some((re) => re.test(summary)) || (f.id === "F-unknown" && !HEDGE.test(summary)));
    set("contradiction", !hit.length, hit.flatMap((f) => f.evidenceIds));
    set("no-change", !CHANGE.test(summary));
  }
  const checks = ORDER.map((id) => res.get(id)!);
  return { attempt: { passed: checks.every((c) => c.status === "pass"), checks }, summary, citations };
}

const unavailable = (reason: string, review: Review): Investigation["narrative"] => ({ status: "unavailable", text: "", reason, review });

/** Draft, check, then revise at most once with the same provider. Both attempts must
 * pass the same checks. A failure returns the deterministic result with a fixed reason.
 */
export async function reviewedExplanation(result: Investigation, complete: Complete, opts: { provider: string; model: string; failure: string; now?: () => number; startedAt?: number }): Promise<Investigation["narrative"]> {
  const now = opts.now ?? Date.now; const start = opts.startedAt ?? now();
  const remaining = () => EXPLAIN_BUDGET_MS - (now() - start);
  const attempts: ReviewAttempt[] = [];
  const returned = (reason: string) => unavailable(reason, { outcome: "returned", reason, attempts });
  let draft: ReturnType<typeof critique> | undefined; let prompt = explanationMessages(result);
  for (const n of [1, 2] as const) {
    if (remaining() <= 0) return returned("The explanation time budget was used up. The deterministic findings are shown instead.");
    let reply: Awaited<ReturnType<Complete>>;
    try { reply = await complete(prompt.messages, AbortSignal.timeout(remaining())); }
    catch (error) { return returned(error instanceof ProviderError ? error.message : opts.failure); }
    draft = critique(result, reply.content, prompt.allowed);
    attempts.push({ n, ...draft.attempt });
    if (draft.attempt.passed) {
      const text = `${draft.summary}\nSources: ${draft.citations.join(", ")}`;
      const model = typeof reply.model === "string" ? reply.model.slice(0, 80) : opts.model;
      return { status: "ready", text, provider: opts.provider, model, review: { outcome: n === 1 ? "accepted" : "revised", attempts } };
    }
    if (n === 2) break;
    if (remaining() < MIN_REVISION_MS) return returned("No time remained for a revision. The deterministic findings are shown instead.");
    prompt = explanationMessages(result, { previousDraft: draft.summary, failedChecks: draft.attempt.checks.filter((c) => c.status === "fail").map(({ id, refs }) => ({ id, refs })) });
  }
  return returned("The explanation did not pass the checks after one revision. The deterministic findings are shown instead.");
}
