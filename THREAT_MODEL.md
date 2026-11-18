# AirAware AI — Security Threat Model

## Assets
- User account/session.
- Saved location and household preferences.
- Saved plans and conversation context.
- AI provider credentials.
- Supabase credentials.
- Environmental data provenance.
- Production deployment configuration.

## Trust boundaries
1. Browser to API.
2. API to Supabase.
3. API to environmental data providers.
4. API to AI provider.
5. Developer tools/MCP to local repository and external services.
6. GitHub Actions to deployment/analysis providers.

## Threats and controls

| Threat | Control |
|---|---|
| Cross-user data access | JWT verification, ownership checks, RLS |
| API key exposure | Server-side secrets, secret scanning, no logs |
| Prompt injection | Treat user/context text as data; constrained instructions; no unrestricted tools |
| AI hallucinated AQI | Server-owned validated readings; output schema and provenance |
| Forecast presented as observation | Explicit `dataKind` type and contract tests |
| XSS | Output escaping, safe markdown rendering, CSP where appropriate |
| API abuse | Rate limiting, request size limits, quotas/timeouts |
| SSRF | No arbitrary user-supplied URLs passed to backend fetch |
| Location leakage | Opt-in geolocation, minimization, no default persistence |
| MCP over-permission | Project-scoped, read-only first, human approval for writes |
| Dependency compromise | Lockfile, update review, dependency scanning |
| CI secret exposure | GitHub secrets, minimum workflow permissions |
| Stale data confusion | Timestamp and freshness checks on server and UI |

## AI-specific controls
- No tools to execute SQL, shell, code, or arbitrary external requests.
- AI cannot write directly to database.
- Validate JSON with Zod.
- Bound prompt size and history.
- Use allowlisted source references supplied by server.
- Strip/escape generated text before rendering.
- Add refusal/redirect logic for diagnosis and treatment requests.
- Log safe request IDs, not raw prompts.

## Security review checklist
- Are all protected endpoints authenticated?
- Are child resources checked for ownership?
- Is RLS enabled and verified?
- Are secret values absent from Git history?
- Is CORS restricted?
- Are provider URLs fixed/allowlisted?
- Are errors safe?
- Are rate limits in place?
- Are AI inputs/outputs bounded and validated?
- Are MCP servers trusted and least-privileged?

## Residual risks

Accepted in Phase 6 (saved data):
- **Anonymous-account abuse.** Accounts need no email and there is no CAPTCHA, so a script could create many. Limits: Supabase allows 30 anonymous sign-ins per hour per IP, and the database caps each account at 1 preferences row (≤ 2 KB) and 20 plans (≤ 64 KB each). These limits also hold for direct writes.
- **Direct writes to one's own rows.** A person can call Supabase's API with the publishable key and their own token, which is the same access the server uses on their behalf. They can then store a plan the server did not build. It stays within the limits above, RLS keeps it visible only to them, and React renders its text as text. Stopping this fully would need a server-only key, which the design rules out.
- **Abandoned anonymous accounts** stay until cleaned up; the cleanup is a Phase 9 follow-up.
- **Free project pausing** after 7 days of low activity makes saving unavailable (503) until the project is restored.

This threat model is a project baseline. Reassess it when adding maps, notifications, external integrations, uploads, user-generated sharing, analytics, or new AI tools.
