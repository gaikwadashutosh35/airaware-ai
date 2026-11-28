# 14 · Implementation roadmap

Written 28 Nov 2026. This is a read-only proposal: no code, config, package or existing doc was changed while writing it.

**Labels.** **OBSERVED** means I saw it in the code, a doc or a rendered page; the source is cited. **RECOMMENDED** means a proposal. "Per doc NN" means a teammate's finding that I did not re-open myself. **Default:** everything in §2–§5 (decisions, phases, effort, sequence) is RECOMMENDED unless it is tagged OBSERVED or carries a citation.

**What this plan builds on.** It takes **Direction A ("Calm editorial") plus selected ideas from B**, which doc 05 recommends (05 §7–§8). It does this without a rebuild, a new architecture, a new package, a new API or removing any feature. The five destinations stay: Today, Ask AirAware, My Home, Better Habits and My Profile (OBSERVED, `client/src/components/AppNav.tsx`).

**ID namespaces (added in the critic pass; several IDs repeat across docs):**

| Prefix in this doc | Means | Not to be confused with |
|---|---|---|
| R0–R9 | This doc's build phases | 02's recommendations R1–R9, cited here as "02-R4" and so on |
| D1–D15 | This doc's open owner decisions | OWNER_DECISIONS rows D1–D7 and J26's D1–D7 |
| G1–G10 | 05 §8 "ideas from B", cited as "05-G3" | OWNER_DECISIONS G1–G7 (Landing) and acceptance gates G-01…G-06 |
| P1–P9 | Doc 11's Daily Plan rows | 10's cityscape proposals P1–P9 (cited as "10 P1") and the built phases P0–P11 |
| H1–H5, I1–I5 (doc 11) | Doc 11 feature rows | OWNER_DECISIONS H1–H5 and I1–I5 |
| O-1…O-10 / O1…O7 | Questions in 06 / 12 | — |

**What to check each phase against.** The per-phase acceptance checks are in `15_ACCEPTANCE_AND_QA_CHECKLIST.md`. That doc reuses the existing IDs in `REDESIGN_ACCEPTANCE_CRITERIA.md` (G-, DI-, PR-, AC-, PF-, CP-, CS-).

---

## 1. Ground rules for every phase

| # | Rule | Source |
|---|---|---|
| 1 | Each phase is a small, reviewable change. The owner approves it in writing before the next phase starts. Nothing is committed, pushed or deployed without the owner's word. | Brief; OWNER_DECISIONS I5 (one push, on the owner's word) |
| 2 | Before any phase starts, tell the owner the plan and what you understood. Ask about anything unclear and do not guess. Make the smallest change, with no extra abstractions. Write a failing test first where possible. Run the existing tests. | The owner's working rules for this redesign |
| 3 | No new dependency. The only runtime libraries are `react`, `react-dom`, `lucide-react` and `@supabase/supabase-js`. Playwright and axe-core are already dev dependencies. | OBSERVED `client/package.json:14-19`, root `package.json` devDependencies; G-04 |
| 4 | No API or schema change in any phase below. Rows that need one are listed under "Later" (§4). | Brief |
| 5 | Data integrity rules hold in every phase: model forecast labels, "Not current", the 24-hour check against India's limits, no AQI, no inferring pollution from weather, outdoor never shown as indoor, no medical claims, no invented savings. | AGENTS.md §5-6, `.claude/rules/air-data.md` |
| 6 | New user-facing strings need the owner's OK before they are built. | CP-04 |
| 7 | Phase names here are **R0–R9**. They are deliberately different from the earlier P0–P11, which are already built (STAGE5_REPORT.md:3-21, per doc 03 §4). Each R phase maps to a phase letter (A–F) in doc 03, so its skill set comes straight from 03 §5.2. | RECOMMENDED |

### 1.1 Baseline facts that affect every gate

OBSERVED, from teammates' digests and docs, except where a line is marked RECOMMENDED:

