# Redesign Phase B: Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The landing page shows the new readout (with its skyline) as its hero example, and takes Stitch's numbered chapter and pipeline cards, without inventing data or features.

**Architecture:** `Landing.tsx` only, plus one image asset. The hero screenshot is replaced with a fresh real capture of the new `/app` readout. The pipeline steps and the chapters gain numbers and card styling. The search, the chapters' real rule cards, the limits band and the footer stay.

**Tech Stack:** React 19, Tailwind v4, Vitest and Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-stitch-redesign-design.md`, Phase B. It was approved by the owner on 2026-11-19, who said overnight "build everything … do little as per recommendation".

## Global Constraints

- **Unchanged:** the dark landing theme and the `client/src/index.css` tokens. No new dependency, font or CDN.
- **Data:**
  - Every number on the page is real.
  - The hero image is a real capture of the app, labelled as a past screenshot with its date.
  - The chapter cards stay the rules' own text, which a server test already enforces.
- **Accessibility:**
  - one `h1`;
  - the existing headings and regions keep their names (`Landing.test.tsx`, `e2e/pages.spec.ts`);
  - decorative numbers are `aria-hidden`;
  - tap targets are 44 px or more, and nothing scrolls sideways at 320 px.
- **Workflow:** follow `.claude/skills/airaware-ui/SKILL.md`.
- **Release:** **no push and no deploy**. The owner pushes all phases together.
- **Git:** one branch `main`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## My calls (overnight, per "do little as per recommendation")

1. **No "Use my location" on the landing page.** A device location must never travel in the URL (`Dashboard.tsx`'s rule), and the dashboard offers the button one click away.
2. **No separate decorative skyline band.** The refreshed hero screenshot shows the real skyline in the readout, and a light band on the dark page would clash. This satisfies "a fixed example on the landing page" with the real thing. Cost if wrong: a dark-tone band added later.
3. **The pipeline keeps its 4 real steps** (CAMS → Open-Meteo → AirAware server → your screen), instead of Stitch's 3, because the 4 are accurate.
4. **The screenshot is captured from localhost** with live Open-Meteo data, because nothing is pushed yet. Its caption carries the capture date.

## Review Focus

1. **The screenshot read as today's air.** Expected: the caption says "past screenshot" and gives the date, before or under the image, and the alt text describes it as a screenshot. Task 1 test: `the hero screenshot is labelled as past, with its date`.
2. **The image weight** (LCP). Expected: under 150 KB, with width and height set and `fetchPriority="high"`. Task 1 step: check the file size.
3. **The numbers read aloud.** Expected: "01"…"04" are `aria-hidden`, so headings read cleanly. Task 2 test: `chapter numbers are decorative`.
4. **Narrow screens.** Expected: the step cards stack, and there's no sideways scroll at 320 px. Checked in Task 3.
5. **Existing landing tests and e2e.** Expected: they pass unchanged, except where an asserted text changed, with a ledger ruling.

---

### Task 1: Fresh hero screenshot

**Files:**
- Create: `client/src/assets/readout.jpg`
- Delete: `client/src/assets/dashboard.webp`
- Modify: `client/src/pages/Landing.tsx` (the hero `figure`)
- Test: `client/src/pages/Landing.test.tsx`

- [ ] **Step 1: Write the failing test.** `the hero screenshot is labelled as past, with its date`: the hero `img` has alt "AirAware readout for Pune: a city skyline whose haze follows the 24-hour check, this hour's PM2.5 model forecast, the 24-hour check in words and its sources", and the figcaption reads "A past screenshot of the dashboard for Pune, 20 Nov 2026. Open the dashboard for current values."
- [ ] **Step 2:** Run `npx vitest run src/pages/Landing.test.tsx` (in `client/`). Expected: FAIL (the old alt and caption).
- [ ] **Step 3: Capture.**
  - Use a scratch Playwright script, never committed.
  - Load `http://localhost:5173/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86` at 1280 px with real data.
  - Screenshot the readout card (the section containing the heading "Model forecast") as JPEG, quality 85, to `client/src/assets/readout.jpg`.
  - Record its pixel size.
- [ ] **Step 4: Implement.**
  - Import `readout.jpg` and set `width`/`height` to the capture size.
  - Keep `fetchPriority="high"`. Use the new alt and caption.
  - Delete `dashboard.webp`.
- [ ] **Step 5:** Run `npm test -w client`, and check that the file is under 150 KB. Expected: PASS.
- [ ] **Step 6: Commit**, `feat(landing): hero shows the new readout`.

### Task 2: Numbered chapters and pipeline cards

**Files:**
- Modify: `client/src/pages/Landing.tsx` (`Chapter`, the steps list)
- Test: `client/src/pages/Landing.test.tsx`

- [ ] **Step 1: Write the failing tests.**
  - `chapter numbers are decorative`: each chapter region contains the text "01" … "04" in order, inside an `aria-hidden="true"` element, and the chapter's heading name is unchanged.
  - `the pipeline steps are numbered cards`: the list "How a forecast reaches you" still has 4 items with the same h3 titles, and each item contains an `aria-hidden` number "01" … "04".
- [ ] **Step 2:** Run `npx vitest run src/pages/Landing.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **Chapters:** a small `aria-hidden` kicker, `text-sm font-semibold tracking-wide text-primary`, reading `01`…`04`, above each chapter's h2.
  - **Steps:** each `li` becomes a card, `rounded-xl border border-rule-dark bg-surface p-6`, with an `aria-hidden` number badge. Remove the CSS-counter `before:` number, which the visible badge replaces.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(landing): numbered chapters and pipeline cards`.

### Task 3: Proof

- [ ] **Step 1: The gate:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run e2e`.
- [ ] **Step 2: See it.**
  - Screenshot `/` at 320 px and 1280 px, full page, saved in the scratchpad.
  - Check there's no sideways scroll at 320 px, and Tab from the search to the action link.
- [ ] **Step 3: Commit** a CHANGELOG line, `docs: landing refresh`. Don't push.
