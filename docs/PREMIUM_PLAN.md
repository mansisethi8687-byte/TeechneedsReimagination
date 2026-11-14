# Premium public experience — revision 2

User explicitly requested a substantial redesign after reviewing the first iteration.

## Direction
Apple/CRED: a hero object with cinematic scale and confident short copy.
Linear: show and explain the product. Stripe: deliberate color transitions.
Duolingo: an original friendly character and a small interactive learning moment.
Keep IBM Plex, real data, working role flows, and reduced-motion/light-mode support.

## Files
- [MODIFY] `frontend/src/app/(site)/page.js`: compose the new experience.
- [NEW] `frontend/src/components/site/PremiumExperience.js`: hero motion controls, cohort explorer and sample challenge.
- [NEW] `frontend/src/components/site/premium.module.css`: responsive art direction and motion.
- [NEW] `frontend/public/art/`: original generated campaign artwork, optimized locally.
- [MODIFY] `frontend/src/components/site/SiteHeader.js`, `SiteFooter.js`: coordinated public navigation/footer.
- [MODIFY] public Team and FAQ pages: align editorial scale and card treatment.
- [MODIFY] `DESIGN_SYSTEM.md`: record final direction and reference attribution.

## Verification
Production build; actual browser review at desktop/mobile/tablet widths; keyboard and
pointer controls; challenge success/error/reset; cohort selection; live API panels;
dark/light axe scans; reduced motion; local screenshots. No upstream pushes.
