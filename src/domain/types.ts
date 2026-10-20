export interface ApprovalCase {
  id: string; title: string; description: string; status: "blocked" | "waiting" | "review";
  ownerRole: string; createdAt: string; scenario: "routing" | "overdue" | "input" | "unknown";
}
export interface WorkflowEvent {
  id: string; caseId: string; step: string; status: "completed" | "failed" | "pending";
  timestamp: string; detail: string; errorCode: string; field: string;
}
export interface ProcessRule {
  id: string; step: string; kind: "assignment" | "deadline" | "required-input" | "heartbeat";
  limitHours: number; field: string; description: string;
}
export interface Dataset { asOf: string; cases: ApprovalCase[]; events: WorkflowEvent[]; rules: ProcessRule[] }
export interface Finding {
  id: string; certainty: "observed" | "unknown"; title: string; explanation: string;
  evidenceIds: string[]; ruleIds: string[]; nextCheck: string;
}
export interface Lesson { id: string; text: string; scenario: string; sourceCaseId: string; createdAt: string }
export interface Investigation {
  case: ApprovalCase; asOf: string; findings: Finding[]; timeline: WorkflowEvent[]; rules: ProcessRule[];
  lessons: Lesson[]; source: "fixture" | "zetaris"; sourceLabel: string;
  narrative: { status: "not-requested" | "ready" | "unavailable"; text: string; reason?: string };
}
