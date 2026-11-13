# Phase 5: AI profile and Render Workflows

Verified on 2026-11-13:

- **API:** persistent MongoDB (`dev:persist`), configured to dispatch profile jobs to Render
  Workflows (`RENDER_WORKFLOW_SLUG`, `RENDER_USE_LOCAL_DEV=true`).
- **Workflow:** the **official Render CLI local task server** (`render workflows dev -- node
  workflows/main.js`, CLI v2.36.0, SDK `@renderinc/sdk` 1.8.0).
- **Web:** production build.

## Results

| Check | Result | File |
|---|---|---|
| Backend tests | **69/69 pass**: 23 profile tests plus all earlier phases | `npm-test.txt` |
| End-to-end Chrome walkthrough. Phase 4 journey plus profiles. | **23/23 steps.** No console errors, no failed requests. | `ui-walkthrough.txt`, screenshots `01`–`18` |
| 375px overflow, now 15 pages including both profile pages | **0px on all** | inside `ui-walkthrough.txt` |
| Real Render Workflows run (not a stub) | API returned 202 and queued the job. The task server ran `generateProfile`. The profile was ready in **1.9 s**, with `runner: render-workflow`. | `render-workflow-local-run.txt` |
| Render's own record of that run | `status: completed`, `input: [snapshotId]`, `results: [{status:"ready", engine:"rules", badges:7}]`, `retries: 0` | same file |
| `next build` | Compiles with no warnings, 23 routes | `frontend-build.txt` |
| **Live Gemini, through the Render Workflow** | 5 live profiles: 3 mentee, 2 mentor. All `engine: gemini`, `runner: render-workflow`. One went API → task server → Gemini → MongoDB in **5 s** end to end. | `gemini-live-run.txt`, `gemini-live-ui-run.txt`, `gemini-*.png` |
| Full walkthrough with live Gemini | 23/23 steps, no console errors | `ui-walkthrough-gemini.txt` |

## What the profile is made of

| Part | How it's produced | Where |
|---|---|---|
| **Facts** | Computed only from saved records: completions, graded quiz attempts (marks earned out of total), mentor scores and feedback, deadlines, leaderboard rank and week movement, interest tags. **Topic mastery** = points earned ÷ points available on work that's done or already due, so unreleased work never lowers it. | `services/profile/facts.js` |
| **Badges** | Fixed rules. Every badge carries a `because` string with the numbers that earned it. The AI never awards badges. | `badges.js` |
| **Avatar** | Generative SVG "growth rings": one ring per topic, filled to the mastery percentage. The rotation is seeded from the account ID. Same data always gives the same mark, and it changes as the person learns. Uses CSS variables, so it follows light and dark themes. | `avatar.js` |
| **Narrative** (summary, strengths, focus, recommendations) | One of three writers: **rules** (deterministic, always available), **Gemini** (REST, if `GEMINI_API_KEY` is set) or **Claude** (official `@anthropic-ai/sdk`, `claude-opus-5-5`, structured output, low effort, if `ANTHROPIC_API_KEY` is set). | `writer.js` |
| **Mentor profile** | Mentees, published resources by type, reviews done, median review time, feedback rate, cohort completion, inactive mentees, the cohort's weakest topic | same pipeline |

## Guardrails on the AI writers (all tested)

- **What the model sees.** Only the fact sheet: first name, numbers and resource titles. No
  email, enrollment number or surname (test: "the LLM sees no email…").
- **Validated output.** Output is checked with a zod schema. Recommendations may only
  reference resource IDs present in the facts. Invented IDs are dropped and counted (test:
  "validation drops recommendations that point at invented resources").
- **Fallback, never a failure.** Any error, timeout or refusal falls back to the rules writer,
  and the profile records why (tests: Gemini 503 and Claude refusal).
- **Provenance in the UI.** The profile shows which writer produced it, where it ran (with the
  workflow run ID), and why it fell back.

