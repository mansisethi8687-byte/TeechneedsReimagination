# Project context (one page)

Read this first, whether you're a teammate, a reviewer or an AI assistant. Details live in
the docs linked at the end. No passwords or keys appear here; the only credentials below are
the public demo accounts.

## What this is

A redesign of the TechNeeds IGDTUW mentorship platform for the **Innovortex 4.0 Reimagathon**
(rubric: UI 10, role flows 10, AI profile 8, Render backend bonus 7, code quality 5).

- **Upstream:** `Agarwalvidu/tn_web`. Never modified or pushed to; the remote's push URL is
  `DISABLED`.
- **Branch:** all of our work is on `reimagathon`.

**Roles:**
- **Admin** creates programs and onboards mentors.
- **Mentor** enrolls mentees, publishes videos, quizzes and projects, and reviews submissions.
- **Mentee** works through Today, watches, takes quizzes, submits projects, and sees the
  leaderboard and their AI profile.
- **Public** visitors see Home, Team, FAQ, Techboard and the public leaderboard.

## Stack and layout

| Part | Tech |
|---|---|
| Frontend | Next.js 15 App Router (JS), Tailwind v4, IBM Plex (self-hosted), lucide-react |
| Backend | Express 5, Mongoose 8 / MongoDB, JWT with role (`{id, role}`), bcrypt |
| AI profile | Gemini REST (live-verified) or `@anthropic-ai/sdk` (stub-tested), with a rules fallback |
| Jobs | Render Workflows (`@renderinc/sdk`): task `generateProfile` in `backend/workflows/main.js` |

```
frontend/src/app/(site)   public pages: home, team, faq, techboard, eventspage
frontend/src/app/(app)    login, admin/*, mentor/*, dashboard/* (mentee), leaderboard, profile
frontend/src/lib          api.js (every endpoint), session.js, demo.js (demo accounts)
backend/routes            public (/api), admin (/api/admin), mentor (/api), mentee (/api/m), profile (/api/profile)
backend/services          scoring, leaderboard, access, validate, credentials, bootstrap, profile/*
backend/models            Admin, Program, Mentor, Mentee, Resource, Quiz, QuizSubmission, ProfileSnapshot, Counter
backend/scripts           seed, dev-mem, dev-persist, persistence-check, smoke
docs/evidence/phase0..6   test logs, walkthrough logs, screenshots, a11y and keyboard reports
render.yaml               Blueprint: techneeds-api, techneeds-web, techneeds-workflows
```

## Rules the code follows

- **Scoring:**
  - A video scores its max minus 1 point per full day late.
  - A quiz scores round(max × earned ÷ total), and only within its window.
  - A project scores the mentor's score from the moment it's reviewed. Unreviewed projects
    score 0.
- **Leaderboard order:** score descending, then whoever reached it earlier, then account age.
  Exact ties are impossible.
- **Leaderboard movement:** rank 7 days ago minus rank now, shown only if the mentee had a
  score a week ago. The formula is in `backend/services/leaderboard.js`.
- **Quizzes:** one attempt, graded on the server. Answers stay hidden until the quiz closes.
  A quiz can't be edited after anyone has attempted it (409).
- **Projects:** can be resubmitted until reviewed, then they're final. Late submissions are
  accepted and marked late.
- **Credentials:** enrollment numbers are generated (`TN-<CODE><YY>-<NNN>`). Every password is
  bcrypt-hashed, and plain-text upstream passwords upgrade at the next login. Login rate limits
  count failed attempts only.
- **AI profile:**
  - Facts come only from saved records; topic mastery = earned ÷ available.
  - Badges come from fixed rules, each showing the numbers behind it, and the avatar is drawn
    from mastery.
  - The model writes only the summary and recommendations. Every number is checked against the
    facts, and each recommendation must point to a real resource; otherwise the rules writer
    is used.
  - Profiles run as a Render Workflow task when one is configured, with the API as fallback.
    Snapshots are kept and reused when their inputs haven't changed.

## Running it locally

```bash
cd backend && npm ci && npm run dev:persist     # real mongod on backend/.data, API on :8000
cd frontend && npm ci && npm run dev            # http://localhost:3000
```

| Mode | How | Data |
|---|---|---|
| Demo (default) | `npm run dev:persist` | Seeds the demo cohort into `backend/.data/mongo` on first run |
| Clean | `DATA_DIR=.data/live SEED_DEMO=false npm run dev:persist`, plus `NEXT_PUBLIC_DEMO_LOGINS=0` | Only the admin from `backend/.env`; everyone else is created in the app |
| In-memory | `npm run dev:mem` | Resets on every restart |
| Production | `npm start` with `MONGO_URI` | Seeds once if `SEED_DEMO=true` and the database is empty |

**Demo accounts** (seeded data only; the sign-in page has "Use demo account"):

| Role | Login | Password |
|---|---|---|
| Admin | `admin@techneeds.demo` | `techneeds-admin-demo` |
| Mentor | `ishita@techneeds.demo` | `mentor-demo-2026` |
| Mentee | `TN-WD26-001` | `mentee-demo-2026` |

**Environment variables:** names only. Full list in `backend/.env.example` and
`frontend/.env.example`.

- **Backend:** `MONGO_URI`, `JWT_SECRET`, `PORT`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
  `CORS_ORIGIN`, `SEED_DEMO`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `PROFILE_ENGINE`,
  `RENDER_API_KEY`, `RENDER_WORKFLOW_SLUG`, `RENDER_USE_LOCAL_DEV`.
- **Frontend:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_LOGINS`.
- Real `.env` files are git-ignored. Never commit them.

## Verified so far (2026-11-13)

| Check | Result |
|---|---|
| Backend tests (`cd backend && npm test`) | 69/69 pass |
| End-to-end browser walkthrough (admin → mentor → mentee → review → leaderboard → AI profile), plus 15 pages at 375 px | 23/23 steps |
| axe-core WCAG 2.1 AA, 23 pages × dark/light | 0 violations |
| Keyboard-only quiz path | 6/6 pass |
| Data survives a restart (real mongod on disk) | 7/7, also checked live |
| Live Gemini profiles, run as real local Render Workflow task runs | Working |

## Not done or not verified

- **Render deployment:** not live yet. The plan:
  - Push `reimagathon` to the team's GitHub repo on its own branch, leaving its `main`
    untouched.
  - Deploy with `render.yaml` as a Blueprint, using the team's $50 Render credits.
  - Prize eligibility for the Render track requires Render Workflows, which `render.yaml`
    includes.
- **`render blueprints validate`** needs a signed-in Render workspace.
- **Claude adapter:** tested against a stub only.
- **Videos:** watching is self-reported ("Mark as watched").
- **Quiz drafts:** saved on the device, not the server.
- **Seeded week-over-week movement:** comes from backdated demo timestamps.

## More detail

[README.md](README.md) · [DEMO_SCRIPT.md](DEMO_SCRIPT.md) ·
[REQUIREMENTS_MATRIX.md](REQUIREMENTS_MATRIX.md) · [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md) ·
[ARCHITECTURE_PLAN.md](ARCHITECTURE_PLAN.md) · [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) ·
[PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md) · [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) ·
`docs/evidence/`
