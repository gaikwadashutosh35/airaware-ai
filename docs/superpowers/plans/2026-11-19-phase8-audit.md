# Phase 8 — Quality and Security Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scan, review and fix the whole codebase with real tools, publish it as the public repo `gaikwadashutosh35/airaware-ai`, and record real counts.

**Architecture:** First a local history scan, then the first push. CI gains coverage, a SonarQube Cloud job and a gitleaks job, and CodeQL runs through GitHub's default setup. The reviews (security audit, code review, accessibility) feed one test-first fix pass, then re-tests and the write-up.

**Tech Stack:** GitHub Actions, gitleaks (Docker), SonarQube Cloud, CodeQL default setup, `@vitest/coverage-v8`, Playwright + axe-core.

**Spec:** `docs/superpowers/specs/2026-11-19-phase8-audit-design.md`

## Global Constraints

- **Each needs the owner's yes at that moment:**
  - creating the repo;
  - every push;
  - every repo-settings change (CodeQL default setup, secret scanning or push protection);
  - the first gitleaks image pull (state the image, its source and its size).
- **Never handle a secret value.** The owner creates and stores `SONAR_TOKEN`; scans run with `--redact`; no token or key is ever printed.
- **No secret history goes public:** the repo is not made public until the local history scan is clean or every finding is resolved.
- **New dependency:** only `@vitest/coverage-v8` (dev, root), the version matching Vitest 5.
- **Pinning:** Actions are pinned by commit SHA and Docker images by digest. The workflow keeps `permissions: contents: read`, plus only what a job needs.
- **Sonar:** the job runs on push to `main` only. Its quality gate is advisory (no `sonar.qualitygate.wait`), and its result is read and recorded.
- **No silencing:** every exclusion or allowlist entry is narrow and commented with its reason.
- **Fixes:** every Critical and high finding is fixed test-first (RED → GREEN, then the full gate). The grading is from the spec: by what a real person gets, and any change to a scanner's severity is recorded.
- **Gate:** `npx prettier --write <files>; set -o pipefail; npm run typecheck; npm run lint; npm run format:check; npm test`.
- **Commits:** on `main`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **CI's first run on GitHub (Ubuntu, Node 26)** differs from Windows: path case, line endings, timing. Expected: green, or each failure fixed at its cause. Pinned by Task 2, step 3.
2. **A gitleaks false positive** on a test placeholder (`sb_publishable_test`, `sb_secret_x`). Expected: one narrow, commented allowlist entry, never a broad path or rule ignore. Pinned by Task 1, step 2.
3. **Coverage paths:** Sonar must find both LCOV files, or it silently reports 0% coverage. Expected: the Sonar dashboard shows a non-zero coverage figure for both workspaces. Pinned by Task 4, step 5.
4. **A finding in shared code** (e.g. `PlanCard`, used by the landing page and the app). Expected: the fix keeps both callers' tests green. Pinned by every fix in Task 7 (full suite).
5. **A fix that changes user-facing copy or behaviour.** Expected: it stays inside the spec's rules (data integrity, privacy), and docs that quote the copy are updated. Pinned by the Task 7 doc step.

---

### Task 1: Local history scan and audit

**Files:**
- Create, only if needed: `.gitleaks.toml`

**Interfaces:**
- Produces: the gitleaks image reference `<image>@sha256:<digest>` and the exact local command, both reused by Task 4.

