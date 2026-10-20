# FlowExplain local prototype

## Problem and audience
A support analyst needs to explain why an approval stalled without guessing from its final status. Evidence is fragmented across case records, workflow events and process rules. This prototype demonstrates one synthetic purchase-approval process, not a live Power Platform connection.

## Scope and observable requirements
- AC-01: A case list and investigation show cited findings, a chronological timeline and a recommended next check. Three known scenarios cover a destination error, overdue approval and missing required input. An incomplete case is explicitly unknown.
- AC-02: Deterministic rules establish findings from events and policy records. A completed manager approval must not be blamed for a later routing failure. Reported status alone is not proof of root cause. Every finding references existing event/rule IDs.
- AC-03: Local fixture mode is usable offline. Selecting Zetaris sends a fixed read-only join over the three synthetic snapshot collections through the approved Python REST channel. Label this as synthetic snapshots, not registered production data sources. Failure is visible and never silently falls back. No database writes, schema changes, new source registration or arbitrary SQL.
- AC-04: H-MEM stores analyst corrections with explicit provenance, recalls matching scenario lessons across sessions, and shows them separately from evidence. Corrections are bounded inputs, never override deterministic findings, and are labelled analyst notes rather than verified facts. Use a separate ignored store; no private/general notebook memories.
- AC-05: An opt-in NVIDIA explanation receives only the selected synthetic investigation and bounded relevant synthetic analyst notes. Return no unvalidated citations. Provider failure retains the deterministic result and exposes a safe status. Keys are server-side and never returned, logged, committed or bundled.
- AC-06: Local-only UI is responsive and keyboard usable. No unsafe rendering of notes or model output. Case selection, investigation, citations, correction save and retrieval work in the intended browser. Loading, empty and error states are explicit.
- AC-07: Server binds loopback, rejects invalid Host/Origin, requires a session capability token on API operations, validates bodies/case IDs/modes and caps sizes. Reject unauthorized mutations before memory/model/source access. Static serving cannot expose env/source files or traverse paths. No user/tenant authentication or production deployment is provided.

## Inputs, outputs and decisions
Inputs: checked-in synthetic fixture collections; selected case ID; source=fixture|zetaris; explain boolean; bounded analyst correction. Output: case, findings, timeline, cited rules, lessons with memory IDs, source status, optional provider narrative. Current evidence outranks memory. Time comes from a deterministic snapshot timestamp displayed in the UI, not the user's wall clock. One local process writes memory.

## Exclusions and permissions
No real customer/employee data, tenant connections, OAuth, flow execution, messages, automated remediation, external publication or spend upgrades. No external marketing claims. Existing setup repositories are read-only dependencies. API generation is explicitly requested per investigation. Secrets remain in existing ignored local configuration.

## Validation
Node tests cover rules, citations, unknowns, memory filtering, provider response failures and invalid inputs. Python tests cover read-only query generation, quoting, auth/error suppression and proxy/redirect policy. HTTP tests cover session token, origin/host, invalid IDs/bodies and static traversal. Review safe DOM rendering and inspect the actual UI in addition to typecheck/build. Verify live H-MEM, Zetaris snapshot join and one NVIDIA response using synthetic inputs only. Review actual code and local configuration before claiming the milestone complete. No release is authorized.
