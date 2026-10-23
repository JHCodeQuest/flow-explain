# Submission materials (local drafts)

Drafts for the Submission Hub. Nothing here has been submitted, published or pushed. Track in use: **Wildcard [Tinkerer]**. The official rules (submission requirements, IP, pre-existing work, FAQ) were only partly readable when checked, so confirm them on the event page before submitting.

## Project description (1835 characters; the Hub limit is 2,000)

FlowExplain answers a support analyst's question: why did this approval stall? For a synthetic purchase-approval process it joins case records, workflow events and process rules, then returns cited findings and a next check. Deterministic rules establish the findings; a model never does. A completed manager approval is not blamed for a later routing failure, and an incomplete case is reported as unknown.

Entered as Wildcard [Tinkerer]: this extends a prototype committed on 20 Oct 2026, before the build window. That earlier work is the evidence engine, a read-only Zetaris REST join of synthetic snapshots, H-MEM analyst notes (advisory, labelled unverified, never citable), the UI and a local security boundary.

New in the window (22-23 Oct):
1. Meterless Nightshift is the default explanation route. The provider is chosen explicitly and never falls back. In our live runs the runtime reported nvidia/nemotron-3.5-lightning-30b-a3b; Nightshift routed it, the app did not choose it.
2. A bounded feedback loop. Nightshift drafts an explanation and a deterministic critic checks it. The app accepts it, asks for one revision, or returns the deterministic findings with a fixed reason. The same checks must pass again after a revision, at most two completions share one 180 s budget, and the UI shows the checks and outcome, not hidden reasoning.

Limits: the critic checks structure, citation validity, evidence coverage and named contradictions. It does not prove the wording is correct, and a valid citation is not necessarily a relevant one. Data is synthetic, no tenant is connected and nothing is remediated. Live Nightshift was run on a few cases; the revise and return branches are shown with a labelled mock runtime (scripted responses), not live.

Judges can run it offline from fixtures and the mock demo (see README).

## Video script (about 3 minutes; Hub limit 4 minutes)

Rule for the live segment: do not read from this script. Narrate only what appears on screen. The outcome, the model name, the sources cited, the number of attempts and the elapsed time are whatever the run actually shows.

| Time | Segment | On screen | What to say |
|---|---|---|---|
| 0:00-0:25 | Problem | Case queue, FE-101 selected | "Support analysts must explain why an approval stalled, from fragmented records. This is synthetic data. This extends a prototype I built before the window; the README lists what is old and what is new." |
| 0:25-0:55 | Evidence | Fixture investigation of FE-101: findings, timeline, citations. If freshly verified, switch the source to Zetaris. If the analyst note is shown, show it as separate advice | Say the findings come from deterministic rules and each one cites events and rules. Describe the events and findings that are actually on screen. Say the analyst note is advice, not evidence, and does not change the findings. Say which source is selected, and that Zetaris data is synthetic snapshots. |
| 0:55-1:45 | Live Nightshift | Tick the explanation, investigate FE-101, wait. Caption "Live. Wait time trimmed." only if trimmed | Read out what the Review panel and heading actually show: the outcome, the model the runtime reports, how many attempts, which checks passed or failed and which sources were cited. Say whether each cited source looks relevant to the finding on screen, since the critic checks that a citation exists and is covered, not that it is relevant. If the run fails or is unavailable, say exactly the reason shown and stop; do not retry on camera. |
| 1:45-2:35 | Scripted revision and return | Full-screen title "Mock runtime - scripted responses", then `npm run demo:loop`: FE-101, then FE-103 | Say this is scripted, not a live model. FE-101: the first draft fails the checks, one revision is requested and the same checks pass. FE-103: the revision also fails, so the app shows the deterministic findings and a fixed reason, with no model text. |
| 2:35-3:00 | Limits | Limits card | "The critic checks structure, citation validity, coverage and named contradictions. It is not proof of correctness, and a valid citation is not necessarily relevant. Data is synthetic, nothing is remediated, and the live revise path has not been observed." |

Recording notes: record the live segment in one take and keep the clip's real outcome even if it is not the success case. If trimming the wait, say so on screen. Do not upload the `artifacts/` folder; it also holds setup screenshots.

## License options (decision needed; none chosen)

The repository has no license file. Until one is added, others have no stated right to reuse the code.

| Option | What it allows | Trade-offs |
|---|---|---|
| MIT | Reuse and modification with attribution; very short | No explicit patent grant |
| Apache-2.0 | Same, plus an express patent grant and a NOTICE convention | Slightly longer obligations. It is the license of the Meterless and Zetaris getting-started repositories used here |
| BSD-3-Clause | Permissive, with a no-endorsement clause | No patent grant |
| MPL-2.0 | File-level copyleft: changes to licensed files stay open | Less familiar; more obligations than MIT |
| GPL-3.0 or AGPL-3.0 | Strong copyleft; AGPL also covers network use | Deters reuse and may complicate sponsor reuse |
| No license, all rights reserved | You keep every right; the code is visible only if the repo is public | Nobody may legally reuse it. Check whether the event's IP rules require a grant |

Facts for the decision: runtime code has no npm dependencies; the dev dependencies (Vite, TypeScript, Node types) were not license-audited; H-MEM is loaded from a separate checkout rather than copied in; `data/demo.json` is original synthetic data; and the event's IP rules have not been read in full.
