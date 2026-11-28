# 15 · Acceptance and QA checklist

Written 28 Nov 2026. This is a read-only proposal: nothing was run against the app for this doc, and no code, config or existing doc was changed.

**Labels.** **OBSERVED** means I saw it in the repo; the source is cited. **RECOMMENDED** means a proposed check or threshold. "Per doc NN" means a teammate's finding. **Default:** §1 is OBSERVED. Every check, threshold and evidence rule in §2–§5 is RECOMMENDED unless it reuses an existing ID from `REDESIGN_ACCEPTANCE_CRITERIA.md` or is tagged OBSERVED.

**How this doc relates to the existing criteria.** It does **not** replace `REDESIGN_ACCEPTANCE_CRITERIA.md`. It reuses that file's IDs (G-, TD-, AK-, MH-, BH-, MP-, LA-, DI-, PR-, AC-, PF-, CP-, CS-) and adds only what the R0–R9 phases in `14_IMPLEMENTATION_ROADMAP.md` need. New check IDs here start with **Q-**.

---

## 1. Tools and commands that exist (OBSERVED)

### 1.1 Scripts

From the root `package.json`, `client/package.json` and `server/package.json`:

| Command | What it runs | Notes |
|---|---|---|
| `npm run format:check` | `prettier --check .` | In CI |
| `npm run lint` | `oxlint --type-aware --deny-warnings` | In CI |
| `npm run typecheck` | Each workspace's `typecheck` (client `tsc -b`, server `tsc --noEmit`), then `tsc -p e2e` | In CI |
| `npm test` | `vitest run` in server and client | Doc 01's run on 28 Nov: 446 server passed and 27 skipped (live-key tests), 708 client passed |
| `npm run test:coverage` | Vitest with lcov | This is what CI runs (`.github/workflows/ci.yml`) |
| `npm run build` | Client `tsc -b && vite build` | In CI. Use its gzip output for script size. |
| `npm run e2e` | `playwright test --config e2e/playwright.config.ts` | **Not in CI.** See §1.2. |
| `npm test -w client -- <path>`, `npm test -w server -- <path>` | One workspace or file (an npm workspace flag plus a Vitest filter) | RECOMMENDED form, not run |

- **No dedicated script exists** for axe, Lighthouse, bundle analysis or visual diffs. Do not claim one ran.
- **axe** runs inside the tests:
  - `e2e/axe.ts` `expectNoAxeViolations` runs in a real browser, with colour contrast checked.
  - `client/src/test/axe.ts` runs in jsdom, so it has no layout and cannot check contrast.
- **LCP and CLS** come only from a **copy** of `docs/redesign/audit/evidence/capture.mjs` (REDESIGN_ACCEPTANCE_CRITERIA §0.2 "CAP"). Each figure is one unthrottled run and is indicative only (§0.4).

### 1.2 How e2e runs (OBSERVED, `e2e/playwright.config.ts`)

- **Projects:** `desktop` (Desktop Chrome) and `phone` (Pixel 7), one worker, no retries.
- **Server:** it builds the client and starts the server on port 8090 using `server/.env`. It needs the network and the env files (config lines 4-7). **Never open the .env files.**
- **Deployed site:** setting `E2E_BASE_URL` runs the suite against a deployed site. Run this only after the owner-approved push, with the owner's OK.
  - PowerShell: `$env:E2E_BASE_URL = 'https://airaware-ai.netlify.app'; npm run e2e`
  - Git Bash: `E2E_BASE_URL=https://airaware-ai.netlify.app npm run e2e`
- **Live specs:** `e2e/onboarding.spec.ts` and `e2e/journey.spec.ts` call live Open-Meteo and Supabase (REDESIGN_ACCEPTANCE_CRITERIA §0.2 "E2E-LIVE"). Run them only with the owner's OK.
- **Stubbed run without the live specs** (RECOMMENDED; Playwright treats the arguments as path filters):
  `npm run e2e -- ask backdrop copy failures firstscreen keyboard landing pages responsive scene`
- **One spec, one project:** `npm run e2e -- --project=phone copy.spec`

### 1.3 Viewport coverage today (OBSERVED, `e2e/responsive.spec.ts:33-39`; criteria §0.3)

| Required viewport | Covered by e2e now? | What a phase must do (RECOMMENDED) |
|---|---|---|
| 320×640 | Yes, in `SIZES`; the target check runs here | Nothing extra |
| 390×844 | **No.** The phone project is a Pixel 7, and `SIZES` has no 390. | Add `page.setViewportSize({ width: 390, height: 844 })` to the target and overflow checks the phase touches, **and** capture with the CAP copy |
| 768×1024 | Yes; the target check runs here | Nothing extra |
| 1280×720 | **No.** e2e uses 1280×800. | Set 1280×720 in new first-screen tests; CAP |
| 1440×900 | **No** | CAP only |

