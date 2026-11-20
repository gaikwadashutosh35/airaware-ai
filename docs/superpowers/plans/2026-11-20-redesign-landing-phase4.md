# Assistant Redesign, Phase 4: Landing, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/` becomes the spec's eight sections: a hero with "Check My Air", "Meet Your Assistant" and the place search beside a fresh phone screenshot of Today; "Understand your air" with a screenshot of the open details; the four existing rule-card chapters under their new names; "How AirAware works" with the 4 real steps and the limits; and a closing "Check My Air". Sections after the hero rise in as they scroll into view, in CSS only.

**Architecture:** `Landing.tsx`, `landingExamples.ts` and `index.css`, plus two new real screenshots that replace `readout.jpg`. `Chapter` takes its figure contents as children, so the screenshot chapter and the four card chapters share one layout. The reveal is one class, `.reveal`, driven by `animation-timeline: view()` under `@supports` and `prefers-reduced-motion: no-preference`.

**Tech stack:** React 19, Tailwind v4, lucide-react (installed); Vitest and Testing Library; Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md` §7.8, §8, §10, §11, §13 (row 7); wireframes section 6.

## Owner decisions (20 Nov 2026)

1. **The hero screenshot is the phone view of Today:** 390 px wide, captured at 2×, shown at its real size.
2. **"Understand your air" shows the open "Air quality details"** (the PM2.5 figure with its unit, hour and 24-hour check). The text explains the verdict and the "Model forecast" label in words; the hero shot already shows the verdict.
3. **"Explainable AI" keeps its name, with honest text** (copy below).

## Global constraints

**Copy, exact:**
- **Hero:** h1 "The air around you matters."; then "Understand your city's air quality. Discover smarter daily routines. Make better choices for your home and community."; links "Check My Air" (`/app`) and "Meet Your Assistant" (`/app/ask`); then the line "Or search a city" above the existing `LocationSearch`, which still opens `/app?place=…&lat=…&lon=…`.
- **h2s, in order:** "Understand your air", "Your personal daily plan", "Improve indoor air", "Sustainable everyday choices", "Explainable AI", "How AirAware works", "Your city, the next two days".
- **"Understand your air" text:** "One sentence tells you how today's forecast compares with India's 24-hour limits, labelled Model forecast with the time it was updated. Every number, unit and source is one tap away, under Air quality details."
- **"Explainable AI" text:** "AI can arrange our rules' suggestions and word them for your day, but it never decides them. Every suggestion opens to its reason, the answers and forecast check it used, its sources and its limits."
- **Kept word for word:** the three other chapter texts, every card, caption "Example from our rules." (and the see-why caption), the 4 steps, "Forecasts for the next 48 hours, hour by hour.", "Forecasts are model estimates, not station measurements, and not the CPCB National AQI.", "Official CPCB observations are not connected yet.", the footer.
- **Captions** (before their image): "A past screenshot of Today for Pune, {date}. Open the app for current values." and "A past screenshot of Air quality details for Pune, {date}. Open the app for current values." `{date}` is the capture's date, written like `20 Nov 2026`.
- **Never:** "safe", "healthy", "clean air", "good air", "bad air", "AQI" (except the kept limits sentence), and no digit outside the `invents no numbers` test's list.

**Data:** both screenshots are real captures of the local app with live data, for the searched place Pune (never a device location), labelled as past with their date. Their alt text names what is shown, never a value.

**Motion:** opacity and an 8 px `translate` only; the hero and footer never move; nothing moves under `prefers-reduced-motion: reduce` or without `animation-timeline` support.

**Accessibility:** one h1; chapter and step numbers and the flow arrows are `aria-hidden`; every link is 44 px or taller; nothing scrolls sideways at 320 px.

**Weight:** each image 150 KB or less, with `width` and `height` set; the hero image keeps `fetchPriority="high"`, the details image is `loading="lazy"`.

**Process:** follow `.claude/skills/airaware-ui/SKILL.md`; test-first; no new dependency; no push. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## My calls (for your review)

1. **Captions say "Today", not "dashboard"** (the wireframe's word): the new app has no page called dashboard. Cost if wrong: none.
2. **The hero image shows at its CSS size** (390 px wide, centred in its column), so its text reads at 1:1. Cost if wrong: empty space beside it on wide screens.
3. **The reveal reaches full opacity 120 px after a section's top enters the screen** (`animation-range: entry 0% entry 120px`), whatever the section's height. A percentage of `entry` would keep a tall chapter faded until its top reached the top of a phone screen. Cost if wrong: a shorter rise than other sites use.
4. **The reveal is per section,** not per heading or card. Cost if wrong: a calmer page.
5. **Screenshots are captured with reduced motion,** so the scene's rain is at rest in the frame. Cost if wrong: none; the rain rests after 5 seconds anyway.
6. **`readout.jpg` is deleted;** the two captures replace it, and git keeps it. Cost if wrong: none.
7. **"How AirAware works" gains a flow:** an `aria-hidden` lucide `ArrowDown` (below `lg`) or `ArrowRight` (from `lg`) before the number in steps 2–4. The `<ol>` and its name stay. Cost if wrong: none.
8. **The real-browser axe check on `/` stays as it is.** If a section caught mid-reveal at the fold fails contrast there, that test alone emulates reduced motion (it checks the resting page), with a ruling; Task 3's e2e covers the motion. Cost if wrong: a transient fade is never contrast-checked.

## Review focus

1. **A screenshot read as today's air.** Expected: the caption comes first, says "past" and gives the date; the alt text says "Screenshot" and has no values. Tests: Task 1 and Task 2 caption tests.
2. **A section stuck invisible.** The browser reads the range differently, motion is reduced, support is missing, or a section is taller than the screen. Expected: full opacity once its top is 120 px into view; static under reduced motion. Tests: Task 3 e2e.
3. **A hero button leads nowhere useful on a first visit.** Expected: "Check My Air" opens Welcome; "Meet Your Assistant" opens Ask, which asks for a place. Test: Task 3 e2e.
4. **Narrow screens and weight.** Expected: no sideways scroll at 320 px; both images 150 KB or less with their size set, so nothing jumps. Checks: Task 1 and 2 size steps, Task 4 proof.
5. **Words that break the copy rules or invent numbers.** Expected: the `invents no numbers` test passes with only the capture date added; no banned word. Tests: Task 1 and Task 2.

---

### Task 1: The hero

**Files:** modify `client/src/pages/Landing.tsx` and `Landing.test.tsx`; create `client/src/assets/today-phone.jpg`; delete `client/src/assets/readout.jpg`.

**Interfaces (produces):** `ACTION = 'Check My Air'` (used by the hero and the closing section); `ASSISTANT = 'Meet Your Assistant'`.

- [ ] **Step 1: Write the failing tests** in `Landing.test.tsx`:
  - `has one main heading and both hero actions`: one h1, "The air around you matters."; the subhead text; two links "Check My Air", both `href="/app"`; one link "Meet Your Assistant", `href="/app/ask"`; no link "Check your area's air quality".
  - `puts the place search in the hero, after "Or search a city"`: the text "Or search a city" comes before the combobox "Search for a city or area in India" in document order.
  - `the hero screenshot is labelled as past, with its date`: the image with alt "Screenshot of AirAware's Today page on a phone, for Pune: the forecast verdict with its Model forecast label, today's recommendation and the navigation bar" has, first in its figure, the caption "A past screenshot of Today for Pune, {date}. Open the app for current values.".
  - Add `{date}` to `REAL_FIGURES`; drop `'20 Nov 2026'` if the capture date differs.
- [ ] **Step 2:** Run `npm test -w client -- Landing`. Expected: the three tests FAIL.
- [ ] **Step 3: Capture.**
  - Start `api` and `web` from `.claude/launch.json`.
  - Run a scratch Playwright script from the scratchpad, never committed. Resolve `@playwright/test` from the repo.
  - Use a fresh context: viewport 390×844, `deviceScaleFactor: 2`, `isMobile`, `hasTouch`, `reducedMotion: 'reduce'`.
  - Open `http://localhost:5173/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86` and wait for the verdict and a built recommendation card.
  - Take a viewport screenshot as JPEG, quality 80, to `client/src/assets/today-phone.jpg`. If it is over 150 KB, retake it at quality 70.
  - Look at the image. If the verdict, the label, the recommendation or the bar is missing, retake it.
