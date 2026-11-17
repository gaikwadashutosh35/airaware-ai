# AirAware AI — Architecture Decision Records

Record significant technical and product decisions here. Add a new ADR rather than silently changing a previously accepted decision.

## ADR template

```text
# ADR-NNN: Short title
Status: Proposed | Accepted | Superseded
Date:
Decision owners:

## Context
What problem or constraint requires a decision?

## Options considered
1.
2.

## Decision
What was selected?

## Consequences
Benefits, trade-offs, risks, and follow-up actions.

## Verification
How will the decision be tested or reviewed?
```

## ADR-001: Separate official observations from model forecasts

**Status:** Accepted

**Context:** The UI may combine CPCB observations and global model-based forecasts.

**Decision:** Store and render them as distinct data kinds. Never relabel a forecast as an official observation or convert provider-specific US/European AQI into CPCB National AQI.

**Consequences:** More explicit UI and data contracts, but higher trust and fewer misleading claims.

**Verification:** Contract tests ensure `dataKind`, provider, timestamp, units, and index methodology remain consistent.

## ADR-002: AI does not author environmental measurements

**Status:** Accepted

**Context:** LLMs can produce plausible but fabricated numbers and citations.

**Decision:** Environmental values come from validated adapters. AI receives read-only validated context and may explain/rephrase deterministic rule candidates.

**Consequences:** AI cannot generate arbitrary data; backend needs a rules layer and output validator.

**Verification:** Prompt-injection and fabricated-reading regression tests.

## ADR-003: Manual location works without GPS permission

**Status:** Accepted

**Context:** Exact location is personal data and not required for every user.

**Decision:** Manual location selection is a first-class path. Browser geolocation is optional and explicit.

**Consequences:** Slightly more UI work, improved privacy and accessibility.

**Verification:** Denied-geolocation E2E test.

## ADR-004: Provider-neutral AI abstraction

**Status:** Proposed

**Context:** Runtime AI provider may change based on quota, availability, or policy.

**Decision:** Keep provider-specific SDK calls behind an interface and validate output at the service boundary.

**Consequences:** Some abstraction overhead, reduced vendor lock-in.

**Verification:** Mock-provider tests and one integration test against the selected real provider.

## ADR-005: Host client and API as one Google Cloud Run service

**Status:** Accepted (2026-11-17, project owner)

**Context:** The original plan used Vercel for the client and Render for the API. That needs two deployments, a CORS allowlist, and Render's free tier spins down when idle, slowing the first request. The challenge is run with Google for Developers, and its rubric is expected to value Google services (unverified against an official Challenge 06 brief).

**Options considered:**
1. Vercel + Render + Supabase (as originally documented).
2. One Cloud Run service (Express serves the API and the built client) + Supabase + Gemini.
3. Cloud Run + Firebase Auth/Firestore + Gemini.

**Decision:** Option 2. Supabase Auth/Postgres/RLS stays as designed in `DATABASE.md` and `AUTHENTICATION_SECURITY.md`. Secrets go to Secret Manager.

**Consequences:** One URL and same-origin requests (no CORS allowlist). Requires a Google Cloud project with billing enabled and the `gcloud` CLI for deployment. Option 3 was rejected because it would replace the specified RLS design.

**Verification:** Production health check and full user journey on the Cloud Run URL (Phase 9); same-origin API calls from the deployed client.
