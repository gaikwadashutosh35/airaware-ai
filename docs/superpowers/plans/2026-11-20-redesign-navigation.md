# Assistant Redesign, Phase 2: Navigation and App Shell, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Every `/app/*` page shares one shell with 5-item navigation: a bottom bar on phones and a top bar from 768 px.
- A place chip changes the place from any page.
- The household answers and saved plans move to My Profile.
- Moving between pages keeps the place, the forecast and the answers, with no refetch.

**Architecture:**
- **Paths:** a tiny `lib/navigation.ts` (`usePath`, `navigate`, about 20 lines, no router library) drives the existing `App.tsx` switch.
- **`pages/AppShell.tsx`:**
  - It owns the state `Dashboard.tsx` owns today: place, clock, answers, forecast, sources, saved-plan list state.
  - It renders the bars, the place chip and the current page.
- **The current dashboard body becomes `pages/Today.tsx`.**
  - It has no household form and no saved list.
  - It has no search block once a place is set; the chip replaces it.
- **`pages/Profile.tsx`** gets the form and the saved list.
- **Placeholders:** Ask, My Home, Better Habits and Welcome get a heading and one line until their phases. They are local only and never pushed in this state.

**Tech stack:** React 19, Tailwind v4 tokens, lucide-react (installed), native `<dialog>`, Vitest and Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md` §5, §6, §7.7, §11, §13. Wireframes: section 1 of `…-wireframes.html`.

## Global constraints

**Paths:**
- `/app`, `/app/welcome`, `/app/ask`, `/app/home`, `/app/habits` and `/app/profile`.
- Any other `/app/…` path renders Today.
- The server (`app.ts` fallback) and `netlify.toml` serve `index.html` for `/app/*`.

**URL contract:**
- `?place=&lat=&lon=` is read on any `/app/*` path.
- In-app navigation keeps the current query string.
- A device location never enters the URL.

**Navigation:**
- **Items:** Today (`Sun`), Ask AirAware (`MessageCircle`), My Home (`House`), Better Habits (`Leaf`), My Profile (`CircleUser`).
- **Phone labels:** Today, Ask, Home, Habits, Profile. Each item's accessible name is its visible label.
- **Landmark:** `<nav aria-label="Main">`, and the current item has `aria-current="page"`.
- **Bottom bar:** shown under 768 px. It is fixed, at least 56 px tall plus `env(safe-area-inset-bottom, 0px)`. `main` gets matching bottom padding.
- **Top bar:** shown from 768 px. It is navy (`bg-bg`), with full labels from 1024 px.
- **Skip link:** "Skip to content", first in the tab order.

**Head:**
- `index.html` gets `viewport-fit=cover`.
- One `theme-color` of `#080f1c`: both bars and the landing are navy at the top.

**Place chip:**
- A button showing the place label, truncated, with the full label as its accessible name. Its text is "Choose a place" when there is none.
- It opens a native `<dialog>` titled "Change place", containing the existing `LocationSearch` and `UseMyLocation`.
- Choosing a place closes the dialog.
- Escape closes it, and focus returns to the chip.

**Kept unchanged:**
- all API calls;
- the forecast, plan and saved-plan behaviour;
- every data label;
- the rate limits.

**Process:**
- Test-first.
- No push. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## My calls

1. **Opening a saved plan from My Profile keeps today's flow.** It goes to Today and shows the snapshot with "Back to today". The spec's inline view (§7.7) comes with the Today redesign in Phase 6, which rewrites the plan area anyway. Cost if wrong: one extra navigation.
2. **Today hides its own search block once a place is set,** and "Change place" opens the chip's dialog. With no place, the existing no-place card and search stay until onboarding (Phase 5). Cost if wrong: none.
3. **The form keeps answers across pages.** `HouseholdPreferencesForm` gains `initial?: HouseholdContext`, so answers survive leaving My Profile and coming back, without saving.

## Review focus

1. **Back and forward buttons.** Expected: they switch pages, keep the place, and do not refetch the forecast. Task 1 test: `back and forward switch pages without reloading`.
2. **Reloading `/app/profile?place=…`.** Expected: the server and Netlify serve the app, and the place comes back from the query. Task 1 tests: server `serves the app on every /app path`; client `reads the place on any app path`.
3. **Answers typed in My Profile, then Today.** Expected: the plan uses them unsaved, and they are still there on returning to My Profile. Task 3 test: `answers survive leaving My Profile`.
4. **Keyboard.** Expected:
   - the skip link is first;
   - the nav is reachable;
   - the dialog traps focus natively, closes on Escape and returns focus to the chip.

   Task 4 test: `the place dialog closes on Escape and returns focus`.
5. **The phone bottom bar covering content.** Expected: the last control on every page stays reachable above the bar, and nothing scrolls sideways at 320 px. Checked in Task 5 with screenshots and e2e on the `phone` project.

---

### Task 1: Paths and in-app navigation

**Files:**
- Create: `client/src/lib/navigation.ts`, `client/src/lib/navigation.test.ts`.
- Modify:
  - `client/src/App.tsx` and `client/src/App.test.tsx`;
  - `server/src/app.ts` and its fallback test (find it next to `app.ts`);
  - `netlify.toml`.

**Interfaces:**
- **Produces:**
  - `usePath(): string`, the pathname; it re-renders on `popstate` and on `navigate`.
  - `navigate(to: string): void`, which calls `history.pushState(null, '', to + location.search)` and notifies.
  - `appPage(path: string): 'today' | 'welcome' | 'ask' | 'home' | 'habits' | 'profile'`.

- [ ] **Step 1: Write the failing tests.**
  - `appPage maps every app path`:
    - `/app` and `/app/` map to `'today'`;
    - each named path maps to its page;
    - `/app/unknown` maps to `'today'`.
  - `navigate keeps the query and notifies` (renders a probe using `usePath`).
  - `back and forward switch pages without reloading` (fires `popstate`).
  - Server: `serves the app on every /app path`. `GET /app/profile` and `GET /app/ask` return `index.html`; `/api/v1/unknown` still returns the JSON 404.
  - Netlify: `netlify.toml` has a `from = "/app/*"` redirect to `/index.html`, status 200. Read it as text in the server test.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - In `App.tsx`, any `/app` path renders `AppShell`. For now that is the existing `Dashboard`, renamed in Task 2.
  - Server: change `['/app', '/privacy']` to `['/app', '/app/*splat', '/privacy']` (Express 5 path syntax).
  - Netlify: add the redirect.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): app paths and in-app navigation`.

### Task 2: The shell and its navigation

**Files:**
- Create:
  - `client/src/pages/AppShell.tsx` and `AppShell.test.tsx`;
  - `client/src/components/AppNav.tsx` and `AppNav.test.tsx`;
  - `client/src/pages/Placeholder.tsx`.
- Rename: `pages/Dashboard.tsx` becomes `pages/Today.tsx`, and its test becomes `Today.test.tsx`. Its state moves to `AppShell` and arrives as props.
- Modify: `client/index.html` (viewport and theme-color).

**Interfaces:**
- **Consumes:** Task 1.
- **Produces:**
  - `AppNav({ page })`, which renders both bars, responsive by CSS.
  - `Today(props)`, which takes the shell's place, forecast, sources, answers and plan-area state, plus `onChangePlace`.

- [ ] **Step 1: Write the failing tests.**
  - **AppNav:**
    - `marks the current page`: exactly one link has `aria-current="page"`, and it is the right one.
    - `names each item by its label`: the 5 links have names Today, Ask AirAware, My Home, Better Habits, My Profile on the top bar and the short labels on the bottom bar.
    - `navigates in place`: clicking a link calls `navigate` and doesn't reload.
    - Axe passes.
  - **AppShell:**
    - `skip link comes first and targets main`.
    - `keeps the forecast when moving between pages`: the fetch mock is called once across Today, then Profile, then Today.
    - `the head allows safe areas and a navy theme colour`: read `index.html` for `viewport-fit=cover` and `<meta name="theme-color" content="#080f1c" />`.
  - **Move the 29 `Dashboard.test.tsx` tests** into `Today.test.tsx` and `AppShell.test.tsx`:
    - The tests of the form and the saved list (the household answers, "Delete everything", the snapshot) render the shell at `/app/profile` or `/app`, as needed.
    - They keep every assertion; the record is the test names.
- [ ] **Step 2:** Run `npm test -w client`. Expected: the new tests FAIL; the moved tests fail only on missing modules.
- [ ] **Step 3: Implement** the shell, the nav and the placeholders.
  - Placeholder text: "{Page name}", plus "This part of AirAware is on its way." It is never pushed in this state.
  - The bars use `bg-bg`, `text-text` and `.on-dark` focus.
  - The current item is an `--color-elevated` pill with a teal icon and a bold label.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): one shell with five-item navigation`.

### Task 3: My Profile holds the answers and saved plans

**Files:**
- Create: `client/src/pages/Profile.tsx` and `Profile.test.tsx`.
- Modify:
  - `HouseholdPreferencesForm.tsx` (the `initial` prop) and its test;
  - `Today.tsx` (it drops the form and the list);
  - `AppShell.tsx`;
  - `e2e/journey.spec.ts`.

- [ ] **Step 1: Write the failing tests.**
  - `the form starts from the answers it is given` (form test).
  - `answers survive leaving My Profile`:
    - choose "Yes" for outdoor exercise on Profile;
    - go to Today, then back to Profile;
    - the select still says "Yes";
    - and "Build my daily plan" on Today sends `routine.outdoorExercise: true`.
  - `My Profile lists saved plans, and opening one shows it on Today`.
  - `Today has no household form`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Profile order:** "Your answers" (the form), "Saved plans" (the list, with its existing empty handling), "Your data" (the form's existing delete), then the links to Privacy and to the sources.
  - **e2e journey:** answer the questions on `/app/profile`, then go to Today with the nav and build.
  - **Updated e2e strings:** none, because the labels are unchanged.
- [ ] **Step 4:** Run `npm test -w client` and `npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): My Profile holds answers and saved plans`.

### Task 4: Place chip and dialog

**Files:**
- Create: `client/src/components/PlaceChip.tsx` and `PlaceChip.test.tsx`.
- Modify: `AppShell.tsx` and `Today.tsx`.

- [ ] **Step 1: Write the failing tests.**
  - `the chip names the place and opens the dialog`.
  - `choosing a place closes the dialog and loads it`.
  - `the place dialog closes on Escape and returns focus`.
  - `Today hides the search once a place is set; "Change place" opens the dialog`. This updates the old test `the Change button moves focus to the place search`.
  - Axe passes with the dialog open.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement** with `dialogRef.current.showModal()` and `close()`, and a `close` event handler that refocuses the chip. jsdom lacks `showModal`, so the test setup stubs it the way `client/src/test/` stubs other browser APIs. If none exists, add a two-line stub in this test file.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): place chip`.

### Task 5: Proof

- [ ] **Step 1: The gate.** Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run e2e`.
- [ ] **Step 2: See it.**
  - Take screenshots of `/app` (Pune) and `/app/profile` at 320, 768 and 1280 px.
  - Tab order from the top on `/app` at 1280 px.
  - Check that the bottom bar never covers the last control.
  - Check there's no sideways scroll at 320 px.
  - Test back and forward in the browser.
  - The safe-area padding needs a real phone, which is Phase 9.
- [ ] **Step 3: Docs.**
  - `DESIGN.md` §8 lists `AppNav`, `PlaceChip`, `AppShell`, `Today` and `Profile`.
  - Update the `USER_GUIDE.md` "where things are" section.
  - Update `ARCHITECTURE.md` with the client paths.
  - Add a CHANGELOG line.
  - Commit, `docs: navigation and app shell`. Don't push.
