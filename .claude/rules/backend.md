---
paths:
  - "server/src/**/*.ts"
---

# Backend Rules

- Validate every external request with Zod.
- Authenticate protected routes and derive user ID from verified claims.
- Enforce ownership for every user-owned resource and child resource.
- Keep provider credentials server-side.
- Use typed service/provider interfaces and centralized safe errors.
- Apply timeouts, rate limits, and bounded request sizes.
- Do not log tokens, exact coordinates, raw prompts, or unnecessary profile data.
- Never let model output execute SQL, shell, code, or arbitrary tools.
- Add unit/integration tests for each new service and important edge case.
