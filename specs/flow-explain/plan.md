# Implementation plan and verification

Reading guide: sections are chronological and keep their original dated evidence. Counts and statements in an earlier section describe that point in time; later sections supersede them. The original prototype is `7feb021` (2026-10-20), the Nightshift provider is 2026-10-22, and the feedback loop and its verification are 2026-10-23 (see `git log`).

T-01 verified: pure evidence engine and four synthetic scenarios (AC-01, AC-02).
T-02 verified: loopback API, separate H-MEM store, opt-in NVIDIA and read-only Zetaris snapshot adapter (AC-03, AC-04, AC-05, AC-07).
T-03 verified: TypeScript interface, findings, evidence navigation and analyst notebook (AC-01, AC-04, AC-06).
T-04 verified: automated checks, synthetic live checks, browser journeys and independent code/security review. Local work only; no push/publication.

Affected areas: data/demo.json, src/domain, src/integrations, src/server, web, tests, README and configuration examples. Existing setup repositories and their uncommitted changes are preserved.

Dependencies: Vite for TypeScript browser bundling, TypeScript for strict checks, @types/node for server interfaces. All development-only; native Node/Python provide server, test and transport functionality. H-MEM loads from the configured official Meterless checkout. No production package dependency was added.

## Acceptance evidence

| Criterion | Status | Recorded evidence |
|---|---|---|
| AC-01 | Met | Five domain tests; browser displays all four case outcomes, timelines, rules, next checks and citations. FE-104 names no cause. |
| AC-02 | Met | Routing case cites completed manager event E-102 and failed handoff E-103. Later-success regression prevents stale failure findings. Snapshot-time test distinguishes pending from its unknown reason. |
| AC-03 | Met | Official REST preflight READY. Direct live adapter returned one case, three events and four rules; browser displayed the Zetaris synthetic source. Three Node and seven Python adapter tests cover fixed joins, exact evidence matching and safe failure without fallback. |
| AC-04 | Met | Actual H-MEM saved a synthetic note as mem-1, recalled it after server restart, and excluded it from other scenarios. Browser labels it unverified advice; deterministic findings remain unchanged. Unit test covers provenance, deduplication and filtering. |
| AC-05 | Met | Four provider tests cover missing credentials, citation validation and safe errors. Live HTTP 200 returned valid JSON, allowed citations and valid inline references after request hardening, with a synthetic note present. Browser displayed the accepted explanation and also visibly retained findings when an earlier response was rejected. No model text or credentials were logged. |
| AC-06 | Met within tested viewport | Browser exercised case selection, investigation, keyboard submission, keyboard citation focus, note save/recall and unknown evidence. Narrow in-app viewport visually inspected. Safe textContent rendering reviewed; exact 390px and other browser/viewport combinations were not separately tested at T-04. Later (2026-10-23): the AC-08 Review panel was checked at 390 px with no horizontal scroll, on the mock runtime, in one browser. |
| AC-07 | Met for local prototype | HTTP tests reject absent/wrong tokens, cross-origin/invalid Host, malformed modes, unknown cases, oversized bodies and private/static traversal paths before protected access. Independent review inspected actual code/configuration. Multi-user/tenant authorization is excluded. |

Final automated checks at T-04 (2026-10-20, historical; the current suite is 44 tests, see the AC-08 section): `npm test` passed 14/14 Node tests; `python tests/test-zetaris.py` passed 7/7; `npm run build` passed strict TypeScript checking and Vite build. Dependency audit reported zero vulnerabilities at installation. No lint script is configured. Node's experimental transform warning and npm's existing user-config warning do not fail these commands.

## Defects reproduced and resolved

- Source input array coercion: HTTP regression initially accepted `["fixture"]`; explicit string validation now rejects it before integration access.
- Model citation gaps: note IDs and invented inline IDs could pass the original validation. Regressions failed before fixes; strict evidence-only and inline validation now pass. Live invalid citation responses prompted an explicit allowed-ID list and removal of note identifiers from model context. Strict response validation was retained.
- Zetaris numeric transport: actual REST rows represented `limitHours` as a string. A regression reproduced rejection of otherwise identical rows. Only canonical bounded integer strings in that schema column are normalized; complete row identity checks remain mandatory. Invalid formats and altered evidence still fail.
- Review identified assertions swallowed by a provider mock's error handler; request assertions now run outside that handler and the full suite passes.

