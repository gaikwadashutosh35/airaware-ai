# AirAware AI redesign: acceptance criteria (Stage 1 proposal)

**Date:** 24 Nov 2026.
**Status:** proposal for the owner. Nothing here is built. These criteria apply when the redesign is implemented (Stage 5 onwards).
**Baseline:** production on commit `257352e`, measured in Stage 0 ([audit/LIVE_SITE_AUDIT.md](audit/LIVE_SITE_AUDIT.md), [audit/FINDINGS_REGISTER.md](audit/FINDINGS_REGISTER.md), raw numbers in [audit/evidence/](audit/evidence/)).
**Companion:** [IMPLEMENTATION_OUTLINE.md](IMPLEMENTATION_OUTLINE.md) maps each criterion to a phase, files and tests.

## 0. How to read and run these criteria

### 0.1 Words used

- **Gate:** must pass before a phase is accepted.
- **Report:** measured and written in the phase report. No pass or fail, because the target is not proven or depends on content.
- **If F-xx approved:** the criterion applies only if the owner approves that row of the "needs your OK" table (brief §8). If the row is rejected, the shipped behaviour stays and the existing test stays.
- **Bar top:** the measured top edge of `nav[aria-label="Main"]` on phones. Stage 0: y 787 at 390x844 and y 583 at 320x640 (`evidence/prod-metrics.json`). If the bar's height changes (see SH-01), use the measured value, not these numbers.
- **"Before":** a Stage 0 value. **Prod** means production (`prod-metrics.json`). **Local** means the same client code with every API call answered by the e2e fixtures (`local-metrics.json`).

### 0.2 Measurement tools

| Code | Tool | Notes |
|---|---|---|
| UNIT | Vitest + Testing Library (`client/src/**/*.test.tsx`, `server/src/**/*.test.ts`) | `npm test`. jsdom: no layout, so no positions. |
| E2E | Stubbed Playwright specs in `e2e/` (every request answered in the test) | `npm run e2e`. Projects: `desktop` (Desktop Chrome) and `phone` (Pixel 7). One worker. |
| E2E-LIVE | `e2e/onboarding.spec.ts` (live Open-Meteo search) and `e2e/journey.spec.ts` (live Open-Meteo and the production Supabase project, F-42) | Run only with the owner's OK. Never needed for a copy-only check. |
| CAP | A **copy** of `docs/redesign/audit/evidence/capture.mjs` in **local** mode (fixtures) | The Stage 0 script must **not** be re-run in place: it writes into `audit/screenshots/` (overwriting the "before" set) and into the Stage 0 scratchpad. The copy writes screenshots and JSON outside the repository's audit folder. |
| CAP-PROD | The same copy in **prod** mode | Only after an owner-approved push. Prod mode lets one real daily-plan request through (it can call the AI) and makes about 80 API calls. Owner OK needed for each run. |
| AXE | axe-core 4.14.0, tags `wcag2a wcag2aa wcag21a wcag21aa wcag22aa` | Through `e2e/axe.ts` (`expectNoAxeViolations`) or CAP's `axe()`. |
| GREP | `rg` over `client/src`, `server/src`, `shared`, `e2e` | For copy that must be present or absent. |
| GIT | `git count-objects -vH`, `git ls-files`, `git branch -a`, `git diff --stat` | Repository rules. |
| PHONE | A real phone, following `docs/REAL_PHONE_CHECKLIST.md` | Safe areas, landscape notch, keyboard over inputs, press feel. Not automatable. |
| OWNER | The owner's own review of screenshots | For items that have no honest metric. Never replaced by an invented number. |

### 0.3 Which tool covers which width

| Width | E2E | CAP | Notes |
|---|---|---|---|
| 320x640 | yes (`responsive.spec.ts` `SIZES`) | yes | |
| 390x844 | **no** today (`SIZES` is 320, 640, 768, 1024, 1280; the phone project is a Pixel 7) | yes | New first-screen tests must call `page.setViewportSize({ width: 390, height: 844 })`. |
| 768x1024 | yes | yes | |
| 1280x720 | e2e uses 1280x800 | yes | New first-screen tests must set 1280x720. |
| 1440x900 | no | yes | |

### 0.4 Rules for comparing numbers

1. **Like with like.** Gates checked before a push compare with **local** before-values (same fixtures). Production before-values are compared only in the post-push CAP-PROD run.
   - Today at 390x844: local CLS 0.227 and "Why?" at y 1015; production CLS 0.283 and "Why?" at y 1049. The production card had a "For you" line; the local rules fixture has none but has a longer, high-priority top card.
