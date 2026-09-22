# Hackathon log

- **Project:** RoomReady
- **Event:** Convex All Gas Hackathon
- **What it does:** A collaborative moving-home planner with a room-based 3D workspace, shared tasks, cost estimates and enquiry drafts; external research, planning and email integrations await activation.
- **Live app:** https://wonderful-vulture-63.convex.site
- **Repo:** https://github.com/C-Icaro/roomready
- **Frontend:** Convex static hosting
- **Convex deployment:** https://wonderful-vulture-63.convex.cloud
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, actions, scheduled functions, realtime queries
- **Auth:** Other (UUIDv4 capability links; anyone with a link can edit that home)
- **AI models:** gpt-4.1-mini (configured default; not exercised live yet)
- **Started:** 2026-09-22T04:10:13Z
- **Last updated:** 2026-09-22T16:10:43Z

## Log

### 2026-09-22 - 9737dfa

Published the first functional RoomReady app on Convex static hosting. Households can create and edit room tasks, assign work, update cost estimates and share live progress in an original procedural apartment with scroll-driven camera views (`src/App.tsx`, `src/components/HomeScene.tsx`, `src/components/apartment-model.ts`). Convex stores homes, tasks, sources, messages, activity and jobs (`convex/schema.ts`, `convex/homes.ts`).

Implemented provider actions for Firecrawl search/scrape, OpenAI structured suggestions and AgentMail review-before-send plus inbox polling (`convex/providers.ts`). External services remain disabled pending verified access. Unit fixtures are not evidence of live integrations.

Seventeen backend tests cover access boundaries, validation, job handling and provider parsing. Seven browser scenarios passed against the first public deployment: six in the initial run and the remaining scenario on a targeted rerun after correcting an immediate-checkbox test assumption. They cover task editing, budget updates, two-session sync, persistence, home-link isolation, room selection, mobile drafts, provider-disabled errors, reduced motion and WebGL fallback (`tests/backend.test.ts`, `tests/workspace.e2e.ts`).

