# Phase 1 — Repository and Quality Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An npm-workspaces monorepo (`server`, `client`) with strict TypeScript, lint, format, tests, a health endpoint, and CI — all green locally.

**Architecture:** Express 5 API run directly as TypeScript by Node's built-in type stripping (no server build step). Vite 8 + React 19 client from the official template, trimmed. One Cloud Run service later serves both (ADR-005).

**Tech Stack:** Node ≥24 (local 26.13), npm 11 workspaces, TypeScript ~7.0.2, Express 5, Helmet 8, Zod 4, Vitest 5, Supertest 7, React 19, Vite 8, oxlint (+ oxlint-tsgolint), Prettier 3, GitHub Actions.

**Spec:** `docs/IMPLEMENTATION_PLAN.md` §7 Phase 1 (Option B selected).

## Global Constraints

- One branch `main`; no worktrees; nothing committed or pushed without owner's yes.
- `.gitignore` exists before any `git add`.
- Repo stays far below 10 MB: no template images, no `dist/`, no reports.
- TypeScript strict mode, set explicitly in every tsconfig.
- No secrets in tracked files; `.env` ignored, `.env.example` tracked.
- Health endpoint: `GET /api/v1/health` → exactly `{ "status": "ok", "version": "<server package.json version>" }`.

## Deviations from IMPLEMENTATION_PLAN §7 Phase 1 (simplifications)

| Planned | Built instead | Why |
|---|---|---|
| ESLint + plugins | oxlint (template default) with `typescript`, `react`, `jsx-a11y`, `oxc` plugins + type-aware mode | Already in the official template; typescript-eslint does not support TS 7 (`<6.1.0`); `eslint-plugin-jsx-a11y` does not support ESLint 10 |
| `shared/` workspace | Deferred to Phase 2 | No shared contract exists yet (YAGNI) |
| `tsconfig.base.json` | Per-workspace tsconfig | Only one non-template tsconfig |
| `express-rate-limit` | Deferred to Phase 2 | First rate-limited route arrives in Phase 2 |
| `client/.env.example` | Deferred to Phase 6 | No client variables until Supabase |
| `tsx` | `node --watch` | Node runs `.ts` natively |

## Review Focus

1. `PORT` set to a non-number or out of range → startup fails with a message naming `PORT` (Task 2 test).
2. Unknown API path → JSON `NOT_FOUND` envelope, not Express HTML (Task 2 test).
3. Health response leaks extra fields → exact-body equality test (Task 2 test).
4. Security headers missing → test asserts `x-powered-by` absent and `x-content-type-options: nosniff` (Task 2 test).
5. A fresh clone fails because the lockfile is missing or stale → `npm ci` run in Task 5 verification.

---

### Task 1: Repository root

**Files:** Create `.gitignore`, `package.json`, `.prettierrc.json`, `.prettierignore`.

- [ ] `git init -b main`.
- [ ] `.gitignore`: SETUP.md §9 list + `*.local`, `.vscode/*`, `!.vscode/extensions.json`, `.idea`, `*.tsbuildinfo`.
- [ ] Root `package.json`: `"name": "airaware-ai"`, `"private": true`, `"type": "module"`, `"workspaces": ["server", "client"]`, `"engines": { "node": ">=24" }`; scripts `typecheck`, `test`, `build` → `npm run <x> --workspaces --if-present`; `lint` → `oxlint --type-aware --deny-warnings`; `format` / `format:check` → `prettier --write|--check .`.
- [ ] `.prettierignore`: `*.md`, `package-lock.json` (docs keep their current formatting).
- [ ] Verify: `git status` shows only intended files.

### Task 2: Server workspace with health endpoint (TDD)

**Files:** Create `server/package.json`, `server/tsconfig.json`, `server/.env.example`, `server/src/config/env.ts`, `server/src/config/env.test.ts`, `server/src/app.ts`, `server/src/app.test.ts`, `server/src/server.ts`.

**Interfaces — Produces:**
- `loadEnv(source: Record<string, string | undefined>): Env` where `Env = { NODE_ENV: 'development' | 'test' | 'production'; PORT: number }`; defaults `development`, `8080`; throws `Error` whose message contains the invalid key.
- `createApp(): express.Express` — no `listen`; mounts `GET /api/v1/health` and a JSON 404.

- [ ] **Write failing tests**
  - `env.test.ts`: `loadEnv({})` → `{ NODE_ENV: 'development', PORT: 8080 }`; `loadEnv({ PORT: '3000' }).PORT === 3000`; `loadEnv({ PORT: 'abc' })` throws `/PORT/`; `loadEnv({ PORT: '70000' })` throws `/PORT/`; `loadEnv({ NODE_ENV: 'staging' })` throws `/NODE_ENV/`.
  - `app.test.ts`: `GET /api/v1/health` → 200, body `toEqual({ status: 'ok', version: pkg.version })`; header `x-powered-by` undefined; `x-content-type-options === 'nosniff'`; `GET /api/v1/nope` → 404 body `toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found.' } })`.
