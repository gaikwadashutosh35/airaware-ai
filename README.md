# AirAware AI — Urban Air Quality Assistant

**Hack2Skills PromptWars Virtual · Main Challenge 06**  
**Breathe smarter. Make informed daily choices.**

AirAware AI is a GenAI-powered assistant for households and communities. It combines clearly labelled air-quality observations/forecasts with optional routine and home context to offer explainable daily actions, practical indoor-air suggestions, and sustainable swaps.

## Why AirAware AI?

Environmental readings are not always easy to translate into useful daily choices. AirAware AI helps users understand what data is available, how current it is, what limitations apply, and what practical changes may fit their declared routines.

## Main features

- Manual location search and opt-in geolocation.
- Air-quality overview with provider, data kind, time, pollutant, units, and freshness.
- Distinct official-observation and model-forecast views.
- Personalized daily action plan.
- Indoor air-quality assistant.
- Sustainable everyday alternatives.
- Explainable AI recommendations and limitations.
- Optional saved plans and household preferences.

## Challenge vertical

Urban Air Quality Assistant — personalized low-emission routines, indoor-air improvements, sustainable swaps, and explainable recommendations for families and communities.

## Technology

React, Vite, TypeScript, Tailwind CSS, Node.js, Express, Zod, Gemini provider adapter, Supabase PostgreSQL/Auth, Vitest, Playwright, Google Cloud Run.

## Repository structure

```text
airaware-ai/
├── client/
├── server/
├── supabase/migrations/
├── docs/
├── .github/workflows/
├── AGENTS.md
├── README.md
└── .gitignore
```

## Documentation index

- `PRD.md` — product requirements and personas.
- `DESIGN.md` — UI/UX system and GitHub-inspired storytelling reference.
- `ARCHITECTURE.md` — system design and stack.
- `DATABASE.md` — schema and relationships.
- `API.md` — endpoints and contracts.
- `AGENTS.md` — Claude Code operating instructions.
- `IMPLEMENTATION_ROADMAP.md` — chronological plan.
- `SETUP.md` — local environment and variables.
- `FEATURE_DEVELOPMENT.md` — implementation steps and logic.
- `AUTHENTICATION_SECURITY.md` — access control and security.
- `MCP_CONNECTION.md` — optional development-time MCP tools.
- `INTEGRATIONS.md` — external services and data sources.
- `TESTING_QA.md` — verification and scripts.
- `DEBUGGING.md` — logs, diagnosis, edge cases.

## Run locally

Needs Node 24 or newer. From the repository root:

```bash
npm ci
```

```bash
npm run dev -w server
```

```bash
npm run dev -w client
```

Open `http://localhost:5173`, search an Indian city and see its hourly model forecast from Open-Meteo. No API keys are needed yet. The production Docker image and checks are in `SETUP.md` §8. No live URL is listed until a deployment is verified.

## Quick start

1. Read `AGENTS.md` and `PRD.md`.
2. Follow `SETUP.md`.
3. Use `IMPLEMENTATION_ROADMAP.md` phase by phase.
4. Run the checks in `TESTING_QA.md`.
5. Follow `AUTHENTICATION_SECURITY.md` before production deployment.

## Data integrity

CPCB is the reference for India's National AQI and official station observations when a verified, permitted data-access method is available. Open-Meteo can provide model forecasts; it is not a CPCB station feed. Never relabel European/US AQI as CPCB National AQI. If a verified official feed is unavailable, be honest and use clearly labelled forecast/demo data instead of fabricating a live reading.

## Responsible-use limitations

This product provides general information, not medical diagnosis or treatment. It cannot guarantee any activity or location is safe. Indoor and outdoor conditions differ. Follow current local authority guidance and consult qualified medical professionals for health questions.

## Challenge repository requirements

- Public GitHub repository.
- Exactly one branch (`main`).
- Repository size below 10 MB, including Git history.
- Complete source code.
- README explains vertical, approach, logic, operation, and assumptions.
- Maximum three attempts: perform the final audit before submission.


## Extended engineering documentation

- `START_HERE.md` — recommended reading order and first session.
- `CLAUDE.md` — Claude Code project entry point importing `AGENTS.md`.
- `CLAUDE_CODE_START_PROMPT.md` — complete master prompt for Claude Code.
- `AI_PROMPTS.md` — runtime system prompt templates and AI guardrails.
- `DATA_GOVERNANCE.md` — provenance, freshness, caching, attribution.
- `CODE_QUALITY.md` — CodeQL, SonarQube Cloud, Unslop, quality gate.
- `ACCESSIBILITY.md` — accessibility design and verification.
- `PRIVACY.md` — location, household context, retention and deletion.
- `THREAT_MODEL.md` — assets, trust boundaries, threats and controls.
- `PERFORMANCE.md` — frontend, backend, and provider efficiency.
- `OBSERVABILITY_RUNBOOK.md` — provider, database, and AI failure handling.
- `CONTRIBUTING.md` — safe contribution and commit practices.
- `CHANGELOG.md` — change history.
- `GLOSSARY.md` — domain terminology.
- `ARCHITECTURE_DECISIONS.md` — decision records.
- `USER_GUIDE.md` — end-user workflow.
- `RELEASE_CHECKLIST.md` — production and challenge release gate.
- `COST_AND_LIMITS.md` — service cost and quota management.
- `SECURITY.md` — vulnerability reporting policy.
- `.claude/rules/` — path-scoped frontend, backend, data, and testing rules.

## Links

- Live app: _Add verified URL_
- API: _Add verified URL_
- Repository: _Add URL_

## Author

Ashutosh Gaikwad — https://github.com/gaikwadashutosh35
