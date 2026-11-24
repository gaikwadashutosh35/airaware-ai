# AirAware AI redesign: approval checkpoint (Stage 5)

**Date:** 24 Nov 2026.

**Decision log:**
- **24 Nov 2026:** the owner approved **Direction A, "Calm atmosphere"**.
- **Next:** the owner answers [OWNER_DECISIONS.md](OWNER_DECISIONS.md) and names the first phase.

**Status:** Stages 0 and 1 are done.
- No application source code has changed.
- Nothing is committed, pushed or deployed.
- Production still runs `257352e`.

Work stops here until the owner approves a direction and a phase.

## The nine checkpoint items

| # | Item | Where it is | In short |
|---|---|---|---|
| 1 | What the live site does well | [audit/LIVE_SITE_AUDIT.md §3](audit/LIVE_SITE_AUDIT.md) | The answer comes first; the recommendation builds itself; the data rules hold everywhere; axe finds 0 violations; there is no overflow and no target under 44 px; reduced motion is respected; privacy by design is intact. |
| 2 | Ten most important friction points | [audit/LIVE_SITE_AUDIT.md §9](audit/LIVE_SITE_AUDIT.md), [audit/FINDINGS_REGISTER.md](audit/FINDINGS_REGISTER.md) | No P0 or P1. Four P2: the save wording hides that an account is created (F-01); the recommendation sits below the first phone screen (F-03); pages shift while loading (F-02); an Ask answer lands below the fold (F-04). |
| 3 | Status of the 20 Nov UX audit | [audit/LIVE_SITE_AUDIT.md §5](audit/LIVE_SITE_AUDIT.md) | 8 of the 10 ranked problems are fixed and 2 partly fixed (P5, P7). Every table row has a status. |
| 4 | Two visual directions, with wireframes | [DESIGN_CONCEPTS.md](DESIGN_CONCEPTS.md), [WIREFRAMES.md](WIREFRAMES.md), [mockups/index.html](mockups/index.html) | **A "Calm atmosphere"** (recommended) refines the shipped design. **B "Editorial city"** adds a dark masthead and a bolder landing. Both share one information architecture. |
| 5 | Design tokens and component reuse | [DESIGN_SYSTEM_PROPOSAL.md](DESIGN_SYSTEM_PROPOSAL.md), [COMPONENT_REUSE_MAP.md](COMPONENT_REUSE_MAP.md) | Existing tokens only, with computed contrast ratios. Every component is mapped to keep, restyle or change. No new dependency. |
| 6 | Exact files likely to change | [IMPLEMENTATION_OUTLINE.md §3](IMPLEMENTATION_OUTLINE.md) | Each phase lists verified paths, plus the tests and e2e strings that pin the copy it changes. |
| 7 | Risk analysis | [IMPLEMENTATION_OUTLINE.md](IMPLEMENTATION_OUTLINE.md) (risks) | APIs and limits, privacy, provenance, accessibility, tests, deployment, and repository size. |
| 8 | Phased plan | [IMPLEMENTATION_OUTLINE.md §2](IMPLEMENTATION_OUTLINE.md) | Phases P0–P11, each with its own approval gate. About 43–55 hours for Direction A, or 50–65 hours for B. Those totals predate the review: P2, P4, P5, P6 and P10 gained scope afterwards, so expect more. |
| 9 | Skills selected, and why | [DESIGN_CONCEPTS.md §10](DESIGN_CONCEPTS.md) | `airaware-ui` (the project workflow) and `modern-web-guidance` (3 guides). `design-taste-frontend` was loaded but not used: it deals its own palettes, which conflicts with the existing-tokens rule. Stitch isn't available to Claude. |

Also in this folder:
- [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md): the sitemap, navigation and progressive disclosure;
- [USER_FLOWS.md](USER_FLOWS.md): 10 journeys, with what is saved where;
- [REDESIGN_ACCEPTANCE_CRITERIA.md](REDESIGN_ACCEPTANCE_CRITERIA.md): measurable pass and fail checks, with the Stage 0 numbers as the "before".

## Mockup measurements (Today, phone)

All are y-positions in pixels from the top of the page.

| Direction | Width | Verdict top | Recommendation title top | "Why?" bottom | Bottom bar top | "Why?" on the first screen? |
|---|---|---|---|---|---|---|
| Production today | 390x844 | 307 | 665 (heading) | 1049 | 787 | no |
| A | 390x844 | 220 | 564 | 739 | 787 | **yes for a rules-made plan**. An AI plan (the usual case in production) always adds a "For you" paragraph of about 100 px, so A then needs F-14 or F-22 approved |
| B | 390x844 | 253 | 628 | 807 | 787 | **no**. A rules-made plan needs F-22 (about 722). An AI plan needs both F-14 and F-22 |
| A | 320x640 | 296 | 738 | 961 | 583 | no (needs one scroll) |
| B | 320x640 | 302 | 723 | 950 | 583 | no (needs one scroll) |

- **Both directions, all 6 pages, at 320, 390, 768, 1280 and 1440:**
  - Inter loaded;
  - axe found 0 violations;
  - nothing past the screen edge;
  - no control under 44 px;
  - no failed requests.
- **Page length in screens (390 / 1280):**
  - Landing: A 6.6 / 5.8, B 7.2 / 6.2 (production: 9.4 / 7.8).
  - My Home: A 3.1 / 2.0, B 3.4 / 2.5.
- **Text check:** a deterministic scan of the mockup text found:
  - no clock times, µg/m³ units, pollutant figures or banned words;
  - "AQI" only in the approved "not the CPCB National AQI" line.

## What the owner decides next

1. **Direction:** A (recommended) or B.
   - **B's trade-offs:**
     - its dark masthead fills about half of the first phone screen;
     - it changes the approved 20 Nov title-on-sky treatment;
     - it sits against the 20 Nov anti-goal "a dark or alarming full-screen look" and the pack's "light application experience";
     - every state on the dark panel needs re-testing;
     - it pushes "Why?" below the first phone screen.
   - **B's gains:** a more distinctive look, and title contrast that no longer depends on the sky.
   - **Mixing is possible:** B's landing can be adopted with A's app.
2. **The copy and behaviour rulings** in [IMPLEMENTATION_OUTLINE.md §3, P1 Part A](IMPLEMENTATION_OUTLINE.md): F-01, F-14, F-16, F-21, F-22, F-23, F-24, F-32, F-40, F-41, F-43, F-44 and more. Phase P1 starts with this one round of answers.
3. **Which phase to start.** P0 is preparation: keep the 8.8 MB of audit screenshots out of git, and add the after-measurement script.

## Repository notes

- **Uncommitted:**
  - `docs/redesign/` (the audit, these docs and the mockups);
  - the owner's untracked files, including `AirAware_AI_Redesign_Kit/`;
  - the `.claude/launch.json` port change.
- **Screenshots:** `docs/redesign/audit/screenshots/` is 8.8 MB. It should not be committed (repository limit 10 MB). P0 proposes how to keep it out.
