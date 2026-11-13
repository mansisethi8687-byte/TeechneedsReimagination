# Repository audit: `Agarwalvidu/tn_web`

Audited at upstream commit `4e92e67` ("leaderboard changes"), 74 commits. Cloned to
`~/Applications/techneeds-reimagathon`. The remote is renamed `upstream` and its push URL
is set to `DISABLED`, so nothing from this checkout can reach the original repository. All
work happens on the `reimagathon` branch.

**How to read this document.** "Works" means we exercised it. Either the build succeeded,
or `backend/scripts/baseline-probe.js` called the unmodified API against a throwaway
in-memory MongoDB. Raw output is in `docs/evidence/phase0/`. "Broken" means we reproduced
the failure or read it directly in the source. Nothing here describes our planned work as
already existing.

---

## 1. Stack

| Layer | What is actually there |
|---|---|
| Frontend | Next.js **15.3.0** (App Router), React 19, plain JavaScript (no TypeScript), `jsconfig` alias `@/* → src/*` |
| Styling | Bootstrap 5.3 CSS imported globally in `layout.js`, plus per-component plain CSS, one SCSS module, and `style jsx` blocks. Tailwind v4 is listed in devDependencies but has no PostCSS config, so it is **not active**. |
| Frontend libs | axios, recharts 3, gsap, lottie-react, Font Awesome (three packages), jwt-decode (unused). Two junk deps: `gasp`, `saas`. `fontawesome` 5 is also redundant. |
| Fonts | Geist and Geist Mono are loaded, but `globals.css` overrides the body with `Arial, Helvetica` |
| Backend | Node + Express **5.1**, Mongoose **8.13**, bcryptjs, jsonwebtoken, cors, dotenv. CommonJS. No tests, no linter. |
| Database | MongoDB through `MONGO_URI` |
| Hosting (implied) | The frontend calls a hard-coded `https://tn-backend-1.onrender.com`. The live site is on Vercel. |

## 2. Routes and page components

| Route | Component | State |
|---|---|---|
| `/` | `components/Home/homepage.js`: particle hero, CrazyCubes, About, Mentorship, Glimpse, Testimonials | Marketing page. Builds. |
| `/techboard` | `Techboard/techboard.js` | Static content |
| `/team` | `Team/team.js` (1,122 lines of hand-written cards) | Static content |
| `/faq` | `FAQnTest/FAQ.js` + `Testimonials.js` | Static content |
| `/leaderboard` | `Leaderboard/leaderboard.js` | Calls the live API. Global table. |
| `/mentee` | `mentee/login.js` | Mentee login |
| `/dashboard` | `mentee/dashboard.js` (+ `QuizAttempt`, `ProjectSubmission`) | Mentee dashboard |
| `/mentor` | `mentor/mentorPanel.js` (+ `projects.js`) | Mentor login and the whole mentor panel on one page |
| `/admin` | `components/adminPanel.js` | Unstyled forms. **No login.** |
| `/profile` | "Coming Soon" placeholder | `components/profile/profile.js` exists but **no route renders it** |
| `/eventspage` | "Coming Soon" placeholder | Commented out of the nav |

Shared: `navbar/navbar.js` (animated selector, toggled by DOM manipulation) and `footer/footer.js`.
The `metadata` in `layout.js` still reads "Create Next App".

## 3. Database models (`backend/models`)

- **Mentor**: name, email (unique), password (bcrypt), programs[] → Program
- **Program**: name, mentors[] → Mentor, resources[] → Resource
- **Resource**: title, type ∈ {video, quiz, project}, url, deadline (default now+7d), maxScore (default 300), program → Program (required), quiz → Quiz, isLocked
- **Quiz**: resource → Resource, questions[{questionText, options[], correctOptionIndex, marks}], startTime, endTime, revealScores
- **QuizSubmission**: quiz, mentee, resource, answers[{questionIndex, selectedOptionIndex}], score. Unique on (quiz, mentee).
- **Mentee**: email, name, enrollmentNumber, password (**plaintext**), programs[], completedResources[{resource, completedOn, score, githubLink, deployedLink, description, submittedOn, verified}], streak, totalScore, lastActiveDate, createdBy. Unique index on the **pair** (email, enrollmentNumber).

There is **no Admin model** and no role field anywhere.

## 4. Authentication and authorization

- JWTs are signed with `JWT_SECRET`, expire in 7 days, and are sent in the `x-auth-token` header.
- `authenticate` (mentor) and `authenticateMentee` both live in `middleware/authMentor.js`. Both tokens carry only `{ id }`, with no role.
- Mentor login uses bcrypt.
- Mentee login compares plaintext passwords (`password === mentee.password`).
- **Admin has no authentication at all.** Creating programs, creating mentors and assigning mentors are open to anyone.
- Several read routes are unauthenticated, including `GET /api/:programId/mentees`, which returns every mentee's plaintext password.
- On the client, tokens go to `localStorage` under the keys `token`, `mentor`, `menteeToken` and `selectedProgram`.

