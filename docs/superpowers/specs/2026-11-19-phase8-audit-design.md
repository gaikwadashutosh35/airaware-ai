# Phase 8 — Quality and security audit (design)

Status: approved by the owner, 2026-11-19 ("Approve, start"). Plan: `docs/superpowers/plans/2026-11-19-phase8-audit.md`. Owner choices:
- create the public GitHub repo and push during Phase 8;
- the "original plan" setup: SonarQube Cloud runs inside CI with a `SONAR_TOKEN` and coverage, gitleaks runs in CI on every push, and Playwright stays local.

Sources: `docs/IMPLEMENTATION_PLAN.md` §7 Phase 8; `AGENTS.md` §8 (quality gates) and §10 (reporting); `SECURITY.md`, `THREAT_MODEL.md`, `ACCESSIBILITY.md`, `CODE_QUALITY.md`, `TESTING_QA.md` §8–§10.

## Intent

Phases 1–7 built and tested the product feature by feature. No scanner has run on the codebase as a whole yet, and the code has never been on GitHub. Phase 8 does three things:
- runs the independent scanners and reviews for real;
- fixes what matters;
- writes down what is accepted.

The submission can then show real counts, not claims. It also gives the repo its public home and CI's first run, 8 days before the 29 November deadline.

## Goals

- **Before anything is public:** gitleaks scans the full local history (60 commits) and comes back clean, or each finding is resolved first.
- **The repo goes public:** a public GitHub repo `airaware-ai` under the owner's personal account, `github.com/gaikwadashutosh35/airaware-ai` (owner's choice, not an organization), with one branch, `main`, pushed.
- **CI runs four jobs:**
  - the existing gate (format, lint, typecheck, tests, build), with coverage now produced;
  - a gitleaks job;
  - a SonarQube Cloud scan with coverage;
  - CodeQL through GitHub's default setup (no workflow file).
- **`npm audit`** runs and its result is recorded.
- **Database isolation is re-tested:** the live Supabase test and the live Playwright journey run again at the end.
- **Accessibility:**
  - axe runs in a real browser (colour contrast included) on `/` and `/privacy`, which no real-browser check has covered yet;
  - a manual keyboard walk covers the landing, dashboard and privacy pages.
- **Reviews:** a whole-codebase security audit and a code review, beyond the per-phase diff reviews already done.
- **Fixes:** every Critical and high finding from any source is fixed test-first. Everything else is fixed or listed as accepted, with a reason.
- **Reporting:** every count reported is real: what ran, what it found and what happened to each finding (`AGENTS.md` §10).

## Non-goals

- Running the Playwright suite in CI. It stays local, and that is written down as an accepted gap.
- Deploying (Phase 9).
- Any new feature. That includes the Phase 6, 7 and landing deferred minors, unless an audit grades one high.
- Dependabot, branch protection and other repo settings beyond what this design names.

## Anti-goals (a failure even if it works)

- Making the repo public before the history scan is clean.
- Saying a scanner "passed" when it did not run, or reporting counts nobody read (`CLAUDE.md`).
- Silencing a finding to get a green gate: no blanket ignores, and every exclusion carries a narrow reason (`.claude/rules/testing-security.md`).
- Handling the `SONAR_TOKEN`, a password or any secret value. The owner creates and stores the token; I never see it.

## Constraints

- **Every push needs the owner's yes at that moment** (standing rule), and so does creating the repo. Expect three pushes:
  1. the code as it is, after the history scan;
  2. the CI changes, once the Sonar token exists;
  3. the fixes.
- **Changing repo settings needs a yes too:** switching on CodeQL default setup, and secret scanning or push protection if they are off.
- **New dependency:** one dev dependency, `@vitest/coverage-v8`, the version matching Vitest 5, at the root.
- **Downloads:** gitleaks's official Docker image needs a yes before the first pull (I state its name and size).
- **Pinning:** GitHub Actions stay pinned by commit SHA, as in `ci.yml`, and Docker images by digest. The workflow keeps `permissions: contents: read` plus only what each job needs.
- **Repo rules:** under 10 MB (it is 0.5 MB today), one branch.

## Approaches (owner chose 2, "original plan")

1. **Light setup:** a one-off gitleaks scan, SonarQube Cloud automatic analysis (no token, no coverage) and Playwright failure tests in CI. Less to maintain, fewer continuous checks.
2. **Original plan (chosen):**
   - gitleaks in CI on every push;
   - a Sonar scan in CI with coverage;
   - Playwright local.

   More setup, continuous scanning, and coverage numbers in Sonar.

## The order of work

1. **Local checks first:**
   - the gitleaks history scan through Docker, with `--redact` so no secret is printed;
   - `npm audit`;
   - the repo size.

   A real finding in history stops everything and comes to the owner before any push. A test placeholder (for example `sb_publishable_test`) gets a narrow allowlist entry with a reason.
2. **Create and push (yes needed):** `gh repo create airaware-ai --public --source . --push`, run from `main`. Then confirm that CI's existing job runs green on GitHub.
3. **Owner steps** (I give exact clicks and never touch the token):
   1. sign in to SonarQube Cloud with GitHub;
   2. import `airaware-ai`;
   3. choose analysis with GitHub Actions, with automatic analysis off;
   4. add `SONAR_TOKEN` as a repo secret.

   They tell me the organization key and project key, which are not secrets.
