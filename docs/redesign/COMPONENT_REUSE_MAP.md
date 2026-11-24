# AirAware AI: component reuse map (Stage 1)

**Date:** 24 Nov 2026.
**Status:** proposal. No source is changed in Stage 1.
**What this covers:**
- every non-test `.tsx` file in `client/src/components/`, `client/src/pages/` and `client/src/features/*/` (30 files, listed with `find client/src -type f`);
- a second table for the `.ts`, CSS and HTML files where findings land;
- the new pieces the redesign needs.

**Sources:** the Stage 0 register (`docs/redesign/audit/FINDINGS_REGISTER.md`, F-01 to F-44), the Stage 1 brief, `DESIGN_SYSTEM_PROPOSAL.md`, and the source and tests as checked on 24 Nov 2026.

## How to read the decisions

| Decision | Meaning |
|---|---|
| **Not touched** | No edit, and the direction choice does not affect it. |
| **Keep as is** | No edit planned, but it sits inside something that changes, so re-check it in screenshots. |
| **Restyle only** | Class changes only. The same DOM, copy and behaviour. |
| **Change behaviour** | DOM, state, props or copy change. Copy changes marked **needs OK** are in the brief's §8 table. Copy for new elements is a proposal. |

- **Directions:** "A+B" means the change applies whichever direction is picked. "B" means only if B is picked.
- **Unit tests:** the matching `*.test.tsx` / `*.test.ts`. "No dedicated test" means no test imports the file; the cell says where it is exercised instead.
- **E2E:** the spec files under `e2e/` that reach it. The route-wide specs `responsive.spec.ts` and `keyboard.spec.ts` visit all 8 routes. `copy.spec.ts` and `backdrop.spec.ts` visit the app routes.

---

## 1. Components and pages (30 files)

### components/ (4)