`SIZES` also has 640×400 (200 % zoom of 1280×800) and 1024×768. Keep both.

---

## 2. Common gates for every code phase (R1–R9)

Each row must pass, or be explicitly waived by the owner in writing, before the phase is accepted.

| # | Area | Check | How | Threshold |
|---|---|---|---|---|
| Q-01 | Build health | Format, lint, typecheck, unit tests, build | The five CI commands in §1.1 | All pass. **Paste the output**, including the test counts, and compare them with the R0 baseline. |
| Q-02 | Stubbed e2e | Every stubbed spec, both projects | §1.2 stubbed command | 0 failed. Skips must match the R0 stubbed run, with a reason for any new skip. The last recorded figure is 309 passed and 83 skipped (24 Nov, G-06), with the live specs included, so it is not like for like. |
| Q-03 | Viewports | Every changed page at 320×640, 390×844, 768×1024, 1280×720, 1440×900 | §1.3 | A screenshot at each size, plus the Q-04 to Q-06 rows met at each |
| Q-04 | No overflow | `scrollWidth ≤ clientWidth`; no clipped text; also at 200 % text and wide text spacing | `pastTheEdge()`, `clippedText()` (`e2e/layout.ts`), CAP | 0 offenders (AC-03) |
| Q-05 | Targets | Every visible interactive element is at least 44×44 px, or has a 44 px hit area | `smallTargets()` (`e2e/layout.ts:163`) at 320 and 768, plus the new 390 check; CAP at 1280 and 1440 | 0 offenders (AC-02). The Stage 0 skip-link exemption stays as the helper defines it. |
| Q-06 | Keyboard and focus | Every Tab stop shows a ring; no focus traps; nothing focused off screen or under the phone bar; Escape closes the dialog; focus returns to its trigger | `e2e/keyboard.spec.ts`, plus a manual Tab pass on each changed page | AC-05, AC-06. A nav click opens the page at its top (STAGE5 check). New `focus()` calls use `preventScroll`. |
| Q-07 | Accessible names | Every button, link and form control has a name. Icon-only controls have one too (for example "Copy answer", `AskEntry.tsx:113`). Each "Why?" disclosure keeps the card title in its name (CP-06). One H1 per page, and heading levels never skip. | axe (`button-name`, `link-name`, `label`) via `e2e/axe.ts`; AC-04 | 0 axe violations (AC-01); headings as in AC-04 |
| Q-08 | Contrast | Text 4.5:1. Large text, focus rings, control borders and the danger outline 3:1. Title text over every sky stop 4.5:1. | axe colour-contrast in a real browser; `e2e/backdrop.spec.ts` (AC-10); for text over the sky, record axe's "needs review" items | Pass. Known fails to avoid: `text-dark-muted` on the within sky is 4.20 (per doc 05), and `--color-danger` #f06b72 on `surface-light` is about 2.8 (my calculation). |
| Q-09 | Screen-reader messages | The live regions still announce at the same moments: `<output>` in `Ask.tsx:164`, `MyHome.tsx:81`, `DailyPlanSection.tsx:257` ("Your plan is ready."), `HouseholdPreferencesForm.tsx:304,354`, `SavedPlansList.tsx:235`, `Profile.tsx:106`, `LocationSearch.tsx:217`, `UseMyLocation.tsx:61` | Unit tests (AC-12), plus one NVDA, VoiceOver or TalkBack pass per phase on the changed page | Present and filled. No exposed `aria-busy="true"` left after load. The hidden Today subtree's placeholder that never cleared (live capture digest, 11 T6) must stay inside `[hidden]` or be fixed. |
| Q-10 | Status not by colour alone | Level tag text, banner text and icon, bold current nav label | Unit tests plus the owner's review | AC-09 |
| Q-11 | Reduced motion | With `prefers-reduced-motion: reduce`, `document.getAnimations()` returns nothing, and the J18 cycling hint (timer-driven, so `getAnimations()` cannot see it) is still | `e2e/scene.spec.ts`, `e2e/landing.spec.ts`, plus `CyclingHint.test.tsx` | AC-07: 0 animations under reduce. Without the preference, decorative motion stops within 5 s. |
| Q-12 | Forced colours and reduced transparency | The backdrop is hidden, rings show, `card-surface` turns solid | `e2e/responsive.spec.ts` forced-colours tests | AC-08 unchanged |
| Q-13 | Data integrity | Every verdict shows its level tag and "Model forecast · Open-Meteo · retrieved HH:MM". "Not current" appears in every place it is shown today when data is over 60 min old: the Today banner, the plan-stale line, the footer and the Ask "Using" line (DI-05; `Ask.tsx:132`). Level labels are exactly "Within the limit", "Above the limit", "No data". There is no AQI, no number in the client that is not in the server's data, no pollution inferred from weather, no outdoor value shown as indoor, and no demo data. | DI-01 to DI-10; a test with data 2–3 h old for DI-05 | All pass. DI-04 follows the owner's D3 ruling (doc 14 §2). |
| Q-14 | Copy | No "safe", "healthy", "clean air", "good air" or "bad air" on any page or state with every `<details>` open. No "AQI" except the allowed phrases. No medical advice, no yes/no to "can I go outside", no invented savings. | `e2e/copy.spec.ts` (OBSERVED: `BANNED` at :16, `ALLOWED_AQI` at :20); CP-05 unit tests | 0 hits. **Open item:** the brief allows only "We don't calculate an AQI", while `copy.spec.ts` and A7 also allow "CPCB National AQI". Gate on whichever the owner rules (D2); until then, report both counts. |
| Q-15 | Strings | Shipped strings unchanged unless approved; new strings approved before they are built; docs that quote changed strings updated | CP-01 to CP-04, CP-07 (grep before and after) | Gate |
| Q-16 | Privacy | No account until Save or Remember. Geolocation only after "Use my location". Coordinates at 2 decimals and never in the URL from a device. No new browser storage key. No question text or household context in logs. Household answers optional. Delete still one confirmed step. | PR-01 to PR-08 | Gate. Any new key (for example "I'll try this") needs an owner ruling first. |
| Q-17 | Dependencies and APIs | No change to package files or the lockfile; no API contract change | `git diff --stat package.json client/package.json server/package.json package-lock.json shared/` | Empty diff (G-04) |
| Q-18 | Performance | See §3 | CAP local, then CAP-PROD after the push | §3 thresholds |