Independent reviews found no remaining blocker in the reviewed local scope after these fixes. This is an AI-assisted review, not a security guarantee or release authorization.

## Remaining limits

Synthetic snapshots are not registered production sources or a live Power Platform tenant. NVIDIA wording is advisory; valid IDs cannot prove every sentence. Provider output may still be rejected safely. H-MEM reference persistence supports one local process, not concurrent production use. Only the available in-app browser viewport was manually checked. No public host, deployment, tenant authentication, real customer data or workflow remediation is included.

## Hackathon extension: Meterless Nightshift explanation provider

New hackathon work extending the declared pre-existing prototype (the local approval investigation prototype committed as `7feb021`). Scope: one integration, the explanation provider (AC-05); evidence, citation validation, H-MEM and Zetaris behaviour are unchanged.

- Added `src/integrations/meterless.ts` (loopback URL normalisation, authenticated `/v1/models` discovery separating unauthorized from offline, bearer plus `meterless-app`/`meterless-scope` chat call) and moved the shared prompt and citation validation into `src/integrations/explanation.ts`; `nvidia.ts` now uses it with identical behaviour.
- Meterless is the default provider; `FLOW_EXPLAIN_PROVIDER=nvidia` is explicit opt-in. UI wording and the narrative record the provider and the model that actually answered.
- Tests (`tests/meterless.test.ts`): configuration and placeholder handling, headers and body, 401/403/offline discovery, 401/403/429/500/timeout, empty/malformed/uncited/invented/note citations, no token leakage.
- Defect found live: the `meterless/auto` route returned HTTP 502 `empty_response` for the real prompt at `max_tokens` 32 and 512 even with thinking disabled; the routed model reasons (about 2000 completion tokens here). Budget raised to 4096.
- Live check (2026-10-22, synthetic FE-101): discovery online, wrong token unauthorized, explanation ready with four valid citations; model reported by the runtime: `nvidia/nemotron-3.5-lightning-30b-a3b`.
- Limits: local only, not pushed or published; the routed model is chosen by Nightshift, so hosted routing is outside this app's control.

## Hackathon extension: bounded explanation feedback loop (AC-08)

New hackathon work on the declared prototype. One loop in `src/integrations/review.ts`; both providers route through it. Evidence engine, H-MEM and Zetaris are unchanged.

The critic is deterministic and narrow: structural, citation, coverage and named-contradiction checks (plus a no-claimed-remediation check). Analyst notes take no part in the critic; an earlier note-copy check was removed. It does not prove factual correctness; wording-based regexes can over- or under-trigger. The same checks must pass again after the single revision.

