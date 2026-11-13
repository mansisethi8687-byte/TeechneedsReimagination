# Phase 1: defect closure

Each defect from `REPOSITORY_AUDIT.md` §7, with the test that now proves it fixed.

- Tests are in `backend/test/`, and the full run is in `npm-test.txt` (31/31 pass).
- `smoke-local.txt` is the demo flow against a running server, seeded through `npm run dev:mem`.

The baseline probe (`scripts/baseline-probe.js`) is kept unchanged as the record of upstream
behaviour. It cannot be re-run against the new API as-is, because it calls admin routes with
no token, and those calls are now refused (401). That refusal is the fix.

| # | Upstream defect | Status | Proof |
|---|---|---|---|
| 1 | Quizzes permanently locked | fixed (API) | `flows.test.js` › "M5 mentor posts a quiz; mentee takes it once…" |
| 2 | `hhttps` typo in project submit UI | **frontend, Phase 2/4** | API path verified in "M6 project…" |
| 3 | Verify sends wrong token key in UI | **frontend, Phase 2/3** | API verified in "M6 project…" |
| 4 | Admin has no login or role | fixed | `auth.test.js` › "admin routes reject anonymous, mentor and mentee callers" |
| 5 | Enrollment numbers not generated | fixed | `flows.test.js` › "M2/M3 enrollment numbers are generated, sequential and unique…" |
| 6 | Mentor password typed by admin | fixed | `flows.test.js` › "A1/A2/A3 …generated credentials" |
| 7 | No AI profile | **Phase 5** | — |
| 8 | Plaintext mentee passwords, readable without auth | fixed | `auth.test.js` › "mentee passwords are stored as bcrypt hashes", "program mentee list is no longer readable without auth" |
| 9 | Mentor hashes returned in responses | fixed | `auth.test.js` › "no response anywhere contains a password field" |
| 10 | `backend/.env` committed | untracked on our branch, deleted locally | Phase 0 commit. Upstream history still holds the secret; only the upstream owners can rotate it. |
| 11 | Checkbox completes projects for full score | fixed | `flows.test.js` › "M6 project: cannot be checkbox-completed…" |
| 12 | No ownership checks | fixed | `auth.test.js` › "a mentor from another program…", `flows.test.js` › "E2 mentee cannot complete a resource from a program they are not in" |
| 13 | Open CORS, no login rate limit | fixed (configurable) | `CORS_ORIGIN` env, `middleware/rateLimit.js`. Phase 3 changed it to count failed attempts only, and added `test/rateLimit.test.js`. |
| 14 | Enrollment number not unique on its own | fixed | "M2/M3…" (409 on duplicate) |
| 15 | Null program or resource gives 500 | fixed | `flows.test.js` › "unknown program returns 404 instead of 500" |
| 16 | Quiz score ignores maxScore | fixed | "M5…" (3 of 4 marks on a 100-point quiz = 75), `units.test.js` |
| 17 | `totalScore` drifts | fixed | `flows.test.js` › "E3/E4 dashboard totals match the leaderboard…", "mentor edits a deadline and deletes a resource; totals stay consistent" |
| 18 | Leaderboard only global | fixed | "E3/E4… program filter works" |
| 19 | `addedBy` dropped by schema | fixed | `models/Resource.js` |
| 20 | Default port 5000 | fixed (8000) | `config/env.js`. Smoke ran on :8000. |
| 21 | Backend URL hard-coded in 8 frontend files | **Phase 2** | — |
| — | `GET /api/mentors/me` missing | fixed | `auth.test.js` › "no response anywhere…" calls it |

## Compatibility notes (behaviour we deliberately changed)

- The **upstream admin panel UI no longer works unmodified**. It calls the admin routes
  without a token, and those calls are now refused. Phase 3 replaces it with the admin
  console, which signs in first.
- **Mentee upstream tokens still work.** A token with `{id}` and no role resolves by
  lookup. Test: "upstream-style tokens (id only, no role) are still accepted".
- **Existing plaintext mentee passwords still sign in** and are re-hashed on that login.
  Test: "legacy plaintext mentee password still logs in and is upgraded to a hash".
- **`/complete` now refuses quizzes and projects** (400). They must go through their real
  submit flows.
- **The upstream `isLocked` check on verify is dropped.** It stopped a mentor from grading
  any project they had locked.