- [ ] **Step 1: Ask, then pull.** Ask the owner to approve pulling gitleaks's official image (`ghcr.io/gitleaks/gitleaks`, latest v8 release, about 25 MB, from the gitleaks project). Then pull it and record the digest.
- [ ] **Step 2: Scan the full history,** on all branches, with redaction, from Git Bash (use `MSYS_NO_PATHCONV=1` for the volume mount):

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/repo" <image>@sha256:<digest> git /repo --redact --verbose --log-opts="--all"
```

Expected: `no leaks found`, exit 0.
- **A test placeholder is flagged:** add a `.gitleaks.toml` that extends the default config, with one allowlist entry per placeholder (a regex for that exact string) and a comment giving the reason. Re-run until clean.
- **A real secret is flagged:** stop and report it to the owner (spec: rotate first, then the owner chooses between rewrite and a fresh single commit).
- [ ] **Step 3: Audit and size.** Run `npm audit` and `git count-objects -vH`. Expected: record both numbers in the ledger; the repo stays under 10 MB.
- [ ] **Step 4: Commit,** only if `.gitleaks.toml` was added. Message: `chore: gitleaks allowlist for test placeholders`.

### Task 2: Create the repo and push

- [ ] **Step 1: Ask, then create and push.** Ask the owner to approve creating the public repo and pushing `main`. Then run:

```bash
gh repo create airaware-ai --public --source . --remote origin --push
```

Expected: `https://github.com/gaikwadashutosh35/airaware-ai`, with only `main` and every commit present (`git ls-remote origin`).
- [ ] **Step 2: Check the security settings.** Read `gh api repos/gaikwadashutosh35/airaware-ai --jq .security_and_analysis`. If secret scanning or push protection is off, ask the owner before enabling it.
- [ ] **Step 3: Watch CI's first run.** Run `gh run watch` on the CI run. Expected: green. If it is red, use superpowers:systematic-debugging, fix test-first where the cause is in code, gate, commit, and ask before pushing.

### Task 3: Coverage

**Files:**
- Modify: `package.json` (dev dependency `@vitest/coverage-v8`; script `"test:coverage": "npm run test:coverage --workspaces --if-present"`)
- Modify: `server/package.json`, `client/package.json` (each gets `"test:coverage": "vitest run --coverage --coverage.reporter=lcov --coverage.reporter=text-summary"`)

**Interfaces:**
- Produces: `server/coverage/lcov.info` and `client/coverage/lcov.info` (`coverage/` is already git-ignored), used by Task 4.

- [ ] **Step 1: Install.** Run `npm install -D @vitest/coverage-v8@^5` at the root. Expected: one new dev dependency; `npm audit` is still clean.
- [ ] **Step 2: Run it.** Run `npm run test:coverage`. Expected: the same test counts as `npm test` (server 198 passed + 5 skipped, client 173), plus a text summary per workspace and both `lcov.info` files.
- [ ] **Step 3: Gate and commit.** Message: `chore: test coverage reports`. Do not push yet; Task 4 pushes.

### Task 4: SonarQube Cloud and gitleaks in CI

**Files:**
- Create: `sonar-project.properties`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the Task 1 gitleaks image and digest, and the Task 3 LCOV paths.
- **Owner provides:** the SonarQube Cloud organization key and project key (not secrets), and confirms that `SONAR_TOKEN` is saved as a repo secret.

- [ ] **Step 1: Owner setup.** Give the owner the steps, then wait for their "done" and the two keys:
  1. Sign in at sonarcloud.io with GitHub.
  2. Import `gaikwadashutosh35/airaware-ai` into a free organization.
  3. Choose **Analysis method → With GitHub Actions**, which turns automatic analysis off.
  4. Copy the token into **GitHub repo → Settings → Secrets and variables → Actions → `SONAR_TOKEN`**.
- [ ] **Step 2: Write `sonar-project.properties`.**
  - `sonar.organization` and `sonar.projectKey`: the owner's values.
  - `sonar.sources=server/src,client/src,shared`
  - `sonar.tests=server/src,client/src,e2e`
  - `sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,e2e/**`
  - `sonar.exclusions`: the tests, `**/test-fixtures/**` and `client/src/test/**`.
  - `sonar.javascript.lcov.reportPaths=server/coverage/lcov.info,client/coverage/lcov.info`
- [ ] **Step 3: Change `ci.yml`.**
  - **`verify`:** runs `npm run test:coverage` instead of `npm test`, and uploads both coverage folders as an artifact.
  - **`sonar`:**
    - `needs: verify`;
    - `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`;
    - checkout with `fetch-depth: 0`;
    - download the artifact;
    - `SonarSource/sonarqube-scan-action`, pinned by SHA, with `env: SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}`.
  - **`secrets`:** checkout with `fetch-depth: 0`, then `docker run` of the Task 1 image by digest, `git . --redact --verbose`, plus `--config .gitleaks.toml` if that file exists. It runs on push and pull_request.
