# AirAware AI — Environmental Data Governance

## 1. Data classes
- Official observation: measured/officially published data from a verified provider.
- Model forecast: model-derived estimate for a grid/time.
- Demo fixture: deterministic synthetic/test data, always labelled demo.
- User context: optional preferences and saved locations.
- Derived recommendation: app rule/AI explanation built from validated data.

## 2. Required metadata
For every data point record:
- Provider name.
- Source URL or provider reference.
- Data class.
- Pollutant/index name.
- Value and unit.
- Observation or forecast timestamp.
- Retrieval timestamp.
- Station name/ID or model grid/resolution, if available.
- Freshness status.
- Limitations and missing fields.

## 3. Normalization
- Use explicit conversion functions.
- Keep source-native values and units available for debugging.
- Validate numeric bounds and timestamp parsing.
- Reject impossible or malformed data.
- Do not compare different AQI systems as if they were equivalent.
- Do not generate CPCB National AQI from incomplete data.

## 4. Freshness and caching
- Define provider-specific TTLs from source cadence and product requirements.
- Preserve original source timestamp when caching.
- Mark cached data stale when age exceeds policy.
- Do not update observation timestamps to cache retrieval time.
- A provider outage must not cause demo data to appear as live.
- Show last updated time and stale warning.

## 5. Attribution and licensing
Before production use:
- Review provider terms, attribution requirements, rate limits, and commercial-use restrictions.
- Record an approved source reference.
- Avoid scraping undocumented endpoints.
- Respect source availability and redistribution limitations.
- Recheck terms when changing providers or product distribution.

## 6. AI boundary
The data provider and deterministic normalization layer own environmental values. The AI receives validated context and may explain allowed rules. AI must not author readings, AQI categories, sources, timestamps, or model resolution.

## 7. Data quality incidents
When values look anomalous:
1. Preserve provider metadata and request ID.
2. Compare with the source where available.
3. Check units/timezone and pollutant mapping.
4. Check missing values and cache age.
5. Mark data unavailable if unresolved.
6. Do not silently patch or fabricate values.
7. Add a regression fixture/test.

## 8. Change control
Changes to AQI mapping, unit conversion, freshness policy, source adapter, or recommendation thresholds require:
- documented source and method;
- test fixtures including boundaries;
- review of UI wording;
- update to docs;
- human approval before production.