| File (role) | Decision | Dir. | Findings | What changes | Unit tests | E2E |
|---|---|---|---|---|---|---|
| `components/AppNav.tsx` (the one `<nav aria-label="Main">`: phone bottom bar, inline from `md`) | Restyle only | A+B | F-38, F-13 (partly), brief §6 current-page indicator | Side safe-area insets (and the bottom minimum, if the owner takes it; `DESIGN_SYSTEM_PROPOSAL.md` §8.1). A 1 px `text-muted` outline on the current pill (needs OK). F-13's "content before the bar" may need a structural change; see section 4. | `AppNav.test.tsx` | `keyboard.spec.ts`, `responsive.spec.ts` (forced colours header, one nav row, 44 px targets) |
| `components/Attribution.tsx` (Open-Meteo / CAMS credit) | Not touched | none | none | none | No dedicated test. Its text is checked in `AppShell.test.tsx` and `Landing.test.tsx`. | `copy.spec.ts` (page text) |
| `components/PlaceChip.tsx` (place button and the native `<dialog>`) | Change behaviour | A+B | F-10, F-27 (with AppShell), F-13 (order set in AppShell) | **Label:** the text before the first comma ("Pune"); owner pick: short at every width, or the full label from `lg` using the same short/full pattern as `AppNav.tsx:60-61`. The full name stays in `aria-label`. **Width:** a minimum width at `md`. **No-place label:** "Choose place" (proposed copy). **Optional:** border `text-muted` (needs OK). | `PlaceChip.test.tsx` (pins "Choose a place"), `AppShell.test.tsx` | `responsive.spec.ts:330` expects "Mumbai, Maharashtra" in `header .truncate` at 1280. That still holds with the full label at `lg`, but two `.truncate` spans make the locator ambiguous, so it needs `:visible`. Also `keyboard.spec.ts` (place dialog), `responsive.spec.ts` (long place keeps the header on screen). |
| `components/States.tsx` (`Loading`, `ErrorState`) | Change behaviour | A+B | F-02, F-18 | **`Loading`:** the label is visible ("Loading forecast…"), and skeleton rows are sized like the final card (`DESIGN_SYSTEM_PROPOSAL.md` §9). **`ErrorState`:** unchanged. On B's masthead, per the owner's pick (`DESIGN_SYSTEM_PROPOSAL.md` §13): the shipped light card nested with `on-light`, or a dark variant (mockup B). | `States.test.tsx` (`:15-20` checks that the skeleton's only text is its label; it changes if the visible text differs, e.g. "…"), `AppShell.test.tsx` | `failures.spec.ts` (provider down), `responsive.spec.ts` (forecast error card at 320), `copy.spec.ts` (error card) |

### pages/ (8)

| File (role) | Decision | Dir. | Findings | What changes | Unit tests | E2E |
|---|---|---|---|---|---|---|
| `pages/AppShell.tsx` (frame for every `/app` page; Today's layout; header, footer, backdrop) | Change behaviour | A+B | F-02, F-09, F-11, F-12, F-13, F-27, F-28, F-30, F-38, F-39, F-43; brief §3 | **Header:**<br>• place chip before the nav in the DOM, with `md:order-*` (`:281-289`), per the F-13 ruling (Option A; Option B also needs the nav after `<main>`, see section 4);<br>• logo goes to `/app` with the current query (`:275-280`);<br>• the row wraps instead of scrolling sideways at large text (`:274`, F-12);<br>• chip hidden on Welcome step 1, which needs the step from `Welcome` or hiding it on all of `/app/welcome` (open question).<br>**Today:**<br>• H1 `text-2xl sm:text-3xl` (`:355`);<br>• tighter phone gaps (`:295`);<br>• the invite moves under the help choices as an outlined button (`:421-441`);<br>• "Reload forecast" passed to `TodayLead`. After pressing it, focus goes to the H1, as Try again does at `:387-391`, because the card unmounts while it reloads.<br>**Other:**<br>• unknown `/app/*` names redirect to `/app` and keep the query (F-09, with `lib/navigation.ts`);<br>• `MyHome` gets a "place is set" flag (F-02);<br>• `, 0px` fallback in the end spacer (`:495`);<br>• F-43: `toSaved` (`:40-47`) keeps the label and 2-decimal coordinates unless the owner picks label-only (brief §8).<br>**B only:** the title block and the verdict card share one `on-dark bg-surface` masthead. | `AppShell.test.tsx` (2,263 lines; pins "Make it personal", "Skip to content", the footer line, "Not current: retrieved…") | All specs |
| `pages/Ask.tsx` (Ask AirAware) | Change behaviour | A+B | F-12, F-15, F-20, F-32 | • The text box goes first, under the title block (F-20).<br>• The first 3 of the 5 shipped starters, the other 2 behind "More questions" (proposed copy; owner to confirm the reading, outline C-3).<br>• Header line "0 of 10 household questions answered · Edit" (F-15, needs OK).<br>• "updated" → "retrieved" in the header line (`:86`; F-32, needs OK).<br>• The input row wraps so Send can drop below it at 200 % text (F-12).<br>• **B:** a compact masthead holds the H1 and the "Using: …" line.<br>• F-33 (no "Not current" in the header) is not in the brief: open question. | `Ask.test.tsx` (pins "of 10 answers") | `ask.spec.ts`, `keyboard.spec.ts` (Ask by keyboard), `responsive.spec.ts` (Ask answer and question back at 320; 200 % question back), `copy.spec.ts` (guided chat), `backdrop.spec.ts` |
| `pages/BetterHabits.tsx` | Change behaviour (small) | A+B | F-02, F-11, F-25 | • H1 size.<br>• A one-line purpose under the H1 (brief §3; new copy, proposal).<br>• A guide skeleton in the group shape.<br>• The flowing grid comes from `GuideGroups`.<br>• **B:** compact masthead. | `BetterHabits.test.tsx` (pins "Why it matters") | `pages.spec.ts` (axe with guides), `backdrop.spec.ts`, `responsive.spec.ts`, `keyboard.spec.ts`, `copy.spec.ts` |
| `pages/Landing.tsx` (`/`) | Change behaviour | A+B (B: editorial treatment) | F-19, F-39 | • About 7 phone screens instead of 9.4: a 7-section order (brief §3), one compact mid-page "Check My Air".<br>• Hero top-aligned from `lg` so the search is on the first 1280×720 screen.<br>• `svh` instead of `dvh` for the hero (`:138`).<br>• **B:** larger hero, ordinals, alternating `bg`/`surface` sections. | `Landing.test.tsx` | `landing.spec.ts`, `responsive.spec.ts`, `keyboard.spec.ts`, `copy.spec.ts`, `pages.spec.ts` (axe on `/`) |
| `pages/MyHome.tsx` | Change behaviour | A+B | F-02, F-14, F-23, F-25 | • "Today, for your home" renders from first paint whenever a place is set (`:50-54`), with a skeleton while building. A ready plan with no indoor cards keeps the section with one line (new copy, needs OK).<br>• The flowing grid replaces `md:grid-cols-2` (`:110`).<br>• "Why?" replaces "Why it matters" (`:117`).<br>• A one-line purpose (proposal).<br>• **B:** compact masthead. | `MyHome.test.tsx` (pins "Why it matters") | `pages.spec.ts`, `backdrop.spec.ts`, `responsive.spec.ts`, `keyboard.spec.ts`, `copy.spec.ts` |
| `pages/Privacy.tsx` (`/privacy`) | Change behaviour | A+B | F-07, F-28, F-29 | • A three-line "In short" from existing statements.<br>• Supabase glossed once as "our database host".<br>• The app-style navy header and "Back to AirAware".<br>• The retention line matches `PRIVACY.md` once the owner confirms the cleanup job (F-07).<br>• No other claim changes. | `Privacy.test.tsx` | `pages.spec.ts` (axe), `responsive.spec.ts`, `keyboard.spec.ts`, `copy.spec.ts` |
| `pages/Profile.tsx` (My Profile) | Change behaviour | A+B | F-01, F-05, F-06, F-25 | Section order: Remembered place (only if any), Your household (form), Saved plans (always rendered), then Your data. **Your data:** what saving does (F-01 copy, needs OK) and "Delete my saved data" only when data exists (F-05); the control moves out of the form. **Desktop:** the form goes left; saved plans and Your data go right (`:80`). **B:** compact masthead. | No dedicated test. Exercised in `AppShell.test.tsx` ("Forget this place", "Saved plans"). | `journey.spec.ts` (save, reload, delete), `backdrop.spec.ts`, `responsive.spec.ts`, `keyboard.spec.ts`, `copy.spec.ts` |
| `pages/Welcome.tsx` (`/app/welcome`, 3 steps) | Change behaviour | A+B | F-01, F-11, F-27, F-43 (what "Remember" stores, an owner ruling) | • Step 1: one value line, "See today's air forecast for your place and one thing you could do." (proposed copy).<br>• Step 1: the header chip is hidden (with AppShell).<br>• Step 3: the "Remember on this device" note is reworded (F-01, needs OK); still off by default.<br>• H1 size.<br>• **B:** compact masthead. | `Welcome.test.tsx` | `onboarding.spec.ts`, `keyboard.spec.ts` (Welcome by keyboard), `responsive.spec.ts` (steps 2 and 3; chosen-chip outline in forced colours), `backdrop.spec.ts`, `copy.spec.ts` |

### features/air-quality/ (5)

| File (role) | Decision | Dir. | Findings | What changes | Unit tests | E2E |
|---|---|---|---|---|---|---|
| `features/air-quality/AirReadout.tsx` (`AirReadout` in details; `StaleBanner`) | Change behaviour | A+B | F-30 | **`StaleBanner` (`:41-58`):**<br>• an optional `onReload`. Only Today passes it, so it shows a "Reload forecast" button (proposed copy) that calls the existing `forecast.retry()`;<br>• the two Ask uses (`AskEntry.tsx:119,133`) stay without it;<br>• the banner wording is unchanged;<br>• the button sits inside the banner or beside it (open question, `DESIGN_SYSTEM_PROPOSAL.md` §13);<br>• solid `warning` fill (needs OK).<br>**`AirReadout`:** `tabular-nums` on the check list (`:121`) and the "Values for" line (`:87`). | `AirReadout.test.tsx`. `StaleBanner` has no dedicated test; its text is checked in `TodayLead.test.tsx`, `AskEntry.test.tsx` and `AppShell.test.tsx`. | `failures.spec.ts` ("stale data: both stale messages"), `copy.spec.ts` (stale above-limit Today), `responsive.spec.ts` (stale above-limit Today at 320) |
| `features/air-quality/CitySkyline.tsx` (the app backdrop) | Restyle only | A (F-26); A+B (fallback) | F-26, F-39 | • **A:** `lg:opacity-60` class on the near group (`:244`).<br>• `, 0px` fallback on the band offset (`:76`); the band offset changes too if the bar's bottom minimum is taken.<br>• **B:** no change. | `CitySkyline.test.tsx` (`:260` pins the `opacity="0.9"` attribute; still true, add a class check), `scene.test.ts`, `skylineGeometry.test.ts` | `backdrop.spec.ts`, `scene.spec.ts` |
| `features/air-quality/ForecastChart.tsx` (chart in details) | Not touched | none | none | none | `ForecastChart.test.tsx`, `chart.test.ts` | `journey.spec.ts` (opens details; checks the chart image and its summary), `backdrop.spec.ts` (opens every `<details>`) |
| `features/air-quality/ForecastPanel.tsx` (next-hours tables in details) | Not touched | none | none | None. Its two `overflow-x-auto` tables (`:60,149`) are the first places to check if the html/body clip is removed. | `ForecastPanel.test.tsx` | `backdrop.spec.ts` (opens every `<details>`) |
| `features/air-quality/SourcesPanel.tsx` (sources and limitations in details) | Not touched | none | none | none | `SourcesPanel.test.tsx` | `backdrop.spec.ts` (opens every `<details>`) |

### features/ask/ (1)

| File (role) | Decision | Dir. | Findings | What changes | Unit tests | E2E |
|---|---|---|---|---|---|---|
| `features/ask/AskEntry.tsx` (one exchange, topic chips, starter buttons) | Change behaviour | A+B | F-04, F-20, F-25, F-32, F-34 | • **F-04:** a new exchange scrolls its `<article>` to the top of the view, then focuses its heading with `preventScroll` (`:193`).<br>• **F-34:** "Based on" says "Model forecast · {provider} · …" only when a forecast exists (`:84-89`).<br>• **F-32:** "updated" → "retrieved" (`:86`), if OK.<br>• Starter border `rule` → `text-dark-muted` (`:25-26`), one pill style with the chips.<br>• Answer cards on the flowing grid (`:134`). | `AskEntry.test.tsx`, `ask.test.ts` | `ask.spec.ts`, `copy.spec.ts` (Ask answers), `responsive.spec.ts` (Ask answer at 320), `keyboard.spec.ts` |

### features/daily-plan/ (5)

| File (role) | Decision | Dir. | Findings | What changes | Unit tests | E2E |
|---|---|---|---|---|---|---|
| `features/daily-plan/DailyPlanSection.tsx` ("Your recommendation for today") | Change behaviour | A+B | F-01, F-02, F-03, F-14, F-17, F-23, F-31 | • "Your plan is ready." screen-reader-only. The `<output>` (`:237`) keeps showing save results visibly, so only the building and ready messages go screen-reader-only.<br>• H2 `text-xl sm:text-2xl` and phone padding.<br>• "Why?" instead of "Why this recommendation?" (`:268`).<br>• **F-31:** when `airShown` and the build fails, add "The forecast above is still up to date." (proposed copy).<br>• "For you" only when household answers exist (F-14, needs OK).<br>• The `SAVED` copy (`:38`; F-01, needs OK).<br>• A skeleton in the `PlanCard` shape.<br>• F-17, if approved: show `planAirLine` when the plan's level differs from the verdict's (`:258-262`). | `DailyPlanSection.test.tsx` (pins "Your plan is ready.", "Why this recommendation?", "Saved on this browser") | `journey.spec.ts` ("Why this recommendation"), `failures.spec.ts` ("For you" lines, plan error), `copy.spec.ts` |
| `features/daily-plan/HouseholdPreferencesForm.tsx` (My Profile form) | Change behaviour | A+B | F-01, F-05 | • `SAVE_NOTE` and `SAVED` copy (`:28-31`; F-01, needs OK).<br>• "Delete my saved data" only when a session exists or saved answers loaded (`:244-252`); it moves to Profile's "Your data".<br>• `disabled:opacity-60` on `buttonClass` (`:179`). | `HouseholdPreferencesForm.test.tsx` (pins "Delete my saved data" and "Saved on this browser"), `AppShell.test.tsx` | `journey.spec.ts` ("Delete my saved data") |
| `features/daily-plan/PlanCard.tsx` (one suggestion with "Why?") | Keep as is | A+B | F-23 (via callers) | No edit. Its default `whyLabel` is already "Why?" (`:15`); the callers stop overriding it. Grid and radius come from the parents. | No dedicated test. Exercised in `PlanView.test.tsx`, `DailyPlanSection.test.tsx`, `GuideGroups.test.tsx`, `MyHome.test.tsx` and `AskEntry.test.tsx`. | `journey.spec.ts`, `failures.spec.ts` |
| `features/daily-plan/PlanView.tsx` (the full day; a saved plan) | Change behaviour (copy), if F-41 is approved | A+B | F-41 | `MODEL_LINE` (`:13-14`) → "…and not the CPCB National AQI." | `PlanView.test.tsx` | `journey.spec.ts`, `failures.spec.ts` |
| `features/daily-plan/SavedPlansList.tsx` (My Profile saved plans) | Change behaviour | A+B | F-06 | • Always rendered. The initial `hidden` state (`:51`) becomes "checking": heading plus a one-line skeleton.<br>• **No session:** "No saved plans yet. Use Save plan under See your full day on Today." (from the brief), with no token and no API call.<br>• **Saving not set up:** the existing `NOT_SET_UP` text.<br>• Keeps `return null` out of the no-session path (`:132`).<br>• `disabled:opacity-60` on `buttonClass` (`:37`). | `SavedPlansList.test.tsx` (pins "No saved plans yet."; `:78` "shows nothing and fetches nothing without a session" changes: the section shows, and still fetches nothing), `AppShell.test.tsx` | `journey.spec.ts` |

### features/guides/ (1)

| File (role) | Decision | Dir. | Findings | What changes | Unit tests | E2E |
|---|---|---|---|---|---|---|
| `features/guides/GuideGroups.tsx` (guide groups for My Home and Better Habits) | Change behaviour (layout) | A+B | F-23, F-25 | • The outer `flex` (`:29`) becomes the flowing grid. Each group is one item; a group with 2+ cards spans the row with the same template inside (`:55,66`). No `dense`, so heading order holds.<br>• "Why?" (`:78`).<br>• **B:** a small uppercase group label above the heading (needs OK, `DESIGN.md` §4). | `GuideGroups.test.tsx` (pins "Why it matters"), `BetterHabits.test.tsx`, `MyHome.test.tsx` | `pages.spec.ts` (axe with guides), `backdrop.spec.ts` |

### features/location/ (2)

| File (role) | Decision | Dir. | Findings | What changes | Unit tests | E2E |
|---|---|---|---|---|---|---|
| `features/location/LocationSearch.tsx` (search with suggestions; in the dialog, Welcome, Ask and Landing) | Change behaviour (copy) | A+B | F-35 | • **No result:** "No places found. Try a nearby city, or use your location." (proposed copy).<br>• **Error:** "Search isn't working right now. Try again, or use your location." instead of the server's message (`:52-62`).<br>• **Landing has no "use my location" control** (`Landing.tsx:153`), so it needs a version without that clause (open question). | `LocationSearch.test.tsx` (pins "No places found") | `keyboard.spec.ts` (place dialog), `responsive.spec.ts` (dialog with suggestions; highlighted suggestion in forced colours) |
| `features/location/UseMyLocation.tsx` (device location on user action) | Not touched | none | none | none | `UseMyLocation.test.tsx` | No e2e test presses it. It renders in the place dialog and on Welcome step 1, which `keyboard.spec.ts` opens ("the place dialog by keyboard", "Welcome by keyboard"). |

### features/today/ (4)

| File (role) | Decision | Dir. | Findings | What changes | Unit tests | E2E |
|---|---|---|---|---|---|---|
| `features/today/AirDetails.tsx` ("Air quality details", closed) | Keep as is, or change behaviour if F-22 is accepted | A+B | F-22 | If the owner drops the meaning sentence from the verdict card, it moves in here (brief §8). Otherwise no edit. | `AirDetails.test.tsx` | `journey.spec.ts` (opens it; checks the CPCB line), `backdrop.spec.ts` (opens every `<details>`) |
| `features/today/AskBox.tsx` ("Ask AirAware anything" on Today) | Restyle only | A+B | F-12, F-20 (pill style) | • The input row wraps so Send can drop below it at 200 % text (`:41`).<br>• Starter border `rule` → `text-dark-muted` (`:71`). | `AskBox.test.tsx` | `responsive.spec.ts` (200 % text on Today) |
| `features/today/HelpChoices.tsx` ("What would you like help with?") | Change behaviour (copy, needs OK) | A+B | F-24 | • "Greener habits" → "Better habits" (`:36`; F-24, needs OK), with `ask.ts:23`.<br>• Card border `rule` → `text-dark-muted` (`:66`).<br>• Optional (brief §7, owner pick): 2 x 2 below 640 px, `grid-cols-2 lg:grid-cols-4` instead of `sm:grid-cols-2` (`:55`). Both mockups draw it with 0 targets under 44 px and no overflow at 320 (`INFORMATION_ARCHITECTURE.md` §6.1 T12).<br>• An optional cue on the two cards that open Ask (owner decision). | `HelpChoices.test.tsx`, `ask.test.ts`, `AppShell.test.tsx` | `copy.spec.ts` (Today) |
| `features/today/TodayLead.tsx` (weather row, verdict H2, tag, provenance, stale banner, meaning, caveat) | Change behaviour | A+B | F-02, F-21, F-22, F-30, F-32 | • The weather row stays first (approved 20 Nov; F-21 is an owner question).<br>• The meaning sentence is dropped if F-22 is OK.<br>• "updated" → "retrieved" if F-32 is OK.<br>• An `onReload` prop passed to `StaleBanner`.<br>• Phone padding and gaps; verdict `lg:text-4xl` (A) or `lg:text-5xl` (B).<br>• The verdict skeleton follows this card's rows.<br>• **B:** dark variants: tag `border-text text-text`, metadata `text-muted`, divider `rule-dark`. | `TodayLead.test.tsx` (pins "Not current: retrieved", "updated") | `failures.spec.ts`, `copy.spec.ts`, `responsive.spec.ts` (long place keeps the verdict above the bar, `:82-105`; stale above-limit Today at 320), `journey.spec.ts` |

**Count:** 4 + 8 + 5 + 1 + 5 + 1 + 2 + 4 = 30.
- Not touched: 5.
- Keep as is: 2. `AirDetails` is listed here; it changes only if F-22 is accepted.
- Restyle only: 3.
- Change behaviour: 20 (`PlanView` only if F-41 is approved).

**Findings coverage:** every finding F-01 to F-44 appears in this map.
- F-17 (DI-06), F-40 (CP-05) and F-41 (MP-05) are proposals in the P1 decision round (`IMPLEMENTATION_OUTLINE.md` §3).
- F-36, F-37 and F-42 are deferred (outline §7 and open question 8).
- F-33 is a P1 proposal (AK-08).

---

## 2. Other files where findings land

| File | Decision | Findings | What changes | Tests |
|---|---|---|---|---|
| `client/src/index.css` | Change (small) | F-38; `DESIGN_SYSTEM_PROPOSAL.md` §4.2, §8.1, §8.3 | • Title-block focus ring (needs OK).<br>• `scroll-padding-bottom` only if the bar's bottom minimum is taken.<br>• The html/body clip removed only as its own step (needs OK). | `styles.test.ts` (pins press, reduced motion, `scroll-padding-bottom` text, dialog rules) |
| `client/src/features/today/today.ts` | Change (copy) | F-14, F-16 | • `verdictFrom` unknown title (`:47`): "Air information unavailable" (F-16, needs OK). It must match the server's `rules.ts:133`.<br>• `topRecommendation` drops `forYou` when there are no household answers, or the server stops sending it (F-14, needs OK). | `today.test.ts`, `TodayLead.test.tsx`, `AskEntry.test.tsx`; fixtures `test/askFixtures.ts`, `test/planFixtures.ts` |
| `client/src/features/daily-plan/planDisplay.ts` | Change (copy) if F-32 is OK | F-32 | `planAirLine` "updated" → "retrieved" (`:153`). `LEVEL_TAG` is unchanged. | `planDisplay.test.ts`, `DailyPlanSection.test.tsx`, `MyHome.test.tsx` |
| `client/src/features/air-quality/scene.ts` | Change only if the owner picks the neutral stale look | F-44 | `backdropScene` returns `NEUTRAL` when the shown forecast is over 60 minutes old. `backdropNote` is unchanged. | `scene.test.ts`, `CitySkyline.test.tsx`, `AppShell.test.tsx`; `backdrop.spec.ts` |
| `client/src/features/ask/ask.ts` | Change (copy, data) | F-20, F-24 | • Topic label "Greener habits" (`:23`, needs OK).<br>• Starters grouped per topic for the "3 + More questions" view (`STARTERS`, `:26`). | `ask.test.ts` |
| `client/src/lib/navigation.ts` | Change behaviour | F-09 | `appPage` (`:33-36`) maps any unknown name to Today. An unknown name instead leads to `navigate('/app' + query, { replace: true })`. | `navigation.test.tsx`, `AppShell.test.tsx` |
| `client/src/pages/landingExamples.ts` | Change (content selection) | F-19 | Which rule examples the shorter Landing keeps. Verbatim rule text only. | `Landing.test.tsx` |
| `client/src/assets/today-phone.jpg`, `air-details.jpg` | Replace after Stage 5 | F-19 | Landing previews are dated real captures. Recapture once the redesign ships, with the date in the caption (precedent: backdrop spec §5.7). | `landing.spec.ts` (details shot at 320) |
| `client/index.html` | Not touched in this redesign | F-36 | Link-preview tags and a touch icon are separate P3 work, not in the Stage 1 brief. | `styles.test.ts` (font preload, favicon) |
| `client/src/App.tsx`, `main.tsx` | Not touched | (F-08 is handled by a static file) | Unknown non-app paths never reach the app on Netlify (`netlify.toml` rewrites only `/app`, `/app/*` and `/privacy`). | `App.test.tsx` |
| Other `.ts` files in `features/` (`chart.ts`, `forecast.ts`, `limitations.ts`, `skylineGeometry.ts`, `useRequest.ts`, `useAsk.ts`, `householdFields.ts`, `place.ts`, `onboarding.ts`) | Not touched | none | The weather line text (`forecast.ts`, `weatherLine`) is unchanged even if F-21 moves it. | Their own `*.test.ts` |
| Server: `server/src/services/recommendations/rules.ts` (`:133`, `:222`) and the AI plan's `forYou` | Outside the client. Listed because F-14, F-16 and F-40 need it. | F-14, F-16, F-40 | Owner rulings first (brief §8). | Server tests |

---

## 3. New pieces the redesign needs

None of these is a new library. Only the 404 page is a new file.

| New piece | Lives in | Why | Findings | Copy |
|---|---|---|---|---|
| Static 404 page | **New file** `client/public/404.html`. Inline CSS (the CSP allows inline styles, not scripts), `@font-face` for Inter, hand-copied token hex values with a check in `styles.test.ts`. | Netlify serves it with status 404 for unmatched paths. | F-08 | "We couldn't find that page", "Go to AirAware" (`/app`), "Home" (`/`): new copy, proposal |
| Saved-plans empty and checking states | Inside `SavedPlansList.tsx` | The section always shows; no token or call without a session. | F-06 | Brief §3 text (new-element copy) |
| "Reload forecast" button | Inside `StaleBanner` (`AirReadout.tsx`), optional prop, Today only | Recovery without the browser's reload. | F-30 | New copy, proposal |
| Visible loading label and shaped skeletons | `Loading` in `States.tsx`, plus the shapes at the call sites (`AppShell.tsx:396`, `DailyPlanSection.tsx:239`, `MyHome.tsx:88,156`, `BetterHabits.tsx:42`) | CLS under 0.1. | F-02, F-18 | "Loading forecast…" (the existing label, now visible) |
| "Today, for your home" reserved from first paint | `MyHome.tsx` and a flag from `AppShell.tsx` | Targets My Home's shift (CLS 0.468 at 320). The cause is inferred from the code and the audit; re-measure. | F-02 | An empty line when a plan has no indoor cards: needs OK |
| "Your data" section | Inside `Profile.tsx`; the delete control moves from the form | One place that says what saving does, with delete only when data exists. | F-01, F-05 | F-01 copy needs OK |
| Plan-error reassurance | Inside `DailyPlanSection.tsx` (it already knows `airShown`) | Says the verdict above is still valid. | F-31 | "The forecast above is still up to date." (proposal) |
| Welcome value line | Inside `Welcome.tsx`, step 1 | States what a first visit gets. | F-27 | Brief §3 text (proposal) |
| Privacy "In short" and "Back to AirAware" | Inside `Privacy.tsx` | Easier to scan; a way back into the app. | F-28, F-29 | From existing statements; no new claims |
| Page purpose lines | `MyHome.tsx`, `BetterHabits.tsx` | Brief §3. | none | New copy, proposal |
| Ask "More questions" | Inside `Ask.tsx` / `AskEntry.tsx` (`StarterButtons`), as a native `<details>` | Shorter first screen; the text box comes first. | F-20 | New copy, proposal |
| Flowing card grid | One class string, `grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]`, used in `GuideGroups.tsx`, `MyHome.tsx` and `AskEntry.tsx` | Removes half-empty rows on wide screens. | F-25 | none |
| B masthead | Classes on the existing title block and `TodayLead` section (Today), and on each page's title block. Not a new component. | Direction B only. | none | none |

### Why no new component library or dependency

- **The native elements already do the work, and tests pin them:**
  - the place dialog is a native `<dialog>` with `showModal()` (`PlaceChip.tsx:47-71`), which gives focus containment, Escape and focus return;
  - every disclosure is `<details>`/`<summary>`;
  - choices are native checkboxes and radios in `<fieldset>`s (`Welcome.tsx:56-99`);
  - the suggestion list is a listbox on a native input (`LocationSearch.tsx`).
- **Every proposed change is classes, copy or small state.** None needs a widget the app lacks: no combobox library, no toast system, no animation engine.
- **The styling system is Tailwind v4 with locked tokens** (`index.css:26-75`). A component kit would bring its own colours, radii and focus styles, which the token rule forbids.
- **Icons:** `lucide-react` is installed and covers every icon in use. No new icon is needed.
- **Motion:** CSS only, already in `index.css`.
- **Cost of adding one:** bundle size (F-37 already notes 148 kB transferred on every route), re-testing focus and forced-colours behaviour, and a second source of visual truth.

---

## 4. Open questions found while mapping

| # | Question | Why it is open |
|---|---|---|
| 1 | F-13: on phones, should focus reach the content before the bottom bar? | `md:order-*` only reorders siblings inside the header. Putting the place chip before the nav is easy. For content before the bar, the nav must come after `main` in the DOM on phones. The options:<br>(a) two `AppNav` instances, one hidden at each width. `display: none` removes the hidden one from the accessibility tree, but `AppNav.test.tsx` and jsdom see two.<br>(b) one nav after `main`, placed in the header on desktop by positioning. This is fragile once the header wraps (F-12).<br>(c) keep today's order (logo, chip, bar, content), with the skip link (`AppShell.tsx:264-269`). |
| 2 | Place chip at `lg`: "Pune" or "Pune, Maharashtra"? | The brief's text says the text before the first comma. Its desktop wireframe shows the full name, and `responsive.spec.ts:330` expects it at 1280. Two proposals: short at every width (`INFORMATION_ARCHITECTURE.md` §4.3, `WIREFRAMES.md`, both mockups), or full from `lg` (outline C-2). |
| 3 | Hide the header chip on Welcome step 1 only, or on all of `/app/welcome`? | `AppShell` does not know the step. Step 1 only needs the step lifted out of `Welcome`. |
| 4 | Landing search error and no-result copy | The proposed lines end "or use your location", but Landing has no location button (`Landing.tsx:153`). |
| 5 | B on desktop: does the masthead span both columns, or only the verdict column? | It decides whether the title block moves into the left grid column (`AppShell.tsx:350-369`). This belongs to `WIREFRAMES.md` / `DESIGN_CONCEPTS.md`. |
| 6 | F-33 (Ask header time without "Not current") | In the register, not in the brief. |

---

## 5. Tests that the proposals will change

| Test | Why |
|---|---|
| `States.test.tsx` | The loading label becomes visible. |
| `PlaceChip.test.tsx`, `AppShell.test.tsx` | "Choose a place" becomes "Choose place"; header DOM order. |
| `e2e/responsive.spec.ts:330-347` | Two label spans in the chip: the locator needs `:visible`. |
| `DailyPlanSection.test.tsx`, `PlanView.test.tsx`, `GuideGroups.test.tsx`, `BetterHabits.test.tsx`, `MyHome.test.tsx`, `e2e/journey.spec.ts` | "Why this recommendation?" and "Why it matters" become "Why?". |
| `SavedPlansList.test.tsx` | The section renders without a session. |
| `HouseholdPreferencesForm.test.tsx`, `DailyPlanSection.test.tsx` | F-01 copy (if OK); the delete control is conditional and moves to Profile. |
| `TodayLead.test.tsx`, `AskEntry.test.tsx`, `planDisplay.test.ts`, `Ask.test.tsx` | "updated" → "retrieved" (F-32, if OK); "of 10 answers" (F-15, if OK). |
| `today.test.ts` and fixtures | F-16 title (if OK). |
| `HelpChoices.test.tsx`, `ask.test.ts` | F-24 label (if OK). |
| `CitySkyline.test.tsx` | Add a check for the `lg:` near-row class (F-26). |
| `e2e/backdrop.spec.ts:116-253` | Direction B only: the title-block-on-sky contrast test becomes "masthead is opaque". |
| `styles.test.ts` | Only if the bar's bottom minimum or the clip removal is accepted. |
| New e2e check | CLS under 0.1 on Today, My Home and Better Habits (none exists today). |
