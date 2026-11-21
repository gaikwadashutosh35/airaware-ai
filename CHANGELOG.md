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
- Adaptive cityscape (Today's scene):
  - a layered city: sky gradient, daylight glow, soft clouds, far, middle and near rows with rooftop tanks and lit windows (windows from 640 px);
  - its look follows only the server's `airCheck.level`: within, above or unknown. The five client-side haze levels and the smog band are gone;
  - weather drives the rest: clouds by cover (a deck at 80 % or more), rain only from a forecast amount, fog, heat, and a glow only by day;
  - the forecast's `weather` gains `isDay` (Open-Meteo `is_day`, same request);
  - the clouds settle once over 4.8 s, then rest, and stay still under reduced motion;
  - while the forecast loads, a still silhouette of the same city replaces the pulsing band.
- Cityscape backdrop (the scene behind every app page):
  - the adaptive scene is now the background of Today, Ask, My Home, Better Habits, My Profile and onboarding, drawn once and kept between pages;
  - every section sits on a solid panel; only each page's title block rests on the sky, in the dark text colour;
  - rain falls over the whole screen, fog stays at the city's base, and the veils fade in from the city's top;
  - the footer says the background follows the model forecast for the place, and when it is not current;
  - the hourly reload keeps the scene instead of flashing grey, and the band leaves Today's card, so the verdict sits higher on a phone;
  - on screens under 24rem (384 px) tall, such as a phone held sideways, the city hides, so a long place name in the title never lands on it.
- Responsive and accessibility pass (Phase 9 of the assistant redesign):
  - a new layout spec checks every page at 320, 640, 768, 1024 and 1280 px (nothing past the screen edge, one `h1`), plus 44 px targets, axe at phone width, 200 % text, WCAG text spacing and long place names;
  - the header wordmarks, the footer "Privacy" links and the source links now reach 44 px;
  - with text at 200 % the header row scrolls sideways instead of pushing the nav and the place chip off the screen; at normal text the header is unchanged;
  - in Windows High Contrast the backdrop steps aside, focus shows, the header reads, and the highlighted place suggestion, chosen Welcome chips and pressed Ask topics get an outline;
  - the keyboard walk and accessibility tree were checked on every page, and the owner ran a 12-item real-phone checklist (`docs/REAL_PHONE_CHECKLIST.md`).
- Review and release (Phase 10 of the assistant redesign):
  - a browser review of every page and state at 320, 768 and 1280, scored against `DESIGN.md`'s acceptance checklist in `docs/QA_REPORT.md`;
  - `e2e/copy.spec.ts` keeps the banned words ("safe", "healthy", "clean air", "good air", "bad air", a stray "AQI") off every page and state;
  - README and DEPLOYMENT claims corrected (forecasts only; the live site's checks).
- Landing (Phase 4 of the assistant redesign):
  - the hero has "Check My Air" (`/app`) and "Meet Your Assistant" (`/app/ask`), the place search under "Or search a city", and a phone screenshot of the new Today page;
  - eight sections: "Understand your air" (with a screenshot of the open Air quality details), the four rule-card chapters renamed "Your personal daily plan", "Improve indoor air", "Sustainable everyday choices" and "Explainable AI", "How AirAware works" (the 4 real steps as a flow, then the limits) and a closing "Check My Air";
  - both screenshots are real captures from 20 Nov 2026, labelled as past; the old readout screenshot is gone;
  - sections after the hero rise in as they scroll into view (CSS `animation-timeline: view()`), and stay still under reduced motion or without support;
  - `e2e/landing.spec.ts` checks the reveal, reduced motion and where the hero buttons lead on a first visit;
  - after review: sections finish rising in 120 px into view on phones too; the step arrows hide in the 2×2 grid (768–1023 px); the details screenshot is a 390 px phone capture, so it reads on a 320 px phone; a test keeps "safe", "healthy" and "clean air" off the page.
- Ask AirAware (Phase 7 of the assistant redesign):
  - `/app/ask`: six topic chips, five starter questions and a 200-character question box; a chip or starter asks at once;
  - `POST /api/v1/assistant/answer` takes a question or a topic. The question only picks a topic on the server (fixed word lists, medical first) and is never logged, stored, echoed or sent to an AI writer;
  - each answer: 1–2 sentences from the plan's writer (or the verdict's explanation), who made it, "Based on: {verdict} · Model forecast · updated {time}", "Not current" when old, up to three cards (your own first, then guides) with "Why?", and the safety note. Never a yes or no on safety;
  - medical and out-of-scope questions get fixed replies and no AI call; the endpoint shares the plan's 10-per-minute limit, daily AI budget and answers cache;
  - answers stay in memory for the visit, newest first, at most 10; a new place or "Delete my saved data" clears them. Today's ask box and its "Outdoor activities" and "My family" choices ask through it;
  - the Privacy page adds "What happens to your questions".
- Guide library, My Home and Better Habits (Phase 8 of the assistant redesign):
  - 17 general guide cards with neutral reasons and 10 cited sources (MoHFW, WHO, US EPA, CAQM/PIB, the Solid Waste Management Rules 2026, BEE), each opened and checked; wording fixed by `docs/superpowers/specs/2026-11-20-guide-library.md`;
  - `GET /api/v1/recommendations/guides?topic=home|habits`, outside the plan limit and cached for an hour; guide cards never enter a plan;
  - My Home: "Today, for your home" from today's plan, then "Ways to improve indoor air" in six groups; a guide repeating one of today's cards is hidden, and "Near a busy road" shows only after a yes;
  - Better Habits: commuting and idling, waste, cooking and energy use;
  - the plan also builds while My Home is open.
- Today (Phase 6 of the assistant redesign):
  - a greeting and "Today in {place}", then the verdict in one sentence with its word tag, "Model forecast · Open-Meteo · updated {time}", the "Not current" banner when stale, and the caveat;
  - "Your recommendation for today" builds by itself: when Today shows a place, after the answers change, and once the plan is over an hour old. One card with "Why this recommendation?"; "See your full day" folds the rest and "Save plan". "Build my daily plan" is gone; "Try again" stays for errors;
  - "What would you like help with?" (four choices) and "Ask AirAware anything" (three starter questions). A topic or question goes to Ask in memory, never in the address;
  - "Air quality details", closed, holds the PM2.5 figure, the forecast panel, the forecast location, "Official CPCB observations are not connected yet.", the 24-hour method and the sources. The limitations show the forecast's own lines plus the app's two;
  - a saved plan opens in My Profile with "Close", not on Today;
  - after review: a returning user's visit builds once, with the saved answers; "Made with AI" or "Made by our rules" and the safety note sit beside the card; the forecast reloads with the hourly rebuild; the plan's stale line says "The forecast behind this plan is more than an hour old."; focus stays put after help choices, Send and Try again; Ctrl/Cmd-clicks open new tabs; "Air quality details" has its own heading; a device location reads "Today near you (approximate)"; the tab is titled "Today".
- Onboarding (Phase 5 of the assistant redesign):
  - a first visit to `/app` gets three short steps: where, your day (office or school commute, outdoor exercise, work from home) and your home (cooking fuel, exhaust, purifier, busy road). Steps 2 and 3 can be skipped;
  - "Remember on this device" (off by default) saves the answers and the searched place with the existing anonymous save, so the next visit opens Today. A device location is never saved;
  - saved preferences gain an optional `place`, and PUT changes only the fields sent (`place: null` forgets);
  - Today invites "Make it personal: 2 quick questions" when you arrive with a place;
  - My Profile adds "Forget this place";
  - Today's old no-place card is replaced by Welcome.
- Navigation and app shell (Phase 2 of the assistant redesign):
  - every `/app` page shares one frame with five-item navigation (Today, Ask AirAware, My Home, Better Habits, My Profile). It is a bottom bar on phones and a navy top bar on larger screens, with a skip link and a phone-safe bottom inset;
  - a place button changes the place from any page, in a native dialog;
  - the household answers and saved plans move to My Profile. Answers stay unsaved while you move around;
  - moving between pages refetches nothing, and a built plan survives it;
  - back and forward work, and the address always names the place shown;
  - nav links scroll to the top;
  - the server and Netlify serve the app on every `/app/*` path.
- Design system base (Phase 3 of the assistant redesign):
  - Inter is self-hosted: one Latin variable font file, 48 KB, OFL, under `client/public/fonts/`. It is preloaded and uses `font-display: swap`;
  - buttons shrink slightly while pressed, only when motion is welcome, and never when disabled;
  - with reduced motion, a pressed button fades slightly instead, so taps still give feedback;
  - phones have no double-tap delay;
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
