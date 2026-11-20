# Phase 9: Responsive and Accessibility Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove every page works at phone, tablet and desktop sizes, with zoom, wider text spacing, Windows High Contrast, the keyboard alone, and on a real phone. Fix what fails, test-first.

**Architecture:**
- Automated checks go in shared Playwright helpers (`e2e/layout.ts`) and a new `e2e/responsive.spec.ts`. They answer every API call themselves, so they spend no rate limit.
- Hand checks (the keyboard walk, an accessibility-tree read, and the owner's phone) are recorded in `ACCESSIBILITY.md`.
- Every failure found becomes a failing test first, then the smallest fix.

**Tech Stack:** Playwright (`desktop` and `phone` projects), axe (`e2e/axe.ts`), Vitest/Testing Library, Tailwind v4 tokens, Vite dev server.

**Spec:**
- `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md`: §2 goal 1, §6, §11, §12 ("Real-phone check: Phase 9 (tap, safe areas, keyboard)") and §13 (order 8: "responsive and accessibility pass, real phone").
- `docs/UX_AUDIT.md`: 12.5 and §7, row 9.
- The owner's choice of 21 Nov 2026: "Phone now, over Wi-Fi". Geolocation waits for the live site.
- Phase 10 (the browser review at 320/768/1280, full regression and final review) is a separate plan.

## Global Constraints

- **Targets:** at least 44 px (`min-h-11`), except links inside a sentence (WCAG 2.5.8's inline exception).
- **Process:**
  - test-first;
  - no new dependency;
  - tokens from `client/src/index.css` only;
  - the airaware-ui order: screenshot at 320 and 1280 before changing anything.
- **Data rules (AGENTS.md §5):**
  - the "Model forecast" label, the "Not current" banner, sources, units and times stay exactly as they are;
  - an air-quality label's wording is never changed to make it fit; change the layout instead.
- **Privacy and scope:**
  - Wi-Fi exposure covers the web dev server only (`--host`, port 5173). The API stays on localhost behind Vite's proxy.
  - The owner answers the Windows firewall prompt.
  - The server goes back to localhost-only at the end of Task 5.
- **Not used:**
  - modern-web-guidance (its lookup was denied; don't work around it);
  - Hallmark;
  - no push.
- **Commits:** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A real long place name at 320×640:** "Chhatrapati Sambhajinagar, Maharashtra" (38 characters) must still show the verdict above the bottom bar (goal 1). Pinned in Task 1.
2. **The place dialog on a phone with the keyboard open:** its search input and suggestions must stay visible above the keyboard. Pinned in Task 5's checklist.
3. **Wider text spacing:** chip, nav and button labels must not clip, except the place chip's deliberate ellipsis. Pinned in Task 2.
4. **Windows High Contrast:** the focus ring must still show on the navy bars, and the title block must sit on the system background. Pinned in Task 3.
5. **Landing and Privacy at 320:** they get the same edge and target checks as the app pages. Pinned in Task 1.

---

### Task 1: Edges, headings and targets on every page and size

**Files:**
- Create: `e2e/layout.ts`. Move `pastTheEdge` here from `e2e/backdrop.spec.ts` and add `smallTargets`.
- Create: `e2e/responsive.spec.ts`
- Modify: `e2e/backdrop.spec.ts` (import the helper), plus whatever the new tests show must change.

**Interfaces:**
- Produces:
  - `pastTheEdge(page: Page): Promise<string[]>`: unchanged behaviour.
  - `smallTargets(page: Page): Promise<string[]>`: every visible `a`, `button`, `input:not([type=hidden])`, `select`, `textarea`, `summary`, `[role=button]` and `label:has(input)` that is less than 44 px tall, or less than 44 px wide when it isn't a text field.
    - Skipped: anything inside `[data-air]` or `.sr-only`, and an `a` whose nearest block ancestor is a `p` or `li` holding text other than the link (inline).
    - Each entry is `tag "first 30 chars" WxH`.
  - `stub(page, level?, weather?)`: move it from `backdrop.spec.ts` into `layout.ts` unchanged and export it, so both specs share one stub.

- [ ] **Step 1: Write the failing tests** in `e2e/responsive.spec.ts`.
  - **Coverage:** for each path (`/`, `/privacy`, `/app`, `/app/ask`, `/app/home`, `/app/habits`, `/app/profile`, and `/app/welcome` in a fresh context) and each size (320×640, 768×1024, 1280×800):
    - `'nothing reaches past the screen: {path} {size}'`: `pastTheEdge` is `[]`, with every `main details` opened.
    - `'one heading 1: {path} {size}'`: exactly one visible `h1`.
  - **Targets:** for each path at 320×640, `'touch targets are 44 px: {path}'`: `smallTargets` is `[]`.
  - **axe:** for each path at 320×640, `'axe passes on a phone: {path}'`: `expectNoAxeViolations(page)`. Spec §11 asks for axe on every page; My Profile and Welcome have no phone-width run today.
  - **Long place:** `'a long real place keeps the verdict above the bar'`.
    - At 320×640, open `/app` with the place "Chhatrapati Sambhajinagar, Maharashtra".
    - The visible `main section h2` must end above `nav[aria-label="Main"]`'s top.
- [ ] **Step 2: Run them.**
  Run: `npx playwright test --config e2e/playwright.config.ts e2e/responsive.spec.ts`
  Expected: FAIL wherever a page breaks a rule. Record each failure (page, size, offender) in the ledger. If everything passes, prove each check with a mutation (a 400 px panel; a `min-h-8` button; a second `h1`) and ledger that.
- [ ] **Step 3: Fix each failure at its cause, smallest change first.**
  - **Long place:** if it fails, Today's `h1` becomes `max-sm:text-2xl` (a 24 px title on phones). Any other title change is a ledgered ruling.
  - **Targets:** reach 44 px with `min-h-11` and/or padding, never by shrinking text.
- [ ] **Step 4: Run** `npm test` and `npx playwright test --config e2e/playwright.config.ts e2e/responsive.spec.ts e2e/backdrop.spec.ts`. All pass.
- [ ] **Step 5: Commit** `test(e2e): edges, one h1 and 44 px targets on every page and size`, plus each fix.

### Task 2: Zoom and wider text spacing

**Files:**
- Modify: `e2e/layout.ts` (add `clippedText`) and `e2e/responsive.spec.ts`, plus fixes.

**Interfaces:**
- Produces: `clippedText(page: Page): Promise<string[]>`. It lists every visible element with text and computed `overflow-x` or `overflow-y` of `hidden` or `clip` whose `scrollWidth > clientWidth + 1` or `scrollHeight > clientHeight + 1`. It skips `.truncate` (a deliberate ellipsis with a full accessible name), `.sr-only` and `[data-air]`.

- [ ] **Step 1: Write the failing tests.**
  - `'text at 200 % still fits: {path}'`:
    - at 1280×800, set `document.documentElement.style.fontSize = '200%'` after load (the WCAG 1.4.4 stand-in for 200 % text);
    - then `pastTheEdge` and `clippedText` are both `[]`.
  - `'wider text spacing clips nothing: {path}'`:
    - at 320×640, inject `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important } p { margin-bottom: 2em !important }` (WCAG 1.4.12);
    - then `clippedText` is `[]`.
  - Both run on the same 8 paths as Task 1.
- [ ] **Step 2: Run them.** Expected: FAIL on whatever clips. Ledger each failure, or the mutation proof if none.
- [ ] **Step 3: Fix at the cause.** Prefer `min-h-*` over a fixed `h-*`, and wrapping over clipping.
- [ ] **Step 4: Run them, then the Task 1 tests.** All pass.
- [ ] **Step 5: Commit** `test(e2e): 200 % text and WCAG text spacing on every page`, plus fixes.

### Task 3: Windows High Contrast

**Files:**
- Modify: `client/src/features/air-quality/CitySkyline.tsx` (root class) and its test.
- Modify: `e2e/responsive.spec.ts`.

**Interfaces:**
- Produces: the backdrop root gains `forced-colors:hidden`. Under forced colours the app shows the system background, with no picture behind the words.

- [ ] **Step 1: Write the failing tests.**
  - **Unit** `CitySkyline.test.tsx` `'the backdrop steps aside in forced colours'`: the root's classes include `forced-colors:hidden`, both loading and drawn.
  - **e2e** `'forced colours: no backdrop, focus still shows'`:
    - `page.emulateMedia({ forcedColors: 'active' })` on `/app`;
    - `[data-air]` is not visible;
    - after one Tab, `document.activeElement`'s computed `outline-style` is not `none`.
  - **e2e:** axe passes on `/app` and `/app/ask` under forced colours.
- [ ] **Step 2: Run them.** Expected: the unit test and the hidden-backdrop check FAIL.
- [ ] **Step 3: Add the class.** Fix anything else the e2e shows (for example, a focus ring that relies on `box-shadow` only).
- [ ] **Step 4: Run** `npm test -w client` and the responsive spec. All pass.
- [ ] **Step 5: Commit** `feat(a11y): the backdrop steps aside in forced colours`.

### Task 4: The keyboard walk and the accessibility tree

**Files:**
- Modify: `ACCESSIBILITY.md`, adding "Results (Phase 9)": the new walk table, the tree read, and the forced-colours, zoom and spacing results. Keep Phase 8's results, marked as superseded where they differ.
- Plus any fix found, test-first.

- [ ] **Step 1: Walk each page with Tab and Shift+Tab only**, in the built-in browser at 1280 and again at 390:
  - Today, Ask, My Home, Better Habits, My Profile, Welcome (all 3 steps), the place dialog (open, search, choose, Escape), `/` and `/privacy`.
  - Record for each: the focus order, whether focus is visible (on the navy bars, the panels and the sky), traps, and that Escape closes the dialog and focus returns to the chip.
- [ ] **Step 2: Read each page's accessibility tree** (`page.locator('body').ariaSnapshot()`, kept in the scratchpad). Check:
  - landmarks (header, nav "Main", main, footer);
  - one `h1` and heading order;
  - every button and link has a name;
  - the backdrop is absent;
  - Ask's `output` status line;
  - "Model forecast" and "Not current" are present in the tree.
- [ ] **Step 3: For each failure**, write the failing component test (or e2e) first, then the fix. Ledger each.
- [ ] **Step 4: Write the results into `ACCESSIBILITY.md`**, and say plainly that no real screen reader was used, unless the owner does Task 5's optional item.
- [ ] **Step 5: Commit** `docs(a11y): Phase 9 keyboard walk and accessibility-tree read`, plus fixes.

### Task 5: The real-phone check over Wi-Fi (needs the owner)

**Files:**
- Create: `docs/REAL_PHONE_CHECKLIST.md`
- Modify: `ACCESSIBILITY.md` (results), plus fixes.

- [ ] **Step 1: Write the checklist.** Each item is one action and what "right" looks like, in plain words. These are the mobile-native skill's items for this app:
  1. A tap on a nav item, chip or button shows press feedback at once, with no grey flash and no lag.
  2. Hover styles never stick after a tap.
  3. The top bar and the bottom bar clear the notch and the home indicator, and the city sits above the bottom bar.
  4. Scrolling to the end of Today shows the whole city under the footer.
  5. Tapping the Ask box and the place search: the page doesn't zoom, and the keyboard doesn't cover the input or the suggestions (Review Focus 2).
  6. Pulling down at the top doesn't fight the page.
  7. A long press on a button doesn't select its text.
  8. The status bar colour matches the navy header.
  9. Turning the phone sideways: no city behind the title, and nothing cut off.
  10. On a rainy look (you'll get a link that forces one), the rain falls smoothly and stops within about 5 seconds.
  11. The place dialog opens, searches, chooses and closes.
  12. Optional: with TalkBack or VoiceOver on, the Today title, the verdict and the nav labels read correctly.
  - **Not testable here:** "Use my location" (it needs HTTPS). It waits for the live site.
- [ ] **Step 2: Expose the web dev server on Wi-Fi.**
  - Restart only `web` with `npm run dev -w client -- --host`.
  - Find the PC's Wi-Fi address with `ipconfig`.
  - Give the owner the link `http://<that address>:5173/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86`.
  - **For item 10, the rain:** ask the local API (`/api/v1/air-quality/forecast`) about a handful of Indian cities and give the owner a link for one whose live forecast has `precipitationMm ≥ 0.2` this hour. No stub, no code change. If none is raining, item 10 is recorded as "not observed: no rain anywhere checked".
- [ ] **Step 3: The owner runs the checklist and reports back.** Each report the owner gives is the only source for that item's result.
- [ ] **Step 4: Each failure becomes a failing test where one can reproduce it** (e2e with the phone project, or a component test), then the fix. Device-only issues get a ledgered ruling and a fix verified on the owner's phone.
- [ ] **Step 5: Restart `web` without `--host`** (localhost only). Record the results in `ACCESSIBILITY.md`, then commit `docs(a11y): Phase 9 real-phone check` plus fixes.

### Task 6: Docs and the full gate

**Files:**
- Modify:
  - `DESIGN.md` (§8 the backdrop in forced colours; §10 the checks that guard responsive behaviour);
  - `CHANGELOG.md`;
  - `TESTING_QA.md` (the new specs and the real-phone checklist).

- [ ] **Step 1: Update the three docs.**
- [ ] **Step 2: Run the full gate:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run e2e`. Run each on its own line with its exit code printed, and check that port 8090 is free first.
  Expected: all green.
- [ ] **Step 3: Commit** `docs: Phase 9 in DESIGN, CHANGELOG and TESTING_QA`.
