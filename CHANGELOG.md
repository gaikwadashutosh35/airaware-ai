# Changelog

All notable user-facing and engineering changes should be recorded here.

This project follows a simple Keep a Changelog-inspired structure. Versions and dates are placeholders until an actual release is made.

## [Unreleased]

### Added
- Initial project documentation and implementation plan.
- Phase 1 scaffold: npm workspaces (`server`, `client`), strict TypeScript, oxlint, Prettier, Vitest, GitHub Actions CI.
- `GET /api/v1/health` with security headers and a JSON 404 envelope.
- Phase 2 data layer:
  - `GET /api/v1/air-quality/forecast`: Open-Meteo CAMS global model forecast, labelled `model_forecast`, with provider, units, UTC times and limitations.
  - `GET /api/v1/air-quality/current`: reports CPCB observations as unavailable.
  - `GET /api/v1/air-quality/sources`: licence and attribution.
  - `GET /api/v1/locations/search`: India-only place search.
- Central JSON error handler (`API.md` envelope, no stack traces); 10-minute forecast cache; 60/min per-IP rate limit.
- Phase 3 client:
  - **Landing page:** hero place search, a real dashboard screenshot, the "Where every number comes from" diagram, a limits statement, and Open-Meteo attribution.
  - **Dashboard:** keyboard-accessible place search, opt-in approximate location, PM2.5 headline figure, the six pollutants with units and hours, a 48-hour table, the CPCB-unavailable panel, sources, and loading/error/rate-limit states.
- Production container: one Express process serves the API and the built client (Dockerfile).
- Phase 4 recommendation rules engine: household details schema, a 24-hour forecast check against India's NAAQS PM2.5/PM10 limits, and 17 explainable rules (server-only; no endpoint yet).
- Phase 5 `POST /api/v1/recommendations/daily-plan`: Gemini (`gemini-3.8-flash`, prompt `daily-plan-v1`) features, orders and times the rules' actions and adds a summary and "for you" lines; every answer is checked, and any failure returns a labelled rules-only plan. The advice text stays the rules' own wording.
- Phase 6 saved data: one-click anonymous Supabase sign-in (no email), saved household answers (`GET`/`PUT /api/v1/profile/preferences`), saved daily plans (`GET`/`POST /api/v1/plans`, `GET`/`DELETE /api/v1/plans/:id`), and `DELETE /api/v1/account`. The household form on the dashboard has "Save my answers" and "Delete my saved data". Migration `supabase/migrations/20261118120000_saved_data.sql`.
- Phase 7 plan screen:
  - **Your daily plan:** "Build my daily plan" uses the place and the household answers on screen, saved or not.
  - **What a plan shows:**
    - who made it (AI or our rules);
    - the air notice first;
    - a 24-hour air check labelled as a model forecast, not a station or the CPCB AQI;
    - "Your day" for AI plans;
    - Outdoors and travel, Indoor air and Sustainable swaps.
    - Every card has a "Why?" panel with its reason, evidence, inputs, sources and caveat.
  - **Saving:** "Save plan", a saved-plans list (open as a dated snapshot, delete with confirmation).
  - **Forecast panel:** a 48-hour PM2.5/PM10 chart with a text summary (hand-drawn SVG, no new package).
  - **Other pages and panels:** a "Sources and limitations" panel, and a `/privacy` page linked from every footer.
  - **Stale data:** a running clock marks forecasts and plans older than an hour, even in a tab left open.
  - **Tests:** `npm run e2e` (Playwright, Chromium, desktop and phone) runs the full journey against the real services, plus the failure states, with axe in a real browser.
- Landing chapters 3–6 ("A plan for your day", "Cleaner air at home", "Small swaps, honestly", "See why, every time"). Each shows a real card from our rules, drawn by the app's own card and labelled "Example from our rules". A server test keeps the card text identical to the rules. No new screenshot.

- Phase 8 audit: public GitHub repo; CI adds gitleaks (full history) and a SonarQube Cloud scan with coverage; CodeQL default setup; real-browser axe on the landing and privacy pages.
### Changed
- Hosting decision: one Google Cloud Run service (ADR-005) instead of Vercel + Render.

### Fixed
- Phase 8: Gemini calls are capped at 200 per day per server and reused for identical requests; the Gemini key never follows a redirect; place labels reject control characters; the CPCB standards link uses https; a saved snapshot says "that day"; deleting one saved plan keeps keyboard focus and says so; a slow load no longer overwrites edited answers; the chart no longer assumes a unit.

### Security
- Phase 8: npm ci runs with --ignore-scripts in CI and the Docker image; every push is scanned for secrets.
- Coordinates with more than 2 decimals (~1.1 km) are rejected, so precise locations never reach request logs or Open-Meteo. The app never logs coordinates.
- Outbound hosts are fixed constants.
- Queries are Zod-validated.
- Provider failures return `502` and never fall back to demo data.
- Daily-plan requests: 4 KB body limit (`413 PAYLOAD_TOO_LARGE`), 10 per minute per IP, unknown fields rejected; malformed JSON is answered with `400` and never logged.
- Gemini gets no place name, coordinates, raw household answers or user text. The key travels only in a request header. Failures log a category only, never the key, prompts, answers or request bodies.
- Saved data: every request is checked twice. The server verifies the Supabase token and takes the user only from it, and Postgres RLS limits each query to that user's rows. The database enforces 20 plans per user and size limits, even for direct writes. Saved plans are built by the server, never taken from the client. No secret Supabase key is used. Logs never contain tokens, user ids, household answers or plan contents.

Do not list features as completed until they are implemented and verified.
