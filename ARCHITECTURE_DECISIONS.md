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

**Status:** Superseded by ADR-006 (2026-11-19). Accepted 2026-11-17 by the project owner.

**Context:** The original plan used Vercel for the client and Render for the API. That needs two deployments, a CORS allowlist, and Render's free tier spins down when idle, slowing the first request. The challenge is run with Google for Developers, and its rubric is expected to value Google services (unverified against an official Challenge 06 brief).

**Options considered:**
1. Vercel + Render + Supabase (as originally documented).
2. One Cloud Run service (Express serves the API and the built client) + Supabase + Gemini.
3. Cloud Run + Firebase Auth/Firestore + Gemini.

**Decision:** Option 2. Supabase Auth/Postgres/RLS stays as designed in `DATABASE.md` and `AUTHENTICATION_SECURITY.md`. Secrets go to Secret Manager.

**Consequences:** One URL and same-origin requests (no CORS allowlist). Requires a Google Cloud project with billing enabled and the `gcloud` CLI for deployment. Option 3 was rejected because it would replace the specified RLS design.

**Verification:** Production health check and full user journey on the Cloud Run URL (Phase 9); same-origin API calls from the deployed client.

## ADR-006: Host on Netlify: CDN pages and one Function for the API

**Status:** Accepted (2026-11-19, project owner). It supersedes ADR-005.

**Context:**
- Cloud Run needs a Google Cloud project with billing linked, and the owner wants no Google billing.
- The owner has a Netlify account with credits.
- The Express app already builds as one unit (`createApp`).

**Options considered:**
1. Netlify CDN for the pages, plus one Netlify Function wrapping the Express app (`serverless-http`).
2. One Function serving the pages as well.
3. A Render free web service running the Docker image.

**Decision:** Option 1.
- Option 2 makes every page view a function call, which costs credits and can wait for a cold start.
- Option 3 sleeps after 15 minutes idle, so a first visit takes about a minute.

**Consequences:**
- **One origin:** everything stays on one address, so CORS is never needed.
- **Code unchanged:** the API code and its tests stay the same. `server/src/netlify.ts` adds the wrapper.
- **Header copies:** page headers live in `client/public/_headers`, and a test keeps them equal to helmet's.
- **Rate-limit key:** rate limits key on Netlify's `x-nf-client-connection-ip`.
- **Per-instance limits:** the rate limits and the Gemini day counter are per function instance, so they are weaker under parallel load (see `THREAT_MODEL.md`).
- **Region:** functions run in Netlify's default US region, away from Supabase in Mumbai.
- **Rubric:** the unofficial rubric's "deployed on Cloud Run" item is given up; Gemini remains the Google service.

**Verification (2026-11-19):**
- Health, pages and the live forecast all respond on https://airaware-ai.netlify.app.
- The CSP on pages equals the API's.
- A forged client-IP header is overwritten.
- The full Playwright suite passes against the live site: 16 passed, 0 skipped.
