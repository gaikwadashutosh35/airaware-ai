# Changelog

All notable user-facing and engineering changes should be recorded here.

This project follows a simple Keep a Changelog-inspired structure. Versions and dates are placeholders until an actual release is made.

## [Unreleased]

### Added
- Initial project documentation and implementation plan.
- Phase 1 scaffold: npm workspaces (`server`, `client`), strict TypeScript, oxlint, Prettier, Vitest, GitHub Actions CI.
- `GET /api/v1/health` with security headers and a JSON 404 envelope.

### Changed
- Hosting decision: one Google Cloud Run service (ADR-005) instead of Vercel + Render.

### Fixed
- Not yet applicable.

### Security
- Not yet applicable.

Do not list features as completed until they are implemented and verified.
