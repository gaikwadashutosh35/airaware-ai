# AirAware AI — QA report (assistant redesign, Phase 10)

Follows `TESTING_QA.md` §11. Each field says what was actually run; a field still open says so.

```text
Date: 21 Nov 2026
Commit: 934678c (the run after the Task 4 fixes); live at 7a6aa05; 5254a29 fixes the two SonarCloud issues (local)
Build: pass (npm run build)
Typecheck: pass
Lint: pass (oxlint --deny-warnings); format: pass
Unit: server 320 passed, 5 skipped; client 458 passed (at 5254a29: server 321 passed, 5 skipped; client 458)
API: in the server suite (route tests against the Express app)
E2E: 294 passed, 82 skipped (desktop-only size runs in the phone project), local build on port 8090 (at 5254a29: 294 passed, 82 skipped; build pass); live: 294 passed, 82 skipped against https://airaware-ai.netlify.app at 7a6aa05, 21 Nov 2026 06:03–06:15 UTC, the journey passing on desktop and Pixel 7
Accessibility: see ACCESSIBILITY.md "Results (Phase 9)"
CodeQL: 0 open alerts; the javascript-typescript and actions analyses of 7a6aa05 returned 0 results
SonarQube: SonarCloud quality gate FAILED at 7a6aa05 on new reliability (rating C, 2 bugs: typescript:S5850 ask.ts:140, typescript:S2137 Landing.tsx:65; both predate Phase 10); security, maintainability, new coverage 97.6%, duplication 0.4% and hotspots reviewed passed. Both fixed in 5254a29; the gate PASSED at 6a1deb5 (reliability A, 0 open bugs; every condition OK). gitleaks: no leaks found (234 commits)
Data provider and data kind: Open-Meteo, model_forecast (live Pune check, /api/v1/air-quality/forecast?latitude=18.52&longitude=73.86)
Timestamp/freshness: retrievedAt 2026-11-21T06:02:49Z, under a minute old when checked
Critical issues: none. Task 4 review: 0 Critical, 0 Important; two Minors re-graded Important and fixed in dcebdaf and 934678c ("bad air" in the AI check; the plan names its air where no verdict shows); 10 Minors deferred. The new air line was seen by eye at 320 on My Home; 1280 and Today's split-failure state are covered by the unit tests and the e2e layout checks, not by eye
Known limitations: model forecasts only (CPCB observations not connected); the CAMS grid is about 45 km; the 10 deferred Minors in the Phase 10 report; the owner's phone check after the final fixes (geolocation over HTTPS, bottom bar, notched landscape) is open
Release decision: released at 7a6aa05 (the owner approved the push); every release-gate item is met; the SonarCloud gate passed at 6a1deb5 after the fixes in 5254a29
```

## Browser review (Task 1)

**How:**
- Every page and state at 320×640, 768×1024 and 1280×800 in Chromium, at rest (reduced motion).
- The forecast, plan, Ask answer and place search were answered with the test fixtures so each state is repeatable.
- The first screens were looked at side by side, plus the phone's whole page.
- Headless Chromium has no scrollbar. The header with a real 15 px scrollbar was checked separately in the built-in browser in Phase 9 (one nav row, nothing scrolling, focus rings whole).

**Looked at:** the landing, Privacy, Today (within, above, stale and loading), Ask (empty, and with an answer), My Home, Better Habits, My Profile, Welcome steps 1–3, and the place dialog with suggestions.

**Found:** no defects needing a code change. Notes:
- **My Profile at 1280:** the household form fills the left column and the right one is empty sky, because that column only holds a remembered place and saved plans. That's a design call, not a defect; the owner may prefer the form to span both columns when the right one is empty.
- **Short pages at 768 and 1280** (Welcome): the solid footer ends mid-screen with the sky and the whole city below it. This is the backdrop design ("each page ends on the whole city").
- **The place dialog at 320:** the open suggestion list covers "Use my location" and "Close" below it, as a dropdown does. The list closes on a choice or Escape.
- **Not app issues:** the review's own fixtures caused three things seen in the shots. These were a "more than an hour old" note on the plan, an old Ask answer showing "Not current", and its topic chip not matching the question. The e2e tests stamp these fixtures with the current time.

**`DESIGN.md` §13 design acceptance checklist:**

