# RoomReady demo: 2 minutes 50 seconds

**Status:** rehearsal target while implementation is in progress. This document does not certify a live deployment, working credentials, completed integrations or an accepted submission. Record the final application and adapt the spoken claims to what is actually visible. Do not present a mock, seeded response or edited status as a real provider execution.

**Pitch:** “RoomReady turns a move into one shared home: every room, task, cost and supplier conversation in the same place.”

## Prepare the take

- Open the final public `convex.site` URL in a fresh browser session and verify it works without an invitation gate. Use the same deployed app in two independent browser sessions with the same synthetic demonstration home.
- Use invented names, a sample city, a future move date and an easy-to-check budget. Keep genuine addresses, credentials, household access tokens and unrelated browser tabs out of the recording.
- Have one unfinished kitchen task and one editable cost ready. Use a public supplier page whose content can be inspected and whose research route has already passed a real check.
- Configure provider credentials on the backend. Keep a prior completed run available to inspect, with its actual timestamp and source; label it as a previous run if used to avoid waiting on camera.
- For mail, use only a test inbox owned by the project or entrant, with explicit approval of the exact test message. Do not contact a real supplier for the recording. Sending and receiving must be independently verified before either is claimed.
- Rehearse against the current visible controls. The actions below specify the intended flow, not unverified final button labels. If the product cannot perform a step, fix it or state the limitation; do not silently substitute a simulation.

## Click walkthrough and narration

| Time | Visible action | Suggested narration | Evidence to capture |
|---|---|---|---|
| 0:00-0:15 | Open the public app. Show the home scene and the primary planning action. | “Moving means coordinating dozens of small decisions. RoomReady puts them into one shared home, so everyone can see what still needs doing.” | Address bar with public app domain; recognizable product entry. |
| 0:15-0:35 | Scroll from the whole-home view into room-focused views. Select Kitchen and open its tasks. | “Scroll through the home, then work room by room. The scene leads directly to the tasks behind each space.” | Smooth viewpoint change and a selected room connected to actual task content. |
| 0:35-1:00 | Add or edit a kitchen task and its estimated cost. Show the task list and budget total changing. | “I can assign the task and include its estimated cost. The budget stays connected to the work instead of living in another spreadsheet.” | Persisted task; an arithmetic change the viewer can follow; estimated-cost label. |
| 1:00-1:20 | Arrange the two independent sessions side by side. Complete the task in session A; point to the update in B without refreshing. | “This is the same home in two browser sessions. Mark it done here, and the other person sees the change through Convex live updates.” | Both sessions in one continuous shot. Do not cut across the update. |
| 1:20-1:45 | Open supplier research. Paste the tested public supplier URL and run research, or inspect an honestly labeled prior real result. Open the source details. | “Supplier research keeps its source. Firecrawl retrieves the page, and RoomReady keeps the link and capture time so I can check the information.” | Actual source URL, capture time and provider result. Do not call missing prices quotes. |
| 1:45-2:10 | Request a move plan or open an actual previously generated plan. Review a suggested task and accept it if that flow exists. | “OpenAI turns the move details into a first plan. I review the suggestions and decide what becomes part of our move.” | A real generated result and review action; persist the accepted task if supported. |
| 2:10-2:35 | Open a quote draft. Review recipient, subject and body. If configured and authorized, approve a test send to the owned test inbox and show observed mail status or received thread. | “The quote request starts as a draft. Nothing leaves until I approve it. This demonstration uses our own test inbox.” Then, only if observed: “AgentMail accepted the send,” or “Here is the received message.” | Explicit approval; truthful provider state. A send acknowledgement is not delivery proof. |
| 2:35-2:50 | Return to the shared home overview and updated tasks/budget. | “RoomReady connects a clear plan, shared progress, sourced research and reviewed communication. Less chasing updates, more getting the home ready.” | The final persisted state and clean closing frame. |

Total target: **170 seconds**, leaving ten seconds below the event limit. Keep the realtime proof continuous. Trim navigation or explanation before removing evidence. If a provider takes longer, show a clearly identified earlier real run with its timestamp rather than pretending an edit is a live result.

## Truthful variants for incomplete integrations

These variants make the recording honest; they do **not** establish that the entry satisfies the full sponsor-stack criterion.

- Research unavailable: “This environment cannot reach Firecrawl yet. The source workflow is implemented but not verified here.” Show the real error state instead of a generated research card.
- Model unavailable: “This is a sample plan, not a live OpenAI result.” Do not describe template content as generated.
- Mail unavailable: “This is the reviewed draft. Sending and inbox receipt are not verified in this environment.” Stop at the draft; no delivery claim.
- Backend unavailable: label the experience as a local demonstration. Do not describe local state as Convex persistence or realtime collaboration.

Prefer fixing these gaps before recording the submission video. Keep final claims aligned with `hackathon.md` and the deployed app.

## Submission artifacts

The [official checklist](https://www.convex.dev/hackathons/all-gas) and [Luma listing](https://luma.com/convex-allgas-hackathon) define the entry requirements. Prepare each artifact before calling the package ready:

| Artifact | Acceptance evidence |
|---|---|
| Registration and eligibility | Luma registration confirmed by a team member; participant requirements checked by the entrant. |
| Public repository | Public GitHub URL accessible when signed out; source includes the implemented app. |
| Root `hackathon.md` | Current product description, stack, live URL, video link and evidence-based build history; no credentials or personal mail data. |
| Live app | Working public `convex.site` URL verified from a fresh session. |
| Demo video | Publicly viewable link; actual product walkthrough; duration below three minutes. |
| Social post | X or LinkedIn URL tagging Convex, OpenAI, Firecrawl and AgentMail; use actual product evidence, not invented traction. |
| Entry form | Final title, description, links and any additional fields inspected at the exact event form. |
| Submission outcome | Confirmation page, receipt or entry URL showing acceptance before the deadline. An open form is not a receipt. |

**Exact submission destination:** [Vibe Apps: Convex All Gas / OpenAI submission](https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit).

**Deadline:** September 22, 2026, 12:00 PM Pacific, **19:00 UTC / 16:00 São Paulo**. Do not wait for the last minute to upload the video or validate public access.

## Short description, pending verified feature scope

Use only after confirming each described capability:

> RoomReady is a shared moving-home organizer with a scroll-driven 3D home. Households organize room tasks and estimated costs with Convex live updates, inspect supplier research with Firecrawl source links, review an OpenAI move plan, and approve quote messages through AgentMail. A move becomes one visible, shared plan.

If a capability remains unverified, remove it from the submitted description or label its limitation. Do not claim awards, user adoption, savings or superiority to previous winners without evidence.
