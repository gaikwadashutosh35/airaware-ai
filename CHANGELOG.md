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

### Changed
- Hosting decision: one Google Cloud Run service (ADR-005) instead of Vercel + Render.

### Fixed
- Not yet applicable.

### Security
- Coordinates with more than 2 decimals (~1.1 km) are rejected, so precise locations never reach request logs or Open-Meteo. The app never logs coordinates.
- Outbound hosts are fixed constants.
- Queries are Zod-validated.
- Provider failures return `502` and never fall back to demo data.

Do not list features as completed until they are implemented and verified.
