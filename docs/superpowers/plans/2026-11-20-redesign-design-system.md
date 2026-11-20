# Assistant Redesign, Phase 3: Design System Base, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- The whole site uses the real Inter font, served from our own domain.
- Buttons respond to a press.
- Phones no longer flash grey on tap.
- The site has a real favicon.
- An elevated-surface colour token is ready for the navigation bars.

**Architecture:**
- CSS and static assets only: `client/src/index.css`, `client/index.html`, `client/public/`.
- No component changes and no new dependency. The font is a file, not a package.

**Tech stack:** Tailwind v4 `@theme` and `@layer base`, Vite `public/` assets, Vitest (reading files from disk, as `CitySkyline.test.tsx` already does), and Playwright for the browser check.

**Spec:** `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md` §3, §4 (D5) and §10. The audit is `docs/UX_AUDIT.md` P10.

## Global constraints

- **Font:**
  - One file: `inter-latin-wght-normal.woff2`, 48,256 bytes.
  - Downloaded from `https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.3.0/files/inter-latin-wght-normal.woff2`.
  - Licence: `https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.3.0/LICENSE` (OFL-1.1, 4,477 bytes), kept next to it as `OFL.txt`.
  - Package version 5.3.0, published 19 Jul 2026.
  - **Your approval of this plan is the permission to download these two files.**
- **Security:** the existing CSP (`client/public/_headers`) already allows `font-src 'self'` and `img-src 'self'`. No header changes.
- **Motion:**
  - The press feedback is `transform: scale(0.97)`, using 120 ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
  - It applies only under `prefers-reduced-motion: no-preference`, and never to disabled buttons.
- **Tokens:** add `--color-elevated: #172638` from the brief. No other colour changes.
- **Not in this phase:**
  - `theme-color` and `viewport-fit=cover` move to Phase 2, with the navy bars and the safe-area padding they need.
  - No component restyling.
- **Release:** commit locally with no push. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review focus

1. **The font fails to load** (offline, or blocked). Expected: text shows at once in the system font, never invisible (`font-display: swap`). Test: `Inter loads from our own server, without hiding text`.
2. **Glyphs outside the Latin subset**, such as the subscript in "NO₂". Expected: those glyphs fall back to the system font and nothing breaks. Checked in Task 3 on the pollutant table, at 320 px.
3. **Reduced motion.** Expected: no scale on press. Test: `presses scale only when motion is welcome`.
4. **Disabled buttons**, such as "Build my daily plan" before a place is chosen. Expected: no press effect. Same test (the selector excludes `:disabled`).
5. **Wider Inter letter shapes.** Expected: no new sideways scroll or clipped label at 320 px on `/`, `/app` and `/privacy`, including a 70-character place name. Checked in Task 3 with screenshots and e2e.

---

### Task 1: Inter, favicon and token

**Files:**
- Create:
  - `client/public/fonts/inter-latin-wght-normal.woff2`
  - `client/public/fonts/OFL.txt`
  - `client/public/favicon.svg`
  - `client/src/styles.test.ts`
- Modify: `client/src/index.css` and `client/index.html`.

- [ ] **Step 1: Write the failing tests** in `client/src/styles.test.ts`. They read `src/index.css` and `index.html` with `readFileSync`, relative to `client/`.
  - `Inter loads from our own server, without hiding text`:
    - the CSS has an `@font-face` with `font-family: Inter`, `src: url('/fonts/inter-latin-wght-normal.woff2') format('woff2')`, `font-weight: 100 900` and `font-display: swap`;
    - `index.html` has `<link rel="preload" href="/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />`;
    - the file exists in `public/fonts/`;
    - its first 4 bytes are `wOF2`.
  - `the favicon is a real icon`: `index.html` has `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />` and no `data:,`, and `public/favicon.svg` exists.
  - `the elevated surface token exists`: the CSS contains `--color-elevated: #172638`.
- [ ] **Step 2:** Run `npx vitest run src/styles.test.ts` (in `client/`). Expected: 3 FAIL.
- [ ] **Step 3:** Download the two font files named in Global constraints into `client/public/fonts/`. Check that the size is 48,256 bytes and the header is `wOF2`.
- [ ] **Step 4: Implement.**
  - Add the `@font-face` at the top level of `index.css`, using the Latin `unicode-range` from fontsource `5.3.0` (`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`).
  - Add the preload and the icon link to `index.html`.
  - Add the token to `@theme`.
  - **Favicon:** an original SVG, 32×32 viewBox, a navy (`#080f1c`) rounded square with a teal (`#39d5c2`) sun over three buttes. No text.
- [ ] **Step 5:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 6: Commit**, `feat(ui): self-hosted Inter, favicon and elevated token`.

### Task 2: Press feedback and tap baseline

**Files:**
- Modify: `client/src/index.css` (`@layer base`), and `client/src/pages/Landing.tsx` (the `press` class on the call-to-action link only).
- Test: `client/src/styles.test.ts`.

- [ ] **Step 1: Write the failing tests.**
  - `presses scale only when motion is welcome`:
    - the CSS has `@media (prefers-reduced-motion: no-preference)`, containing a `button:not(:disabled)` rule with `transition: transform 120ms`;
    - and a `button:not(:disabled):active` rule with `transform: scale(0.97)`;
    - and no `:active` scale appears outside that block.
  - `phones show no grey tap flash and no tap delay`:
    - the CSS sets `-webkit-tap-highlight-color: transparent` on `html`;
    - and `touch-action: manipulation` on `a, button, summary, input, select, label`.
  - `button labels can't be selected by a long press`: `user-select: none` on `button` (links and body text stay selectable).
- [ ] **Step 2:** Run `npx vitest run src/styles.test.ts`. Expected: the 3 new tests FAIL.
- [ ] **Step 3: Implement** the three rules in `@layer base`. The landing call-to-action is a link styled as a button: give it the same press feedback through a `press` class defined in the same media block. Apply that class in `Landing.tsx` only.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(ui): press feedback and tap baseline`.

### Task 3: Proof

- [ ] **Step 1: The gate.** Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run e2e`. Expected: all pass. The e2e count is unchanged at 16.
- [ ] **Step 2: See it.**
  - Take screenshots before (from git `HEAD~2`, via the scratch capture script) and after.
  - Pages: `/`, `/app` (Pune) and `/privacy`, at 320 and 1280 px.
  - Check:
    - `document.fonts.check('16px Inter')` is true, and the network panel shows the woff2 loading from `localhost`;
    - "NO₂" still renders in the pollutant table;
    - there is no sideways scroll, including with the 70-character place name;
    - the computed `transform` on an active button is `matrix(0.97, …)` with motion allowed, and `none` under reduced motion.
- [ ] **Step 3: Docs.**
  - `DESIGN.md` §3 gains the `--color-elevated` row; §4 notes that Inter is self-hosted (OFL, `client/public/fonts/OFL.txt`); §9 records the press feedback.
  - Add a CHANGELOG line.
  - Commit, `docs: design system base`. Don't push.
