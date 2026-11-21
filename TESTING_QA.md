# AirAware AI — Testing and Quality Assurance

## 1. Objectives

Verify product usefulness, data provenance, recommendation consistency, AI safety, authorization, privacy, accessibility, performance, and challenge compliance.

## 2. Recommended tools

- Vitest: unit tests.
- React Testing Library: frontend components.
- Supertest: API integration tests.
- Playwright: end-to-end/browser tests.
- axe-core: accessibility scans.
- TypeScript: compile-time checks.
- ESLint: code quality rules.
- CodeQL: security-focused static analysis.
- SonarQube Cloud: maintainability/reliability/security analysis.

## 3. Example scripts

Actual names must match `package.json`; recommended root scripts:

```json
{
  "scripts": {
    "typecheck": "npm run typecheck --workspaces",
    "lint": "npm run lint --workspaces",
    "test": "npm run test --workspaces",
    "build": "npm run build --workspaces",
    "test:e2e": "playwright test"
  }
}
```

If npm workspaces are not used, run scripts separately in `client/` and `server/`. Do not commit `node_modules`, Playwright browser binaries, or test output.

## 4. Critical test matrix

| Area | Test | Expected result |
|---|---|---|
| Location | Geolocation denied | Manual search remains available |
| Provenance | CPCB observation | Official observation label and timestamp |
| Provenance | Open-Meteo forecast | Model forecast label, not CPCB station reading |
| Provenance | Demo fixture | Visible DEMO label |
| Freshness | Old timestamp | Stale, never called current |
| AQI | PM2.5 only | Concentration shown; no invented National AQI |
| AQI | US/EU index | Not mapped to CPCB field |
| AI | Malformed JSON | Rejected safely |
| AI | Prompt injection | Trusted system constraints retained |
| AI | Medical request | No diagnosis/treatment advice |
| Rules | Outdoor exercise | Context-aware suggestion and reason |
| Rules | Cooking smoke | Source-control guidance |
| Rules | Poor outdoor + indoor sources | No blanket open/close-window instruction |
| Security | Cross-user plan | Access denied |
| Privacy | GPS denied | No precise coordinates persisted |
| UX | Mobile viewport | No horizontal overflow |
| Accessibility | Keyboard-only | Core flow usable |

## 5. CPCB category tests

- 0–50 Good.
- 51–100 Satisfactory.
- 101–200 Moderate.
- 201–300 Poor.
- 301–400 Very Poor.
- 401–500 Severe.

Test boundary values, out-of-range input, null values, averaging periods, required pollutant availability, and index methodology. The UI must distinguish an official CPCB category from forecast-provided alternate AQI indices.

## 6. Recommendation scenarios

1. Commuter: two-wheeler plus outdoor exercise habit.
2. Parent: school commute and outdoor play preferences.
3. Indoor: cooking source, exhaust availability, air cleaner availability.
4. Near busy road: avoid unsupported street-level certainty.
5. Stale data: no confident current-condition plan.
6. Forecast only: model/grid caveat displayed.
7. Conflicting values: observation and forecast displayed separately.
8. Sensitive household preference: cautious general information, no diagnosis inference.

## 7. End-to-end journey

1. Open app.
2. Search a city manually.
3. Verify source/time/data-kind labels.
4. Add optional household preferences.
5. Generate daily action plan.
6. Inspect action explanations.
7. Open indoor-air suggestions.
8. Review sustainable swaps.
9. Save plan.
10. Refresh and verify persistence.
11. Delete saved data.
12. Sign in as another user and verify isolation.

Repeat with data provider unavailable, stale response, and AI provider unavailable.