---

## 3. Performance budgets

| ID | Metric | Before (OBSERVED, cited) | Threshold (RECOMMENDED unless an existing ID) |
|---|---|---|---|
| PF-01 | CLS (sum of all shifts, one unthrottled load) on Today, Ask, My Home, Better Habits, Welcome at all 5 viewports | Prod Stage 0: Today 0.104–0.283, My Home 0.199–0.468, Better Habits 0.143–0.314 (criteria §7) | Existing gate: under 0.1 per page and width. **RECOMMENDED interim:** no phase may raise any page's value above its R0 local baseline, and pages it touches must move toward 0.1. |
| PF-02 | LCP | 2,440 ms or less except the cold first hit (Stage 0) | 2,500 ms or less per route, indicative, excluding a documented cold first hit |
| PF-03 | Script size (gzip, from `npm run build -w client`) | Gate 155 kB transferred. **Already exceeded:** live 157,970 B (per doc 09); local gzip -9 164,692 B (per doc 08). | **Re-baseline in R0.** Then each R1–R8 phase is allowed at most 2 kB gzip over the R0 figure (no package may be added). Getting back under 155 kB needs route splitting (F-37), a separate approval. |
| PF-05 | Images | 96 kB + 124 kB landing captures | No new raster image (H4) |
| PF-06, PF-07 | API calls per load; one plan request per visit | Today 3, Ask 2, My Home 4… (criteria §7) | No increase; exactly 1 plan POST per visit |
| Q-19 | Backdrop (R8) | 115 elements, 6 SVGs, 13 `backdrop-filter` elements (per doc 09) | Doc 10 2.5D budgets: 0 B added JS, 0 new requests, 130 backdrop elements or fewer, 0 decorative CSS animations running after 6 s |

---

## 4. Per-phase additions

Every code phase also passes all of §2 and §3.

### R0 · Decisions and re-baseline

- [ ] The owner's rulings on D1–D15 are written down (doc 14 §2), including "deferred" where relevant.
- [ ] A CAP copy has run in **local** mode at all 5 viewports. Its output is outside `docs/redesign/audit/screenshots/` (Stage 0 set) and outside the Stage 0 scratchpad. The script is never run in place.
- [ ] Baseline recorded: CLS and LCP per page, script size from `npm run build -w client`, targets below 44 px, overflow, test counts from Q-01, and one stubbed e2e run (§1.2) for Q-02. Each number is marked **live** or **local**.
- [ ] PF-03 re-set against the measured value and approved.

### R1 · Accessibility quick fixes