## 5. Flows, verified against the running upstream API

Probe: `node backend/scripts/baseline-probe.js`, 26 checks. The probe also writes "PASS" for
checks that *confirm a defect*. The notes in the last column say which these are.

| Flow | Result | Notes |
|---|---|---|
| Admin creates program | ✅ works | No auth |
| Admin creates mentor | ✅ works | Admin types the password. Response returns the bcrypt hash. |
| Admin assigns mentor to program | ✅ works | UI only lists mentors with **zero** programs, so a mentor can never join a second program from the UI |
| Mentor login | ✅ works | |
| Mentor adds mentee, temp password generated | ✅ works | `Math.random().toString(36).slice(-8)` |
| Enrollment number auto-generated | ❌ missing | The mentor types it. The problem statement requires auto-generation. |
| Duplicate enrollment number rejected | ❌ broken | A second mentee with the same enrollment number and a different email is accepted (201). Login then picks whichever record matches first. |
| Mentor posts video or project | ✅ works | `deadline` and `maxScore` are not editable in the UI. Backend defaults apply (7 days, 300). |
| Mentor posts quiz | ✅ API works | Resource is created with `isLocked: true` and **no route unlocks it** |
| Mentee login | ✅ works | Plaintext comparison |
| Mentee dashboard | ✅ works | Crashes if a completed resource was deleted (`item.resource._id` on null) |
| Mentee completes video | ✅ works | Full `maxScore` for one click. Late penalty is 1 point a day. |
| Mentee submits quiz | ❌ **broken** | Always `403 Quiz is locked`. The UI hides the button for locked resources, so quizzes are unusable end to end. |
| Mentee submits project (API) | ✅ API works | |
| Mentee submits project (UI) | ❌ **broken** | `ProjectSubmission.js` posts to `hhttps://…` (typo). Every UI submission fails. |
| Project "completed" without submitting | ❌ integrity bug | The dashboard shows a "Mark as Completed" checkbox on projects. `/complete` awards the full `maxScore` (probe: 200) with no GitHub link. |
| Mentor lists unverified projects | ✅ works | |
| Mentor verifies project (API) | ✅ works | |
| Mentor verifies project (UI) | ❌ **broken** | `projects.js` sends `localStorage.mentorToken`, but login stores `token`, so every verify is a 401 |
| Leaderboard | ✅ works | Global across all programs. Score is computed from `completedResources`. `Mentee.totalScore` is updated separately and drifts. |
| AI profile | ❌ missing | `/profile` is a placeholder. The orphaned `profile.js` reads `completedResources`, which the dashboard response does not include. |
| `GET /api/mentors/me` | ❌ missing | Referenced by `lib/api.js` and returns 404 |
| Unknown program id | ❌ 500 | Every `Program.findById(...).mentors` call crashes on null |

## 6. REST endpoints (as implemented)

Base path `/api`. Auth: **M** = mentor token, **E** = mentee token, **none** = open.

| Method | Path | Auth | Request body | Response |
|---|---|---|---|---|
| POST | `/api/mentors` | none | `{name, email, password}` | 201 mentor doc (includes the hash) |
| GET | `/api/mentors` | none | – | mentors with programs populated (hashes included) |
| POST | `/api/mentors/login` | none | `{email, password}` | `{token, mentor}` |
| GET | `/api/programs` | none | – | programs with mentors populated (hashes included) |
| POST | `/api/programs` | none | `{name}` | 201 program |
| POST | `/api/programs/:programId/add-mentor` | none | `{mentorId}` | `{program, mentor}` (pushes duplicates if repeated) |
| POST | `/api/resources` | M | `{title, type, url, program, deadline?, maxScore?}` | 201 resource |
| POST | `/api/resources/quiz` | M | `{title, program, questions[], startTime, endTime, maxScore}` | 201 `{message, resource, quiz}` |
| POST | `/api/mentees` | M | `{email, name, enrollmentNumber, programId}` | 201 `{mentee, tempPassword}` |
| GET | `/api/:programId/mentees` | none | – | mentees, **with plaintext passwords** |
| GET | `/api/:programId/resources` | none | – | resources, newest first |
| PATCH | `/api/:menteeId/resources/:resourceId/verify` | M | `{score}` | `{message, finalScore}`. Does not check that the mentor owns the program. |
| GET | `/api/unverified-projects` | M | – | `{unverifiedProjects:[{menteeId, menteeName, resourceId, resourceTitle, githubLink, deployedLink, description, submittedOn}]}` |
| POST | `/api/m/login` | none | `{enrollmentNumber, password}` | `{token}` |
| GET | `/api/m/dashboard` | E | – | `{name, streak, totalScore, rank, programs:[{…, resources:[{…, completed, score, completedOn}]}]}` |
| POST | `/api/m/resources/:id/complete` | E | – | `{message, score}` (no type check, no program-membership check) |
| GET | `/api/m/resources/:id/quiz` | E | – | `{title, description, questions:[{id, questionText, options}]}` |
| POST | `/api/m/resources/:id/quiz/submit` | E | `{answers:[{questionId, selectedOptionIndex}]}` | `{message, score}` (raw marks, not scaled to `maxScore`) |
| POST | `/api/m/resources/:resourceId/project` | E | `{githubLink, deployedLink, description}` | `{message}` |
| GET | `/api/m/leaderboard?limit&skip` | none | – | `[{rank, name, totalScore, streak}]` |
| GET | `/` | none | – | "Mentorship API Running" |

