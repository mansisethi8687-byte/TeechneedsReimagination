# Design system

Phase 2 implemented the tokens, type and primitives (`frontend/src/app/globals.css`,
`frontend/src/components/ui`). Upstream had none: Bootstrap, ad-hoc CSS and inline styles
(see the audit, §7.22).

## Where the taste comes from, and what we can and cannot see

I have access to the user's portfolio source (`~/Applications/portfolio`) and to saved notes
about their feedback. I have not seen it rendered in this session. The choices below are
based on things I can point to in that source:

| Source (verifiable) | Choice it drives here |
|---|---|
| `portfolio/src/app/globals.css`: "Dark ground, one hot accent, one signal colour reserved for live data" | Same three-role colour logic |
| `--ink #08080a`, `--ink-2 #0e0e12`, `--paper #f4f5f7`, `--muted #8b93a1`, hairline `--line rgba(255,255,255,.09)` | The same neutral scale (ground, raised surface, text, muted text, hairlines) |
| `--signal #4ade80` "live / verified data only" | Green appears **only** on live or verified data: verified project, live leaderboard, workflow completed |
| `layout.tsx`: Bricolage Grotesque (display 600–800), Inter (body), Instrument Serif italic (one accent phrase per display line) | Same type stack |
| Saved feedback: **no spaced-out uppercase monospace labels, and no mono index numbers**; it "reads as AI-generated" | All eyebrows, labels, captions and numbers in Inter, sentence case, normal tracking. `tabular-nums` where digits align. Mono is allowed only inside something standing in for a document (a quiz code snippet), never as UI chrome. |
| Portfolio organising idea: every striking element is a real number (the live ncrhiring.in widget) | The proof strip, leaderboard and AI profile visuals are driven by API data. No fake stats like TamTam's "500+ / 94% / 4.9". |

**Where this deliberately departs from the portfolio.** The portfolio's one loud colour is
orange `#ff5a1f`, which is the user's personal brand. TechNeeds has its own identity: the
blue globe in `assets/logo.png`. The accent is a brightened logo blue, so the redesign still
reads as TechNeeds. The portfolio's "one warm accent" instinct survives as a single warm
**urgency** colour, used only for deadlines.

## Tokens

```css
:root {
  /* neutrals — dark ground */
  --ink:        #08080a;   /* page */
  --ink-2:      #0f1013;   /* raised surface: cards, panels */
  --ink-3:      #16181d;   /* inputs, hover */
  --paper:      #f4f5f7;   /* primary text */
  --muted:      #8b93a1;   /* secondary text */
  --line:       rgba(255,255,255,.09);
  --line-strong:rgba(255,255,255,.16);

  /* roles */
  --accent:     #4c9bff;   /* TechNeeds globe blue, brightened for dark ground: primary actions, focus, selection */
  --accent-soft:rgba(76,155,255,.14);
  --signal:     #4ade80;   /* live / verified ONLY */
  --urgent:     #ff7a45;   /* due ≤ 48h, overdue ONLY */
  --danger:     #f87171;   /* destructive + errors */
}
```

Light mode follows the same roles: paper `#fafaf7` ground, ink text, and accent darkened to
`#1f6fd6` for contrast. Phase 2 checks every text pair for AA contrast.

## Type

> **Phase 4 change, at the user's request.** IBM Plex Sans is the only interface face.
> IBM Plex Mono is used only for codes and identifiers. Bricolage Grotesque and the
> Instrument Serif italic accents are removed, and so are the greeting headers. The table
> below is the original Phase 0 proposal, kept for the record. The live rules are in
> `frontend/src/app/globals.css` (`tn-display`, `tn-heading`, `tn-num`, `tn-code`).


| Role | Font | Size and weight |
|---|---|---|
| Display (page heroes, profile name) | Bricolage Grotesque | clamp(2.4rem, 6vw, 4.5rem), 800, tracking −0.03em |
| Accent phrase inside display | Instrument Serif italic | inherit size, 400. One phrase per heading, at most. |
| H2 / panel titles | Bricolage Grotesque | 1.5–2rem, 700 |
| Body | Inter | 15/24, 400 |
| Labels, eyebrows, captions | Inter | 13px, 500, sentence case, **normal tracking** |
| Numbers (scores, ranks, counts) | Inter `tabular-nums` | as context. Big stats use display. |

**Class names in code.** These are `tn-display`, `tn-heading`, `tn-serif` and `tn-num`,
defined in `app/globals.css`. They are namespaced because the upstream CSS defines its own
`.heading`.

## Shape, depth, motion

- Radius 14px on cards, 10px on inputs, full pill on chips.
- Hairline 1px borders replace drop shadows. No glow, no glassmorphism, no gradient text.
- Motion: 150–250 ms ease-out on state changes. Number count-ups only where the number is
  real. A quiz timer that ticks. `prefers-reduced-motion` turns off all non-essential motion.
- Iconography: Lucide, 1.5 stroke, 18px. Emoji are removed from UI chrome (the current UI
  uses 🏆 🔥 🏅).

## Components (built in Phase 2, then reused)

`AppShell` (role-aware sidebar on desktop, bottom bar on mobile) · `Button` (primary,
secondary, ghost, danger; with loading state) · `Field` / `Input` / `Select` / `Textarea`
with inline errors · `Card` · `Stat` (label, value, delta, source) · `Badge` / `Chip` ·
`DueChip` (relative deadline, urgency colour) · `Table` that collapses to cards under 640px ·
`EmptyState` · `Toast` (replaces every `alert()`) · `Dialog` · `CredentialCard` (one-time
reveal, copy, "shown once") · `Skeleton` · `Avatar` (generative) · `Tabs`.

## Layout and responsiveness

- Desktop: 240px sidebar, content max-width 1120px, 24px gutters.
- Under 1024px: sidebar collapses to a top bar.
- Under 640px: bottom tab bar, single column, 16px gutters, tables become cards, no
  horizontal page scroll.
- Hit targets at least 40px. Visible focus rings in accent. Every form usable by keyboard.

## Voice

Plain and specific: "Due Thu · in 2 days", "Scored 18 of 20", "Generated from 7 completed
resources". No "universe", "unleash" or "supercharge". No fake marketing stats.
