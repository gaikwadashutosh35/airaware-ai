# AirAware AI — Product Requirements Document

**Challenge:** Hack2skill PromptWars Virtual — Main Challenge 06  
**Vertical:** Urban Air Quality Assistant  
**Product:** AirAware AI  
**Tagline:** Breathe smarter. Make informed daily choices.

## 1. Executive summary

AirAware AI is a GenAI-powered household and community assistant that converts available air-quality information into practical, personalized actions. It helps users understand local readings and forecasts, adapt daily routines, improve indoor air practices, explore lower-emission alternatives, and understand why a recommendation was made.

The product is not a generic AQI dashboard, medical diagnostic tool, municipal enforcement application, or a guarantee that an outdoor activity is safe. Its value is the decision-support layer that connects validated environmental data with user-declared routines and home context.

## 2. Problem statement

People may find air-quality numbers difficult to translate into useful everyday choices. They need to know what data is available, how current it is, what it means for a typical routine, and which practical changes are reasonable. Households also need indoor guidance that does not ignore indoor pollution sources or oversimplify ventilation decisions.

## 3. Challenge alignment

The Challenge 06 direction is an Urban Air Quality Assistant for families and communities, with four central expectations:

1. Personalized low-emission routines.
2. Practical indoor air-quality improvements.
3. Sustainable everyday swaps.
4. Explanations behind recommendations.

## 4. Product goals

- Show relevant air-quality observations and/or forecasts with accurate provenance.
- Distinguish official observations, model forecasts, and demo data.
- Generate useful, context-aware daily action plans.
- Give practical indoor-air suggestions based on declared household conditions.
- Suggest feasible low-emission alternatives without unsupported impact claims.
- Explain the input, rule, data source, assumption, and limitation behind each action.
- Provide a usable mobile and desktop experience.

## 5. Non-goals

- Medical diagnosis, treatment, medication, or individualized clinical advice.
- Guaranteeing an activity, route, time, or place is safe.
- Street-level pollution prediction without street-level validated data.
- Claiming a particular source caused pollution without defensible evidence.
- Municipal enforcement, compliance reporting, or emergency dispatch.
- Vendor/product marketplace or air purifier sales in the MVP.
- Numerical CO2/PM reduction claims without documented factors and methodology.

## 6. Primary personas

### Persona A — Daily commuter
Needs to understand the available pollution information and make practical commuting decisions without being told an unverified route is safe.

### Persona B — Parent or family organizer
Needs understandable guidance for school commutes, outdoor play, exercise, and household routines.

### Persona C — Household with a potentially more sensitive member
May choose a broad sensitivity preference to receive cautious general information. The product must not ask for a diagnosis or infer a condition.

### Persona D — Community volunteer
Needs a source-labelled summary that can be shared with neighbors without exaggerating certainty.

## 7. MVP scope and priorities

### P0 — Must deliver

- Landing page explaining product and limitations.
- Manual city/area search.
- Optional browser geolocation with explicit permission.
- Air-quality dashboard with provider, data kind, timestamp, pollutant, unit, and freshness.
- Clearly separated observation and forecast views.
- Optional household routine and home preferences.
- Personalized daily action planner.
- Indoor air assistant.
- Sustainable swaps.
- Explainability panel for every recommendation.
- Save and revisit a plan (authenticated or clearly isolated demo mode).
- Loading, empty, stale-data, unavailable-provider, and error states.
- Responsive, keyboard-usable, accessible UI.

### P1 — Add only after P0 is stable

- Saved locations and plan history.
- Community share card.
- English, Hindi, and Marathi UI/content support.
- Reminder preferences.
- Feedback on recommendation usefulness.
- An impact tracker only after a defensible methodology is available.

## 8. User stories and acceptance criteria

| ID | User story | Acceptance criteria |
|---|---|---|
| US-01 | As a visitor, I can search for a city manually. | Search works without requesting GPS permission; invalid locations show a useful message. |
| US-02 | As a visitor, I can optionally use my location. | Browser permission is requested only after an explicit action; denial does not block manual search. |
| US-03 | As a user, I can understand the reading. | Every displayed value shows source, data kind, timestamp, pollutant, and unit. |
| US-04 | As a user, I can distinguish measured and forecast data. | Observation and model forecast use separate labels and visual treatments. |
| US-05 | As a user, I can personalize a plan. | Optional routine/home inputs affect recommendations through documented rules. |
| US-06 | As a user, I can see why an action is suggested. | Each action includes reason, evidence type, source reference when relevant, and caveat. |
| US-07 | As a user, I can improve indoor practices. | Suggestions consider indoor sources and outdoor conditions; no blanket window instruction. |
| US-08 | As a user, I can discover sustainable swaps. | Suggestions are practical and have no unsupported emissions claim. |
| US-09 | As a user, I can save/delete my plan. | Persistence works; users cannot access another user's data. |
| US-10 | As a user, I can rely on stale-data warnings. | Old or missing data is not displayed as current; AI is not given stale data as current context. |

