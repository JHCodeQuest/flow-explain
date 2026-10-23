import type { ApprovalCase, Investigation, Lesson } from '../src/domain/types.ts';

type Source = 'fixture' | 'zetaris';
type CaseResponse = { cases: ApprovalCase[]; asOf: string; status: { memory: boolean; explain: boolean; explainProvider: string; zetaris: boolean }; synthetic: true };
const app = document.querySelector<HTMLDivElement>('#app')!;
let token = '';
let cases: ApprovalCase[] = [];
let selectedId = '';
let investigation: Investigation | undefined;
let busy = false;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function append(parent: HTMLElement, ...children: (HTMLElement | string)[]): void {
  parent.append(...children);
}
function stamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(date) + ' UTC';
}
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-Flow-Token': token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The request could not be completed.');
  return result as T;
}
function message(error: unknown): string { return error instanceof Error ? error.message : 'The request could not be completed.'; }

const shell = el('div', 'shell');
const sidebar = el('aside', 'sidebar');
const brand = el('a', 'brand', 'FlowExplain');
brand.href = '/';
brand.setAttribute('aria-label', 'FlowExplain home');
append(sidebar, el('div', 'brand-symbol', 'f↗'), brand, el('p', 'brand-description', 'Clarity behind every approval.'));
const nav = el('nav', 'navigation');
nav.setAttribute('aria-label', 'Workspace');
append(nav, el('span', 'nav-heading', 'WORKSPACE'), el('div', 'nav-active', '▤  Approval investigations'));
append(sidebar, nav);
const integrationBox = el('div', 'integrations');
append(integrationBox, el('h2', 'nav-heading', 'LOCAL CONNECTIONS'), el('p', 'connection-caption', 'Configuration status only. A configured service is not a verified connection.'));
const integrationRows = el('div');
append(integrationBox, integrationRows);
append(sidebar, integrationBox, el('div', 'sidebar-footer', 'LOCAL PROTOTYPE\nSynthetic purchase approvals'));
const main = el('main', 'main');
const topbar = el('header', 'topbar');
append(topbar, el('span', 'breadcrumb', 'Workspace / Approvals'), el('span', 'local-badge', '● Local only'));
const heading = el('div', 'page-heading');
const headingText = el('div');
append(headingText, el('p', 'eyebrow', 'FOLLOW THE EVIDENCE'), el('h1', '', 'Why did this approval stop?'), el('p', 'subtitle', 'Trace the handoffs. Understand the rules. Find the next check.'));
const synthetic = el('div', 'synthetic-label', 'SYNTHETIC DATA');
append(heading, headingText, synthetic);
const snapshot = el('p', 'snapshot', 'Loading fixed snapshot…');
const globalStatus = el('p', 'global-status');
globalStatus.setAttribute('role', 'status');
globalStatus.setAttribute('aria-live', 'polite');
const workspace = el('div', 'workspace');
const casePane = el('section', 'case-pane');
casePane.setAttribute('aria-label', 'Approval cases');
const caseHeading = el('div', 'case-heading');
const caseCount = el('span', 'count', '—');
append(caseHeading, el('h2', '', 'Case queue'), caseCount);
const caseList = el('div', 'case-list');
const controls = el('form', 'investigation-controls');
const sourceLabel = el('label', 'field-label', 'Evidence source');
sourceLabel.htmlFor = 'source';
const source = el('select');
source.id = 'source';
for (const [value, label] of [['fixture', 'Local fixtures · offline'], ['zetaris', 'Zetaris · synthetic snapshots']]) {
  const option = el('option', '', label); option.value = value; source.append(option);
}
let provider = 'Meterless Nightshift';
const aiLabel = el('label', 'checkbox-label');
const ai = el('input'); ai.type = 'checkbox'; ai.id = 'explain';
const aiText = el('span', '', 'Add ' + provider + ' explanation');
append(aiLabel, ai, aiText);
const investigateButton = el('button', 'primary', 'Investigate case  ↗');
investigateButton.type = 'submit'; investigateButton.disabled = true;
append(controls, sourceLabel, source, aiLabel, el('p', 'control-help', 'Optional explanation uses the selected synthetic evidence. Runs only when you investigate.'), investigateButton);
append(casePane, caseHeading, caseList, controls);
const detail = el('section', 'detail-pane');
detail.setAttribute('aria-label', 'Case investigation');
append(workspace, casePane, detail);
append(main, topbar, heading, snapshot, globalStatus, workspace);
append(shell, sidebar, main); app.append(shell);