- [ ] Run `npm test -w server` → FAIL (modules missing).
- [ ] Implement `env.ts` (Zod `z.coerce.number().int().min(1).max(65535)`, `z.prettifyError` for message) and `app.ts` (`helmet()`, health router, 404 handler). Version via `import pkg from '../package.json' with { type: 'json' }`.
- [ ] `server.ts`: `loadEnv(process.env)` then `createApp().listen(env.PORT)` and log one line with the port.
- [ ] Scripts: `dev` = `node --watch --env-file-if-exists=.env src/server.ts`, `start` = `node src/server.ts`, `typecheck` = `tsc --noEmit`, `test` = `vitest run`.
- [ ] Run `npm test -w server` → PASS; `npm run typecheck -w server` → no errors; `npm run dev -w server` then `curl localhost:8080/api/v1/health` → ok JSON.

### Task 3: Client workspace from the official template

**Files:** Generate `client/` via `npm create vite@latest client -- --template react-ts --no-interactive`; then delete `client/README.md`, `client/.gitignore`, `client/.oxlintrc.json`, `client/public/*`, `client/src/assets/*`, `client/src/App.css`; replace `client/src/App.tsx`, empty `client/src/index.css`; create `client/src/App.test.tsx`; modify `client/package.json`, `client/index.html`, `client/vite.config.ts`, `client/tsconfig.app.json`, `client/tsconfig.node.json`.

- [ ] **Write failing test** `App.test.tsx`: renders `<App />`; `screen.getByRole('heading', { level: 1, name: 'AirAware AI' })` exists; exactly one `main` landmark.
- [ ] Run `npm test -w client` → FAIL (template App has no such heading).
- [ ] `App.tsx`: `<main>` with `<h1>AirAware AI</h1>` and the tagline `Breathe smarter. Make informed daily choices.`; no controls.
- [ ] `index.html`: title `AirAware AI`; remove favicon link.
- [ ] `vite.config.ts`: `defineConfig` from `vitest/config`, `test: { environment: 'jsdom' }`.
- [ ] `tsconfig.app.json` / `tsconfig.node.json`: add `"strict": true`; app gets `"types": ["vite/client", "vitest/globals"]` only if needed by tests (prefer explicit imports, no globals).
- [ ] `client/package.json`: name `@airaware/client`; remove `oxlint` devDep and `lint` script (root owns lint); add `typecheck` = `tsc -b`, `test` = `vitest run`; devDeps `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`.
- [ ] Run `npm test -w client` → PASS; `npm run build -w client` → `client/dist` produced (ignored by git).

### Task 4: Lint, format, CI

**Files:** Create `.oxlintrc.json`, `.github/workflows/ci.yml`. Modify root `package.json` devDeps.

- [ ] Root devDeps: `oxlint`, `oxlint-tsgolint`, `prettier`.
- [ ] `.oxlintrc.json`: plugins `typescript`, `react`, `jsx-a11y`, `oxc`; template's two react rules; `ignorePatterns`: `dist`, `coverage`.
- [ ] `npm run lint` → 0 warnings, 0 errors. If `--type-aware` cannot run with TS 7, drop the flag and the `oxlint-tsgolint` dep, and record it.
- [ ] `npm run format` once, then `npm run format:check` → clean.
- [ ] `ci.yml`: on push to `main` and pull_request; `permissions: contents: read`; ubuntu-latest; checkout + setup-node (Node 26, npm cache) pinned by commit SHA with version comment; steps `npm ci`, `format:check`, `lint`, `typecheck`, `test`, `build`.

### Task 5: Documentation and final verification

**Files:** Modify `ARCHITECTURE_DECISIONS.md` (ADR-005), `ARCHITECTURE.md` §2 hosting row + §9, `SETUP.md` §6/§8 (port 8080, no `CLIENT_URL`), `README.md` technology line, `CODE_QUALITY.md` lint row, `CHANGELOG.md`, `docs/IMPLEMENTATION_PLAN.md` (Phase 1 as-built note).

- [ ] Write the doc edits above — facts only, nothing claimed that is not built.
- [ ] Clean-install check: delete `node_modules`, run `npm ci` → succeeds.
- [ ] Run `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` → all pass; paste real output in the report.
- [ ] `git status` + `git add -A --dry-run` reviewed: no `.env`, `node_modules`, `dist`, images.
- [ ] Report to owner; commit only after owner says yes.
