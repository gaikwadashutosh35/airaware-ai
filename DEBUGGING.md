# AirAware AI — Debugging, Error Log, and Edge Cases

## 1. Debugging principles

- Reproduce before changing code.
- Read the complete error and relevant logs.
- Identify the failing layer: UI, API, provider, AI, database, auth, or deployment.
- Trace the actual data flow.
- Write a regression test for the failure.
- Make the smallest correct fix.
- Re-run relevant and regression tests.
- Do not hide root causes with fabricated fallback data.

## 2. Error categories

| Category | Examples | Diagnostic starting point |
|---|---|---|
| Frontend | Blank screen, rendering crash | Browser console, React error boundary |
| API | 400/401/403/500 | Request ID, route logs, schema/auth middleware |
| Air data | Provider timeout, invalid fields | Provider status, query params, response schema |
| Provenance | Forecast displayed as observation | Normalization mapping and UI data-kind props |
| AI | Invalid JSON, timeout, hallucinated value | Prompt inputs, model output parser, Zod errors |
| Database | RLS denial, migration failure | JWT claims, policies, migration log |
| Auth | Refresh loop, expired token | Supabase session and server verification |
| Deployment | CORS, 404, missing env | Platform logs, environment config, route prefix |
| UX | Layout overflow, inaccessible chart | Browser viewport, CSS, keyboard and axe results |

## 3. Logging rules

Log only operational information:
- Request/correlation ID.
- Route and status.
- Provider name and operation (not secret or full private payload).
- Duration and retry count.
- Sanitized error code.

Do not log:
- API keys or bearer tokens.
- Exact coordinates unless essential and explicitly approved.
- Raw household profile or health-related preferences.
- Full AI prompt/conversation by default.
- Supabase service-role credentials.

## 4. Error log template

```text
Issue ID:
Date/time UTC:
Environment: local / preview / production
Commit:
Feature:
Request/correlation ID:
Expected behavior:
Actual behavior:
Reproduction steps:
Sanitized error message:
Relevant logs:
Data provider and data kind:
Timestamp/freshness:
Root cause:
Fix:
Regression test:
Verification commands and results:
Remaining risk:
```

## 5. Common issues and remedies

### Provider returns no data
- Verify coordinates and variable names.
- Check endpoint, quota, and provider status.
- Validate the response shape.
- Return `DATA_UNAVAILABLE` or a stale result with original timestamp.
- Never invent a replacement reading.

### Forecast appears as official AQI
- Inspect provider mapping and shared types.
- Remove implicit fallback conversion.
- Keep distinct endpoint/types for observation and forecast.
- Add regression test preventing `european_aqi` or `us_aqi` from populating CPCB `nationalAqi`.

### Stale value shown as current
- Inspect cache TTL and source time.
- Preserve `observedAt`/`forecastFor` from provider.
- Recompute freshness when serving cached responses.
- Render a stale badge and suppress current-condition claims.

### AI invents pollutant values or sources
- Do not ask the model to generate environmental readings.
- Pass validated data from server.
- Require source IDs from an allowlisted context.
- Validate output and reject unknown references.
- Add hallucination tests.

### AI produces unsafe advice
- Inspect rule candidates and prompt guardrails.
- Add deterministic filters for diagnosis, medication, and safety guarantees.
- Use public-health references for general advice.
- Keep medical questions outside product scope.

### Indoor advice says always close/open windows
- Revisit the indoor rule context.
- Add tests that combine outdoor pollution with indoor cooking/other sources.
- Require a reason and caveat.

### RLS denies a user's own record
- Verify token claims and current user.
- Check owner field, policy, table grants, and client configuration.
- Test using a user JWT, not only the service role.

### Cross-user access succeeds
- Treat as critical incident.
- Reproduce via direct API request.
- Enforce owner filters and RLS.
- Add regression tests for every child resource.

### Vercel/Render CORS or environment failure
- Check exact `CLIENT_URL` origin.
- Check build root, start command, route prefix, and env names.
- Never solve by allowing wildcard CORS with credentials.

## 6. Important edge cases

- User denies GPS.
- City name maps to multiple locations.
- Provider returns forecast but no observation.
- Provider returns observation but no forecast.
- Partial pollutant set.
- Missing timestamp or unknown unit.
- Provider changes variable name/schema.
- Stale cached result.
- Time zone/daylight edge case for forecast times.
- AI timeout or rate limit.
- AI returns malformed JSON or unknown source IDs.
- User has no household preferences.
- User changes location midway through planning.
- Translation makes a label longer and breaks mobile layout.
- User deletes profile while a request is in progress.
- Demo data mixed with live data.

## 7. Root-cause review checklist

- [ ] Issue reproduced.
- [ ] Root cause supported by evidence.
- [ ] Regression test added.
- [ ] Minimal fix applied.
- [ ] Data provenance preserved.
- [ ] Security/privacy implications reviewed.
- [ ] Unit/integration/E2E checks rerun.
- [ ] Logs sanitized.
- [ ] Known limitation documented.
