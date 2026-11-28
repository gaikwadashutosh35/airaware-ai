# 04 · Existing component inventory

**Date:** 28 Nov 2026.
**Scope:** the local working tree at commit `b0c4278`. Read from source; the live site was not loaded.
**Covers:**
- the non-test `.tsx` and `.ts` modules in `client/src` (components, hooks, logic and copy modules, test helpers). Trivial files are listed in §8. Small page-internal helpers are named in their page's row;
- the server modules a redesign or new feature would reuse.

**Labels:**
- **OBSERVED** means read in code, cited as `file:line`.
- **RECOMMENDED** means our proposal.
- Every row in §1–§8 is OBSERVED unless its "Reuse potential" cell says RECOMMENDED.

**Reuse potential:**
- **High:** drop-in for the redesign as is, or with class changes only.
- **Medium:** reusable, but its props or layout assumptions need a small change.
- **Low:** tied to one page, or needs a rewrite to move.

**Facts that frame this inventory (OBSERVED):**
- **No UI kit:** no shadcn/ui, Radix, cva or clsx (`01_CURRENT_STATE_AUDIT.md` §3.1). Every component is hand-written with Tailwind v4 utilities on the project tokens (`client/src/index.css:26-75`).
- **Icons:** `lucide-react` 1.66.0 only.
- **Native primitives:** `<dialog>`, `<details>`, `<output>`, `<fieldset>`, and an ARIA combobox on a native `<input>`.
- **Earlier map:** `COMPONENT_REUSE_MAP.md` (24 Nov) listed 30 files. This inventory adds `CyclingHint.tsx`, `FireHotspots.tsx` and `WeatherCompare.tsx`, which came later. Its line numbers are out of date.

---

## 1. Shell and navigation

| Component | Path | Purpose | Props | Reuse potential | Accessibility notes |
|---|---|---|---|---|---|
| `App` | `client/src/App.tsx:7-12` | Path switch: `/privacy`, `/app*`, else Landing. | none | High. Keep as is. The place to add `React.lazy` per route (RECOMMENDED; F-37 is open). | n/a |
| `AppShell` (default export) | `client/src/pages/AppShell.tsx:65-602` | **App frame:** skip link, header (logo, place chip, nav), `<main>`, footer, end spacer and the `CitySkyline` backdrop.<br>**State it owns:** the place, forecast, sources, household context, Ask thread, saved-list version, resets and Welcome step.<br>**Today:** renders Today inline (`:406-567`). | none (it reads the URL) | **Low** as a unit (604 lines, all state). **RECOMMENDED:** extract `TodayPage` and a `useAppState` hook before any visual work on Today. | Skip link (`:304-309`). `<main id="main" tabIndex={-1}>`. Header DOM order is logo, chip, nav, so the Tab order matches (`:311-334`). The H1 takes focus after a place is chosen (`:212-217`). `<title>` per page (`:299`). |
| `AppNav` | `client/src/components/AppNav.tsx:4-76` | The five primary destinations. A fixed bottom bar on phones, inline in the header from `md`. Short labels on phones (Today, Ask, Home, Habits, Profile). | `page: AppPage` | **High.** Keep the five items, labels and hrefs. Restyle only. | One `<nav aria-label="Main">`. Each link has `aria-label` set to the full name and `aria-current="page"`. Safe-area insets on the bar. Tested in `AppNav.test.tsx` and e2e forced-colours. |
| `PlaceChip` | `client/src/components/PlaceChip.tsx:10-88` | Header button showing the place. Opens a native modal `<dialog>` holding `LocationSearch` and `UseMyLocation`. | `label?`, `open`, `onOpenChange(open)`, `onChoose(place)`, `onLocateStart()`, `onLocate(place)` | **High.** | `aria-label` is "Change place: {label}" or "Choose a place" (`:39`). `showModal()` gives focus trap, Escape and focus return (`:31,43,58`). `aria-labelledby` on the dialog. |
| `Attribution` | `client/src/components/Attribution.tsx:3-14` | The Open-Meteo / CAMS CC BY 4.0 credit. | none | **High. Must stay** wherever forecast data is shown (licence). | A plain link with an underline. |

