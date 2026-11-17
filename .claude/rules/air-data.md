---
paths:
  - "server/src/services/air-data/**/*.ts"
  - "server/src/services/recommendations/**/*.ts"
  - "client/src/features/air-quality/**/*"
---

# Air-Quality Data Integrity Rules

- Keep official observations, model forecasts, and demo fixtures as separate data kinds.
- Never relabel US/European AQI as CPCB National AQI.
- Never calculate CPCB AQI from incomplete required inputs.
- Preserve provider, source URL, pollutant, unit, timestamp, station/model metadata, and limitations.
- Mark stale/unknown data.
- No invented readings, stations, alerts, or timestamps.
- Provider failure does not silently become demo/live data.
- AI may explain validated values but cannot author or modify environmental measurements.
- Indoor guidance must consider indoor pollution sources and outdoor conditions.
