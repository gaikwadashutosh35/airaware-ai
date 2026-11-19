# Phase 7 — The daily plan on screen (design)

Status: approved by the owner, 2026-11-19. Plan: `docs/superpowers/plans/2026-11-19-phase7-plan-screen.md`. Owner choices:
- the screen as played back on 2026-11-18 ("Looks right");
- a hand-drawn SVG chart, not recharts;
- automated journey tests with Playwright.

Sources this design builds on:
- `docs/IMPLEMENTATION_PLAN.md` §7 Phase 7.
- `PRD.md` §7 (P0), §8 (US-03 to US-09), §13 to §15.
- `DESIGN.md` §2, §7 (dashboard order), §9 to §13.
- `TESTING_QA.md` §7 (the journey).
- `AGENTS.md` §5 and §8; `.claude/rules/frontend.md`.
- Phase 4 to 6 code:
  - `shared/contracts.ts` (`DailyPlan`, `RecommendationCandidate`, `SavedPlan`);
  - `client/src/pages/Dashboard.tsx`, `features/air-quality/*`, `features/daily-plan/*`;
  - `client/src/services/api.ts`, `lib/supabase.ts`;
  - `server/src/app.ts`.

## Intent

The rules engine, the Gemini plan and saving all work, but nobody can see them yet: the dashboard stops at the forecast and the household form. Phase 7 puts the daily plan on screen so a person can:
- turn their place and household answers into a plan;
- see why each action is suggested;
- read the indoor and swap suggestions;
- save the plan and come back to it.

It also adds the forecast chart, a sources and limitations panel, and a privacy page. The full journey is checked by automated tests on desktop and phone sizes. This completes the PRD's P0 list.

## Goals

- A "Build my daily plan" button builds the plan from the chosen place and the household answers on screen, whether or not they are saved.
- Every action card has a "Why?" panel: reason, evidence type, what it used, sources and caveat (US-06).
- Indoor air and sustainable swaps each get their own section (US-07, US-08). The "indoor air assistant" in the PRD is this section; chat stays deferred.
- "Save plan" saves the plan the server builds. A saved-plans list opens and deletes them (US-09).
- A 48-hour PM2.5 and PM10 chart with a text summary; the hourly table stays.
- Nothing older than an hour is presented as current (US-10).
- A privacy page at `/privacy`.
- A Playwright suite that walks `TESTING_QA.md` §7 steps 1 to 12 on desktop and phone sizes, plus the failure cases.

## Non-goals

- Chat or any free-text question to Gemini.
- The share card (P1, needs a privacy review).
- Hindi or Marathi.
- Saved locations.
- Plan feedback.
- Any new server endpoint for plans: Phases 5 and 6 provide them all.
- Running Playwright in CI. It needs real Supabase, Open-Meteo and the network; Phase 8 decides.
- Landing-page chapters 3 to 6 (plan, indoor, swaps, "see why"), which the Phase 3 design moved to Phase 7. The user chose a short follow-up straight after this phase, so its screenshots show the finished plan screen. That follow-up also settles the screenshot budget: Phase 3 allows one landing screenshot of about 150 KB.

## Anti-goals (a failure even if it works)

- A plan shown without its air notice, or the air check shown without saying it is a model forecast for a ~45 km area, not a station measurement and not the CPCB AQI.
- A saved plan that looks like today's air.
- A rules-only plan that looks broken or empty because Gemini is down. Gemini is out of credits today, so this is what people will see.
- An action without its reason, or a "Why?" panel that invents a source.
- Colour as the only signal anywhere.
- A chart that implies certainty the data does not have, or compares single hours with a 24-hour limit.

## Constraints

- **Gemini returns HTTP 402 today**, so every plan is rules-only: `summary` is null, and every `featured` item has `period: null` and `forYou: null`. The screen must be complete in that state, and the AI state must still work when credits come back.
- **Plan request:** `POST /api/v1/recommendations/daily-plan`, rate-limited to 10 per minute per IP, shared with `POST /api/v1/plans`.
- **Saving needs the session from `lib/supabase.ts`.** Building a plan never creates an account; only "Save plan" or "Save my answers" does.
- **Dependencies:** one new dev dependency, `@playwright/test`, with Chromium only. No new runtime dependency.
- **Repo rules:** under 10 MB, one branch; the Playwright browser download goes to the user cache, not the repo.
- **Design:** `DESIGN.md` tokens and type scale; the existing dashboard look (light surface, `border-rule` panels).

## Approaches (owner chose SVG + Playwright)

