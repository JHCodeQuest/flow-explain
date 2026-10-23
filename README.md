# FlowExplain

A local prototype for support analysts investigating synthetic purchase approvals. It connects case records, event history and process rules to explain a stalled step with citations. The evidence engine, not the language model, establishes the findings. Analyst notes are separate advice and cannot override current evidence.

## Run locally

Requirements: Node 24+. Python 3 and the existing official Meterless and Zetaris getting-started checkouts enable the optional integrations. Install development dependencies with `npm ci`, then run:

```powershell
npm run build
npm start
```

Open the printed loopback URL, normally `http://127.0.0.1:4317`. Choose a case and select **Investigate case**. Local fixtures work without network access. The demo clock is the labelled snapshot time, not the current time. The four cases cover routing failure, overdue approval, missing required input and insufficient evidence.

## Configuration

The app works with the sibling checkout layout used during setup. To change it, copy `.env.example` to ignored `.env.local` and edit the paths. Relative paths are resolved from this project directory. `FLOW_ENV_FILE` points to your existing ignored secret file; no credentials need to be copied into this project. Do not put secrets in `VITE_*` variables, browser storage, source or chat.

| Name | Default / purpose |
|---|---|
| `FLOW_ENV_FILE` | `../getting-started/.env.local`, existing server-side credentials |
| `METERLESS_REPO` | `../meterless`, official H-MEM reference source |
| `ZETARIS_REPO` | `../getting-started`, official Python REST helper |
| `FLOW_PORT` | `4317`, loopback HTTP port |
| `FLOW_MEMORY_DIR` | `.flow-explain/memory`, ignored analyst-note store |
| `PYTHON_BIN` | `python` on Windows, `python3` elsewhere |
| `FLOW_EXPLAIN_PROVIDER` | `meterless` (default) or `nvidia`; the only provider used, with no fallback |
| `METERLESS_BASE_URL` | `http://127.0.0.1:8088/v1`; loopback Nightshift runtime only; `/v1`, `/v1/chat/completions` and `/healthz` suffixes are normalised |
| `METERLESS_RUNTIME_TOKEN` | Runtime bearer token from the shared secret file or process environment; `rt-local` and template placeholders are ignored |
| `METERLESS_MODEL` | `meterless/auto` |
| `NVIDIA_API_KEY` | Only for `FLOW_EXPLAIN_PROVIDER=nvidia`; from the shared secret file or process environment |
| `NVIDIA_MODEL` | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| `NVIDIA_BASE_URL` | Official `https://integrate.api.nvidia.com/v1` endpoint only |

`METERLESS_*` and `NVIDIA_*` values are read only from the shared file or the process environment, never from this project's `.env.local`, so placeholders there cannot override working settings. The shared file's Zetaris settings are read only by the Python adapter: `ZETARIS_API_KEY`, numeric `ZETARIS_ORG_ID`, and loopback `ZETARIS_REST_URL` ending in `/api/v1.0`. Runtime credentials never reach the frontend. UI connection labels mean configured, not verified.

## The three layers

- **Zetaris:** selecting the Zetaris source runs a read-only CTE join of the three checked-in synthetic snapshots. The snapshot records are serialized into SQL literals; they are not registered production data sources. Returned rows must exactly match the supplied snapshot. There are no platform writes, schema changes, arbitrary SQL inputs or silent fallbacks. Run the official Zetaris preflight before using this mode.
- **H-MEM:** analyst notes use the actual Meterless `MemoryStoreService`, retrieval and trust ledger. The separate local store preserves source-case and correction provenance. Matching notes survive restarts and remain labelled unverified advice. Identical notes reuse their memory ID. No general notebook or other-app memories are imported.
- **Meterless Nightshift:** check **Add Meterless Nightshift explanation** and investigate to send the selected synthetic evidence and relevant bounded analyst notes to the local Nightshift runtime (`POST /v1/chat/completions` with `Authorization: Bearer`, `meterless-app: flow-explain`, `meterless-scope: user`, `meterless/auto`). Before generating, the server checks authenticated `GET /v1/models`: 401/403 reports a rejected token, anything else unreachable reports the runtime as not reachable, and no generation is attempted. The requested budget is 4096 tokens because the routed model still reasons and returned an empty reply at 32 and 512; a result names the model that actually answered. A routed model may itself be a hosted one, so the runtime's own routing and privacy settings apply. `FLOW_EXPLAIN_PROVIDER=nvidia` instead selects the older direct NVIDIA adapter (hosted development endpoint); there is no automatic fallback between the two. Explanations are opt-in per investigation and subject to account limits. The model has no tools and cannot modify workflows. Unknown citations or invalid responses are rejected; deterministic findings remain visible. Even valid citations do not prove every sentence is correct. Treat wording as advisory.

## Explanation review loop

When you request a provider explanation, the draft is checked before it is shown. A deterministic critic (no model call) runs: valid envelope, known citations, matching inline references, coverage of every evidence and rule ID the findings use, named contradictions of the findings (for example calling a completed manager approval pending), and no claimed remediation. Analyst notes take no part in the checks. These are structural, citation, coverage and named-contradiction checks. They do not prove the wording is factually correct.

