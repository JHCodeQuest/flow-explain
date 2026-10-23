# Submission materials (local drafts)

Drafts for the Open Agent Hackathon 2026 Submission Hub. Nothing here has been submitted, published or pushed, no organizer has been contacted, and no license has been added.

- **Track:** Wildcard [Tinkerer] (it can be changed until the deadline, rule 3.3).
- **Deadline:** **27 October 2026, 23:45 UTC.** Hard deadline; registration closes at the same moment. Time zones do not extend it (rule 4.3).
- **Rules source:** https://hackathon.genai.works/event/open-agent-hackathon-2026 (`#rules`, `#faq`), read on 2026-10-23. A paraphrase with rule numbers is in `specs/flow-explain/official-rules.md`.

## Rule conflict recorded: Cursor (rules 5.1 and 6.4)

- **Published rules (verified 2026-10-23):** rule 5.1 says teams must use Cursor for development, and rule 6.4 asks the submission to explain how Cursor was used.
- **Later organizer announcement (reported by the project owner, not seen by this record):** Cursor is optional and Claude Code is allowed. Its link and date are not recorded here. Add the link or a screenshot reference before relying on it.
- **Status:** the two statements conflict and the conflict is not resolved in these materials. They do not claim Cursor use. Everything below says what was actually used.

## Development tooling statement (truthful, for the form)

The pre-existing prototype (commit `7feb021`, 20 October 2026) received Codex assistance, as reported by the project owner. Development in the build window (22 and 23 October 2026) used Claude Code. Commit trailers are not a complete tooling record: the 12 in-window commits carry a Claude co-author trailer and the prototype commit carries none, and neither says what other tools or manual work were involved. This submission does not claim that Cursor was used.

## Requirement checklist

| Rule | Asset | State |
|---|---|---|
| 6.1 | Demo video, 1-4 minutes, showing Zetaris and Meterless integration | Script below; not recorded. The Zetaris pre-recording verification passed on 2026-10-23 (see `plan.md`); re-run it on recording day. |
| 6.2 | Slide deck | Outline below; not built. |
| 6.3 | GitHub repository with all source and a README (setup, usage, dependencies) | README exists. The commits are local only; no push has been made and repository visibility is not decided. |
| 6.4 | Written explanation of Zetaris, Meterless, tooling and NVIDIA use, and what is unique | Drafted below. |
| 5.4 | Pre-existing product code declared in the submission form | Text below. |
| Hub | Track, description up to 2,000 characters, video link or upload | Description drafted. The rest of the form is behind sign-in and has not been read. |
| 2.2 | Team registered; composition locks at first submission | Not checked. |

## Project description (1835 characters; the Hub limit is 2,000)

FlowExplain answers a support analyst's question: why did this approval stall? For a synthetic purchase-approval process it joins case records, workflow events and process rules, then returns cited findings and a next check. Deterministic rules establish the findings; a model never does. A completed manager approval is not blamed for a later routing failure, and an incomplete case is reported as unknown.

Entered as Wildcard [Tinkerer]: this extends a prototype committed on 20 Oct 2026, before the build window. That earlier work is the evidence engine, a read-only Zetaris REST join of synthetic snapshots, H-MEM analyst notes (advisory, labelled unverified, never citable), the UI and a local security boundary.

New in the window (22-23 Oct):
1. Meterless Nightshift is the default explanation route. The provider is chosen explicitly and never falls back. In our live runs the runtime reported nvidia/nemotron-3.5-lightning-30b-a3b; Nightshift routed it, the app did not choose it.
2. A bounded feedback loop. Nightshift drafts an explanation and a deterministic critic checks it. The app accepts it, asks for one revision, or returns the deterministic findings with a fixed reason. The same checks must pass again after a revision, at most two completions share one 180 s budget, and the UI shows the checks and outcome, not hidden reasoning.

Limits: the critic checks structure, citation validity, evidence coverage and named contradictions. It does not prove the wording is correct, and a valid citation is not necessarily a relevant one. Data is synthetic, no tenant is connected and nothing is remediated. Live Nightshift was run on a few cases; the revise and return branches are shown with a labelled mock runtime (scripted responses), not live.

Judges can run it offline from fixtures and the mock demo (see README).

## Pre-existing work declaration (text for the submission form)