## 9. Core user journey

1. Open the landing page.
2. Search for a city/area or explicitly allow geolocation.
3. Retrieve available observation and forecast data independently.
4. Review provider, timestamp, data kind, pollutant, unit, and limitations.
5. Optionally declare routine and home context.
6. Generate a daily plan.
7. Review actions, explanations, and caveats.
8. Save or share the plan.
9. Revisit, update, or delete the plan and preferences.

## 10. Personalization inputs

Keep fields optional and minimal:

- Location label.
- Commute mode: walk, cycle, two-wheeler, car, public transport, work from home.
- Outdoor exercise habit.
- School commute.
- Home near a busy road (yes/no/unknown).
- Cooking fuel category: LPG, electric, biomass, other, prefer not to say.
- Kitchen exhaust availability.
- Air purifier availability.
- Whether children or older adults are in the household.
- Broad preference that someone may be more sensitive to air pollution.
- Language: English, Hindi, Marathi.

Do not request or store diagnoses, medication, or detailed health history.

## 11. Air-quality data requirements

Use a canonical model that preserves:

- Provider and source URL.
- Data kind: `official_observation`, `model_forecast`, or `demo`.
- Location label; coordinates only as needed and only persisted with consent.
- Pollutant, numeric value, unit, and timestamp.
- Observation time or forecast-valid time.
- Station name/ID for station observations where available.
- Model source/resolution for forecast data where documented.
- Retrieval time, freshness, and limitations.

Do not label Open-Meteo's European AQI or US AQI as CPCB National AQI. Do not calculate CPCB National AQI from a single pollutant or incomplete inputs. CPCB methodology uses pollutant sub-indices and averaging periods.

## 12. Recommendation behavior

The deterministic rules engine decides which guidance is eligible. AI may personalize wording and explain the decision, but cannot invent readings or override data provenance.

- Poorer official category: show relevant exposure-reduction information with observation timestamp and source.
- Outdoor exercise habit: advise checking current local conditions and considering an indoor alternative when pollution is elevated.
- Cooking smoke context: prioritize source control and appropriate exhaust/ventilation information.
- Busy-road context: explain temporal/local variability; do not claim street-level certainty.
- Stale/missing data: do not present a confident current-condition plan.
- Forecast differs from observation: display both, identify their different time/data types, and explain uncertainty.
- Household sensitivity preference: use cautious general language without diagnosis-specific inference.

Exact thresholds and recommendation wording must be grounded in current official or credible public-health guidance. Do not invent numerical exposure thresholds.

## 13. Indoor air requirements

Avoid blanket statements such as “always close all windows” or “always open windows.” Consider outdoor pollution, indoor cooking emissions, tobacco smoke, incense/candles, cleaning products, kitchen exhaust, filtration, building conditions, and comfort. Explain trade-offs. Staying indoors is not automatically protective if indoor sources are present.

## 14. Sustainable swaps

Potential categories: avoid unnecessary vehicle idling, consolidate trips, consider public transport/carpooling/walking/cycling when practical, avoid open burning of waste, consider cleaner cooking options where feasible, and reduce avoidable energy use. Do not quantify benefits without documented factors, assumptions, and transparent calculations.

## 15. Accessibility and design

- Keyboard access for search, navigation, cards, and dialogs.
- Visible focus and semantic headings.
- Do not use color as the sole status indicator.
- Charts have text summaries.
- Support reduced motion.
- Meet readable contrast and text sizing.
- Responsive desktop, tablet, and mobile layouts.
- Clear stale-data, unavailable, empty, loading, and error states.

## 16. Success metrics for the MVP

- Successful manual location search.
- Data labels correctly preserve source and type.
- Daily plan responds to changed household context.
- Every recommendation has a meaningful explanation.
- Stale/missing data is handled safely.
- No cross-user access in authorization tests.
- Main end-to-end journey works on desktop and mobile.
- Critical unit/integration tests pass.

## 17. Assumptions and constraints

- Initial target audience is urban households/communities in India.
- CPCB is the reference for India's National AQI and official station observations when supported data access is verified.
- Open-Meteo may provide model forecasts; it is not a CPCB monitoring-station feed.
- The app may launch with a clearly labelled demo mode if a verified official data integration is not available.
- The challenge requires a public GitHub repository, one branch, repository size below 10 MB, and a README. Verify the official submission guide for any additional requirements.
