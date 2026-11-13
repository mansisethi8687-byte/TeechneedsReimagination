# Phase 6: public site, accessibility, deployment readiness

Verified on 2026-11-13. The setup was:

- the production web build
- the persistent API with **live Gemini**
- the Render CLI local task server, so AI profiles ran as real workflow task runs

## Results

| Check | Result | File |
|---|---|---|
| Backend tests | **69/69 pass** | `npm-test.txt` |
| End-to-end walkthrough (admin → mentor → mentee → review → leaderboard → AI profile, plus 15 pages at 375px) | **23/23 steps.** No console errors, no failed requests. | `ui-walkthrough.txt`, screenshots |
| **Accessibility:** axe-core WCAG 2.1 A/AA on 23 pages (public pages and every role's pages) × dark/light = 46 checks | **0 violations at any severity**, after fixes | `a11y-audit.txt` |
| Keyboard only: sign in, open a quiz from Today, start it, answer with arrow keys, move to the next question | **6/6 pass.** Focus moves to each question, and focus rings are visible (2px solid). | `keyboard-check.txt` |
| Public pages at 1440 and 375, dark and light: 12 captures | **0px overflow, 0 console errors** | `public-*.png` |
| Images actually load after scrolling (lazy loading) | Home 9/9, Team 28/28 | below |
| Production install (`npm ci --omit=dev`, as `render.yaml` runs it) | API, workflow entry and seed all load. No dev packages. | below |
| `SEED_DEMO=true` on an empty database, booted twice | Boot 1 seeds and the admin can sign in. Boot 2 doesn't reseed. | `seed-demo-boot.txt` |
| `next build` | Compiles with no warnings | `frontend-build.txt` |

## Public site

- **Redesigned in the design system:** Home, Team, FAQ, Techboard (the role router) and Events.
  - Bootstrap, Font Awesome (4 packages), GSAP, Lottie, Sass and Recharts are removed, along
    with every upstream legacy component and CSS file.
  - The home page's first-load JavaScript went from 130 kB to 115 kB.
- **Content is carried over, not invented.**
  - The **26-member team roster** was extracted from the upstream markup by script; all 26
    names match. Portraits use the same Cloudinary images with a face-centred crop, and all 26
    return 200.
  - Also kept: the **8 named testimonials** (extracted by script), the 6 cohorts with their
    leads, the mission, the offers list and the contact details.
  - Dropped: the FAQ page's unnamed generic testimonials ("game-changer for my tech needs"),
    and footer links to Terms and Privacy pages that didn't exist (`href="#"`).
- **Content I edited.** The "What is TechNeeds?" FAQ originally described the community as
  "technology solutions and support". It now uses the community's own *all you need to know
  about tech* framing. The "track my journey" answer now describes the real features, and I
  added one entry on scoring.
- **Live versus historical numbers.** The hero shows **live counts** and a **live leaderboard
  preview** (the largest cohort's top 5) from the API, labelled "Live". The community's
  historical figures (1200+ trained mentees and so on) sit in their own panel, labelled "Since
  2023, across the community".

## Accessibility findings and fixes

The first audit pass found **18 serious violations**.

1. **Light-mode contrast.** Accent, green and orange text on its own tinted background (badges,
   active nav, deadline chips) measured 4.09–4.48:1, below the 4.5:1 minimum.
   - New values were computed against every background they sit on:
     - accent `#1f6fd6` → `#1a5db5` (4.9:1 worst case)
     - green `#15803d` → `#116633` (5.4:1)
     - orange `#c2410c` → `#a33608` (5.2:1)
   - Dark mode already passed.
2. **Inline links.** Links inside sentences were told apart from the text only by colour
   (1.1:1). They're underlined now.

The second pass found 0.

## Deployment (`render.yaml`)

The Blueprint defines three services in Singapore:

| Service | Type and plan | Commands | Notes |
|---|---|---|---|
| `techneeds-api` | Node web, free | `npm ci --omit=dev`, `node index.js` | Health check `/api/health`. `JWT_SECRET` is generated. `RENDER_WORKFLOW_SLUG` comes from `fromService` (the workflow's `slug`). |
| `techneeds-web` | Node web, free | `npm ci && npm run build`, `npm start` | |
| `techneeds-workflows` | workflow (no `plan`; compute is set per task) | `npm ci --omit=dev`, `node workflows/main.js` | |

Keys were checked against Render's Blueprint spec:

- `type: workflow`, a required `region`, no `plan`, and `fromService.property: slug` are all
  in the spec.
- The spec doesn't say whether `buildCommand`/`startCommand`/`rootDir` apply to workflows. I
  included them, matching the Render CLI's workflow template.
- The spec has no `fromService` property for a public URL, so `NEXT_PUBLIC_API_URL` and
  `CORS_ORIGIN` are prompted values.

## Not verified

- **`render blueprints validate render.yaml`** needs a logged-in Render workspace. It returned
  "no workspace specified".
- **The deployment itself.** It needs a MongoDB Atlas URI, a GitHub fork and the Render
  account (with credits).
- **The Claude adapter** is tested against a stub only.
