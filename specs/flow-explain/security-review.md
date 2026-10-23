# Release security review (2026-10-23)

Scope: what would be **pushed** (the 17 unpushed commits on `main`, the whole history) and what would be **uploaded** (the demo video, the deck, and supporting files). Nothing was pushed, uploaded or changed on GitHub. Two read-only GitHub queries were made (repository details and the remote `main` hash). This is an AI-assisted review of this repository and these files, not an independent audit or a security guarantee.

**Verdict.** No blocking security finding. Before pushing, three decisions are yours (public visibility and license, the commit identity, and which files to upload); they are listed at the end.

## Results

| Area | Check | Evidence | Result |
|---|---|---|---|
| Secrets in history | gitleaks 8.30.1, all refs | 18 commits, no findings | Pass |
| Secrets in history | Exact-value search for the 6 secret-like values in the project and sibling environment files, plus the commit email | 18 commits, tracked files: no matches | Pass |
| Secrets in uploads | Same values searched in 34 artifact files, including inside the deck's zip members and the video's bytes | No matches | Pass |
| Personal paths and data | Search of tracked files and commit messages for local paths, usernames, emails | Only the organizer's public contact address and a synthetic test URL | Pass |
| Metadata | Video tags; deck document properties | Video: encoder tag only. Deck: creator is the export tool; no person, path or hyperlink | Pass |
| On-screen content | Frames every 5 s across the whole video (46 frames), and all six deck slides | App UI and cards only; no terminal, address bar, environment file or account page | Pass, with limits below |
| Dependencies | `npm audit` (all and production) | 0 vulnerabilities; 0 runtime dependencies; dev only: Vite, TypeScript, Node types | Pass |
| Supply chain | Lockfile | Every locked package has an integrity hash; no install scripts in the project; the only one in the tree is `fsevents`, an optional macOS dev dependency | Pass |
| Code patterns | Search for `eval`, `new Function`, `innerHTML`, CORS headers | None | Pass |
| Process execution | One `execFile` (Zetaris helper) | No shell; fixed script and arguments; minimal environment with no secrets; input over stdin; REST target forced to loopback with proxies and redirects disabled; result must equal the supplied snapshot | Pass |
| Network exposure | Every `listen` call | All bind to 127.0.0.1, including the demo and test servers | Pass |
| Logging | Search for console output in source | No secret values; fixed messages only | Pass |
| Final build | `npm test`, Python tests, build | 44 of 44, 7 of 7, build OK | Pass |
| Live boundary probe | Real server, 13 requests, no provider calls | No token or wrong token: 401. Cross-origin, cross-site and bad Host: 403. `.env.local`, source files and encoded traversal: 404. Oversize body: 413. Wrong content type: 415. Unknown field and injection-style value: 400. Valid request: 200. Headers present: CSP (default-src 'self', frame-ancestors 'none'), nosniff, no-referrer, CORP same-origin, no-store | Pass |

## Findings and recommendations

1. **The destination repository is public (decision).** `JHCodeQuest/flow-explain` already exists, is public, and its `main` is the pre-existing prototype `7feb021`. Pushing publishes all 17 commits and the spec, plan, submission and deck-source documents immediately. It has no license, so by default all rights are reserved. Decide the license and confirm you want these documents public before pushing.
2. **Commit identity (low).** Every commit carries your personal Gmail address in its metadata. The same identity is already on the public `7feb021`, so pushing adds no new exposure of that address. To avoid it on future commits, use your GitHub noreply address. Rewriting history is not recommended, since `7feb021` is already public.
3. **Broad GitHub token on this machine (low, not a repository issue).** The signed-in GitHub token has very wide scopes, including organization admin and repository deletion. Prefer a fine-scoped token for pushes and any automation.
4. **Do not share the project folder or `artifacts/` as is (informational).** The ignored `.env.local` holds a `METERLESS_RUNTIME_TOKEN` entry (the app ignores it, and no commit has ever contained it). `artifacts/` holds account and setup screenshots, a screenshot showing a runtime port, and helper scripts that read the shared environment file. None is tracked by git; do not zip or upload those locations.
5. **Optional macOS install script (informational).** `fsevents` has an install script; it is optional, macOS-only and a dev dependency.
6. **Local-prototype limits remain.** One user, one process, loopback only, session token and Host/Origin checks; not production authentication or tenant authorization. This is documented in the README.

## Limits of this review
- The secret checks are pattern and exact-value matching. They cannot find encoded, truncated or derived secrets, values not present in the three environment files, or secrets only in the process environment or another store.
- Pixel content was reviewed by sampling: frames every 5 seconds at thumbnail size, so small text or a single-frame flash could be missed. The audio is synthetic speech generated from reviewed text; it was not listened to.
- Unreachable git objects and reflogs were not scanned.
- The server probe covered the final local build only, not a deployed host. No provider endpoint was called.
- Licenses of dev dependencies were not audited.

## Upload set (recommended)
Upload only: `artifacts/flowexplain-demo.mp4`, optionally `flowexplain-demo.srt` and `flowexplain-demo-narration.md`, and `artifacts/deck-output/FlowExplain-hackathon-v3.pptx`. The video uses a synthetic voice (Microsoft Zira); disclose it where the event allows. Do not upload `flowexplain-demo-take.json` (not needed), the other screenshots, `deck-build/`, or the folder itself.

## Decisions before pushing or uploading
1. License: resolved on 23 October 2026. The project owner selected MIT, added locally in the root `LICENSE`. The earlier findings above describe the review-time state. Publishing approval remains separate.
2. Publish the 17 commits and all documents to the public repository now, or review them first.
3. Commit identity going forward (personal address or GitHub noreply).
4. Confirm the upload set above.