- **Live and local differ.** Local `main` is 25 commits ahead of `origin/main` (854f2a4). The J26 work, where Claude Haiku answers typed Ask questions, exists only locally. The live Ask page still shows the pre-J26 intro (`audit/screenshots/redesign-2026-11-28/current/ask-1440.jpg`; per docs 11 and 12). Every "before" number must therefore say whether it is **live** or **local**. Pushing is its own owner gate (I5).
- **The script-size gate is already failing.** PF-03 sets a limit of 155 kB transferred or less. Live JS is 157,970 B transferred (per doc 09) and local gzip -9 is 164,692 B (per doc 08). R0 re-measures this before any phase is gated on size.
- **Two gates conflict with Direction A.**
  - DI-04 says the default Today view shows no numbers, but A's verdict ledger shows the PM2.5 and PM10 averages.
  - G-03 allows no new colour token, but A adds `--primary-ink` and a danger ink.
  - Each needs an owner ruling before the phase that depends on it (decisions D3 and D4 in §2).
- **The backdrop blur conflicts with old criteria.** J22 approved the see-through `card-surface`, which conflicts with the older criteria CS-08 and DESIGN_SYSTEM_PROPOSAL §11 (per the reconciliation digest). RECOMMENDED: keep J22 and treat CS-08 as superseded, once the owner confirms (D10).
- **Deadline.** OBSERVED in `docs/UI_SKILLS_AND_REDESIGN.md` §4 ("Timing (proposal)", lines 58-64):
  - the deadline is 29 Nov and there are 3 attempts;
  - that doc proposes submitting attempt 1 on the verified commit `257352e` and doing the redesign for attempt 2.

  Today is 28 Nov, so one day is left. RECOMMENDED reading:
  - **No redesign phase reaches the live site by 29 Nov** unless the owner also approves a push (D14), and that push carries all 25 local commits, J26 included.
  - At most, R1 could be built and verified locally in that day, if it starts without waiting for the whole of R0. It needs only D11, or a report saying modern-web-guidance was not checked.
  - Everything else is attempt-2 work.

---

## 2. Owner decisions needed (collected, not decided here)

None of these are decided in this doc. Each phase lists the decisions it waits on.

| ID | Decision | From | Blocks |
|---|---|---|---|
| D1 | Base direction: A plus ideas from B (recommended), B, or neither | 05 §9.1 | R3–R8 |
| D2 | AQI wording. The brief allows only "We don't calculate an AQI". `e2e/copy.spec.ts:20` and A7 also allow "CPCB National AQI" (OBSERVED in copy.spec.ts). | 05 S11, 11 C1 | R2 (L1) |
| D3 | Numbers in the default Today view. Either keep DI-04 (ledger values stay behind a disclosure) or amend it (the ledger shows the 24-hour averages with units, limits and the label "24-hour model forecast average"). | 11 C4, this doc | R3 |
| D4 | New tokens `--primary-ink` #0b6b62 and a danger ink (#a3262e in the A prototype). The existing `--color-danger` #f06b72 is about 2.8:1 on `surface-light` by my calculation, which fails as text and as a 3:1 outline. | 05 §9.7; OBSERVED `client/src/index.css:37` | R2 (M2), R3 |
| D5 | The within caveat: keep "…does not mean the air is clean or free of risk" or shorten it to "…free of risk". Change server and client together. | 05 S7, 11 C3 (`today.ts:32`) | R2 |
| D6 | Starter wording that invites a yes/no ("Can I go for a morning walk today?", "Is it a good idea to open my windows?") | 11 A3, 12 | R2 |
| D7 | H5 cityscape band. Keep it as shipped, or take A's lower, quieter band (min(14rem,28vh) / min(20rem,34vh); opacities .30/.32/.72). **Critic note:** H5 was the owner asking for a bigger city, and doc 10 keeps H5 and deepens the tones (10 P1). A's quieter band runs the opposite way, so R8 cannot do both. Team recommendation: keep H5, do 10 P1/P2. | 05 §9.2, 10 §3 | R8 |
| D8 | The limit-line picture in the ledger: keep it decorative and aria-hidden, or drop it because it might read as a gauge | 05 S13 | R3 |
| D9 | Uppercase journey eyebrows (Understand · Guidance · Ask · Take action · Learn) as a new type role | 05 §9.8 | R3 |
| D10 | Confirm that J22's backdrop blur supersedes CS-08 and DESIGN_SYSTEM_PROPOSAL §11 | reconciliation digest | R3 onward (which criteria apply) |
| D11 | Yes to running `modern-web-guidance` (`npx -y modern-web-guidance@latest`; the package is not in `node_modules`) in each code phase | 03 §3, §5.1 | Every code phase (see §2.1) |
| D12 | New copy lists: direction-a §9/§11, direction-b §9 (as far as B ideas are taken), 05-G6, 05-G9, N3 "Next:" links, 02-R4 "Ask about this", and where 02-R7 "How AirAware answers" lives (06: `/privacy`; 12 §4: Ask welcome card; 11 L3: Landing) | 05 §9.9, 06 O-4 | R2–R7 (per string) |
| D13 | Remove the plan's 60svh inner scroller (owner ruling of 27 Nov kept it open in a box, DESIGN.md:88) | 06 O-3, 11 P1 | R4 |
| D14 | When to push local `main`, including J26, to production | I5 | R9; any live re-capture; anything reaching the live site before 29 Nov |
| D15 | Drop the Landing scroll-timeline `.reveal` (a working feature; it blanks full-page captures, but a real user effect is unverified, 11 L9; 09 E4 finds it compliant). Added in the critic pass | 05 §2.7, 09 E4, 11 L9 | R7 |

