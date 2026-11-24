# AirAware AI: live site audit (Stage 0)

**Date:** 24 Nov 2026.

**Production:** https://airaware-ai.netlify.app, serving commit `257352e`.

**Mode:** read-only:
- no application source was changed;
- nothing was installed, configured, pushed or deployed;
- no account was created and no data was saved or deleted.

**Companion files:**
- [FINDINGS_REGISTER.md](FINDINGS_REGISTER.md): all 44 findings, with evidence;
- [PRODUCTION_VS_LOCAL.md](PRODUCTION_VS_LOCAL.md);
- [screenshots/](screenshots/) (157 images);
- [evidence/](evidence/): raw metrics, capture scripts and the merged analysis.

## Summary

- **Most of the 20 Nov audit has shipped:**
  - 8 of its 10 ranked problems are fixed;
  - 2 are partly fixed: P5 (repetition) and P7 (the household form and saving).
- **No P0 or P1 problem was found.**
- **4 P2 problems remain:**
  1. **F-01:** the save and remember messages say data stays "on this browser" or "on this device", while saving creates an anonymous account on AirAware's database.
  2. **F-02:** Today, My Home and Better Habits shift as content arrives. CLS is up to 0.28 on Today, 0.47 on My Home and 0.31 on Better Habits.
  3. **F-03:** on phones, the recommendation itself sits just below the first screen.
  4. **F-04:** after tapping an Ask starter question, the answer lands below the fold at 320 and 1280 px.
- **Accessibility measurements are strong:**
  - axe found 0 WCAG A/AA violations in 21 production runs and every local run;
  - nothing overflows sideways;
  - no control is under 44 px;
  - every Tab stop has a visible, unobscured focus ring;
  - reduced motion stops all scene animation.
- **The remaining work is mostly design and copy** (P3): wide layouts with half-empty areas, the landing page's length, Ask's crowded first screen, the unbranded 404 page, and small wording mismatches.

## 1. How this was checked

### Production (read-only)

- **Load:** 48 page loads, 8 keyboard walks and 2 reduced-motion loads, between 03:41 and 03:48 UTC on 24 Nov 2026.
- **Browser:** headless Chromium from the repo's Playwright 1.65.1, one fresh browser context per viewport. Pune was set from the URL (`?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86`), so no search or save was needed.
- **Guard:** every browser context ran behind a request guard ([evidence/capture.mjs](evidence/capture.mjs)) that:
  - aborted every non-GET request to `/api/*` and to Supabase (none was attempted: 0 blocked);
  - let exactly one real daily-plan request through (it returned 200), because Today and My Home build a plan automatically. Its reply was replayed for the 13 later loads, so only one plan request reached production. On the server, one request can try more than one AI writer;
  - paced loads under the API's 60-a-minute limit: 82 API calls in about 6.5 minutes, with 0 replies of 429.
- **Never clicked:** Save, Remember, Ask, Delete or "Use my location".

### Local (fixtures)

- **Server:** the Vite dev server on port 5174 with the same client code (identical bundle hash).
- **Data:** every API call was answered by the repo's e2e fixtures (`e2e/layout.ts`, `e2e/routes.ts`), so no local AI or Supabase call was made.
- **States covered:** within, above, unknown check, stale, unavailable, loading, plan error, plan building, unavailable plan, AI plan, a 70-character place, long recommendations, 200% root text, the Ask answer, Welcome with no place, My Profile with no session, My Home and Better Habits.
- **Load:** 55 loads, plus a 10-load supplement ([evidence/supplement.mjs](evidence/supplement.mjs)) covering:
  - every disclosure open;
  - the place dialog with results, no result and a search error, and Escape;
  - Welcome steps 2 and 3;
  - the landing search.

### Checks on each load

- page length in screens and the y-position of key items, using the 20 Nov audit's definitions;
- the e2e overflow check (`pastTheEdge`) and the 44 px target check (`smallTargets`);
- axe-core 4.14.0 (WCAG 2.0/2.1/2.2 A and AA), run at 390x844 and 1280x720;
- console errors, failed requests and API calls;
- navigation timing, LCP, CLS and resource sizes;
- head metadata.

### Analysis

