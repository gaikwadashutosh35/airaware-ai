# Assistant Redesign, Phase 6: Today, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Today answers "How is my air?" in one sentence and shows one recommended action, built automatically. Below it are 4 help choices, an Ask box, and every technical detail folded into "Air quality details".

**Architecture:**
- **Pure helpers** in `features/today/today.ts`: the verdict, the greeting, the top recommendation and the merged limitations.
- **The readout is split:**
  - the scene, verdict, provenance line, stale banner and caveat lead the page;
  - the PM2.5 figure, provider lines and the forecast panel move into one `<details>`.
- **`DailyPlanSection` builds by itself** (D3). It shows the top card, with the rest under "See your full day".
- **A saved plan opens inside My Profile** (spec §7.7), so Today no longer holds a snapshot.

**Tech stack:** React 19, Tailwind v4, native `<details>`; Vitest and Testing Library; Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md` §7.2, §7.3, §7.7, §8 and §9.2 (D3). Wireframes: sections 1 and 2.

## Global constraints

**Copy, exact:**
- **Greeting:**
  - "Good morning" from 05:00 to 11:59, device time;
  - "Good afternoon" from 12:00 to 16:59;
  - "Good evening" otherwise.
- **H1:** "Today in {place}".
- **Verdict** (from the server's `airCheck.level`; these are the existing rule titles):
  - `not_elevated`: "Forecast within India's 24-hour limits".
  - `elevated`: "Forecast above India's 24-hour limit".
  - `unknown`: "Live air information unavailable".
- **Plain explanation:**
  - `not_elevated`: "Fine and coarse particles are forecast below the national daily limits for the next 24 hours."
  - `elevated`: "{Fine particles (PM2.5) / Coarse particles (PM10) / both, joined with "and"} are forecast above the national daily limit for the next 24 hours."
  - `unknown`: "We could not get a complete 24-hour forecast for this place, so there's no advice about today's air. The suggestions below apply on any day."
- **Caveat** (`not_elevated` only, existing text): "Being within the national limit does not mean the air is clean or free of risk."
- **Provenance line:** "Model forecast · Open-Meteo · updated {h:mm AM/PM}". The time is `retrievedAt` in device time.
- **Headings:** "Your recommendation for today", "See your full day", "What would you like help with?", "Ask AirAware anything" and "Air quality details".
- **Recommendation:** "Why this recommendation?" is the label of the existing "Why?" disclosure on the recommendation card only. The building state is "Finding your recommendation…". The error is "We couldn't build your recommendation." with "Try again".
- **Help choices:**
  - "Outdoor activities" ("Walks, exercise, commutes");
  - "My home" ("Cooking, windows, purifiers");
  - "My family" ("Children, older adults, school runs");
  - "Greener habits" ("Small swaps that cut smoke and exhaust").
- **Ask:** an input labelled "Ask about your air, home or day". Starter questions: "Can I go for a morning walk today?", "Is it a good idea to open my windows?" and "How can I improve my indoor air?".
- **Details:** the line "Official CPCB observations are not connected yet."

**Data rules, kept word for word:**
- "Model forecast";
- the stale sentence;
- rule card text;
- the safety note;
- units and timestamps (time zone kept inside the details);
- every limitation the server returns.

**Never shown:**
- "safe", "healthy", "clean air", "good/bad air";
- any AQI;
- coordinates outside the details.

**Process:**
- Test-first.
- No push. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## My calls (for your review)

1. **Merged limitations.**
   - The details show the server's forecast limitations word for word ("Model forecast, not a station observation." / "Not the CPCB National AQI." / "Grid cell is about 45 km wide; conditions near roads or local sources can differ."), plus the app's 2 lines that no server line covers: the 24-hour-check line and the AI-unavailable line.
   - The 2 client lines that repeat the server's are dropped.
   - Result: 5 distinct lines, not 7.
2. **The Ask box and help topics pass through shell state, not the URL.** A question must never reach browser history or server logs (spec §7.4). The Ask page (Phase 7) reads it; until then the placeholder ignores it.
3. **The place bar is removed.** Its coordinates move into the details, and the place button changes the place.
4. **A saved plan opens inside My Profile, with "Close"** (spec §7.7). Today shows only the live plan, so its snapshot banner and "Back to today" go.
5. **Automatic building** happens when Today is shown with a place and any of these is true:
   - there's no plan for this place;
   - the answers differ from the ones the plan used;
   - the plan is from an earlier hour.

   It is never repeated while a build is in flight. "Build my daily plan" goes; "Try again" stays for errors.
6. **The recommendation:** the AI plan's first featured card that isn't the air notice, else the first rules-only card that isn't a notice. With none, the card area says "No suggestions for your answers today." (the existing empty text).

## Review focus

1. **Many automatic builds.** Expected: switching pages and coming back doesn't rebuild. A changed answer rebuilds once. The 10-a-minute limit is never reached by normal use. Task 3 tests: `builds once when Today opens` and `rebuilds once after answers change`.
2. **The forecast fails, but the plan works.** Expected: the error card stands in for the verdict, and the recommendation still builds from the rules. Task 2 test: `a forecast error keeps the recommendation`.
3. **Stale data.** Expected: the "Not current" banner sits under the verdict and is never inside the closed details. Task 2 test: `the stale banner stays outside the details`.
4. **Screen readers and the closed details.** Expected: the details' summary is "Air quality details". Units and timestamps are still present inside, and nothing in the default view states a number without its unit. Task 4 test: `the details hold every number with its unit`.
5. **A long place name and a narrow phone.** Expected: the H1 wraps, the place button truncates, and nothing scrolls sideways at 320 px. Checked in Task 6 with screenshots.

---

### Task 1: Today helpers

**Files:**
- Create: `client/src/features/today/today.ts` and its `.test.ts`.

**Interfaces (produces):**
- `greeting(at: Date): 'Good morning' | 'Good afternoon' | 'Good evening'`
- `verdictFrom(check: AirAssessment): { title: string; explanation: string; caveat: string | null }`
- `topRecommendation(plan: DailyPlan): PlanItem | null`, built on `groupPlan` in `planDisplay.ts`.
- `mergedLimitations(forecastLimitations: readonly string[]): string[]`. It returns the forecast's lines plus the app's two (§ My calls 1). With no forecast, it returns `LIMITATIONS` unchanged.

- [ ] **Step 1: Write the failing tests:**
  - **Greeting:** boundaries at 04:59, 05:00, 11:59, 12:00, 16:59 and 17:00.
  - **Verdict:** each level's exact copy, and an elevated PM10-only case.
  - **Top recommendation:**
    - `skips the air notice`;
    - `prefers a featured card`;
    - `null when only notices`.
  - **Limitations:**
    - `limitations are distinct and keep the server's words`;
    - `limitations without a forecast are the app's own`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): today helpers`.

### Task 2: The top of Today

**Files:**
- Create: `client/src/features/today/TodayHeader.tsx`, `Verdict.tsx` and their tests.
- Modify:
  - `AirReadout.tsx` (it becomes the details' readout: the figure, check lines and provider lines);
  - `AppShell.tsx` (the place bar goes);
  - `AppShell.test.tsx`;
  - `e2e/journey.spec.ts` and `e2e/failures.spec.ts` (heading names).

- [ ] **Step 1: Write the failing tests:**
  - `greets and names the place in the H1`. The H1 takes focus after a place is chosen, replacing the old h2.
  - `the verdict leads, with its tag, provenance and caveat`.
  - `the stale banner stays outside the details`.
  - `a forecast error keeps the recommendation`.
  - `no coordinates outside the details`.
  - Update the existing tests that name "Air quality: Pune, Maharashtra" (h2) or "Change place" (the place bar) to the H1 and the place button.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** On desktop, the scene and verdict sit on the left and the recommendation slot on the right (`lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`).
- [ ] **Step 4:** Run `npm test -w client` and `npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): today leads with the verdict`.

### Task 3: The recommendation builds itself

**Files:**
- Modify:
  - `DailyPlanSection.tsx` and its test;
  - `PlanView.tsx` (the `hideAir` prop: no "Air notice" or "Air check");
  - `PlanCard.tsx` (the `whyLabel` prop);
  - `AppShell.tsx` and its test;
  - `e2e/journey.spec.ts`.

**Interfaces:**
- `DailyPlanSection({ place, context, now, active, onSaved, deletedPlanId })`. `active` is true while Today is shown; `opened` is removed (Task 5).

- [ ] **Step 1: Write the failing tests:**
  - `builds once when Today opens`. Exactly 1 POST after Today → Profile → Today.
  - `rebuilds once after answers change`.
  - `rebuilds when the plan is from an earlier hour`.
  - `shows only the top card, with Why this recommendation?`.
  - `the full day is folded and keeps Save plan`.
  - `a plan error offers Try again and keeps the verdict`.
  - Update the `buildPlan` helper to wait for the automatic build.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The plan building skeleton reuses `Loading`.
  - "See your full day" is a `<details>` holding `PlanView hideAir` and "Save plan".
  - Update the e2e journey: no build click; the Air notice steps become the recommendation's "Why this recommendation?".
- [ ] **Step 4:** Run `npm test -w client` and `npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): the recommendation builds itself`.

### Task 4: Help choices, Ask box and air details

**Files:**
- Create: `client/src/features/today/HelpChoices.tsx`, `AskBox.tsx`, `AirDetails.tsx` and their tests.
- Modify: `AppShell.tsx` (an `askIntent` state: `{ topic?: 'outdoors' | 'family'; question?: string } | null`), `SourcesPanel.tsx` (it uses `mergedLimitations`).

- [ ] **Step 1: Write the failing tests:**
  - `help choices go to their pages`: Home goes to `/app/home`, Habits to `/app/habits`, Outdoor and Family to `/app/ask`, with the topic in shell state.
  - `the ask box sends its question in memory, not the address`. The URL never contains the text.
  - `starter questions fill the ask box`.
  - `the details are closed and hold the figure, the panel, the CPCB line, the method and the sources`.
  - `the details hold every number with its unit`.
  - `the check explains India's limits and no AQI`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **The method text:** "India's 24-hour limits are 60 µg/m³ for PM2.5 and 100 µg/m³ for PM10. We compare the model forecast's 24-hour averages with them. We don't calculate an AQI." The values come from `airCheck.checks[].limit`, not hard-coded.
  - **The coordinates line** ("Forecast location: {lat}, {lon}") sits inside the details.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): help choices, ask box and air details`.

### Task 5: A saved plan opens in My Profile

**Files:** modify `Profile.tsx`, `AppShell.tsx` and `DailyPlanSection.tsx`, plus their tests.

- [ ] **Step 1: Write the failing tests:**
  - `Open shows the saved plan inside My Profile with Close`: the snapshot banner text is unchanged, and focus moves to it.
  - `Close returns focus to the plan's Open button`.
  - `deleting the open plan closes it`.
  - Update the earlier shell tests that opened a plan onto Today.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** Remove `opened` from Today and the redirect guard.
- [ ] **Step 4:** Run `npm test -w client` and `npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): saved plans open in My Profile`.

### Task 6: Proof

- [ ] **Step 1: The gate.** Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run e2e`.
- [ ] **Step 2: See it.**
  - Today at 320, 768 and 1280 px in four states: fresh, stale, forecast error and plan building.
  - The first screen at 320×640 shows the verdict.
  - No sideways scroll.
  - Tab order: verdict area, then recommendation, help choices, Ask box and details.
  - Count the automatic builds while moving between pages.
- [ ] **Step 3: Docs.**
  - USER_GUIDE ("Understand the data card" becomes "Today").
  - DESIGN.md §7 (the new Today hierarchy) and §8.
  - A CHANGELOG line.
  - A note in `docs/design/dimensional-drawings/` that UI-PAGE-001 rev A shows the earlier Today, with rev B due after this phase is approved.
  - Commit, `docs: today`. Don't push.