### 2.1 If `modern-web-guidance` is not approved

The `airaware-ui` gate rule requires `modern-web-guidance` before any HTML, CSS or client JS (OBSERVED in doc 03, citing `.claude/skills/airaware-ui/SKILL.md:15`).

If the owner does not approve the npx call for a phase, the phase report says **"Not checked against modern-web-guidance"**, and the owner decides whether the phase may still proceed. Never claim it ran.

---

## 3. Phases

**Effort figures are estimates.** Doc 05's designer estimate for Direction A as a whole is 9–12 engineer-days, including E2E and axe updates. The per-phase split below is my own estimate and has not been checked against a build. It adds up to about 10–16 days, more than doc 05's figure, because R0, R1, R2 and R9 are outside A's estimate.

**Files likely touched** are names that exist in `client/src` (OBSERVED by listing). Server files are named only where copy is owned there.

### R0 · Decisions and re-baseline (doc 03 phase A/B; no app change)

- **Goal.** Turn §2 into written rulings and get honest "before" numbers.
- **Scope.**
  1. The owner rules on D1–D15, or explicitly defers them.
  2. Re-baseline **locally** with a copy of `docs/redesign/audit/evidence/capture.mjs` in local mode, written outside the repo's audit folder. Never re-run the Stage 0 script in place (REDESIGN_ACCEPTANCE_CRITERIA §0.2 "CAP").
     - Record CLS and LCP per page at all 5 viewports, script size (`npm run build -w client`; gzip), targets below 44 px, and overflow.
  3. Record the current test baseline.
     - Unit: doc 01's run on 28 Nov gave 446 server passed and 27 skipped, and 708 client passed.
     - e2e: not run since Stage 0. The last figure is 309 passed and 83 skipped on 24 Nov (G-06). Run the stubbed e2e once (doc 15 §1.2) so later phases have a current pass and skip count.
- **Files touched.** None in the app. New scratch output only.
- **Dependencies.** None.
- **Skills (03 §5.2, phase A).** `airaware-ui`, `emil-design-eng`, `break-ui` (catalog only).
- **Risks.**
  - Running the capture against production uses real API quota. Run it in local mode only; prod mode needs the owner's OK per run (CAP-PROD).
  - e2e needs the network plus `server/.env` and `client/.env` (OBSERVED `e2e/playwright.config.ts:4-7`). The agent must never open those files.
- **Effort.** 0.5 day, plus the owner's time.
- **Approval gate.** A written list of rulings. The baseline numbers are pasted into the R0 report. PF-03 is re-set against the measured value (proposal in doc 15 §3).

### R1 · Accessibility quick fixes (doc 03 phase C; no new decision needed)

The lowest risk and highest value: every item fixes a measured or recorded defect without new copy, new tokens or a layout change.

