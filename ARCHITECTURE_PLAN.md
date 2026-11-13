# Architecture plan

Everything here is **proposed**. "Kept" marks what already exists upstream and is reused.

## Shape

```
 Browser ──► Next.js 15 frontend (Render web service)
               │  NEXT_PUBLIC_API_URL (default http://localhost:8000)
               ▼
           Express 5 API (Render web service, PORT 8000)  ──►  MongoDB Atlas (M0)
               │  POST profile job
               ├──► Render Workflow service "techneeds-workflows"
               │        task generate-profile(menteeId) ─► reads Mongo, calls LLM (optional),
               │                                            writes ProfileSnapshot
               └──► in-process fallback: same generateProfile() function
```

## Backend (kept: Express, Mongoose, JWT, bcrypt; extended)

### Structure

```
backend/
  index.js               app bootstrap (kept, reworked: exports app for tests; listen only when run directly)
  app.js                 express app factory
  config/db.js           kept
  config/env.js          validated env (PORT=8000 default, JWT_SECRET required outside test)
  middleware/auth.js     authenticate(roles[]) — one middleware, role in token
  middleware/authMentor.js  kept as thin re-exports so old imports still work
  middleware/errors.js   asyncHandler, HttpError, 404/validation/cast → JSON
  models/                kept models + Admin, Counter, ProfileSnapshot; Mentee gains interests[], bio
  services/scoring.js    streak + late penalty + completion (moved from routes, single source)
  services/credentials.js password + enrollment generation
  services/profile/      facts.js (pure), badges.js (pure), avatar.js (pure), writer.js (LLM | deterministic)
  routes/mentorRoutes.js kept paths, fixed behaviour
  routes/menteeRoutes.js kept paths, fixed behaviour
  routes/adminRoutes.js  new  /api/admin/*
  routes/profileRoutes.js new /api/profile/*
  scripts/seed.js        demo cohort
  scripts/dev-mem.js     in-memory Mongo + seed + server (no Atlas needed locally)
  test/*.test.js         node:test + supertest + mongodb-memory-server
workflows/               Render Workflow service (separate package, imports backend/services/profile)
```

### Auth model

- Tokens become `{ id, role }` with role ∈ `admin | mentor | mentee`. Old tokens, which
  carry only `{ id }`, still verify: the middleware falls back to a lookup by collection.
- **Admin**: a new `Admin` model. The first admin comes from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` env at boot (`ensureAdmin`), or from the seed. Endpoints:
  `POST /api/admin/login` and `GET /api/admin/me`.
- **Upstream admin routes keep their paths but now require an admin token**:
  `POST /api/programs`, `POST /api/mentors`, `POST /api/programs/:id/add-mentor`, and the
  `GET /api/mentors` listing.
- `POST /api/mentors` no longer takes a password from the request. The server generates a
  12-character password, returns it **once** as `tempPassword`, and stores only the hash.
  If a request does supply `password`, it is still accepted, for compatibility.
- **Mentee passwords**:
  - Hashed with bcrypt on create.
  - Login accepts bcrypt. Legacy plaintext records are compared with a constant-time
    compare and upgraded to a hash on that successful login.
  - Mentors can **reset** a mentee's password, which returns a new one once. They can
    never read one.
- Responses never include `password` (`toJSON` transform on Mentor, Mentee and Admin).
- Ownership checks:
  - A mentor can only act on programs they are in.
  - A mentee can only complete resources in their own programs.
- Login rate limit: a small in-memory limiter, 10 attempts per 15 minutes per IP and
  identifier.

### Enrollment numbers

The `Counter` collection holds an atomic `$inc` per program. The format is
`TN-<CODE><YY>-<NNN>`, e.g. `TN-WEB26-001`. `CODE` is taken from the program's new `code`
field, which is derived from its name if not set. `enrollmentNumber` gets a unique index.
The migration only adds the index if there are no duplicates and logs it otherwise. A
mentor may still pass an explicit enrollment number, for compatibility.

### Resource lifecycle fixes

- **Quiz availability**:
  - A quiz is open when `startTime ≤ now ≤ endTime` and `!isLocked`.
  - Quizzes are created with `isLocked: false`.
  - New `PATCH /api/resources/:id` lets the mentor edit title, url, deadline, maxScore and
    isLocked.
- **Quiz score**: `round(maxScore × earned / totalMarks)`. The raw marks are stored on the
  submission too.
- **`/complete`** applies to `video` only. Quiz and project return 400 and point to their
  real flows.
- **Verify**: checks the mentor owns the resource's program. The score is clamped to
  `[0, maxScore]`, then the streak is updated.
- `Mentee.totalScore` is always recomputed from `completedResources`. One function does it.

### New endpoints (shapes in `IMPLEMENTATION_PLAN.md` Phase 1)

- `/api/admin/login`, `/api/admin/me`, `/api/admin/overview` (counts)
- `/api/mentors/me`. This route is already called by the upstream `lib/api.js`.
- `/api/programs/:id` (detail), `/api/programs/:id/remove-mentor`
- `/api/resources/:id` (PATCH, DELETE), `/api/resources/:id/submissions`
- `/api/mentees/:id/reset-password`
- `/api/m/me` (profile fields), `PATCH /api/m/me` (interests, bio), `/api/m/leaderboard?program=`
- `/api/profile/:menteeId` (latest snapshot), `POST /api/profile/:menteeId/generate`,
  `GET /api/profile/jobs/:jobId`
- `/api/stats` (public counts for the landing proof strip), `/api/health`

## AI profile pipeline

1. **facts.js** (pure, unit-tested). Input: the mentee with completions, program resources,
   quiz submissions, leaderboard position and interests. Output: a fact sheet:
   - completion rate per type
   - on-time rate
   - average quiz accuracy
   - per-topic mastery (from resource tags, with a fallback of keywords in the title)
   - streak, rank and percentile
   - trend over time
   - the next 3 due items
2. **badges.js** (pure). A rule table, e.g. "First submission", "On time ×5", "Quiz ace
   (≥ 90%)", "7-day streak", "Top 10%", "Shipped a project". Each badge carries its
   `because` evidence.
3. **avatar.js** (pure). Seeded by `menteeId` plus the mastery vector. It returns an SVG
   spec: a radial "growth ring" mark. Each ring is a topic, and its arc length is the
   mastery. The palette is chosen from the token set. The result is deterministic: the
   same data gives the same mark.
4. **writer.js**:
   - If `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` is set, it sends the fact sheet only
     (never raw PII beyond the first name). It asks for JSON `{summary, strengths[],
     focus[], recommendations[{title, why, resourceId?}]}`. Output is validated against a
     schema.
     - Recommendation `resourceId`s must exist in the mentee's programs. Anything else is
       dropped.
   - Otherwise, or on failure, a deterministic template writer fills the same JSON from the
     facts.
   - Each snapshot records `engine: "gemini-…" | "claude-…" | "rules"` and `facts` used.
5. **ProfileSnapshot** (Mongo) stores `{mentee, facts, badges, avatar, narrative, engine,
   runId, runner: "render-workflow" | "in-process", createdAt}`.

### Render Workflows

- From the docs, read 2026-11-13; the code shapes still need checking against
  `render-examples/render-workflows-examples-ts`:
  - The package is `@renderinc/sdk` (≥ 1.7).
  - Tasks are defined with `task({ name, retry, timeoutSeconds }, async (ctx, menteeId) => …)`.
  - Runs are triggered with `new Render().workflows.startTask("techneeds-workflows/generate-profile", [menteeId])` → `taskRunId`.
  - Status is read with `getTaskRun`.
  - Auth is `RENDER_API_KEY`.
  - Local dev uses `RENDER_TASKS_URL=http://localhost:8120` with the Render CLI's local task
    server.
