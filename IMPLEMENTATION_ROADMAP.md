# AirAware AI — Chronological Implementation Roadmap

## Delivery strategy

Build a narrow, reliable vertical slice first: location → validated data → deterministic recommendations → explainable AI → saved plan. Expand only after the core path works.

## Phase 0 — Repository discovery and requirement lock

**Tasks**
- Inspect repository and existing Markdown files.
- Confirm exact Challenge 06 vertical and official submission guide.
- Confirm selected deployment providers and whether any paid services are acceptable.
- Create `AGENTS.md` and update the README.
- Decide which data sources can actually be accessed under their terms.

**Exit criteria**
- PRD reviewed.
- Architecture proposal reviewed.
- No assumed live provider integration presented as verified.

## Phase 1 — Scaffold and quality baseline

**Tasks**
- Create React/Vite/TypeScript client.
- Create Express/TypeScript server.
- Add shared domain types or a documented contract strategy.
- Add Zod, ESLint, formatter, Vitest.
- Add health endpoint.
- Add environment examples and `.gitignore`.
- Add GitHub Actions CI for install, typecheck, lint, build, tests.

**Exit criteria**
- Clean install works.
- Client/server build.
- CI workflow passes.
- No secrets or generated dependencies committed.

## Phase 2 — Design system and shell

**Tasks**
- Establish brand tokens and typography.
- Implement landing page with GitHub-homepage-inspired product storytelling, not a clone.
- Implement dashboard layout, navigation, empty/loading/error states.
- Implement manual location search component.
- Add responsive and keyboard interactions.
- Use Hallmark/Unslop only if installed and reviewed.

**Exit criteria**
- Browser review at mobile/tablet/desktop.
- No dead controls.
- Accessibility baseline checked.

## Phase 3 — Data contracts and providers

**Tasks**
- Define `AirQualitySnapshot` and `DataKind` contract.
- Implement Open-Meteo forecast adapter.
- Investigate CPCB data access, terms, and supported feed; implement only if verified.
- Implement demo adapter for development/tests, clearly labelled.
- Normalize units, timestamps, provider metadata, freshness, and limitations.
- Keep observation and forecast endpoints separate.

**Exit criteria**
- Provider fixtures and contract tests pass.
- UI shows source/time/units/data-kind.
- No AQI index relabelling.

## Phase 4 — Recommendation rules engine

**Tasks**
- Create rule registry with stable rule IDs.
- Add context validation.
- Add outdoor routine, commute, indoor source, stale data, and sensitivity-preference rules.
- Attach reason, evidence type, relevant context, and limitations.
- Unit-test each rule and boundary.

**Exit criteria**
- Deterministic results for fixed inputs.
- No unsupported thresholds or safety guarantees.

## Phase 5 — AI explanation and personalization

**Tasks**
- Define AI provider interface.
- Integrate Gemini server-side.
- Build constrained prompt from validated snapshot and rule candidates.
- Require structured JSON output.
- Validate with Zod.
- Add retry/timeout limits and safe error handling.
- Add prompt-injection and hallucination tests.

**Exit criteria**
- AI cannot generate or replace pollutant values.
- Invalid output is rejected.
- Recommendations explain why and show assumptions.

## Phase 6 — Household profile and persistence

**Tasks**
- Create Supabase migrations.
- Configure Auth and RLS.
- Add optional household preference form.
- Add saved locations with explicit opt-in for coordinates.
- Add save/list/delete daily plans.
- Add account deletion/data removal flow.

**Exit criteria**
- Two-user isolation tests pass.
- User can delete profile/preferences/plans according to documented behavior.

## Phase 7 — Complete feature experience

**Tasks**
- Build air-quality dashboard and pollutant charts.
- Build daily plan timeline.
- Build indoor air assistant.
- Build sustainable swaps.
- Build sources/limitations panel.
- Add shareable summary only if it does not expose private location/preferences.

**Exit criteria**
- End-to-end core user journey works.
- Mobile layout usable.

## Phase 8 — Quality and security audit

**Tasks**
- Run unit/integration/E2E tests.
- Run TypeScript and lint.
- Run CodeQL.
- Run SonarQube analysis.
- Review dependencies and secrets.
- Test RLS and API ownership.
- Run accessibility checks.
- Run Unslop visual audit after browser render if installed.
- Fix critical/high findings and document accepted risks.

**Exit criteria**
- No unresolved critical security issue.
- All challenge-critical tests pass.
- Quality findings reviewed, not blindly suppressed.

## Phase 9 — Deployment

**Tasks**
- Apply production migrations.
- Configure Supabase Auth URLs and RLS.
- Deploy API to Render.
- Deploy frontend to Vercel.
- Configure CORS and secrets.
- Verify source provider behavior using real production URLs.
- Test fresh session and account isolation.

**Exit criteria**
- Production user journey verified.
- All live links are accurate.

## Phase 10 — Submission audit

**Tasks**
- Confirm public GitHub repository.
- Confirm exactly one remote branch: `main`.
- Check total Git repository size under 10 MB.
- Remove secrets, `node_modules`, build artifacts, and large files from history where necessary.
- Verify README and documentation.
- Re-run final tests.
- Capture final commit hash and submission confirmation.

**Exit criteria**
- Challenge checklist fully reviewed.
- Do not spend one of the three attempts until ready.

## Suggested commit sequence

1. `chore: scaffold airaware monorepo`
2. `feat: add design system and app shell`
3. `feat: add air data provider contracts`
4. `feat: implement air quality forecast adapter`
5. `feat: add recommendation rules engine`
6. `feat: add AI explanation service`
7. `feat: add auth and saved plans`
8. `feat: complete daily plan experience`
9. `test: add quality and security coverage`
10. `chore: prepare verified production deployment`