function setBusy(value: boolean): void {
  busy = value;
  investigateButton.disabled = value || !selectedId;
  investigateButton.textContent = value ? 'Investigating…' : 'Investigate case  ↗';
  source.disabled = value; ai.disabled = value;
  caseList.querySelectorAll('button').forEach(button => button.disabled = value);
  detail.setAttribute('aria-busy', String(value));
}
function renderCases(): void {
  caseList.replaceChildren(); caseCount.textContent = String(cases.length);
  if (!cases.length) { caseList.append(el('p', 'empty-queue', 'No synthetic approval cases are available.')); return; }
  for (const item of cases) {
    const button = el('button', 'case-card' + (item.id === selectedId ? ' selected' : ''));
    button.type = 'button'; button.setAttribute('aria-pressed', String(item.id === selectedId));
    const meta = el('div', 'case-meta');
    append(meta, el('span', 'case-id', item.id), el('span', 'badge badge-' + item.status, item.status));
    append(button, meta, el('h3', '', item.title), el('p', 'case-description', item.description), el('p', 'case-owner', item.ownerRole + '  →'));
    button.addEventListener('click', () => {
      if (busy) return;
      selectedId = item.id; investigation = undefined; globalStatus.textContent = ''; renderCases(); renderEmpty(); investigateButton.disabled = false;
    });
    caseList.append(button);
  }
}
function renderEmpty(): void {
  detail.replaceChildren();
  const selected = cases.find(item => item.id === selectedId);
  const intro = el('div', 'empty-investigation');
  append(intro, el('span', 'empty-icon', '⌁'), el('p', 'eyebrow', 'A CLEARER PICTURE STARTS HERE'), el('h2', '', selected ? 'Ready to trace this approval.' : 'Choose an approval to begin.'), el('p', '', selected ? 'Investigate the selected case to connect its events and process rules. Every finding points back to its evidence.' : 'Select a case from the queue, then investigate its recorded journey.'));
  const steps = el('div', 'empty-steps');
  for (const [number, title, description] of [['01', 'Trace the journey', 'Follow recorded workflow events.'], ['02', 'Check the rules', 'Separate evidence from assumptions.'], ['03', 'Know what to check', 'Take an informed next step.']]) {
    const step = el('div'); append(step, el('span', 'step-number', number), el('h3', '', title), el('p', '', description)); steps.append(step);
  }
  append(detail, intro, steps, el('p', 'empty-footnote', 'Decision support for analysts · No workflow changes are made'));
}
function citation(id: string, kind: 'event' | 'rule'): HTMLButtonElement {
  const button = el('button', 'citation', id); button.type = 'button';
  button.setAttribute('aria-label', 'View ' + kind + ' ' + id);
  button.addEventListener('click', () => {
    const target = document.getElementById(kind + '-' + id);
    if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.focus({ preventScroll: true }); }
  });
  return button;
}
function renderLessons(host: HTMLElement, result: Investigation): void {
  host.replaceChildren();
  if (!result.lessons.length) host.append(el('p', 'muted', 'No matching analyst lessons yet. Add an observation to inform future investigations.'));
  for (const lesson of result.lessons) {
    const note = el('article', 'lesson');
    append(note, el('p', '', lesson.text), el('p', 'lesson-provenance', `${lesson.id} · From ${lesson.sourceCaseId} · ${stamp(lesson.createdAt)}`)); host.append(note);
  }
}
/** Fixed-template checks only: no model text, draft or reasoning is rendered. */
function renderReview(review: NonNullable<Investigation['narrative']['review']>): HTMLElement {
  const panel = el('section', 'review-panel');
  panel.setAttribute('aria-label', 'Explanation review');
  const outcome = { accepted: 'Accepted on the first draft', revised: 'Accepted after one revision', returned: 'Not accepted: deterministic findings shown' }[review.outcome];
  append(panel, el('p', 'eyebrow', 'EXPLANATION REVIEW'), el('p', 'review-outcome review-' + review.outcome, outcome));
  panel.append(el('p', 'review-caption', 'Structural, citation, coverage and named-contradiction checks. They do not prove the wording is factually correct. The findings below are unchanged.'));
  if (review.reason) panel.append(el('p', 'provider-warning', review.reason));
  for (const attempt of review.attempts) {
    const block = el('div', 'review-attempt');
    block.append(el('h4', '', (attempt.n === 1 ? 'First draft' : 'Revision') + ' · ' + (attempt.passed ? 'all checks passed' : 'checks failed')));
    const list = el('ul', 'review-checks');
    for (const check of attempt.checks) {
      const mark = check.status === 'pass' ? '✓ Pass' : check.status === 'fail' ? '✗ Fail' : '– Not run';
      list.append(el('li', 'review-check review-' + check.status, mark + ' · ' + check.label + (check.refs?.length ? ' (' + check.refs.join(', ') + ')' : '')));
    }
    block.append(list); panel.append(block);
  }
  return panel;
}
function renderInvestigation(result: Investigation): void {
  detail.replaceChildren();
  const header = el('div', 'detail-header');
  const meta = el('div', 'detail-meta');
  append(meta, el('span', 'eyebrow', 'INVESTIGATION / ' + result.case.id), el('span', 'badge badge-' + result.case.status, result.case.status));
  append(header, meta, el('h2', '', result.case.title), el('p', 'detail-source', result.sourceLabel + ' · Snapshot ' + stamp(result.asOf)));
  detail.append(header);
  const summary = el('section', 'summary-panel');
  append(summary, el('p', 'eyebrow', result.narrative.status === 'ready' ? (result.narrative.provider || provider).toUpperCase() + ' EXPLANATION' + (result.narrative.model ? ' · ' + result.narrative.model : '') + ' · CHECK AGAINST EVIDENCE' : 'EVIDENCE SUMMARY'));
  const fallback = result.findings.map(finding => finding.explanation).join(' ') || 'There is insufficient evidence to establish what happened.';
  append(summary, el('p', 'summary-text', result.narrative.text || fallback));
  if (result.narrative.status === 'unavailable') summary.append(el('p', 'provider-warning', provider + ' explanation unavailable. ' + (result.narrative.reason || 'The deterministic findings remain available.')));
  if (result.narrative.status === 'not-requested') summary.append(el('p', 'summary-caption', 'Deterministic analysis · ' + provider + ' explanation not requested'));
  detail.append(summary);
  if (result.narrative.review) detail.append(renderReview(result.narrative.review));
  const findings = el('section', 'detail-section');
  append(findings, el('h3', 'section-heading', 'What the evidence tells us'));
  if (!result.findings.length) findings.append(el('p', 'muted', 'No findings were returned for this case.'));
  for (const finding of result.findings) {
    const card = el('article', 'finding');
    append(card, el('span', 'finding-certainty ' + finding.certainty, finding.certainty === 'unknown' ? '?  Insufficient evidence' : '✓  Observed in evidence'), el('h4', '', finding.title), el('p', '', finding.explanation));
    const citations = el('div', 'citations');
    for (const id of finding.evidenceIds) citations.append(citation(id, 'event'));
    for (const id of finding.ruleIds) citations.append(citation(id, 'rule'));
    append(card, citations, el('div', 'next-check', 'NEXT CHECK  →  ' + finding.nextCheck)); findings.append(card);
  }
  detail.append(findings);
  const evidence = el('div', 'evidence-grid');
  const timeline = el('section', 'detail-section');
  append(timeline, el('h3', 'section-heading', 'Recorded journey'), el('p', 'section-caption', 'Workflow events, in chronological order'));
  const events = el('ol', 'timeline');
  for (const event of [...result.timeline].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    const item = el('li', 'timeline-event event-' + event.status); item.id = 'event-' + event.id; item.tabIndex = -1;
    append(item, el('div', 'event-time', stamp(event.timestamp)), el('h4', '', event.step), el('span', 'event-status', event.status), el('p', '', event.detail));
    if (event.errorCode) item.append(el('p', 'error-code', event.errorCode));
    if (event.field) item.append(el('p', 'muted', 'Field: ' + event.field));
    item.append(el('span', 'evidence-id', event.id)); events.append(item);
  }
  if (!result.timeline.length) timeline.append(el('p', 'muted', 'No workflow events recorded. The cause remains unknown.'));
  timeline.append(events);
  const rules = el('section', 'detail-section rules-section');
  append(rules, el('h3', 'section-heading', 'Process rules'), el('p', 'section-caption', 'Policy used in this investigation'));
  for (const rule of result.rules) {
    const card = el('article', 'rule'); card.id = 'rule-' + rule.id; card.tabIndex = -1;
    append(card, el('span', 'evidence-id', rule.id), el('h4', '', rule.step), el('p', '', rule.description)); rules.append(card);
  }
  if (!result.rules.length) rules.append(el('p', 'muted', 'No process rules available.'));
  append(evidence, timeline, rules); detail.append(evidence);
  const lessons = el('section', 'detail-section lessons-section');
  append(lessons, el('div', 'lesson-heading', 'ANALYST NOTEBOOK'), el('h3', 'section-heading', 'Lessons from prior investigations'), el('p', 'section-caption', 'Unverified analyst advice, recalled by scenario. These notes do not change the evidence or findings.'));
  const lessonList = el('div', 'lesson-list'); renderLessons(lessonList, result); lessons.append(lessonList);
  const form = el('form', 'lesson-form');
  const label = el('label', 'field-label', 'Add an analyst correction or lesson'); label.htmlFor = 'lesson';
  const input = el('textarea'); input.id = 'lesson'; input.minLength = 20; input.maxLength = 400; input.required = true; input.rows = 3; input.placeholder = 'Record a synthetic scenario observation and what an analyst should check…'; input.setAttribute('aria-describedby', 'lesson-help lesson-status');
  const help = el('p', 'control-help', '20–400 characters. Synthetic observations only. Stored in the separate local analyst memory.'); help.id = 'lesson-help';
  const formBottom = el('div', 'form-bottom');
  const count = el('span', 'character-count', '0 / 400');
  input.addEventListener('input', () => { count.textContent = `${input.value.length} / 400`; });
  const save = el('button', 'secondary', 'Save analyst lesson'); save.type = 'submit';
  const status = el('p', 'note-status'); status.id = 'lesson-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  append(formBottom, count, save); append(form, label, input, help, formBottom, status);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (text.length < 20 || text.length > 400) { status.textContent = 'Enter between 20 and 400 characters, excluding surrounding spaces.'; return; }
    save.disabled = true; input.disabled = true; status.textContent = 'Saving analyst lesson…';
    try {
      const lesson = await api<Lesson>('/api/lessons', { caseId: result.case.id, text });
      result.lessons = [...result.lessons.filter(existing => existing.id !== lesson.id), lesson];
      renderLessons(lessonList, result); input.value = ''; count.textContent = '0 / 400';
      status.textContent = 'Lesson saved and shown above. Evidence is unchanged; no source or explanation was requested.';
    } catch (error) { status.textContent = 'Lesson was not saved. ' + message(error); }
    finally { save.disabled = false; input.disabled = false; }
  });
  lessons.append(form); detail.append(lessons);
}
controls.addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !selectedId) return;
  setBusy(true); globalStatus.className = 'global-status'; globalStatus.textContent = 'Tracing recorded events and process rules…';
  try {
    investigation = await api<Investigation>('/api/investigate', { caseId: selectedId, source: source.value as Source, explain: ai.checked });
    renderInvestigation(investigation); globalStatus.textContent = 'Investigation ready. Findings are linked to recorded evidence.';
  } catch (error) {
    globalStatus.className = 'global-status error'; globalStatus.textContent = 'Investigation failed. ' + message(error) + ' Select Investigate case to retry.';
    investigation = undefined; renderEmpty();
  } finally { setBusy(false); }
});
async function initialize(): Promise<void> {
  renderEmpty(); globalStatus.textContent = 'Loading synthetic case queue…';
  try {
    const session = await fetch('/api/session');
    if (!session.ok) throw new Error('Could not establish a local session.');
    token = (await session.json() as { token: string }).token;
    const result = await api<CaseResponse>('/api/cases');
    provider = result.status.explainProvider; aiText.textContent = 'Add ' + provider + ' explanation';
    cases = result.cases; selectedId = cases[0]?.id || '';
    snapshot.textContent = 'FIXED SNAPSHOT  ·  ' + stamp(result.asOf) + '  ·  Purchase approval process';
    for (const [label, configured] of [['H-MEM analyst memory', result.status.memory], [result.status.explainProvider + ' explanation', result.status.explain], ['Zetaris snapshots', result.status.zetaris]] as const) {
      const row = el('div', 'integration-row'); append(row, el('span', '', label), el('span', configured ? 'configured' : 'not-configured', configured ? 'Configured' : 'Not configured')); integrationRows.append(row);
    }
    renderCases(); renderEmpty(); investigateButton.disabled = !selectedId;
    globalStatus.textContent = cases.length ? 'Select a case and investigate when ready.' : 'The case queue is empty.';
  } catch (error) {
    globalStatus.className = 'global-status error'; globalStatus.textContent = 'Unable to load the workspace. ' + message(error);
    snapshot.textContent = 'Snapshot unavailable';
    const retry = el('button', 'secondary', 'Reload workspace'); retry.type = 'button'; retry.addEventListener('click', () => window.location.reload()); caseList.append(retry);
  }
}
void initialize();
