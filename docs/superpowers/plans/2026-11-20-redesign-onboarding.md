# Assistant Redesign, Phase 5: Onboarding, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- A first visit gets three short, skippable steps: where, your day and your home. Then Today.
- "Remember on this device" (off by default) saves the answers and the searched place, so a returning visitor goes straight to Today.

**Architecture:**
- **Server:** saved preferences gain an optional `place`, stored beside the answers in the existing JSON column. A PUT updates only the fields it sends.
- **Client pages:** a new `Welcome` page with pure mapping helpers. `AppShell` decides between Welcome and Today and keeps the remembered place in step.
- **My Profile** gets "Forget this place".

**Tech stack:**
- Express 5 and Zod 4 (server);
- React 19 and Tailwind v4, with native radio and checkbox inputs;
- Vitest and Testing Library, Supertest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md` §5, §7.1, §7.2 (the invite), §7.7 ("Your place") and §9.1 (decision D2). Wireframes: section 3.

## Global constraints

**Copy, exact:**
- **Headings:**
  - "Where should we check air quality?"
  - "What does your typical day look like?"
  - "Tell us a little about your home."
- **Step label:** "Step N of 3".
- **Buttons:** "Back", "Next", "Skip", "See my air".
- **Remember checkbox:** "Remember on this device", with the hint "Creates an anonymous save on this device. Delete it any time in My Profile."
- **Today invite:** "Make it personal: 2 quick questions", with "Not now".
- **Step 2 choices:**
  - Office commute, School commute, Outdoor exercise, Work from home.
  - Travel (shown under Office commute): Walk, Cycle, Two-wheeler, Car, Public transport.
- **Step 3 choices:**
  - Cooking fuel: LPG, Electric, "Wood, coal or crop waste", Other, Prefer not to say.
  - Kitchen exhaust or chimney: Yes, No.
  - Air purifier: Yes, No.
  - Near a busy road: Yes, No, Not sure.

**Mapping to the existing `HouseholdContext`** (no new answer fields):
- **Office commute** plus a travel choice sets `routine.commuteMode`:
  - Walk → `walk`;
  - Cycle → `cycle`;
  - Two-wheeler → `two_wheeler`;
  - Car → `car`;
  - Public transport → `public_transport`.
- **Work from home** sets `routine.commuteMode: 'work_from_home'`. Office and Work from home exclude each other.
- **School commute** sets `routine.schoolCommute: true`.
- **Outdoor exercise** sets `routine.outdoorExercise: true`.
- **Cooking fuel** sets `home.cookingFuel`: `lpg`, `electric`, `biomass`, `other` or `prefer_not_to_say`.
- **Kitchen exhaust** and **air purifier** set the matching booleans in `home`.
- **Busy road** sets `home.nearBusyRoad`: `yes`, `no` or `unknown`.
- **Unticked or unchosen means unanswered**, never `false`.

**Privacy:**
- **Nothing is saved unless "Remember" is ticked.** Ticking it runs the existing anonymous save.
- **Only a searched place is saved,** as its label plus geocoder coordinates at 2 decimals.
- **A device location is never saved,** and the step 3 note says so.
- PRIVACY.md and the Privacy page say all this.

**Data:** no new answer fields. The stored JSON stays under its 2 KB limit, and there is no SQL migration.

**Process:**
- Test-first.
- No push. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## My calls

1. **The PUT body becomes `{ context?, place? }`, and the server merges it into the stored row.**
   - An omitted field keeps its saved value; `place: null` forgets the place; an empty body is a 400.
   - Why: "Save my answers", "Remember", a new searched place and "Forget" each send only what changes, so saving one never saves unsaved answers or wipes the place.
   - Cost if wrong: one more Supabase read per save.
2. **Stored as one JSON object, `{ ...answers, place? }`, in the existing `context` column.** Old rows still read, with `place: null`.
3. **Steps are page state, not part of the URL.** The browser's Back button leaves Welcome; the on-screen "Back" moves between steps.
4. **Saved answers load once per visit, through the form** (a new `onLoaded` callback). This keeps the "loads saved answers once" test true.
5. **"Not now" on the invite lasts for the visit only.** Nothing is stored.
6. **Tests:** shell tests reach Today through Welcome's Skip buttons (inside the `choosePlace` helper), so every assertion stays.
7. **Spec §9.2 builds the plan when onboarding finishes.** That arrives with Phase 6's automatic recommendation (D3). Until then Today still has "Build my daily plan". Cost if wrong: none.

## Review focus

1. **"Remember" ticked with a device location.** Expected: the answers are saved and the place never is. Task 4 test: `a device location is never saved`.
2. **The save fails, or saving isn't set up.** Expected: you're never stuck. "Remember" is disabled with the existing "Saving isn't set up on this site." note, and a failed save stays on step 3 with a message and lets you untick and continue. Task 3 tests: `a failed save keeps you on step 3 with a message` and `Remember is unavailable when saving isn't set up`.
3. **A returning visitor.**
   - With a remembered place, Today opens directly, with no flash of Welcome.
   - With a session but no saved place, Welcome opens with the saved answers filled in.

   Task 4 tests: `a remembered place opens Today without Welcome` and `Welcome starts from the saved answers`.
