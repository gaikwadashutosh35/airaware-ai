# AirAware AI redesign: Stage 5 report (P11, before the push)

**Date:** 25 Nov 2026. **Direction A**, every phase built on the owner's word, one phase at a time.

This report covers the local part of P11: the full gate, the "after" measurement, the release checks, a docs-versus-code check and a second-opinion UX checklist. Production checks come after the push (end of this file).

## What was built

| Phase | Commit | What |
|---|---|---|
| P0–P1 | `2e537bd`, `104668a` | Audit, proposal, owner decisions; approved copy |
| P2 | `6d9819a` | Header order, place chip, routing, 404 page |
| P3 | `7a71e83` | Today: first screen and states |
| P4 | `7df07de` | Ask: box first, answer in view, provenance, prompt `daily-plan-v3` |
| — | `f0a013c` | Place chip: a tap right after Escape reopens the dialog (the flaky keyboard test) |
| P5 | `0785d41` | My Home and Better Habits, one "Why?" label |
| P6 | `39eb819` | My Profile, Welcome, Privacy |
| P7 | `57ff77c` | Landing |
| P8 | `48f80ce` | Backdrop art direction; the city steps aside for large text |

P9 (Direction B) and P10 (optional clean-up, I4) were not built.

## The local gate (25 Nov, my run)

- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass.
- `npm test`: server 340 passed (5 skipped), client 584 passed.
- `npm run build`: pass.
- The nine stubbed e2e specs (firstscreen, responsive, keyboard, failures, copy, backdrop, scene, ask, landing), desktop and Pixel 7: **511 passed, 83 skipped, 0 failed**. Every request is answered locally or blocked; no AI call, no Supabase account.

## After vs before (local, same script, fixtures)

`docs/redesign/evidence/capture-after.mjs local` against the Vite dev server (no API server running), compared with Stage 0's `audit/evidence/local-metrics.json`. 55 captures, 0 blocked requests, 0 real plan calls.

**Layout shift (CLS), before → after:**

| Page / state | 320 | 390 | 1280 |
|---|---|---|---|
| Today, within | 0.22 → 0 | 0.227 → 0.016 | 0.051 → 0 |
| Today, stale | 0 → 0 | 0.258 → 0 | 0.057 → 0.003 |
| Today, plan error | 0.22 → 0 | 0.227 → 0 | 0.035 → 0.006 |
| Ask, answer | 0.119 → 0 | 0.004 → 0 | 0.001 → 0 |
| My Home | 0.806 → 0 | 0.852 → 0 | 0.492 → 0.033 |
| Better Habits | 0.314 → 0 | 0.214 → 0 | 0.139 → 0 |

Every other Today state is 0 to 0.009 after. The "text-200" state stays near 1.0 (1.207 → 0.975 at 390): the script enlarges the text with CSS after the page has loaded, so it measures its own injected jump, not a user's.