| Criterion | Status | Evidence |
|---|---|---|
| AC-08 accepted / revised / returned | Met (mocked) | `tests/review.test.ts` scripted completer: 1, 2 and 2 completions, no third call. `tests/demo-loop.test.ts` over loopback HTTP: FE-102 accepted, FE-101 and FE-104 revised, FE-103 returned. |
| Same checks after revision | Met | Revised attempt asserts all six checks pass; a revision with an invented citation is returned. |
| Transport failures not revised | Met | ProviderError and timeout produce one call and `returned`. |
| Findings authoritative, notes advisory | Met | `deepEqual` of findings before and after, in unit and HTTP tests; `mem-*` fails `citations`; regression test: `critique` output is identical with and without notes, including a note that restates a contradiction and a draft that copies a note, so notes cannot change any critic result. |
| Provider selection, no fallback, secrets | Met | Global `fetch` spy sees zero stray calls; NVIDIA and Nightshift tests hit only their own endpoint; response scan finds no token, failed-draft text or `reasoning_content` sentinel. |
| Limits | Met | At most 2 completions, 1 discovery, one 180 s budget covering discovery, draft and revision (excludes request receipt and Zetaris); fake-clock tests for exhaustion before the draft, during discovery, between draft and revision and at the 20 s revision floor, plus a real-timer test that a running call is aborted. No new request fields (`review:false` still 400). |
| UI review panel | Met within tested scope | `renderReview` uses textContent only (no innerHTML in source or bundle). Browser evidence is from the **mock runtime — scripted responses** (`npm run demo:loop`), not a live provider. A throwaway Chrome driven by browser-use ran after the final code change: a keyboard-only FE-101 run (earlier build) gave "Accepted after one revision"; on the final build FE-102 was accepted on the first draft, FE-101 and FE-104 revised, and FE-103 not accepted with the fixed reason and unchanged findings. Each attempt listed six checks, with no analyst-note row. The page text contained none of the failed-draft, reasoning or token sentinels, and the mock label showed in the checkbox, sidebar and result eyebrow. At 390 px there was no horizontal scroll (screenshots `artifacts/loop2-*.png`, ignored). Keyboard-only operation was repeated on the final build (commit `f5aea48`, mock runtime): Tab to the FE-101 card, Enter, Tab to the source select and the explanation checkbox, Space, Tab to the button, Enter gave "Accepted after one revision" with six checks per attempt, and Tab to a citation plus Enter moved focus to its timeline event. Not tested: other browsers or viewports, and screen readers. Pre-existing: after Enter on a case card the list re-renders and focus returns to the first card. |

Checks run: `npm test` 44/44, `python tests/test-zetaris.py` 7/7, `npm run typecheck` and `npm run build` pass.

Demo: `npm run demo:loop` serves the real app against a scripted loopback runtime labelled **Mock runtime — scripted responses**. It is a mock, not live provider evidence, and there is no production demo-mode switch. When this section was first written (commit `3eba4b9`, 2026-10-23) no live run had been made for the loop and the earlier 2026-10-22 live check predated it. A single live Nightshift run was made later the same day and is recorded in "Final verification" below; no live NVIDIA run has been made since the loop refactor.

Independent review (a separate AI agent, read-only; not a security guarantee) found no blocking bug. Fixed after review: the remediation regex flagged honest history, inline-ID matching matched prose like "E-mail", and a whitespace regex was quadratic. Added tests for each. Documented rather than changed: empty or truncated replies spend the one revision. Correction made later: the first version of this loop justified a 130 s deadline by the server's 150 s `requestTimeout`, which is wrong (it only bounds receiving the request). The budget is now 180 s, shared by discovery, draft and revision, and excludes a Zetaris query run first (up to 120 s). A cold model load using most of it leaves no time for a revision.

## Final verification of commit f5aea48 (2026-10-23)

Verification only; no features added.

**Mock runtime — scripted responses (not live evidence).** Keyboard-only FE-101 journey on the final build is recorded in the UI row above. After pressing Enter on a case card, focus falls to the page body and Tab restarts from the top (existing behaviour, unchanged).

**Live Meterless Nightshift (separate from the mock evidence).** One request, no retry, existing configuration, default provider, synthetic fixture evidence, `source=fixture`, `explain=true`, case FE-101, local Nightshift runtime reachable. No settings were changed and no secret was printed or found in the response.

| Observation | Result |
|---|---|
| HTTP status / narrative status | 200 / ready |
| Review outcome | accepted on the first draft |
| Completions | 1 (one review attempt; no revision) |
| Model reported by the runtime | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| Elapsed | 71.8 s wall-clock for the whole request (client-timed, includes the discovery check; the 180 s budget was not separately instrumented). A revision would have fitted in the remaining budget but was not needed. |
| Review checks | all six passed: envelope, citations, inline references, coverage, no named contradiction, no claimed remediation |
| Cited sources | E-102, E-103, R-02, R-04 |
| Deterministic result | findings, timeline and rules deep-equal to a fresh local `investigate()` of FE-101 |
| Analyst notes | one synthetic H-MEM note (`mem-1`) recalled and sent as labelled advice; not cited |