- **Reviewers:** a workflow of 11 agents, all on Claude Opus 5.5. Five reviewers each took one area:
  - changes since the 20 Nov audit;
  - first screen and information architecture;
  - states and edge cases;
  - accessibility, mobile and performance;
  - data integrity, privacy and features (the project's `security-reviewer` agent).
- **Skeptics:** a second agent per reviewer tried to refute every finding against the same evidence. A final agent checked coverage against the kit's requirements.
- **Before starting:** I consulted the advisor once and followed its advice:
  - check whether Today builds a plan automatically (it does);
  - run production serially;
  - use fixtures for states;
  - keep the screenshots uncommitted.

### Skills and tools

- **Used:**
  - `airaware-ui`, the project's UI workflow: rules first, see the screen at 320 and 1280, audit, report before fixing;
  - the `mobile-native` checklist, applied by the accessibility reviewer to `client/index.html` and `index.css`;
  - `superpowers:brainstorming`, loaded before Stage 0 to frame the redesign conversation.
- **Not used:**
  - `modern-web-guidance`: no HTML, CSS or client JS was written;
  - `break-ui`: it adds a demo toggle to app source, which Stage 0 forbids. The e2e fixtures gave the worst-case data instead;
  - `design-taste-frontend` and `emil-design-eng`: they belong to Stage 1 and the motion pass;
  - Hallmark: not named for this stage;
  - Unslop: not installed.
- **Not run:** Lighthouse, which isn't installed. Performance comes from Playwright timings in one unthrottled run, so treat it as indicative.

### Inputs read

- **Project docs:** `CLAUDE.md`, `AGENTS.md`, `README.md`, `PRD.md`, `DESIGN.md`, `ARCHITECTURE.md`, `ACCESSIBILITY.md`, `PRIVACY.md` and `docs/UX_AUDIT.md`. All exist.
- **The redesign pack:**
  - **`docs/redesign/` did not exist.** The pack is in the untracked folder `AirAware_AI_Redesign_Kit/`, and it was read there.
  - It was neither moved nor committed. The audit files were created in `docs/redesign/audit/` as asked.

## 2. Routes found

| Route | Production | What it is |
|---|---|---|
| `/` | 200 | Landing (dark): hero with "Check My Air", "Meet Your Assistant" and search, 8 sections, and a final call to action |
| `/app` (no place) | 200 → `/app/welcome` | Welcome step 1 of 3 |
| `/app/welcome` | 200 | Onboarding: place, then day, then home and "Remember on this device" (off by default) |
| `/app?place=…` | 200 | Today: verdict, recommendation (auto-built), "Make it personal", help choices, Ask box, Air quality details |
| `/app/ask?place=…` | 200 | Ask AirAware: topic chips, starter questions, free text |
| `/app/home?place=…` | 200 | My Home: today's indoor cards, then ways to improve indoor air by group |
| `/app/habits?place=…` | 200 | Better Habits: commuting, waste, cooking, energy use |
| `/app/profile?place=…` | 200 | My Profile: household answers, saved plans (with a session), delete |
| `/privacy` | 200 | Privacy (light header) |
| `/app/nope` | 200 → `/app/welcome` | An unknown app path is accepted silently (F-09) |
| `/nope` | 404 | Netlify's default page (F-08) |

**Navigation:** the same 5 items appear on every app page:
- a 56 px fixed bottom bar on phones;
- a 44 px top bar from 768 px;
- `aria-current="page"` plus a filled pill on the current page.

### Repository snapshot (`257352e`)

- **Client** (React 19, Vite, Tailwind v4): there is no router library. `App.tsx` switches between `Landing`, `Privacy` and `AppShell`, and `AppShell` renders the app pages.
  - **Pages:** `AppShell`, `Landing`, `Welcome`, `Ask`, `MyHome`, `BetterHabits`, `Profile`, `Privacy`.
  - **Shared components:** `AppNav`, `PlaceChip`, `States` (Loading, ErrorState), `Attribution`.
  - **Feature modules:**
    - `air-quality`: `AirReadout`, `CitySkyline`, `ForecastChart`, `ForecastPanel`, `SourcesPanel`, `scene`;
    - `today`: `TodayLead`, `AirDetails`, `HelpChoices`, `AskBox`;
    - `daily-plan`: `DailyPlanSection`, `PlanView`, `PlanCard`, `HouseholdPreferencesForm`, `SavedPlansList`;
    - `ask`: `AskEntry`, `useAsk`;
    - `guides`: `GuideGroups`;
    - `location`: `LocationSearch`, `UseMyLocation`, `place`;
    - `onboarding`.
- **Design tokens:** `client/src/index.css`, `@theme static`.
  - **Colours:** `bg` #080f1c, `surface` #101c2b, `elevated` #172638, `surface-light` #f5f8fa, `primary` #39d5c2, `secondary` #64a9ff, `text` #f4f7fa, `text-dark` #182435, `warning` #f5b84b, `danger` #f06b72, `success` #3baa82, `text-muted`, `text-dark-muted`, `rule`, `rule-dark`, `focus` #1f6fd6.
  - **Font:** self-hosted Inter (`--font-sans`).
  - A full token and component review is Stage 1 work (`COMPONENT_REUSE_MAP.md`, `DESIGN_SYSTEM_PROPOSAL.md`).
- **Shared types** (`shared/contracts.ts`): `DataKind`, `Pollutant`, `ForecastSeries`, `ForecastData`, `LimitStatus`, `PollutantCheck`, `AirAssessment`, `WeatherNow`, `RecommendationCandidate`, `DailyPlan`, `PlanPeriod`, `GuideCard`, `GuideGroup`, `GuideSet`, `AskRequest`, `AskAnswer`, `FollowUp`, `HouseholdContext`, `SavedPlace`, `SavedPreferences`, `SavedPlan`, `SavedPlanSummary`, `LocationResult`, `SourceInfo`, `ErrorCode`.
- **API** (Express 5; one Netlify Function in production):
  - **Always available:**
    - `GET /api/v1/health`;
    - `GET /air-quality/forecast`, `GET /air-quality/sources`, `GET /air-quality/current` (always 503: no observations);
    - `GET /locations/search`;
    - `GET /recommendations/guides`;
    - `POST /recommendations/daily-plan`;
    - `POST /assistant/answer`.
  - **Need the anonymous session's token:**
    - `GET` and `PUT /profile/preferences`;
    - `GET` and `POST /plans`, `GET` and `DELETE /plans/:id`;
    - `DELETE /account`.
  - **Limits:** 60 requests a minute overall. Plans, Ask and plan saves share 10 a minute.
- **Tests on this commit:**
  - 338 server tests passed (5 live tests skipped) and 505 client tests passed, with axe in component tests;
  - e2e against the live site: 309 passed, 83 skipped by design, 0 failed (run on 24 Nov before this audit).

## 3. What the live site does well

1. **The answer comes first.** "Forecast within India's 24-hour limits" leads Today at every width. It carries its level tag and "Model forecast · Open-Meteo · updated 9:13 AM", and the default view shows no PM2.5 figure, µg/m³, CPCB or AQI (`prod-today-default-*-first.jpg`).
2. **The recommendation builds itself.** At 768, 1280 and 1440 px the verdict, the top card and "Why this recommendation?" share the first screen (`prod-today-default-1280x720-first.jpg`).
3. **Data honesty holds everywhere:**
   - no banned word in any production capture;
   - stale data gets an amber "Not current" banner directly under the verdict (`local-today-stale-390x844-full.jpg`);
   - an incomplete forecast says "No data" and gives no advice about the day's air;
   - a provider failure shows an error card, never demo data.
4. **Accessibility measurements are clean:**
   - 0 axe violations;
   - 0 overflow, including a 70-character place name and long cards;
   - 0 targets under 44 px;
   - a skip link first, and visible focus on every Tab stop;
   - the place dialog closes on Escape and returns focus to the chip.
5. **Reduced motion is respected:** 2 scene animations under no preference, 0 under `reduce`.
6. **Privacy by design is intact:**
   - location only on "Use my location", rounded to about 1 km;
   - no account until a save;
   - "Remember on this device" is off by default;
   - deletion is one confirmed step.
7. **Navigation and the place chip fix the old long scroll.** The no-place state is a focused Welcome step 1.
8. **Pages are lean and quiet:**
   - one 148 kB script and one 47 kB self-hosted Inter font;
   - LCP mostly 1.0–1.7 s (at worst 2.4 s) after the first cold hit;
   - no console errors or failed requests on any app page.

## 4. Measurements

### The 20 Nov audit's numbers, re-measured with the same definitions

| Measure | 20 Nov (phone / desktop) | Now (phone 320x640 / desktop 1280x720) |
|---|---|---|
| `/app` for Pune, before a plan | 9.0 / 3.8 screens | No longer a default state: the plan builds as soon as a place is set |
| `/app` with the plan built | 13.5 / 7.0 screens | **4.9 / 2.5 screens**, with "See your full day" closed. With every disclosure open: 19.1 at 320 and 11.7 at 1280 (`local-today-details-open-*`) |
| Where the PM2.5 figure sits | y 1002 (screen 2) / y 778 | Not on the default view; inside the closed "Air quality details" (one tap) |
| Where the recommendation sits | "Build my daily plan" at y 4652 (screen 8) / y 1770 (screen 3) | "Your recommendation for today" at **y 741 (screen 2) / y 234 (screen 1)**. The first "Why?" is at y 1200 / y 536 |
| Tab presses to the recommendation | 17, from the search box to "Build my daily plan" | 9 from page load to "Why this recommendation?" (390 and 1280). The definition changed: the search box is now behind the place chip |
| Landing length | 10.6 / 6.4 screens | **13.3 / 7.8 screens: longer** (F-19) |
| Landing calls to action | 1, at the very bottom | 3: "Check My Air" and "Meet Your Assistant" in the hero (screen 1), and "Check My Air" at the end |
| Sideways scroll | none | none on any page or width |
| Technical words in Today's default view | forecast 16, 24-hour 8, model 6, CPCB 5, PM2.5 5; every time had "GMT+5:30" | forecast 7, 24-hour 1, model 2, CPCB 0, PM2.5 0, µg/m³ 0, AQI 0; "GMT+5:30" once, in the weather line (F-21) |

### Page length, LCP and CLS in production

LCP is in milliseconds and the run was unthrottled. CLS over 0.1 is "needs improvement" and over 0.25 is "poor".

| Route | 320x640 | 390x844 | 768x1024 | 1280x720 | 1440x900 |
|---|---|---|---|---|---|
| Landing | 13.3 screens · LCP 5340* · CLS 0 | 9.4 · 1196 · 0 | 6.7 · 2440 · 0 | 7.8 · 1320 · 0 | 6.3 · 1892 · 0 |
| Welcome (direct) | 1.5 · 1140 · **0.182** | 1.1 · 1212 · **0.157** | 1.0 · 1060 · 0.067 | 1.2 · 1072 · 0.075 | 1.0 · 1084 · 0.054 |
| Today | 4.9 · 2164 · **0.171** | 3.4 · 1236 · **0.283** | 2.2 · 1208 · **0.155** | 2.5 · 1708 · **0.104** | 2.0 · 1504 · **0.106** |
| Ask | 2.3 · 1048 · **0.119** | 1.7 · 1260 · 0.004 | 1.2 · 1092 · 0.009 | 1.7 · 1080 · 0.001 | 1.4 · 1144 · 0.001 |
| My Home | 5.0 · 1064 · **0.468** | 3.4 · 1336 · **0.416** | 2.4 · 1480 · **0.348** | 3.0 · 1272 · **0.226** | 2.5 · 1124 · **0.199** |
| Better Habits | 4.3 · 1444 · **0.314** | 2.9 · 1412 · **0.284** | 2.1 · 1536 · **0.157** | 2.6 · 1636 · **0.196** | 2.1 · 1460 · **0.143** |
| My Profile | 3.5 · 1128 · 0 | 2.5 · 1040 · 0 | 1.8 · 1084 · 0 | 2.6 · 1184 · 0 | 2.1 · 1348 · 0 |
| Privacy | 5.3 · 1284 · 0 | 3.4 · 1288 · 0 | 2.0 · 1232 · 0 | 2.8 · 1080 · 0 | 2.2 · 1000 · 0 |

\* This was the run's first request, with TTFB 4282 ms: most likely a cold start of the hosting. Excluding it, TTFB was 257–665 ms.

## 5. What changed since UX_AUDIT.md (20 Nov 2026)

**Status values:**
- still present;
- partly fixed;
- fixed;
- not reproducible;
- not checked.

Most of the change came from at least 44 feature commits on 20–22 Nov ([evidence/changes-since-audit.txt](evidence/changes-since-audit.txt)). That list filters by path, so it leaves out some commits, for example `cb6137b`, which added the Ask endpoint.

| # | Earlier finding | Status | Evidence now |
|---|---|---|---|
| P1 | No plain answer to "How is the air today?" | fixed | The verdict H2 leads Today at every width; the PM2.5 figure is in the closed details (commit 4a675d1). At 320 the caveat sits just below the first screen. |
| P2 | Recommendation behind a button, 8 phone screens down | fixed | Auto-built on load (commit f680943); screen 2 at 320 and screen 1 at 1280. The action itself is still just below the fold on phones (F-03). |
| P3 | Phone first screen is a search form after a place is chosen | fixed | Place chip (commit c58073f); the first screen shows the greeting, the place H1 and the verdict. |
| P4 | Technical detail shown to everyone | fixed | One closed "Air quality details" (`AirDetails.tsx`); captured open in `local-today-details-open-*`. The default view keeps one provenance line. |
| P5 | Same facts repeated 3–6 times | partly fixed | In the default view, "24-hour" went from 8 to 1, "model" from 6 to 2 and "CPCB" from 5 to 0, and the plan's air notice is hidden on Today. Left: the "For you" near-repeat (F-14), and the top card repeated when "See your full day" opens (2.2). |
| P6 | No navigation | fixed | 5-item navigation on every app page; deep links return 200 (commits 5a01d93, 6370082). |
| P7 | Household form is a 9-question wall | partly fixed | Shipped: a 3-step Welcome with Skip, the "Make it personal" invite, and the full form in My Profile. Left: "Delete my saved data" shows with nothing saved (F-05), and the save text still hides that saving creates an account (F-01). |
| P8 | Landing explains plumbing first, with no early call to action | fixed | Hero "Check My Air" and "Meet Your Assistant"; "How AirAware works" second-last (commits c81f5dd, 7a4a037). The page got longer (F-19). |
| P9 | Empty state is 5 screens of disabled parts | fixed | `/app` with no place → Welcome step 1 (1.1–1.5 screens). |
| P10 | Feels like a website on a phone | fixed | `theme-color`, SVG favicon, self-hosted Inter (47 kB), `:active` press scale, `touch-action`, a 44 px logo, and a safe-area bottom bar. Press feel was not judged on a real device. |
| 1.1 | Pune view 9–13.5 phone screens | fixed | 4.9 at 320, 2.5 at 1280. |
| 1.2 | Chart and tables shown by default | fixed | Inside the closed details. |
| 1.3 | Sources and 7 limitations by default | fixed | Inside the details; the footer keeps the required CC BY 4.0 attribution. |
| 2.1 | 24-hour check shown 4 times | fixed | Once in the default view (`terms['24-hour']` = 1). |
| 2.2 | Plan cards listed twice | partly fixed | The default view shows one card. Opening "See your full day" shows the top card again, then again in compact form under its topic. |
| 2.3 | Near-duplicate limitations | fixed | Merged in code (`mergedLimitations`, `today.ts:76-81`); not checked line by line on screen. |
| 2.4 | "Saved on this browser only…" twice | partly fixed | No longer twice on one screen: once in the My Profile form, and once beside "Save plan" in the full day. The text itself is now F-01. |
| 3.1 | Raw coordinates in the place bar | fixed | Only in the details. |
| 3.2 | NO₂, SO₂, O₃ and CO marked "Not assessed" | partly fixed | Moved into the details, but still "Not assessed" with no line saying why (`ForecastPanel.tsx:16`). |
| 3.3 | Model id and prompt version in the main answer | fixed | "Made with AI" or "Made by our rules" only. |
| 4.1 | Technical terms in the default view | partly fixed | Only "GMT+5:30" in the weather line is left (F-21). "24-hour" in the verdict is the audit's own proposed wording. |
| 4.2 | Chart marker "At load" | partly fixed | The chart moved into the details, but the marker still reads "At load" (`ForecastChart.tsx:174`). |
| 4.3 | Landing opens with CAMS and grid size | fixed | Moved to "How AirAware works", near the end. |
| 5.1 | Biggest text is a number | fixed | The verdict is the largest text. |
| 5.2 | Generic H1, place only an H2 | fixed | "Good morning" over "Today in Pune, Maharashtra". |
| 5.3 | One teal button is the only accent | partly fixed | The recommendation is its own card. Below it, the two filled teal buttons are "Make it personal" and "Send", not the recommendation. |
| 6.1 | Long stacked bordered panels (audit: not the main issue) | still present | 6 bordered panels on Today; a visual preference (F-25 covers wide layouts). |
| 6.2 | Landing pipeline as 4 equal cards | fixed | Now a numbered flow. |
| 7.1 | Landing has one button, at the end | fixed | Three calls to action. |
| 7.2 | Two save buttons and a delete on one page | fixed | Answers are saved in Welcome or My Profile, the plan in the full day, and delete lives in My Profile. |
| 8.1 | No navigation at all | fixed | See P6. |
| 8.2 | Saved plans invisible until the first save | partly fixed | Listed in My Profile once a session exists. With no session there is still no section and no hint (F-06). The populated list was not exercised, because that would create an account. |
| 9.1 | Indoor advice only inside a plan | fixed | The My Home page, with groups. |
| 9.2 | Habit advice is 2 cards; no energy or dust content | fixed | The Better Habits page; guide cards for energy use and for dust and cleaning, with sources. |
| 9.3 | Family answers have no visible result | fixed | "My family" opens family questions in Ask (presence seen; not tapped in production). |
| 10.1 | No first-run journey | fixed | `/app` → Welcome (3 steps) → Today. The landing search still goes straight to Today, where "Make it personal" offers the questions. |
| 10.2 | No question-led journey | fixed | Ask AirAware (guided). Its answer path was not exercised in production. |
| 10.3 | A returning visitor lands on a search form | fixed (code) | "Remember on this device" restores the place (`AppShell.tsx`). Not exercised: remembering creates an account. |
| 11.1 | No-place state shows a disabled form and plan | fixed | Welcome step 1 only. |
| 11.2 | The "Official observation: unavailable" card always shows | fixed | One line inside the details. |
| 11.3 | Plan error says only "Something went wrong…" | partly fixed | Still no "your forecast above is still current" line (F-31). |
| 11.4 | Keep the loading, error, stale and no-place states (a keep row) | fixed (kept) | All four captured and kept, restyled. |
| 12.1 | First phone screen is inputs | fixed | See P3. |
| 12.2 | No press feedback | fixed | `:active` scale at 120 ms (a fade under reduced motion). `<summary>` disclosures have no press state. |
| 12.3 | No safe area or `viewport-fit=cover` | fixed | Both present for the bottom bar; landscape sides not padded (F-38). |
| 12.4 | A 70-character place wraps to 4 heading lines | partly fixed | No overflow, but a mid-word break at 320 (F-11). |
| 12.5 | Real-phone check (tap delay, safe areas, keyboard) | not checked | Needs hardware. |

## 6. Product and data rules (Stage 3), verified in current source

| Rule | Verified | Evidence |
|---|---|---|
| Open-Meteo model forecasts | yes | `server/src/services/air-data/openMeteo.ts:11-15,58-102`: CAMS global, `dataKind: 'model_forecast'` |
| A 24-hour comparison against India's limits, not an AQI | yes | `airCheck.ts:7-11` (NAAQS 2009: PM2.5 60, PM10 100) and `:36-55` (needs all 24 values and the µg/m³ unit, else `unknown`) |
| No CPCB National AQI calculation, and no CPCB station observations | yes | No AQI variables are requested (`openMeteo.ts:22-30`, asserted in tests); `/current` returns 503; CPCB is listed as unavailable in sources |
| Every forecast value keeps "Model forecast" provenance | yes, with one gap | `TodayLead.tsx:41-46`, `AirReadout.tsx`, `ForecastPanel.tsx`, `planDisplay.ts:153`. Gap: an Ask answer says "Model forecast" even when no forecast was available (F-34) |
| "Not current" for stale data | yes | `StaleBanner` on Today and Ask answers; plan-stale text on Today and My Home. Ask's header time can briefly lack it (F-33) |
| No fabricated values, timestamps, observations or AQI classes | yes | Provider failure gives `unknown` or an error, never fixtures; AI numbers must come from the input (`planOutput.ts`) |
| No "safe", "healthy", "clean air", "good air" or "bad air" claims | yes for claims | Banned in AI output (`planOutput.ts:127-154`), tested in guides and e2e copy scans; 0 hits in any production capture. A negated "can promise clean air" sits in one rule caveat (F-40, an owner ruling) |
| "Can I go outside?" never answered with a guaranteed yes or no; no medical advice | yes | Typed text only picks a topic (`routes/assistant.ts:20-30`); medical questions get a fixed reply with no AI (`ask.ts`); the AI summary is checked |
| "Why?" keeps reason, inputs, sources and caveat | yes | `PlanCard.tsx` Why panel: Reason, Based on, What it used, Sources (or "No external source"), Caveat |
| Location only on request | yes | `navigator.geolocation` only inside the "Use my location" click handler (`UseMyLocation.tsx:23-44`) |
| Approximate location | yes | Rounded to 2 decimals in three places (`place.ts:48-54`, `api.ts:99-108`, server validation) |
| No account until the user chooses Save | yes | `currentToken()` never signs in; `signInAnonymously` only from Save plan, Save my answers, or Welcome with Remember ticked. The save text doesn't say so (F-01) |
| One-step deletion | yes | "Delete my saved data", then "Delete everything" → `DELETE /api/v1/account` |
| Air quality never inferred from weather or the illustration | yes | `scene.ts:44-68`: air look only from `airCheck.level`; clouds, rain and heat from weather fields |

## 7. Previously approved decisions (Stage 4)

| Item | Status | Evidence |
|---|---|---|
| D1 guided Ask (starters and free text matched to rules and forecast; AI only rephrases) | implemented | 6 topic chips and 5 starter questions; free text classified by fixed keyword lists (`askTopics.ts:231-237`); cards from rules, then guides |
| Optional 3-step onboarding, no long form first | implemented | `Welcome.tsx:99-363`: place, day, home; Skip on steps 2 and 3 (`local-welcome-step2-*`, `local-welcome-step3-*`); the full form only in My Profile |
| "Remember on this device": explicit, off by default, no precise coordinates | implemented | Checkbox off by default (seen in `local-welcome-step3-390x844-full.jpg`). Stores the label plus 2-decimal (about 1 km) coordinates; the pack's D2 line says "label only" (F-43) |
| D3: one recommendation auto-built at most once per place per hour, cached, within limits, with rules fallback | partly | Client: builds when there's no plan, the answers changed, or the plan is over 60 minutes old (`DailyPlanSection.tsx:183-190`). Server: rules fallback when the AI fails or is invalid; 10-a-minute plan limit. Per-instance caches on Netlify mean "once per place per hour" isn't guaranteed across visitors or instances. Production per-load behaviour was not measured (the capture replayed one reply) |
| Separate My Home and Better Habits pages | implemented | `/app/home`, `/app/habits`, both in the navigation |
| D4 cited energy and dust or cleaning content | implemented, as guide cards | "Dust and cleaning" and "Energy use" guide cards with sources (`guides.ts`); they are guides, not rules-engine rules, so they never enter a daily plan |
| D5 self-hosted Inter, CSS-first motion, no motion library | implemented | `client/public/fonts/inter-latin-wght-normal.woff2` (47 kB); no Framer Motion or other motion dependency in `client/package.json` |

## 8. Accessibility, mobile and technical results

- **axe-core 4.14.0:** 0 violations in 21 production runs (every route at 390x844 and 1280x720) and in every local run, including:
  - all disclosures open;
  - the place dialog;
  - Welcome steps 2 and 3.

  axe's "needs review" results were not recorded.
- **Overflow:** 0 elements or text runs past the screen edge in all 111 measured captures (48 production, 55 local, 8 supplementary). The two place-search state captures were screenshots only.
- **Tap targets:** 0 controls under 44 px.
- **Keyboard:** Tab walks of Landing, Today, Ask and Welcome at 390 and 1280:
  - skip link first;
  - every stop has a visible, unobscured ring;
  - the place dialog returns focus to its chip on Escape;
  - on phones, focus visits the bottom bar before the place chip at the top (F-13).
- **Reduced motion:** 2 scene animations (cloud drift, rain) under no preference; 0 under `reduce`.
- **Large text:** simulated with a 200% root font size (not browser zoom). Nothing overflows, but the Ask input shrinks and the header scrolls sideways (F-12).
- **Head metadata:**
  - present: title, description, `lang="en"`, `viewport-fit=cover`, a single `theme-color` `#080f1c`, and an SVG favicon;
  - missing: social-preview tags, `apple-touch-icon` and a manifest (F-36).
- **Payload:** one 148 kB script (553 kB raw), the Inter font (47 kB), and two landing screenshots (218 kB).
- **Errors:** no console errors and no failed requests on any production app page.
- **Routing:** deep links return 200. An unknown app path silently becomes Welcome (F-09); other unknown paths get Netlify's unbranded 404 (F-08).

## 9. The most important findings

Ranked by severity, then by how many people meet them. All 44 are in the [register](FINDINGS_REGISTER.md).

| Rank | ID | Finding | Severity |
|---|---|---|---|
| 1 | F-01 | Save and Remember text says "on this browser" or "on this device", but saving creates an anonymous account on AirAware's database | P2 |
| 2 | F-03 | On phones, the recommendation itself is just below the first screen | P2 |
| 3 | F-02 | Today, My Home and Better Habits shift as content loads (CLS up to 0.47) | P2 |
| 4 | F-04 | An Ask answer lands below the fold at 320 and 1280 px | P2 |
| 5 | F-10 | The place chip truncates to "Pun…" at 768 px, where it is the only place name on most pages | P3 |
| 6 | F-05 | "Delete my saved data" shows, and reports success, when nothing is saved | P3 |
| 7 | F-19 | The landing page grew to 13.3 phone screens; the desktop search is just below the fold | P3 |
| 8 | F-20 | Ask's first screen is 11 pills, with the type-your-own box below the fold | P3 |
| 9 | F-25 | Tablet and desktop layouts leave half the content area empty | P3 |
| 10 | F-07 | The Privacy page and PRIVACY.md disagree about removing unused accounts | P3 |

**Owner decisions found during the audit** (not defects):
- F-24: the help-choice names come from spec 04;
- F-40: the negated "clean air" in a rule caveat;
- F-43: the remembered place stores coordinates, while the pack's D2 line says "label only";
- F-44: the pack contradicts itself on the stale backdrop;
- F-16: the "Live air information unavailable" wording is spec-fixed copy.

## 10. Not checked, or only partly checked

| Requirement | Status | Why, and how to cover it |
|---|---|---|
| Real devices and other engines | not checked | All captures used headless Chromium on one Windows machine. Firefox and WebKit builds are installed but weren't run. Tap delay, safe areas, the keyboard over inputs and press feel need a real phone (20 Nov audit 12.5). |
| Returning visitor with a remembered place (journey 2) | not checked | Needs a session. In production that creates an anonymous account, and local dev uses the production Supabase project (F-42). Cover with a separate development Supabase project, or the owner's OK for one test account. |
| "No saved plans yet", a populated saved-plans list, an opened snapshot, the delete confirmation | not checked | Same reason. Code-trace only. |
| Full-page captures at 320, 768 and 1440 | partly | First screens exist at all five widths for every route. Full pages only at 390 and 1280 (and 320 for local states), to keep the screenshots small. |
| States on routes other than Today (Ask thinking or error, My Home building or failing, Better Habits guides failing) | partly | Loading, stale, unavailable and error were captured on Today only. Cover with the same fixtures on those routes. |
| Change location in production (journey 6) | partly | Covered locally (results, no result, error, Escape). No production search request was made. |
| Ask answer in production (journey 5) | not checked | An Ask answer may call the AI. Local fixture only. |
| Keyboard on My Home, Better Habits, My Profile, Privacy and inside the place dialog | partly | Not walked. Only Escape and focus return were checked for the dialog. |
| Contrast over the sky backdrop | partly | axe color-contrast found 0 violations at 390 and 1280; its "needs review" items (text over gradients) were not recorded or reviewed. |
| Performance | partly | One unthrottled run; no INP, no field data, no LCP element; Lighthouse not installed. Cold-start TTFB not investigated. |
| Font loading behaviour, cache headers on `/assets/*` | not checked | Sizes were recorded, but not `font-display`, preload or caching. |
| Production API headers (CSP, rate-limit) and the deployed server commit | not checked | A read-only `GET /api/v1/health` with headers would cover both headers; the commit needs a version endpoint or the Netlify deploy log. |
| In-app navigation request counts (re-fetching on tab switch) | not checked | Each capture was a fresh load. |
| Component inventory and CSS token review | partly | Routes, APIs, rules, copy and data flow were traced. A full token and component inventory is Stage 1 work (`COMPONENT_REUSE_MAP.md`). |

## 11. Evidence and repository size

- **Screenshots:** [screenshots/](screenshots/) holds 157 JPEGs, **8.8 MB in total**.
  - Naming: `{prod|local}-{route}-{state}-{width}x{height}-{first|full}.jpg`.
  - The repository is 1.8 MB packed, and the challenge limit is 10 MB including history, so **committing all of them would put the repo near or over the limit.**
  - They are uncommitted. Recommendation: commit none, or a curated set under 1 MB (about 10 key first screens), and keep the rest outside git. That is the owner's decision.
- **Evidence folder:** [evidence/](evidence/) is 684 kB. It holds:
  - the production, local and supplementary metrics (JSON);
  - the production-vs-local notes;
  - the list of commits since the 20 Nov audit;
  - the two capture scripts;
  - the merged, verified analysis.
- **Nothing is committed.** No application file was changed by Stage 0.
