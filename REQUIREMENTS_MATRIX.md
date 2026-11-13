# Requirements matrix

Each requirement from the official problem statement, mapped to its rubric marks, its
upstream state (verified in `REPOSITORY_AUDIT.md`), the planned implementation, and the
evidence we will produce.

**Status key:**
- **Upstream ✅**: works today.
- **Upstream ⚠️**: API works but the UI or integrity is broken.
- **Upstream ❌**: missing or broken.
- **Ours**: `planned` until a phase lands. It then becomes `done (phase N)`, with a link to
  the evidence. "API done" means the backend behaviour is implemented and tested, but the
  UI for it is not built yet.

Phase 1 evidence: `docs/evidence/phase1/` (31/31 tests, smoke run, defect closure table).
Phase 2 evidence: `docs/evidence/phase2/` (build log, browser verification, screenshots).
Phase 3 evidence: `docs/evidence/phase3/` (scripted 14-step UI walkthrough, 375px checks, 34/34 backend tests).
Phase 4 evidence: `docs/evidence/phase4/VERIFICATION.md` (46/46 tests, 20-step end-to-end walkthrough, persistence check 7/7).
Phase 5 evidence: `docs/evidence/phase5/VERIFICATION.md` (69/69 tests, 23-step walkthrough, real local Render Workflow run, live Gemini).
Phase 6 evidence: `docs/evidence/phase6/VERIFICATION.md` (public redesign, WCAG AA audit with 0 violations, keyboard check, deploy readiness).

## Rubric overview (40)

| Criterion | Marks | Where we earn it | Phase |
|---|---|---|---|
| Frontend UI/UX & redesign creativity | 10 | Design system, due-first mentee workspace, mentor studio, admin console, restyled public site | 2, 3, 4, 6 |
| User role flow & multi-panel integration | 10 | Role auth, guarded routes, all flows wired to the real API, seeded demo cohort | 1, 3, 4 |
| AI profile feature & innovation | 8 | Evidence-backed facts, generative avatar, badges, LLM narrative with rules fallback, Render Workflow | 5 |
| Backend integration & functionality (bonus) | 7 | Fixed upstream defects, admin model, enrollment generator, hashing, ownership checks, new endpoints, tests | 1, 5 |
| Code quality, responsiveness & presentation | 5 | Tests, a single API client, responsive layouts, README, demo script, deployed URLs | all, 6 |

## Requirement by requirement

