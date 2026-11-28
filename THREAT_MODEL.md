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
- **Claude spend per instance.** Claude, the backup writer, has its own cap of 200 calls per UTC day per function instance. It is asked only when Gemini fails, so a Gemini outage moves the traffic to Claude. As with Gemini, the per-instance cap does not bound spend. **Accepted for now (2026-11-19):**
  - The key lives in the organisation's shared Default workspace. The owner's Console role (Developer) cannot set a spend limit, so there is none yet.
  - The only bound is the 200-a-day cap per instance. By the final review's rough estimate, Haiku 5.5 at worst costs about $0.0024 per call, so under about $0.50 a day per instance.
  - The planned fix: an Admin creates an "AirAware" workspace with a $10/month limit, and its key replaces this one (`DEPLOYMENT.md`). The client pins `https://api.anthropic.com`, so an `ANTHROPIC_BASE_URL` set in the environment cannot send the key elsewhere.
- **Ask AirAware shares the plan's limiter and AI budget (redesign Phase 7).** `POST /api/v1/assistant/answer` counts against the same 10 per minute per IP as plans, and its summaries come from the same writer, so they share the 200-a-day caps and the 10-minute answers cache. Cycling topics and answers spends the budget no faster than cycling plan answers does, and the result is the same: labelled rules-only answers until 00:00 UTC. A topic chip sends the AI no question text. A typed question is the exception (J26, ADR-008); see the next bullets.
- **Claude reads typed Ask questions (J26, ADR-008).** The typed question is untrusted text, at most 200 characters in a 4 KB body, and it reaches Claude's prompt together with up to 2 earlier questions from the visit. Prompt injection through it is therefore possible. The design bounds what it can do instead of removing it:
  - A question the medical word list flags gets the fixed reply and no AI call. An earlier question that fixed word lists call medical is dropped before Claude. Earlier answers' text is never sent back, because a client could forge it.
  - Claude returns JSON only (`scope`, `answer`, `topic`, `cardIds`). It writes no card text and no sources, so a hijacked answer cannot change the advice cards, the sources or any forecast value.
  - The answer is refused unless it is 20 to 300 characters, its card ids come from the cards that were sent (0 to 3, no repeats), its numbers come only from the forecast check, the cards and the forecast block (numbers the user typed never count), it avoids the banned wording, and it is not a yes or no on safety. Any failure gives the rules' answer, with no retry and no Gemini call.
  - The prompt holds no place name, coordinates, raw household answers, timestamps or source ids, so nothing private can be coaxed back out.
  - The question is never logged, stored, cached by its text or sent to Gemini. The only log line is `Claude ask failed: <category>`. Claude's answer may restate the question.
- **Ungrounded qualitative claims in Ask answers.** The checks test numbers, wording, the yes/no verdict and card ids. They do not test whether a plain-words claim ("opening a window in the evening is usually fine") follows from the cards. The prompt tells Claude to say when the context does not hold the answer, the opt-in live evaluation (`askEval.live.test.ts`) would test that it does by needing at least 17 of 19 passes, but it has not yet been run against the real model, and every answer shows its cards, its sources and the safety note. **Accepted (2026-11-28):** a fluent but unsupported sentence can pass.
- **The medical gate is a keyword list.** A health question the word list misses (English plus a few romanised Hindi words) reaches Claude. Its prompt sets scope `out_of_scope` for symptoms, medicine and diagnosis, and the answer then shows no cards, but that rests on the model following the prompt.
- **Claude Ask spend.** Typed questions have their own cap of 200 calls per UTC day per function instance. It is kept in memory, so each new instance starts its own count. They share the 10-per-minute limiter. There is still no spend limit in the Anthropic Console. Typically it costs about $0.0005 a call (Haiku 5.5 at $0.10 and $0.50 per million input and output tokens). The worst case is about $0.0025 a call (4096 output tokens at $0.50 per million, plus input), so about $0.50 a day per instance at the cap. That matches the plan writer's estimate above (about $0.0024 a call): both use the same model and the same worst case. **Before deploying,** the owner sets a monthly workspace spend limit in the Console and records it in `COST_AND_LIMITS.md`.
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
- **Number words in AI text.** The check that AI text quotes only known numbers misses some number words and non-ASCII digits. It guards against model error. The plan prompts hold no attacker text. The Ask prompt does hold the typed question, so a missed number word there is one more way for an unsupported claim to pass (see the Ask bullets above).
- **Shared links can pair any label with any coordinates.** This is text-only; the coordinates are shown next to the label.
- **Image and CI pinning.**
  - The `node:26-slim` base image and CI's `node-version: 26` are not pinned by digest.
  - The gitleaks job uses the repository's default config, if one is added.
  - The runtime image includes unreachable test files.
- **Docker warning on `VITE_SUPABASE_PUBLISHABLE_KEY`** ("secret in ARG"). The publishable key is public by design.
- **SonarQube S6845** (`tabIndex` on the scrollable hourly table) is kept on purpose for keyboard access (WCAG 2.1.1), with a `NOSONAR` comment giving the reason.
- **Playwright runs locally, not in CI.** The live journey needs Supabase, Open-Meteo and the network.

This threat model is a project baseline. Reassess it when adding maps, notifications, external integrations, uploads, user-generated sharing, analytics, or new AI tools.