**Automated (Phase 7):** `npm run e2e` runs both journeys in Chromium at desktop and Pixel 7 sizes. It builds the client and starts the real server on port 8090. Every test ends with an axe check, colour contrast included.
- **`e2e/journey.spec.ts`:** steps 1–12 against real Open-Meteo and Supabase. Step 11 is a second browser, so a second anonymous user, that must see only its own saved plan.
- **`e2e/failures.spec.ts`:** provider down, stale data, AI down, AI up and a plan rate limit. These use test replies for the browser's forecast and plan requests.
- **Needs:** the network, `server/.env` and `client/.env`. Without the Supabase settings in `client/.env`, the journey skips steps 9–12 and says why.
- **Limits per run:** 8 plan requests (the API allows 10 per minute) and 4 anonymous sign-ins (Supabase allows 30 per hour). Wait a minute between runs. Every account the journey creates is deleted again.
- It is not part of `npm test` or CI.

**Layout and accessibility (Phase 9):** these answer every API call themselves (`e2e/layout.ts` `stub`), so they spend none of the shared rate limits.
- **`e2e/responsive.spec.ts`:**
  - every page at 320, 640, 768, 1024 and 1280 px: nothing past the screen edge, one `h1`;
  - 44 px targets and axe at 320, on desktop and Pixel 7;
  - 200 % text (at 900, 1024 and 1280) and WCAG text spacing;
  - long place names, and the header with a desktop scrollbar's width taken (headless Chromium hides scrollbars, so a right margin on body stands in);
  - forced colours: no backdrop, a focus outline, the header's contrast, outlines on the highlighted place suggestion, chosen chips and pressed topics, and axe without its colour-contrast rule, which misreads forced colours in Chromium.
- **`e2e/backdrop.spec.ts`:**
  - no text outside the title block rests on the scene;
  - the title block's contrast over every sky;
  - the backdrop stays put between pages;
  - the rain layer moves as one box;
  - nothing reaches past a 320 px screen.
- **Real phone:** `docs/REAL_PHONE_CHECKLIST.md`, 12 items the owner runs on their own phone over home Wi-Fi (`npm run dev -w client -- --host`). "Use my location" needs HTTPS, so it is checked on the live site.

## 8. Accessibility QA

- Semantic HTML and landmark structure.
- Labels and field errors.
- Visible focus.
- Keyboard operation for all menus/dialogs/search.
- Chart summary in text.
- Color not sole status indicator.
- Sufficient contrast.
- Reduced-motion support.
- Screen-reader feedback for dynamic state changes.

## 9. CodeQL and SonarQube

- Enable CodeQL for JavaScript/TypeScript and review security alerts.
- Configure SonarQube Cloud for client/server source and test paths.
- Review critical/high findings.
- Do not suppress an issue merely to obtain a passing quality gate.
- Document accepted false positives or risks with evidence.

**As set up (Phase 8):** CI (`.github/workflows/ci.yml`) runs three jobs on GitHub.

| Job | What it does | When |
|---|---|---|
| `verify` | Format, lint, typecheck, Vitest with coverage, build | Every push and pull request |
| `secrets` | gitleaks v8.30.1 (image pinned by digest) over the full history, with `--redact` | Every push and pull request |
| `sonar` | SonarQube Cloud (`gaikwadashutosh35_airaware-ai`), with coverage from `verify` | Pushes to `main` only, because it needs `SONAR_TOKEN` |

- **SonarQube settings:** in `sonar-project.properties`. Automatic analysis is off, and the quality gate is advisory, so CI doesn't wait on it.
- **CodeQL:** GitHub's default setup (no workflow file) scans JavaScript/TypeScript and GitHub Actions.
- **Locally:** `npm run test:coverage` writes `server/coverage/` and `client/coverage/`. `npm audit` is run by hand and its result recorded.

## 10. Release gate

- Build, typecheck, and lint pass.
- Critical provenance tests pass.
- Invalid AI output is rejected.
- No unresolved critical authorization issue.
- Main E2E path passes.
- Accessibility check completed.
- Production data provider and timestamps verified.
- Repository public, one branch, and below 10 MB including history.
- README and deployment claims accurate.

## 11. QA report template

```text
Date:
Commit:
Build:
Typecheck:
Lint:
Unit:
API:
E2E:
Accessibility:
CodeQL:
SonarQube:
Data provider and data kind:
Timestamp/freshness:
Critical issues:
Known limitations:
Release decision: READY / NOT READY
```