| Item | Met? | Evidence |
|---|---|---|
| An identifiable environmental-tech visual identity | Yes | Navy bars, teal actions and Inter on every page; the adaptive city sky behind every app page; the dark editorial landing |
| Marketing and app related, but each fit for its job | Yes | The same palette, type and wordmark; the landing is a dark story with one call to action, the app light panels with one answer each |
| Source, time and data kind visible | Yes | Today: "Model forecast · Open-Meteo · updated 10:21 AM"; Ask: "Using: the Pune, Maharashtra model forecast, updated …"; every app footer: "Background: model forecast for …" |
| No unsupported certainty | Yes | "Forecast within India's 24-hour limits", with "Being within the national limit does not mean the air is clean or free of risk"; the "Not current" banner when stale |
| Mobile and desktop usable | Yes | This review at 320, 768 and 1280; `e2e/responsive.spec.ts` (edges, targets, zoom, spacing); the owner's phone check |
| Keyboard navigation and reduced motion work | Yes | `e2e/keyboard.spec.ts`; the reduced-motion e2e checks; rings checked by eye in Phase 9 |
| Empty, stale, error and loading states designed | Yes | Loading (skeleton over the still city), stale (banner and "Not current." in the footer), the error card, and Ask before a question: all seen here, and checked at 320 by the other-states tests |
| All controls have real functionality | Yes | The journey e2e (search, plan, explain, save, reload, isolation, delete); no inert control seen in this review |

## Release gate (Task 3, `TESTING_QA.md` §10)

| Item | Result | Evidence |
|---|---|---|
| Build, typecheck and lint pass | Yes | The run above, each step with its own exit code 0 |
| Critical provenance tests pass | Yes | `openMeteo.test.ts` "maps the recorded response into a labelled model forecast"; `airQuality.test.ts` "returns a labelled model forecast whose run age is unknown"; `TodayLead.test.tsx` "the verdict leads, with its tag, provenance and caveat"; `e2e/copy.spec.ts` |
| Invalid AI output is rejected | Yes | `personalize.test.ts` "retries once after invalid JSON", "fenced JSON is invalid", "gives up after two schema failures"; `claude.test.ts` "rejects a refusal", "rejects a cut-off answer", "rejects an answer without text" |
| No unresolved critical authorization issue | None known | The journey's isolation step (a second anonymous user sees only its own plan) passed; Task 4's review checks this again |
| Main E2E path passes | Yes | `e2e/journey.spec.ts` on desktop and Pixel 7, in the run above |
| Accessibility check completed | Yes | `ACCESSIBILITY.md` "Results (Phase 9)" |
| Production data provider and timestamps verified | Yes | Live, 21 Nov 2026: Pune forecast `model_forecast` from Open-Meteo, `retrievedAt` under a minute old; health 200; `/`, `/app`, `/privacy` 200; the CSP on `/app` equals the API's |
| Public, one branch, under 10 MB with history | Yes | GitHub: public, default `main`, one remote branch; `git count-objects -vH`: 1.27 MiB packed |
| README and deployment claims accurate | Yes | Corrected in Task 3; the live site and the DEPLOYMENT "After every deploy" checks confirmed in Task 5 |

## 22 Nov 2026 releases

Six pushes to `main`, each on the owner's word. Same rule as above: each field says what was actually run.