**Chart**
1. **Hand-drawn SVG (chosen).** About 80 lines, no package, accessibility fully under our control, and the table carries exact values.
2. **Recharts.** Ready-made axes and tooltips, but a large package on every page, on top of the existing 243 KB bundle.

**Journey checks**
1. **Playwright in the repo (chosen).** Repeatable, and listed in `AGENTS.md` §8.
2. **Manual walk-through in the browser pane.** No tooling, but not repeatable.

## The screen

Order, following `DESIGN.md` §7:

```
Place search · Use my location
[Air quality: Pune, Maharashtra]
  Official observation (CPCB unavailable)         existing
  Model forecast + NEW 48-hour chart + table      existing panel, chart added
Your household (optional)                          Phase 6 form
Your daily plan                                    NEW
  [Build my daily plan]   (needs a place)
  Made by: AI (gemini-…, daily-plan-v1)  |  Made by our rules
  Summary (AI only)
  Notices (always, first)  e.g. "Particle levels forecast above…"
  Air check: next 24 h from <time> · PM2.5 avg 71 μg/m³ (limit 60, above) · PM10 …
  Your day (AI only): morning · commute · daytime · evening · home
  Outdoors and travel · Indoor air · Sustainable swaps   (cards with "Why?")
  [Save plan]  note: "Saved on this browser only…"
Saved plans (only when this browser has a session)
  Pune, Maharashtra · saved Tue 18 Nov, 4:10 pm IST  [Open] [Delete]
Sources and limitations                            reworked SourcesPanel
Footer: attribution · Privacy
```

On a narrow phone everything is one column, in the order above.

## Plan display rules

- **Building:**
  - "Build my daily plan" is disabled until a place is chosen. The hint next to it says "Choose a place first."
  - The request uses the place, rounded to 2 decimals, and the household form's current answers.
  - Loading shows a loading state with a live status. The worst case is about 25 seconds with Gemini (Phase 5 note M5), so the text says it can take a little while.
  - Errors use the existing `ErrorState` (retry for network or provider errors; rate-limit wording for 429).
- **Choosing a new place** clears the shown plan. Changing household answers does not rebuild by itself. The plan area then shows "Your answers changed. Build the plan again to use them."
- **Made-by line:** always shown.
  - AI plan: "Made with AI (`model`, prompt `promptVersion`). The advice text and sources come from our fixed rules."
  - Rules plan: "Made by our rules. AI personalisation is unavailable right now."
- **Notices** (`plan.notices`) always render first, before any action, with their caveat in full. They are never collapsed.
- **Air check row:** from `plan.air`, with `windowStart` in local time. Each pollutant shows its 24-hour average, unit μg/m³, limit, and status in words (above / within / unknown). Source line: "Open-Meteo model forecast, retrieved <time>" from `plan.forecast`. When `plan.forecast` is null, the row says air information is unavailable, matching the notice.
- **Your day:** shown only when at least one featured item has a period. Featured items are grouped in the fixed order morning, commute, daytime, evening, home, each card with its "For you" line. Periods with no items are left out.
- **Topic sections:** always shown. They hold every non-notice candidate from `featured` and `more`, grouped by `section`:
  - `action` → "Outdoors and travel";
  - `indoor` → "Indoor air";
  - `swap` → "Sustainable swaps".

  Inside a section, featured items come first in their plan order, then `more` in rules order. In an AI plan, a card already shown under "Your day" appears again in its topic section in compact form (title plus "In your day: morning"), so no advice is lost and nothing is duplicated in full. An empty topic section shows one line: "No suggestions in this area for your answers today."
- **Card:**
  - Title, text, and a priority shown in words: "Important today" for `high`, nothing extra for `medium` and `low`.
  - A "Why?" disclosure (`<details>`), closed by default, listing:
    - **Reason:** `candidate.reason`.
    - **Based on:** "today's forecast check" for `data_driven_rule`, or "general guidance" for `general_suggestion`.
    - **What it used:** `inputsUsed` mapped to plain labels. Household paths reuse the form's question labels; `air.level` becomes "the 24-hour forecast check". An unknown path is shown as-is, never hidden.
    - **Sources:** the plan's `sources` entries for `sourceIds`, as links. None → "No external source; this is general guidance."
    - **Caveat:** `candidate.caveat`, when present.
- **Safety note:** `plan.safetyNote` always shows at the end of the plan.

## Saving, the list and stale data