## Runners

- **Render Workflow.** The API queues a `ProfileSnapshot`, then calls
  `startTask("<slug>/generateProfile", [snapshotId], {idempotencyKey})`. The client polls
  `GET /api/profile/jobs/:id`, which reads the run's status with `getTaskRun`. The task runs
  `runSnapshot`, the **same function** the API uses in-process. Retries are safe because a
  finished snapshot is returned unchanged.
- **Fallbacks.** If the task can't be started, or the run fails or is canceled, the API
  generates the profile itself and records `workflowError`. Both paths are tested against a
  stubbed Render client.
- **Reuse.** Regenerating with no new activity returns the last profile (inputs hash). That
  saves LLM quota and workflow compute. `force` rebuilds it anyway.

## Access (tested)

- **Mentee:** can view and regenerate their own profile.
- **Mentor:** can view and regenerate profiles of mentees in their own programs only, and
  their own profile.
- **Mentee viewing a mentor:** can view the profile of a mentor in their program, but cannot
  regenerate it.
- **Other mentees and mentors from other programs:** 403.
- **Signed out:** 401.
- **Admin:** all.

## Problems found while verifying, and fixed

| Problem | Fix |
|---|---|
| A 100% topic ring rendered as a tiny dot: an SVG arc whose start and end coincide | Full rings are drawn as circles (test added) |
| "Reviewed within 0 hours" for a review done in seconds | "under an hour" / "<1 h" |
| "1 videos · 1 quizzes" | Pluralized |
| The workflow run ID wrapped awkwardly beside its label | It now sits on its own line |
| Render docs summary said `RENDER_TASKS_URL`; the SDK actually reads `RENDER_USE_LOCAL_DEV` / `RENDER_LOCAL_DEV_URL` | Verified against the SDK source and documented |

## Live Gemini findings

- **First attempt timed out.** It used the `gemini-flash-latest` alias, default thinking and a
  25-second timeout. The safeguard worked: the profile still came back, written by the rules
  writer, with the reason recorded. Fix, matching the setup that already works in your
  oauth-fieldguide project:
  - a Flash model chain (`3.5-flash-lite` → `3.5-flash` → `3.6-flash`; each has its own
    free quota)
  - `thinkingLevel: LOW`
  - a 40-second timeout per model
  - the workflow task timeout raised to 180 seconds
- **The chain earned its keep in a real run.** `gemini-3.5-flash-lite` returned **503 "high
  demand"**, and the next model answered. Google reported the served model as
  `gemini-3.6-flash` (`modelVersion`), and that is what the profile records.
- **New: numeric grounding check.** Every number in an AI-written narrative is compared
  against the fact sheet. Unmatched numbers are stored on the snapshot and shown on the
  profile ("Every number checked against the record" otherwise). In a live run it flagged
  `14`, from "the last 14 days". That was a **false positive in the checker**: the 14 comes
  from the field `activeDays14`, and the checker ignored numbers in field names. Fixed, with
  a test. Re-checking that run now gives `[]`. All 5 live Gemini profiles are grounded.
- **All live recommendations pointed at real resources** in the mentee's program. None were
  dropped.

## Not verified, or limited

- **Live LLM: Gemini verified, Claude not run.** Gemini ran live using your free key. The
  key is read at process start from `oauth-fieldguide/.env.local` and is never copied into
  this repo or into `launch.json`. The Claude adapter is tested against a stub only, because
  there's no Anthropic key.
- **Deployed Render Workflow service: not created.** That needs your Render account. The task
  ran on the official CLI's local task server, using the same SDK code path. In production
  the API needs `RENDER_API_KEY` + `RENDER_WORKFLOW_SLUG`.
- **The avatar is generative, not image-model output.** It is labelled "Avatar generated from
  your topic mastery".
- **Leaderboard week movement in the seeded cohort** comes from backdated seed timestamps.