- **Largest contentful paint:** down on almost every page (for example My Home at 390, 1172 → 552 ms; Today ai-plan at 390, 1308 → 524 ms). Indicative only (dev server, one run).
- **axe:** 0 violations before and after on every page checked.
- **Overflow, small targets, console, failed requests:** unchanged from Stage 0, except one new item at 200 % CSS text on a 390 phone: the bottom bar's first and last items reach a few px past the screen edges (labels readable). **Fixed in the P11 polish.**
- **Page length at 390 (screens):** Today 3.3 → 3.1; Ask 3.3 → 3.2; My Home 3 → 3; Better Habits 2.1 → 2.2; My Profile 2.5 → 3 (the new "Your data" section); Welcome 1.1 → 1.2. Landing: 9.4 → 7.4 at 390 and 7.8 → 5.9 at 1280 (P7's own measure).

## Release checks

| Check | Result |
|---|---|
| RP-01 one branch | Pass: `main` and `origin/main` only |
| RP-02 size | Pass: the push is about 0.43 MiB; the repository repacked is 2.43 MiB (limit 10 MB) |
| RP-03 audit screenshots | Pass: 0 tracked (git-ignored) |
| RP-05 configuration | Pass: only `.gitignore` (audit screenshots, asset folder) and `.prettierignore` (the locally installed skill) |
| RP-07 secrets | Pass: only the two `.env.example` files are tracked |
| PF-03 script | 563 kB raw (553 before, +1.8 %); 160 kB gzip; about 148–150 kB brotli, the encoding the 148 kB baseline was taken with. Confirm on production after the push |
| PF-04 fonts | Pass: one Inter woff2, 47 kB |
| PF-05 images | Pass: one image, 125 kB (was about 223 kB) |
| PF-08 / NF-02 404 page | Pass: 2.1 kB, no script |
| CS-08 | Pass: no `backdrop-filter` |
| PR-07 / PR-08 | Pass: no new browser storage key, no new server log line |

## Docs versus code

A read-only check of README, USER_GUIDE, DESIGN, ACCESSIBILITY, API, PRIVACY, DEPLOYMENT, AI_PROMPTS, DATABASE and the real-phone checklist against the code found 11 confirmed stale statements (2 refuted). All 11 are fixed in the docs, for example: USER_GUIDE listed a "Preferred language" question that never existed; DATABASE.md said no coordinates are stored, while a remembered place is (as PRIVACY.md says); API.md still showed `daily-plan-v1`, version `1.0.0` and a 403 code the API never returns.

## Second-opinion UX checklist (ui-ux-pro-max, read-only)

The owner approved the skill for this pass only (installed project-level, git-excluded). Nine items were confirmed against the app; none is a defect in the approved rulings. The owner approved five of them, and the bottom-bar item above, for the P11 polish (marked **fixed**); the other four are still open:

1. At 200 % text on a phone, the place chip shows only its icons (C11 area).
2. The page's left and right safe areas are padded only in the bottom bar (C7 asked for side insets). **Fixed.**
3. "Delete everything" and "Delete plan" look the same as their Cancel buttons.
4. Buttons show the arrow cursor (Tailwind v4 dropped the pointer default). **Fixed.**
5. The main navigation does not move focus to the new page. **Fixed.**
6. A saved-plans load failure has no "Try again". **Fixed.**
7. The Privacy lists and two purpose lines run past about 75 characters a line on wide screens. **Fixed.**
8. The whole app ships as one 563 kB script (route splitting was deferred, F-37).
9. The landing screenshot is a JPEG (WebP would be smaller).

## P11 polish (26 Nov)

Six small fixes, on the owner's word ("Fix small batch first"), built test-first:

1. **Side safe areas** (C7): the header row, page and footer on the app, Landing and Privacy pad the left and right insets.
2. **Pointer cursor** on enabled buttons.
3. **Main navigation focus:** a click that navigates focuses `#main` with `preventScroll`.
4. **Saved plans "Try again"** after a failed load; focus stays on the Saved plans heading; no session, no request.
5. **Readable lines:** `max-w-prose` on the Privacy lists and the My Home and Better Habits purpose lines.
6. **Bottom bar at 200 % text:** with Chromium's default font at 32 px, nothing passes the edge at 320×640 or 390×844 (my measurement, before: the first and last pills reached 16 px past each side at 320 and 9 px at 390, and at 320 the labels ran into each other, "HomeHabitsProfile"), every link stays 44 px or more and keeps its full `aria-label`. At 390 every label shows whole. At 320, four of five labels end in an ellipsis ("To… Ask Ho… Ha… Pro…"): the five words need about 355 px of a 320 px screen. At normal text every label shows whole at 320, 390 and 768, as before.

**Review:** an independent review (Opus) confirmed two focus defects in the first cut, both fixed with a failing test first: the nav focus scrolled each new page 64 px down (now `preventScroll`), and focus fell to the page when "Try again" succeeded (now the heading).

**Gate after the polish (26 Nov, my run):**

- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass.
- `npm test`: server 340 passed (5 skipped), client 594 passed.
- `npm run build`: pass; the script is now 565 kB raw, 162 kB gzip (was 563 and 160).
- The nine stubbed e2e specs, desktop and Pixel 7: **521 passed, 83 skipped, 0 failed**.
- Then one new e2e check, "a nav click opens the page at its top" (390×844 and 1280×800, both projects): 4 passed; with `preventScroll` removed it fails 4 of 4 (scrollY 64).

**Still open from the checklist:** the place chip at 200 % (1), the danger buttons (3), route splitting (8) and WebP (9). Not checked: a real notched phone (headless Chromium reports 0 insets), and the "Try again" state in a real browser (unit-tested only; it needs a failed session check).

**Also open (found in review, predates this batch, unmeasured):** `AskBox.tsx`, `HelpChoices.tsx` and `Ask.tsx` move focus with `focus()` without `preventScroll`, the call that scrolled the nav 64 px.

**Agents:** implement and fix, feature-implementer (Sonnet 5.5); review, security-reviewer (Opus 5.5); two verifiers (Opus 5.5).

## Not done yet

- **Live `journey.spec.ts`** (one approved run, I3): needs the owner's OK at the time; it makes real AI plan calls and creates one anonymous Supabase account.
- **The push:** one push of all commits, on the owner's word (about 15 Netlify credits).
- **After the push:** the after-measurement in production mode (one real plan request, with the owner's OK), the 404 page on Netlify (NF-01), the script's transferred size (PF-03), and the largest contentful paint on production (PF-02).
- **Real phone** (AC-13) and a **real screen reader**: never confirmed; owner checks.
