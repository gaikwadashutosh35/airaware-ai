# AirAware AI — Third-Party Integrations

## 1. Integration principles

- Each provider is isolated behind an adapter.
- Preserve provider attribution, timestamps, units, and limitations.
- Verify current terms, quotas, access requirements, and commercial-use rules before launch.
- Do not scrape undocumented endpoints.
- A provider failure must not fabricate or relabel data.
- Prefer server-side provider calls where keys or policy controls are required.

## 2. CPCB — official Indian AQI reference

Resources:
- National AQI dashboard: https://app.cpcbccr.com/AQIIndia
- CPCB resource centre: https://app.cpcbccr.com/ccr_docs
- National AQI report: https://app.cpcbccr.com/ccr_docs/FINAL-REPORT_AQI_.pdf

Use CPCB as the reference for India's National AQI categories and station observations. Verify whether a supported, permitted machine-readable feed is available to the project. A dashboard being publicly accessible does not imply an API is supported for programmatic reuse. Do not reverse engineer undocumented endpoints or bypass access controls.

CPCB category bands:
- Good 0–50
- Satisfactory 51–100
- Moderate 101–200
- Poor 201–300
- Very Poor 301–400
- Severe 401–500

The National AQI uses pollutant sub-indices based on valid pollutant data and averaging periods. Never calculate it from a single pollutant or missing inputs.

## 3. Open-Meteo Air Quality API

Documentation: https://open-meteo.com/en/docs/air-quality-api

Potential data include hourly PM2.5, PM10, ozone, nitrogen dioxide, sulphur dioxide, and carbon monoxide. It provides model-based forecast data. The documentation describes different model domains/resolutions; record the applicable model/resolution for the requested region and date.

Rules:
- Label as `model_forecast`.
- Include forecast-valid time and retrieval time.
- Display pollutant unit (commonly µg/m³ for the listed particulate/gas concentration variables; use the exact API field unit).
- Never present it as a CPCB station measurement.
- Do not relabel European/US AQI fields as CPCB National AQI.
- Review attribution, license, quota, and commercial-use requirements before production.

### Open-Meteo Weather Forecast API (Phase A2)

- **Endpoint:** `https://api.open-meteo.com/v1/forecast`, a fixed constant. It is called by the server only, never the browser.
- **Request:** the same 2-decimal coordinates as the air call, with `hourly=temperature_2m,precipitation,precipitation_probability,cloud_cover,visibility,is_day`, `timeformat=unixtime`, `timezone=auto`, `past_days=1`, `forecast_days=2` and `daily=temperature_2m_max,temperature_2m_min,precipitation_sum` (yesterday, today and tomorrow in the place's own time).
- **Use:** only the hour containing the request time. Precipitation and its probability are sums over the hour before each row, so that hour's values come from the next row; `is_day` comes from the row itself. It drives the app backdrop (`CitySkyline`, behind every app page: clouds, rain, heat, and the daylight glow when `is_day` is 1, until an hour after the weather's own hour) and one line of words. Visibility is in the words only: there is no fog band (owner, 22 Nov).
- **Failure:** any failure gives `weather: null`, and the air forecast is unaffected. Logs name the host only, never the coordinates.
- **Terms:** free tier, no key, CC BY 4.0 attribution ("Weather forecasts from Open-Meteo.com."), the same as the other Open-Meteo APIs.

## 4. Runtime AI provider — Gemini

- Calls must originate from the backend.
- Store API key in backend secret configuration.
- Use a provider-neutral interface so the model can be changed.
- Send only validated environmental context and permitted recommendation candidates.
- Use structured output plus Zod validation.
- Set request timeout and bounded token limits.
- Avoid sending exact coordinates or unnecessary household details.
- Do not let AI invent readings, sources, medical advice, or emissions estimates.

