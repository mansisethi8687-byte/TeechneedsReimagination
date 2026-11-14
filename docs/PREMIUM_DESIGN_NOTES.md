# Current hero update

The user rejected the star/character artwork. It has been removed from the frontend and public assets. The current hero uses the original TechNeeds logo in a CSS 3D medallion with animated metallic rings and an extruded TechNeeds wordmark (`brandSculpture.module.css`). The character-related notes below are historical.

# TechNeeds: premium public experience, revision 2

## References actually inspected

- [CRED](https://cred.club/): cinematic scale, a dominant art object, short headline hierarchy.
- [Apple](https://www.apple.com/): hero-sized imagery and uncluttered primary actions.
- [Linear](https://linear.app/): explaining the product through a visible interface.
- [Stripe](https://stripe.com/): color and contrast shifts to pace the page.
- [Duolingo](https://www.duolingo.com/): a friendly brand character and tactile learning interactions.
- [Awwwards](https://www.awwwards.com/): expressive editorial scale and prominent visual work.
- [Vercel](https://vercel.com/): public page text inspected through the web tool; the browser
  redirected to the signed-in dashboard, so no marketing-page visual review is claimed.

These are design references, not copied assets or layouts. The user's existing IBM Plex
preference is retained. No serif/italic decoration was added.

## Implemented

- Full-width cinematic hero with original blue character artwork, light pointer parallax,
  floating motion, pill CTA and working existing onboarding links.
- Six-track keyboard-accessible cohort explorer. Each selection changes the artwork,
  description, lead and focus areas. Track previews describe possibilities, not an inventory
  of currently assigned API resources.
- Illustrated workspace explanation, clearly marked Product preview.
- Interactive JavaScript sample challenge: select, validate, incorrect feedback, correct
  feedback, finite celebration and reset. It is explicitly a preview and saves no score.
  This is independent of actual mentor quizzes and never requests their answer keys.
- Existing API-driven leaderboard and live counts; community history remains labelled.
- All eight original testimonials remain available.
- Public header/footer redesign and coordinated Team/FAQ typography and layout.
- Motion pause control, native reduced-motion support, keyboard controls, theme support.

## Original artwork

Built-in imagegen tool used. Final asset:
`frontend/public/art/techneeds-spark.webp` (1536 × 1024, 88,288 bytes).
The optimized WebP is served directly to avoid unnecessary second compression.
No external runtime image host or animation dependency is required.

Prompt:
> Use case: stylized-concept. Create an exceptional premium 3D brand artwork for a university developer mentorship community named TechNeeds. Wide landscape composition, 1536x1024. A large, tactile inflated four-point star-shaped character, electric cobalt blue soft glossy ceramic, two tiny recessed dark oval eyes, no mouth, sophisticated playful designer collectible, NOT a robot and NOT an owl. It floats slightly above a brushed aluminum sculptural curved ramp / orbital loop, with two small off-white rounded keyboard keycaps bearing simple code symbols < and >, and one small reflective chrome sphere. Composition: hero sculpture fills the RIGHT TWO THIRDS, left third mostly empty dark. Deep midnight almost black #08090d studio backdrop with subtle blue light pool at bottom and crisp luminous rim lighting. Luxury product campaign render, physically plausible materials, soft studio shadows, exquisite bevels and surface detail. Strong volumetric form, sharp geometry, art-directed asymmetry, not a generic technology globe. Camera slightly low looking up, subject heroic and joyful. Keep all main objects fully within frame. No words, no logos, no UI, no chart, no mock website. This is one artwork to place in a real website, not a screenshot.

## Boundaries

The dark hero and light editorial/challenge sections are intentional campaign palettes in
both theme modes. Product/community sections, header, footer and other public pages use
the existing theme tokens. Dashboard, authentication, scoring, persistence and mentor/admin
business logic have not been changed. No upstream push or Render deployment was performed.
