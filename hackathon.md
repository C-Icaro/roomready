# Hackathon log

- **Project:** RoomReady
- **Event:** Convex All Gas Hackathon
- **What it does:** A collaborative moving-home planner with a room-based 3D workspace, shared tasks, cost estimates, source research and an enquiry inbox.
- **Live app:** not deployed
- **Repo:** https://github.com/C-Icaro/roomready
- **Frontend:** Convex static hosting
- **Convex deployment:** https://combative-tiger-707.convex.cloud (development)
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, actions, scheduled functions, realtime queries
- **Auth:** Other (UUIDv4 capability links; anyone with a link can edit that home)
- **AI models:** gpt-4.1-mini (configured default; not exercised live yet)
- **Started:** 2026-09-22T03:41:00Z (initial source files, before first commit)
- **Last updated:** 2026-09-22T04:02:00Z

## Log

### 2026-09-22 - working tree

Built the first complete household task flow, original procedural apartment and native-scroll camera views (`src/App.tsx`, `src/components/HomeScene.tsx`, `src/components/apartment-model.ts`). Convex stores homes, tasks, sources, messages, activity and jobs (`convex/schema.ts`, `convex/homes.ts`).

Implemented provider actions for Firecrawl search/scrape, OpenAI structured suggestions and AgentMail review-before-send plus inbox polling (`convex/providers.ts`). External services remain disabled pending verified access. Unit fixtures are not evidence of live integrations.

Seventeen backend tests pass for access boundaries, validation, job handling and provider parsing. Three local browser tests pass for actual persistence, two-session sync, camera movement, mobile draft flow, reduced motion and WebGL fallback. Current evidence is local/cloud-development only; production, live provider round trip and the demo video are pending.

Installed the official full Convex Codex plugin 1.10.0 from the Convex marketplace after source inspection. Its tools require a new Codex session to appear; this session uses the official CLI and documentation. Registered the static hosting component in `convex/convex.config.ts` and its routes in `convex/http.ts`.