---

## 2. Shared state components

| Component | Path | Purpose | Props | Reuse potential | Accessibility notes |
|---|---|---|---|---|---|
| `Loading` | `client/src/components/States.tsx:10-46` | A skeleton card with a screen-reader label. | `label: string`, `className?` (callers pass hard-coded `min-h-[…]` per breakpoint) | **Medium.** Reuse it, but replace the per-breakpoint magic heights with shaped skeletons (RECOMMENDED; see `01` D3). | `aria-busy="true"`. The label is `sr-only`. Bars are `aria-hidden`. |
| `ErrorState` | `client/src/components/States.tsx:48-115` | An error card that maps `ApiError` codes to friendly text, with Try again. | `error: ApiError`, `onRetry()`, `fallback?`, `title?`, `level?: 2 \| 3` | **High.** Generic. | It is an alert of its own. The heading level is configurable. Callers move focus after a retry because the card unmounts (for example `AppShell.tsx:451-457`). |

---

## 3. Air-quality feature (`client/src/features/air-quality/`)

| Component / module | Path | Purpose | Props / signature | Reuse potential | Accessibility notes |
|---|---|---|---|---|---|
| `StaleBanner` | `AirReadout.tsx:43-76` | "Not current: retrieved more than an hour ago…", with an optional Reload button. | `onReload?()` | **High. Must stay** (data rule). | Solid warning fill. Icon `aria-hidden`. Dark focus ring (`index.css:265-268`). |
| `AirReadout` | `AirReadout.tsx:78-164` | The PM2.5 value for this hour, plus each pollutant's 24-hour average against its limit, with marker icons. "Model run time not reported by the provider" (`:157`). Used inside Air quality details. | `data: ForecastData`, `now: Date` (load time) | **High.** | A `<section>` labelled by its heading. The status is in words and an icon shape (`Marker`, `:22-41`), never colour alone. |
| `ForecastPanel` | `ForecastPanel.tsx:28-198` | The next-hours pollutant table, the chart, and the full hourly table folded in `<details>`. | `data: ForecastData`, `now: Date` | **Medium.** The tables use `overflow-x-auto`, so check them at 320 px if the layout changes. | Captioned tables. `aria-label="Hourly forecast table"`. Missing values are marked. |
| `ForecastChart` | `ForecastChart.tsx:44-216` | Hand-drawn SVG line chart of PM2.5 and PM10 with "At load" marker. | `series: ForecastSeries`, `loadedAt: Date` | **High** as the base for an "hourly strip" on Today (RECOMMENDED). No chart library is needed. | `role="img"`, `aria-label`, plus a text summary from `chart.ts summarize`. The legend is `aria-hidden` with a text equivalent. |
| `SourcesPanel` | `SourcesPanel.tsx:5-62` | Sources and limitations, folded (closed). | `sources: SourceInfo[] \| null`, `forecastLimitations: string[]` | **High. Must stay** (provenance rule). | The heading is outside `<summary>` (`sr-only`) for screen readers (`:16-20`). |
| `CitySkyline` | `CitySkyline.tsx:124-338` | Fixed full-screen decorative city: sky gradient, far, mid and near rows, veils, clouds, rain, heat, glow. The look comes only from `Scene`. | `scene: Scene \| null` | **High.** This is the product's visual signature; keep it (UX_AUDIT "What works"). Any 3D or rich version must be lazy and keep this as the fallback (RECOMMENDED). | `aria-hidden`. `forced-colors:hidden` (`:102`). The city hides under 33.3rem tall. Motion is `motion-safe` only and rests within 5 s (`index.css:45-69`). |
| `scene.ts` | `scene.ts:12-113` | `sceneFromConditions(check, weather)`, `backdropScene(shown, loading, now)`, `backdropNote(label, level, stale)`, `NEUTRAL`. Rules: no fog, rain needs a forecast amount, heat at 35 °C or more, weather counts for up to 120 min. | pure functions | **High.** The single source of "what the sky shows". Any new scene must go through it. | `backdropNote` is the text equivalent of the picture (footer). |
| `skylineGeometry.ts` | `skylineGeometry.ts:9-358` | Generates the path data for the city (`SKYLINE`). Also used by the landing hero. | constant | **High** (static asset). | n/a |
| `chart.ts` | `chart.ts:8-80` | `niceCeiling`, `valueRuns` (gaps break the line), `tickIndexes`, `markerIndex`, `summarize`. | pure functions | **High.** | `summarize` produces the chart's text alternative. |
| `forecast.ts` | `forecast.ts:7-87` | `hourForNow`, `formatTime`, `formatDateTime`, `POLLUTANTS` (short and plain names, for example "Fine particles"), `weatherLine`. | pure | **High.** | Names pollutants in words as well as symbols. |
| `limitations.ts` | `limitations.ts:4-14` | `APP_LIMITATIONS` and `LIMITATIONS` (the copy shown when no forecast loaded). | constants | **High.** Reuse for any "What does this mean?" explainer. | n/a |
| `useRequest` | `useRequest.ts:14-75` | See §9 (hooks). | | | |