4. **Keyboard and screen readers.** Expected:
   - each group is a `fieldset` with a `legend`;
   - choices are native checkboxes and radios, 44 px or taller;
   - focus moves to each step's heading;
   - axe passes on every step.

   Task 3 tests: `each step moves focus to its heading` and `steps pass axe`.
5. **Arriving from the landing page with a place.** Expected: Today opens, and the invite opens Welcome at step 2. Task 4 test: `the invite opens Welcome at step 2; Not now hides it`.

---

### Task 1: Server — a remembered place in saved preferences

**Files:**
- Modify:
  - `shared/contracts.ts`;
  - `server/src/services/recommendations/dailyPlan.ts` (export `placeSchema`);
  - `server/src/routes/preferences.ts`;
  - `server/src/services/saved/store.ts`, `supabaseStore.ts` and `test-fixtures/fakeStore.ts`;
  - `API.md`.
- Test: `server/src/routes/saved.test.ts`.

**Interfaces (produces):**
- `type SavedPlace = PlanRequest['place']`.
- `SavedPreferences { context: HouseholdContext; place: SavedPlace | null; updatedAt: string }`.
- `PreferencesUpdate { context?: HouseholdContext; place?: SavedPlace | null }`.
- The store's `putPreferences(doc: HouseholdContext & { place?: SavedPlace })` replaces the row; the route merges.

- [ ] **Step 1: Write the failing tests** in `saved.test.ts`:
  - `saves a remembered place with the answers`: PUT `{ context: { home: { airPurifier: true } }, place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 } }`, then GET returns both.
  - `a place-only update keeps the saved answers`.
  - `a null place forgets it and keeps the answers`.
  - `an answers-only update keeps the remembered place`.
  - `rejects a place with more than 2 decimals or control characters` and `rejects an empty update`: both 400 `VALIDATION_ERROR`.
  - `an old row without a place reads back with place null`.
  - Update the existing PUT tests to send `{ context }`.
- [ ] **Step 2:** Run `npx vitest run src/routes/saved.test.ts` (in `server/`). Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - The route parses `strictObject({ context: householdContextSchema.optional(), place: placeSchema.nullable().optional() })`, refined so at least one key is present.
  - It reads the row and writes `{ ...(context ?? saved answers), place }`, leaving out `place` when it is null.
  - GET parses the row with `householdContextSchema.extend({ place: placeSchema.optional() })` and returns `{ context, place: place ?? null, updatedAt }`.
  - API.md §preferences documents the new body and response.
- [ ] **Step 4:** Run `npm test -w server`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(api): remembered place in saved preferences`.

### Task 2: Client service and form

**Files:**
- Modify:
  - `client/src/services/api.ts`;
  - `client/src/features/daily-plan/HouseholdPreferencesForm.tsx` and its test.

**Interfaces:**
- **Consumes:** Task 1's types.
- **Produces:**
  - `savePreferences(token, update: PreferencesUpdate): Promise<SavedPreferences>`.
  - `getPreferences` returns `SavedPreferences | null` with `place`.
  - The form's new prop `onLoaded?: (saved: SavedPreferences | null) => void`, called once after its load attempt. It gets `null` when saving isn't set up, there's no session, nothing is saved, or the load failed.

- [ ] **Step 1: Write the failing tests:**
  - `saving the answers sends only the answers`: the PUT body is `{ context }`.
  - `reports what it loaded`.
  - `reports null with no session`.
  - `reports null when the load fails`.
- [ ] **Step 2:** Run the form test. Expected: FAIL.
- [ ] **Step 3: Implement** the changes.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): preferences carry the remembered place`.

### Task 3: Welcome page

**Files:**
- Create:
  - `client/src/features/onboarding/onboarding.ts` and its `.test.ts`;
  - `client/src/pages/Welcome.tsx` and its `.test.tsx`.

**Interfaces (produces):**
- `DayChoice = 'office' | 'school' | 'exercise' | 'home'`, and `TravelMode = 'walk' | 'cycle' | 'two_wheeler' | 'car' | 'public_transport'`.
- `OnboardingChoices`:
  - `days: Set<DayChoice>`;
  - `travel: TravelMode | null`;
  - `fuel: 'lpg' | 'electric' | 'biomass' | 'other' | 'prefer_not_to_say' | null`;
  - `exhaust: boolean | null` and `purifier: boolean | null`;
  - `busyRoad: 'yes' | 'no' | 'unknown' | null`.

  `null` means unanswered.