- [ ] Q-05 at 390×844: the Open-Meteo credit (every page) and Ask's Edit, Open-Meteo.com and Privacy measure at least 44 px. Before values: 117×17, 25×17, 100×15 and 42×15 (live capture, per doc 11).
- [ ] The Copy tooltip shows on keyboard focus and on hover, and does not cover the focus ring. Its name stays "Copy answer".
- [ ] The place chip at 200 % text shows the place name, not only icons (X3). Checked at 640×400 and 1280×800.
- [ ] The Landing CTAs' computed `transition` matches the `.press` rule (120 ms), not `0.15s cubic-bezier(0.4,0,0.2,1)` (doc 09 C2).
- [ ] `focus()` calls at `AskBox.tsx:52,96` and `HelpChoices.tsx:26` pass `preventScroll` (`Ask.tsx:153` already does). A test fails if it is removed.
- [ ] No copy changed (CP-01 grep is empty).

### R2 · Copy and token rulings

- [ ] Only strings approved in R0 changed. For each: a test asserting the new string, and a grep showing the old one gone except in negative assertions (CP-02).
- [ ] Server and client copy changed together where both own it (the within caveat: `today.ts` and server `rules.ts`).
- [ ] `copy.spec.ts` allow-list changed only if D2 says so.
- [ ] New tokens in `index.css` `@theme static`: only those approved. G-03's count is updated in the report. No hex literal added to `.tsx`.
- [ ] Danger button: text 4.5:1 or better and outline 3:1 or better on `surface-light`. It looks different from Cancel in a screenshot. The delete flow is still one confirmed step (PR-06).
- [ ] The stale banner keeps its existing reload action (`TodayLead.tsx:53`, `AppShell.tsx:442`): 44 px, named, keyboard-reachable. The banner stays a solid fill (B10).

### R3 · Today first screen

- [ ] At 390×844 and 1280×720, the first screen shows the place, the verdict with its level tag and provenance line, the top recommendation and a next step. Positions are measured (TD rows); the "Why?" y-position is recorded against the R0 baseline.
- [ ] Ledger, if D3 allows numbers: each value has its unit (µg/m³), the label "24-hour model forecast average", India's limit (60 or 100 µg/m³) and the unchanged level tag. The values equal the server's `airCheck.checks`. Check this in a unit test, and in e2e with the `e2e/layout.ts` stub checks: 41.2 and 63.5 within; 78.4 and 91 elevated. Nothing is calculated in the client. No colour scale.
- [ ] Unknown state: no readings, no bars, no "within" tag. One plain line instead. Screenshot (the opposite of prototype slip 05 S1).
- [ ] Stale state: the banner and "· Not current" appear on every provenance line on the screen.
- [ ] The limit-line picture, if kept (D8), is `aria-hidden` and has no printed percentage.
- [ ] All text below the title block sits on a panel or the sheet. The title block uses `text-dark` and is 4.5:1 or better on every sky (AC-10).
- [ ] Nothing removed: weather table, fire hotspots with caveat, help tiles, "Make it personal", Ask box and "Air quality details" are all still reachable (G-01 spirit).
- [ ] G-05: at most one visible teal fill on Today with all disclosures closed.

### R4 · Daily plan

- [ ] If D13 approves removal: no `max-h-[60svh]` inner scroller remains (grep). If not, the box stays and the strip sits above it. The page scrolls as one.
- [ ] Rules plan: no "Your day" strip and no empty bands. AI plan: only periods present in the plan are drawn.
- [ ] PF-07: exactly 1 plan POST when moving Today → My Home → Today within a minute.
- [ ] DI-06 holds when the plan's level differs from the forecast's.
- [ ] "Your plan is ready." is still announced (Q-09).

### R5 · Ask AirAware

- [ ] Context chips show the same facts as the old line, including the existing " · Not current" marker when data is over 60 minutes old (OBSERVED, `Ask.tsx:132`). Edit is at least 44 px.
- [ ] Answer order is as approved. Focus and scroll still move to the new reply. The URL never holds question text (`e2e/ask.spec.ts`).
- [ ] States rendered and screenshotted at 390: empty, thinking, AI answer, rules fallback, medical, out of scope, rate limited, error, stale.
- [ ] The medical reply calls no AI and gives no advice. Out-of-scope copy is unchanged unless ruled.
- [ ] No feedback buttons, history, streaming or "new chat" (J7) unless the owner reverses J7.
- [ ] Composer textarea font is 16 px or more at 390 (AC-11). Enter sends; Shift+Enter adds a line. The 200-character limit still holds.
- [ ] A real-phone check that the keyboard does not cover the composer (AC-13, `docs/REAL_PHONE_CHECKLIST.md`).

### R6 · My Home, Better Habits, My Profile

