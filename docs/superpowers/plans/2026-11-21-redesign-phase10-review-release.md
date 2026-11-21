# Phase 10: Browser Review, Regression, Final Review and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the assistant redesign:
- review every page by eye at 320, 768 and 1280;
- run the full regression and the release gate;
- have a fresh reviewer read the whole redesign;
- then, only on the owner's word, push and verify the live site.

**Architecture:**
- The by-eye review and the release gate are recorded in a new `docs/QA_REPORT.md`, which follows `TESTING_QA.md` §11.
- One new automated guard scans the text on every page and state for the banned words.
- Fixes found are made test-first.
- The push is a separate, owner-approved step, followed by the deploy checks in `DEPLOYMENT.md` and a live e2e run.

**Tech Stack:** Playwright (desktop and Pixel 7), the built-in browser for by-eye checks, `gh` (read-only, for CI, CodeQL and Sonar results), Netlify deploy on push.

**Spec:**
- `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md` §8 (copy rules), §12 and §13 (order 8: "final review");
- `docs/UX_AUDIT.md` §7, row 10 ("Browser review at 320/768/1280, full regression, final review");
- `TESTING_QA.md` §10 (release gate) and §11 (QA report);
- `DESIGN.md` §13 (design acceptance checklist);
- `DEPLOYMENT.md` "After every deploy";
- `AGENTS.md` §8 (CodeQL and SonarQube) and §10 (reporting).

## Global Constraints

- **Push:** no push without the owner's explicit yes in chat for that push. Each push deploys and costs about 15 Netlify credits.
- **Secrets:** never read, echo or set a token or key (Gemini, Anthropic, Supabase secret, Sonar, Netlify). `gh` calls are read-only.
- **Scanners:** never say a scanner passed unless its run completed and its findings were read.
- **Data rules (AGENTS.md §5):** data kinds stay distinct, the "Model forecast" and "Not current" labels are never hidden, air-quality wording never changes to fit, and no values are invented.
- **Copy (spec §8):** never "safe", "healthy", "clean air", "good air" or "bad air", and no "AQI" except in "We don't calculate an AQI".
- **Process:**
  - test-first for every fix;
  - no new dependency;
  - commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - one branch (`main`).