Remaining gaps and limits:
- **One live sample.** The live revised and returned paths, live rate limiting, a cold model load and a timeout against the 180 s budget have not been exercised; those paths are covered only by mocked tests.
- **Relevance is not checked.** The live draft cited R-04, a rule belonging to a different scenario (the heartbeat rule for the unknown-cause case). It is a real rule ID, so coverage and citation checks pass; the critic does not judge relevance, and the wording remains advisory.
- **Not an accuracy claim.** The checks are structural, citation, coverage and named-contradiction only; one accepted live draft does not show factual correctness.
- **Not tested:** the live run was not displayed in the browser UI, and other browsers, viewports and screen readers remain untested. Live NVIDIA was not run.

## Submission preparation checks (2026-10-23)

Documentation and verification only; no features added. Checked state: commit `6dc4bfd` (submission drafts, declaration, offline route). Nothing was pushed, published or submitted.

**Full-history secret scan.**
- gitleaks 8.30.1 over all refs: 11 commits, about 243 KB of history, redacted output, no findings.
- Exact-value search: the five distinct secret-looking values (names containing key, token, secret or password; at least 8 characters; not placeholders) in the project and shared environment files were searched for across all 11 commits and across 69 working-tree files, including ignored files, `dist/` and `artifacts/` text, excluding `node_modules` and `.git`. No history file matched. The only working-tree match is the local `.env.local`, which is one of the value sources, so it matches itself. It is gitignored and no commit has ever touched it. Values were never printed.
- Coverage limits: pattern and exact-string matching cannot find encoded, truncated or derived secrets, or values not present in those two environment files. Screenshots and other binary files were not inspected, so `artifacts/` images could show something sensitive; do not publish that folder. Unreachable objects and reflogs were not scanned, and neither were `node_modules` or the sibling repositories. Process environment variables were not searched. The local `.env.local` does contain a `METERLESS_RUNTIME_TOKEN` entry, which the app ignores; do not zip or share this folder as is.

**Clean-checkout reproducibility.** A fresh `git clone` of the local repository (which includes the unpushed commits) into an empty directory, leaving the working copy untouched:
- `npm ci` (0 vulnerabilities reported), `npm run build` and `npm run typecheck` passed. The built bundle file names are identical to the working copy's.
- `npm test`: 44 of 44. `python tests/test-zetaris.py`: 7 of 7.
- `npm start` with no credentials and no sibling checkouts: fixture investigations of FE-101 and FE-104 returned findings `F-routing` and `F-unknown`. The status reported H-MEM, Zetaris and the explanation as not configured. Requesting an explanation returned an unavailable narrative with findings intact. Selecting Zetaris failed with HTTP 503 and no fallback.
- `npm run demo:loop` (**Mock runtime - scripted responses**): FE-102 accepted, FE-101 revised, FE-103 returned, FE-104 revised.
- Limits: Windows 11, Node v24.21.0 and Python 3.11.9 only. `npm ci` finished in about 2 s, which suggests the local package cache was used, so a cold registry download was not independently verified. The browser UI was not re-driven in the clone; the HTTP API was.

## Pre-recording Zetaris verification (2026-10-23)

Verification only; no code, database object or configuration was changed. Existing configuration was used and no credential, key or connection detail was printed.

| Step | Time (UTC) | Result |
|---|---|---|
| Official read-only preflight (`getting-started/scripts/preflight.py`) | 2026-10-23 07:36 | **READY.** Environment file found; the API key, username, password and user agent are present (presence only, never printed). REST datasources call: HTTP 200, 0 listed. REST `SELECT 1`: pass. Informational: Lightning databases `NY_TAXI` and `TPCDS_DB`; no USL namespaces. |
| App adapter, live, case FE-101 (`loadZetarisDataset`, the existing fixed read-only join) | 2026-10-23 07:38 | **Pass**, 23.3 s. Returned 1 case (FE-101), 3 events (E-101, E-102, E-103) and 4 rules (R-01 to R-04), snapshot 22 Oct 2026 12:00 UTC. Every returned row is deep-equal to the synthetic fixture; the adapter also enforces the exact match itself. |
| Browser, real server, source set to Zetaris, FE-101, explanation not requested | about 07:40 | **Pass**, 22.3 s wait. Label "Zetaris read-only join of synthetic snapshots" with the 22 Oct 12:00 UTC snapshot; finding "The finance handoff failed" citing E-102, E-103 and R-02; timeline E-101 to E-103; rules R-01 to R-04. Screenshot in the ignored `artifacts/zetaris-live-fe101.png`. |

