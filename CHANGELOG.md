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
- Phase 9 deployment: live at https://airaware-ai.netlify.app.
  - Netlify serves the client from its CDN, and one Netlify Function runs the Express API (`DEPLOYMENT.md`).
  - Page security headers match the API's, and a test enforces it.
  - A Supabase keep-alive workflow runs every 3 days.
  - A nightly `pg_cron` job deletes anonymous accounts unused for 30 days.
  - The Playwright suite runs against any address with `E2E_BASE_URL`.
- Design system base (Phase 3 of the assistant redesign):
  - Inter is self-hosted: one Latin variable font file, 48 KB, OFL, under `client/public/fonts/`. It is preloaded and uses `font-display: swap`, and `font-size-adjust` keeps the fallback the same size;
  - buttons shrink slightly while pressed, only when motion is welcome, and never when disabled;
  - phones get no grey tap flash and no double-tap delay;
  - a real favicon replaces the blank one;
  - a new `--color-elevated` token is added for the navigation bars to come.
- Readout states (Phase C of the Stitch redesign):
  - the forecast loads behind a readout-shaped skeleton (still under reduced motion); the plan keeps a plain one;
  - errors show as a titled card, "We couldn't load the forecast", with the same message and "Try again";
  - an old forecast shows a "Not current: …" banner before the figure;
  - with no place chosen, a card offers "Search for a place", which focuses the search.
- Landing refresh (Phase B of the Stitch redesign):
  - the hero shows a fresh, dated capture of the new readout (skyline, weather line, PM2.5 and the 24-hour check);
  - the chapters and the four pipeline steps get decorative numbers "01"…"04" (hidden from screen readers), and the steps become cards.
- Weather in the readout scene (Phase A2):
  - the server adds this hour's Open-Meteo weather forecast (`weather`, null on failure);
  - the skyline draws clouds, rain, a heat band and fog from it, with a weather line in words that names its hour;
  - rain and its chance come from the row covering the current hour (Open-Meteo sums them over the hour before each row);
  - the rain falls for under 5 seconds, then rests, and stays still under reduced motion.
- Dashboard redesign (Phase A of the Stitch redesign):
  - a two-column layout from 1024 px, with a place bar and "Change place";
  - an air readout that leads with this hour's PM2.5 and states the server's 24-hour check in words;
  - a city skyline whose haze follows that check (decorative, never clear, neutral when there's no data);
  - "Your city, the next two days", with a pollutant table that has a 24-hour check only for PM2.5 and PM10;
  - plan cards, period labels and Air notice tags in the new style.
  - The forecast API now returns `airCheck`.
- Claude as backup plan writer (ADR-007): when Gemini gives no accepted answer, Claude (`claude-haiku-5-5`) is asked once. It uses the same input and the same checks, and has its own daily cap. The plan names the model that wrote it.

### Changed
- Hosting decision: Netlify (ADR-006), replacing one Google Cloud Run service (ADR-005), which had replaced Vercel + Render.
- On Netlify, rate limits key on Netlify's client-IP header, and `X-Forwarded-For` is ignored.
- Daily plan prompt `daily-plan-v2`: it never features the air notice, always features at least one action, and bans the unsafe words even when they are negated. Measured on Claude Haiku 5.5, 29 of 30 answers passed the checks, up from 14 of 41 with v1.

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
