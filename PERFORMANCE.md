# AirAware AI — Performance and Efficiency

## Frontend
- Lazy-load secondary routes.
- Use optimized responsive images and SVG where possible.
- Avoid heavy 3D/particle backgrounds in the initial viewport.
- Stop or pause off-screen animations.
- Respect reduced-motion.
- Keep dashboard charts responsive and avoid rendering excessive points.
- Split bundles by route where appropriate.
- Minimize unnecessary React re-renders.

## Backend
- Set network and AI timeouts.
- Cache external air-quality results briefly with original timestamps.
- Do not cache user-specific plans across users.
- Limit conversation length and prompt size.
- Paginate saved plans if the dataset grows.
- Use indexed queries and avoid N+1 database calls.
- Rate-limit costly AI routes.
- Avoid duplicate plan generation from repeated submissions.

## Data efficiency
- Request only necessary forecast variables and time ranges.
- Normalize provider results once.
- Do not request full forecast history for a single-day card.
- Preserve source provenance when caching.
- Use a short TTL based on provider cadence; do not use an arbitrary stale threshold without documenting it.

## Visual performance
- Prefer transforms and opacity for animations.
- Avoid large blocking video backgrounds.
- Use static fallback for advanced visualizations.
- Defer decorative sections below the fold.
- Optimize chart labels for small screens.

## Measurement
Measure:
- Initial load and route load.
- Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift.
- API response latency.
- Provider latency/error rates.
- AI generation latency and token use.
- Cache hit rate.
- Bundle size.

Set realistic budgets after measuring the initial baseline. Do not claim performance improvement without comparing measured results.