| Item | What | Evidence (OBSERVED) |
|---|---|---|
| L4, X2 | 44 px target for the Open-Meteo credit link on every page, using padding or a min-height. The text is unchanged. | 117×17 px at 390 (live capture `results.json`, per the capture digest) |
| A5 | 44 px targets for Edit, Open-Meteo.com and Privacy on Ask | 25×17, 100×15 and 42×15 px at 390 (same source) |
| A4 | A visible tooltip for Copy on keyboard focus and hover, using CSS only or the native `popover`. No library. | `title` only, `AskEntry.tsx:123-124` (per docs 08 and 11) |
| X3 | Place chip at 200 % text shows only icons | Open in STAGE5_REPORT.md:107 (OBSERVED) |
| C2 (doc 09) | Remove the `transition duration-150` utility from the two Landing CTAs so the shipped `.press` rule (120 ms) applies | OBSERVED `client/src/pages/Landing.tsx:53,65`; doc 09 live probe |
| SR-1 | `focus()` without `preventScroll` | STAGE5_REPORT.md:109 lists `AskBox.tsx`, `HelpChoices.tsx` and `Ask.tsx`. In the code today (OBSERVED by grep), `AskBox.tsx:52,96` and `HelpChoices.tsx:26` still lack it; `Ask.tsx:153` already passes `preventScroll: true`. |

- **Files likely touched.**
  - Source: `components/Attribution.tsx`, `pages/Ask.tsx`, `features/ask/AskEntry.tsx`, `components/PlaceChip.tsx`, `pages/Landing.tsx`, `features/today/AskBox.tsx`, `features/today/HelpChoices.tsx`.
  - Tests: `e2e/responsive.spec.ts` (add 390×844 to the target check), `e2e/keyboard.spec.ts`, and the matching `*.test.tsx` files.
- **Not in R1.**
  - M2 (danger button): it needs D4, because the existing `danger` token fails contrast on light.
  - L1, A3 and A6: they are copy changes under CP-04.
- **Dependencies.** None.
- **Skills.** `airaware-ui`, `modern-web-guidance` (D11), `mobile-native`.
- **Risks.**
  - Larger hit areas can shift the layout. CLS must not grow.
  - The tooltip must not hide the focus ring.
- **Effort.** 1–1.5 days.
- **Approval gate.** The doc 15 §2 common gates, plus the R1 rows in doc 15 §4. The owner reviews before and after screenshots at 390 and 1280.

### R2 · Copy and token rulings applied (doc 03 phase C)

- **Goal.** Ship only the strings and tokens the owner approved in R0.
- **Scope, each item only if ruled.**
  - **L1 (D2):** the Landing closing line.
  - **D5:** the within caveat. Change server `rules.ts` and client `today.ts` together.
  - **A3 (D6):** starter rewording.
  - **A6:** the medical reply also shows the existing topic chips. No new string, but it is a behaviour change, so it needs a yes.
  - **D4 tokens** added to `index.css` `@theme static`.
  - **M2:** the danger outline button, distinct from Cancel, using the new danger ink.
  - **05-G3, keep, not add:** the stale banner already has a reload action (OBSERVED: `StaleBanner onReload` at `TodayLead.tsx:53`, wired at `AppShell.tsx:442`). The A prototype omitted it (doc 05 §8); the build must not drop it.
- **Files likely touched.**
  - Source: `pages/Landing.tsx`, `features/today/today.ts`, `server/src/services/recommendations/rules.ts`, `features/ask/ask.ts`, `features/ask/AskEntry.tsx`, `index.css`, `features/daily-plan/HouseholdPreferencesForm.tsx`, `features/daily-plan/SavedPlansList.tsx`, `features/today/TodayLead.tsx`.
  - Tests: `e2e/copy.spec.ts` (only if D2 changes the allow-list), `features/ask/ask.test.ts`, `Landing.test.tsx`, and the server `rules.test.ts`.
  - Docs: those that quote changed strings (CP-07): API.md, USER_GUIDE.md, README.md, PRIVACY.md, DESIGN.md. Edited only in this build phase, never during the audit.
- **Dependencies.** None.
- **Skills.** `airaware-ui`, `modern-web-guidance`, `break-ui` (long strings at 320 and at 200 % text).
- **Risks.**
  - Strings are pinned by unit tests, e2e and the AI BANNED list. A half-done swap fails CI.
  - Server and client copy can drift apart.
- **Effort.** 0.5–1 day.
- **Approval gate.** CP-01 to CP-05 and CP-07, plus G-03 updated to the approved token count. Before and after string list in the report.

### R3 · Today: first screen and verdict ledger (doc 03 phase C; Direction A core)