- [ ] **Step 4: Implement.**
  - Copy, links and order as in Global constraints. "Meet Your Assistant" is an outlined twin of the primary link: `press`, `min-h-12`, `border border-text`.
  - The figure imports `today-phone.jpg` with `width={390} height={844}` and keeps `fetchPriority="high"` and `data-slot="hero"`.
  - Delete `readout.jpg`.
- [ ] **Step 5:** Run `npm test -w client`. Expected: PASS, with the image file at 150 KB or less.
- [ ] **Step 6:** Commit, `feat(landing): hero with Check My Air, Meet Your Assistant and a phone shot of Today`.

### Task 2: Sections 2 to 8

**Files:** modify `client/src/pages/Landing.tsx`, `landingExamples.ts` and `Landing.test.tsx`; create `client/src/assets/air-details.jpg`.

**Interfaces:**
- Consumes `ACTION` from Task 1.
- Produces `Chapter({ number, flip, heading, text, caption, children }: { number: number; flip: boolean; heading: string; text: string; caption: string; children: ReactNode })`. It renders `<section aria-labelledby>` and a `figure` whose `figcaption` (the caption) comes before `children`.
- `LANDING_EXAMPLES` keeps its shape and candidates; only `heading` and `text` values change.

- [ ] **Step 1: Write the failing tests:**
  - `tells the story in seven sections, in order`: the h2 list equals Global constraints' list.
  - `shows the open details screenshot, labelled as past`: the region "Understand your air" holds its exact text and an image with alt "Screenshot of the open Air quality details for Pune: the PM2.5 model forecast for one hour with its unit, and the 24-hour check in words". The caption "A past screenshot of Air quality details for Pune, {date}. Open the app for current values." comes before it, and the image has `loading="lazy"`.
  - `Explainable AI keeps the card's reasons`: the region "Explainable AI" holds the new text, and its "Why?" is open with both source links, and the other three chapters' "Why?" start closed (the old "See why" test, retargeted).
  - `chapter numbers are decorative`: "01" to "05" inside `aria-hidden` elements, in the five chapter regions.
  - `explains how AirAware works, in order`: inside the region "How AirAware works", the list "How a forecast reaches you" is an `ol` with the four h3s unchanged. Steps 2–4 each hold an `svg[aria-hidden="true"]` before their number; step 1 holds none.
  - `states its limits plainly`: both limits sentences sit inside the region "How AirAware works".
  - Update the existing chapter tests to the new headings. Remove the "Where every number comes from" expectations.
