# Phase 4: mentee experience, leaderboard and typography

Verified on 2026-11-13. The API ran in **persistent mode** (`npm run dev:persist`: a real
`mongod`, WiredTiger, data files in `backend/.data/mongo`). The web app ran as a production
build (`next start`, :3301).

## Results

| Check | Result | File |
|---|---|---|
| Backend tests | **46/46 pass**: 12 new learner tests, 3 rate-limit tests, all Phase 1–3 tests | `npm-test.txt` |
| End-to-end UI walkthrough in headless Chrome. Every step is a real click against the real API. | **20/20 steps.** No console errors, no failed requests. | `ui-walkthrough.txt`, `01`–`15` screenshots |
| 375px horizontal overflow, 13 pages across all three roles | **0px on all 13** | inside `ui-walkthrough.txt`, `m-375-*` |
| Persistence across a backend restart | **7/7 checks pass** | `persistence-check.txt` |
| `next build` | Compiles with no warnings. Fonts are self-hosted, so the build makes no network calls. | `frontend-build.txt` |

## The critical journey, as the walkthrough drove it

```
admin creates program → admin onboards mentor (generated password)
→ mentor signs in with it → mentor enrolls mentee (generated TN-… number + password)
→ mentor publishes video, project, 2-question quiz (builder) → locks/unlocks the video
→ mentee signs in with the generated credentials → Today lists the 3 items
→ mentee marks the video watched (40/40)
→ mentee takes the quiz: browser receives no answer key (checked) → server grades 100/100
  → result saved, answers hidden until the quiz closes → reload shows the saved attempt, no retry
→ mentee submits the project (empty repo link rejected first) → "Awaiting review"
→ mentor scores 170/200 with feedback in the review queue
→ mentee sees "Reviewed 170/200" + feedback; project is final; Today shows the feedback
→ activity history lists all four events → leaderboard: 40+100+170 = 310, own row highlighted
→ leaderboard is viewable signed out → admin console still lists the program and mentor
```

## Persistence: what is actually configured

| Mode | Command | Storage | After a restart |
|---|---|---|---|
| Tests | `npm test` | `mongodb-memory-server`, one throwaway database per test file | Discarded by design |
| Quick demo | `npm run dev:mem` | In-memory MongoDB, seeded on every start | **Data is lost** (by design) |
| **Local persistent** | `npm run dev:persist` | Real `mongod` (WiredTiger) writing to `backend/.data/mongo`. Seeds only when empty. | **Data kept** (verified) |
| Production | `npm start` with `MONGO_URI` | MongoDB Atlas | Kept, but **not set up yet**: it needs your Atlas URI |

**Evidence (`persistence-check.txt`).** The script does the following:

1. Starts a fresh data directory.
2. Writes a program, a mentor, a mentee and a graded quiz attempt through the API.
3. Stops the process with SIGTERM.
4. Starts it again on the same files.

Results after the restart:

- The counts are identical.
- The generated mentor and mentee logins still work.
- The quiz attempt and its score are still there.
- The seed did not re-run.

Separately, the preview API was restarted during this phase with real walkthrough data in it.
`/api/stats` read `{"programs":4,"mentors":4,"mentees":12,"completions":47}` both before and
after.

## Scoring formula (implemented in `backend/services/leaderboard.js` and shown in the UI)

- **Video:** its max score, minus 1 point per full day late. This is the upstream rule.
- **Quiz:** `round(maxScore × marks earned / total marks)`. One attempt, graded on the
  server, only inside its open window.
- **Project:** the mentor's score, which counts from the moment of review. An unreviewed
  project counts 0.
- **Order:**
  1. Points.
  2. Whoever reached that total earlier.
  3. Account order (`_id`).

  There are no exact ties, so identical reloads always give the identical order.
- **Week movement:** rank 7 days ago minus rank now, computed from the persisted timestamps
  of each scoring event. It is shown only for mentees who already had points 7 days ago;
  everyone else shows "—". The seeded demo cohort has backdated timestamps, so its movement
  values come from **synthetic seed history**. For real cohorts, movement comes from real
  activity.

