# Implementation plan

Phases are ordered by rubric weight × dependency. Each phase ends with:

- a build or test run saved to `docs/evidence/phaseN/`
- an update to `REQUIREMENTS_MATRIX.md` (planned → done, with evidence)
- a commit on `reimagathon`

**Phase 0 (audit)** is done. It produced the six documents, the baseline probe and the
baseline build.

## Phase 1: backend foundation (Backend 7, Role flow 10)

Goal: every role flow in the problem statement works through the API, safely, with tests.

1. `app.js` and `index.js` split, so tests import the app. Default `PORT` 8000.
   `/api/health`.
2. `middleware/errors.js`: `asyncHandler`, `HttpError`, and JSON 404s for ObjectId casts
   and nulls.
3. `Admin` model, `ensureAdmin()` from env, `/api/admin/login`, `/api/admin/me`,
   `/api/admin/overview`.
4. Role-aware `authenticate(...roles)`. The old `authenticate` and `authenticateMentee`
   exports are kept as wrappers.
5. Guard the admin routes. `POST /api/mentors` generates the password. Assign and remove
   mentor without duplicates.
6. `toJSON` strips `password` on all user models.
7. `Counter` model and enrollment generator. Program `code`. Unique index on
   `enrollmentNumber`.
8. Mentee password hashing, legacy plaintext upgrade, `POST /api/mentees/:id/reset-password`.
9. Ownership checks on all mentor and mentee mutations. Auth on
   `GET /api/:programId/mentees|resources`.
10. `services/scoring.js`: streak, late penalty, quiz scaling, total recompute.
    `/complete` limited to videos.
11. Quiz: unlocked by default, time window enforced, `PATCH /api/resources/:id`.
12. `GET /api/mentors/me`, `GET /api/m/me`, `PATCH /api/m/me` (interests, bio).
    `GET /api/m/leaderboard?program=`. `GET /api/stats`.
13. Login rate limit. `CORS_ORIGIN` allow-list.
14. `scripts/seed.js` (admin, 2 programs, 2 mentors, 6 mentees with realistic history) and
    `scripts/dev-mem.js`.
15. `.env.example`. Untrack `backend/.env`.
16. Tests: `auth`, `admin`, `mentor`, `quiz`, `project`, `mentee`, `leaderboard`, `scoring`.
    Re-run the baseline probe to show the defects closed.

Exit criteria: `npm test` is green, every backend defect from the audit is covered by a
test, and a smoke run passes against a live server.

**Status: done.** Evidence is in `docs/evidence/phase1/`. The baseline probe is kept as the
upstream record. It cannot be re-run unchanged, because it calls admin routes with no token,
which are now refused.

## Phase 2: frontend foundation (UI/UX 10, Code quality 5)

- Tailwind v4 through `@tailwindcss/postcss`. Tokens from `DESIGN_SYSTEM.md` in
  `globals.css`. Fonts through `next/font`.
- `lib/api.js` rewritten around `NEXT_PUBLIC_API_URL`, keeping the old export names.
  `lib/session.js` and `useSession`.
- UI primitives: Button, Field, Card, Stat, DueChip, Table → cards, Toast, Dialog,
  CredentialCard, Skeleton, EmptyState, Tabs.
- `AppShell` for authenticated routes. `/login` with role tabs. `RequireRole`.
- Bootstrap import moved off the authenticated routes.

Exit: `next build` passes, and screenshots at 375 and 1440 are taken of `/login`.

**Status: done.** Evidence is in `docs/evidence/phase2/VERIFICATION.md`. Changes from the plan:
- Routes are split into `(site)` (upstream public pages, legacy CSS) and `(app)` (new
  shell). URLs are unchanged.
- Bootstrap is compiled down to grid, card, nav and navbar, with no Reboot or utilities.
  Its `!important` utilities were measured overriding Tailwind after client-side
  navigation.
- Semantic classes are namespaced `tn-*`.
- The upstream admin, mentor, mentee and profile components were deleted rather than kept
  compiling. Their routes now render the new shell with read-only overviews from the real
  API, and Phases 3–4 add the actions.
- `axios` and the junk dependencies were removed.

## Phase 3: admin console + mentor studio (Role flow 10, UI 10)

- Admin: overview counts, programs list and create, program detail (mentors, assign and
  remove), onboard mentor → CredentialCard.