2. **CLS here is the sum of all shifts** in one unthrottled load (CAP's `perf()`), not Chrome's session windows. It is stricter than the Core Web Vitals figure, and indicative, not field data.
3. **CAP's `verdict` y is not comparable in the unknown state.** Its regex (`capture.mjs:160`) matches "We could not get a complete…" (the explanation), not the H2 "Live air information unavailable". If F-16 is approved, the regex starts matching the H2 ("Air information unavailable"), so the number jumps for a reason that is not layout. Compare the H2's `boundingBox()` instead.
4. **CAP's `firstWhy`** matches any element whose text starts with "Why". On Today that is the recommendation card's disclosure, before and after F-23.
5. **Two before-values come from the register, not from CAP:** the Ask text box at y 878 (390) and y 733 (1280) (F-20), and the place chip reading "Pun…" at 768 (F-10). New e2e checks measure them (AK-01, SH-04).

## 1. Global criteria

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| G-01 | The information architecture stays: routes `/`, `/privacy`, `/app`, `/app/ask`, `/app/home`, `/app/habits`, `/app/profile`, `/app/welcome`, and the 5 navigation items Today, Ask AirAware, My Home, Better Habits, My Profile | E2E (`keyboard.spec.ts` `PATHS`, `responsive.spec.ts` `PATHS`) + UNIT (`AppNav.test.tsx`) | All present (LIVE_SITE_AUDIT §2) | All present; no route removed or renamed. |
| G-02 | The URL contract stays: `/app?place=…&lat=…&lon=…` with 2-decimal coordinates; a device location never in the URL | UNIT (`place.test.ts`, `api.test.ts`) + E2E (`ask.spec.ts:46,60` "URL has no question text") | Holds | Same tests pass unchanged. |
| G-03 | Only existing tokens from `client/src/index.css` `@theme static` are used | GREP: no new `--color-*` in `index.css`; no hex colour literals in `client/src/**/*.tsx` other than those already present | 16 colour tokens | No new colour token or literal. A token **value** change needs the owner's OK. |
| G-04 | No new dependency, no motion library | GIT: `git diff --stat package.json client/package.json server/package.json package-lock.json` | `lucide-react`, `react`, `react-dom`, `@supabase/supabase-js` | Empty diff. |
| G-05 | Teal primary fill is used for at most one control per screen on Today | E2E: count visible `a, button` whose computed `background-color` is `rgb(57, 213, 194)` on `/app` | 2 visible on Today: "Make it personal…" (`AppShell.tsx:429`) and the Ask box "Send" (`AskBox.tsx:56`); "Save plan" is a third, inside the closed "See your full day" (LIVE_SITE_AUDIT §5 row 5.3) | ≤ 1 visible with every disclosure closed. |
| G-06 | Stage gates: typecheck, lint, format, unit (client and server), stubbed e2e | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run e2e` (without `E2E-LIVE` specs unless approved) | Stage 0: 338 server and 505 client tests passed; e2e 309 passed, 83 skipped, 0 failed (on 24 Nov) | All pass; the actual output is pasted in the phase report. |
| G-07 | One visual direction is built, the one the owner picks (A or B) | OWNER | n/a | Owner's written choice before any visual phase. Direction-B-only criteria are in §13. |

## 2. Per screen

### 2.1 Today (`/app?place=…`)

Order (brief §3): header → greeting + H1 → verdict card (weather row, verdict H2, tag + provenance, stale banner, caveat) → recommendation card (heading, top card, "Why?", "See your full day") → help choices → "Make it personal" (outlined) → Ask box → "Air quality details" (closed) → footer.

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| TD-01 | The verdict H2 is fully above the bottom bar at 320x640, for "Pune, Maharashtra" and "Thiruvananthapuram, Kerala" | E2E (extend `responsive.spec.ts:82-105`, which today checks "Chhatrapati Sambhajinagar, Maharashtra") | Local: verdict top y 347 (Pune) | Gate: H2 bottom ≤ bar top for both names. |
| TD-02 | The provenance line ("Model forecast · Open-Meteo · …") is fully above the bar at 320x640, for both names | E2E, `boundingBox()` of the line | Local: y 467 (Pune); y 611 for a 70-character name, bar at 583 (F-11) | Gate: bottom ≤ bar top for both names. Report the 70-character name. |
| TD-03 | **First screen at 390x844 (the brief's target):** verdict, provenance, caveat, top card title, top card text and the "Why?" summary all above the bar | E2E at 390x844, `stub(page, 'not_elevated')`, a plan whose top card is the shipped rule "Cut indoor smoke at the source" (priority low, `forYou: null`), built in the test from `rulesPlanFixture`; measure the `<summary>` box | Prod: "Why this recommendation?" at y 1049, bar at 787 (with a "For you" line and the meaning sentence) | **Direction A:** gate: summary bottom ≤ bar top, whether or not F-22 is approved (mockup: y 739 with the meaning sentence, 48 px margin). **Direction B:** gate only if F-22 is approved (mockup: about y 722 without the sentence, derived; y 807 with it); if F-22 is rejected, gate the top card title bottom ≤ bar top and report the "Why?" position. Record the measured margin. |
| TD-04 | Same as TD-03 with the rules fixture as shipped (top card "Consider an indoor alternative for exercise", priority high, longer text) | E2E at 390x844 | Local: "Why?" at y 1015 | Report only. Expected below the bar: by estimate the card is about 66 px taller than the production card without its "For you" line (local y 1015 against about 949). |
| TD-05 | Same as TD-03 on production with a real AI reply | CAP-PROD after the push | Prod: y 1049 | Report. **If F-14 approved**, no "For you" line appears without household answers. |
| TD-06 | At 320x640: the caveat and the recommendation heading | E2E at 320x640 | Local: recommendation heading at y 761, bar at 583 | Report: caveat bottom and heading bottom versus the bar. "Why?" is not expected on the first screen at 320 (brief §3 trade-off). |
| TD-07 | Desktop: verdict card and recommendation card side by side; "Why?" on the first screen | E2E at 1280x720 | Prod: "Why?" at y 536; local y 482 | Gate: summary bottom ≤ 720; the two cards' tops differ by ≤ 8 px (same row). |
| TD-08 | The H1 is smaller on phones | E2E: computed `font-size` of `main h1` at 390 and 320 | 30 px (`AppShell.tsx:355`, `text-3xl`) | Gate: 24 px below 640 px wide. Report the H1 line count at 390 for "Pune, Maharashtra" (the brief expects one line). |
| TD-09 | No word in the H1 breaks across lines | E2E at 320x640 with "Thiruvananthapuram, Kerala": for each word, a `Range` over it has exactly 1 client rect | Broken as "Thiruvananthapura / m" (`local-today-long-place-320x640-first.jpg`, F-11) | Gate: every word has 1 rect. |
| TD-10 | "Your plan is ready." takes no visible space but is still announced | UNIT (`DailyPlanSection.test.tsx`): the `<output>` text is "Your plan is ready." and the element is visually hidden (`sr-only`) **only for that message** | Visible `<output>` with `min-h-6` (`DailyPlanSection.tsx:237`) | Gate: hidden for READY; **save messages in the same `<output>`** ("Saved…", the 20-plan limit, "Saving isn't available right now.", "Too many requests…") stay visible. |
| TD-11 | "Make it personal: 2 quick questions" sits after the help choices, outlined, not teal-filled | E2E: DOM order and computed background | Before the help choices, teal fill (`AppShell.tsx:421-441`) | Gate: after "What would you like help with?"; background not primary. Its text stays as shipped (see open question on "Tailor this to your household"). |
| TD-12 | The top card shows "For you" only when household answers exist | UNIT (`DailyPlanSection.test.tsx`, `MyHome.test.tsx`) with the AI fixture and an empty or non-empty context | Always shown when the plan has it (F-14) | **If F-14 approved:** gate: absent with `{}`; present with ≥ 1 answer. "Your day" inside "See your full day" keeps its "For you" lines (`failures.spec.ts:87-107` passes unchanged). |
| TD-13 | Four help choices are shown and open the right destination | UNIT (`HelpChoices.test.tsx:22`) | 4 choices | Gate: 4; names per the F-24 ruling. |
| TD-14 | "Air quality details" is closed by default and holds every number | E2E: `details` not `open`; CAP `terms` on the default view | PM2.5 0, µg/m³ 0, AQI 0, CPCB 0 in the default view | Gate: same zeros. **If F-22 approved**, the meaning sentence appears inside the details. |
| TD-15 | The page length does not grow | CAP `screens` | Prod 4.9 / 3.4 / 2.2 / 2.5 / 2.0 screens at 320 / 390 / 768 / 1280 / 1440; local 4.8 / 3.3 / 2.1 / 2.4 / 2.0 | Gate (local): ≤ the local before-value at each width. |

### 2.2 Ask AirAware (`/app/ask?place=…`)

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| AK-01 | The free-text box is on the first screen | E2E: input `boundingBox()` against the bar (phones) or the viewport (desktop) | y 878 at 390x844; y 733 at 1280x720 (F-20, `prod-ask-default-390x844-first.jpg`) | Gate: input bottom ≤ bar top at 390x844 and 320x640; ≤ 720 at 1280x720. |
| AK-02 | Order: H1, one intro line, text box, topic chips, starters, thread | UNIT (`Ask.test.tsx`; replaces `:219` "the thread reads oldest first, then the question box") | Box after the thread (`Ask.tsx:140-173`) | Gate: DOM order as listed, plus the greeting after the box if the owner keeps it (INFORMATION_ARCHITECTURE.md §6.3). |
| AK-03 | Starters: 3 visible, the rest behind "More questions" | UNIT | 5 starters, all visible (`client/src/features/ask/ask.ts:26-37`) | Gate if the owner confirms the reading in the open question (topic chips keep answering at once). |
| AK-04 | After a starter tap, the answer is visible without scrolling | E2E at 320x640, 390x844, 1280x720 with `rulesAskFixture`: once the answer is ready, the new `article.ask-answer` top is ≥ 0 (inside the viewport) and the first answer paragraph's top < bar top (phones) or < viewport height (desktop) | Only the question bubble shows at 320 and 1280 (F-04, `local-ask-answer-320x640-first.jpg`) | Gate at all three sizes. |
| AK-05 | That scroll is instant under reduced motion, and focus does not cause a second jump | E2E with `reducedMotion: 'reduce'`: `scrollY` reaches its final value in the same frame; the heading is focused with `preventScroll` | Focus without `preventScroll` (`AskEntry.tsx:192-194`) | Gate. |
| AK-06 | Topic chips still answer at once | E2E (`ask.spec.ts:49-59`), UNIT (`Ask.test.tsx:187`) | Answer at once | Gate: unchanged, unless the owner rules otherwise. |
| AK-07 | Header line wording | UNIT (`Ask.test.tsx:144,162`) | "… · 0 of 10 answers · Edit" (`Ask.tsx:86`) | **If F-15 approved:** "… · 0 of 10 household questions answered · Edit". |
| AK-08 | The header time is marked when over 60 minutes old | UNIT with `updatedAt` 61 minutes before `now` | No mark (F-33) | **Proposal, not in brief §3 (F-33 is a register finding); if approved:** "· Not current" appended. |
| AK-09 | The answer's "Based on" line claims a forecast only when one was used | UNIT (`AskEntry.test.tsx:81,119-122,133`) | Always "· Model forecast", even with `forecast: null` (F-34, `AskEntry.tsx:82-88`) | Gate: with `forecast: null`, no "Model forecast"; with a forecast, "· Model forecast" plus the provider wording the owner approves (F-34) and the time word per F-32. |
| AK-10 | At 200 % text, the Ask input keeps a usable width | E2E at 390x844 and 1280x720 with `html { font-size: 200% }` | About 3–4 characters visible (F-12, `local-today-text-200-390x844-full.jpg`) | **Proposal, not in brief §3 (F-12 is a register finding); if approved:** input width ≥ 60 % of its form's content width (Send may wrap below). Applies to the Ask page form and the Today Ask box. |

### 2.3 My Home (`/app/home?place=…`)

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| MH-01 | "Today, for your home" is in the first paint, with a placeholder sized like its cards | E2E with a plan route that never resolves: the region and its heading are visible | Inserted after first paint (F-02); `MyHome.test.tsx:110-120` pins its absence without a plan | Gate: visible while the plan builds. Without a place, still absent. |
| MH-02 | Layout shift | CAP local, then CAP-PROD | Prod CLS 0.468 / 0.416 / 0.348 / 0.226 / 0.199; local 0.806 / 0.852 / – / 0.492 / – | Gate: < 0.1 at every width (see PF-01). |
| MH-03 | Cards flow on wide screens | E2E at 1280x720 and 1440x900: card `boundingBox()` rows | Single-card groups use the left half (F-25, `prod-habits-default-1280x720-full.jpg`) | Gate: no grid row has an empty column while a later card in the same grid exists. The exact layout (one grid with group labels, or groups flowing as grid items) is the design system's choice; this criterion only fixes the outcome. |
| MH-04 | One disclosure label | UNIT (`MyHome.test.tsx:83,99`) | "Why it matters" (`MyHome.tsx:117`) | **If F-23 confirmed** (see CP-06): "Why?", with the card title in the screen-reader name (as `PlanCard.tsx` does today). |
| MH-05 | Page title plus a one-line purpose | UNIT | H1 only | Gate: one line under the H1, text approved by the owner (new copy). |

### 2.4 Better Habits (`/app/habits?place=…`)

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| BH-01 | Layout shift | CAP local, then CAP-PROD | Prod CLS 0.314 / 0.284 / 0.157 / 0.196 / 0.143; local 0.314 / 0.214 / – / 0.139 / – | Gate: < 0.1. |
| BH-02 | Cards flow on wide screens | As MH-03 | Half-empty rows at 768 and 1280 (`prod-habits-default-768x1024-first.jpg`) | As MH-03. |
| BH-03 | One disclosure label | UNIT (`BetterHabits.test.tsx:27,43`, `GuideGroups.test.tsx:37-40`) | "Why it matters" (`GuideGroups.tsx:78`) | **If F-23 confirmed:** "Why?". |
| BH-04 | No invented impact numbers | UNIT (`server/src/services/recommendations/guides.test.ts:146` banned pattern) | Holds | Unchanged. |

### 2.5 My Profile (`/app/profile?place=…`)

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| MP-01 | "Delete my saved data" shows only when there is data | UNIT (`HouseholdPreferencesForm.test.tsx`) | Always shown (`HouseholdPreferencesForm.tsx:245-252`); confirming with no session reports "Deleted" (F-05) | Gate: hidden when the session check returns no session; shown when a session exists or saved answers loaded; when the session check fails, shown, and a delete still claims nothing (keeps `:350-367`). |
| MP-02 | "Saved plans" is always rendered; with no session it shows a static line and makes no request | UNIT (`SavedPlansList.test.tsx:78`) + E2E request log | Section absent with no session (`SavedPlansList.tsx:132`, F-06) | Gate: heading "Saved plans" and the approved empty line; 0 requests to `/api/v1/plans`; 0 calls that create a session. |
| MP-03 | After "Delete everything", the section stays and shows the empty line | UNIT (`AppShell.test.tsx:2140-2155`) + E2E-LIVE (`journey.spec.ts:237-239,248-255`) | The heading disappears | Gate: heading present with the empty line. |
| MP-04 | Section order and desktop columns | E2E at 390 and 1280 | Right column empty at 1440 (`prod-profile-default-1440x900-first.jpg`) | Gate: Remembered place (only if any), household form, Saved plans, Your data. From 1024: form left; Saved plans and Your data right. |
| MP-05 | An opened saved plan uses the approved disclaimer | UNIT (`PlanView.test.tsx:14`) | "…not the CPCB AQI." (`PlanView.tsx:14`, F-41) | **If F-41 approved:** "…and not the CPCB National AQI." (see open questions: F-41 is not in brief §8). |

### 2.6 Welcome (`/app/welcome`)

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| WE-01 | Step 1 has no header place chip and one value line | E2E | Chip "Choose a place" beside the page's own search (`prod-welcome-default-390x844-first.jpg`, F-27) | Gate: no "Choose a place" or "Change place" button in `header` on step 1; one line under the H1 (owner-approved copy). Steps 2 and 3 keep the chip. |
| WE-02 | "Remember on this device" is off by default | UNIT (`Welcome.test.tsx`) + E2E (`onboarding.spec.ts:57`) | Off | Unchanged. Its note text per the F-01 ruling. |
| WE-03 | Layout shift when `/app/welcome` is opened directly | The capture copy, loading `/app/welcome` directly (not `/app`), local then CAP-PROD | Prod 0.182 (320), 0.157 (390). **No local before-value exists:** Stage 0's local "welcome" capture loaded `/app` (CLS 0), a different entry path; production's `/app` was also CLS 0 | Gate: < 0.1 at 320 and 390. |
| WE-04 | Skip on steps 2 and 3; keyboard walk | E2E (`keyboard.spec.ts:190-214`, `journey.spec.ts:132-133`) | Holds | Unchanged. |

### 2.7 Landing (`/`)

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| LA-01 | Page length | CAP `screens` | Prod 13.3 / 9.4 / 6.7 / 7.8 / 6.3 at 320 / 390 / 768 / 1280 / 1440 | Gate: ≤ 7.5 at 390 and ≤ 6.5 at 1280 (brief: "about 7" and "6"). Report the others; none may grow. |
| LA-02 | The hero search is on the first desktop screen | E2E at 1280x720 | Input top at y 740 (F-19, `prod-landing-default-1280x720-first.jpg`) | Gate: the search input and its submit control have bottom ≤ 720. |
| LA-03 | Search has an explicit submit control | E2E + UNIT | Combobox; a choice from the list opens Today | Gate: a visible submit button of ≥ 44 px with an accessible name; Enter and the button behave the same. |
| LA-04 | Three "Check My Air" links: hero, mid-page, final | UNIT (`Landing.test.tsx:53-54` expects 2 today) + E2E (`landing.spec.ts:111-119`) | 2 | Gate: 3, each to `/app` (first visit lands on Welcome). |
| LA-05 | Section order (brief §3): hero, Today preview, what AirAware helps with (4 items), one recommendation explained, My Home and Better Habits together, how it works, transparency + final call to action | UNIT (replaces `Landing.test.tsx:64-78` and `:307-316`) | Hero + 7 sections: chapter 01 "Understand your air", chapters 02–05, "How AirAware works", "Your city, the next two days" (`Landing.test.tsx:64-78,312`) | Gate: hero + 6 sections (7 in all), in the stated order. |
| LA-06 | Product images are real, dated past captures | UNIT (`Landing.test.tsx:80-100,235-249`) + E2E (`landing.spec.ts:65-90`) + OWNER | Two captures dated 22 Nov 2026, labelled as past | Gate: each image is a real capture (never fixture data), its caption states the capture date and "past", and its `width`/`height` equal the file's pixels at 2x. |
| LA-07 | No invented numbers | UNIT (`Landing.test.tsx:285` "invents no numbers", list `REAL_FIGURES`) | Holds | Gate: passes, with new section text included. |
| LA-08 | "How it works" sits near the end | UNIT (section order) | Second last | Gate: second last (before transparency + final call to action). |

### 2.8 Privacy (`/privacy`)

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| PV-01 | An "In short" summary of 3 lines at the top | UNIT | None (F-29) | Gate: 3 lines; each restates a statement already on the page, with the wording approved by the owner. |
| PV-02 | Supabase is explained once | UNIT | Named, not described | Gate: "our database host" appears once, at the first mention. |
| PV-03 | App-style header and a way back | E2E | Light header; logo to `/`; no link into the app (`Privacy.tsx:22-31`, F-28) | Gate: navy header; a "Back to AirAware" link to `/app`. |
| PV-04 | Retention says the same as `PRIVACY.md` | GREP + OWNER | Page: "Unused accounts are not removed automatically yet." (`Privacy.tsx:90`); `PRIVACY.md`: a nightly job deletes accounts unused for 30 days (F-07) | Gate, after the owner confirms whether the cleanup job is scheduled in production: both say the same thing. |
| PV-05 | No other claim changes | GIT diff of `Privacy.tsx` text | n/a | Gate: only the approved lines differ. |
| PV-06 | Length on phones | CAP | 5.3 screens at 320, 3.4 at 390 | Report. |

### 2.9 Not-found pages and routing

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| NF-01 | An unknown non-app path shows a branded page with status 404 | E2E with `E2E_BASE_URL` (Netlify only; see the note) or a manual check after the push | Netlify's own "Page not found" (`prod-unknown-default-1280x720-first.jpg`, F-08) | Gate: status 404; heading "We couldn't find that page" (owner-approved copy); links to `/app` and `/`. |
| NF-02 | The 404 page is small, accessible and within the CSP | GREP on `client/public/404.html` + AXE + CAP at 320 | n/a | Gate: no `<script>` (the CSP allows only same-origin scripts, `client/public/_headers`); the self-hosted Inter; axe 0; no overflow at 320; targets ≥ 44 px. |
| NF-03 | An unknown app page goes to Today and keeps the place | UNIT (`navigation.test.tsx:21`) + E2E | `/app/nope` becomes `/app/welcome` silently (F-09) | Gate: `/app/nope?place=…` becomes `/app?place=…` by `replace` (history length unchanged); with no place, Welcome as today. |
| NF-04 | Deep links still load | UNIT (`server/src/app.test.ts` redirect checks) + E2E | 200 for `/app`, `/app/*`, `/privacy` | Unchanged. |

**Note on NF-01:** locally, Express answers unknown paths with JSON (`server/src/app.ts:148-152`), and `server/src/app.test.ts:84-91` pins that for `/nope`. The branded page can be tested only on Netlify unless the server is changed too (an owner decision, see the outline).

### 2.10 Shell, navigation and place chip (every app page)

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| SH-01 | Phone bar: fixed, one row, 5 icons with labels; height ≤ 12 % of the viewport; safe-area padding on bottom, left and right | E2E at 320x640 and 390x844: bar height; CSS GREP for `env(safe-area-inset-left` and `-right` | 57 px high (56 + border); bottom inset only (`AppNav.tsx:42-43`, F-38) | Gate: height ≤ 77 px at 640 high and ≤ 101 px at 844 high; left and right insets applied. If the bottom padding becomes `max(0.75rem, env(…))`, either keep the total at 57 px (inner links 44 px) or accept a bar top about 12 px higher and re-measure TD-03. |
| SH-02 | Desktop bar: inside the navy header, one row at normal text | E2E (`responsive.spec.ts:194-226,301-327`) | One row | Unchanged. |
| SH-03 | The current page is marked by more than colour | UNIT (`AppNav.test.tsx:21-31`) + E2E in forced colours | `aria-current="page"`, bold label, filled pill; the pill (`elevated`) against the bar (`bg`) is 1.25:1, computed from the tokens; the teal icon on the pill is 8.37:1 | Gate: exactly one `aria-current="page"`; bold label; in forced colours the current item still differs from the others (border or outline). |
| SH-04 | The chip's text is readable at every width | E2E: label `scrollWidth ≤ clientWidth` (as `responsive.spec.ts:340-346`) | "Pun…" at 768 (about 110 px wide); "Choose a pla…" at 320 (F-10) | Gate: for "Pune, Maharashtra", the visible text shows at least "Pune" with no ellipsis at 320, 390, 768, 1280 and 1440; the accessible name stays "Change place: Pune, Maharashtra". A 70-character name may end in an ellipsis; its full name stays in the accessible name. The no-place label fits at 320. |
| SH-05 | The logo inside the app keeps the place | E2E: logo `href` on `/app/ask?place=…` | `href="/"` (`AppShell.tsx:275-280`, F-28) | Gate: `/app` plus the current query. Landing and Privacy keep their own logos. |
| SH-06 | Phone focus order follows the screen | E2E at 390x844 (Tab walk, like CAP `tabWalk`) | Skip link, logo, the 5 bar links (top y 788), then "Change place" (top y 10), then content (F-13) | Gate, per the F-13 ruling: Option A: skip link, logo, chip, the 5 bar links, content. Option B: skip link, logo, chip, content, the 5 bar links. At 1280: Tab order equals the left-to-right visual order of the header (see the open question on the chip position). |
| SH-07 | At 200 % text the header wraps instead of scrolling sideways | E2E at 390x844 and 1280x720 with `html { font-size: 200% }` | The header row scrolls sideways; My Profile and the chip are pushed off (`local-today-text-200-1280x720-first.jpg`, `AppShell.tsx:274`) | **Proposal, not in brief §3 (F-12 is a register finding); if approved:** header row `scrollWidth ≤ clientWidth`; every header control's box is inside the viewport. |

## 3. Per state (Today unless named)

The four failure-type states stay distinct (brief §3). Each gets its own e2e test that asserts what is present **and** what is absent.

| ID | State | Must show | Must not show | How measured | Before |
|---|---|---|---|---|---|
| ST-01 | Stale (forecast retrieved > 60 min ago) | Verdict, tag and provenance; the amber banner with the exact text "Not current: retrieved more than an hour ago. Reload for the latest forecast." directly after the provenance line; footer line ending " Not current."; **if F-30 approved**, a "Reload forecast" button (≥ 44 px) | The plan-error reassurance line (ST-04) | E2E (`failures.spec.ts:38-55`, `copy.spec.ts:56-62`, `responsive.spec.ts:439-447`) + UNIT (`TodayLead.test.tsx:68-80`) | Banner present, no button (F-30) |
| ST-01a | Stale: the button | One tap sends exactly 1 `GET /api/v1/air-quality/forecast`; no page navigation; disabled while loading; the banner text stays word for word (the button is outside the sentence) | A second request per tap | E2E request log + UNIT | n/a |
| ST-01b | Stale: backdrop | Pending F-44: **keep** (shipped) = the last-known look plus the footer's " Not current."; **neutral** = `data-air="unknown"` with no weather while stale | — | E2E (`backdrop.spec.ts`) + UNIT (`scene.test.ts`) | Last-known look (`scene.ts:88-101`) |
| ST-02 | Forecast error (provider failed) | Error card: H2 "We couldn't load the forecast", text "Forecast provider unavailable.", button "Try again"; a recommendation built from the plan reply, with its own air line or the unknown-plan notice | **No verdict H2 at all** ("Forecast …" or "… information unavailable"); no tag; no footer "Background:" line; no weather layers | E2E (`failures.spec.ts:19-36`, `responsive.spec.ts:449-460`) + UNIT (`AppShell.test.tsx`) | Holds (`AppShell.tsx:384-394`; `useRequest.ts:66-72` gives no previous data after an error, so the backdrop is neutral) |
| ST-03 | Incomplete 24-hour check (forecast arrived, check unknown) | H2 per the F-16 ruling ("Live air information unavailable" shipped, or "Air information unavailable"); tag "No data"; provenance line; the sentence "We could not get a complete 24-hour forecast for this place, so there's no advice about today's air. The suggestions below apply on any day."; backdrop `data-air="unknown"`; the recommendation with its "Made by our rules" or "Made with AI" line. The brief says "from rules with 'Made by our rules'", but the server calls the AI writers whatever the air level (`server/src/services/recommendations/dailyPlan.ts:162-164`), so either line can appear (conflict C-9 in the outline) | Any advice about today's air | E2E + UNIT (`TodayLead.test.tsx:58-66`, `today.test.ts:55`) | Holds (`local-today-unknown-check-390x844-full.jpg`) |
| ST-04 | Plan error (forecast fine, plan failed) | Verdict as normal; plan card "We couldn't build your recommendation." / "Something went wrong building your plan." / "Try again"; **if approved**, "The forecast above is still up to date." | The reassurance line when the forecast is **stale, loading or failed** | UNIT (`DailyPlanSection.test.tsx:300,386-390`) + E2E (`failures.spec.ts:110-125`) | No reassurance line (F-31) |
| ST-05 | Forecast loading | A placeholder sized like the verdict card; visible text "Loading forecast…" (owner-approved) | A blank grey block with no words | UNIT (`States.test.tsx:15-21`) + E2E + CAP (CLS) | Words only for screen readers (`States.tsx:7-23`, F-18); the recommendation drops about 250 px when the verdict arrives (F-02) |
| ST-06 | Plan building | A placeholder inside the card, sized like a card. Its label "Finding your recommendation…" stays screen-reader-only (`DailyPlanSection.tsx:239`, `States.tsx:13`) unless F-18 extends to it; the visible live line reads "Building your plan. This can take up to 30 seconds." (`DailyPlanSection.tsx:35`) | Layout shift when the card arrives | CAP CLS | Holds |
| ST-07 | No place | `/app` opens Welcome step 1 | Disabled plan controls, empty charts | E2E (`onboarding.spec.ts`) | Holds |
| ST-08 | Empty collections | My Profile with no saved plans (MP-02); My Home with no indoor cards (the guides only); guides failing ("Too many requests. Try again in a minute." and "Try again", `pages.spec.ts:24-35`) | — | UNIT + E2E | Holds except MP-02 |
| ST-09 | Ask states | Thinking, error ("We couldn't answer that"), medical, out-of-scope and unknown-air answers unchanged | — | E2E (`copy.spec.ts:78-98`) | Holds |
| ST-10 | Place search states | No result: approved line (proposed "No places found. Try a nearby city, or use your location."); error: approved line (proposed "Search isn't working right now. Try again, or use your location."); a 429 keeps "Too many requests. Try again in a minute." | The server's raw message ("Data provider unavailable.") | UNIT (`LocationSearch.test.tsx:162,179-181`) | "No places found"; the server's message verbatim (F-35, `LocationSearch.tsx:52,58-63`) |

## 4. Data integrity

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| DI-01 | Every verdict carries its level tag and "Model forecast · Open-Meteo · {updated or retrieved} HH:MM" | UNIT (`TodayLead.test.tsx:32-56`) + E2E | Holds; the word is "updated" (`TodayLead.tsx:45`) | Gate in every non-error state; the word follows the F-32 ruling everywhere it appears (Today, plan air line, Ask header, Ask answers, landing text). |
| DI-02 | Level labels are never reworded | UNIT (`planDisplay.test.ts`) | "Within the limit", "Above the limit", "No data" (`LEVEL_TAG`) | Exactly these three strings. |
| DI-03 | No banned words and no AQI except the approved phrases, on every page and state | E2E (`copy.spec.ts`), extended to: unknown check, plan error, Welcome step 1, My Profile with no session, an opened saved plan, place-search messages, Privacy "In short", the 404 page | 0 hits in production | Gate: 0 hits. Allowed AQI phrases stay `copy.spec.ts:20`: "We don't calculate an AQI" and "CPCB National AQI". |
| DI-04 | The default Today view shows no numbers | CAP `terms` | PM2.5 0, µg/m³ 0, CPCB 0, AQI 0; "GMT+5:30" 1 (the weather row) | Gate: the four zeros; "GMT+5:30" ≤ 1. |
| DI-05 | Stale data is never called current | E2E with data 2–3 hours old | Banner on Today, plan-stale line, footer " Not current."; Ask header unmarked (F-33) | Gate: the three shipped places marked; the Ask header too if AK-08 (F-33) is approved. |
| DI-06 | The recommendation never silently contradicts the verdict | UNIT with a plan whose `air.level` differs from the forecast's `airCheck.level` | The plan's air line is hidden whenever the verdict is shown (`DailyPlanSection.tsx:258-262`, F-17) | **Proposal, not in brief §3 (F-17 is a register finding); if approved:** when the levels differ, the card shows the plan's own air line (`planAirLine`). |
| DI-07 | The weather row never reads as current | UNIT (`TodayLead.test.tsx:81-147`) | "Weather for {time}: …" label | Unchanged wherever the row is placed (F-21 ruling). |
| DI-08 | The 24-hour check is never called an AQI | GREP + E2E `copy.spec.ts` | Holds | Unchanged. |
| DI-09 | No fabricated values, stations, times, alerts or URLs | UNIT (`Landing.test.tsx:285`) + OWNER review of new copy | Holds | Unchanged; new copy reviewed against this rule. |
| DI-10 | No demo data | GREP: no `demo` data kind rendered in the client | None | None. |

## 5. Privacy

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| PR-01 | No account until Save or Remember | E2E (stubbed): load and use every app page without pressing "Save my answers" or "Save plan" and without ticking Remember; count requests to `*.supabase.co/auth/*` and read `localStorage` (pattern of `onboarding.spec.ts:80-84`) | 0 accounts | Gate: 0 auth requests; no `sb-*-auth-token` key. Includes the new My Profile empty states (MP-02). |
| PR-02 | Location only after "Use my location" | E2E with an init script that counts `navigator.geolocation` calls | Only in the click handler (`UseMyLocation.tsx`) | Gate: 0 calls on load of every page; 1 after the click. |
| PR-03 | Coordinates rounded to 2 decimals; device location never in the URL | UNIT (`place.test.ts`, `api.test.ts`) | Holds | Unchanged. |
| PR-04 | Remember stores what the F-43 ruling says | UNIT (`AppShell.test.tsx` Remember tests, `Welcome.test.tsx`) + `Privacy.test.tsx:15` | Label plus 2-decimal coordinates (`AppShell.tsx:40-47`) | Gate per the ruling; the Privacy page states the same thing. |
| PR-05 | The save and remember notes say what saving does | UNIT (strings) + OWNER | "Saved on this browser only…" (F-01) | **If F-01 approved:** the four approved strings; their facts match `Privacy.tsx:44,75-81`. |
| PR-06 | Delete is one confirmed step and only offered when there is data | UNIT | One step; always offered (F-05) | MP-01 and the existing confirm tests. |
| PR-07 | No new browser storage | GREP for `localStorage`, `sessionStorage`, `indexedDB` in `client/src` | Existing uses only | No new key. |
| PR-08 | Household answers and typed questions are not logged | GREP for `console.` and logger calls in `server/src` touched by the redesign | Holds | No new log line carries household context or question text. |

## 6. Accessibility

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| AC-01 | axe: no WCAG A or AA violations | AXE: every route at 320 (`responsive.spec.ts:73-77`), at 390 and 1280 (CAP), every Today state, dialogs open, forced colours (skipping only `color-contrast`, as `responsive.spec.ts:284-294`) | 0 in 21 production runs and every local run | Gate: 0. Also record axe's "needs review" items for text over the sky (not recorded in Stage 0). |
| AC-02 | Targets ≥ 44 px | E2E `smallTargets()` at 320 and 768; CAP at 390 and 1280 | 0 offenders | Gate: 0. |
| AC-03 | No sideways overflow, no clipped text | E2E `pastTheEdge()` and `clippedText()` at every size, at 200 % text and with wide text spacing (`responsive.spec.ts:45-62,107-192`) | 0 in 111 captures | Gate: 0. |
| AC-04 | One H1 per page; heading levels never skip | E2E (`responsive.spec.ts:58`) + a new check: in DOM order each heading's level ≤ the previous level + 1 | One H1 | Gate: both. |
| AC-05 | Every Tab stop shows a ring; no traps; nothing focused off screen | E2E (`keyboard.spec.ts:71-98`, all 8 paths) | Holds | Gate: passes; plus SH-06. |
| AC-06 | Focus is never hidden behind the phone bar | UNIT (`styles.test.ts:69-74`) + E2E | `scroll-padding-bottom: calc(4rem + env(…))` (`index.css:122-126`) | Gate: the padding is ≥ the measured bar height. |
| AC-07 | Reduced motion | CAP `motion()` at 390 + E2E (`scene.spec.ts`, `landing.spec.ts:92-98`) | 2 running animations without a preference (cloud drift 4.8 s, rain 6 × 0.8 s); 0 under `reduce` | Gate: 0 under `reduce`; any new motion stops within 5 s. |
| AC-08 | Forced colours | E2E (`responsive.spec.ts:230-295,350-417`) | Backdrop hidden; rings show; header ≥ 4.5:1 | Gate: unchanged; plus SH-03 and the level tag and stale banner keep visible borders. |
| AC-09 | Status never by colour alone | UNIT + OWNER | Tag text, banner text and icon, bold current nav label | Gate: holds on every new element. |
| AC-10 | Title text over the sky (Direction A) | E2E (`backdrop.spec.ts:116-253`) | ≥ 4.5:1 against every sky stop, cloud, deck, glow and rain | Gate: ≥ 4.5:1. Direction B: see DB-01 to DB-06. |
| AC-11 | Phone inputs at ≥ 16 px (no zoom on focus) | E2E: computed `font-size` of every `input`, `select`, `textarea` at 390 | Holds | Gate: ≥ 16 px. |
| AC-12 | Live regions still announce | UNIT: "Your plan is ready." stays in an `<output>`; Ask's status `<output>`; My Home's announce `<output>` | Holds | Gate: present and filled at the same moments as now. |
| AC-13 | Real phone | PHONE (`docs/REAL_PHONE_CHECKLIST.md`): VoiceOver or TalkBack pass on Today; landscape notch sides (F-38); keyboard over the Ask box | Not checked in Stage 0 | Report, with device and OS named. |

## 7. Performance

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| PF-01 | Layout shift on Today, My Home, Better Habits, Welcome and Ask at 320, 390, 768, 1280 and 1440 | CAP local (gate), then CAP-PROD (confirmation) | Prod Today 0.171 / 0.283 / 0.155 / 0.104 / 0.106; My Home 0.468 / 0.416 / 0.348 / 0.226 / 0.199; Better Habits 0.314 / 0.284 / 0.157 / 0.196 / 0.143; Welcome 0.182 / 0.157 / 0.067 / 0.075 / 0.054; Ask 0.119 at 320. Local Today within 0.22 / 0.227 / 0.17 / 0.051 / 0.063; local My Home 0.806 / 0.852 / 0.492 and Better Habits 0.314 / 0.214 / 0.139 at 320 / 390 / 1280 only. No local before-value for Welcome opened directly (see WE-03) or for Ask's default view | Gate: < 0.1 for every page and width, local first, then production. The capture copy must run **all five widths** for My Home, Better Habits, Ask and Welcome (Stage 0 ran them locally at three widths) and must open `/app/welcome` directly. |
| PF-02 | Largest contentful paint | CAP-PROD | ≤ 2440 ms on every route except the first, cold request (5340 ms, TTFB 4282 ms) | ≤ 2500 ms on every route, a documented cold first hit excepted. Indicative (one unthrottled run). |
| PF-03 | Script size | `npm run build -w client` output (gzip) + CAP | One script, 148 kB transferred, 553 kB raw | Gate: ≤ 155 kB transferred (≤ +5 %). Report raw size. |
| PF-04 | Fonts | CAP `fonts` | One file, `inter-latin-wght-normal.woff2`, 47 kB | Unchanged. |
| PF-05 | Images | `ls -l client/src/assets` | 96 kB + 124 kB (two landing captures) | Gate: total ≤ 220 kB; no new raster image in the app or the backdrop. |
| PF-06 | API calls per page load | CAP request log at 390 | Today 3 (plan, forecast, sources); Ask 2; My Home 4; Better Habits 3; My Profile 2; Welcome 1; Landing 0; Privacy 0 | Gate: no more than before on any page. |
| PF-07 | No extra plan requests | E2E request log: load Today, move to My Home and back within a minute | Not measured (Stage 0 §10 lists in-app navigation requests as not checked). Code-trace: 1 plan POST, because the plan area stays mounted and its key (`AppShell.tsx:405`) does not change between pages | Gate: exactly 1 plan POST for the visit. |
| PF-08 | 404 page weight | `ls -l client/public/404.html` | n/a | ≤ 10 kB, font excluded. |

## 8. Responsive matrix

Each cell lists the criteria that must hold at that size. "All" means AC-01 to AC-03 and no sideways scroll.

| Page | 320x640 | 390x844 | 768x1024 | 1280x720 | 1440x900 |
|---|---|---|---|---|---|
| Shell | All; bottom bar (SH-01); chip fits (SH-04) | All; SH-01, SH-04, SH-06 | All; top bar one row (SH-02); chip shows "Pune" (SH-04) | All; SH-02, SH-04, SH-06; 200 % wraps (SH-07) | All; SH-04 |
| Today | TD-01, TD-02, TD-06, TD-09; ST-01 at 320 (`responsive.spec.ts:439-447`) | TD-03, TD-04, TD-08, TD-10 | TD-15 (no growth) | TD-07 | TD-15 |
| Ask | AK-01, AK-04 | AK-01, AK-04, AK-10 | All | AK-01, AK-04, AK-10 | All |
| My Home, Better Habits | MH-02, BH-01 | MH-02, BH-01 | MH-02, BH-01, BH-02 | MH-03, BH-02 | MH-03, BH-02 |
| My Profile | MP-01, MP-02 | MP-04 (order) | All | MP-04 (two columns from 1024) | MP-04 |
| Welcome | WE-01, WE-03 | WE-01, WE-03 | All | All | All |
| Landing | LA-01 (report) | LA-01 (≤ 7.5) | LA-01 (report) | LA-01 (≤ 6.5), LA-02 | LA-01 (report) |
| Privacy | PV-06 (report) | All | All | All | All |
| 404 | NF-02 | All | All | NF-01 | All |

## 9. Content and copy

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| CP-01 | Shipped strings stay unless their row is approved | GREP before and after for the protected strings: the verdicts (`today.ts`), `LEVEL_TAG`, the provenance line, the stale banner, the forecast error card, the footer "Background:" line, the rule cards, "Your recommendation for today", "See your full day", "Air quality details" | Present | Gate: identical unless an approved row changes them. |
| CP-02 | Each approved change is pinned and the old text is gone | UNIT or E2E asserting the new string; GREP for the old string in `client/src` and `server/src` (only negative assertions may keep it) | n/a | Gate for every approved row of brief §8 and every approved new-element string. |
| CP-03 | Rejected rows keep the shipped text and its tests | Existing tests unchanged | n/a | Gate. |
| CP-04 | New-element copy is approved before it is built | OWNER (the list is in the outline, phase P1) | n/a | Gate: no unapproved new string ships. |
| CP-05 | Copy rules: no medical advice, no yes/no to "Can I go outside?", no invented emissions or percentages, no "safe", "healthy", "clean air", "good air", "bad air" claims | E2E (`copy.spec.ts`) + UNIT (`client/src/features/ask/ask.test.ts:86-93`, `server/src/services/recommendations/rules.test.ts:365-376`, `server/src/services/recommendations/guides.test.ts:146`, `Landing.test.tsx:299-303`) | 0 hits; one negated "can promise clean air" in a rule caveat (`rules.ts:222`, F-40) | Gate: 0 hits. **If the F-40 ruling bans negated uses:** reword `rules.ts:222` and add "clean air" to the rules banned list. |
| CP-06 | One disclosure label | GREP: "Why this recommendation?" and "Why it matters" absent from `client/src` (non-test) | 3 labels (F-23) | Gate: "Why?" everywhere, card title kept in the screen-reader name. Needs owner confirmation (see the outline: F-23 changes shipped labels but is not in brief §8). |
| CP-07 | Docs that quote changed strings are updated in the same phase | GREP over `API.md`, `USER_GUIDE.md`, `README.md`, `PRIVACY.md`, `DESIGN.md` | n/a | Gate: no doc quotes a string the app no longer shows. |

## 10. Cityscape backdrop

From `AirAware_AI_Redesign_Kit/10_CITYSCAPE_BACKGROUND_INTEGRATION.md` ("Acceptance criteria"), `AirAware_AI_Adaptive_Cityscape_Background_Spec.md` §11–§12, and the approved backdrop specs (`docs/superpowers/specs/2026-11-20-cityscape-backdrop-design.md` §5–§6, `2026-11-22-cityscape-brief-finish-design.md` §5–§6).

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| CS-01 | The same forecast gives the same scene at every width | E2E: `data-air` and the cloud, rain and glow layers at 320, 390, 768, 1280 and 1440 | Holds | Gate: identical attributes. |
| CS-02 | Weather alone changes clouds and rain, never the air look | UNIT (`scene.test.ts`, `sceneFromConditions`) | Holds (`scene.ts:44-68`) | Gate: unchanged. |
| CS-03 | The air check alone changes the atmosphere, never the clouds | UNIT | Holds | Gate: unchanged. |
| CS-04 | Unknown, error and loading are never optimistic or alarming | UNIT + E2E | No place or error: `NEUTRAL`; loading: the still silhouette (`scene.ts:70-101`) | Gate: unchanged. **Stale:** pending the owner's F-44 ruling. The pack's 10 doc says neutral; the adaptive spec and the build keep the last-known look. Not a pass or fail until ruled. |
| CS-05 | A screen-reader user gets the same air information without the picture | UNIT (`CitySkyline.test.tsx`) + E2E | `aria-hidden`, nothing focusable; the footer line names the level in words | Gate: unchanged. |
| CS-06 | Text contrast in every look | AC-10 (A) or DB-01 to DB-06 (B) | ≥ 4.5:1 | Gate. |
| CS-07 | No text outside the title block (or the B masthead) rests on the scene | E2E (`backdrop.spec.ts:44-80`) | 0 | Gate: 0. |
| CS-08 | No layout shift, overflow or heavy payload from the scene | E2E (`backdrop.spec.ts:328-348`) + PF-05 | No raster, no `backdrop-filter`, no new request | Gate: unchanged; GREP: no `backdrop-filter` in `client/src`. |
| CS-09 | Motion | AC-07 | Drift once 4.8 s, rain 6 × 0.8 s, fade 0.7 s; none under `reduce` | Gate: unchanged. |
| CS-10 | The skyline supports the answer on desktop (Direction A) | Compute the near layer's colour against the sky stop behind it at 1280x720 and 1440x900, before and after; OWNER review of both first screens | The near silhouettes are the highest-contrast shape on the first screen (F-26) | Gate: the measured ratio is lower after; the owner confirms the verdict reads first. No fixed ratio is invented here; the design system proposal sets the value. |
| CS-11 | The 10 test scenarios of the adaptive spec §12 are covered | Map each to a test: within + clear, within + overcast, above + clear, above + rain, unknown + weather, air + no weather, stale + banner, loading, 320 px, reduced motion | Mostly covered by `scene.test.ts`, `CitySkyline.test.tsx`, `backdrop.spec.ts`, `scene.spec.ts` | Gate: each scenario named in a test title or listed in the phase report with its test. |
| CS-12 | No smoke stacks, disaster imagery or red/orange warning tones; not a live photo | OWNER | Holds | Owner review. |
| CS-13 | Landing panorama (A) or horizon (B) | UNIT + E2E | n/a | Only if the landing skyline is approved (P1 row "Landing skyline"): decorative (`aria-hidden`), inline SVG, still under reduced motion, no layout shift, no overflow at 320, and no `data-air` attribute (so `pastTheEdge` measures it). |

**Superseded rule, recorded:** the pack's 10 doc asks for "Today: compact cityscape attached to the forecast verdict". The owner replaced that on 20 Nov with the full-screen backdrop (`2026-11-20-cityscape-backdrop-design.md` §2). It is not a criterion.

## 11. Design review checklist (pack `DESIGN_REVIEW_CHECKLIST.md`)

| Checklist item | Criteria | Kind |
|---|---|---|
| A new visitor understands what AirAware does in the first viewport | LA-01, LA-02, LA-04; WE-01 value line | OWNER + E2E |
| A returning visitor sees the place and the main answer quickly | SH-04, TD-01, TD-02 | E2E |
| Top recommendation visible without hunting | TD-03 to TD-07 | E2E |
| "Why?" easy to find and understandable | TD-03, CP-06 | E2E + OWNER |
| Technical details available without overwhelming | TD-14, DI-04 | CAP |
| Every forecast value has "Model forecast" provenance | DI-01, AK-09 | UNIT + E2E |
| Source and updated time visible | DI-01 | UNIT |
| "Not current" prominent when stale | ST-01, DI-05 | E2E |
| No fabricated CPCB observations or AQI | DI-03, DI-08, DI-09 | E2E |
| 24-hour comparison not labelled an AQI | DI-08 | GREP + E2E |
| Air look not inferred from weather or illustration | CS-02, CS-03 | UNIT |
| Limitations and caveats concise but not hidden | TD-03 (caveat on the card), TD-14 | E2E |
| Five-item navigation consistent | G-01, SH-01, SH-02 | E2E |
| Current page beyond colour | SH-03 | UNIT + E2E |
| Search and location permission explicit | PR-02, LA-03 | E2E |
| No dead-looking controls or ambiguous surfaces | MP-01, MP-02 | UNIT + OWNER |
| Save, remember and delete explain consequences | PR-05, MP-01 | UNIT + OWNER |
| No silent account creation or persistence | PR-01 | E2E |
| Skyline supports rather than competes | CS-10 | OWNER + measured |
| Cards reserved for meaningful objects | — | OWNER |
| Clear type hierarchy | TD-08; verdict is the largest text on Today (E2E: largest computed `font-size` in `main` belongs to the verdict H2) | E2E + OWNER |
| Spacing and colours use existing tokens | G-03 | GREP |
| Mobile and desktop intentionally designed | MH-03, BH-02, MP-04 | E2E + OWNER |
| No excessive gradients, glow, glass or decoration | CS-08 (no `backdrop-filter`) | GREP + OWNER |
| Keyboard-only use works | AC-05, SH-06 | E2E |
| Focus never hidden by sticky navigation | AC-06 | UNIT + E2E |
| 44 px targets | AC-02 | E2E |
| Inputs do not zoom on mobile | AC-11 | E2E |
| Reduced motion respected | AC-07 | CAP + E2E |
| Colour not the only cue | AC-09 | UNIT + OWNER |
| No horizontal scroll or clipped text | AC-03 | E2E |
| Images reserve dimensions; still state for animation | LA-06, PF-05, AC-07 | UNIT + E2E |
| axe and existing tests pass, output recorded | AC-01, G-06 | All |
| Screenshots at agreed viewports | §8 matrix, CAP | CAP |
| Stale, unavailable, no-place and empty states checked | §3 | E2E |
| APIs and URL compatibility preserved | G-02, NF-04, PF-06 | UNIT + E2E |
| Privacy promises verified against the code | §5 | UNIT + E2E + OWNER |
| No source changes or deployment outside the approved phase | RP-04, RP-06 | GIT |

## 12. Repository rules

| ID | Check | How measured | Before | Pass threshold |
|---|---|---|---|---|
| RP-01 | One branch | GIT `git branch -a` | `main` (and `origin/main`) | Gate: no other branch created or pushed (the challenge's one-branch rule). |
| RP-02 | Repository under 10 MB including history | GIT `git count-objects -vH` (`size-pack`) after each phase | 1.80 MiB on 24 Nov | Gate: well under 10 MB. Expected growth from the redesign: under 0.5 MB (code, tests, docs, at most two replaced landing captures of about 220 kB, whose old versions stay in history). |
| RP-03 | The 8.8 MB of audit screenshots are never committed | GIT `git ls-files docs/redesign/audit/screenshots | wc -l` | 0 (folder untracked) | Gate: 0. Stage files by name; `docs/redesign/` is wholly untracked today, so one `git add docs/redesign` would commit 157 JPEGs. Mockup screenshots stay in the scratchpad. |
| RP-04 | Push only on the owner's word | GIT + the owner's message | n/a | Gate: no push per phase; one push after all approved phases (about 15 Netlify credits per push). |
| RP-05 | No configuration change without approval | GIT diff of `netlify.toml`, `client/public/_headers`, `.gitignore`, Vite and TypeScript configs, `e2e/playwright.config.ts` | n/a | Gate: only approved changes. |
| RP-06 | Each phase is reported with real output | Phase report | n/a | Gate: commands, their actual output, skills used, agents and models that ran, files changed, open risks. |
| RP-07 | No secrets | GIT: no `.env*` file staged | n/a | Gate. |

## 13. Direction B only

These apply only if the owner picks Direction B. Contrast values are computed from the tokens in `client/src/index.css`.

| ID | Check | How measured | Value from tokens | Pass threshold |
|---|---|---|---|---|
| DB-01 | Masthead text on the solid `surface` panel | Computed colours + E2E contrast check | `text` on `surface` 15.97:1; `text-muted` on `surface` 8.42:1 | Gate: every masthead text ≥ 7:1. |
| DB-02 | Focus ring on the masthead | E2E: computed `outline-color` of focused masthead controls | `focus` (#1f6fd6) on `surface` is 3.52:1; `secondary` on `surface` is 7.08:1 (`.on-dark :focus-visible`, `index.css:204-213`) | Gate: the masthead carries `.on-dark`, so rings use `secondary`; ≥ 3:1. |
| DB-03 | Level tag pill on the masthead | Computed colours | Shipped pill uses `text-dark` border and text (`TodayLead.tsx:42`), which would vanish on `surface` | Gate: pill text ≥ 4.5:1 and border ≥ 3:1 against `surface`. |
| DB-04 | Stale banner on the masthead | Computed colours | Shipped banner: `text-dark` on `warning/15` (`AirReadout.tsx:45`) | Gate: banner text ≥ 4.5:1 against the banner's own background; the banner's edge ≥ 3:1 against `surface` (`warning` on `surface` is 9.68:1). |
| DB-05 | Forced colours on the masthead | E2E with `forcedColors: 'active'` | n/a | Gate: masthead text, tag and banner borders visible; axe passes (skipping `color-contrast` as today). |
| DB-06 | The title-contrast test still means something | E2E: `backdrop.spec.ts:116-253` changed so masthead text is measured against `surface`, and any text left on the sky still against every sky colour | Measures title text against the sky only | Gate: both branches tested; ≥ 7:1 on the masthead, ≥ 4.5:1 on the sky. |
| DB-07 | First-screen targets | TD-01 to TD-07 | n/a | Same thresholds as A; the masthead's padding may not cost more first-screen space than A's card. Mockup B as drawn fails this (verdict top y 253 against 220; "Why?" bottom 807 against 739 at 390x844): tighten the masthead, or relax DB-07 with the owner. |
| DB-08 | Editorial landing hero | E2E + UNIT | n/a | H1 size per the DESIGN_SYSTEM_PROPOSAL.md §2.3 ruling (mockup B draws 40–76 px), no overflow at 320; section numbers stay decorative (`Landing.test.tsx:176` "chapter numbers are decorative"). |
| DB-09 | Small uppercase section labels | Computed colours + UNIT | `text-dark-muted` on `surface-light` 6.61:1 | Gate: ≥ 4.5:1; not headings (no heading-level skips, AC-04). |

## 14. Items with no honest metric

These are owner review items. No number is invented for them.

- The overall look of either direction, and whether it reads as calm (A) or editorial (B).
- "Cards reserved for meaningful objects".
- Whether the skyline competes with the answer (CS-10 adds one measured value, but the judgement is the owner's).
- Press feel and tap delay on a real phone (PHONE).
- Whether new copy reads naturally (CP-04).