Source: the existing local Zetaris REST instance named in the project's ignored configuration, through the official Python REST helper.

Limitations:
- **One run, one case.** FE-102 to FE-104 were not run live this session, and the run is a point-in-time check on 2026-10-23.
- **Not a registered-source integration.** The instance lists no registered datasources. The adapter sends the three checked-in synthetic snapshots as inline SQL literals in one fixed read-only join and requires the same rows back. This verifies the REST channel and the join, not federation over registered data.
- **Read-only evidence.** The preflight and the adapter make no writes or schema changes by design; this run did not independently audit the instance for changes.
- **Pre-existing component.** The Zetaris adapter is part of the declared pre-existing prototype and was not modified in the window.
- Elapsed times are wall-clock from this machine and include process start-up.
- The explanation (Nightshift) was deliberately not requested in this check.

## Demo recording (2026-10-23)

Recording and verification only; no application code was changed.

**Setup.** Two separate browser windows against two local servers: the live app, and the labelled mock demo (**Mock runtime - scripted responses**). Only page content was captured (no address bar, terminals, environment files or account pages). One unrecorded rehearsal followed the script first.

**Rehearsal (not recorded, about 08:00 UTC).** Live Zetaris join 22.8 s. The H-MEM save was de-duplicated. Live Nightshift on FE-101 was accepted on the first draft after 65.0 s. The mock window showed FE-101 revised and FE-103 returned.

**Recorded take (about 08:04-08:08 UTC), live results read from the page:**

| Segment | Result |
|---|---|
| Zetaris (live) | Source label "Zetaris read-only join of synthetic snapshots". FE-101 returned 3 events and 4 rules with the finding "The finance handoff failed" in 22.4 s. |
| H-MEM (live) | One note recalled (`mem-1`). Saving the identical text again left a single `mem-1`; no duplicate was created. |
| Nightshift (live) | **Accepted after one revision**, 90.2 s, two completions. The first draft failed the first check (valid JSON with a bounded summary and citations), so the other five were not run. The revision passed all six. Model reported by the runtime: `nvidia/nemotron-3.5-lightning-30b-a3b`. The summary cited E-102, E-103, R-02 and R-04. |
| Mock (scripted) | FE-101 accepted after one revision; FE-103 not accepted, with the fixed reason and no model text. |

**New observation.** This is the first live observation of the revise path. It supersedes the earlier statements, in the sections above and in the earlier drafts, that a live revision had not been observed. A live return has still not been observed. There were three live Nightshift runs on 23 October: two accepted on the first draft (the API verification run and the unrecorded rehearsal) and one accepted after a revision (the recording). They are samples, not an accuracy claim.

**R-04 again.** The live summary cited R-04, a real rule that belongs to a different scenario (insufficient evidence). It passed the checks because the critic verifies existence and coverage, not relevance. The video says so.

**Video.** `artifacts/flowexplain-demo.mp4`, 3:51, 1280 by 840, captions burned in with an `.srt` and a narration transcript alongside. The voice is a synthetic Windows voice (Microsoft Zira) reading text generated from the take's results, so it should be disclosed or replaced with a human voice. Live waits were shown with an on-screen timer; the Nightshift wait was trimmed and marked on screen ("WAIT TRIMMED: 77 s removed (of 90 s)"). The mock segment has a full-screen "Mock runtime - scripted responses" card and a persistent label. The recording is local and ignored by git; it has not been uploaded.

Limitations:
- One recorded take. The Nightshift outcome differed between the rehearsal and the take, as expected from a live model.
- The live app window displays the previous result while a new request runs, so during the Nightshift wait the screen still shows the earlier Zetaris label. This is real application behaviour.
- Audio quality and pacing were not reviewed by a person; the frame checks were done by sampling, not by watching the whole video.
- Spoken figures (the durations and the trimmed seconds) were computed from the take's data, and the outcome and check results were asserted against it before the narration was built.