- **Goal.** Answer place, verdict, top recommendation and next step on the first screen with fewer look-alike boxes (11 T1). Today runs about 3,700 px on a phone (live capture).
- **Scope.**
  - **T1:** first-screen order. The weather table, fire hotspots, help tiles, "Make it personal" and the Ask box move to a calmer second tier. Nothing is removed.
  - **T2, extended by 05's ledger:** verdict ledger inside the verdict panel, per D3 and D8. (11 T2 itself is a stronger visual state with existing tokens and no numbers; the ledger's numbers come from Direction A, doc 05 §2.6.)
    - It shows the PM2.5 and PM10 24-hour model forecast averages in µg/m³, India's limits of 60 and 100, and the unchanged level tags "Within the limit", "Above the limit" and "No data".
    - Values come from the existing `AirAssessment.checks`. Nothing is computed in the client.
  - **No-data requirement (05-G2).** In the unknown state, hide the readings and the bars and show one plain line. The A prototype got this wrong (05 S1: hard-coded tag at `prototypes/direction-a.html:448`). This is a prototype bug, not an app bug, written here as a build requirement.
  - **T4:** next-step row reusing `HelpChoices`.
  - **Journey eyebrows (D9).** `.sheet` rule: below the title block, all text sits on a panel or the sheet (05 §8, "From A").
- **Files likely touched.**
  - Source: `pages/AppShell.tsx` (Today is inline at :406-567, per doc 01), `features/today/TodayLead.tsx`, `features/air-quality/AirReadout.tsx`, `features/today/HelpChoices.tsx`, `features/today/helpChoices.ts`, `features/today/WeatherCompare.tsx`, `features/today/FireHotspots.tsx`, `index.css`.
  - Tests: `TodayLead.test.tsx`, `AppShell.test.tsx`, `e2e/firstscreen.spec.ts`, `e2e/responsive.spec.ts`, `e2e/backdrop.spec.ts`.
- **Dependencies.** None.
- **Skills.** `airaware-ui`, `modern-web-guidance`, `mobile-native`. Swap to `dataviz` only for the ledger bar.
- **Risks.**
  - Numbers on the first screen could read as an index. Mitigations:
    - the label "24-hour model forecast average";
    - "We don't calculate an AQI" nearby;
    - no colour scale.
  - Muted text directly on the sky fails contrast. `text-dark-muted` on the within sky is 4.20:1 (per doc 05), so the title block uses `text-dark` only.
  - AppShell is a 604-line component (per doc 01), so there is regression risk. Keep the diff to placement; do not refactor.
- **Effort.** 2–3 days.
- **Approval gate.** DI-01 to DI-07 (with DI-04 as ruled in D3), AC-10, PF-01, and the R3 rows in doc 15 §4. Screenshots of all four states (within, above, unknown, stale) at 390 and 1440.

### R4 · Daily plan on Today (doc 03 phase C)

- **Goal.** Make GUIDANCE → TAKE ACTION visible without a nested scroller.
- **Scope.**
  - **P1:** remove the `max-h-[60svh]` inner scroller (OBSERVED `client/src/features/daily-plan/DailyPlanSection.tsx:325`) per D13. The full day shows through disclosure only.
  - **05-G1:** a "Your day" strip. Only AI plans have periods (per doc 06: `contracts.ts:223`, `plan.ts:28-32`), so a rules plan shows the recommendation alone and draws no empty strip.
- **Not in R4.** The N1 DayTimeline with model values per band (06 §4.3). It is a client-only build, but it touches DI-04 again (11 C4), so it is listed under "Later" (§4).
- **Files likely touched.** `features/daily-plan/DailyPlanSection.tsx`, `PlanView.tsx`, `PlanCard.tsx`, `planDisplay.ts`, and their tests, plus `e2e/firstscreen.spec.ts`.
- **Dependencies.** None.
- **Skills.** `airaware-ui`, `modern-web-guidance`, `break-ui` (long plans, rules fallback, stale plan).
- **Risks.**
  - A longer page without the scroller.
  - PF-07 (one plan request per visit) must still hold.
  - Plan and verdict level mismatch (DI-06).
- **Effort.** 1–2 days.
- **Approval gate.** PF-07, DI-06, AC-12 ("Your plan is ready." still announced), and the R4 rows in doc 15 §4.

