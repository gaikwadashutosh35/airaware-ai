# Assistant Redesign, Phase 8: Guide Library, My Home and Better Habits, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** My Home and Better Habits become real pages. They show today's personal cards first, then a reviewed library of general guide cards with cited sources (decision G1 A), served by a new `GET /api/v1/recommendations/guides` endpoint.

**Architecture:**
- **The library is server data.** It lives in `server/src/services/recommendations/guides.ts`, next to `rules.ts`. Its sources join the existing `SOURCE_REFERENCES` registry, so there is one registry. Its wording is fixed by the library spec (DATA_GOVERNANCE §8), which the owner reviews with this plan.
- **Plans stay unchanged** (spec §15.4). No rule, plan, AI input or saved plan changes. Plans list only the sources they cite, so a larger registry doesn't touch them.
- **The endpoint** returns one topic's groups of cards, their sources and the safety note. It calls no AI, so it sits outside the plan route's 10-a-minute limiter. It is cached by the browser for an hour, so a page revisit doesn't fetch again.
- **The shell shares today's plan.** `DailyPlanSection` reports its plan up, and My Home shows that plan's indoor cards under "Today, for your home". The plan also builds while My Home is open, not only Today.

**Tech stack:** Express 5 + Zod 4; React 19, Tailwind v4; Vitest + Testing Library + Supertest; Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md` §7.5, §7.6, §9.3, §13 and §15 (G1). The card wording and sources: `docs/superpowers/specs/2026-11-20-guide-library.md`.

## Global constraints

**Copy, exact:**
- **My Home:** H1 "My Home". Sections "Today, for your home" and "Ways to improve indoor air". Groups, in order: "Cooking and smoke", "Ventilation", "Dust and cleaning", "Indoor habits", "Filtration", "Near a busy road".
- **Better Habits:** H1 "Better Habits". Groups, in order: "Daily commuting and vehicle idling", "Waste", "Cooking", "Energy use".
- **Every card on both pages:** its disclosure reads "Why it matters" (spec §7.5.3).
- **States:** loading "Loading guides"; error card "We couldn't load the guides" with "Try again".
- **Safety note** at the foot of both pages, from the server, word for word: "General information only, not medical advice. Follow local public-health advisories."

**Data rules:**
- Guide cards are `general_suggestion`: their "Based on" reads "general guidance". They never cite the forecast, never use a personal reason ("You said…"), and never carry a pollutant value.
- Every guide card cites at least one source from the library spec, with a URL that was opened and checked.
- The card text is the library spec's, word for word.

**Never shown:** "safe", "healthy", "clean air", "good/bad air", any AQI, any emission-savings figure. A setting such as "24 °C" is not a savings figure.

**Process:** test-first; no push. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## My calls (for your review)

1. **A separate file, one registry.** The library goes in `guides.ts`, not inside `rules.ts`, so the Phase 4 rules stay exactly as reviewed. Its sources go into the shared `SOURCE_REFERENCES`.
2. **Personal cards first, no repeats.** A guide card can name the rule it generalises (`personalRuleId`). When today's plan shows that rule, My Home hides the guide card, so the same advice never appears twice.
3. **The plan also builds on My Home.** Otherwise someone who opens My Home first sees no "Today, for your home". It is still once per place per hour (D3).
4. **Outdoor and family cards are written now but served in Phase 7.** The library is reviewed once (G1); the endpoint takes `topic=home|habits` only, as §9.3 says. Phase 7's plan adds the Ask topics.
5. **Browser caching instead of more shell state.** My Home and Better Habits fetch their guides when shown. The endpoint sends `Cache-Control: public, max-age=3600`, so a revisit is answered by the browser cache.
6. **"Near a busy road" shows only if you answered yes,** using the answer on screen, saved or not.
7. **Better Habits shows the guide cards only,** as spec §7.6 lists them. G1's "your own cards first" is met on Today and My Home; today's personal swap cards ("Combine trips…", "Don't burn…") stay on Today. Cost if wrong: one more "Today, for your habits" section, built like My Home's.

## Review focus

1. **The same advice twice.** Expected: a guide card whose rule is in today's plan is hidden on My Home. Task 4 test: `a personal card hides its general twin`.
2. **No answers, a day within the limits.** Expected: My Home and Better Habits still show every general group, and "Today, for your home" is hidden when the plan has no indoor cards. Task 4 test: `without a plan, only the guides show`.
3. **The guides endpoint fails.** Expected: an error card with "Try again"; "Today, for your home" still shows. Task 4 test: `a guides error keeps today's cards`.
4. **Rate limits.** Expected: guides requests never count against the 10-a-minute plan limit. Task 2 test: `guides are not rate-limited with plans`.
5. **Wording drift.** Expected: banned words and savings figures never appear in a guide card, and every source resolves. Task 1 tests: `no guide card uses banned words or a savings figure` and `every guide card cites a known source`.