| # | Requirement (problem statement) | Marks bucket | Upstream | Planned implementation | Evidence | Ours |
|---|---|---|---|---|---|---|
| A1 | Admin: create and configure programs or cohorts | Role flow | ⚠️ API works, no auth, unstyled UI | Admin-only `POST /api/programs` with `code` and description. `PATCH` for configuration. Admin console UI. | `admin.test.js`, Phase 3 screenshot | done (phase 1 API, phase 3 UI: create and edit programs) |
| A2 | Admin: onboard mentors into specific programs | Role flow | ⚠️ works. UI hides mentors who already have a program. | Admin-only assign and remove. Any mentor can join several programs. | `admin.test.js` | done (phase 3: assign and remove on the program page) |
| A3 | Admin: generate secure mentor login credentials | Role flow / Backend | ❌ admin types the password | Server generates a 12-character password, returned once. Credential card UI. | `admin.test.js` "generated password logs in" | done (phase 3: generated password in a one-time credential dialog) |
| A4 | Admin panel has dedicated access and permissions | Role flow | ❌ no admin auth | `Admin` model, `/api/admin/login`, role in JWT, guarded routes | `auth.test.js` "mentor token gets 403 on admin routes" | done (phase 1 API, phase 2 sign-in and role guards) |
| M1 | Mentor: add mentees to assigned programs | Role flow | ✅ API, ⚠️ UI reloads page | Ownership check, toast, inline list update | `mentor.test.js` | done (phase 3: Add mentee dialog) |
| M2 | Mentor: auto-generate unique enrollment numbers | Role flow / Backend | ❌ typed manually, not unique | Counter-based `TN-WEB26-001`, unique index | `mentor.test.js` "sequential + unique" | done (phase 1, phase 3 UI shows the generated enrollment number) |
| M3 | Mentor: auto-generate initial passwords | Role flow | ⚠️ generated, but stored in plaintext and readable unauthenticated | bcrypt hash, shown once, reset endpoint, never readable | `mentor.test.js`, `auth.test.js` "no password in any response" | done (phase 3: shown once, reset only) |
| M4 | Mentor: post videos | Role flow | ✅ (deadline and score not settable in UI) | Resource form with deadline, max score, tags | `mentor.test.js` | done (phase 3: video dialog with deadline, max score, topics) |
| M5 | Mentor: post quizzes | Role flow | ❌ quizzes permanently locked | Unlocked by default, availability window, visual builder, scaled scoring | `quiz.test.js` "mentee can submit; score scaled" | done (phase 3 builder, phase 4 mentee quiz UI with server grading) |
| M6 | Mentor: post projects | Role flow | ✅ API, ❌ UI submit and verify broken | Fixed URLs and token, review queue with scoring | `project.test.js` | done (phase 3 review queue, phase 4 mentee submit, resubmit and feedback) |
| M7 | Mentor: strict deadlines and max score per resource | Role flow | ⚠️ backend defaults only | Required in the form, editable through `PATCH /api/resources/:id`, late penalty kept | `mentor.test.js` | done (phase 3: set on create, editable, lock/unlock) |
| E1 | Mentee: log in with enrollment number and password | Role flow | ✅ (plaintext) | bcrypt, legacy upgrade on login, rate limit | `auth.test.js` "legacy plaintext upgrades" | done (phase 1 API + phase 2 `/login`) |
| E2 | Mentee: track and complete videos, quizzes and projects before deadlines | Role flow / UI | ⚠️ videos only. Quizzes and projects broken. Projects can be faked. | Due-first workspace, quiz runner, project submit, `/complete` limited to videos | `mentee.test.js`, Phase 4 screenshots | done (phase 4: Today, program view, video, quiz and project pages) |
| E3 | Mentee: earn scores | Backend | ⚠️ quiz score ignores maxScore, totalScore drifts | One scoring service, recompute total | `scoring.test.js` | done (phase 1 scoring, phase 4 documented formula) |
| E4 | Dynamic real-time leaderboard | Role flow / UI | ⚠️ global only, static fetch | Program filter, auto-refresh, own row highlighted, podium | `leaderboard.test.js`, screenshot | done (phase 4: in-app public leaderboard, own row, history-based movement, deterministic ties) |
| P1 | AI profile: dynamic AI avatar | AI | ❌ | Generative SVG from the mastery vector, deterministic | `avatar.test.js` "same input gives same SVG; changes with data" | done (phase 5: generative growth-ring avatar from topic mastery; deterministic, tested) |
| P2 | AI profile: personalised skill badges | AI | ❌ | Rule table, each with `because` evidence | `badges.test.js` | done (phase 5: rule-based badges with evidence) |
| P3 | AI profile: performance summary | AI | ❌ | LLM from the fact sheet, with deterministic fallback. Engine labelled. | `profile.test.js` (rules path), live LLM run log | done (phase 5: rules engine, plus live Gemini through Render Workflows with a numeric grounding check; Claude adapter stub-tested only) |
| P4 | AI profile: personalised learning recommendations | AI | ❌ | Recommendations must reference real resource ids (validated) | `profile.test.js` "no hallucinated resource ids" | done (phase 5: recommendations limited to real resource ids, validated) |
| P5 | Uses engagement, completions, leaderboard standing and interest tags | AI | ❌ (no interest tags) | `Mentee.interests[]`, editable. `facts.js` uses all four inputs. | `facts.test.js` | done (phase 5: engagement, completions, standing and interests all feed the facts) |
| P6 | Slick, interactive UI for mentees **and mentors** | UI / AI | ❌ | `/profile` for the mentee, `/profile/[id]` for mentors. Mentor profile shows cohort stats. | Phase 5 screenshots | done (phase 5: mentee profile, mentor profile, mentor view of a mentee) |
| S1 | Local setup: own `MONGO_URI`, backend on `localhost:8000` | Code quality | ⚠️ default port 5000, URL hard-coded in 8 files | `PORT` default 8000, `NEXT_PUBLIC_API_URL`, `.env.example`, `dev:mem` | README steps run from clean | done (backend port 8000, `.env.example`, `dev:mem` / `dev:persist`; frontend `NEXT_PUBLIC_API_URL`) |
| S2 | Do not modify the upstream repository | Rule | — | Push to upstream disabled. Work happens on the `reimagathon` branch, and is pushed to the team's own fork. | `git remote -v` | done (phase 0) |
| R1 | Render: each participant redeems credits | Submission rule | — | **Manual: each team member must do this themselves** | — | user action |
| R2 | Render Workflows (required for the Render track prize) | Bonus track | ❌ | `generate-profile` task, with in-process fallback | Workflow run id in a snapshot, Dashboard screenshot | done locally (phase 5: `generateProfile` task ran on the Render CLI local task server); deployed service needs your Render account |
| Q1 | Responsiveness | Code quality | ⚠️ partial | Breakpoints in `DESIGN_SYSTEM.md`, screenshots at 375, 768 and 1440 | Phase 6 | done (phase 6: 15 app pages and 5 public pages at 375px, 0px overflow; axe WCAG AA 0 violations, dark and light; keyboard path verified) |
| Q2 | Presentation | Code quality | — | README, demo script, deployed URLs, seeded demo accounts | Phase 6 | done (phase 6: README, DEMO_SCRIPT, render.yaml, seeded demo accounts); deployed URL pending your accounts |
