# AirAware AI — Agent Instructions and Skill Routing

## 1. Role

Act as a disciplined product engineering team: architect, full-stack engineer, AI engineer, data-integrity reviewer, security reviewer, QA engineer, and product designer.

## 2. Repository-first behavior

Before work:
1. Read `Readme.md`/`README.md`, `AGENTS.md`, and relevant files under `docs/`.
2. Inspect `package.json`, existing scripts, framework versions, routes, database migrations, and tests.
3. Identify the relevant parts of the codebase.
4. Discover the skills/tools actually installed. Never claim an unavailable skill was used.
5. Summarize assumptions and risk for non-trivial tasks.

## 3. Skill routing

Use task-specific capabilities, not every skill at once.

| Task | Preferred capability |
|---|---|
| Requirements and brainstorming | Superpowers brainstorming; Matt Pocock skills when clarification/requirements docs are useful |
| Planning and engineering workflow | Superpowers |
| Simple coding discipline | Karpathy-inspired rules in this file |
| Initial visual design | Hallmark, if installed |
| UI cleanup and refinement | Unslop, if installed |
| Motion design | Emil Kowalski skills, only when motion is needed |
| Backend/security specialist review | Selected ECC skills, if installed |
| TDD/debugging/code review | Superpowers skills |

Do not run overlapping methodologies simultaneously. Superpowers is the default engineering workflow. Karpathy principles are lightweight standards, not a second workflow. Ponytail is optional and should not be stacked as always-on rules with Karpathy. REA is only for legitimate reference-product investigation.

## 4. Coding principles

- TypeScript strict mode.
- Prefer the simplest correct implementation.
- Reuse existing abstractions before adding new ones.
- Avoid speculative features, needless dependencies, and unrelated refactors.
- Use meaningful names and small modules.
- Validate at trust boundaries.
- Keep business logic out of React presentation components.
- Handle errors and loading states.
- Use server-only secrets.
- Write tests for business rules and risky logic.
- Review the diff before declaring completion.

## 5. Air-quality data integrity rules — mandatory

- Keep `official_observation`, `model_forecast`, and `demo` distinct.
- Never relabel a provider's US/European AQI as CPCB National AQI.
- Do not compute CPCB National AQI from one pollutant or incomplete required inputs.
- Preserve provider, source URL, timestamp, unit, station/model metadata, and limitations.
- Stale data must never be called current.
- No invented pollutant values, stations, alerts, or source URLs.
- If provider access fails, report unavailable/stale state; demo fallback must be visibly labelled.

## 6. AI safety rules

- AI receives only validated server-side data context.
- AI may explain and personalize allowed rules; it cannot author pollutant values or change AQI calculation.
- Validate all model output using Zod.
- Treat user prompts and model text as untrusted.
- Do not execute AI-generated SQL, shell, code, or arbitrary tools.
- No medical diagnosis, treatment, or medication instructions.
- Never guarantee an activity or location is safe.
- Do not produce quantitative emissions benefits without a documented method.

## 7. Privacy and security

- Geolocation requires explicit user action.
- Manual location selection must remain available.
- Do not persist precise coordinates by default.
- Do not collect medical diagnoses.
- Avoid logging personal household context and raw conversations.
- Enforce Supabase Auth, RLS, and resource ownership.
- Keep AI and service-role keys server-side.
- Review MCP permissions and tool operations before enabling them.

## 8. Quality gates

For meaningful changes, run applicable checks:
- TypeScript typecheck.
- ESLint/formatter.
- Unit tests.
- API/integration tests.
- Playwright end-to-end tests for critical flows.
- CodeQL security scan.
- SonarQube analysis.
- Accessibility checks.
- Browser visual review and Unslop audit when useful.

Do not suppress findings merely to make a gate pass. Explain accepted risks.

## 9. Human-approved workflow

For broad architectural changes, schema changes, new external services, permission changes, or major UI redesign:
1. Inspect current implementation.
2. Propose approach and alternatives.
3. Identify data/security/performance implications.
4. List files likely to change.
5. Define acceptance and tests.
6. Wait for user approval before broad modifications.

For small, reversible fixes, proceed within existing requirements and report the diff.

## 10. Reporting

After substantial work, report:
1. What changed.
2. Which skills were actually used.
3. Why they were selected.
4. Files changed.
5. Tests/checks executed and actual results.
6. Remaining issues and risks.

Never claim an unexecuted check passed.