- [ ] **Step 4: Gate, commit, ask, push.** Gate locally (the YAML is checked by Prettier). Commit with the message `ci: SonarQube Cloud with coverage, and gitleaks on every push`. Ask the owner, then push.
- [ ] **Step 5: Check the first runs.** Expected:
  - all three jobs are green;
  - the Sonar dashboard shows an analysis, with coverage above 0% from both workspaces;
  - gitleaks reports "no leaks found".

  Record Sonar's quality-gate result and its issue counts by type and severity.

### Task 5: CodeQL and reading every scan

- [ ] **Step 1: Ask, then enable CodeQL.** Ask the owner, then run:

```bash
gh api -X PATCH repos/gaikwadashutosh35/airaware-ai/code-scanning/default-setup -f state=configured
```

Expected: `state: configured`, and a CodeQL run starts (javascript-typescript and actions).
- [ ] **Step 2: Read the results.** When CodeQL finishes, read the alerts from `gh api repos/gaikwadashutosh35/airaware-ai/code-scanning/alerts` and Sonar's issues from the web UI or its API. Record each alert or issue in the ledger: source, rule, file:line, the scanner's severity, my grade (spec "Grading") and a one-line reason.

### Task 6: Security audit, code review and accessibility

**Files:**
- Create: `e2e/pages.spec.ts`
- Modify: `ACCESSIBILITY.md` (the keyboard walk record)

- [ ] **Step 1: Security audit.** Run the `security-audit` skill on the whole codebase. Ledger every finding with a grade.
- [ ] **Step 2: Code review.** Run the `code-review` skill at high on `server/src`, `client/src`, `shared` and `e2e`. Ledger every finding with a grade.
- [ ] **Step 3: axe on the static pages** (`e2e/pages.spec.ts`):

```ts
for (const path of ['/', '/privacy']) {
  test(`axe passes on ${path} in a real browser`, async ({ page }) => {
    await page.goto(path);
    await expectNoAxeViolations(page); // colour contrast included
  });
}
```

Run `npm run e2e -- pages.spec.ts`. Expected: 4 passed, or each violation becomes a ledgered finding.
- [ ] **Step 4: Keyboard walk.** Do it in the browser pane, Tab and Shift+Tab only, on:
  - the landing page: search combobox, the action button, the "Why?" panels and links;
  - the dashboard: search, Use my location, household form, Build, Why?, Save plan, saved list Open and Delete with its confirmation, Back to today;
  - the privacy page.

  Record in `ACCESSIBILITY.md`, per page, what was reached, whether focus was always visible, any trap, and the order. Every problem becomes a ledgered finding.
- [ ] **Step 5: Gate and commit.** Message: `test: real-browser axe on the landing and privacy pages; keyboard walk record`.

### Task 7: Fix pass, re-tests and write-up

**Files:** wherever the findings are, plus:
- `THREAT_MODEL.md` and `SECURITY.md` (accepted risks);
- `TESTING_QA.md` §9 and `SETUP.md` (how the scans run);
- `docs/IMPLEMENTATION_PLAN.md` (Phase 8 "as built");
- `CHANGELOG.md`.

- [ ] **Step 1: Fix every Critical and high finding.** For each one: write a test that reproduces it, watch it fail, fix it, watch it pass, run the full gate, and commit. Ledger it as `Fixed <finding> — <test> RED→GREEN, suite N/N`. Fix medium and low ones only when small and clearly right; ledger the rest as accepted, with a reason.
- [ ] **Step 2: Re-test locally.**
  - `SUPABASE_LIVE=1 npm test -w server -- src/services/saved/supabase.live.test.ts`. Expected: 4 passed.
  - `npm run e2e`. Expected: all passed, including `pages.spec.ts`.
- [ ] **Step 3: Write it up.**
  - **Accepted risks** in `THREAT_MODEL.md` / `SECURITY.md`:
    - Playwright not in CI;
    - no schema length cap on AI text (bounded by 8192 output tokens);
    - no automatic cleanup of anonymous accounts until Phase 9;
    - any medium or low finding left open.
  - **How the scans run:** `TESTING_QA.md` §9 and `SETUP.md`.
  - **Phase 8 "as built":** real counts per source (found, fixed, accepted).
  - **`CHANGELOG.md`.**
- [ ] **Step 4: Gate, commit, ask, push, re-check.** Gate, then commit with the message `docs: phase 8 audit as built`. Ask the owner, then push. Expected: CI green, and CodeQL and Sonar re-run. Record the after-fix counts.