## 7. Defects, ranked by demo impact

**Blocks a required flow**
1. Quizzes are permanently locked, so the mentee quiz flow cannot work.
2. Project submission URL typo (`hhttps`), so the UI project flow cannot work.
3. Project verification sends the wrong token key, so the UI mentor scoring flow cannot work.
4. Admin has no login and no role. The problem statement requires an admin panel with permissions.
5. Enrollment numbers are not auto-generated (an explicit requirement).
6. Mentor credentials are typed by the admin, not generated (an explicit requirement).
7. No AI profile page (an 8-mark rubric item).

**Security and integrity**
8. Mentee passwords are stored in plaintext and served unauthenticated by `GET /api/:programId/mentees`.
9. Mentor bcrypt hashes are returned by `/api/mentors`, `/api/programs` and the login response.
10. `backend/.env` is **committed**, with a live `MONGO_URI` and `JWT_SECRET` for the upstream team's database. We do not use these credentials. Our branch stops tracking the file. The secret stays in upstream history, which only its owners can rotate; we should tell them.
11. "Mark as Completed" awards full score on projects and quizzes without any submission.
12. `/complete` and `/verify` do not check that the mentee or mentor belongs to the resource's program.
13. `CORS` is fully open, and there is no rate limit on either login endpoint.

**Correctness**
14. Enrollment-number uniqueness is only enforced in combination with email.
15. A null program or resource gives a 500 instead of a 404, across most routes.
16. The quiz score ignores `maxScore`, so a 5-question quiz worth "300" yields at most 5 points.
17. `Mentee.totalScore` is incremented on verify but never on completion. The leaderboard and dashboard recompute from `completedResources`, so the stored field is stale.
18. The leaderboard is global, not per program.
19. `addedBy` is written to Resource but is not in the schema, so it is silently dropped.
20. Default `PORT` is 5000, while the problem statement says the local backend runs on **8000**.
21. Eight frontend files hard-code `https://tn-backend-1.onrender.com`: `lib/api.js`, which uses fetch and is shared by the admin and mentor panels, plus seven components that call axios inline (11 occurrences in total).

**Frontend quality**
22. Bootstrap, three Font Awesome packages, Tailwind (inactive), SCSS and `style jsx` are all mixed together. There is no design token system.
23. Every success and error goes through `alert()`. Mentor actions trigger a `window.location.reload()`.
24. The mentor panel puts login, program select, add mentee, add resource, the quiz builder, tables and verification on one scroll. The quiz "correct option" is a raw 0–3 number input.
25. The admin panel is unstyled HTML.
26. Deadlines render as raw ISO strings.

## 8. Environment, build and deployment

- Node 20.19 locally. Both packages install cleanly with `npm ci`.
- **Frontend build: passes** (`next build`, 14 static pages; log in `docs/evidence/phase0/frontend-build-baseline.txt`). Lint runs as part of the build with no ESLint config.
- Backend has no build step. It starts with `node index.js` and needs `MONGO_URI` and `JWT_SECRET`. Without Mongo it `process.exit(1)`s.
- **Deployment blockers:**
  - No `render.yaml`.
  - The backend URL is hard-coded in eight files.
  - There is no MongoDB we own. We need a MongoDB Atlas free cluster, because Render has no managed Mongo.
  - There is no seed or demo data, so a fresh deploy shows empty dashboards.
  - There is no way to create the first admin.
- Local tooling: no `mongod` and no Docker on this machine. `mongodb-memory-server` (now a backend devDependency) downloads a real `mongod` binary for tests and demos.

## 9. What to preserve

- **Data model.** Keep the Program, Mentor, Mentee, Resource, Quiz and QuizSubmission collections and field names, and extend them. Any data already in the TechNeeds database stays readable. This includes legacy plaintext mentee passwords: we upgrade them to bcrypt on the next successful login instead of breaking those accounts.
- **Endpoint paths and response shapes.** Keep them all. We fix behaviour behind them and add new routes beside them. Response shapes only gain fields. The one exception is password fields: these are removed from responses, which is the point of the fix.
- **The rank and leaderboard aggregation.** It is correct and well ordered (score, then streak, then recency, then id). We reuse it and add a program filter.
- **Streak and late-penalty logic.** Keep it, and move it into a shared module so every completion path uses it.
- **Content.** Keep the team roster, FAQ, techboard, testimonials, logo and imagery. We restyle the content; we do not rewrite it.
- **Next.js App Router layout and route names.** Keep them (`/mentee`, `/mentor`, `/admin`, `/dashboard`, `/leaderboard`, `/profile`) so existing links keep working.