> **Pre-existing component:** the FlowExplain local prototype, commit `7feb021`, made on 20 October 2026, before the 22 October 00:00 UTC build window. It contains the deterministic evidence engine and four synthetic scenarios, the loopback API and its security boundary, a read-only Zetaris REST join of synthetic snapshots, H-MEM analyst notes, a direct NVIDIA explanation adapter and the web interface. The prototype received Codex assistance; work in the window was developed with Claude Code. There is no other pre-existing product code. Open-source development dependencies: Vite, TypeScript and Node type definitions.
>
> **Built in the window (22-23 October 2026):** Meterless Nightshift as the default explanation route; a bounded draft, check and revise feedback loop with a deterministic critic; the Review panel; a labelled mock-runtime demo; tests; verification records; and these submission materials. The evidence engine, the H-MEM and Zetaris adapters and the fixture data were not modified. The direct NVIDIA adapter was refactored to share the new prompt and loop.
>
> Details and commit references: README, "Pre-existing work versus hackathon work".

## Written explanation of sponsor technology use (rule 6.4)

**Zetaris.** Selecting the Zetaris source sends one fixed, read-only SQL join over three synthetic snapshot collections (cases, events, rules) through the official Python REST helper. The returned rows must match the supplied snapshots exactly or the investigation fails visibly. There is no fallback to fixtures, no writes, no schema changes and no arbitrary SQL. The data are checked-in synthetic snapshots, not registered production sources. This integration pre-dates the window and was not changed in it. It was verified live on 23 October 2026 (official read-only preflight READY, then a live FE-101 join that returned the expected case, three events and four rules, shown in the browser); the record is in `plan.md`. Re-run it on recording day.

**Meterless.** Two parts. H-MEM (pre-existing, not modified): analyst corrections are stored with provenance through the Meterless H-MEM memory service, loaded from the official checkout into a separate local store. They are recalled across restarts for matching scenarios and shown separately as unverified advice; they never change a finding and can never be cited. A live run on 23 October recalled a stored synthetic note. Nightshift (new in the window): Meterless Nightshift is the default explanation route, with an authenticated discovery check that tells a rejected token from an offline runtime. The provider is chosen explicitly and never falls back.

**Development tooling.** The pre-existing prototype received Codex assistance; development in the window used Claude Code, as stated above. Cursor use is not claimed; see the recorded rule conflict.

**NVIDIA.** On two live runs (22 and 23 October) the Nightshift runtime reported that `nvidia/nemotron-3.5-lightning-30b-a3b` answered. Nightshift chose that model; the app did not. A direct NVIDIA adapter exists as an explicit opt-in; it pre-dates the window, was refactored in it and has only mocked tests since.

**What is unique.** Findings come from deterministic rules, not a model. Model wording must pass a deterministic critic (structure, citation validity, evidence coverage, named contradictions), with at most one revision, and a failure returns the evidence with a fixed reason. The checks are not proof of correctness, and a valid citation is not necessarily a relevant one.

**Evidence labels.** Live: Nightshift runs on 22 and 23 October; the 23 October run was accepted on the first draft after one completion. Scripted: the revise and return branches are shown only with the **Mock runtime - scripted responses** demo; a live revise or return has not been observed.

## Slide deck outline (rule 6.2)

Ten slides. Use curated screenshots only (for example `artifacts/loop2-*.png` and `artifacts/final-kb-fe101.png`); do not use the setup screenshots in that folder.

1. **Title and track.** FlowExplain, Wildcard [Tinkerer]. A banner: pre-existing prototype (20 Oct) versus work built in the window.
2. **Problem and users.** Support analysts explaining why an approval stalled, from fragmented records. Synthetic data.
3. **Solution.** Screenshot of cited findings, timeline and next check.
4. **Workflow and architecture.** Diagram: fixtures or Zetaris, then deterministic rules and findings, then H-MEM notes (advisory), then the Nightshift draft, then the critic, then accept, revise once, or return.
5. **Technical stack.** TypeScript, Node, Vite, Python REST helper, Meterless H-MEM and Nightshift, reported NVIDIA model; Codex assistance on the prototype and Claude Code in the window for development.
6. **How Zetaris is used.** The fixed read-only join, the exact-match check and no fallback; synthetic snapshots; pre-existing.
7. **How Meterless is used.** H-MEM notes (pre-existing) and Nightshift (new), with the discovery check and explicit provider.
8. **Feedback loop.** Two clearly separate panels. Left, titled "Live": the recorded Nightshift result. Right, titled "Mock runtime - scripted responses": the revise and return branches.
9. **What is unique, and the limits.** Deterministic findings, bounded critic; not proof of correctness; citation validity is not relevance; synthetic data; nothing remediated.
10. **Future enhancements** (proposals, not built): a relevance check for citations, Zetaris-registered sources, a tenant connection with real authorization.

