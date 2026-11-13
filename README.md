# TechNeeds: cohort mentorship platform

A redesign of the [TechNeeds IGDTUW](https://techneedsigdtuw.vercel.app/) platform for the
Innovortex 4.0 Reimagathon. Upstream code: [`Agarwalvidu/tn_web`](https://github.com/Agarwalvidu/tn_web).
It was cloned, never modified upstream, and extended on the `reimagathon` branch.

Admins start cohorts and onboard mentors. Mentors enroll mentees and publish videos, quizzes
and projects with deadlines and scores. Mentees work through what's due, get quizzes graded
and projects reviewed, climb a live leaderboard, and get an AI profile built from their real
record.

Everything on screen comes from the API. There are no mock numbers.

## What's in it

| Role | What they can do |
|---|---|
| **Admin** | Create and edit programs. Onboard mentors: the password is generated and shown once. Assign mentors to programs and remove them. Reset mentor passwords. See counts across the platform. |
| **Mentor** | Add mentees: the enrollment number (e.g. `TN-WD26-001`) and password are generated. Publish videos and projects with deadline, max score and topics. Build quizzes by clicking the correct answer. Lock, edit or delete resources, and see who has done each one. Review and score projects with feedback. Own AI profile, plus each mentee's profile. |
| **Mentee** | A Today view of what's next, ordered by deadline. A video viewer. A one-attempt quiz runner, graded on the server, with answers hidden until the quiz closes. Project submission, which can be resubmitted until it's reviewed. Mentor feedback, activity history, leaderboard, and an AI profile with editable interests. |
| **Public** | Home with live counts and a live leaderboard preview. Team (26 members), FAQ, a role router, and a public leaderboard. |

**AI profile.**
- **Facts:** computed only from saved records (topic mastery = points earned ÷ points
  available).
- **Badges:** come from fixed rules, each showing the numbers that earned it.
- **Avatar:** generated from the person's topic mastery.
- **Summary and recommendations:** written by Gemini (live-verified) or Claude, from the
  facts only. Every number is checked against the record, recommendations must point at real
  resources, and anything that fails falls back to a rules writer.
- **Where it runs:** as a **Render Workflow** task (`generateProfile`), with the API as a
  fallback.

## Stack

Next.js 15 (App Router, JavaScript) · Tailwind CSS v4 · IBM Plex (self-hosted) · Express 5 ·
Mongoose 8 / MongoDB · JWT auth with roles · Render Workflows (`@renderinc/sdk`) · Gemini REST /
`@anthropic-ai/sdk`.

```
frontend/   Next.js app: (site) public pages, (app) role workspaces
backend/    Express API, models, services/profile (AI profile), workflows/main.js (Render task)
docs/       evidence/phaseN: test output, walkthrough logs, screenshots per phase
render.yaml Blueprint: API, web app, workflow service
```

## Run it locally

Requirements: Node 20+ and Chrome (only for the browser scripts). Run the backend and the
frontend in separate terminals.

```bash
cd backend && npm ci && npm run dev:persist
```

```bash
cd frontend && npm ci && cp .env.example .env.local && npm run dev
```

- `dev:persist` starts a real local MongoDB that saves to `backend/.data/`, seeds the demo
  cohort once, and serves the API on `:8000`.
- `dev:mem` is the same with in-memory data that resets on every restart.
- **Clean start with no demo data:** put `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`
  (git-ignored), then run `DATA_DIR=.data/live SEED_DEMO=false npm run dev:persist`. Set
  `NEXT_PUBLIC_DEMO_LOGINS=0` for the frontend. Only the admin exists; everyone else is created
  in the app (admin → mentor → mentee).
- With your own database, use `npm start` with `MONGO_URI` (see `backend/.env.example`).
- The app runs on http://localhost:3000.

**Demo accounts** (seeded demo data only). The sign-in page also has a "Use demo account"
button.

| Role | Login | Password |
|---|---|---|
| Admin | `admin@techneeds.demo` | `techneeds-admin-demo` |
| Mentor | `ishita@techneeds.demo` | `mentor-demo-2026` |
| Mentee | `TN-WD26-001` | `mentee-demo-2026` |

**AI profiles with Gemini (optional).** Set `GEMINI_API_KEY` for the backend. Without it, the
rules writer produces the profiles.

**Render Workflows locally (optional).** This needs the [Render CLI](https://render.com/docs/cli).

```bash
cd backend && render workflows dev -- node workflows/main.js
```

Then start the API with `RENDER_USE_LOCAL_DEV=true RENDER_WORKFLOW_SLUG=local`. Profiles then
run as task runs on the local task server.

## Tests and checks

| Command | What it proves |
|---|---|
| `cd backend && npm test` | 69 tests: auth and roles, every flow, grading, deadlines, scoring, leaderboard order and movement, the profile engine, writers, workflow runner, access |
| `cd backend && npm run check:persistence` | Data survives a backend restart (real `mongod` on disk) |
| `cd frontend && node scripts/ui-walkthrough.mjs` | 23-step end-to-end journey in headless Chrome, plus 15 pages at 375px |
| `cd frontend && node scripts/a11y-audit.mjs` | axe-core WCAG 2.1 A/AA on 23 pages × dark/light |
| `cd frontend && node scripts/keyboard-check.mjs` | Sign in, open a quiz and answer it using only the keyboard |

The browser scripts need the API and the web app running (`WEB_URL`, `API_URL`). Results for
each phase are in `docs/evidence/`.

## Deploy on Render

`render.yaml` defines `techneeds-api`, `techneeds-web`, `techneeds-workflows`, and
an authenticated private `techneeds-mongo` service with a 1 GB persistent disk.
The web, API and database use always-on Starter instances. MongoDB credentials
are generated by Render and shared through service references, never Git.

1. Redeem the participant credits in the intended Render workspace.
2. Push the deployment branch to your fork. In Render, choose **New → Blueprint**, pick
   the repo, and explicitly select `reimagathon`.
3. Fill in the prompted values:
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   - `CORS_ORIGIN` (the web URL)
   - `NEXT_PUBLIC_API_URL` (the API URL)
   - optionally `GEMINI_API_KEY`, and `RENDER_API_KEY` from Account Settings → API Keys
4. `SEED_DEMO=true` seeds the demo cohort the first time the API boots on an empty database.

MongoDB is private to the workspace's Singapore network. The API and Workflow
construct their authenticated connection from Render's service references. An
explicit `MONGO_URI` still works for local development or Atlas. Use `mongodump`
for database backups; disk snapshots alone are not reliable MongoDB backups.

## What changed from upstream

The full audit is in [`REPOSITORY_AUDIT.md`](REPOSITORY_AUDIT.md). Fixes include:

- **Quizzes:** they could never be submitted (locked with no unlock). Now they open and close
  on schedule, are graded on the server, and their scores scale to the max score.
- **Project submission:** it failed from the UI because of an `hhttps://` typo. It now works,
  with validation and a resubmit-until-reviewed policy.
- **Admin login:** the admin had none. There's now an Admin model with role-based JWT.
- **Passwords:** mentee passwords were stored in plain text and readable without a login. All
  passwords are now hashed with bcrypt, and older plain-text ones upgrade at the next login.
- **Projects scored for free:** a checkbox gave full marks with no submission. That's no longer
  possible.
- **Enrollment numbers:** typed by hand. They're now generated, sequential and unique.

All upstream endpoint paths still work.

Planning documents: [`REQUIREMENTS_MATRIX.md`](REQUIREMENTS_MATRIX.md) ·
[`PRODUCT_STRATEGY.md`](PRODUCT_STRATEGY.md) · [`ARCHITECTURE_PLAN.md`](ARCHITECTURE_PLAN.md) ·
[`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) · [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) ·
[`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

## Known limitations

- **Claude:** the adapter is tested against a stub only; it has not been run with a real key.
- **Videos:** watching is self-reported ("Mark as watched").
- **Quiz drafts:** saved on the device, not the server.
- **Seeded week-over-week movement:** comes from backdated demo timestamps.
- **Team photos:** served from the TechNeeds Cloudinary account.
