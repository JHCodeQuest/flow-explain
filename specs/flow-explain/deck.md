# Final deck content (six slides)

Source: `submission.md` (ten-slide outline, reduced to six). Rule 6.2 asks for the problem and users, the solution, the workflow or architecture, the technical stack, how Zetaris and Meterless were used and what was unique, product visuals, and future enhancements. The six slides cover all of these: problem and users and the solution on slide 1, workflow and stack on slide 2, Zetaris on slide 3, Meterless and what is unique on slides 4 and 5, visuals on every slide, and future enhancements on slide 6.

Nothing here has been submitted or published. The deck is not built yet; this file is the exact text.

## Visuals: use and avoid
- **Safe to use** (in the ignored `artifacts/` folder): `zetaris-live-fe101.png` (live Zetaris, 23 Oct), `nightshift-browser-review.png` (22 Oct, analyst note recalled), and the scripted-demo screenshots `loop2-fe101.png`, `loop2-fe103.png` and `final-kb-fe101.png`. The scripted screenshots show the "Mock runtime — scripted responses" label; keep that label visible.
- **Do not use:** `nightshift-running.png` (shows a runtime port and an offline banner), `setup-*.png` and `hackos-track-selector.png` (private setup and account pages), `flow-explain-preview.png` (made before the window, in the earlier explanation format), and anything showing a terminal, environment file, address bar or port.
- **Gap:** no UI screenshot of the live Nightshift result exists, because the 23 Oct live run used the API. Capture one during the recorded live run and label it "Live". Until then use the text card on slide 4 and do not substitute a scripted screenshot.
- No slide contains an endpoint, port, credential or key.

---

## Slide 1 — Why did this approval stop?

**On-slide text**
- Title: **Why did this approval stop?**
- Subtitle: FlowExplain · Wildcard [Tinkerer] · synthetic data
- Support analysts must explain a stalled approval.
- The evidence is split across case records, workflow events and process rules.
- A final status alone does not prove the cause.
- FlowExplain returns cited findings, a timeline and one next check, or says the cause is unknown.
- All data is synthetic. No tenant is connected.

**Visual:** the case queue and the "The finance handoff failed" finding, cropped from `zetaris-live-fe101.png`.

**Speaker notes:** Analysts get asked why an approval stopped, and the answer is scattered across records. Showing the final status is not an answer. FlowExplain follows the recorded events and the process rules and cites them, and when the evidence is not enough it says so. Everything you see is synthetic data.

---

## Slide 2 — Evidence flow and architecture

**On-slide text**
- Diagram, left to right: **Fixtures or Zetaris** → **Deterministic rules** → **Cited findings (authoritative)** → **H-MEM notes (advisory, separate)** → **Nightshift draft (opt-in)** → **Critic** → **Accept · Revise once · Return findings**
- Findings come from deterministic rules. A model never establishes them.
- A completed manager approval is not blamed for a later routing failure.
- Stack: TypeScript on Node, a Vite interface, a Python REST helper for Zetaris, Meterless H-MEM and Nightshift. The server is loopback-only.
- The explanation provider is chosen explicitly. There is no fallback.

**Visual:** the diagram above, built as boxes. Mark the findings box as the source of truth and the H-MEM and Nightshift boxes as optional.

**Speaker notes:** The rules decide the findings. Notes from analysts and the model's wording sit beside them and cannot change them. Each step is explicit: evidence from fixtures or Zetaris, findings, optional notes, an optional draft explanation, then a check. The app never silently switches provider or data source.

---

## Slide 3 — Zetaris: what it does and its precise scope

**On-slide text**
- One fixed, read-only SQL join over three synthetic snapshot collections: cases, events and rules.
- Sent through the official Python REST helper.
- The returned rows must exactly match the snapshots, or the investigation fails visibly.
- No fallback to fixtures. No writes, schema changes or arbitrary SQL.
- **Scope:** the snapshots travel as SQL literals. They are not registered datasources, and the instance lists none.
- **Live check, 23 Oct 2026:** FE-101 returned 1 case, 3 events and 4 rules, and was shown in the browser.
- Pre-existing component, unchanged in the hackathon window.

**Visual:** `zetaris-live-fe101.png`, cropped to the source label and the finding. Caption: "Live, 23 Oct 2026 (UTC)".

**Speaker notes:** This is a narrow, safe use of Zetaris: one fixed read-only join through the REST helper, and the rows must come back exactly as sent. I want to be precise about scope: the data are synthetic snapshots, not registered production sources, so this verifies the channel and the join, not federation. The Zetaris adapter is from the earlier prototype and was not changed in the window.

---

## Slide 4 — H-MEM notes and live Nightshift evidence

**On-slide text**
*H-MEM (Meterless, pre-existing, unchanged)*
- Analyst notes are stored with provenance and recalled across restarts.
- Shown as unverified advice: they never change findings and are never citable.
- Live, 23 Oct 2026: one synthetic note was recalled.

*Nightshift (Meterless, new in the window)*
- Default explanation route, requested per investigation.
- **Live FE-101, 23 Oct 2026:** accepted on the first draft · 1 completion · 6 of 6 checks · 71.8 s.
- Model reported by the runtime: `nvidia/nemotron-3.5-lightning-30b-a3b`. Nightshift chose it, not the app.
- Cited E-102, E-103, R-02 and R-04. R-04 is a real rule from another scenario: the critic does not judge relevance.

