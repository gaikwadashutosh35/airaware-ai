# Reference review: index

**Date:** 28 Nov 2026. Docs only: no existing file was changed, and nothing was committed.

The owner's guide (`docs/redesign/REFERENCE_TO_FEATURE_DESIGN_GUIDE.md` §16) asks for 12 deliverables in this folder.

**Owner ruling J28 #1** (`docs/redesign/OWNER_DECISIONS.md`, 28 Nov) says: reuse docs 01–15, and add only the reference-to-feature adaptation matrix and an index here. There is no duplicate 12-doc set. **So docs 01–15 in `docs/redesign/` are the deliverables.** This page shows where each one lives. The one gap, the adaptation matrix, is filled by `03_FEATURE_ADAPTATION_MATRIX.md` in this folder.

**Labels in the existing docs:**
- **OBSERVED**: seen in code, a doc or a rendered page, with a citation.
- **RECOMMENDED**: a proposal that needs the owner's OK.

Where the guide and J28 differ, J28 wins. The build order is doc 14 (J28 #2), not the guide's §15.

## The 12 requested deliverables and where they are

All paths are under `docs/redesign/`.

| # | Guide §16 deliverable | Covered by (file and section) | Notes |
|---|---|---|---|
| 1 | `01_LIVE_AIRAWARE_AUDIT.md`: production screens, routes, states and usability findings | `01_CURRENT_STATE_AUDIT.md` §1–§8 (architecture, stack, tokens, strengths, weaknesses, tests, journey gaps). Also `audit/LIVE_SITE_AUDIT.md`, `audit/PRODUCTION_VS_LOCAL.md`, `audit/FINDINGS_REGISTER.md`, and the 28 Nov production captures in `audit/screenshots/redesign-2026-11-28/current/` (described in doc 02's "Paths" note, before its §1) | **Read this first.** Doc 01 says the live site was **not** loaded for it; it is a code audit of local commit `b0c4278`. The production view comes from `LIVE_SITE_AUDIT.md` (24 Nov, commit `257352e`) and the 28 Nov `current/` captures. Local `main` is 25 commits ahead of production, J26 included (14 §1.1) |
| 2 | `02_REFERENCE_WEBSITE_REVIEW.md`: observed patterns from all three references, with unavailable pages marked | `02_REFERENCE_COMPARISON.md`. SaafSaans §1, the alternate AirAware §2, UrbanAir §3, the comparison table §4, recommendations 02-R1…R9 §5, and "Not observed, failed or unverified" §6 | Captured in headless Chromium at 1440 and 390. Each section has a "Not opened" list. Screenshots are in `audit/screenshots/redesign-2026-11-28/references/` (git-ignored, owner decision I1) |
| 3 | `03_FEATURE_ADAPTATION_MATRIX.md`: reference → user problem → AirAware feature → data/API → priority | **New: `reference-review/03_FEATURE_ADAPTATION_MATRIX.md`** (this folder) | This was the gap. Earlier pieces were spread across 02 §1.5, §2.6, §3.6 and §5, and doc 11. The matrix joins them into one row per idea, with a classification, the doc 13 dependency, the doc 14 phase and the J28 conflicts |
| 4 | `04_SKILL_SELECTION.md`: installed status, skill instructions read, selected and rejected skills | `03_SKILL_DISCOVERY_AND_SELECTION.md`. The matrix §2, "installed is not the same as runnable" §3, phases §4, sets per phase §5, conflicts §6, not loaded §7 | J28 #3 approves running `modern-web-guidance` through `npx` in code phases (14 D11) |
| 5 | `05_COMPONENT_LIBRARY_DECISIONS.md`: existing components versus shadcn, Radix, assistant-ui and others | `08_COMPONENT_LIBRARY_DECISIONS.md` §1 (verdicts), §2 (what exists), §3 (each candidate), §5 (if a dependency is ever approved). Existing components: `04_EXISTING_COMPONENT_INVENTORY.md` §1–§11 | No new dependency (14 ground rule 3). Ask improves the existing chat instead of using assistant-ui (08 §3.5) |
| 6 | `06_INFORMATION_ARCHITECTURE.md`: page map and user journeys | `06_INFORMATION_ARCHITECTURE.md` §2 (destinations), §3 (journey to screens), §4 (Daily Plan), §5 (Insights), §6 (disclosure layers), §7 (cross-links), §8 (states) | The same file name the guide asks for. J28 #8 settles one open point: "How AirAware answers" lives on Landing, not `/privacy` as 06 §7 proposed |
| 7 | `07_VISUAL_DIRECTIONS.md`: two design directions and a recommendation | `05_DESIGN_DIRECTION_A_B.md` §2 (A), §3 (B), §4 (side by side), §7 (recommendation), §8 (ideas from B) | The owner approved **Direction A** (J27). Each build phase still needs its own approval |
| 8 | `08_SCREEN_WIREFRAMES.md`: desktop and phone layouts for the core screens | `07_SCREEN_WIREFRAMES.md` §1 Landing, §2 Today, §3 Ask, §4 Daily Plan, §5 My Home, §6 Better Habits, §7 My Profile, §8 checks every frame must pass | Phone 390 and desktop 1280 frames |
| 9 | `09_MOTION_AND_3D_PLAN.md`: effects, runtime choices, reduced motion and fallbacks | `09_MOTION_DESIGN_SPEC.md` §1 (rules), §3.1 (the CSS set), §4 (never allowed), §5 (reduced motion), §6 (performance). Also `10_3D_CITYSCAPE_PROPOSAL.md` §3 (2.5D), §4 (3D desk evaluation), §5 (recommendation), §6 (budgets) | J28 #6: motion is CSS only, with no Motion for React, GSAP or 3D runtime. J28 #4: the SVG skyline stays |
| 10 | `10_FEATURE_ROADMAP.md`: phased priorities and dependencies | `14_IMPLEMENTATION_ROADMAP.md` §2 (decisions D1–D15), §3 (phases R0–R9), §4 (Later), §5 (sequence). Also `11_FEATURE_PRIORITIZATION.md` §2–§11 (73 rows rated Now, Next or Later), §12 (never build), §13 (conflicts) | J28 #2: doc 14's order is the build order |
| 11 | `11_DATA_AND_SAFETY_REVIEW.md`: what each feature can truthfully display | `13_DATA_AND_API_DEPENDENCY_MATRIX.md` §1 (sources S1–S12), §2 (freshness, limits, failure), §3 (screen × source), §4 (trust and privacy crossings, CSP), §5 (what new features would need). Also data-integrity concerns per reference: 02 §1.4, §2.5, §3.5. Never-build list: 11 §12 | No AQI, no CPCB observations (S9 not connected), no indoor readings, and no emissions numbers without a method |
| 12 | `12_ACCEPTANCE_AND_TEST_PLAN.md`: responsive, accessibility, performance and regression criteria | `15_ACCEPTANCE_AND_QA_CHECKLIST.md` §1 (tools), §2 (gates for every phase), §3 (performance budgets), §4 (additions per phase R0–R9), §5 (evidence per phase) | It reuses the IDs in `REDESIGN_ACCEPTANCE_CRITERIA.md` (G-, DI-, PR-, AC-, PF-, CP-, CS-) |

## Existing docs the guide did not name

| Doc | Covers guide section |
|---|---|
| `12_AI_ASSISTANT_UX_SPEC.md` | Guide §6.3 and §8 (Ask welcome screen, answer anatomy, composer, feedback options, states, intent handling) |
| `04_EXISTING_COMPONENT_INVENTORY.md` | Guide §7.2, the component inventory. The matrix maps the guide's proposed component names onto these real ones |

## What the new matrix adds

- One row for each of the 9 guide §5 features (FA-01 to FA-09). For each: the reference page inspected, the screenshot path, or "not observed" where doc 02 did not open the page.
- One row for each of doc 02's "what to learn" items, plus 02-R8 and 02-R9 (FA-10 to FA-24). Two rows (FA-25, FA-26) record reference numbers that are not adapted. FA-27 covers the education explainers from the guide's Learn row.
- A classification for each row (FA-27 has two, one for its client part and one for its server part): UI-only redesign, reuse of existing capability, new frontend capability, new backend/API requirement, new external data requirement, or future-deferred.
- The doc 13 data source each row depends on, and the doc 14 phase, or "not planned".
- A list of guide ideas that J28 rules on (§6), and the patterns never to adopt (§7). The list includes any reference's AQI or CPCB calculation.