```text
Date: 22 Nov 2026
Commit: 868e945; 7758d3f to cd19595 (5 commits); 803697c; 4d2d4ed; 1c0cd94; 3c5f5e1 (live)
Build: pass at every release; each time the live script bundle matched the local build
Typecheck: pass. The full local gate ran on the committed tree at cd19595, 4d2d4ed and 1c0cd94. At 868e945 and 3c5f5e1 it ran before a last edit (see the table). At 803697c it did not run locally. CI verify ran it on every final tree
Lint: pass (oxlint --type-aware --deny-warnings); format: pass. Same coverage as typecheck; after each last edit, lint and Prettier ran again on the touched files (Prettier only at 803697c)
Unit: server 330 passed, 5 skipped at every full local gate; client 486 (868e945), 493 (cd19595), 494 (4d2d4ed), 499 (1c0cd94 and 3c5f5e1). On the final tree where the gate came earlier: the Landing unit tests (18) at 3c5f5e1; the 89 air-quality client tests at 803697c. CI verify ran the full suites on every final tree
API: in the server suite (route tests against the Express app)
E2E: local build on port 8090: 305 passed, 83 skipped at 868e945; 309 passed, 83 skipped at cd19595, 4d2d4ed, 1c0cd94 and 3c5f5e1. The 3c5f5e1 run started before its review fix to e2e/landing.spec.ts; the fixed spec then passed on its own (10 tests). None locally at 803697c. Live against https://airaware-ai.netlify.app after each deploy: 305 passed, 83 skipped (868e945); 309 passed, 83 skipped (each of the other five, the fixed Landing spec included)
Accessibility: axe in the client component tests and in seven e2e specs (through e2e/axe.ts); keyboard paths in e2e/keyboard.spec.ts; all inside the runs above. No manual keyboard review recorded today
CodeQL: the javascript-typescript and actions analyses returned 0 results at all six commits; 0 open alerts after 3c5f5e1
SonarQube: SonarCloud quality gate passed at 868e945; FAILED at cd19595 on new reliability (rating C, typescript:S7727 in skylineGeometry.ts); fixed in 803697c, and the gate PASSED at 803697c, 4d2d4ed, 1c0cd94 and 3c5f5e1 (0 new-code issues at 3c5f5e1). gitleaks: the CI secrets job passed at all six commits
Data provider and data kind: model_forecast (live Pune check after each deploy); Open-Meteo is the only forecast source
Timestamp/freshness: retrievedAt under a minute old at each check; the last 2026-11-22T09:27:15Z
Critical issues: none. Reviews (counts are the reviewers' grades): 868e945, 2 Minors (1 refuted, 1 fixed before commit); the cityscape release, 7 findings, no Critical (1 Important re-graded Minor, 1 refuted), 6 Minors deferred and fixed in 4d2d4ed; 4d2d4ed, none; 1c0cd94, 10 Minors (3 refuted), the rest fixed or ruled on before commit; 3c5f5e1, 1 Minor, fixed before commit. 803697c had no review. No deferred minors left from today's reviews
Known limitations: model forecasts only (CPCB observations not connected); the CAMS grid is about 45 km; the 10 deferred Minors in the Phase 10 report are still open; the owner's phone check from Phase 10 is not recorded as done; the overcast, rain, unknown and stale skies were judged from code and colour maths, not screenshots; the 700 ms fade was probed in Chromium only
Release decision: released; live at 3c5f5e1. cd19595 was live with a failed SonarCloud gate for about 70 minutes, until 803697c
```

| Release | Pushed (UTC) | What changed | Local check | Live bundle |
|---|---|---|---|---|
| `868e945` | 02:43 | My Home reloads its sky with its plan; the footer line names the level | Full gate, then a wording fix to a comment and two docs (Prettier and oxlint on the touched code files) | `index-D2n2xEHP.js` |
| `7758d3f` to `cd19595` | 04:47 | The mixed-street city with no landmark, the 700 ms fade, the design docs | Full gate | `index-4DDnFT7p.js` |
| `803697c` | 05:57 | The S7727 fix (one code line and its comment) | Port check equal, 89 air-quality tests, Prettier | `index-i1A40lK4.js` |
| `4d2d4ed` | 06:48 | The cityscape review's 6 deferred Minors | Full gate | `index-CBT1jNAU.js` |
| `1c0cd94` | 08:29 | No fog band; old weather drops off; the rain layer stays mounted; My Home's sky follows a newer plan | Full gate | `index-oZrEVMxZ.js` |
| `3c5f5e1` | 09:26 | Both Landing screenshots recaptured from the live app (Pune, 09:02 UTC) | Full gate before the review fix; then the Landing e2e spec (10), the Landing unit tests (18), and lint and Prettier on the touched files | `index-DxIPXNlG.js`; both image files match the build |

**After every deploy:** checks 1–4 passed (health 200; `/`, `/app` and `/privacy` 200; the Pune forecast is `model_forecast` and under a minute old; the CSP on `/app` equals the API's). The CI verify, secrets and sonar jobs succeeded. The sonar job uploads the analysis and does not enforce the gate, so the gate is read separately.

**Seen by eye:**
- **The city as shipped in cd19595:** one contact sheet (within, above and loading at 320, 390, 768 and 1280; within at 1920) and a crop of the bands. No city screenshot was taken after 4d2d4ed or 1c0cd94.
- **The Landing:** the hero at 1280 and the details at 320. The reviewer opened the other two and checked both new captures' content, size and metadata (no EXIF).

**Not in this report:** `7e3a992` and `9529bde`, pushed on 21 Nov after the Phase 10 results above.