The first meaningful commit is [9737dfac4f8226acf50713f3f18bc0eafd99690c](https://github.com/C-Icaro/roomready/commit/9737dfac4f8226acf50713f3f18bc0eafd99690c), committed at 2026-09-22T04:10:13Z. [CI run 35685864867](https://github.com/C-Icaro/roomready/actions/runs/35685864867) passed; the implementation is in [PR #1](https://github.com/C-Icaro/roomready/pull/1). Later working-tree changes are not covered by that CI result until rechecked.

Installed and enabled the official full Convex Codex plugin 1.10.0. Native desktop MCP tool names are not exposed in this session; development and deployment used the official CLI and documentation. Registered the static hosting component in `convex/convex.config.ts` and its routes in `convex/http.ts`.

OpenAI, Firecrawl and AgentMail remain inactive in the public deployment. No live sponsor request, email round trip, demo-video link, social-post link or submission receipt is recorded. The public app and repository are available; the full hackathon submission is not ready yet.

### 2026-09-22 - working tree

Verified a real read-only `status` call through the official Convex MCP server bundled with `convex@1.46.0`, using stdio, at 2026-09-22T04:23:46.860Z. Initialization, tool discovery and the status response succeeded for the development deployment. This establishes an MCP invocation separately from the full plugin installation; it does not establish sponsor API execution or use of every plugin feature.

At this pre-publication checkpoint, the working tree added guided room context, modal focus restoration and further validation. That local run passed 22 unit tests (20 backend and two date tests), ten browser scenarios in 52.0 seconds, lint, typecheck and build. Publication and public regression checks followed in 1855493 below; those checks do not belong to 9737dfa.

### 2026-09-22 - 1855493

Published room-guided scroll: the kitchen and bedroom views reveal their next task and keep that room selected when opening the plan. Improved task feedback with optimistic updates and explicit completion values. Corrected calendar-day countdowns, accessible names, modal focus restoration and low-contrast text (`src/App.tsx`, `src/components/HomeScene.tsx`, `src/components/Modal.tsx`, `src/styles.css`).

Hardened provider boundaries with a task-record limit and bounded streaming response consumption. Twenty backend tests and two date tests pass; provider responses remain controlled fixtures. Ten E2E scenarios passed together against the public app in 47.4 seconds, including two-session persistence, scroll context, accessibility and 320px task creation. These are technical checks, not validation with users.

[Source CI passed](https://github.com/C-Icaro/roomready/actions/runs/35686978802). PR #1 merged as 5292f0769a05ceb5b769ba23e55cb3a6430abcd2 with an identical source tree, and [main CI passed](https://github.com/C-Icaro/roomready/actions/runs/35687154455). At this checkpoint, public `build-info.json` reported 185549392a14bdacb49fbabc0401e1551c69d7eb and dirty=false. External sponsor actions remained disabled.

### 2026-09-22 - ab69e3e

Added a single bounded retry for AgentMail inbox GET responses with status 502, 503 or 504, sharing one 25-second deadline. Sends, authentication failures, quota failures and ambiguous network outcomes are not retried (`convex/providers.ts`). Thirty-five backend tests and two date tests pass; provider responses remain controlled fixtures, not live integration evidence.

Published [ab69e3e7b3683dd1e7a68d6ca4638d308a9af92b](https://github.com/C-Icaro/roomready/commit/ab69e3e7b3683dd1e7a68d6ca4638d308a9af92b) at 2026-09-22T04:50:34.961Z with dirty=false. [CI passed](https://github.com/C-Icaro/roomready/actions/runs/35688402086), and all ten browser scenarios passed on the public deployment in 51.8 seconds. The frontend matches 1855493; an experimental shadow cache did not meet its desktop CPU criterion and was reverted. The existing scene performance measurements retain their original source attribution in `submission/validation.json`.

The app and repository are public. Real sponsor calls, a complete sponsor demonstration, social publication and the final entry remain unverified. No submission-ready claim is made.

### 2026-09-22 - 6fd63e0

A home with 50 saved sources now rejects a new research URL or search before contacting Firecrawl, while an existing URL can still be refreshed. The final transaction counts actual writes, so a concurrent capacity change cannot produce a false saved result (`convex/providers.ts`, `tests/backend.adversarial.test.ts`). Provider limits and error cases use controlled fixtures, not live API calls.

Published [6fd63e0d043f3a799ff1adb7022f75b5cc0e6d52](https://github.com/C-Icaro/roomready/commit/6fd63e0d043f3a799ff1adb7022f75b5cc0e6d52) with dirty=false at 2026-09-22T05:03:11.42Z. [CI passed](https://github.com/C-Icaro/roomready/actions/runs/35689190165): lint, typecheck, build and 42 unit tests (40 backend, two calendar-date tests). All ten browser scenarios passed together on this public deployment in 53.1 seconds. Gitleaks found no secrets in the exported tracked source tree; the historical fixture findings remain disclosed in `submission/validation.json`.

Published the [real 90-second core preview](https://github.com/C-Icaro/roomready/releases/tag/core-preview-2026-09-22), filmed on ab69e3e. It shows the procedural scene, task/estimate editing, persistence and continuous two-session Convex synchronization using labelled synthetic data. The public MP4 download hash matches the reviewed file. `submission/media/core-preview.json` records exact provenance. Frontend source and production asset hashes are unchanged in 6fd63e0; the later source-capacity correction is backend-only and is not claimed to have been filmed.

The video explicitly states that live OpenAI, Firecrawl and AgentMail verification remains pending. This is a core preview, not a complete sponsor demonstration or a claim of submission readiness. Social publication, personal eligibility declarations and a submission receipt are still absent.

### 2026-09-22 - working tree

Published the [build announcement on X](https://x.com/Cicaro_/status/2102429886644380115) with the public app URL and the four official sponsor mentions. The post explicitly says that live sponsor verification is pending. No engagement, adoption or live API success is claimed.

Reopened the actual event submission form before its deadline and filled the verified product links and description. The entry is not confirmed: required profile/declaration details and the image upload remain unresolved. There is no submission receipt. Public app source6fd63e0 and the previously verified video are unchanged.
