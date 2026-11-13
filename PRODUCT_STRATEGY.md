# Product strategy

Everything in this document is **proposed**. For what exists today, see `REPOSITORY_AUDIT.md`.

## The one-line bet

Judges will see several dark, purple-glow "AI mentorship universe" redesigns. Each will have
a constellation chart and a demo-login switcher over mock data. TamTam's deck is exactly
that, and says so itself: *"Full backend authentication, database integration and AI-powered
profile generation are planned enhancements."*

**We win on proof, not decoration.** Every number on screen comes from the real API. Every
flow runs end to end on a deployed stack. The AI profile is built from the mentee's actual
submissions, and it shows its working.

This is the same principle as the portfolio: *"Grace sells taste, Anmol sells proof — every
'crazy' element on the page is a real number or a live thing rather than decoration."*

## Who it is for, and the job each role hires it to do

| Role | Job | What "done" looks like in the demo |
|---|---|---|
| **Admin** (TechNeeds core team) | Start a cohort and staff it in minutes | Signs in, creates "Web Dev Cohort 2026", onboards a mentor, and the system **generates** the mentor's credentials. A one-time credential card offers Copy and Share. |
| **Mentor** | Run a cohort without spreadsheets | Adds 3 mentees and gets auto-generated enrollment numbers (`TN-WEB26-001`) plus passwords. Publishes a video, a quiz (visual builder: click the correct option) and a project, each with a deadline and max score. Reviews a submitted project and scores it. |
| **Mentee** | Know what is due, do it, see progress | Logs in with enrollment number and password. Lands on a *due-first* view ("2 things due this week"). Watches, takes a timed quiz, submits a project, and watches rank and streak update live. |
| **Anyone** | Understand TechNeeds | The public site keeps the existing team, FAQ and techboard content, redesigned |

## Differentiators, ranked by rubric weight

1. **It works end to end** (Role flow 10 + Backend 7). All three panels are wired to one
   hardened API and deployed on Render, with a seeded demo cohort. We fix the four blocking
   upstream defects: locked quizzes, the `hhttps` typo, the wrong verify token, and the
   missing admin auth. Without those fixes no competitor can demo quizzes or project
   scoring on the real API.
2. **The AI profile shows its evidence** (AI 8).
   - Each insight cites what produced it, e.g. "Strongest in *JavaScript*: 92% across 3
     quizzes".
   - The avatar is **generated from the mentee's own skill vector**: a deterministic
     generative mark. The same data always gives the same avatar, and it evolves as they
     learn.
   - Badges are rule-based and auditable.
   - An LLM writes the summary and recommendations from a structured fact sheet only. If no
     key is set, or the call fails, a deterministic writer produces the same sections. It is
     labelled as such and never fakes "AI".
   - Generation runs as a **Render Workflow task**, which also makes us eligible for the
     Best Use of Render track.
3. **Due-first mentee workspace** (UI/UX 10). Mentees see a timeline of what is due, not a
   resource table. Deadlines read as "due Thu, in 2 days", with urgency colour used only for
   urgency.
4. **Mentor studio with a real quiz builder and a review queue** (Role flow). Score changes
   show up live in the leaderboard and the mentee's profile.
5. **Program-scoped leaderboard** with podium, streaks and "you are here". Our own row is
   highlighted.

## Explicit non-goals for this hackathon

- Email delivery of credentials. We show a one-time credential card instead. Email needs a
  verified sender domain we do not have.
- Real-time sockets. The leaderboard refreshes on focus and every 20 seconds, which is
  enough for the demo and has fewer moving parts.
- Image-model avatars. A generated SVG from real data is honest and instant, and costs
  nothing.
- Events, payments, multi-college tenancy.

## Demo script (target, 4 minutes)

1. **Public site** (15 s): proof strip shows live counts from `/api/stats`.
2. **Admin** (45 s): create program → onboard mentor → credential card.
3. **Mentor** (75 s): add mentee → enrollment number generated → publish quiz with the
   builder → publish project.
4. **Mentee** (60 s): log in → due-first view → take quiz → score and rank update → submit
   project.
5. **Mentor** (20 s): review queue → score 180/200.
6. **AI profile** (45 s): regenerate → Workflow run id shown → avatar, badges, summary and
   recommendations, each with its evidence.

## Risks

| Risk | Mitigation |
|---|---|
| No LLM key at judging time | Deterministic writer. The UI states which engine produced the text. |
| Render free web service cold start (~50 s) | Warm it before the demo. A health ping on page load shows "waking server" rather than a broken page. |
| Render Workflows unavailable or slow | The same task function runs in-process as a fallback. The UI shows which path ran. |
| MongoDB Atlas setup | The user creates a free M0 cluster and pastes the URI. Locally, `npm run dev:mem` runs on in-memory Mongo with seed data. |