- [ ] Every guide card is still present with its "Why?" (count before and after), including server `guides.ts:60`'s sentence (05 S6).
- [ ] My Home never presents outdoor forecast values as indoor. The outdoor/indoor line is used only if approved.
- [ ] Better Habits shows no emissions figure. Its intro line is unchanged.
- [ ] Profile: all 10 household questions still optional ("Not answered" default). Save notes word for word (PR-05). Delete still one confirmed step.
- [ ] CLS on My Home and Better Habits does not get worse than the R0 baseline at any width (PF-01).

### R7 · Landing

- [ ] If D15 approves dropping it: no `.reveal` scroll-timeline class is used. A full-page capture shows all sections without the reduced-motion workaround.
- [ ] No new raster image. The night city uses the shipped geometry (PF-05, H4).
- [ ] The labelled past screenshot caption stays ("A past screenshot of Today for Pune, 22 Nov 2026"). No demo data (DI-10).
- [ ] The closing integrity lines stay as worded by the D2 ruling. "Official CPCB observations are not connected yet." stays.
- [ ] LA rows, and LCP on Landing recorded.

### R8 · Cityscape and motion

- [ ] Q-19 budgets met (doc 10).
- [ ] Every new motion lists purpose, trigger, duration and easing in the report (doc 09 §3 format). It stops under reduce and finishes within 5 s.
- [ ] The air-look change still follows only the server's 24-hour check level. Weather sets clouds and rain only. No fog, smoke, landmarks or people.
- [ ] Title contrast of 4.5:1 or better against every sky stop, cloud and glow (`backdrop.spec.ts`).
- [ ] The backdrop is still `aria-hidden`, hidden under forced colours, and no canvas or WebGL is added (count = 0).

### R9 · Harden and release

- [ ] All of §2 at all five viewports on the local build. Output pasted.
- [ ] Real phone (`docs/REAL_PHONE_CHECKLIST.md`): device and OS named, a VoiceOver or TalkBack pass on Today, landscape notch sides checked (AC-13).
- [ ] After the owner's push only: CAP-PROD at 5 viewports (owner OK per run), and e2e against the live site (§1.2 deployed-site command) with the owner's OK.
- [ ] The live Ask page shows the J26 intro (`client/src/features/ask/ask.ts:56-57`) after the push.
- [ ] The rules-plan versus "Made with AI" difference (11 C5) checked against production logs, or recorded as unresolved.

---

## 5. Evidence required per phase

| Evidence | Where | Rule |
|---|---|---|
| Phase report | `docs/redesign/` (new file per phase, owner OK) | It lists:<br>- the decisions applied;<br>- the files changed (`git diff --stat`);<br>- every §2 row as pass, fail or waived, with the waiver's author;<br>- whether `modern-web-guidance` ran ("Not checked against modern-web-guidance" if not);<br>- the skills loaded (3 or fewer, per doc 03 §5.2). |
| Test output | Pasted in the report | The raw tail of each command: counts of passed, failed and skipped. Never summarise from memory. |
| Screenshots | `docs/redesign/audit/screenshots/redesign-2026-11-28/` (git-ignored), one subfolder per phase | Before and after for each changed page:<br>- 320×640, 390×844, 768×1024, 1280×720 and 1440×900;<br>- the four Today states for R3;<br>- reduced motion on for full-page shots, with one motion-on shot for R7 and R8. Fixed layers misplace in full-page shots, so also take first-screen shots. |
| Measurements | JSON beside the screenshots | CLS, LCP, script size, target and overflow lists, each marked live or local |
| Copy diff | In the report | Old and new string pairs with the owner's approval reference (CP-04) |
| Screen-reader notes | In the report | Tool, browser, OS, and what was announced at each live region exercised |

**Never acceptable as evidence:** a claim that a check ran when it did not; a screenshot of a page that did not load; numbers from a different environment (live vs local) compared as if they were like for like (criteria §0.4).

---

## 6. Not verified

- None of the commands in §1 were run for this doc. The stubbed e2e filter command and the `-w` forms are proposed invocations, not tested.
- Whether `npm run e2e` starts cleanly in this checkout depends on the env files, which I did not and must not open.
- The 2 kB gzip per-phase allowance and the "no worse than baseline" CLS interim rule are proposals for the owner, not existing gates.
- `smallTargets()`'s exact exemption rules were not read past its signature (`e2e/layout.ts:163`).
- The danger token's ratio of about 2.8:1 is calculated, not measured in a browser.
- Screen-reader behaviour of the hidden `aria-busy` placeholder was seen once in a headless run (per the capture digest) and not tested with a screen reader.