### R5 · Ask AirAware (doc 03 phase C · Ask)

- **Goal.** Make the answer easier to trust and act on, using the existing `useAsk` and server. No assistant-ui (per doc 08 §3.5 and doc 12).
- **Scope.**
  - **A1:** the context line as chips. The strings are the same: place · Model forecast · retrieved HH:MM · Not current · x of 10 answered.
  - **A2:** answer order: answer, provenance, "Not current", cards with "Why?", the note once, then actions (12 §6).
  - **05-G10:** keep the column at the shipped 56rem.
  - **05-G7:** lucide icons on the starters.
  - Keep the existing stale marker. The Ask "Using" line already appends " · Not current" when the forecast is over 60 minutes old (OBSERVED `pages/Ask.tsx:132`), so the AK-08 / F-33 behaviour is already in the code. The chips must carry it.
- **Excluded from R5.** Feedback buttons, history, streaming and "new chat" stay out (J7 stands unless the owner reverses it; 11 C2). So do "What Claude saw" (A11) and "Ask about this" (A10).
- **Files likely touched.** `pages/Ask.tsx`, `features/ask/AskEntry.tsx`, `features/ask/ask.ts`, `Ask.test.tsx`, `AskEntry.test.tsx`, `useAsk.test.ts`, `e2e/ask.spec.ts`, `e2e/copy.spec.ts`.
- **Dependencies.** None. J26 is local only; see the D14 push gate.
- **Skills.** `airaware-ui`, `modern-web-guidance`, then `mobile-native` (composer, keyboard, safe area) swapped for `break-ui` (long questions and answers, medical, out of scope, rate limit, cap fallback).
- **Risks.**
  - Changing the answer order can break focus and scroll on new replies (per doc 08: `AskEntry.tsx:295-321`).
  - Each starter is sent as a typed question and so costs a Claude call against the cap (per doc 12).
- **Effort.** 1–1.5 days.
- **Approval gate.** AK rows in REDESIGN_ACCEPTANCE_CRITERIA §2.2a, AC-12, the URL-has-no-question check (G-02), and the R5 rows in doc 15 §4.

### R6 · My Home, Better Habits, My Profile (doc 03 phase C)

- **Goal.** Calmer LEARN pages: guide groups as hairline lists on one sheet, with each group's "Why?" kept.
- **Scope.**
  - Guide lists use A's `.sheet` rule.
  - My Home states that the forecast is outdoor and that AirAware does not measure indoor air. The B prototype wording needs CP-04.
  - The Better Habits intro "We never show an emissions saving we can't calculate" is kept.
  - My Profile layout uses A's label rail (two columns from 1024; MP-04).
  - N3 "Next:" links on Home and Habits only if D12 approves them.
  - Keep the guide sentence that B dropped (05 S6, server `guides.ts:60`).
- **Files likely touched.** `pages/MyHome.tsx`, `pages/BetterHabits.tsx`, `pages/Profile.tsx`, `features/guides/GuideGroups.tsx`, `features/daily-plan/HouseholdPreferencesForm.tsx`, `features/daily-plan/SavedPlansList.tsx`, plus tests and `e2e/pages.spec.ts`.
- **Dependencies.** None.
- **Skills.** `airaware-ui`, `modern-web-guidance`, `mobile-native`.
- **Risks.**
  - Hard-coded skeleton heights per breakpoint (per doc 01: `MyHome.tsx:98,169`, `BetterHabits.tsx:49`). CLS on My Home was 0.199–0.468 in production at Stage 0 (PF-01), so a layout change can make it worse.
  - The privacy notes must stay word for word (PR-05) unless the owner rules otherwise.
- **Effort.** 1–1.5 days.
- **Approval gate.** PF-01 (< 0.1), PR-01, PR-06, and the R6 rows in doc 15 §4.

### R7 · Landing (doc 03 phase D)

- **Scope.**
  - **Only if the owner agrees (new D15):** drop the scroll-timeline `.reveal` (OBSERVED `client/src/index.css:212`; it also blanks full-page captures).
  - **05-G8:** a night city using the shipped skyline geometry with a few lit windows in `primary`. No PNG (H4).
  - **05-G9:** a journey band naming each step's destination (CP-04).
  - Keep the labelled past Today screenshot (OWNER_DECISIONS G3/G4). No live demo (DI-10; doc 02 R2).
