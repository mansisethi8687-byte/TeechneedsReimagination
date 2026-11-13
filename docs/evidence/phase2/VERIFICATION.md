# Phase 2: frontend foundation verification

Run on 2026-11-13. The backend was `npm run dev:mem` (in-memory MongoDB plus the demo seed) on
:8000. The frontend was checked twice: under `next dev` on :3300, and as a production build
under `next start` on :3301. All checks went through the browser pane.

## Build

- `frontend-build.txt`: `next build` compiles with no warnings and generates 15 routes.
- Backend: `npm test` still passes 31/31 (unchanged in this phase).

## What was checked, and the result

| Check | How | Result |
|---|---|---|
| Sign in, mentee | Demo account → Sign in | Lands on `/dashboard`. Real data: 340 points, rank #3 of 10, 6-day streak, open quiz flagged. Screenshots: `mentee-today-*`. |
| Sign in, mentor and admin | Seeded accounts | `/mentor` shows 1 program and 3 projects to review. `/admin` shows 2 programs, 2 mentors, 10 mentees, 4 awaiting review. Screenshots attached. |
| Wrong password | Typed into the form | Inline message "That combination didn't match…". No session created. |
| Role guard: wrong role | Mentor opens `/admin` | Redirected to `/mentor` |
| Role guard: signed out | Fresh load of `/admin` with no session | `/login?role=admin&next=%2Fadmin`, Admin tab preselected |
| Expired or forged token | Session with a bad token, load `/dashboard` | API 401 → session cleared → `/login?role=mentee&next=%2Fdashboard` |
| Upstream session migration | Set upstream's `token` and `mentor` keys, load `/mentor` | Signed in as Nikita. Legacy keys removed. `tn-session` written. |
| Live stats on `/login` | `/api/stats` | "2 programs · 10 mentees · 44 completed tasks", labelled live |
| Dark and light themes | `prefers-color-scheme` emulation + toggle | Both render from the token set. Screenshots of each. |
| 375px, no horizontal scroll | Mobile emulation | `scrollWidth 375 / clientWidth 375` on `/dashboard` and `/login` |
| Console | Production build | No errors except the 401 from the deliberate forged-token test |

## Legacy CSS isolation (the important one)

The upstream public pages still use Bootstrap and global CSS. **First attempt:** import
`bootstrap.min.css` into a low-priority `@layer legacy`. Measured after a client-side
navigation from `/` into the app, the stat card padding was **24px instead of 20px**.
Bootstrap's utilities (`.p-4 { padding: 1.5rem !important }`) share Tailwind's class names.
For `!important` declarations the cascade-layer order is reversed, so the lowest layer wins.

**Fix:**
- Compile only the Bootstrap components the legacy pages use (grid, card, nav, navbar,
  transitions) from Bootstrap's Sass, with no Reboot and no utility API (`app/(site)/legacy.scss`).
- Namespace the new UI's semantic classes as `tn-display`, `tn-heading`, `tn-serif` and
  `tn-num`. `techboard.css` and `team.css` define their own `.heading`, which would have
  turned card titles `#333`.
- Scope the upstream `body` and `*` rules to a `.legacy-site` wrapper.

**Re-measured on the production build.** Client-side navigation went `/team` → `/techboard`
→ `/faq` → `/dashboard`. Afterwards the Bootstrap navbar CSS, `team.css` and the legacy
`.heading` rule were all still loaded, and the new UI was unaffected:

```
statPadding: 20px            (Tailwind sm:p-5, correct)
card title:  Bricolage Grotesque, 18px, token ink colour
h1:          weight 800
bootstrap utilities present: false
```

## Not covered in this phase

- No automated browser test yet. The Playwright smoke test is planned for Phase 6.
- The public pages (`/`, `/team`, `/faq`, `/techboard`, `/leaderboard`, `/profile`,
  `/eventspage`) still have the upstream design. They were only checked for still
  rendering. Phase 6 restyles them.
- The role workspaces are overviews only. Creating programs, mentors, mentees and resources
  is Phase 3. Taking quizzes and submitting projects is Phase 4.
- The upstream components for admin, mentor, mentee and profile were deleted. Their routes
  now use the new shell, and the full replacements are built in Phases 3–5.
