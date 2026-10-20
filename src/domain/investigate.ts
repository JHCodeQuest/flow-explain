import type { Dataset, Finding, Investigation } from "./types.ts";

/** Investigate event evidence at the snapshot clock. No model or memory can
 * change these findings. A later successful event supersedes an earlier failure.
 */
export function investigate(dataset: Dataset, caseId: string): Investigation {
  const item = dataset.cases.find((c) => c.id === caseId);
  if (!item) throw new Error("Unknown case.");
  const timeline = dataset.events.filter((e) => e.caseId === caseId).sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  const findings: Finding[] = [];
  for (const rule of dataset.rules) {
    const latest = timeline.filter((e) => e.step === rule.step).at(-1);
    if (!latest) continue;
    if (rule.kind === "assignment" && latest.status === "failed" && latest.errorCode === "DESTINATION_GROUP_NOT_FOUND") {
      const approved = timeline.findLast((e) => e.step === "manager" && e.status === "completed" && e.timestamp <= latest.timestamp);
      findings.push({ id: "F-routing", certainty: "observed", title: "The finance handoff failed",
        explanation: `The assignment event reports a destination group that could not be found.${approved ? " Manager approval had already completed; it is not the blocked step in this evidence." : ""}`,
        evidenceIds: [...(approved ? [approved.id] : []), latest.id], ruleIds: [rule.id],
        nextCheck: "Check that the configured finance destination group exists and is accessible to the workflow connection. A person should review the configuration before any retry." });
    }
    if (rule.kind === "deadline" && latest.status === "pending" && Date.parse(dataset.asOf) - Date.parse(latest.timestamp) > rule.limitHours * 3_600_000) {
      const hours = Math.floor((Date.parse(dataset.asOf) - Date.parse(latest.timestamp)) / 3_600_000);
      findings.push({ id: "F-overdue", certainty: "observed", title: "Manager approval is overdue",
        explanation: `The latest manager event is pending for ${hours} hours at the snapshot time, beyond the ${rule.limitHours}-hour review window. This establishes a pending step, not why the approver has not responded.`,
        evidenceIds: [latest.id], ruleIds: [rule.id], nextCheck: "Confirm the approval task reached the intended role and check whether a decision exists outside the captured event history before escalating." });
    }
    if (rule.kind === "required-input" && latest.status === "failed" && latest.errorCode === "MISSING_REQUIRED_FIELD" && latest.field === rule.field) {
      findings.push({ id: "F-input", certainty: "observed", title: "A required input is missing",
        explanation: `The validation event names ${rule.field} as missing. The process requires that field before approval can start.`,
        evidenceIds: [latest.id], ruleIds: [rule.id], nextCheck: `Ask the requester to confirm the ${rule.field} value, then have a person review the corrected request before resubmission.` });
    }
  }
  if (!findings.length) {
    const rule = dataset.rules.find((r) => r.kind === "heartbeat");
    findings.push({ id: "F-unknown", certainty: "unknown", title: "There is not enough evidence to name a cause",
      explanation: "The captured events do not establish an active failure or an overdue approval. A final case status or an absent event alone cannot prove what went wrong.",
      evidenceIds: timeline.length ? [timeline.at(-1)!.id] : [], ruleIds: rule ? [rule.id] : [],
      nextCheck: "Inspect the workflow run history and connector state. Capture the next step and any error before assigning a cause." });
  }
  return { case: item, asOf: dataset.asOf, findings, timeline, rules: dataset.rules, lessons: [], source: "fixture", sourceLabel: "Local synthetic fixtures",
    narrative: { status: "not-requested", text: "" } };
}