- The API's `POST /generate` behaves as follows:
  - If `RENDER_API_KEY` and `RENDER_WORKFLOW_SLUG` are set, it starts the task and returns
    `{jobId: taskRunId, runner: "render-workflow"}`. The client polls
    `GET /api/profile/jobs/:id`.
  - Otherwise it runs `generateProfile()` in-process and returns the snapshot directly.
- The task function and the in-process function are the **same module**, so behaviour cannot
  diverge.
- Idempotency key: `profile-<menteeId>-<latestCompletionTimestamp>`. Repeated clicks with no
  new data reuse the run.

## Frontend

- Keep: Next 15 App Router, JavaScript, the route names, `next/image`, recharts.
- Add: Tailwind v4 (already in devDeps; add `@tailwindcss/postcss`), `lucide-react`, and
  fonts through `next/font`.
- Bootstrap: done in Phase 2. It is off every new route. The legacy public pages get a
  compiled subset (grid, card, nav, navbar) in `@layer legacy`, with no Reboot and no
  `!important` utilities. See `docs/evidence/phase2/VERIFICATION.md` for why. The public
  pages are restyled in Phase 6.
- Remove: `gasp`, `saas`, `fontawesome@5`.
- **One API client**, `src/lib/api.js`:
  - It keeps the existing exported function names, so `adminPanel` and `mentorPanel` keep
    compiling during migration.
  - It reads `NEXT_PUBLIC_API_URL`.
  - It attaches the token for the current role and throws a typed `ApiError`.
- **Session**: `src/lib/session.js`. It stores `{role, token, user}` under one key, and
  migrates the legacy keys `token`, `mentor` and `menteeToken`. A `useSession()` hook plus a
  `<RequireRole role="mentor">` guard redirect to the right login.
- Routes:

| Route | Status |
|---|---|
| `/login` | new, role tabs |
| `/admin` | rebuilt |
| `/mentor` | rebuilt as a studio with tabs: Overview · Mentees · Resources · Review |
| `/dashboard` | mentee, rebuilt |
| `/dashboard/quiz/[id]` | new |
| `/dashboard/project/[id]` | new |
| `/leaderboard` | rebuilt |
| `/profile` | own AI profile |
| `/profile/[menteeId]` | mentor view |

  `/mentee` and `/mentor` keep working as login entry points.

## Config and deployment

- `render.yaml` Blueprint: `techneeds-api` (node web, `npm ci`, `node index.js`, health
  `/api/health`), `techneeds-web` (node web, `npm ci && npm run build`, `npm start`), and
  `techneeds-workflows` (workflow service). The exact Blueprint keys for the workflow service
  will be checked against `/docs/blueprint-spec` in Phase 5. If Blueprints do not support
  it, we create it in the Dashboard.
- Env:
  - API: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGIN`,
    `GEMINI_API_KEY?`, `RENDER_API_KEY?`, `RENDER_WORKFLOW_SLUG?`
  - Web: `NEXT_PUBLIC_API_URL`
  - Workflows: `MONGO_URI`, `GEMINI_API_KEY?`
- `backend/.env` is untracked on our branch. `backend/.env.example` is added.

## Testing strategy

- Backend: `node --test` with supertest against `mongodb-memory-server`. Every rubric flow is
  an integration test. `facts`, `badges` and `avatar` get pure unit tests.
- Frontend: `next build` must pass each phase. We add a Playwright smoke test of the full
  demo script against `dev:mem` (Phase 6), plus browser-pane screenshots as evidence after
  each UI phase.
- Evidence goes to `docs/evidence/phaseN/`.
