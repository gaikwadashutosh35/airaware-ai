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
- **Abandoned anonymous accounts** stay for up to 30 days after last use, then the nightly `pg_cron` job deletes them (Phase 9).
- **Free project pausing** after 7 days of low activity would make saving unavailable (503). The keep-alive workflow reads the API every 3 days and emails the owner if the project doesn't answer.

Accepted in Phase 8 (audit, 2026-11-19). These are hardening notes, not demonstrated vulnerabilities:
- **Gemini spend per instance.** The cap is 200 Gemini calls per UTC day per function instance. Netlify can run several instances, and each new one starts its own count, so this cap alone does not bound spend. The real limit is the Gemini project's own quota, which the owner lowers before adding the key (`DEPLOYMENT.md`). One client that keeps changing its answers can use up the day's 200 calls in about 20 minutes, within the 10-per-minute limit. Everyone then gets rules-only plans, clearly labelled, until 00:00 UTC (05:30 IST). The cap trades availability of AI personalisation for a bounded bill.
- **Claude spend per instance.** Claude, the backup writer, has its own cap of 200 calls per UTC day per function instance. It is asked only when Gemini fails, so a Gemini outage moves the traffic to Claude. As with Gemini, the per-instance cap does not bound spend. The real bound is the spend limit the owner sets in the Anthropic Console before adding the key (`DEPLOYMENT.md`). The client pins `https://api.anthropic.com`, so an `ANTHROPIC_BASE_URL` set in the environment cannot send the key elsewhere.
- **Stored plans are not re-validated on read.** A person's own direct write can break only that person's own view (see direct writes above).
- **Direct inserts can choose `id` and `created_at`** on their own plans. RLS still binds the row to them.
- **Tokens stay valid until they expire,** even after sign-out or deletion, because the signature is checked locally. The foreign key to `auth.users` means a deleted user's token reaches no rows. Keep that foreign key on every future user-owned table.
- **Rate-limit key and scope (Phase 9, Netlify).**
  - On Netlify the limits key on `x-nf-client-connection-ip`, which Netlify overwrites. A forged value was checked live and ignored.
  - `X-Forwarded-For` is ignored there.
  - The counts live in each function instance, so parallel instances each allow their own 60 and 10 per minute.
  - Another host would need its own client-IP source.
- **Credit exhaustion.** Heavy traffic uses Netlify credits. At zero balance Netlify pauses the whole site until credits are added. The owner controls auto-recharge.
- **Other upstream calls:**
  - A token with an unknown key id costs two calls to Supabase.
  - The forecast cache has no single-flight, so identical requests at the same moment each call Open-Meteo.
  - The planner runs before the 20-plan check on save.
  - Upstream responses have no byte cap.

  All of these are bounded by the 60-per-minute and 10-per-minute limits per IP.
- **Number words in AI text.** The check that AI text quotes only known numbers misses some number words and non-ASCII digits. It guards against model error; no attacker text reaches the prompt.
- **Shared links can pair any label with any coordinates.** This is text-only; the coordinates are shown next to the label.
- **Image and CI pinning.**
  - The `node:26-slim` base image and CI's `node-version: 26` are not pinned by digest.
  - The gitleaks job uses the repository's default config, if one is added.
  - The runtime image includes unreachable test files.
- **Docker warning on `VITE_SUPABASE_PUBLISHABLE_KEY`** ("secret in ARG"). The publishable key is public by design.
- **SonarQube S6845** (`tabIndex` on the scrollable hourly table) is kept on purpose for keyboard access (WCAG 2.1.1), with a `NOSONAR` comment giving the reason.
- **Playwright runs locally, not in CI.** The live journey needs Supabase, Open-Meteo and the network.

This threat model is a project baseline. Reassess it when adding maps, notifications, external integrations, uploads, user-generated sharing, analytics, or new AI tools.
