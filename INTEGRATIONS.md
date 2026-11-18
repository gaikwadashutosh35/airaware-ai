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

## 4. Runtime AI provider — Gemini

- Calls must originate from the backend.
- Store API key in backend secret configuration.
- Use a provider-neutral interface so the model can be changed.
- Send only validated environmental context and permitted recommendation candidates.
- Use structured output plus Zod validation.
- Set request timeout and bounded token limits.
- Avoid sending exact coordinates or unnecessary household details.
- Do not let AI invent readings, sources, medical advice, or emissions estimates.

Official docs: https://ai.google.dev/gemini-api/docs

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

- **Source:** CPCB, National Ambient Air Quality Standards, notification No. B-29016/20/90/PCI-L, 18 November 2009 (`http://cpcb.nic.in/uploads/National_Ambient_Air_Quality_Standards.pdf`). Values verified 2026-11-18 against a copy of the notification.
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