- [ ] **Step 2:** Run `npm test -w client -- Landing`. Expected: these FAIL.
- [ ] **Step 3: Capture.**
  - Use the same script with a fresh context: 1280×800, `deviceScaleFactor: 1`, `reducedMotion: 'reduce'`, and the same URL.
  - Click "Air quality details" and wait for the PM2.5 figure.
  - Screenshot a clip from the top of the `details` to the bottom of the PM2.5 readout block, as JPEG, quality 85, to `client/src/assets/air-details.jpg`. Retake at quality 75 if it is over 150 KB.
  - Look at it, and record its pixel size.
- [ ] **Step 4: Implement.**
  - Change `Chapter` to the Interfaces signature. The four example chapters pass their light panel with `PlanCard` as children. "Understand your air" (chapter 01) passes the image with its recorded `width` and `height`.
  - Order: hero, "Understand your air", the four example chapters (02–05, `flip` alternating as now), "How AirAware works", then the closing section.
  - "How AirAware works" holds the subline, the steps with their arrows (My call 7), then the two limits sentences. The old separate band and the "Where every number comes from" heading go.
  - Every section gets `aria-labelledby` its h2.
- [ ] **Step 5:** Run `npm test -w server -- landingExamples` and `npm test -w client`. Expected: PASS. The server test confirms the cards still match the rules, and the image is 150 KB or less.
- [ ] **Step 6:** Commit, `feat(landing): eight sections, with the open details and how AirAware works`.

