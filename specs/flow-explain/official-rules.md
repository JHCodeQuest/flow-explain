# Official rules check (Open Agent Hackathon 2026)

Read on 2026-10-23 at about 07:25 UTC. This is a paraphrase for planning, not a legal reading; the event page is the authority.

## Source and method
- Page: https://hackathon.genai.works/event/open-agent-hackathon-2026 (sections: `#dates`, `#tracks`, `#rules`, `#faq`). Public, no sign-in needed.
- Method: a throwaway Chrome driven over the DevTools protocol. The ten "Official rules" accordions and four FAQ items were expanded by clicking their toggles. Captured text: 12,708 characters, SHA-256 prefix `b78cc58c9ad71e0c`.
- Not read: the "What happens after I click Register?" FAQ item (its toggle appeared to redirect to a Google sign-in page; nothing was entered and no account was created), the sign-up terms, the content policy (https://hackathon.genai.works/policy/content), and Discord.
- **Access blocker:** the Submission Hub form is behind sign-in (https://hackathon.genai.works/sign-in). Its field list beyond the earlier screenshot (track, 2,000-character description, video link or upload of up to 4 minutes) could not be read, and no sign-in was attempted.
- Questions go to hackathons@genai.works (rule 10.3).

## Binding rules versus guidance
The numbered "Official rules" section is treated as binding. The About text, track blurbs and FAQ are guidance; where they differ from a numbered rule, the numbered rule wins.

| Topic | Source | Status | What it says |
|---|---|---|---|
| Deadline and timezone | Rule 4.1, 4.3; key dates | Binding | Build window 22 Oct 2026 00:00 UTC to 27 Oct 2026 23:45 UTC. Time zones do not extend it. Registration also closes at 27 Oct 23:45 UTC. Judging opens 27 Oct 00:00 UTC; results 6 Nov 16:00 UTC. |
| Pre-existing work | Rule 4.2, 5.4 | Binding | Work committed before the window is not eligible except clearly declared pre-existing components. Pre-existing product code must be declared in the submission form. Open-source libraries are fine. |
| Wildcard treatment | Track blurb (not a numbered rule); rule 3.1, 8.2 | Guidance, plus bonus-track existence in the rules | Bring an existing project and extend it. Judged on the same criteria, must integrate Zetaris and Meterless, and scored on the new work rather than prior development. The numbered rules do not repeat the scoring statement. |
| Track choice | Rule 3.2, 3.3 | Binding | Exactly one primary track. It can be changed any time before the deadline from the team workspace. |
| Sponsor integrations | Rule 5.1 | Binding | Every submission must integrate Zetaris and Meterless, and **teams must use Cursor for development**. |
| NVIDIA | Rule 5.2; prize 8.3 | Binding / prize | Integrate NVIDIA where it contributes. In-kind prize for best use of NVIDIA Nemotron. NVIDIA is not stated as mandatory. |
| Video | Rule 6.1 | Binding | 1 to 4 minutes. Shows the main workflow, how the agent solves the selected challenge, key features, and how Zetaris and Meterless are integrated. |
| Slide deck | Rule 6.2 | Binding | Required: problem and users, solution, agent workflow or architecture, technical stack, how Zetaris and Meterless were used and what was unique, product visuals, future enhancements. |
| Repository | Rule 6.3 | Binding | A GitHub repository with all source code and a README covering setup, usage and dependencies (Colab links if used). Visibility is not stated. |
| Written explanation | Rule 6.4 | Binding | How Zetaris and Meterless were integrated, how Cursor was used during development, where NVIDIA contributes, and what was unique about the sponsor-tech use. |
| License | Rule 9.1-9.3 | Binding | You keep all rights. Submitting grants the organizer a license to show your demo, screenshots and description in event coverage, and sponsor-track submissions grant the sponsor the same non-exclusive promotional license. No open-source license is required. |
| Teams and eligibility | Rule 1.1-1.3, 2.1-2.3 | Binding | Age 16 or older; one account per person; 1 to 5 people; team composition locks when the first submission is created. |
| Judging | Rule 7.1-7.3 | Binding | Impact 30, Technical 20, Innovation 15, Demo 15, Product & UX 10, Sponsor tech 10. At least three judges. Ties go to Impact, then submission time. |
| Generated code, models | Rule 5.3, 5.5; FAQ | Binding / guidance | Any language, model or cloud, closed-source APIs allowed. Generated code is allowed; you are accountable for it. FAQ: declare anything pre-existing so judges see what was built in the window. |

## Commit timing against the window
Commit offsets are +01:00. `7feb021` (20 Oct 09:42 UTC) is before the window and is the declared pre-existing prototype. `a5b92d1` (22 Oct 17:51 UTC) onwards is inside the window. The window and deadline countdown on the page matched the computed time remaining (4 days 16 hours 18 minutes at 07:27 UTC on 23 Oct).

## Later announcement conflicting with rules 5.1 and 6.4
The project owner reports that the organizer later announced Cursor is optional and Claude Code is allowed. That announcement has not been seen by this record and its link and date are not recorded. It conflicts with the published rules 5.1 and 6.4 as read on 2026-10-23. Both are recorded; the conflict is not resolved here, and the submission materials do not claim Cursor use. Add the announcement link before relying on it.

## Discrepancies found on the first comparison, and their status
Status as of the submission-materials update (2026-10-23).
1. **Cursor (5.1, 6.4):** open conflict, recorded above. The materials state that the prototype received Codex assistance and that work in the window used Claude Code, and do not claim Cursor.
2. **Video script (6.1):** addressed. Zetaris and Meterless (H-MEM and Nightshift) are now separate, explained segments.
3. **Slide deck (6.2):** outline drafted in `submission.md`; deck not built.
4. **Written explanation (6.4):** drafted in `submission.md`.
5. **Pre-existing declaration (5.4):** form-ready text drafted in `submission.md`; it still has to be entered in the form, which has not been read.
6. **License:** addressed. No license is required by the rules. On 23 October 2026, the project owner selected MIT; the root `LICENSE` file records it. This local change has not been pushed.
7. **Stale rules note:** removed from `submission.md`.
8. **Wildcard scoring wording:** unchanged risk. Zetaris and H-MEM are pre-existing and unmodified, so the new sponsor-tech work is Nightshift and the loop. The track can be changed until the deadline (rule 3.3).
9. **Deadline:** added to `submission.md`: 27 October 2026, 23:45 UTC.