**As built (Phase 5, daily plan only):**
- **Model:** `gemini-3.8-flash` (stable, released 2026-09-02, no shutdown date announced; checked 2026-11-18). Override with `GEMINI_MODEL`. The 2.5 models shut down on 2026-12-01.
- **Key:** `GEMINI_API_KEY`, optional. Without it every daily plan is rules-only.
- **Call:** REST `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `fetch` (no SDK dependency). The key goes in the `x-goog-api-key` header, never the URL. JSON mode with a JSON Schema generated from the Zod output schema; `thinkingConfig.thinkingLevel` `low`; `maxOutputTokens` 8192 (thinking tokens count toward it); no `temperature` (deprecated for Gemini 3 models); 10-second timeout.
- **Provider-neutral seam:** routes depend on `GeneratePlan` (`(input) => Promise<string>`), so another model can replace `server/src/services/ai/gemini.ts`.
- **What is sent:** the air check (level; PM2.5/PM10 status, 24-hour average and limit) and the rules' candidates (id, section, priority, title, text, reason). The prompts are `AI_PROMPTS.md` §2 and §3 (`daily-plan-v1`); the data goes in a separate message introduced as data.
- **Not sent:** the place label, coordinates, raw household answers, the forecast window time, or anything a user typed.
- **Free tier:** Google may use free-tier prompts and responses to improve its products, and people may review them. The input above holds only the app's own fixed text and model-forecast numbers.
- **Checks:** schema, lengths, candidate ids (exact match, every high-priority action included), numbers only from the input (number words and number-plus-unit pairs included), banned wording (safety and health claims, named conditions, AQI, reassurance such as "the air is clean"). The full list is in the Phase 5 spec, check 5. Invalid JSON or schema → one retry. Any other failure → a labelled rules-only plan.
- **Logging:** one line, `Gemini plan failed: <category>` (`timeout`, `http <status>`, `network`, `empty response`, `invalid json`, `schema`, `length`, `ids`, `numbers`, `wording`). Never the key, prompts, Gemini's text, household details, labels, coordinates or request bodies.
- **Ask AirAware (redesign Phase 7):** `POST /api/v1/assistant/answer` uses the same writer, so one daily budget and one 10-minute answers cache cover plans and Ask. For a topic chip, a follow-up re-ask, or a typed question when no Anthropic key is set, the server picks a topic and the question is never sent to Gemini; the writer gets the same input as for a plan (the air check and the topic's cards), so the free-tier basis above is unchanged. A typed question that the medical word list does not flag goes to Claude instead (section 4A). Questions the list flags call no AI. An Ask summary that reads as a yes or no on safety falls back to rules, logged as the constant line `Ask summary failed: verdict`.
- **Not built:** an open chat. Ask AirAware answers one question at a time; the client may send up to 2 earlier questions with a new one, and the server stores no conversation.

Official docs: https://ai.google.dev/gemini-api/docs

## 4A. Runtime AI provider — Anthropic Claude

Claude Haiku (`claude-haiku-5-5`) has two jobs: the backup writer for the daily plan and topic summaries (ADR-007), and the only reader of typed Ask AirAware questions (J26, ADR-008).

**Typed Ask questions:**
- **Purpose:** answer a typed question from AirAware's own rules and forecast. Claude returns `scope`, `answer`, `topic` and 0 to 3 `cardIds`. It writes no card text and no sources.
- **Sent:** the question; up to 2 earlier questions from the visit (medical ones dropped), each with the titles of the cards shown for it; the 24-hour check; the text of the cards the rules allow for this household (id, section, priority, title, text, reason); and the forecast's provider, data kind and limitations.
- **Not sent:** the place name, coordinates, raw household answers, timestamps, source ids, or any earlier answer text. A question the medical word list flags calls no AI.
- **Checks:** answer 20 to 300 characters; card ids only from the cards sent (0 to 3, no repeats); numbers only from the check, the cards and the forecast block (numbers in the question never count); banned wording; no yes or no on safety. Any failure gives the rules' answer (`summary` null, `generatedBy` `rules`). There is no retry, no caching by question text, and no Gemini call after a Claude failure.
- **Limits:** 200 Claude Ask calls per UTC day per server instance (in memory), and the 10-per-minute limiter shared with the other AI routes. Typical cost is about $0.0005 a call; the worst case is about $0.0025 a call (4096 output tokens at $0.50 per million, plus input; Haiku 5.5: $0.10 per million input tokens), so about $0.50 a day per instance at the cap (`COST_AND_LIMITS.md`).
- **Configuration:** `ANTHROPIC_API_KEY` (optional, server-only) and `CLAUDE_MODEL`. Without the key, typed questions fall back to the topic path: fixed word lists pick a topic, Gemini may word that topic's cards, and the question itself is never sent to Gemini. The Ask page intro, "Claude (Anthropic) reads your question and answers from AirAware's rules and today's forecast.", assumes the key is set. The client pins `https://api.anthropic.com`.
- **Logging:** one line, `Claude ask failed: <category>` (`timeout`, `network`, `refusal`, `max_tokens`, `empty response`, `http <status>`, `daily limit`, `unexpected`, or the name of the check that failed). Never the key, the question, the prompt, Claude's text or any household detail.