**Visual:** left, the analyst-notebook area of `nightshift-browser-review.png` (22 Oct). Right, a UI screenshot of the live result captured during the recorded run, labelled "Live". If none is captured, use a text card: "Recorded 23 Oct 2026 through the API, not a UI screenshot".

**Speaker notes:** H-MEM keeps what analysts learn, but only as advice that sits outside the evidence. Nightshift is the default route for the explanation. On the live run it was accepted on the first draft with one completion, and the runtime reported an NVIDIA Nemotron model. I will also point out that one cited rule was real but about a different scenario. That is exactly the limit of the check. Before generating, the app checks the runtime and tells rejected credentials apart from an offline runtime. The same model was reported on the 22 October live check.

---

## Slide 5 — Draft, check, revise: mock demonstrations and live acceptance

**On-slide text**
- Nightshift drafts. A deterministic critic runs six checks: JSON, citations, inline references, coverage, named contradictions, claimed remediation.
- Accept, revise once, or return the findings with a fixed reason. The same checks must pass again.
- At most 2 completions and 1 discovery check in a 180 s budget. HTTP errors and timeouts are not revised.
- **LIVE (Nightshift, 23 Oct 2026):** FE-101 accepted on the first draft. A live revise or return has not been observed.
- **MOCK RUNTIME — SCRIPTED RESPONSES:** FE-102 accepted · FE-101 and FE-104 revised · FE-103 returned with the findings and no model text.
- The scripted demo shows the branches, not live model quality.

**Visual:** two clearly separated panels. Left, titled "Live": the recorded result (or the live screenshot). Right, titled "Mock runtime — scripted responses": `loop2-fe101.png` (revised) and `loop2-fe103.png` (returned), with the label visible.

**Speaker notes:** I keep these two apart on purpose. Live: one accepted run. Scripted: the only place I can show a revision and a return on demand, because a real model will not fail on cue. I will say plainly that I have not seen a live revision or return. The mock proves the loop's logic, not the model's quality.

---

## Slide 6 — Limits, pre-existing work and new work

**On-slide text**
*Limits*
- The critic checks structure, citations, coverage and named contradictions. It is not proof of correctness.
- A valid citation may not be relevant (live: R-04).
- Synthetic data, no tenant, nothing remediated. One live sample per integration.

*Pre-existing, declared*
- Commit `7feb021`, 20 Oct 2026: evidence engine, Zetaris join, H-MEM notes, NVIDIA adapter, interface. Codex-assisted.

*New, 22–23 Oct 2026*
- Nightshift route, draft/check/revise loop, Review panel, scripted demo, tests. Built with Claude Code.

*Future (proposals, not built)*
- Citation relevance check · registered Zetaris sources · tenant connection with real authorization · observing a live revise and return.

**Visual:** three columns (limits, pre-existing, new) with the future list as a footer strip. No screenshots.

**Speaker notes:** The honest summary. The checks are useful but narrow, and one accepted live run is a sample, not proof. The earlier prototype is declared: the evidence engine, Zetaris and H-MEM, with Codex assistance. What I built in the window is the Nightshift route and the feedback loop, with Claude Code. Cursor use is not claimed. The future items are proposals only. Wording-based checks can miss or over-flag, and H-MEM supports one local process.

---

## Where each claim comes from
| Claim | Source in this repository |
|---|---|
| Fixed read-only join, exact-match check, no fallback, snapshots as SQL literals | `README.md` ("The three layers"); `plan.md` AC-03 |
| Live Zetaris FE-101: 1 case, 3 events, 4 rules, 23.3 s; browser pass; instance lists no datasources | `plan.md` "Pre-recording Zetaris verification (2026-10-23)" |
| Zetaris and H-MEM unchanged in the window; `7feb021` on 20 Oct is the pre-existing commit | `README.md` "Pre-existing work versus hackathon work"; `git log` |
| H-MEM notes stored with provenance, recalled across restarts, advisory, uncitable | `plan.md` AC-04; `README.md` |
| Live note recalled on 23 Oct; accepted on the first draft, 1 completion, 6 of 6 checks, 71.8 s, sources E-102, E-103, R-02, R-04, model reported | `plan.md` "Final verification of commit f5aea48" |
| Same model reported on 22 Oct | `plan.md` "Live check (2026-10-22…)" |
| R-04 is from another scenario and the critic does not judge relevance | `plan.md` "Final verification", remaining gaps |
| Six checks, same checks after revision, 2 completions, 1 discovery, 180 s budget, transport failures not revised | `plan.md` AC-08 section; `README.md` "Explanation review loop" |
| Scripted outcomes: FE-102 accepted, FE-101 and FE-104 revised, FE-103 returned | `tests/demo-loop.test.ts`; `plan.md` AC-08 (browser run on the final build) |
| No live revise or return observed | `plan.md` remaining gaps |
| Codex assistance on the prototype, Claude Code in the window | `submission.md` tooling statement (from the project owner) |