## Video script (about 3:40; the limit is 4:00)

Rule for live segments: do not read from this script. Narrate only what appears on screen. The outcome, sources, model name, attempts and elapsed time are whatever the run shows. Put a caption on every segment: "Live" or "Mock runtime - scripted responses".

| Time | Segment | On screen | What to say |
|---|---|---|---|
| 0:00-0:20 | Problem | Case queue | "Analysts must explain why an approval stalled from fragmented records. Synthetic data. This extends a prototype from before the window; the README lists what is old and new. Developed with Codex assistance before the window and Claude Code in it." |
| 0:20-0:50 | Evidence | Fixture investigation of FE-101: findings, timeline, citations | Findings come from deterministic rules and cite events and rules. Describe what is on screen. |
| 0:50-1:30 | **Zetaris** | Switch the source to Zetaris and investigate. Caption "Live" | Explain the integration: one fixed read-only join over three synthetic snapshots through the REST helper, exact-match check, no fallback. Narrate what appears. If it fails, say the reason shown, do not retry on camera, and show the dated record as a record, not as live. |
| 1:30-1:55 | **Meterless H-MEM** | Save an analyst note, reinvestigate. Caption "Live" | The note is stored in Meterless H-MEM, recalled separately as unverified advice, and does not change the findings. |
| 1:55-2:50 | **Meterless Nightshift** | Tick the explanation and investigate. Caption "Live", plus "wait trimmed" only if trimmed | Explain that Nightshift is the default route. Read out what the Review panel shows: outcome, model the runtime reports, attempts, checks and sources. Say whether each cited source looks relevant, since the critic checks existence and coverage, not relevance. If it fails, say the reason shown and stop. |
| 2:50-3:25 | Scripted revise and return | Full-screen "Mock runtime - scripted responses", then `npm run demo:loop`: FE-101, then FE-103 | Scripted, not a live model. FE-101: first draft fails, one revision passes the same checks. FE-103: the revision fails, so the findings are shown with a fixed reason. |
| 3:25-3:40 | Limits | Limits card | "Checks are structural, not proof of correctness. A valid citation is not necessarily relevant. Synthetic data, nothing remediated, and a live revise has not been observed." |

If it runs long, trim the fixture segment, not the Zetaris or Meterless parts.

Pre-recording checks: re-run the official Zetaris preflight and one live join on recording day (they passed on 23 October); confirm the Nightshift runtime is reachable; close terminals and editors that show environment files; do not show the `artifacts/` folder. Do not pre-decide outcomes for the live segments.

## License

The rules do not require an open-source license: you keep your rights (9.1), and submitting grants the organizer a license to show your demo, screenshots and description (9.2), and sponsor-track submissions grant the sponsor the same non-exclusive promotional license (9.3). **No license has been added and the choice is open.** Rule 6.3 needs a GitHub repository judges can reach; it states no visibility requirement.

| Option | What it allows | Trade-offs |
|---|---|---|
| MIT | Reuse and modification with attribution; very short | No explicit patent grant |
| Apache-2.0 | Same, plus an express patent grant | Slightly longer obligations; it is the license of the Meterless and Zetaris getting-started repositories used here |
| BSD-3-Clause | Permissive, with a no-endorsement clause | No patent grant |
| MPL-2.0 | File-level copyleft | More obligations than MIT |
| GPL-3.0 or AGPL-3.0 | Strong copyleft; AGPL also covers network use | Deters reuse |
| No license | You keep every right | Nobody may legally reuse the code |

Runtime code has no npm dependencies, the dev dependencies were not license-audited, H-MEM is loaded from a separate checkout, and `data/demo.json` is original synthetic data.