- Pass on the first draft: **Accepted**.
- Content failure: one revision to the same provider, carrying only the previous draft as data and fixed failure codes. The same checks must pass again: **Accepted after one revision**.
- Second failure, or no time left: **Not accepted**. The deterministic findings are shown with a fixed reason. HTTP errors and timeouts are never revised.
- Limits: at most two completions and one Nightshift discovery per investigation. One 180 s budget starts when the explanation begins and covers Nightshift discovery, the draft and the revision (critic time is negligible). It does not include receiving the HTTP request or a Zetaris query run first (up to 120 s), so Zetaris plus an explanation can take longer than 180 s in total. A revision starts only if at least 20 s remain; an exhausted budget makes no further provider call and returns the deterministic findings with a fixed reason. Each call is aborted when the budget ends. 180 s is the previous single-call ceiling, now shared by the whole explanation, so a cold Nightshift model load that uses most of it can leave no time for a revision. The server's `requestTimeout` only limits receiving the request and does not bound this. No request fields were added.
- The Review panel shows only fixed-template check results. Failed drafts and any model reasoning are never returned. Findings are unchanged and analyst notes stay advisory and uncitable.

`npm run demo:loop` serves the real app against a scripted loopback runtime labelled **Mock runtime — scripted responses** (port 4318; FE-102 accepted, FE-101 and FE-104 revised, FE-103 not accepted). It needs `npm run build` first, uses no credentials and is not a live provider. There is no production demo-mode switch.

## Demo journey

1. Investigate FE-101 with local fixtures. Follow E-102, E-103 and R-02. The manager already approved; the finance assignment failed.
2. Add a synthetic analyst note such as “Inspect the routing event before assuming a missing finance task means manager approval is still pending.” Reinvestigate to see it recalled separately from evidence. Current findings do not change.
3. Investigate FE-102 and FE-103 to see different evidence-driven diagnoses. FE-104 intentionally refuses to name a cause.
4. Select Zetaris to verify the snapshot join, then optionally request the cited Nightshift wording. No live Power Platform tenant is connected.

## Pre-existing work versus hackathon work

Intended track: Wildcard [Tinkerer], which extends an existing project and is scored on the new work. The build window opened on 22 Oct 2026 according to the event page.

**Pre-existing prototype** (commit `7feb021`, 20 Oct 2026, before the window): the deterministic evidence engine and four synthetic scenarios, the loopback API and its security boundary, the read-only Zetaris snapshot join, H-MEM analyst notes, the direct NVIDIA explanation adapter (opt-in) and the interface.

**Development tooling:** the pre-existing prototype received Codex assistance; work in the window used Claude Code. Commit trailers are not a complete record of tooling.

**Hackathon work** (22-23 Oct 2026):
- Meterless Nightshift as the default explanation route, with authenticated discovery, explicit provider selection and no fallback (`a5b92d1`, `05b9724`, `42263c1`).
- The bounded draft, check and revise loop, the Review panel in the UI, the labelled mock-runtime demo and their tests (`a813a26` to `f5aea48`).
- Verification records and submission drafts (`specs/flow-explain/plan.md`, `specs/flow-explain/submission.md`).

**Pre-existing code that the new work changed:** `nvidia.ts` now uses the shared prompt and loop (so its drafts must also pass the checks), and the service, server entry and configuration were wired for the new provider. The evidence engine, H-MEM and Zetaris adapters and the fixture data were not modified.

## Run it offline (for judges)

No credentials, sponsor runtime or network is needed after installing dependencies. Live Nightshift, Zetaris and H-MEM need sponsor runtimes and are evidenced, with dates, in `specs/flow-explain/plan.md`.

```powershell
npm ci
npm run build
npm test                 # synthetic data and mocked providers only
npm start                # http://127.0.0.1:4317, local fixtures
npm run demo:loop        # http://127.0.0.1:4318, mock runtime (run build first)
```

- `npm start` works from fixtures. Without the sibling checkouts, H-MEM and Zetaris show as not configured and the explanation option is unavailable. Investigate FE-101 to FE-104 to see cited findings; FE-104 names no cause.
- `npm run demo:loop` is labelled **Mock runtime - scripted responses**. It is not a live model. Tick the explanation box and investigate: FE-102 is accepted on the first draft, FE-101 and FE-104 are accepted after one revision, and FE-103 is not accepted, which returns the deterministic findings with a fixed reason.
- The mock only demonstrates the loop's branches. It says nothing about live model quality.

## License

FlowExplain's original code and associated documentation are licensed under the [MIT License](LICENSE). Third-party components retain their own licenses.

## Checks and limits

```powershell
npm test
python tests/test-zetaris.py
npm run typecheck
npm run build
```

HTTP tests bind temporary loopback ports and require local network permission. Tests use synthetic fixtures and mock paid services. Browser checks and live integration results are recorded in `specs/flow-explain/plan.md`. Node may print an experimental TypeScript-transform warning.

This is a single-user, single-process, loopback-only prototype. Its ephemeral session token and Host/Origin checks protect local operations; they are not production account, ownership or tenant authorization. Run one process against a memory store. H-MEM's reference persistence is not a concurrent database. No auto-remediation, messaging, uploads, tenant credentials, live Power Platform access or public hosting is included. Keep private data out of analyst notes and hosted requests.

Vite, TypeScript and Node types are development dependencies. Node/Python built-ins provide the runtime; H-MEM is loaded from the configured official checkout. The app has not been deployed or submitted to the hackathon.