4. **CI changes, then push (yes needed):**
   - `sonar-project.properties` with:
     - sources: `server/src`, `client/src`, `shared`;
     - tests: `*.test.ts(x)` and `e2e`;
     - exclusions: build output and fixtures;
     - LCOV paths for both workspaces.
   - A `test:coverage` script in each workspace. CI runs it instead of `npm test`, so tests run once.
   - A `sonar` job using SonarSource's scan action, pinned.
   - A `secrets` job running gitleaks on the full history (`fetch-depth: 0`), by pinned image digest, with `--redact`.
5. **CodeQL default setup on (yes needed),** then wait for the first CodeQL and Sonar results.
6. **Reviews:**
   - the `security-audit` skill on the whole codebase;
   - the `code-review` skill (high) on `server/src`, `client/src`, `shared` and `e2e`.
7. **Accessibility:**
   - a small Playwright spec (`e2e/pages.spec.ts`) running axe on `/` and `/privacy` at both sizes;
   - the manual keyboard walk in the browser pane, recorded in `ACCESSIBILITY.md`.
8. **Fix pass:** every Critical and high finding from CodeQL, Sonar, gitleaks, `npm audit`, the reviews and the keyboard walk. Each gets a failing test first, then the full gate. Medium and low findings are either fixed (when small and clearly right) or listed with a reason.
9. **Re-tests:**
   - the live Supabase isolation test;
   - `npm run e2e`;
   - CodeQL and Sonar again after the fixes push (yes needed).
10. **Docs:**
    - Phase 8 "as built", with real counts per source;
    - accepted risks in `THREAT_MODEL.md` / `SECURITY.md`;
    - how the scans run, in `TESTING_QA.md` §9 and `SETUP.md`;
    - `CHANGELOG.md`.

## Grading

- **Critical:**
  - data exposure across users;
  - a secret in the repo;
  - an injection or auth bypass;
  - stale or invented air data shown as current.
- **High:**
  - a reachable crash or denial of service;
  - a missing ownership or validation check;
  - an accessibility failure that blocks a task;
  - a dependency with a known exploitable vulnerability in production code.
- **Medium and low:** everything else.

A scanner's own severity is advice. The grade is what a real person gets if it ships, and I record any grade I change.

## Known items the audit should weigh (from earlier phases)

- **Phase 6 minors:**
  - a bad `VITE_SUPABASE_URL` blanks the dashboard;
  - timestamp format;
  - a slow load overwrites edits;
  - focus is lost after a delete;
  - some 4xx errors map to 401;
  - the live test can leak an account.
- **Phase 7 minors:**
  - deleting a single plan gives no "Deleted" message;
  - snapshot "today" wording;
  - the chart with 0 hours and an assumed unit;
  - the e2e cleanup doesn't check its result.
- **Landing minors:**
  - the server typecheck now includes a client file;
  - the Hallmark stamp is out of date.
- **AI text length:** Gemini's summary and "For you" text have no schema length cap. Output is bounded by `maxOutputTokens` 8192.
- **Bundle:** the client JS is 483 KB minified, 137 KB gzipped.
- **Other risks:** unused anonymous accounts are not cleaned up (Phase 9), and the server has no request logging (by design, for privacy).

## Settled after the builder check

**Answered by the repo:**
- **CI needs no secrets for tests.** The live Supabase and Gemini tests are skipped unless `SUPABASE_LIVE` / a Gemini live flag is set (5 skipped today), and the rest is mocked. `test:coverage` needs no env.
- **What gets published:**
  - `.superpowers/`, `.playwright-mcp/`, both `.env` files, `client/dist/` and `test-results/` are ignored, so they are never published.
  - `.claude/rules/*` and `.claude/launch.json` are tracked on purpose (project rules, dev-server config). The history scan covers them like everything else.
- **`e2e/pages.spec.ts`** uses the existing Playwright config. `/` and `/privacy` are static and need no Supabase.

**My calls:**
- **When the Sonar job runs:** on pushes to `main` only. There is one branch and no outside PRs, so a fork never runs it without the token.
- **The Sonar quality gate is advisory:** CI does not wait on it. The analysis must run, and its gate result and issues are read and recorded like any other finding. A red gate is not silenced; its issues enter the fix pass by grade.
- **gitleaks:** runs in CI on every push and PR, from the official Docker image by digest, as in the local scan. One `.gitleaks.toml` serves both, and only if a test placeholder needs a narrow, commented allowlist entry.
- **`npm audit`:** runs locally and its result is recorded. It is not a CI job.
- **If the history scan finds a real secret:**
  1. Stop.
  2. Rotate that secret first.
  3. The owner then chooses between rewriting history and starting the public repo from a fresh single commit.

## Left to the builder

- Exact Sonar exclusion globs.
- The job layout in `ci.yml` (one workflow).
- The gitleaks version and digest.
- Test names.
- How findings are grouped in the report.
