# Implementation plan and verification

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
| AC-06 | Met within tested viewport | Browser exercised case selection, investigation, keyboard submission, keyboard citation focus, note save/recall and unknown evidence. Narrow in-app viewport visually inspected. Safe textContent rendering reviewed; exact 390px and other browser/viewport combinations were not separately tested. |
| AC-07 | Met for local prototype | HTTP tests reject absent/wrong tokens, cross-origin/invalid Host, malformed modes, unknown cases, oversized bodies and private/static traversal paths before protected access. Independent review inspected actual code/configuration. Multi-user/tenant authorization is excluded. |

Final automated checks: `npm test` passed 14/14 Node tests; `python tests/test-zetaris.py` passed 7/7; `npm run build` passed strict TypeScript checking and Vite build. Dependency audit reported zero vulnerabilities at installation. No lint script is configured. Node's experimental transform warning and npm's existing user-config warning do not fail these commands.

## Defects reproduced and resolved

- Source input array coercion: HTTP regression initially accepted `["fixture"]`; explicit string validation now rejects it before integration access.
- Model citation gaps: note IDs and invented inline IDs could pass the original validation. Regressions failed before fixes; strict evidence-only and inline validation now pass. Live invalid citation responses prompted an explicit allowed-ID list and removal of note identifiers from model context. Strict response validation was retained.
- Zetaris numeric transport: actual REST rows represented `limitHours` as a string. A regression reproduced rejection of otherwise identical rows. Only canonical bounded integer strings in that schema column are normalized; complete row identity checks remain mandatory. Invalid formats and altered evidence still fail.
- Review identified assertions swallowed by a provider mock's error handler; request assertions now run outside that handler and the full suite passes.

Independent reviews found no remaining blocker in the reviewed local scope after these fixes. This is an AI-assisted review, not a security guarantee or release authorization.

## Remaining limits

Synthetic snapshots are not registered production sources or a live Power Platform tenant. NVIDIA wording is advisory; valid IDs cannot prove every sentence. Provider output may still be rejected safely. H-MEM reference persistence supports one local process, not concurrent production use. Only the available in-app browser viewport was manually checked. No public host, deployment, tenant authentication, real customer data or workflow remediation is included.