- Mentor studio:
  - Overview: due-soon, pending reviews, cohort leaderboard.
  - Mentees: add → CredentialCard with enrollment number, reset password.
  - Resources: create video, project or quiz, with a visual quiz builder; edit and lock.
  - Review queue: score with a slider capped at max.

Exit: `next build` passes, and a browser-pane walkthrough against `dev:mem` is recorded
with screenshots.

**Status: done.** Evidence is in `docs/evidence/phase3/VERIFICATION.md`. Changes from the plan:
- The walkthrough is a repeatable script (`frontend/scripts/ui-walkthrough.mjs`, using
  puppeteer-core with the installed Chrome) instead of a manual recording.
- The login rate limiter now counts only failed attempts. Verification showed that counting
  successes locks out a whole lab on one IP.
- Quiz questions can't be edited after publishing (timing, title, score and lock can).

## Phase 4: mentee workspace + leaderboard (Role flow 10, UI 10)

- Due-first timeline (Overdue / This week / Later / Done), a stats row, the quiz runner
  (one question per step, timer to `endTime`, review on submit), and project submission
  with validation.
- Leaderboard: program switcher, podium, own row pinned, auto-refresh.

Exit: build passes, and the complete mentee flow is walked through in the browser pane.

**Status: done.** Evidence is in `docs/evidence/phase4/VERIFICATION.md`. Also delivered in this phase:
- Typography moved to IBM Plex Sans and Mono, self-hosted. Italic accents and greeting
  headers are gone.
- `npm run dev:persist`, a persistent local MongoDB, plus `npm run check:persistence`.
- A documented leaderboard formula with history-based week movement.
- Quiz answers are hidden until the quiz closes. Quizzes are frozen after the first attempt.

## Phase 5: AI profile + Render Workflow (AI 8, Backend 7, Render track)

- `facts`, `badges`, `avatar` and `writer`, each with unit tests. `ProfileSnapshot` model.
  Profile routes.
- Gemini adapter (the user has a free key), validated JSON, rules fallback.
- `workflows/` package with the `generate-profile` task. Verify the SDK code shape against
  `render-examples/render-workflows-examples-ts` before writing it. Test with the Render CLI
  local task server, if the CLI is installed.
- UI:
  - Hero with the generative avatar and name.
  - Evidence-backed stat cards.
  - Mastery rings.
  - Badges with "because".
  - Summary and recommendations, linking to real resources.
  - Interests editor.
  - Regenerate button, with runner and engine shown.
  - Mentor view of any mentee.

Exit: tests are green, and the profile is generated through both the rules and Gemini
paths, with logs saved.

**Status: done.** Live Gemini was verified on 2026-11-13. Evidence is in
`docs/evidence/phase5/VERIFICATION.md`. The rules path is verified end to end, including
through a real Render Workflows task run on the local task server. Gemini was verified live (5 profiles). The Claude adapter is verified against a
stub only, because there's no Anthropic key.

## Phase 6: public site, polish, deploy (UI 10, Code quality 5)

- Restyle home, team, FAQ and techboard with their existing content. Add a live proof strip
  from `/api/stats`.
- Responsiveness pass at 375, 768 and 1440. Accessibility pass: focus, labels, contrast.
- Extend `scripts/ui-walkthrough.mjs` to the full demo script, including the mentee and
  profile flows. (It replaces the Playwright plan: it uses puppeteer-core with the installed
  Chrome, so there's no browser download.)
- `render.yaml`, deploy, and point the frontend at the API. README, DEMO_SCRIPT and the
  final matrix.

**Needs the user:**
- a MongoDB Atlas URI
- the Render account and credit redemption (every member)
- the Gemini key in Render env
- a GitHub fork to deploy from

**Phase 6 status: done, except the deployment itself.**
- Public site redesigned with upstream content carried over. Bootstrap and all legacy CSS and
  libraries removed.
- axe WCAG 2.1 AA audit: 0 violations on 46 page checks, after fixing light-mode contrast
  and inline links.
- Keyboard-only check passes.
- `render.yaml`, `SEED_DEMO`, README and DEMO_SCRIPT written.
- Evidence: `docs/evidence/phase6/VERIFICATION.md`.
- Deployment needs your MongoDB Atlas URI, a GitHub fork and the Render account.