- **Files likely touched.** `pages/Landing.tsx`, `pages/landingExamples.ts`, `features/air-quality/skylineGeometry.ts` (read, reuse), `index.css`, `Landing.test.tsx`, `e2e/landing.spec.ts`.
- **Dependencies.** None.
- **Skills.** `airaware-ui`, `modern-web-guidance`, `frontend-design` (critique within the existing tokens).
- **Risks.**
  - LCP on the first cold hit.
  - LA-01 (hero height) budgets.
- **Effort.** 1 day.
- **Approval gate.** LA rows, PF-02, PF-05 (no new raster image), and the R7 rows in doc 15 §4.

### R8 · Cityscape depth and small motion (doc 03 phase E)

- **Scope.**
  - The H5 band and opacities per D7.
  - Doc 10 P1: deeper tonal steps and a static horizon band. (If D7 takes A's quieter band instead, drop P1: the two pull in opposite directions.)
  - Doc 10 P2: clouds with depth that still settle once.
  - Doc 09 C5: a dialog fade of 180/120 ms.
  - Doc 09 C13: the Copy icon turns to a tick over 150 ms.
  - Optional, each with a separate yes: 09 C8 (cap the infinite pulse at 2 cycles), 09 C11 / 10 P4 (the first scene fades in).
  - All motion is CSS only.
- **Not in R8.** Parallax in the app, a night look, PNG layers, and any real-time 3D (doc 10 recommendation).
- **Files likely touched.** `features/air-quality/CitySkyline.tsx`, `features/air-quality/scene.ts`, `index.css`, `components/PlaceChip.tsx` (dialog), `features/ask/AskEntry.tsx`, `e2e/scene.spec.ts`, `e2e/backdrop.spec.ts`.
- **Dependencies.** None. GSAP, Motion and Three.js are not approved (doc 08; doc 03 §5.2 E).
- **Skills.** `airaware-ui`, `modern-web-guidance`, `improve-animations`. Swap to `animate`, or to `animation-performance` only if jank is measured.
- **Risks.**
  - Paint-tier fades (doc 09 E7) and the cost of `backdrop-filter` (13 elements; per-frame cost not measured, per doc 09).
  - The title block must keep 4.5:1 contrast on every sky stop (AC-10).
- **Effort.** 1–2 days.
- **Approval gate.** CS rows (minus CS-08 if D10 confirms), AC-07, AC-08, AC-10, and the doc 10 2.5D budgets (0 B added JS, 130 backdrop elements or fewer, 0 decorative animations after 6 s), as in doc 15 §4.

### R9 · Harden and release (doc 03 phase F)

- **Scope.**
  - Full regression: every common gate at all five viewports.
  - A real-phone pass (`docs/REAL_PHONE_CHECKLIST.md`, OBSERVED as present).
  - A screen-reader pass on Today (AC-13).
  - Then the push, on the owner's word (D14).
  - After the push, a CAP-PROD capture (owner OK per run) and live e2e via `E2E_BASE_URL` (owner OK).
- **Files likely touched.** Tests only, unless a defect is found. Any fix goes back through the gates of the phase it belongs to.
- **Skills.** `airaware-ui`, `break-ui`, `accessibility`. Swap in `modern-web-guidance` for one specialist once a fix is written.
- **Risks.**
  - Production differs from local: AI keys, FIRMS, quotas.
  - The rules-plan versus "Made with AI" observation (11 C5) should be checked against production logs.
- **Effort.** 1–2 days.
- **Approval gate.** The whole of doc 15 §2 on production, plus the owner's sign-off on the screenshot set.

---

## 4. Later: each needs its own approval (not scheduled)

| Item | Why it waits | Source |
|---|---|---|
| N1 DayTimeline (model values per band, behind a disclosure) | Touches DI-04, and the band cut-offs need a ruling (06 O-1/O-2) | 06 §4.3, 11 P3 |
| "I'll try this" tick | Needs a storage ruling: memory or browser only unless saved. No schema exists. | 05 §8, 06 §4.6, 11 P4 |
| "Ask about this" pre-fill | New copy; Ask text travels in memory only, never in the URL | 06, 11 A10 |
| "What Claude saw" fold | Depends on J26 being deployed | 02 R5, 11 A11 |
| Check for the following 24 hours (hours 25–48) | Server change | 11 I3 |
| History and yesterday's air | No verified past-data source | 11 I1, I2; 13 |
| Fixed data and app answers in the Ask rules fallback (11 A19) and server-owned explainer guide cards (11 I4) | Server changes; doc 11 rates them "Next", but ground rule 4 keeps server work out of R1–R9 (added in the critic pass) | 11 A19, I4; 12 §13 |
| "I'll try this" on Better Habits guide cards | 11 B2 proposes it; 06 §4.6 keeps the tick off guide cards. Owner picks one | 11 B2, 06 §4.6 |
| Route splitting (F-37), og tags and manifest (F-36), landing WebP | Open items. Route splitting is the realistic way back under PF-03. | 01; STAGE5_REPORT.md:107 |
| Shared Button, Card and Chip primitives (X1) | An abstraction not needed for R1–R8. Do it only if the owner asks (ground rule 2: no extra abstractions). Tokens are added when a phase needs them. | 11 X1 |
| "Sky stage" (B's 48 px verdict on the sky, solid ground, glass header, compact band) | Reopens H3, H5 and J22 | 05 §8 |
| Landing-only Three.js hero | New dependency and CSP change; doc 10 rates it optional Phase 3 at most | 10, 08 |

**Never build:** AQI or bands, a demo mode, dose, CO₂ or cigarette figures, "cleanest hours", a sixth nav item, live, measured or sensor wording for model data, or pre-ticked choices (11 §12; 02).

---

## 5. Sequence at a glance

| Phase | Waits on | Effort (estimate) | Fits before 29 Nov? |
|---|---|---|---|
| R0 Decisions and re-baseline | Owner time | 0.5 d | Rulings only |
| R1 Accessibility quick fixes | D11 (or a report saying it was not checked) | 1–1.5 d | Built locally only, if started now without the full R0. Live only if D14 is approved. |
| R2 Copy and token rulings | D2, D4, D5, D6, D12 | 0.5–1 d | No |
| R3 Today first screen | D1, D3, D4, D8, D9, D10 | 2–3 d | No |
| R4 Daily plan | D13; after R3 | 1–2 d | No |
| R5 Ask | J7 stands; D12 | 1–1.5 d | No |
| R6 Home, Habits, Profile | D12 | 1–1.5 d | No |
| R7 Landing | D12 (05-G9), D15 | 1 d | No |
| R8 Cityscape and motion | D7, D10 | 1–2 d | No |
| R9 Harden and release | D14 | 1–2 d | No |

R4 follows R3, because both change Today's first screen and `e2e/firstscreen.spec.ts`. R5, R6 and R7 do not depend on each other once R2 is in, so the owner can reorder them. R8 comes after R3 so that contrast is checked against the final Today layout.

---

## 6. Not verified

- The per-phase effort split is my estimate. Doc 05's 9–12 days is a designer estimate, also not checked against a build.
- Test file names were checked by listing (`client/src/**/*.test.*`, `server/src/services/recommendations/`). Which assertions each one pins was not read.
- The danger token contrast (about 2.8:1) is my calculation from `#f06b72` against `#f5f8fa`. It was not measured in a browser.
- File:line references marked "per doc NN" come from teammates and were not re-opened by me. The ones I opened myself: `index.css:26-43,212`, `TodayLead.tsx:53`, `AppShell.tsx:442`, `Ask.tsx:132`, `docs/UI_SKILLS_AND_REDESIGN.md:50-70`, `Landing.tsx:53,65`, `DailyPlanSection.tsx:325`, `AskBox.tsx:52,96`, `HelpChoices.tsx:26`, `Ask.tsx:153`, `ask.ts:56-57`, `e2e/playwright.config.ts`, `e2e/copy.spec.ts:16-20`, `e2e/responsive.spec.ts:33-39`, the three `package.json` files, `.github/workflows/ci.yml`, REDESIGN_ACCEPTANCE_CRITERIA §0, §1, §4–§9, and STAGE5_REPORT.md:74-109.
- Whether the live site's JS size changes after J26 is pushed.