**Anthropic's terms** (checked 2026-11-28):
- API inputs and outputs are deleted within 30 days, and kept longer only to enforce the Usage Policy or where the law requires (https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data, dated 1 Jul 2026).
- They are not used to train models by default (https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training, dated 18 Aug 2026).
- The covered-models policy (article 15425996, https://privacy.claude.com/en/articles/15425996) applies only to Mythos-class models, not to Haiku.

Official docs: https://platform.claude.com/docs


## 5. Supabase

Uses:
- Authentication.
- PostgreSQL.
- Row Level Security.
- Optional saved plans and household preferences.

Official docs:
- Auth: https://supabase.com/docs/guides/auth
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- React Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react

Use public browser-safe keys with RLS. Keep service-role credentials server-side. Test with distinct user accounts.

**As built (Phase 6, saved preferences and plans):**
- **Sign-in:** anonymous sign-in only, created on the first save click. No email, password or name. The built-in email sender only reaches members of the project's own Supabase organization, at 2 emails per hour, so email sign-in is not usable on the free plan (checked 2026-11-18). Anonymous sign-ins are limited to 30 per hour per IP by default.
- **Keys:** the publishable key (`sb_publishable_…`) only, in the browser and on the server. The secret key is not used. The server refuses to start with any other key in `SUPABASE_PUBLISHABLE_KEY`.
- **Token check:** the server verifies each bearer token with `supabase.auth.getClaims` (the project JWKS, or the Auth server for legacy keys), then queries as that user so RLS applies. Every Supabase request times out after 10 seconds, and PostgREST retries are off, so a failure or a hang becomes `503 SAVE_UNAVAILABLE` within 10 seconds. A token that is malformed in any way gets `401`, never `500`.
- **Region:** South Asia (Mumbai).
- **Free-plan limits:** a free project pauses after 7 days of low activity. While paused, saving returns `SAVE_UNAVAILABLE`; a keep-alive is a Phase 9 task.
- **Not built:** email or Google sign-in, linking an email to an anonymous account, CAPTCHA.

## 6. Geocoding/location search

Implement a provider interface and keep manual location input as fallback. Select a provider only after reviewing coverage, terms, rate limits, attribution, and privacy. Do not send user coordinates to third parties without disclosure. Browser geolocation requires explicit consent.

Potential provider references to evaluate:
- OpenStreetMap/Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
- Google Maps Platform: https://developers.google.com/maps/documentation

Do not assume a public/free geocoder allows high-volume use.

**Selected (Phase 2): Open-Meteo Geocoding API.** Endpoint: `https://geocoding-api.open-meteo.com/v1/search`.
- Settings: `countryCode=IN` (PRD audience is India) and `count=5`.
- Terms are the same as Open-Meteo: non-commercial free tier and CC BY 4.0.
- Only the typed place name is sent, never user coordinates.
- All `/api/v1` calls are rate-limited to 60/min per IP.

### Google Maps Geocoding, reverse (owner, 27 Nov)

- **Endpoint:** `https://maps.googleapis.com/maps/api/geocode/json` (`server/src/services/location/reverseGeocode.ts`), a fixed constant, called by the server only through `GET /api/v1/locations/reverse`.
- **Request:** after "Use my location", the same 2-decimal coordinates (about 1 km) as `latlng`, with `result_type=locality` and `language=en`. Nothing else is sent.
- **Key:** `GOOGLE_MAPS_API_KEY`. Without it no request is made and `name` is `null`.
- **Caching:** none. The name is not cached or stored (Google Maps terms), and the response is `Cache-Control: no-store`. It is shown beside a "Google Maps" credit and never sent on with a plan or question.
- **Failure:** any failure, or no locality, gives `name: null`; the place stays "Near you (approximate)". Logs name the host only, because the query holds the key.

### NASA FIRMS active fires (owner, 27 Nov)

Not geocoding: fire hotspots near the chosen place, shown on Today.

- **Endpoint:** `https://firms.modaps.eosdis.nasa.gov/api/area/csv` (`server/src/services/fires/firms.ts`), a fixed constant, called by the server only through `GET /api/v1/fires/nearby`.
- **Request:** a box about 100 km wide around the same 2-decimal coordinates, for the VIIRS NOAA-20 and NOAA-21 near-real-time sources. Nothing else is sent.
- **Key:** `FIRMS_MAP_KEY`. Without it no request is made, the answer is `not_configured` and the card stays hidden.
- **Caching:** 30 minutes per rounded place, in server memory only.
- **Failure:** if either satellite's request fails, the answer is `unavailable`, never a smaller count, and it is not cached.
- **Data kind:** `satellite_detection`, never an air-quality reading. Attribution: "Fire hotspots from NASA FIRMS (Fire Information for Resource Management System)."

## 7. GitHub CodeQL

Reference: https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql

Use GitHub CodeQL for JavaScript/TypeScript code scanning. Public repositories on GitHub.com are eligible for code scanning subject to current GitHub feature/plan rules. Prefer default setup for a simple repository; use advanced workflow setup only when customization is needed. Review alerts and validate them rather than blindly dismissing.

## 8. SonarQube Cloud

Reference: https://docs.sonarsource.com/sonarqube-cloud/

Use for bugs, vulnerabilities, code smells, duplication, maintainability, and quality gate. For a `client/` + `server/` monorepo, verify analysis configuration and source/test paths. Use CI-based analysis if automatic analysis does not fit the monorepo setup. Do not treat a green gate as proof of correctness.

## 9. Visual quality — Unslop and Hallmark

- Unslop: https://github.com/heydamir/unslop
- Hallmark: https://github.com/nutlope/hallmark

Use on rendered UI, not just source. Unslop can run shell commands and includes scripts; inspect the exact skill files and commands before installing/running. It is licensed CC BY 4.0; retain attribution if copying/adapting its material. Use Hallmark when an initial structured visual direction or page audit is useful. Do not install both blindly or run redundant redesign workflows.

## 10. Hosting

- Vercel: https://vercel.com/docs
- Render: https://render.com/docs

Check current pricing, plan limits, region, build commands, cold-start behavior, and environment variable settings. Live URLs must be tested before appearing in the README.

## 11. Failure and fallback policy

| Integration failure | Required app behavior |
|---|---|
| CPCB feed unavailable | Mark official observation unavailable; do not invent it |
| Open-Meteo unavailable | Show provider unavailable/stale state; no fabricated forecast |
| AI unavailable | Show deterministic rule-based actions if valid; label as non-AI/fallback |
| Supabase unavailable | Preserve safe UI state and show save unavailable; do not claim persistence |
| Geocoder unavailable | Permit manual location entry with limits explained |
| Location permission denied | Continue with manual search |

## 12. Recommendation thresholds

The rules engine (`server/src/services/recommendations/`) needs one signal for "the air is worse than usual today". It uses India's national 24-hour limits, not an AQI.

- **Source:** CPCB, National Ambient Air Quality Standards, notification No. B-29016/20/90/PCI-L, 18 November 2009 (`https://cpcb.nic.in/uploads/National_Ambient_Air_Quality_Standards.pdf`). Values verified 2026-11-18 against a copy of the notification.
- **Limits (24-hour average):** PM2.5 60 μg/m³, PM10 100 μg/m³.
- **Method:**
  1. Take the 24 Open-Meteo forecast hours starting at the UTC hour that contains now. Each must be exactly one hour after the previous.
  2. Per pollutant, the unit must be `μg/m³` and all 24 values present; otherwise that pollutant is unknown.
  3. Average, round to 1 decimal, then compare: above the limit only if greater than it.
  4. Elevated if either pollutant is above; not elevated if both are within; otherwise unknown.
- **Known limit:** NAAQS compliance is judged on measured station values over a year ("complied with 98% of the time in a year"). A 24-hour mean of a ~45 km model grid is an approximation. Whenever an air-based recommendation appears, the air notice appears too, with the caveat that this is a model forecast for an area about 45 km wide, not a station measurement and not the CPCB National AQI. Every air-based recommendation cites Open-Meteo and the NAAQS as sources. Phase 5 must never drop that notice.
- **Time range:** the result records the first of the 24 hours averaged (`windowStart`, UTC), so the page can show which hours the averages cover.
- **Not done:** no CPCB National AQI and no CPCB category is computed from these values.
- **Change control:** changing a limit or the method needs the steps in `DATA_GOVERNANCE.md` §8.