---

### Task 1: The guide library

**Files:**
- Create: `server/src/services/recommendations/guides.ts` and `guides.test.ts`.
- Modify: `shared/contracts.ts` (`SourceReferenceId` gains the library's source ids; new types below), `server/src/services/recommendations/rules.ts` (`SOURCE_REFERENCES` gains their names and URLs).

**Interfaces (produces):**
- `shared/contracts.ts`:
  - `export type GuideTopic = 'home' | 'habits';`
  - `export interface GuideCard extends RecommendationCandidate { personalRuleId?: string }`
  - `export interface GuideGroup { id: string; heading: string; cards: GuideCard[] }`
  - `export interface GuideSet { topic: GuideTopic; groups: GuideGroup[]; sources: DailyPlan['sources']; safetyNote: string }`
- `guides.ts`: `export function guideSet(topic: GuideTopic): GuideSet`. Card ids start with `guide.`, priority is `medium`, and `inputsUsed` is empty. Groups and cards are in the library spec's order. `sources` lists only the cited ones, as `plan.ts` does. `safetyNote` is the constant `plan.ts` uses (export it from there).
- The outdoor and family cards are exported as `ASK_GUIDES` for Phase 7, unused by the endpoint.

- [ ] **Step 1: Write the failing tests:**
  - `home groups come in order` and `habits groups come in order` (the headings above);
  - `every guide card cites a known source` (each card has ≥1 `sourceIds`, each in `SOURCE_REFERENCES`);
  - `cards are general guidance` (`evidenceType` 'general_suggestion', empty `inputsUsed`, no "You said");
  - `no guide card uses banned words or a savings figure` (title, text, reason and caveat never match `/\bsafe|healthy|clean air|\bAQI\b|%|per cent|\bkg\b|tonne/i`; a setting such as "24 °C" is allowed);
  - `guide ids are unique, start with guide. and never clash with rule ids`;
  - `the cleaner-fuel card is shared by both topics`;
  - `personalRuleId names a real rule`;
  - `sources list only cited ones`.
- [ ] **Step 2:** Run `npm test -w server`. Expected: FAIL.
- [ ] **Step 3: Implement** the cards and sources exactly as in the library spec.
- [ ] **Step 4:** Run `npm test -w server`. Expected: PASS. Also `npm test -w client` (the shared type change).
- [ ] **Step 5: Commit**, `feat(api): guide library`.

### Task 2: `GET /api/v1/recommendations/guides`

**Files:**
- Create: `server/src/routes/guides.ts` and `guides.test.ts`.
- Modify: `server/src/app.ts` (mounted at `/api/v1/recommendations/guides`, before the recommendations router and its limiter), `client/src/services/api.ts` (`getGuides(topic: GuideTopic, signal?: AbortSignal): Promise<GuideSet>`), `API.md`.

- [ ] **Step 1: Write the failing tests:**
  - `returns the home guides` (200, `{ data: GuideSet }`, groups in order);
  - `rejects an unknown or missing topic` (400, the existing error envelope);
  - `lets the browser cache it for an hour` (`Cache-Control: public, max-age=3600`);
  - `guides are not rate-limited with plans` (11 requests in a row all return 200);
  - client: `getGuides asks for the topic`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** The query is validated with `z.strictObject({ topic: z.enum(['home', 'habits']) })` through the existing `parseQuery`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(api): guides endpoint`.

### Task 3: The shell shares today's plan

**Files:** modify `DailyPlanSection.tsx`, `AppShell.tsx` and their tests.

**Interfaces:**
- `DailyPlanSection` gains `onPlan: (plan: DailyPlan | null) => void`. It reports `null` on mount and the plan whenever a build or save finishes.
- `AppShell` keeps `todayPlan: DailyPlan | null` and passes it to My Home (Task 4). `active` becomes `(page === 'today' || page === 'home') && loaded`.

- [ ] **Step 1: Write the failing tests:**
  - `reports each finished plan, and null for a new place`;
  - `My Home builds the plan once` (open `/app/home` with a place: 1 POST; then Today: still 1).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): the shell shares today's plan`.

### Task 4: My Home

**Files:**
- Create: `client/src/pages/MyHome.tsx`, `MyHome.test.tsx`, and `client/src/features/guides/GuideGroups.tsx` with its test (the grouped cards, shared with Better Habits).
- Modify: `AppShell.tsx` (`/app/home` renders `MyHome`), `AppShell.test.tsx`.

**Interfaces:**
- `MyHome({ plan, context }: { plan: DailyPlan | null; context: HouseholdContext })`. It fetches `getGuides('home')` with `useRequest`.
- `GuideGroups({ set, level, hide }: { set: GuideSet; level: 2 | 3; hide?: (card: GuideCard) => boolean })`: one section per group with its heading at `level` (3 under My Home's "Ways to improve indoor air", 2 on Better Habits), each card one level below via `PlanCard` with `whyLabel="Why it matters"`, then the safety note. Groups left empty by `hide` are left out.
- "Today, for your home" cards use `PlanCard level={3}` under their `h2`.

- [ ] **Step 1: Write the failing tests:**
  - `today's indoor cards come first, with Why it matters`;
  - `without a plan, only the guides show`;
  - `a personal card hides its general twin`;
  - `Near a busy road shows only after a yes`;
  - `a guides error keeps today's cards` (the error card, "Try again" refetches);
  - `shows the loading state`;
  - `passes axe`;
  - shell: `/app/home shows My Home, not the placeholder`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): My Home`.

### Task 5: Better Habits

**Files:** create `client/src/pages/BetterHabits.tsx` and its test; modify `AppShell.tsx` and its test.

**Interfaces:** `BetterHabits()` fetches `getGuides('habits')` and renders `GuideGroups`.

- [ ] **Step 1: Write the failing tests:**
  - `shows the four habit groups in order, with Why it matters`;
  - `no card states a savings figure` (no %, "per cent", kg or tonnes in the rendered cards);
  - `an error offers Try again`;
  - `passes axe`;
  - shell: `/app/habits shows Better Habits`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(app): Better Habits`.

### Task 6: Proof

- [ ] **Step 1: The gate.** `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run e2e`. Add `/app/home` and `/app/habits` to the real-browser axe checks in `e2e/pages.spec.ts` (the guides come from the real server; no external service).
- [ ] **Step 2: See it.** Both pages at 320, 768 and 1280 px: loading, error, with a plan and without; no sideways scroll; Tab order follows the groups; each source link opens.
- [ ] **Step 3: Docs.** USER_GUIDE §5–6 (My Home and Better Habits), DESIGN.md §8 (`GuideGroups`, `MyHome`, `BetterHabits`), API.md, CHANGELOG. Commit, `docs: guides`. Don't push.
