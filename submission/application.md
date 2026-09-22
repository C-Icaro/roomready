# RoomReady application materials

**Status: draft, not ready to submit.** The public app and repository are available. Live OpenAI, Firecrawl and AgentMail execution, a demo video, a social post, final entrant declarations and a submission receipt are not yet verified. These values are ready to paste into corresponding fields; they are not a claim that the form has been filled or accepted.

## Confirmed links and identifiers

| Item | Value |
|---|---|
| Project title | RoomReady |
| Tagline | Move together, one room at a time. |
| Live app | https://wonderful-vulture-63.convex.site |
| Repository | https://github.com/C-Icaro/roomready |
| Build log | https://github.com/C-Icaro/roomready/blob/feat/roomready/hackathon.md |
| Pull request | https://github.com/C-Icaro/roomready/pull/1 |
| First meaningful commit | 9737dfac4f8226acf50713f3f18bc0eafd99690c |
| First meaningful commit time | 2026-09-22T04:10:13Z |
| Passing CI run for that commit | https://github.com/C-Icaro/roomready/actions/runs/35685864867 |
| Backend | wonderful-vulture-63 |
| Demo video | Not recorded or published yet. |
| Social post | Not published yet. |
| Submission receipt | None recorded. |

## Short description

RoomReady helps households prepare a move together. A scroll-driven 3D home connects room tasks, assignees and estimated costs, with Convex live updates across sessions. Enquiry drafts are saved for review. Firecrawl research, OpenAI planning and AgentMail sending/inbox paths are implemented but remain inactive pending verified service access.

## Problem and solution

A move involves many small tasks spread across rooms, people and conversations. RoomReady gives the household one shared view of what needs doing, who is handling it and how the estimates compare with the budget.

The 3D home is connected to the task data: select a room, see its next step, complete work and watch its readiness change. The same tasks and costs update in another session without a refresh. A 2D room plan remains usable when WebGL is unavailable, and reduced-motion preferences are respected.

The next part of the product is already implemented in backend actions: fetch supplier information with source provenance, generate marked planning suggestions, and manage reviewed enquiry messages. Those external integrations have controlled tests but have not yet been verified live in this deployment.

## How Convex is used

Convex stores households, room tasks, costs, source records, messages, activity and provider jobs. Queries drive the live UI; validated mutations enforce household ownership and change tasks or drafts. Scheduled actions handle external provider work with usage limits, status updates and timeouts. The registered static-hosting component serves the public frontend from `convex.site`.

Household access uses a random shared capability link, not individual account authentication. Anyone with that link can view and edit the home and its inbox. This limitation is disclosed in the app.

## Sponsor integration status

| Sponsor | Implemented product role | Verification status |
|---|---|---|
| Convex | Persistent shared data, live queries, mutations, scheduled provider jobs and static hosting. | Public household workflow exercised in browser tests. |
| OpenAI | Structured planning suggestions using household context and saved source evidence; suggestions are marked for review and assigned no fabricated quote. | Implemented and fixture-tested; no successful live request recorded. |
| Firecrawl | Search and public-URL scraping, retaining source links, excerpts and retrieval times. | Implemented and fixture-tested; no successful live request recorded. |
| AgentMail | Draft review, explicit approval, controlled-recipient sending, inbox polling and duplicate suppression. | Draft persistence verified. Real send/receive not exercised; external actions are disabled. |

The full official Convex Codex plugin 1.10.0 is installed and enabled. The official CLI was used for development and deployment. A real read-only `status` call to the official Convex MCP server bundled with `convex@1.46.0` succeeded via stdio against the development deployment at 2026-09-22T04:23:46.860Z. Native desktop tool names remain unavailable in this session. The verified call is separate from plugin installation and does not imply that every plugin feature or sponsor API was exercised.

## What has been tested

The baseline has 17 backend tests with controlled provider fixtures. Seven browser scenarios passed against the first public app across an initial run and a targeted rerun. The scenarios cover task editing, budget changes, synchronization between independent sessions, persistence, household-link isolation, room-focused next steps, mobile drafts, real errors from disabled-provider mutations, reduced motion and a no-WebGL fallback.

[CI run 35685864867](https://github.com/C-Icaro/roomready/actions/runs/35685864867) passed for the first meaningful commit. Later changes require their own validation. These results do not prove live provider integration, recipient delivery, measured user benefit or production-scale performance.

The current working tree separately passed 22 unit tests, ten local browser scenarios, lint, typecheck and build. Its publication, new CI and public regression evidence must be reconciled before submitting; those results do not belong to the first commit's CI record.

## Social copy for the current state

Draft only; no post has been sent:

> Built RoomReady: a scroll-driven 3D home with shared room tasks and budgets, live on Convex. Sponsor API integrations are implemented but not activated yet. Try it: https://wonderful-vulture-63.convex.site @convex @OpenAI @firecrawl @agentmail

Revise the integration sentence after genuine activation and verification. Use the actual posted URL in the entry; do not invent one.

## Required completion before submission

- Verify active, authorized access and available credits for all sponsor APIs; demonstrate real results with clear provenance and a controlled email round trip.
- Record and publish the [demo walkthrough](./demo-script.md) in under three minutes. Supply its real URL.
- Publish the authorized social post and retain its actual URL.
- Confirm the entrant's registration, age/eligibility, team details and any declarations requested by the real form. This file supplies no invented personal answers.
- Reconcile `hackathon.md`, the public app, the recorded demo and the final source revision. All submitted links must work without private invitations.
- Complete the [exact Convex All Gas submission form](https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit) and retain a confirmation or entry URL.

Deadline: **September 22, 2026, 12:00 PM Pacific / 19:00 UTC / 16:00 São Paulo**. Until these items are complete, the app is a public build with an unfinished entry, not a completed hackathon submission.
