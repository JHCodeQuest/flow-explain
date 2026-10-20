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
| `NVIDIA_API_KEY` | From the shared secret file or process environment; optional |
| `NVIDIA_MODEL` | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| `NVIDIA_BASE_URL` | Official `https://integrate.api.nvidia.com/v1` endpoint only |

The shared file's Zetaris settings are read only by the Python adapter: `ZETARIS_API_KEY`, numeric `ZETARIS_ORG_ID`, and loopback `ZETARIS_REST_URL` ending in `/api/v1.0`. Runtime credentials never reach the frontend. UI connection labels mean configured, not verified.

## The three layers

- **Zetaris:** selecting the Zetaris source runs a read-only CTE join of the three checked-in synthetic snapshots. The snapshot records are serialized into SQL literals; they are not registered production data sources. Returned rows must exactly match the supplied snapshot. There are no platform writes, schema changes, arbitrary SQL inputs or silent fallbacks. Run the official Zetaris preflight before using this mode.
- **H-MEM:** analyst notes use the actual Meterless `MemoryStoreService`, retrieval and trust ledger. The separate local store preserves source-case and correction provenance. Matching notes survive restarts and remain labelled unverified advice. Identical notes reuse their memory ID. No general notebook or other-app memories are imported.
- **NVIDIA:** check **Add NVIDIA explanation** and investigate to send the selected synthetic evidence and relevant bounded analyst notes to the hosted development endpoint. It is opt-in per investigation and subject to account limits. The model has no tools and cannot modify workflows. Unknown citations or invalid responses are rejected; deterministic findings remain visible. Even valid citations do not prove every sentence is correct. Treat wording as advisory.

## Demo journey

1. Investigate FE-101 with local fixtures. Follow E-102, E-103 and R-02. The manager already approved; the finance assignment failed.
2. Add a synthetic analyst note such as “Inspect the routing event before assuming a missing finance task means manager approval is still pending.” Reinvestigate to see it recalled separately from evidence. Current findings do not change.
3. Investigate FE-102 and FE-103 to see different evidence-driven diagnoses. FE-104 intentionally refuses to name a cause.
4. Select Zetaris to verify the snapshot join, then optionally request the cited NVIDIA wording. No live Power Platform tenant is connected.

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