- `toggleDay(days: ReadonlySet<DayChoice>, choice: DayChoice): Set<DayChoice>`. Office and home exclude each other.
- `contextFrom(choices: OnboardingChoices): HouseholdContext`, and `choicesFrom(context: HouseholdContext): OnboardingChoices`. They are inverses for every value the steps can express.
- `Welcome(props)`, where the props are:
  - `place: Place | null` and `placeIsSearched: boolean`;
  - `context: HouseholdContext` (to pre-fill);
  - `onChoosePlace(place)`, `onLocateStart()` and `onLocate(place)`;
  - `onFinish({ context, remember }): Promise<void>`. It rejects when the save fails.

- [ ] **Step 1: Write the failing tests.**
  - **onboarding.ts:**
    - `office with Car sets commuteMode car`;
    - `office without a travel choice leaves commuteMode unanswered`;
    - `work from home and office exclude each other`;
    - `unticked choices stay unanswered`;
    - `cooking, exhaust, purifier and road map to the home answers`;
    - `choicesFrom reverses contextFrom`.
  - **Welcome.tsx:**
    - `starts at step 1 without a place; choosing one moves to step 2`;
    - `starts at step 2 when a place is set; Back returns to step 1`;
    - `Office commute reveals the travel question`;
    - `skipping steps 2 and 3 finishes with no answers`;
    - `Remember is off by default and is passed to onFinish`;
    - `a device location says it will not be saved`;
    - `Remember is unavailable when saving isn't set up`;
    - `a failed save keeps you on step 3 with a message`;
    - `each step moves focus to its heading`;
    - `steps pass axe`.
- [ ] **Step 2:** Run both test files. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - A centred 560 px column from `md`.
  - Choices are native inputs styled as 44 px chips, each group a `fieldset` with a `legend`.
  - Step 1 reuses `LocationSearch` and `UseMyLocation`.
  - The step 3 note for a device location: "Your location isn't saved; only your answers are."
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): three-step welcome`.

### Task 4: The shell decides; the remembered place stays in step

**Files:**
- Modify:
  - `client/src/pages/AppShell.tsx` and its test;
  - `client/src/pages/Profile.tsx`;
  - `client/src/lib/navigation.ts` (`navigate(to, { replace })`);
  - `e2e/journey.spec.ts`.

**Behaviour:**
- **The welcome page renders `Welcome`.**
- **Today with no place:**
  - While the form's first load is pending (saving is set up and a session exists), show `Loading` labelled "Loading your place".
  - Then, if there's a saved place, choose it (it goes in the address); otherwise `navigate('/app/welcome', { replace: true })`.
- **`onFinish`:**
  - If `remember` is ticked, call `tokenForSave()`, then `savePreferences({ context, place })`. The place is sent only when it was searched.
  - Then set the context, bump a key so the form remounts with the new answers, and navigate to `/app`.
- **Choosing a new searched place while one is remembered** sends `savePreferences({ place })`. A device location never does.
- **Today's invite** shows when a place is set and there are no answers, until "Not now". The link sets Welcome to start at step 2.
- **My Profile "Your place"**, shown when a place is remembered: "Remembered place: {label}", plus "Forget this place", which sends `{ place: null }`.

- [ ] **Step 1: Write the failing tests:**
  - `with no place and no session, Today sends you to Welcome`. The history entry is replaced, not added.
  - `a remembered place opens Today without Welcome`.
  - `Welcome starts from the saved answers`.
  - `finishing with Remember saves the answers and the searched place`.
  - `a device location is never saved`.
  - `a new searched place replaces the remembered one`.
  - `Forget this place clears it`.
  - `the invite opens Welcome at step 2; Not now hides it`.
  - Update `choosePlace` so that on Welcome it picks the place, then presses Skip twice.
- [ ] **Step 2:** Run the shell test. Expected: the new tests FAIL.
- [ ] **Step 3: Implement**, and update the e2e journey: on `/app`, search, then Skip, Skip, then Today.
- [ ] **Step 4:** Run `npm test -w client` and `npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): welcome or today, and a remembered place`.

### Task 5: Privacy, e2e and proof

- [ ] **Step 1: Privacy.**
  - Add a "Remember on this device" paragraph to PRIVACY.md and the Privacy page: what is saved (answers, plus the searched place's name and coordinates rounded to about 1 km), what never is (a device location), and how to forget it ("Forget this place", or "Delete my saved data").
  - Write the page test first.
- [ ] **Step 2: e2e.** `e2e/onboarding.spec.ts`:
  - `/app` → step 1 → search Pune → Office commute → Car → Next → Electric → See my air → Today shows "Pune, Maharashtra";
  - Remember stays unticked, so no account is created.
- [ ] **Step 3: The gate.** Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run e2e`.
- [ ] **Step 4: See it.**
  - Steps 1–3 and the invite, at 320 and 1280 px.
  - No sideways scroll.
  - Tab order through every step.
  - The remembered-place return path, with a real session (local Supabase is set up).
- [ ] **Step 5: Docs.** USER_GUIDE ("First visit"), DESIGN.md §8 (`Welcome`), and a CHANGELOG line. Commit, `docs: onboarding`. Don't push.
