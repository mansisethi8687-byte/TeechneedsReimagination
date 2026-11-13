# Demo script (about 5 minutes)

Use a freshly seeded database (`npm run dev:persist`, or `SEED_DEMO=true` on Render). Open the
app in one window and keep the leaderboard open in another tab.

## 0. Public site (20 s)

Open `/`.
- The **live counts** and the **live leaderboard** come from the API. The community history
  (1200+ trained mentees and so on) is labelled as history, separately.
- Scroll through the cohorts, testimonials and the team (26 members, from the upstream
  roster).

## 1. Admin (45 s)

Sign in as admin (Admin tab → **Use demo account**).
1. Click **New program** and name it "Cloud Computing". The code `CC` is suggested.
2. Open the program, then click **New** under Mentors.
3. Show the **credential dialog**. The password is generated, shown once and stored only as a
   hash.

## 2. Mentor (75 s)

Sign out, then sign in as the new mentor with those credentials.
1. Open the program and click **Add mentee**. A **generated enrollment number**
   (`TN-CC26-001`) and password appear.
2. **Resources** tab:
   - add a video with a deadline, max score and topics
   - add a project
   - click **Quiz** and build two questions, clicking the circle to mark each correct answer
3. Point out the row menu: who's done it, edit, lock and delete.

## 3. Mentee (75 s)

Sign in as the new mentee.
1. **Today** lists the three items in deadline order.
2. Watch the video and mark it watched: 40/40.
3. Take the quiz:
   - one question at a time, with progress and a countdown
   - **Review answers**, then **Submit**
   - it's graded on the server
   - mention that answers stay hidden until the quiz closes, so classmates can't share them
4. Submit the project. The status shows **Awaiting review**.

## 4. Mentor review (20 s)

As the mentor, go to **Review**. Score the project 170/200 with feedback.

## 5. Mentee sees it (30 s)

As the mentee:
1. The project now shows **Reviewed 170/200** with the feedback, and it's final.
2. Today shows the feedback.
3. **Leaderboard**: 310 points, with the mentee's own row highlighted. Open "How points and
   ranks work" to show the formula.

## 6. AI profile (45 s)

Open **Profile**.
- **Header:** the avatar is drawn from topic mastery. The header shows "Written by Google
  Gemini", **"Ran as a Render Workflow task"** with the run ID, and **"Every number checked
  against the record"**.
- **Body:** evidence tiles, recommendations that link to real resources, and badges that each
  show the numbers that earned them.
- Open **How this profile was made**.
- Then sign in as the seeded mentee `TN-WD26-002` to show a richer profile, with partial rings
  and topic bars.

## If something goes wrong

- **First request is slow:** a free Render service is waking up, which takes about a minute.
  Open `/api/health` on the API before the demo.
- **Gemini quota or overload:** the profile still generates, written by the rules engine, and
  says why.
- **Workflow unavailable:** the API generates the profile itself and records `workflowError`.