## Security and quality checks (Part E)

| Requirement | How it is enforced | Test |
|---|---|---|
| Answer keys never reach the browser before submission | `GET /api/m/resources/:id`, `GET …/quiz` and the submit response never include `correctOptionIndex` while the quiz is open. The key is revealed only after it closes, and only if the mentor allows it. | `learner.test.js` › quiz: no answer key…, mentor can keep answers hidden…. The walkthrough also checks the fetched JSON. |
| Duplicate scoring | One quiz attempt, enforced by a unique index. 3 simultaneous submits give exactly one 200. Verifying a project twice gives 400. Completing a video twice doesn't re-score. | quiz: two simultaneous submissions…; project…; video… |
| Unauthorized submissions | A mentee can only see and act on their own program's resources. Mentor and mentee tokens aren't interchangeable. Only the program's mentor can score. | permissions…; project… (other mentor 403, mentee 403) |
| Validation | Every question must be answered with an in-range option. URLs must be http(s). The description needs 20+ characters. The score must be a number from 0 to max. | quiz: every question…; project… |
| Quiz frozen once attempted | Questions can't be edited through any API. After the first attempt, max score and opening time return 409, and only closing time, title, notes, topics and lock can change. | quiz: after the first attempt… |
| Deadlines | The quiz window is enforced on the server (403 before it opens and after it closes). Video late penalty. Projects are accepted late and flagged. | quiz: deadline enforced…; video…; project… |
| Keyboard and accessibility | Quiz options are native radios: arrow keys move between options and the focus ring is visible. Focus moves to each new question. The progress bar and question navigator are labelled. Dialogs use native `<dialog>`. | Manual check, plus the walkthrough selects by labels |

## Typography (Part A)

- **Fonts:** IBM Plex Sans for the whole interface. IBM Plex Mono only for codes and IDs:
  enrollment numbers, program codes, and passwords and links in credential cards. Both are
  self-hosted through `@fontsource` + `next/font/local`. The Google Fonts download had
  failed the build twice.
- **Removed:** the Bricolage display face, the Instrument Serif italic accents, and the
  greetings ("Hi, *Ishita*", "TechNeeds *at a glance*", "Hey *Aanya*, here's today", "Build
  a *quiz*").
- **New titles:** functional page titles (Overview, Studio, Today, New quiz) at 26–30px,
  weight 600, with a hairline divider under the header.
- **Numbers:** scores and ranks use Plex Sans 600 with tabular figures.
- **Blue:** used for interactive elements, focus, and the current user's row only.

## Problems found while verifying, and fixed

| Problem | Fix |
|---|---|
| The Google Fonts download failed `next build` twice (also seen in Phase 3) | Self-hosted IBM Plex. The build no longer needs network access. |
| Quiz progress bar width depended on a CSS transition finishing. In throttled or background rendering it showed 0%. | The width now updates directly, with no transition. |
| The public leaderboard opened on the newest program (a 1-person test cohort) | It opens on the largest cohort (`menteeCount` added to the public program list) |
| Score and Rank tiles used the same icon | Rank uses a medal |
| The walkthrough's waiter matched a toast's text before the list rendered | It now waits for the row's own control |

## Not covered, or limited

- **Atlas production database:** not configured. It needs your connection string.
  Persistence is proven with a real local `mongod`.
- **Quiz drafts** are saved in the browser (`localStorage`), not on the server. Switching
  devices mid-quiz loses unsent answers. The UI says so.
- **Quiz timer** is display only. The server enforces the window. There's no per-attempt
  time limit, only the quiz's open and close times.
- **Video completion** is self-reported ("Mark as watched"). Watch time isn't measured.
- **Streak** uses server-local calendar days (the upstream rule).
- **Accessibility:** no automated audit (axe or Lighthouse) yet; that is Phase 6.
- **Public pages** (home, team, FAQ, techboard) still have the upstream design.