- **Save plan:**
  - Calls `tokenForSave()`, then `savePlan(token, sameRequestBody)`.
  - On success the plan area shows the returned saved plan, which may differ if more than 10 minutes have passed. The status reads "Saved on this browser. This is the plan as saved."
  - Errors:
    - `409` → "You can keep up to 20 saved plans. Delete one to save another."
    - `503` or any failure → "Saving isn't available right now."
    - Nothing ever claims the plan was saved unless the server said so.
- **Saved plans list:**
  - Shown when `currentToken()` returns a session (never creates one).
  - Lists `placeLabel` and `savedAt` in local time, newest first. Each row has "Open" and "Delete"; delete uses the same one-step confirmation pattern as the form.
  - It refreshes after a save or a delete.
  - Empty → "No saved plans yet."
  - Load failure → "Your saved plans couldn't be loaded right now."
- **Opening a saved plan:**
  - Shows it in the plan area under a banner: "Saved plan from <savedAt>. This is a snapshot, not current air information." The banner has a "Back to today" action that clears it.
  - The made-by line, notices, air check and sources are those stored with it.
- **Stale rule:** one shared helper, `isOlderThan(iso, now, 60 min)`.
  - **Which "now" (my call, after the builder check):** a running clock that ticks every minute and when the tab becomes visible again. Checked only at load or build time, the server's 10-minute caches mean nothing would ever look stale, so a tab left open for hours would keep showing old data as current.
  - The forecast's "Values for <hour>" figures and the chart's marker stay at load time. The marker is labelled "At load" instead of "now", and the stale message tells the person to reload. This way the existing panel's numbers never change on their own.
  - **Forecast panel:** when `retrievedAt` is older than 60 minutes, it says "Retrieved more than an hour ago. Reload for the latest forecast."
  - **Live plan:** when `plan.forecast.retrievedAt` (or, if null, the build time) is older than 60 minutes, it shows "This plan was built more than an hour ago. Build it again for the latest forecast." with the build button.
  - **Saved plans** always carry the snapshot banner instead.

## Chart

- **What it plots:** a hand-drawn SVG line chart of PM2.5 and PM10 over all forecast hours, both in μg/m³ on one y-axis starting at 0. The x-axis is local time, labelled every 6 hours.
  - PM2.5 is a solid line and PM10 a dashed line, in `DESIGN.md` tokens, with a text legend. Colour is never the only difference.
  - A missing hour breaks the line instead of joining across it.
  - A "now" marker shows the current hour.
- **No limit line.** India's limits are 24-hour averages, and drawing them across single hours would suggest that a single hour can breach them. The plan's air check carries the comparison.
- **Accessibility:**
  - The SVG has `role="img"` and an accessible name.
  - A visible text summary, computed from the data, sits next to it, for example: "PM2.5 ranges from 38 to 92 μg/m³ over the next 48 hours, highest around Wed 20 Nov, 08:00 IST." The same applies to PM10, and missing values are mentioned.
  - The existing hourly table stays as the exact-values alternative.
- **Sizing:** the chart scales to its container width (viewBox) with no horizontal scroll at 320 px. It has no animation, so there is no reduced-motion concern.
- **Marker:** the "now" marker is drawn at the hour the forecast loaded and labelled "At load" (see the stale rule).
- **Code split:** the chart's scaling and summary maths live in a pure, unit-tested module; the component only draws.

## Sources and limitations panel

The existing `SourcesPanel` becomes "Sources and limitations", placed after the plan:
- **Each source:** name, link, connected or not, licence and attribution. This includes the Open-Meteo CC BY 4.0 credit and the CPCB "not connected" row.
- **Limitations, always listed:**
  1. "Forecasts are model estimates for an area about 45 km wide, not station measurements."
  2. "We do not calculate the CPCB National AQI."
  3. "The 24-hour check compares a model forecast with India's 24-hour limits; official compliance is judged on measured station data over a year."
  4. "AI personalisation can be unavailable; plans then use our fixed rules only."
  5. The forecast's own `limitations` lines (moved here from the forecast panel, so they show once).
- **Footer:** the existing attribution line stays, with a "Privacy" link added.

## Privacy page

- **Route:** `/privacy`, a third page in `App.tsx`. The server serves `index.html` for `/privacy` as it does for `/app`; a test covers it.
- **Content:** plain language, written from `PRIVACY.md` as built:
  - what stays in the browser;
  - what is sent to Open-Meteo (place search text; coordinates rounded to 2 decimals);
  - what is sent to Gemini (the forecast check and rule text; no place, coordinates or answers verbatim);
  - what Supabase stores, and its logs;
  - how to delete;
  - that no analytics are collected.