---

## 4. Today feature (`client/src/features/today/`)

| Component / module | Path | Purpose | Props | Reuse potential | Accessibility notes |
|---|---|---|---|---|---|
| `TodayLead` | `TodayLead.tsx:14-67` | The verdict card: a top line `weatherLine(data.weather)` ("Weather for …", `:37-39`), the title from `verdictFrom`, level tag, "Model forecast · Open-Meteo · retrieved {time}" (`:51`), stale banner, explanation, caveat. | `data: ForecastData`, `stale: boolean`, `onReload?()` | **High.** It is the UNDERSTAND anchor. Keep every line; restyle freely. | A `<section>` labelled by its H2. The level is a word tag, not colour only. |
| `TodayLeadLoading` | `TodayLead.tsx:69-85` | Skeleton with visible "Loading forecast…" text. | none | **Medium** (hard-coded `min-h` per breakpoint, `:73`). | `aria-busy`. The text is visible. |
| `WeatherCompare` | `WeatherCompare.tsx:20-143` | "Weather · Open-Meteo model data" table: Yesterday, Today, Tomorrow at this local hour, min–max and rain (OWNER_DECISIONS J20). Hidden unless there are 3 days and the middle day is the place's local date (`:27-34`). Not shown when the forecast is "Not current" (`AppShell.tsx:500`). | `weather: WeatherNow \| null`, `now: Date` | **High.** | A table. Says "Yesterday is past model data, not station measurements". |
| `FireHotspots` | `FireHotspots.tsx:42-103` | NASA FIRMS card: count within 50 km in 24 h, nearest distance, latest time, "Satellite detections · NASA FIRMS · retrieved … · Not current". It fetches by itself and refreshes every 30 min. Hidden when `not_configured`. Shows "unavailable" and Try again, never zero. | `place: Place \| null`, `now: Date` | **High.** It holds its own `useRequest`. | A `<section>` labelled by its H2. A fixed-height loading state (`min-h-[6rem]`, `:79`). Note line: "not proof that smoke reaches you". |
| `HelpChoices` | `HelpChoices.tsx:7-41` | "What would you like help with?": 4 cards. Two open Ask with a topic; two go to My Home and Better Habits. | `onAsk(topic: 'outdoors' \| 'family')` | **High.** The obvious place to make the journey visible (RECOMMENDED). | List of links. Icons `aria-hidden`. |
| `helpChoices.ts` | `helpChoices.ts:7-40` | `CHOICES` data: title, line, href, topic and Lucide icon. Shared with Landing. | constant | **High.** | n/a |
| `AskBox` | `AskBox.tsx:14-107` | Today's "Ask AirAware anything" box with `CyclingHint`. Sending goes to Ask. It rests while an answer is on its way. | `onAsk(question)`, `active`, `started`, `busy?` | **High.** | Labelled input, `maxLength={200}` to match the server cap (`server/src/services/recommendations/ask.ts:34`). |
| `AirDetails` | `AirDetails.tsx:12-81` | "Air quality details", closed `<details>`: `AirReadout`, `ForecastPanel`, method, `SourcesPanel`, and the CPCB note. | `data: ForecastData \| null`, `loadedAt: Date`, `place: Place`, `sources: SourceInfo[] \| null`, `cpcbNote?: string` | **High.** Content must stay reachable from Today. | `<details>` with `<section>` headings inside. |
| `today.ts` | `today.ts:7-82` | `greeting(at)`, `verdictFrom(check)` (title, explanation and caveat per level), `topRecommendation(plan)`, `mergedLimitations`. | pure | **High.** **The copy is spec-fixed:** change it only with owner approval. | n/a |

