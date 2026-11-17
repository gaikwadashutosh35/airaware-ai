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
