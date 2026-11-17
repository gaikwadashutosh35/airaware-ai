# AirAware AI — Observability and Operations Runbook

## 1. Health endpoints
`GET /api/health` should report process health only. Do not expose secrets, database credentials, internal stack traces, or detailed infrastructure internals.

A separate readiness check may test critical dependencies with bounded timeouts.

## 2. Safe logs
Log:
- request ID;
- route;
- status code;
- duration;
- provider name;
- data kind;
- safe error code;
- retry count.

Avoid logging:
- tokens or API keys;
- exact user coordinates unless strictly required and protected;
- household preference payloads;
- raw prompts/conversations;
- sensitive request bodies.

## 3. Provider incident response

### Air-data provider unavailable
1. Check provider status/documentation.
2. Inspect safe error code and latency.
3. Confirm configured base URL and quota.
4. Return unavailable/stale state.
5. Do not silently show demo data as live.
6. Recheck source after a bounded interval.

### Data appears stale
1. Inspect provider source timestamp.
2. Inspect retrieval timestamp and cache age.
3. Verify timezone parsing.
4. Check provider cadence and freshness policy.
5. Mark stale if unresolved.
6. Never rewrite source timestamp to make data appear fresh.

### AI provider unavailable
1. Confirm server configuration without printing secrets.
2. Check quota/model identifier and provider status.
3. Return a clear retryable error.
4. Preserve already retrieved air data.
5. Offer deterministic/general guidance only when approved by product rules.
6. Do not fabricate an AI response.

### Database unavailable
1. Check safe readiness status.
2. Inspect connection and platform status.
3. Do not claim a save succeeded.
4. Retry only safe idempotent operations.
5. Preserve user-visible unsaved state where appropriate.

## 4. Error response shape
```json
{
  "error": {
    "code": "AIR_PROVIDER_UNAVAILABLE",
    "message": "Air-quality data is temporarily unavailable.",
    "requestId": "opaque-request-id",
    "retryable": true
  }
}
```
Never expose stack traces or provider credentials.

## 5. Incident record
```text
Incident ID:
Date/time:
Affected component:
User impact:
Provider/data type:
First observed:
Resolution:
Root cause:
Regression test:
Follow-up:
```

## 6. Recovery principles
- Keep last successful values with their original timestamps and stale label.
- Do not replace live/official labels with model/demo fallbacks.
- Do not claim freshness during provider outages.
- Preserve data deletion and access controls during recovery.