---

## 5. Ask feature (`client/src/features/ask/`)

| Component / module | Path | Purpose | Props | Reuse potential | Accessibility notes |
|---|---|---|---|---|---|
| `AskEntry` | `AskEntry.tsx:246-453` | **One exchange:** your message, then AirAware's reply. The reply has an "AirAware" label, the summary, cards (`PlanCard`), the `AirLine` provenance, a copy button, a stale banner, the question back with options and Skip, and "You could also ask". It scrolls into view and focuses on arrival (`:294-300`). | `entry`, `now`, `focus`, `busy`, `newest`, `repeat?`, `shown?`, `pending`, `onRetry(id)`, `onTopic(topic, label)`, `onStarter(q)`, `onAnswerFollowUp(field, value, label)`, `onSkipFollowUp(field)` | **Medium.** Rich and correct, but 13 props. A visual refresh is fine. Do not swap it for a chat kit without an architecture decision (master guide §8.3 agrees). | An `<article>` labelled by its heading. `aria-busy` while thinking. Focus moves to the new heading with `preventScroll`. |
| `TopicChips` | `AskEntry.tsx:28-52` | The 6 topic buttons. | `busy`, `onTopic(topic, label)` | **High.** | Real buttons, disabled while busy. |
| `StarterButtons` | `AskEntry.tsx:54-82` | Starter question buttons. | `questions`, `busy`, `onStarter(q)` | **High.** | Buttons. |
| `AirLine` (internal) | `AskEntry.tsx:84-97` | "{verdict} · Model forecast · Open-Meteo · retrieved HH:MM" per answer. | `answer` | High (move it if needed). | A link to the source. |
| `Answer` (internal) | `AskEntry.tsx:140` (ends before `AskEntry` at `:246`) | The reply body: summary, cards, `AirLine`, stale banner and context lines. `Ask.tsx:104-114` works out which context lines repeat (J23) and passes that down as `repeat`. | (internal props) | Medium. Move it only with `AskEntry`. | Part of the exchange `<article>`. |
| `CopyAnswer` (internal) | `AskEntry.tsx:116-138` | Copy icon button with an `<output>` result ("Copied" or failure). | `text` | High. | `aria-label` and `title` "Copy answer". Live-region result. |
| `CyclingHint` | `CyclingHint.tsx:17-81` | Rotating example questions under Today's box. It stops under reduced motion, when the tab is hidden, or once `still`. | `show`, `still?` | **High.** | Respects `prefers-reduced-motion` in JS (`:24-31`). |
| `ask.ts` | `ask.ts:17-201` | `TOPICS`, `STARTERS` (5; `SHOWN_STARTERS = 4`), `ASK_COPY` (including the J26 intro at `:56`), `suggestionsFor`, `pendingFollowUp`, `answeredCount`, `clockTime`, `shortAnswer`, `shownAbove`, `contextKey`. | pure plus constants | **High.** **The copy is owner-approved** (J2, J25, J26). | n/a |
| `useAsk` | `useAsk.ts:64-264` | See §9. | | | |

---

## 6. Daily plan, guides, location, onboarding

