# Landing Chapters 3–6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the four landing chapters (plan, indoor, swaps, "see why"), each showing a real plan card from the rules.

**Architecture:**
- The example cards are data in `client/src/pages/landingExamples.ts`, generated once from the server's `buildCandidates`. A server test keeps them identical to the rules.
- `Landing.tsx` renders them with the app's own `PlanCard` on a light panel.

**Tech Stack:** React 19, Tailwind v4 (DESIGN.md tokens), Vitest + axe-core.

**Spec:** `docs/superpowers/specs/2026-11-19-landing-chapters-design.md`

## Global Constraints

- **No new dependency.** No new screenshot. No API call from the landing page. No AI text on the landing page.
- **Chapter headings, text and captions:** copied verbatim from the spec's table.
- **Captions:**
  - Chapters 3–5: "Example from our rules."
  - Chapter 6: "Example from our rules, for a day when the forecast is above India's 24-hour limit."
- **Number test:** the "invents no numbers" test gains only `24-hour` and `18 November 2009`.
- **Hallmark floor:** no card inside a card, no eyebrows, tokens only.
- **Gate:** after every task, run `npx prettier --write <files>; set -o pipefail; npm run typecheck; npm run lint; npm run format:check; npm test`. It must be clean.
- **Commits:** on `main`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Keyboard focus inside the light panel on the dark page.** Expected: a ring with at least 3:1 contrast on the light panel. Pinned by the Task 2 browser check, because jsdom can't compute colours and axe doesn't check focus rings.
2. **The chapter-6 card read out of context.** Expected: its caption says it is for a day above the limit, so no one reads it as today's air. Pinned by the Task 2 caption test.
3. **Narrow phones (320 px).** Expected: chapters stack text-then-card with no horizontal scroll. Pinned by the Task 2 browser check.
4. **Rule text edited later.** Expected: the drift test fails. Pinned by Task 1.
5. **Heading order** (`h2` chapter, then the `h3` card title). Expected: no axe `heading-order` violation. Pinned by the Task 2 axe test.

---

### Task 1: Example cards and the drift test

**Files:**
- Modify: `client/src/features/daily-plan/PlanCard.tsx` (`level: 3 | 4 | 5`; new `openWhy?: boolean` → `<details open={openWhy}>`), `client/src/features/daily-plan/PlanView.test.tsx`
- Create: `client/src/pages/landingExamples.ts`, `server/src/services/recommendations/landingExamples.test.ts`

**Interfaces:**
- Produces:

```ts
export interface LandingExample {
  heading: string;
  text: string;
  caption: string;
  candidate: RecommendationCandidate;
  openWhy: boolean;
}
export const LANDING_SOURCES: DailyPlan['sources']; // open-meteo, cpcb-naaqs-2009, as in SOURCE_REFERENCES
export const LANDING_EXAMPLES: readonly LandingExample[]; // chapters 3, 4, 5, 6 in order
```

- **Inputs used to generate (and test) the candidates:**
  - household: `{ routine: { outdoorExercise: true, commuteMode: 'car' }, home: { kitchenExhaust: true, airPurifier: true } }`;
  - `exercise.check-conditions` from a `not_elevated` assessment;
  - the other three from an `elevated` one.
  - The test builds both assessments inline.

- [ ] **Step 1: Write the failing tests**

```ts
// server/src/services/recommendations/landingExamples.test.ts
it('the landing examples are real rule output, word for word', () => {
  // for each example: buildCandidates(HOUSEHOLD, air) contains a candidate deep-equal to example.candidate
});
it('the landing sources are the rules\' sources', () => {
  // LANDING_SOURCES equals the SOURCE_REFERENCES entries, with their ids
});
it('shows the chapters in order with chapter 6 open', () => {
  // ids: exercise.check-conditions, indoor.cooking-exhaust, swap.fewer-car-trips, indoor.purifier; openWhy only on the last
});
// PlanView.test.tsx (PlanCard)
it('can start with "Why?" open and use a level-3 title', ...); // render <PlanCard level={3} openWhy …/> → h3 title; details.open true
```

- [ ] **Step 2: Run them and watch them fail.** Run `npm test -w server -- src/services/recommendations/landingExamples.test.ts` and `npm test -w client -- src/features/daily-plan/PlanView.test.tsx`. Expected: FAIL, the module is not found and the props are missing.
- [ ] **Step 3: Implement.**
  - Generate the candidates with a scratch script that imports `buildCandidates` (not committed), and paste them unchanged into `landingExamples.ts`.
  - Add the headings, text and captions from the spec.
  - Add the `PlanCard` props.
- [ ] **Step 4: Run and watch pass.** Same commands. Expected: PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat: real rule examples for the landing chapters`.

### Task 2: The four landing chapters

**Files:**
- Modify: `client/src/pages/Landing.tsx`, `client/src/pages/Landing.test.tsx`, `client/src/index.css` (focus rule), `CHANGELOG.md`, `docs/IMPLEMENTATION_PLAN.md` (Phase 7 "as built": the landing chapters are done)

**Interfaces:**
- Consumes: `LANDING_EXAMPLES`, `LANDING_SOURCES` and `PlanCard` (`level={3}`, `openWhy`) from Task 1.

**Placement:** the chapters go after "Where every number comes from" and before the limits band.
- Each chapter is a `<section aria-labelledby>` with an `h2` and a `<p>`.
- Its `<figure>` holds a `bg-surface-light text-text-dark` panel containing the `PlanCard` (no top rule on the card, since the panel is its frame).
- Under the panel, a `<figcaption>` in muted text.
- Wide screens show two columns, alternating sides; narrow screens stack text, then card.
- CSS in `@layer base`: `.on-dark .on-light :focus-visible { outline-color: var(--color-focus); }`, with `on-light` on the panel.

- [ ] **Step 1: Write the failing tests** (`Landing.test.tsx`)

```ts
it('tells the plan story in four chapters, in order', ...);
// h2 texts: ['Where every number comes from', 'A plan for your day', 'Cleaner air at home',
//            'Small swaps, honestly', 'See why, every time', 'Your city, the next two days']
it('shows a real rule card in each chapter, labelled as an example', ...);
// for each LANDING_EXAMPLES[i]: its section has a figure whose figcaption is example.caption
// and an h3 named example.candidate.title
it('opens "Why?" on the see-why example, with its sources', ...);
// chapter 6 details is open; shows the reason, and links named 'Open-Meteo Air Quality API' and
// 'National Ambient Air Quality Standards (CPCB, 18 November 2009)'
// REAL_FIGURES gains '24-hour' and '18 November 2009'; 'invents no numbers' and axe keep passing
```

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/pages/Landing.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** as described. Add a CHANGELOG line and an IMPLEMENTATION_PLAN Phase 7 line ("Landing chapters 3–6: done, real rule cards").
- [ ] **Step 4: Run and watch pass.** Run `npm test -w client`. Expected: all PASS.
- [ ] **Step 5: Check in the browser** at 320 px and 1280 px (Vite dev server, `/`).
  - No horizontal scroll at 320 px.
  - Tab to a "Why?" and a source link in a panel: the focus ring is the light-theme colour.
  - Each chapter reads text, then card.
- [ ] **Step 6: Gate and commit.** Message: `feat: landing chapters for the plan, indoor air, swaps and "see why"`.
