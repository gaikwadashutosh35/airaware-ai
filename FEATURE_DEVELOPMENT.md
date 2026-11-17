# AirAware AI — Core Feature Development Steps

## Development rule

Each feature must be implemented as a small vertical slice: contract → rule/service → API → UI → tests → documentation. Do not build attractive screens with fake production behavior.

## Feature 1 — Location selection

1. Implement manual city/area search as the default.
2. Add optional geolocation only after explicit user action.
3. Validate latitude and longitude.
4. Normalize location label and coordinates through a provider adapter.
5. Show selected location and allow editing.
6. Do not persist precise coordinates unless the user explicitly saves the location.

Tests: denied permission, unavailable browser API, invalid coordinates, empty search, ambiguous place.

## Feature 2 — Air-quality data layer

1. Define `AirQualitySnapshot` and `DataKind`.
2. Implement provider interface.
3. Implement Open-Meteo forecast adapter.
4. Investigate CPCB data access and terms; build adapter only if supported.
5. Add clearly labelled demo adapter.
6. Normalize pollutant names/units/timestamps.
7. Assess freshness and preserve original source time.
8. Separate current observation from forecast in API and UI.

Tests: provider success/error, missing variables, unit conversion, timestamp parsing, stale response, no AQI calculation from incomplete data.

## Feature 3 — AQI/category display

1. Display CPCB National AQI only when source/method is valid.
2. Implement CPCB category mapping as a deterministic tested function.
3. Display pollutant concentration when an official AQI cannot be supplied.
4. Never map US/EU AQI into CPCB fields.
5. Add accessible text equivalents to chart/status colors.

Tests: category boundaries, invalid values, unknown index type, PM2.5-only dataset.

## Feature 4 — Household preferences

1. Build optional form with simple language.
2. Provide “Prefer not to say” where appropriate.
3. Do not collect diagnoses or medication.
4. Keep coordinates transient unless saved by user.
5. Store preferences with RLS.
6. Add edit/delete controls.

Tests: validation, user ownership, deletion, preference changes affect plan.

## Feature 5 — Deterministic recommendation engine

1. Define rule interface with rule ID, eligibility predicate, output template, and evidence type.
2. Pass validated snapshot and household context.
3. Exclude rules if required data is missing or stale.
4. Create candidates for routine, commute, indoor sources, and sustainable habits.
5. Attach reason code and relevant input fields.
6. Keep threshold values in reviewed config with source references.
7. Unit-test each rule and edge condition.

Never place medical thresholds or unsupported numerical advice in code.

## Feature 6 — AI personalization

1. Implement provider-neutral `AIProvider`.
2. Construct prompts only from validated data and allowed rule candidates.
3. Bound token/context size.
4. Require structured JSON output.
5. Validate with Zod.
6. Reject invented readings, unsupported sources, diagnosis/treatment claims, safety guarantees, and numeric impact claims.
7. Allow bounded retry only for transient malformed provider responses.
8. Provide safe failure and deterministic recommendations if AI is unavailable, clearly labelled as non-AI rules output.

## Feature 7 — Indoor air assistant

1. Collect only relevant home context.
2. Model outdoor infiltration and indoor source-control as separate factors.
3. Consider cooking smoke, tobacco/incense/candles, exhaust, filtration, and ventilation context.
4. Do not make blanket open/close-window instructions.
5. Provide reasons and caveats.
6. Test contradictory contexts, e.g. poor outdoor air with active indoor cooking source.

## Feature 8 — Sustainable swaps

1. Group by transport, idling, waste, cooking, and energy.
2. Suggest realistic options based on user context.
3. Do not moralize or assume every swap is affordable/available.
4. Do not show quantified emissions reduction unless sourced and calculated transparently.
5. Add dismiss/save feedback.

## Feature 9 — Daily plan and persistence

1. Build morning, commute, daytime, evening, and home sections.
2. Show source context and generation time.
3. Permit user to save/unsave plan.
4. Store data provenance snapshot.
5. Revalidate freshness when refreshing, and never present a saved old plan as today's current reading.
6. Add delete controls.

## Feature 10 — UI states and localization

Build loading, empty, stale, unavailable, demo, and error states. Ensure keyboard access, readable contrast, reduced motion, and translated strings if language selection is available.

## Definition of done

- Acceptance criteria met.
- Tests cover core and edge cases.
- Typecheck/lint/build pass.
- Provenance and safety review pass.
- No fake controls or undisclosed demo values.
- Browser-rendered UI reviewed at mobile and desktop widths.