- **Not used:** modern-web-guidance (denied earlier; don't work around it).

## Review Focus

1. **The live site isn't the dev build:** Netlify functions, the CSP and security headers, and real timestamps. These are pinned by Task 5's deploy checks.
2. **Banned words in states the matrix rarely shows:** error, stale, medical and out-of-scope Ask answers. Pinned in Task 2.
3. **"Use my location" over HTTPS on a real phone:** this is the first time it can be tested. It's the owner's item in Task 5.
4. **The phone's bottom bar after Phase 9's final header changes:** the owner's glance in Task 5.
5. **Live e2e and the shared rate limits:** 60 a minute per address through Netlify. The journey waits out a used minute; Task 5 records the run's real result.

---

### Task 1: Browser review by eye at 320, 768 and 1280

**Files:**
- Create: `docs/QA_REPORT.md` (the `TESTING_QA.md` §11 template, plus a "Browser review" section).
- Plus any fix found, test-first.

- [ ] **Step 1: Look at each page at 320, 768 and 1280** in the built-in browser (real scrollbar, real fonts):
  - `/` and `/privacy`;
  - Today: within, above, stale and loading;
  - Ask (empty, plus one answer), My Home, Better Habits, My Profile, and Welcome steps 1–3;
  - the place dialog.

  Note anything off in spacing, alignment, hierarchy, truncation, focus or tap feel.
- [ ] **Step 2: Score `DESIGN.md` §13's 8 checklist items** against what you saw, one line each, with the evidence (a page and size). Record them in `docs/QA_REPORT.md`.
- [ ] **Step 3: Each finding becomes a failing test where one can show it** (a component test or e2e), then the smallest fix. A purely visual finding gets a before and after screenshot (in `.playwright-mcp/`, git-ignored) and a ledgered ruling.
- [ ] **Step 4: Run `npm test`** and the specs touched. All pass.
- [ ] **Step 5: Commit** `docs: Phase 10 browser review` plus fixes.

### Task 2: No banned words on any page or state

**Files:**
- Create: `e2e/copy.spec.ts`.

**Interfaces:**
- Consumes: `stub`, `open` and `at` from `e2e/layout.ts`.

- [ ] **Step 1: Write the test.**
  - `'no banned words: {path}'` for the 8 paths, plus:
    - a stale above-limit Today;
    - the forecast error card;
    - an Ask answer for each of `aiAskFixture`, `rulesAskFixture`, `medicalAskFixture`, `outOfScopeAskFixture` and `unknownAirAskFixture` (all in `client/src/test/askFixtures.ts`), each answered through a route on `/api/v1/assistant/answer`;
    - My Home and Better Habits.
  - Read `document.body.innerText` and expect it not to match `/\b(safe|healthy|clean air|good air|bad air)\b/i`.
  - Expect every `AQI` in the text to be inside `We don't calculate an AQI` (strip that phrase first, then expect no `AQI`).
- [ ] **Step 2: Run it.** If it passes at once, prove it with a mutation: temporarily add "safe" to a verdict caveat. It must fail. Ledger that.
- [ ] **Step 3: Fix any real hit** in the copy, never by weakening the pattern. A word inside a fixed quotation (a source title) is a ledgered ruling, and the test lists it as an exact exception.
- [ ] **Step 4: Run the spec on both projects.** All pass.
- [ ] **Step 5: Commit** `test(e2e): no banned words on any page or state`.

### Task 3: Full regression and the release gate

**Files:**
- Modify:
  - `docs/QA_REPORT.md` (the gate);
  - `DEPLOYMENT.md` ("After every deploy" step 5: the live e2e count and the new specs);
  - `README.md` (only claims that are now untrue);
  - `CHANGELOG.md` (the redesign summary under Unreleased).

- [ ] **Step 1: Run the full gate,** each step with its own exit code, with port 8090 free first: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run e2e`. Record each in `docs/QA_REPORT.md`.
- [ ] **Step 2: Check the rest of the release gate** (`TESTING_QA.md` §10), with evidence:
  - provenance tests pass;
  - invalid AI output is rejected (name the tests);
  - no open authorization issue;
  - the repo is public, on one branch, and under 10 MB with history (`git count-objects -vH`);
  - README and deployment claims are accurate.
- [ ] **Step 3: Fix any untrue README or DEPLOYMENT claim.** Wording only; no claim about the live site until Task 5.
- [ ] **Step 4: Run `npm run format:check`.** Clean.
- [ ] **Step 5: Commit** `docs: Phase 10 regression and release gate`.

### Task 4: A fresh review of the whole redesign

**Files:**
- Review range: `0691855..HEAD` (from the approved UX audit to now).

- [ ] **Step 1: Dispatch a fresh reviewer on Opus.** Give it:
  - the range's review package;
  - the spec;
  - this plan's Review Focus;
  - the ledgers' "Ruling:" lines.

  It is to check:
  - data integrity, privacy (geolocation, saved place, logs) and security (headers, CSP, token handling, rate limits);
  - accessibility, and regressions against `UX_AUDIT.md` §6 "What the redesign must keep working".
- [ ] **Step 2: Re-grade the findings by what a person gets.** Critical and Important findings go into one fix pass, each RED then GREEN, with the suite green after. Minors are ledgered and reported.
- [ ] **Step 3: Run the full gate again** if anything changed.
- [ ] **Step 4: Commit** each fix as it lands.

### Task 5: The push and the live checks (needs the owner)

**Files:**
- Modify: `docs/QA_REPORT.md` (the live results and the release decision) and `ACCESSIBILITY.md` (the live phone items).

- [ ] **Step 1: Ask the owner for the push.** Say how many commits, what changes for users, and the credit cost. Wait for a yes in chat.
- [ ] **Step 2: On a yes, run `git push origin main`.** Wait for the CI and Netlify deploy (`gh run watch` on the CI run, which blocks until it finishes; no polling loop).
- [ ] **Step 3: Run `DEPLOYMENT.md`'s "After every deploy" checks** against `https://airaware-ai.netlify.app`:
  - health returns 200;
  - `/`, `/app` and `/privacy` return 200;
  - the Pune forecast is `model_forecast` with a fresh `retrievedAt`;
  - the CSP on `/app` equals the CSP on health.
- [ ] **Step 4: Run the suite against the live site:** `E2E_BASE_URL=https://airaware-ai.netlify.app npm run e2e`. Record the real counts.
- [ ] **Step 5: Read the scanners:**
  - CI and gitleaks;
  - CodeQL (`gh api …/code-scanning/alerts?state=open`);
  - SonarCloud's quality gate (its public API or the CI step's summary).

  Record each one only once its run has completed and its findings have been read.
- [ ] **Step 6: The owner's live checks on their phone:**
  - "Use my location" works (the first HTTPS test);
  - a glance at the bottom bar and the header after Phase 9's fixes;
  - their phone's model, OS and browser.
- [ ] **Step 7: Write the release decision** (READY or NOT READY, with any known limitation) in `docs/QA_REPORT.md`, then commit `docs: Phase 10 live checks and release decision`.
  - Pushing that docs commit is a second deploy, so ask first, or leave it local for the next push.
