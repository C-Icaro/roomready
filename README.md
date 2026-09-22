# RoomReady

A collaborative moving-home planner. Explore a furnished 3D home, organize room tasks and estimated costs, research moving services with source links, and prepare enquiries for a shared inbox.

Built for the Convex All Gas Hackathon, started September 22, 2026. See [hackathon.md](./hackathon.md) for verified implementation and deployment status.

## Run

Requires Node.js 24 and npm. Dependencies are locked in `package-lock.json`.

```sh
npm ci
npx convex dev
npm run dev
```

The Convex CLI can provision an anonymous **local development** backend. A Convex account and cloud deployment are required for public hosting. The generated `.env.local` is ignored by Git.

## What works

- Room-based tasks, estimates, owners, priorities and notes, stored in Convex.
- Realtime collaboration and persistence across sessions.
- Original procedural Three.js apartment with scroll-driven camera, room selection, progress-linked packing boxes and a functional 2D fallback.
- Provider jobs with explicit configuration/error states, bounded usage and timeouts.
- Firecrawl search and URL scraping, with source timestamps and excerpts.
- OpenAI Responses structured planning suggestions, grounded in the home's saved sources.
- AgentMail drafts, explicitly approved sends to controlled recipients, inbox polling and inbound deduplication.

Provider code is not evidence of a live integration. Consult the build log for which providers have actually been exercised.

## Access and privacy

Each home has a random UUIDv4 capability. There is no public list of homes. The capability is held locally and shared in a URL fragment. **Anyone with the link can view and edit the home and its inbox.** Use it only with trusted household members; it is not a substitute for identity-based access control. Sample homes contain labelled fictional tasks and estimates. Do not enter sensitive information into a public hackathon demo.

The backend validates arguments and document ownership. Network access happens only in Convex actions. External content is untrusted data, not executable instructions. Emails require review and an allowlisted recipient. A send with an uncertain outcome is not automatically retried.

## Configure external services

Set these on the **Convex deployment**, never in frontend `VITE_` variables:

- `OPENAI_API_KEY`, optionally `OPENAI_MODEL` (default `gpt-4.1-mini`).
- `FIRECRAWL_API_KEY`.
- `AGENTMAIL_API_KEY` and `AGENTMAIL_ALLOWED_RECIPIENTS` (comma-separated controlled test addresses).
- `EXTERNAL_ACTIONS_ENABLED=true`, only after confirming existing access and available credits.

Use the Convex dashboard or `npx convex env set NAME` with secure stdin. Do not commit secrets. Services start disabled, and the UI reports unavailable services explicitly. Sending is capped, idempotent per draft and never automatically retried after ambiguous delivery.

## Validate and publish

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run deploy
```

The E2E suite uses Microsoft Edge by default; override the Playwright browser channel for other environments. Local tests expect the frontend and Convex dev server to be running. `E2E_BASE_URL` targets a deployed frontend. `EVIDENCE_DIR` chooses screenshot storage. Provider fixtures in unit tests are **not live provider evidence**.

Deployment uses the official Convex static hosting component and serves the frontend from the production `*.convex.site` alongside its backend. No separate database or hosting provider is required.

## Stack and attribution

React, Vite, TypeScript, Three.js, Lucide and Convex. The apartment geometry and materials are original source in `src/components/apartment-model.ts`, with no third-party 3D assets. Technical inspiration: Three.js [camera](https://threejs.org/examples/webgl_camera.html), [raycast interaction](https://threejs.org/examples/webgl_interactive_cubes.html), [physical lighting](https://threejs.org/examples/webgl_lights_physical.html) and [RoomEnvironment](https://threejs.org/docs/pages/RoomEnvironment.html). Three.js is MIT licensed; no showcase identity or proprietary models are copied.

The official [Convex hackathon skill](https://github.com/get-convex/convex-hackathon-skill) is vendored under `.agents/skills/` under its MIT license. Fonts are DM Sans and Manrope from Google Fonts (SIL Open Font License). Lucide icons are ISC licensed.
