# Redesign Phase C: Readout States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The dashboard's loading, error, stale and no-place states get the Stitch card look and clearer words, with the same behaviour.

**Architecture:**
- `components/States.tsx` gets a readout-shaped skeleton and an error card with a title.
- `AirReadout` gets a stale banner.
- `Dashboard` gets a no-place card with a "Search for a place" button that focuses the search.

**Tech Stack:** React 19, Tailwind v4, Vitest and Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-stitch-redesign-design.md`, Phase C. It was approved by the owner on 2026-11-19, who said overnight "build everything … do little as per recommendation".

## Global Constraints

- **Kept exactly** (the e2e and existing tests rely on them):
  - "Forecast provider unavailable.", "Could not reach AirAware. Check your connection." and "Too many requests. Try again in a minute.";
  - the button "Try again";
  - `role="alert"` on errors;
  - `aria-busy` and the `sr-only` "Loading forecast".
- **The error card** shows no internal details: no status codes, hosts or request ids.
- **The skeleton** respects reduced motion (`motion-reduce:animate-none`).
- **Styling:** tokens only. No new dependency.
- **Workflow:** follow `.claude/skills/airaware-ui/SKILL.md`. No push and no deploy.
- **Git:** one branch `main`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## My calls (overnight)

1. **Stale wording:** the stale sentence starts with "Not current:", reading "Not current: retrieved more than an hour ago. Reload for the latest forecast." The spec asks that its words say it is not current. This is a deliberate text change, so the tests that quote it are updated.
2. **The no-place card** adds a "Search for a place" button that focuses the search box. "Use my location" is already beside the search, so no second copy is added.
3. **The error card title** is "We couldn't load the forecast". It is passed by the dashboard. Other `ErrorState` uses keep no title.

## Review Focus

1. **Retry after an error.** Expected: "Try again" still refetches, and focus doesn't get lost. The existing Dashboard test covers the refetch. Task 1 test: `the error card keeps its message and retry`.
2. **The skeleton under reduced motion.** Expected: no pulse. Task 1 test: `the skeleton pulses only when motion is welcome`.
3. **The skeleton as content.** Expected: screen readers hear only "Loading forecast". Task 1 test: `the skeleton is hidden except its label`.
4. **A stale view.** Expected: the banner is the first thing under the heading, and its words say "Not current". Task 2 test: `the stale banner says not current`.
5. **The no-place button.** Expected: it focuses the search box, and the card shows only when no place is chosen. Task 2 test: `the no-place card focuses the search`.

---

### Task 1: Skeleton and error cards

**Files:**
- Modify: `client/src/components/States.tsx`, `client/src/pages/Dashboard.tsx` (passes the error title)
- Create: `client/src/components/States.test.tsx`

**Interfaces:**
- Produces:
  - `Loading({ label })`, with the same signature;
  - `ErrorState({ error, onRetry, fallback?, title? })`, where `title?: string` is new.

- [ ] **Step 1: Write the failing tests.**
  - `the skeleton is hidden except its label`: `aria-busy="true"`, and the only text is the `sr-only` label. Its visual blocks are `aria-hidden`, including a band block with `data-part="skeleton-band"`.
  - `the skeleton pulses only when motion is welcome`: every element with `animate-pulse` also has `motion-reduce:animate-none`.
  - `the error card keeps its message and retry`: given `title="We couldn't load the forecast"` and a `PROVIDER_ERROR`, it shows an `h3` with that title, the text "Forecast provider unavailable." and a "Try again" button that calls `onRetry`, all with `role="alert"`, and nothing matching `/\b(5\d\d|PROVIDER_ERROR|http)\b/i`.
  - `the error card works without a title`: there is no heading, and the message and button are still shown.
- [ ] **Step 2:** Run `npx vitest run src/components/States.test.tsx` (in `client/`). Expected: FAIL (the band, the title).
- [ ] **Step 3: Implement.**
  - **Skeleton:** a card (`rounded-lg border border-rule overflow-hidden`) with a top band block about 128 px tall, then three line blocks, all `aria-hidden`, plus the `sr-only` label.
  - **Error card:** `rounded-lg border border-rule p-5 sm:p-6`, with an optional `h3` title, the message, then "Try again".
  - **Dashboard:** passes the title.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(ui): skeleton and error cards`.

### Task 2: Stale banner and no-place card

**Files:**
- Modify: `client/src/features/air-quality/AirReadout.tsx`, `client/src/pages/Dashboard.tsx`
- Test: `AirReadout.test.tsx`, `Dashboard.test.tsx`

- [ ] **Step 1: Write the failing tests.**
  - `AirReadout.test.tsx`, `the stale banner says not current`: with `stale`, the text "Not current: retrieved more than an hour ago. Reload for the latest forecast." sits in an element with `data-part="stale-banner"`, which precedes the figure. Update the old stale tests to the new text.
  - `Dashboard.test.tsx`, `the no-place card focuses the search`: with no place, the text "Search for a place or use your location to see its air-quality forecast." shows, and clicking "Search for a place" focuses the combobox. Update the existing stale-text constant in this file.
- [ ] **Step 2:** Run `npx vitest run src/features/air-quality/AirReadout.test.tsx src/pages/Dashboard.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **Stale banner:** `rounded-md border border-warning bg-warning/15 px-3 py-2`, with a small inline clock icon (`aria-hidden`) and the text.
  - **No-place card:** `rounded-lg border border-rule p-6`, with an inline compass icon, the existing sentence, and a `min-h-11` button "Search for a place" that runs `searchRef.current?.focus()`.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(ui): stale banner and no-place card`.

### Task 3: Proof

- [ ] **Step 1: The gate:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run e2e`.
- [ ] **Step 2: See it.** Use a scratch Playwright script with `page.route` to force each state: a delayed forecast (loading), a 502 (error), an old `retrievedAt` (stale), and no place. Screenshot each at 320 px and 1280 px.
- [ ] **Step 3: Commit** a CHANGELOG line, `docs: readout states`. Don't push.
