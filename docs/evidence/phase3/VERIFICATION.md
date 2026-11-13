# Phase 3: admin console and mentor studio verification

Run on 2026-11-13 against the production build (`next start`, :3301) and the API
(`npm run dev:mem`, :8000).

## Automated

| What | Result | File |
|---|---|---|
| `next build` | Compiles with no warnings, 20 routes | `frontend-build.txt` |
| Backend tests | 34/34 pass. This includes 3 new rate-limiter tests. | `npm-test.txt` |
| Scripted UI walkthrough in headless Chrome, driving the real UI by labels and visible text | 14/14 steps. No console errors and no failed requests. Ran twice back to back with the same result. | `ui-walkthrough.txt`, `01`–`09` screenshots |
| 375px overflow on every new page | 0px on all 7 | `mobile-overflow.txt`, `m-375-*` screenshots |

To reproduce:

```bash
cd frontend
WEB_URL=http://localhost:3301 API_URL=http://localhost:8000 SHOTS=../docs/evidence/phase3 node scripts/ui-walkthrough.mjs
```

### The walkthrough covers

1. The admin signs in through `/login`, then creates a program with the **New program**
   dialog. The code is suggested from the name.
2. The admin opens the program and onboards a mentor. The **credential dialog** shows the
   email, the generated password and the sign-in link.
3. The mentor signs in **with that generated password**.
4. The mentor adds a mentee. The credential dialog shows the **generated enrollment number**
   (for example `TN-CCI26-001`) and the password.
5. The mentor publishes a video (deadline, max score, topics) and a project.
6. The mentor builds a 2-question quiz in the **quiz builder**, marks the correct answers by
   clicking, and publishes it.
7. The mentor locks a resource from the row menu.
8. The mentee signs in with the generated credentials and submits the project. This step
   goes through the API, because the mentee's submit UI is Phase 4.
9. The mentor scores the project 170/200 with feedback in the **review queue**, and it
   leaves the queue.
10. The mentee's dashboard API shows the project as `verified` with score 170 and the
    feedback.
11. The admin sees the new program and mentor in the console.

## Problems found while verifying, and fixed

| Problem | How it showed up | Fix |
|---|---|---|
| **The login rate limiter counted successful sign-ins.** After 10 sign-ins in 15 minutes from one IP, every role was locked out. A lab behind one campus IP would hit this at the start of a class. | The walkthrough's second admin sign-in returned "Too many attempts" (`FAILED.png` from that run). | Only failed attempts count now: 8 per IP and account, plus a per-IP ceiling of 60 against spraying. 3 tests in `backend/test/rateLimit.test.js`. Two walkthrough runs back to back now pass. |
| No favicon. Every page made a 404 request for `/favicon.ico`. | The walkthrough fails on any failed request | `app/favicon.ico`, `icon.png` and `apple-icon.png`, generated from the TechNeeds logo on a light disc |
| On the admin program page at 375px, a long select option pushed the card 16px past the screen | Overflow measurement | Grid children get `min-w-0`, and the select shrinks |
| Three-across stat tiles truncated "Mentors" and "Mentees" to "Ment…" at 375px | Screenshot review | Stat icons are hidden below 420px so the labels fit |
| Below 1024px the quiz builder showed **Publish** before any question | Screenshot review | Below `lg`, Publish moves under the questions |
| Bricolage's capital Q has a long tail, so "Question 1" read as underlined, like a link | Screenshot review | Small labels use the body sans |
| `next build` once failed inside `next/font` | A Google Fonts download flake. A retry passed. | Not fixed. It's a deploy risk: the build needs network access to Google Fonts. |

## Not covered

- The mentee-facing quiz and project UI is Phase 4. In the walkthrough, the project is
  submitted through the API.
- Editing a quiz's **questions** after publishing isn't supported. You can edit timing,
  title, score and lock. Neither the API nor the UI offers question editing. That is
  deliberate, because mentees may already have answered.
- No automated accessibility audit yet (Phase 6). Keyboard flow was not walked through by
  hand. The dialogs are native `<dialog>`, so focus is handled by the browser.
- The `next build` lint step runs with no ESLint config.