### Task 3: Scroll reveals

**Files:** modify `client/src/index.css`, `client/src/pages/Landing.tsx` and `Landing.test.tsx`; create `e2e/landing.spec.ts`.

**Interfaces:**
- Consumes the section structure from Task 2.
- Produces the CSS class `reveal` and `@keyframes reveal`.

- [ ] **Step 1: Write the failing tests:**
  - Unit test `every section after the hero rises in`: each `main > section` except the first has class `reveal`, and the hero has none.
  - e2e `sections rise in as they scroll into view`:
    - On `/`, the region "Understand your air" has computed `animation-name` `reveal`.
    - With its top 10 px below the screen, its computed `opacity` is `0`.
    - Scrolled so its top is 200 px above the screen's bottom, after two animation frames, `opacity` is `1`.
  - e2e `no movement under reduced motion`: after `page.emulateMedia({ reducedMotion: 'reduce' })` and a load, the same region has `animation-name` `none` and `opacity` `1` while below the screen.
  - e2e `the hero buttons on a first visit`:
    - "Meet Your Assistant" opens `/app/ask`, with the h1 "Ask AirAware" and the place search.
    - Back on `/`, the first "Check My Air" ends on `/app/welcome`, with the h1 "Where should we check air quality?".
- [ ] **Step 2:** Run `npm test -w client -- Landing` and `npx playwright test -c e2e/playwright.config.ts landing`. Expected: the unit test and the two reveal tests FAIL; the buttons test passes already (Task 1 built them).
- [ ] **Step 3: Implement.**
  - In `index.css`, inside the existing `@media (prefers-reduced-motion: no-preference)` block, add `@supports (animation-timeline: view()) { .reveal { … } }`.
  - Set `animation: reveal linear both;`, then `animation-timeline: view();` after the shorthand (the shorthand resets it), then `animation-range: entry 0% entry 120px;`.
  - Add `@keyframes reveal { from { opacity: 0; translate: 0 8px; } }`.
  - Add `reveal` to sections 2–8 in `Landing.tsx`.
- [ ] **Step 4:** Run `npm test -w client` and `npm run e2e`. Expected: all pass, including `pages.spec.ts`'s axe on `/`. If that axe check fails only on a section caught mid-reveal, apply My call 8 and ledger it.
- [ ] **Step 5:** Commit, `feat(landing): sections rise in as they scroll into view`.

### Task 4: Docs and proof

**Files:** modify `DESIGN.md` (§2 CTA, §6 story as the eight sections, §9 motion line), `ACCESSIBILITY.md` (the `/` tab-order row), `CHANGELOG.md`, and the spec §7.8 (an "*Amended (Phase 4…)*" note for owner decisions 1–3 and My call 1).

- [ ] **Step 1: Docs.**
  - `ACCESSIBILITY.md` `/` row: wordmark → "Check My Air" → "Meet Your Assistant" → place search → the four example "Why?" panels → the two source links in the open example → "Check My Air" → footer links (Open-Meteo.com, Privacy) → wraps to the top.
  - The `DESIGN.md` §9 line: "Landing sections after the hero rise in (opacity, 8 px `translate`) as they scroll into view, from `animation-timeline: view()`, only under `prefers-reduced-motion: no-preference` and where supported; otherwise they are still."
- [ ] **Step 2: The gate.**
  - Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run e2e`. Expected: all pass.
  - Take full-page screenshots of `/` at 320 and 1280 px with Playwright MCP into `.playwright-mcp/`, and look at them. Expected: no sideways scroll at 320 px, and nothing clipped.
  - Keyboard pass: the Tab order matches the `ACCESSIBILITY.md` row, and focus is visible on the dark page and inside the light panels.
  - Check the repository is still under 10 MB.
- [ ] **Step 3:** Commit, `docs: the landing as built`. Don't push.