- **Links:** from both footers.

## Stress pass

Run the `break-ui` skill on the plan area and the saved list with worst-case data: very long place labels, every candidate present, all sections empty, missing averages, 20 saved plans, long caveats. Fix every break it finds, each with a test where the break is in logic. Visual-only fixes are checked in the browser at 320 px and desktop.

## Playwright journey tests

- **Setup:**
  - `@playwright/test` as a root dev dependency, `playwright.config.ts` and an `e2e/` folder.
  - Two projects: "desktop" (Desktop Chrome) and "phone" (Pixel 7 emulation). Chromium only.
- **Server:** the real app, using the `webServer` option. The client is built and Express serves it with the API on one port, as in production. Real `server/.env` and `client/.env` are loaded.
- **Script:** `npm run e2e` (not part of `npm test`, not in CI). It needs network access and, for the save steps, the Supabase settings; without them the save steps are skipped with a visible reason.
- **Journey test (live)** walks `TESTING_QA.md` §7 steps 1 to 12 against real Open-Meteo and real Supabase:
  1. Open the app.
  2. Search Pune and pick it.
  3. Check the data-kind, source and time labels.
  4. Answer two household questions.
  5. Build the plan; check the made-by line and the notice.
  6. Open a "Why?" panel.
  7. Check the indoor section.
  8. Check the swaps section.
  9. Save the plan.
  10. Reload; check the saved list shows it.
  11. **Isolation (my call, after the builder check):**
      - A second, fresh browser context, which is a second anonymous user, saves its own plan.
      - Its saved list shows only that plan, never the first user's.
      - It then deletes its own data.

      This runs before step 12, because a context with no session shows no list and would prove nothing. Isolation through the API and directly in the database was already proven by the Phase 6 live test; this step proves it in the UI.
  12. The first user deletes saved data; check it's gone after a reload.

  Every account the test creates is deleted again: 2 per screen size, 4 per run, well under Supabase's 30 sign-ins per hour.
- **Failure tests (deterministic)** use `page.route` on the browser's `/api/v1/*` calls:
  - **Provider down:** the forecast returns `502`, and the plan comes back with air `unknown` and the `data.unavailable` notice. The forecast error state, the unavailable notice and the "air information unavailable" air check all show.
  - **Stale:** the forecast and plan have `retrievedAt` 3 hours ago, and both stale messages show.
  - **AI down:** the rules-only plan shows "Made by our rules…", topic sections and no "Your day".
  - **AI up:** an AI-shaped plan fixture shows the summary, "Your day" in period order and "For you" lines.
  - **Plan error:** the plan request returns `429`, and the rate-limit message shows.
- **Accessibility:** each test runs the existing axe check on the page at its end state (colour contrast included, since this is a real browser).

## Tests (unit, Vitest)

- **Chart maths:** scaling, gaps for missing values, and the summary text (min, max and the time of the max; missing values).
- **Display rules:** grouping into Your day, topic sections and compact repeats; the empty-section line; the made-by line for each `generatedBy`; `inputsUsed` labels.
- **Stale helper.**
- **Components:** plan area states (idle, loading, error, AI plan, rules plan, saved snapshot); save (success, 409, 503); saved list (none, items, delete with confirmation, load failure); privacy page renders; axe on each.
- **Server:** `/privacy` serves the client.

## Docs to update

- `USER_GUIDE.md`: the plan, saving, privacy.
- `CHANGELOG.md`.
- `docs/IMPLEMENTATION_PLAN.md` Phase 7 "As built", with the Playwright results.
- `TESTING_QA.md` §7: how to run `npm run e2e`.
- `SETUP.md`: the Playwright browser install line.

## Settled after the builder check (my calls)

- **Household answers move up into the dashboard.** The form reports its answers (an `onChange`-style prop), so the plan uses what is on screen, saved or not.
- **Plan-request errors get their own wording.** The existing `ErrorState` text talks about the forecast.
- **Accessibility in Playwright reuses the installed `axe-core`.** No second dependency.
- **Chart colours come from existing `DESIGN.md` tokens** with enough contrast on the light surface. Line style (solid or dashed) carries the difference too.
- **Notices show their reason and sources the same way cards do.** `air.PM2_5` and `air.PM10` in `inputsUsed` get plain labels.
- **Playwright runs one worker** (no parallel tests), to stay under the 10-per-minute plan limit.

## Left to the builder

- File split.
- Component names, within `DESIGN.md` §8's list where it fits.
- Exact copy within the rules above.
- Chart tick details.
- Fixture contents.
- Test names.
