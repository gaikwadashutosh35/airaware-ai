---
paths:
  - "client/**/*.{ts,tsx}"
  - "server/**/*.ts"
  - "supabase/**/*.sql"
  - "tests/**/*"
---

# Testing and Security Rules

- Add regression tests for bugs and boundary conditions.
- Test authentication, ownership, and RLS when data access changes.
- Test provider failures, stale data, and malformed AI output.
- Test data-kind and AQI methodology integrity.
- Run typecheck, lint, and relevant tests after changes.
- Review CodeQL and SonarQube findings when analyses are configured.
- Never suppress a finding without a narrow, documented justification.
- Automated accessibility tools are not a substitute for manual keyboard review.
