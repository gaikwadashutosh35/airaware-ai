> R0 record. Owner rulings: J30 in OWNER_DECISIONS.md. Scripts and raw data (cap-local.mjs, metrics.json, e2e1.log) were kept in the session scratchpad, not in the repo.

# R0 re-baseline (28 Nov 2026, HEAD 4ebe6fb, branch main)

All numbers are **local**: lab runs on a Windows dev machine, unthrottled, one run each, indicative only. No app, source, test or doc file was changed. Nothing ran against production. No `.env` file was opened.

## 1. Per page lab metrics (script: `scratchpad/r0/cap-local.mjs`, raw: `metrics.json`)

Method: a copy of the Stage 0 capture, adapted to local mode. The built client was served by `node server/src/server.ts` on port 8191, started without `--env-file` after the harness refused the env-file launch. A fresh browser context per page and viewport. Forecast, plan, guides, sources, reverse geocode and fires were stubbed with `e2e/layout.ts stub` and `e2e/routes.ts` (level `not_elevated`). Any non-GET `/api` call other than the stubbed daily-plan POST, and any external host, was aborted; the abort log was empty. The assistant answer endpoint was never reached (no question was asked). CLS and LCP come from a PerformanceObserver with `buffered: true`, read after networkidle, fonts ready and 700 ms.

### CLS / LCP (CLS first)

| Page | 320x640 | 390x844 | 768x1024 | 1280x720 | 1440x900 |
|---|---|---|---|---|---|
| Landing | 0 / 496 ms | 0 / 240 ms | 0 / 260 ms | 0 / 256 ms | 0 / 260 ms |
| Today | 0 / 276 ms | 0 / 308 ms | 0 / 424 ms | 0 / 420 ms | 0 / 364 ms |
| Ask | 0 / 236 ms | 0 / 248 ms | 0 / 220 ms | 0 / 228 ms | 0 / 252 ms |
| My Home | 0 / 252 ms | 0 / 276 ms | **0.111** / 312 ms | 0.026 / 300 ms | 0.052 / 344 ms |
| Better Habits | 0 / 192 ms | 0 / 200 ms | 0.088 / 212 ms | 0 / 216 ms | 0.004 / 228 ms |
| My Profile | 0 / 208 ms | 0 / 212 ms | 0 / 220 ms | 0 / 228 ms | 0 / 232 ms |

- Only one cell is over the 0.1 gate: My Home at 768x1024 (0.111).
- Stubbed replies come back instantly, so local CLS is much lower than the production Stage 0 figures (Today 0.104-0.283, My Home 0.199-0.468, Better Habits 0.143-0.314). Use these as the local floor for PF-01 ("no phase raises any page above its R0 local baseline").

### Horizontal overflow (scrollWidth > clientWidth)

None. All 30 page and viewport cells had scrollWidth equal to clientWidth (320/320 through 1440/1440).

### Targets under 44x44 (e2e `smallTargets` rule, controls only)

0 on all 30 cells.

### Inline links in a sentence under 44x44 (exempt by the helper; listed separately)

| Page | 320x640 | 390x844 | 768 / 1280 / 1440 |
|---|---|---|---|
| Landing, Today, My Home, Better Habits, My Profile | 1 (Open-Meteo.com) | Open-Meteo.com 117x17 | 1 (Open-Meteo.com) |
| Ask | 3 | Edit 25x17, Open-Meteo.com 100x15, Privacy 42x15 | 3 |

The sizes at 390 match the R1 "before" values (117x17; 25x17, 100x15, 42x15). Sizes were recorded in detail at 390x844 only. At the other widths only the count was kept (the same 1 or 3 links).

## 2. Script size (`npm run build -w client`, then `gzip -9` on `client/dist`)

| File | Raw B | gzip -9 B |
|---|---|---|
| assets/index-C9-feLjc.js | 580,267 | **164,922** |
| assets/index-Bn1_HEIV.css | 48,894 | 9,860 |
| JS + CSS | 629,161 | 174,782 |

- Vite's own report says 167.08 kB gzip for the JS (default level, decimal kB). It differs from gzip -9, so use one method consistently.
- `today-phone-CfsCZECQ.jpg` is 125.36 kB, an image and not counted.
- The build warns that the single chunk is over 500 kB.
- The local figure was 164,692 B in doc 08, so it is +230 B (+0.14 %) since then.

### PF-03 re-set proposal (doc 15 §3: "re-baseline in R0, then at most 2 kB gzip over the R0 figure per phase")

- **R0 baseline:** 164,922 B gzip -9 (JS). CSS tracked separately at 9,860 B.
- **Ceiling after each of R1-R8:** 166,970 B (164,922 + 2,048) for JS. This is the R0 figure plus 2 kB, not cumulative; a phase may not add more than 2 kB over what the previous accepted phase measured.
- **No package may be added** (Q-17).
- **The old 155 kB gate** is already exceeded by about 9.9 kB (164,922 vs 155,000, decimal) and stays exceeded. Getting back under needs route splitting (F-37), a separate approval.
- **Method for later phases:** measure with the same `gzip -9` command, and quote Vite's figure only as a cross-check.
- **Needs owner approval** (R0 gate).

## 3. Test baseline

| Check | Result |
|---|---|
| `npm test` server | 446 passed, 27 skipped (40 files passed, 3 skipped) |
| `npm test` client | 709 passed (49 files); doc 01 recorded 708, so +1 |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, no warnings |
| `npm run format:check` | exit 0, all files formatted |

### Stubbed e2e (`npm run e2e -- ask backdrop copy failures firstscreen keyboard landing pages responsive scene`, doc 15 §1.2, 20.6 min)

`journey.spec.ts` and `onboarding.spec.ts` were left out. They are the live specs (Open-Meteo and Supabase, and daily-plan/assistant references), and running them could reach an AI provider. This is why the count is not like for like with the 24 Nov figure (309 passed, 83 skipped, G-06).

| Project | Passed | Skipped | Failed |
|---|---|---|---|
| desktop | 400 | 1 | 0 |
| phone | 294 | 107 | 0 |
| **Total** | **694** | **108** | **0** |

- No worker crash, no flaky tests (JSON reporter: flaky 0), so no `--workers=1` rerun was needed.
- Skip reasons by file: desktop skips the branded 404 test (`pages.spec.ts:51`). The phone project skips the same test, plus most of `responsive.spec.ts` (the size-matrix and zoom tests, which set their own viewport and are written for the desktop project).
- The e2e server is Playwright's own, on port 8090, started with `server/.env` as the config does. It sent no AI call, because every AI endpoint is stubbed in these specs.

## 4. Housekeeping

- Servers started: Playwright's webServer on 8090 (ended with the run) and my own on 8191 (killed by PID). A check afterwards found 0 listeners on 8090 and 8191; only TIME_WAIT sockets remain on 8090.
- Port 5174 belongs to another process and was not touched.
- Files written: only under `scratchpad/r0/` (`cap-local.mjs`, `metrics.json`, `e2e1.log`, `server8191.log`, `tbl.txt`, this report).
