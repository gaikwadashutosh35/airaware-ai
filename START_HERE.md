# AirAware AI — Start Here

This file is the project documentation entry point.

## Recommended reading order

1. `README.md` — project overview.
2. `PRD.md` — product scope and requirements.
3. `DESIGN.md` — interface system and GitHub-inspired storytelling.
4. `ARCHITECTURE.md` — system boundaries and technology.
5. `DATABASE.md` — schema and relationships.
6. `API.md` — endpoints and contracts.
7. `DATA_SOURCES_AND_SAFETY.md` (or corresponding integration/data source section) — source integrity and safe guidance.
8. `AGENTS.md` and `CLAUDE.md` — AI coding-agent instructions.
9. `IMPLEMENTATION_ROADMAP.md` — phase order and exit criteria.
10. `SETUP.md` — local environment.
11. `TESTING_QA.md` and `CODE_QUALITY.md` — validation gates.
12. `AUTHENTICATION_SECURITY.md`, `PRIVACY.md`, and `THREAT_MODEL.md` — security and privacy.
13. `DEPLOYMENT.md` and `RELEASE_CHECKLIST.md` — production and submission.

## First session in Claude Code

1. Open a terminal at the repository root.
2. Confirm the repository is on `main`.
3. Start Claude Code with `claude`.
4. Paste the complete instructions from `CLAUDE_CODE_START_PROMPT.md`.
5. Ask Claude to inspect and report first; it should not implement the whole app immediately.
6. Review the proposed Phase 0/Phase 1 plan before approving changes.

## Important project decisions

- AirAware AI is a household/community assistant, not a medical app.
- Manual location search must work without granting geolocation.
- Official CPCB observations, model forecasts, and demo fixtures remain distinct.
- AI must not create pollutant values, AQI values, station names, timestamps, or source URLs.
- Backend deterministic rules own data validation and critical recommendation constraints.
- The app must clearly explain uncertainty, data freshness, and limitations.
- Challenge submission constraints: public repository, one branch (`main`), below 10 MB including history, and maximum three attempts.
