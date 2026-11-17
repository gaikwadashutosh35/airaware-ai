# AirAware AI — Authentication, Security, and Access Control

## 1. Security goals

Protect user identity, saved preferences, locations, and plans. Preserve data integrity. Limit access to provider secrets. Avoid excessive household/location data collection.

## 2. Authentication

Use Supabase Auth for signup, login, logout, recovery, and session lifecycle. The frontend may hold the user's session token according to Supabase guidance. Protected backend APIs must verify the bearer token server-side and derive `userId` from trusted claims.

Do not trust a `user_id` passed in a request body or query string.

## 3. Authorization

- Every saved plan belongs to one authenticated user.
- Every preference and saved location belongs to one authenticated user.
- All read/update/delete queries filter by owner.
- Supabase RLS applies to user-owned tables.
- Test with two users and direct API calls, not only UI navigation.
- Prevent feedback linking to another user's plan.

## 4. RLS expectations

For tables with `user_id`:
- SELECT: `auth.uid() = user_id`.
- INSERT: `auth.uid() = user_id` in `WITH CHECK`.
- UPDATE: owner check in both `USING` and `WITH CHECK`.
- DELETE: owner check in `USING`.

For profiles, compare the row ID with `auth.uid()`. Never rely only on client-side route guards.

## 5. Secret handling

- Gemini API key: backend secret only.
- Supabase service-role key: backend only, minimized use.
- Public Supabase URL and publishable/anon key can be in browser configuration according to Supabase guidance; RLS is mandatory.
- Never prefix private secrets with `VITE_`.
- Never commit `.env`, tokens, service account files, or deployment secrets.
- Rotate secrets if exposed in source, logs, screenshots, or Git history.

## 6. Location privacy

- Manual location search must work without geolocation.
- Request browser geolocation only after a clear user action.
- Explain why location is requested.
- Do not persist exact coordinates by default.
- If the user saves a location, allow delete/update.
- Do not log exact coordinates or attach them to analytics unnecessarily.
- Respect provider terms for geocoding.

## 7. Household privacy

- Do not collect diagnoses, medications, clinical history, or identity details of family members.
- Make all preferences optional.
- Use broad household sensitivity preferences only when useful and explicitly supplied.
- Avoid storing raw AI conversations unless necessary.
- Bound stored comments and feedback.
- Provide profile/preferences/plan deletion.

## 8. API security controls

- Zod schema validation at each trust boundary.
- Request-size limit.
- Rate limit AI and location/data endpoints.
- Strict CORS allowlist.
- HTTPS in production.
- Helmet/security headers where compatible.
- Safe, normalized errors.
- Timeouts and bounded retries.
- Avoid leaking provider response bodies or stack traces.
- Apply SSRF protections if user-configurable URLs are ever introduced; preferably do not allow arbitrary URLs.

## 9. Prompt injection and AI safety

- Treat all user text as untrusted data.
- System/developer constraints are not overridable by user instructions.
- Do not let user content request arbitrary tool execution.
- AI may not create/modify pollutant values, source URLs, station IDs, timestamps, or official alerts.
- AI may only explain validated input and approved rule candidates.
- Validate every structured response.
- Reject medical diagnosis/treatment instructions and safety guarantees.
- Do not let generated output execute SQL, shell, code, or external network calls.

## 10. MCP tool safety

MCP servers can expose data access and actions. Before enabling one:
- Verify source, maintainer, license, and package provenance.
- Inspect tool list and permissions.
- Prefer read-only and least-privilege scopes.
- Keep credentials in environment variables/secret store.
- Require human approval for destructive or external actions.
- Do not connect an untrusted MCP server to production user data.
- Review tools after server/package updates.

## 11. Security tooling

- CodeQL: JavaScript/TypeScript code scanning in GitHub.
- SonarQube Cloud: static analysis, maintainability, reliability, and security findings.
- Dependency audit: review package advisories.
- Secret scanning: verify no keys or tokens are committed.
- Tests: authorization, RLS, validation, prompt injection, and output safety.

Never suppress findings only to obtain a green badge. Document accepted risks.

## 12. Incident response

If a secret or user data is exposed:
1. Revoke/rotate affected credentials immediately.
2. Identify commits, logs, services, and users affected.
3. Remove exposed material from active code and, where necessary, Git history.
4. Assess access logs and potential unauthorized use.
5. Notify affected parties when required by applicable obligations.
6. Record a post-incident action list.
