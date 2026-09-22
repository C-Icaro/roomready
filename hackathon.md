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
- **Last updated:** 2026-09-22T04:23:46.860Z

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

The current working tree adds guided room context, modal focus restoration and further validation. The latest local run passed 22 unit tests (20 backend and two date tests), ten browser scenarios in 52.0 seconds, lint, typecheck and build. These results describe this working tree, not commit 9737dfa or its CI run; publication and public regression checks for the next checkpoint are pending.

### 2026-09-22 - 1855493

Published room-guided scroll: the kitchen and bedroom views reveal their next task and keep that room selected when opening the plan. Improved task feedback with optimistic updates and explicit completion values. Corrected calendar-day countdowns, accessible names, modal focus restoration and low-contrast text (`src/App.tsx`, `src/components/HomeScene.tsx`, `src/components/Modal.tsx`, `src/styles.css`).

Hardened provider boundaries with a task-record limit and bounded streaming response consumption. Twenty backend tests and two date tests pass; provider responses remain controlled fixtures. Ten E2E scenarios passed together against the public app in 47.4 seconds, including two-session persistence, scroll context, accessibility and 320px task creation. These are technical checks, not validation with users.

[Source CI passed](https://github.com/C-Icaro/roomready/actions/runs/35686978802). PR #1 merged as 5292f0769a05ceb5b769ba23e55cb3a6430abcd2 with an identical source tree, and [main CI passed](https://github.com/C-Icaro/roomready/actions/runs/35687154455). The public `build-info.json` reports 185549392a14bdacb49fbabc0401e1551c69d7eb and dirty=false. See `submission/validation.json` for performance, accessibility and secret-scan scope. External sponsor actions remain disabled; video, social and final entry remain pending.