| Component / module | Path | Purpose | Props | Reuse potential | Accessibility notes |
|---|---|---|---|---|---|
| `DailyPlanSection` | `features/daily-plan/DailyPlanSection.tsx:81-349` | **"Your recommendation for today":** the top card, then "See your full day" (`PlanView`) with Save plan.<br>**Builds by itself** when active, when the context changes, or every hour (`:192-226`).<br>**Reports** its state to My Home through `onPlan`. | `place`, `context`, `now`, `active`, `verdictLevel`, `forecastCurrent`, `onSaved()`, `onPlan?(report)`, `deletedPlanId?` | **Medium.** The logic is solid. It renders on Today and feeds My Home, so moving it needs care. | One live region `<output>` for building, ready and save messages (`:257`). The full day is in `<details open>`. |
| `PlanView` | `features/daily-plan/PlanView.tsx:48-160` | The whole plan: "Your day" by period (AI plans only), topic groups, air notice, sources, safety note. `snapshot` mode for saved plans ("that day"). | `plan: DailyPlan`, `snapshot?`, `hideAir?` | **High.** | Section headings via `Part` (`:18-46`). |
| `PlanCard` | `features/daily-plan/PlanCard.tsx:8-123` | **One suggestion:** title, text, "For you" and period, then "Why?" in `<details>` with the reason, inputs used, sources and caveat. Used on Today, Ask, My Home, the guides and Landing. | `item: PlanItem`, `sources`, `level: 3 \| 4 \| 5`, `notice?`, `openWhy?`, `snapshot?`, `flat?` | **High.** This is the product's core unit (explainable advice). Restyle it once and every page benefits. | An `<article>`. The heading level is configurable. "Why?" is a native disclosure. |
| `SavedPlansList` | `features/daily-plan/SavedPlansList.tsx:44-238` | Saved plans in My Profile: open, delete with a confirm, and empty, error and not-set-up states. | `version`, `onOpen(saved)`, `onDeleted(id)` | **High.** | A list labelled by its heading. An `<output>` for results. |
| `HouseholdPreferencesForm` | `features/daily-plan/HouseholdPreferencesForm.tsx:50-358` | **My Profile form:** 10 optional questions in 3 groups, Save my answers, and "Your data" with "Delete my saved data" and a confirm. Loads saved answers once. | `initial?`, `onChange?(ctx)`, `onDeleted?()`, `onLoaded?(saved)`, `skipLoad?`, `version?`, `children?` | **Medium** (it renders Profile's two-column layout through `children`). | Fieldsets and labels. `aria-describedby` links Save to `SAVE_NOTE` (`:297`). An `<output>` for status. |
| `householdFields.ts` | `features/daily-plan/householdFields.ts:6-122` | `FIELDS` (labels and options), `GROUPS`, `toAnswers`, `toContext`, `fieldId`. | pure | **High.** The single source for household questions (used by Ask questions back too). | n/a |
| `planDisplay.ts` | `features/daily-plan/planDisplay.ts:18-157` | `PlanReport`, `groupPlan`, `madeByLine`, `basedOn`, `inputLabel`, `checkText`, `LEVEL_TAG`, `planAirLine`, `PLAN_STALE`, `NO_CARD`, `NO_AIR`, `PERIODS`, `TOPICS`. | pure | **High.** | n/a |
| `GuideGroups` | `features/guides/GuideGroups.tsx:11-89` | Renders a `GuideSet` as groups of `PlanCard`s on a subgrid. Optional `hide`. | `set: GuideSet`, `level: 2 \| 3`, `hide?(card)` | **High.** Reuse it for any new sourced explainer cards (RECOMMENDED for LEARN). | Each `Group` is a `<section>` labelled by its heading (`:46-89`). |
| `LocationSearch` | `features/location/LocationSearch.tsx:11-220` | Search with suggestions (Open-Meteo geocoding, India). Optionally "Use my location" beside it. | `onSelect(place)`, `inputRef?`, `offersLocation?`, `submitLabel?` | **High.** Used in the chip dialog, Welcome, Ask and Landing. | Full ARIA combobox: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, a listbox of options, 44 px options (`:147-190`). An `<output>` for status (`:217`). |
| `UseMyLocation` | `features/location/UseMyLocation.tsx:9-64` | One button: `getCurrentPosition` with `enableHighAccuracy: false`, a 10 s timeout and a 10 min cache. Rounds to 2 decimals. Says when access is denied or the position is not found. Renders nothing without geolocation. | `onLocate(place)`, `onLocateStart?()` | **High. Must stay user-initiated** (privacy rule). | A hint linked by id. A status message. |
| `place.ts` | `features/location/place.ts:3-54` | `Place`, `placeFromResult`, `placeToSearch` / `placeFromSearch` (URL with validation), `NEAR_YOU`, `placeFromPosition` (rounds to about 1 km). | pure | **High.** | n/a |
| `onboarding.ts` | `features/onboarding/onboarding.ts:8-86` | Welcome's choices model: `toggleDay`, `contextFrom`, `choicesFrom`. | pure | **High.** | n/a |

---

## 7. Pages (`client/src/pages/`)

| Page | Path | Purpose | Props | Reuse potential | Accessibility notes |
|---|---|---|---|---|---|
| Today | inline in `AppShell.tsx:406-567` | **Order:** title block, then `TodayLead` and `DailyPlanSection` (two columns from `lg`), then `WeatherCompare` and `FireHotspots`, `HelpChoices`, the personalise invite, `AskBox`, `AirDetails`. | n/a | **Low** until extracted (RECOMMENDED). | The H1 is the focus target. A Google Maps credit sits beside the name (`:420-426`). |
| `Welcome` | `Welcome.tsx:108-384` | A 3-step first run: place, your day, your home. "Remember on this device" is off by default. Skip is allowed on steps 2 and 3. | `place`, `placeIsSearched`, `context`, `onChoosePlace`, `onLocateStart`, `onLocate`, `onStep(step)`, `onFinish({context, remember})` | **Medium.** | Checkbox chips in `<fieldset>`s (`Chip` `:63-95`, `Group` `:97-106`). `role="alert"` on save failure (`:334`). |
| `Ask` | `Ask.tsx:32-305` | **Guided chat page:**<br>• a centred 56rem column with the "Using: … · N of 10 household questions answered · Edit" line;<br>• 4 starters, with the 6 topics under "More topics";<br>• a "Conversation" region and a composer pinned to the bottom;<br>• the composer is an auto-growing `<textarea>`, `field-sizing-content`, `maxLength={200}` (`:258-275`). | `place`, `updatedAt`, `forecastLoading`, `context`, `now`, `ask`, `onChoosePlace`, `onLocateStart`, `onLocate` | **Medium.** | An `sr-only` `<output>` announces the status (`:164`). The region is named "Conversation" (`:200`). "Edit your answers in My Profile" has an explicit `aria-label` (`:156`). |
| `MyHome` | `MyHome.tsx:20-175` | "Today, for your home" (the indoor cards from today's plan) plus "Ways to improve indoor air" (guides, de-duplicated against today's cards and household answers). | `today: PlanReport`, `context`, `hasPlace` | **Medium** (hard-coded skeleton heights at `:98,169`). | An `sr-only` `<output>` announces the plan state (`:81`). Headings take focus on retry. |
| `BetterHabits` | `BetterHabits.tsx:9-54` | The habits guide library. "We never show an emissions saving we can't calculate." | none | **High** (small). | The H1 takes focus on retry. |
| `Profile` | `Profile.tsx:18-160` | Remembered place with Forget, the household form, saved plans, and a saved plan opened as a "snapshot, not current air information". | `formKey`, `context`, `onContextChange`, `onLoaded`, `remembered`, `onForget`, `onDeleted`, `listVersion`, `onPlanDeleted` | **Medium.** | Focus goes to the opened plan's banner, then back to its Open button on close (`:47-59`). |
| `Landing` | `Landing.tsx:181-409` | **Marketing page:**<br>• a hero with the skyline (`HeroSkyline` `:163`), search and "Check My Air";<br>• chapters (`Chapter` `:119`), example rule cards (`ExampleCard` `:88`, from `landingExamples.ts`), small helpers `ActionLink` `:49`, `AssistantLink` `:61` and `Ordinal` `:74`;<br>• help choices, home and habits, how it works, closing. | none | **Medium.** It shares `PlanCard`, `LocationSearch`, `CHOICES` and `SKYLINE` with the app. | `.reveal` scroll animation only under `no-preference` (`index.css:211-217`). One H1. |
| `Privacy` | `Privacy.tsx:18-141` | The privacy page in sections (`Part` `:5-16`), including what Claude receives (J26 D7) and the 30-day cleanup. | none | **High** for content. **Do not change the claims** without the owner. | Simple headings and lists. |
| `landingExamples.ts` | `pages/landingExamples.ts` | The verbatim rule-card examples for Landing. | constant | Medium. | n/a |

---

## 8. Infrastructure modules (client)

| Module | Path | Purpose | Reuse potential | Notes |
|---|---|---|---|---|
| `main.tsx`, `env.d.ts` | `client/src/main.tsx` (13 lines), `client/src/env.d.ts` (5 lines) | The React root mount, and the Vite env typings (`VITE_SUPABASE_*`). | Keep as is. | n/a |
| `api.ts` | `client/src/services/api.ts:20-232` | `ApiError`, `request()` envelope, and one function per endpoint: `getForecast`, `searchLocations`, `getPlaceName`, `getFires`, `getGuides`, `getSources`, `get/savePreferences`, `listPlans`, `getPlan`, `buildDailyPlan`, `askAirAware`, `savePlan`, `deletePlan`, `deleteAccount`. | **High.** All new client calls go here (`.claude/rules/frontend.md`). | Coordinates are rounded in every location call. |
| `supabase.ts` | `client/src/lib/supabase.ts:1-40` | `savingAvailable`, `currentToken()` (never creates an account), `tokenForSave()` (anonymous sign-in on first save), `forgetSession()`. | **High.** | Accepts only a `sb_publishable_` key (`:8-11`). |
| `navigation.ts` | `client/src/lib/navigation.ts:1-52` | `usePath`, `navigate(to, {replace})`, `appPage`, `follow(event, href)`. | **High.** | Keeps the query. Scrolls to top on a new page. |
| `clock.ts` | `client/src/lib/clock.ts:1-31` | `isOlderThan(iso, now, minutes)` (an unreadable time counts as old) and `useNow`. | **High. Must be used** for every "Not current" decision. | n/a |
| Test helpers | `client/src/test/axe.ts:5` (`expectNoAxeViolations`), `dialog.ts:3` (`stubDialog` for jsdom), `fixtures.ts` (`forecastFixture`, `sourcesFixture`, `searchFixture`), `planFixtures.ts` (rules, unavailable, AI), `askFixtures.ts` (rules, AI, medical, out of scope, unknown air), `guideFixtures.ts` | Shared fixtures used by unit tests and e2e (`e2e/routes.ts:3`). | **High.** Use them for prototypes and new tests so the data stays realistic and labelled. | n/a |

---

## 9. Hooks (all four in the codebase)

Verified by grep `function use[A-Z]` in non-test client files.

| Hook | Path | Signature | Purpose | Reuse potential |
|---|---|---|---|---|
| `useRequest` | `features/air-quality/useRequest.ts:14-75` | `useRequest<T>(key: string \| null, load: (signal) => Promise<T>) → { state: idle\|loading\|ready\|error, retry(), previous }` | Keyed fetch with abort on key change. Stale responses are never applied. `previous` keeps the last data during a reload. | **High.** The standard for any new data card (FIRMS already uses it). |
| `useAsk` | `features/ask/useAsk.ts:64-264` | `useAsk(place, context, resets, onContextChange) → { entries, thinking, skipped, send(query, echo), retry(id), answerFollowUp(…), skipFollowUp(…) }` | The Ask thread for a visit, in memory, one request at a time, at most 10 entries (`:51`). Sends the last 2 typed questions as history (`:137-157`). Resets on a new place or delete. | **Medium.** Owned by the shell so the thread survives navigation. Keep that. |
| `useNow` | `lib/clock.ts:14-31` | `useNow() → Date` | A per-minute clock that also ticks when the tab becomes visible. | **High.** |
| `usePath` | `lib/navigation.ts:15-17` | `usePath() → string` | The current pathname via `useSyncExternalStore`. | **High.** |

---

## 10. Server modules a new feature would reuse (OBSERVED)

| Module | Path | What it gives | Reuse note |
|---|---|---|---|
| `createTtlCache` | `server/src/services/air-data/cache.ts:4-26` | Bounded in-memory TTL map. | Per instance (`:2-3`). |
| `fetchJson` | `server/src/services/fetchJson.ts:9-18` | A 5 s timeout plus a Zod parse. Any failure becomes a 502 `PROVIDER_ERROR`, and only the host is logged. | Every new keyless JSON provider should use it. |
| `assessAir` | `server/src/services/recommendations/airCheck.ts:57-67` | The deterministic 24-hour PM check against NAAQS. | **The only place air levels are decided.** The client must never re-derive them. |
| `buildCandidates` / `RULE_IDS` | `server/src/services/recommendations/rules.ts:398-411` | The 17 rule cards for a household and air level. | New advice means new rules here, with sources. |
| `guideSet` / `ASK_GUIDES` | `server/src/services/recommendations/guides.ts:164,215,247` | 17 sourced guide cards: 7 for My Home in 6 groups, 6 for Better Habits in 4 groups (`CLEANER_FUEL` is in both), and 5 Ask-only cards. | Use for LEARN content. |
| `buildPlan`, `SAFETY_NOTE` | `server/src/services/recommendations/plan.ts:13-61` | Assembles a `DailyPlan` from candidates plus an optional AI part. | n/a |
| `checkTexts`, `BANNED`, `toWriterInput` | `server/src/services/ai/planOutput.ts:54-79,127-168` | The number and banned-word checks every AI string must pass. | **Any new AI text must go through `checkTexts`.** |
| `checkAskOutput`, `VERDICT` | `server/src/services/ai/askOutput.ts:16-86` | Ask-specific checks: length 20–300, Latin script only, at most 3 eligible ids, no yes/no verdict. | n/a |
| `classify` | `server/src/services/recommendations/askTopics.ts:229` | A keyword topic and medical classifier, used before any AI. | n/a |
| `householdContextSchema`, `placeSchema`, `coordinatesQuery` | `householdContext.ts:6-41`, `dailyPlan.ts:45-55`, `routes/airQuality.ts:22-25` | Zod schemas for the household, the place (at most 2 decimals, at most 120 characters, no control characters) and query coordinates. | Reuse for every new endpoint. |
| `userFrom`, `savedErrors` | `server/src/services/saved/userFrom.ts:12-52` | The one auth gate. The user id comes only from a verified token. | Any new user-owned data must go through it. |

---

## 11. What does not exist and would be new

All of these are RECOMMENDED; none exists today.

| Missing piece | Why the brief needs it | Smallest option |
|---|---|---|
| `Button`, `Card`, `Chip`, `SectionHeading` primitives | **Consistency:** `card-surface` is used 34 times across 16 files, and the outlined-button class string is repeated about 14 times (grep, 28 Nov). | A few small `.tsx` wrappers over the existing class strings, plus the `@utility` approach already used for `card-surface`. No dependency. |
| A `TodayPage` component and app-state hook | Today is inline in a 604-line shell. | Move the JSX at `AppShell.tsx:406-567` with its props. No behaviour change. |
| Shaped skeletons | Replace the magic `min-h` values (D3). | Skeletons that mirror the `PlanCard` and `TodayLead` rows. |
| An hourly strip on Today | UNDERSTAND: when particles peak. | Reuse `chart.ts` and `ForecastChart` data, with the model-forecast label and retrieval time. Cross-doc note: 06 §4.3 (N1) keeps the values behind a closed disclosure so Today's default view has no numbers (DI-04); doc 14 holds N1 as "Later". |
| A journey cue ("next step") | The journey is not visible. | Extend `HelpChoices` and `CHOICES`. |
| A "done today" action list | TAKE ACTION. | Device-local state first (needs owner OK on wording and storage; 06 §4.6 recommends memory only, owner decision O-5). |
| Route-level code splitting | Performance target; F-37. | `React.lazy` in `App.tsx`. |
