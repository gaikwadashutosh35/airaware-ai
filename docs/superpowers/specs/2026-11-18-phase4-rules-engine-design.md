# Phase 4 — Recommendation Rules Engine (short design)

Status: approved by the owner on 2026-11-18 ("Your pick, go with 1"; "Approve, write the plan").

Sources this design builds on:
- `PRD.md` §10 (personalisation inputs), §12 (recommendation behaviour), §13 (indoor air), §14 (swaps).
- `TESTING_QA.md` §6 (recommendation scenarios 1–8).
- `API.md` §3–4 (`householdContext` request shape, `DailyActionPlan`).
- `AI_PROMPTS.md` §3–6 (what the Phase 5 AI may and may not do with these rules).
- `DATA_GOVERNANCE.md` §8 (change control for recommendation thresholds).
- `docs/IMPLEMENTATION_PLAN.md` §7 Phase 4.

## Intent

Decide, deterministically, which advice a household is eligible for today. Phase 5's AI may reword and order these candidates; it may not add one. Every candidate carries its reason, evidence type, sources, the inputs it used and its caveat, so the plan can always explain itself (PRD US-06).

## Goals

- Same inputs → same output, in a fixed order.
- The plan responds to the air: a forecast above India's 24-hour limit unlocks exposure-reduction actions.
- Household details change the plan (PRD US-05).
- Missing, gapped or wrong-unit data never produces air-dependent advice (PRD US-10).

## Non-goals

- No API endpoint, no AI, no screen (Phases 5 and 7).
- No CPCB AQI and no CPCB category: none is computed or shown.
- No observation-versus-forecast comparison (TESTING_QA §6 scenario 7): there is no observation source yet. Revisit when a CPCB feed exists.
- No `period` per candidate: Phase 5 assigns `DailyActionPlan` periods.
- No language field (D5: English only).

## Anti-goals (a failure even if it works)

- Calling any air "safe", "clean" or "healthy", or guaranteeing an activity.
- Any diagnosis, treatment or medication wording; any question about medical conditions.
- A blanket "open/close all windows" instruction.
- A numeric emission or health benefit.
- Claiming street-level knowledge from a ~45 km model grid.

## Approaches

1. **Rule registry in code (chosen).** One ordered array; each rule has a fixed ID, a condition and fixed wording. The engine keeps the rules whose condition holds.
2. Rules stored as data with an interpreter: more moving parts, no gain for ~15 rules.
3. One if/else function: no stable IDs, no per-rule tests.

## The air signal (owner decision: option 1)

Source: CPCB, National Ambient Air Quality Standards, notification No. B-29016/20/90/PCI-L, 18 November 2009. 24-hour limits: **PM2.5 60 μg/m³, PM10 100 μg/m³** (verified 2026-11-18 from a copy of the notification; the CPCB-hosted PDF is the cited URL). The notification's ** footnote: "24 hourly or 8 hourly or 1 hourly monitored values, as applicable, shall be complied with 98% of the time in a year."

Method (`assessAir(series, now)`):
1. Window: the 24 forecast hours starting at the UTC hour that contains `now`. Each must be exactly one hour after the previous; otherwise the window is incomplete.
2. Per pollutant (PM2.5, PM10): the unit must equal `μg/m³` exactly (Open-Meteo's string, Greek mu U+03BC) and all 24 values must be numbers. Otherwise its status is `unknown`.
3. Average the 24 values, round to 1 decimal, then compare: `> limit` → `above_limit`, else `within_limit`. Rounding first keeps the shown number and the status consistent.
4. Level: `elevated` if any pollutant is `above_limit`; `not_elevated` if both are `within_limit`; else `unknown`. No series → `unknown`.

Known limit of the method: NAAQS compliance is about measured station values over a year; a 24-hour mean of a gridded model forecast is an approximation. The `air.elevated` / `air.within-limit` notice carries the model-forecast caveat and appears whenever any air candidate does; every air candidate cites Open-Meteo and the NAAQS as its sources. (Corrected 2026-11-18 after the final review: the earlier sentence said every air candidate's own caveat says so, which the wording table never did.)

## Household details (all optional; unknown fields rejected)

Shape follows `API.md` and the three `household_preferences` jsonb columns:

- `routine`: `commuteMode` (`walk` | `cycle` | `two_wheeler` | `car` | `public_transport` | `work_from_home`), `outdoorExercise` (boolean), `schoolCommute` (boolean)
- `home`: `nearBusyRoad` (`yes` | `no` | `unknown`), `cookingFuel` (`lpg` | `electric` | `biomass` | `other` | `prefer_not_to_say`), `kitchenExhaust` (boolean), `airPurifier` (boolean)
- `householdNeeds`: `includesChildren`, `includesOlderAdults`, `mayBeMoreSensitive` (booleans)

## Candidate shape

`id`, `section` (`notice` | `action` | `indoor` | `swap`), `priority` (`high` | `medium` | `low`), `title`, `text`, `reason`, `evidenceType` (`data_driven_rule` | `general_suggestion`), `sourceIds` (from the allowlist), `inputsUsed` (field paths such as `routine.outdoorExercise`, `air.level`), optional `caveat`.

`official_guidance` is never used: no rule quotes official health guidance.

Source allowlist:
- `open-meteo`: Open-Meteo Air Quality API, `https://open-meteo.com/en/docs/air-quality-api`
- `cpcb-naaqs-2009`: National Ambient Air Quality Standards (CPCB, 18 November 2009), `http://cpcb.nic.in/uploads/National_Ambient_Air_Quality_Standards.pdf`

## Rules and exact wording

Order below is output order. "Air rule" = evidence `data_driven_rule`, sources `open-meteo` + `cpcb-naaqs-2009`, input `air.level` plus the listed fields. Every other rule is `general_suggestion` with no sources.

Shared strings:
- LIMITS_REASON: "India's National Ambient Air Quality Standards (CPCB, 2009) set 24-hour limits of 60 μg/m³ for PM2.5 and 100 μg/m³ for PM10."
- FORECAST_CAVEAT: "This is a model forecast for an area about 45 km wide, not a station measurement and not the CPCB National AQI."

| ID | Section, priority | When | Title | Text | Reason | Caveat |
|---|---|---|---|---|---|---|
| `data.unavailable` | notice, high | level `unknown` | Live air information unavailable | We could not get a complete 24-hour forecast for this place, so this plan gives no advice about today's air. The other suggestions apply on any day. | The forecast was missing, incomplete or in an unexpected unit. | — |
| `air.elevated` | notice, high | level `elevated` (air rule; inputs `air.PM2_5`, `air.PM10`) | Forecast above India's 24-hour limit | The 24-hour model forecast average is above the national limit for {list}. | LIMITS_REASON | FORECAST_CAVEAT |
| `air.within-limit` | notice, medium | level `not_elevated` (air rule; inputs `air.PM2_5`, `air.PM10`) | Forecast within India's 24-hour limits | The 24-hour model forecast averages are PM2.5 {a} μg/m³ (limit 60) and PM10 {b} μg/m³ (limit 100). | LIMITS_REASON | Being within the national limit does not mean the air is clean or free of risk. FORECAST_CAVEAT |
| `exercise.indoor-alternative` | action, high | `outdoorExercise` and `elevated` (air rule) | Consider an indoor alternative for exercise | Consider exercising indoors today, or keeping outdoor sessions shorter and less intense. Check local conditions before you go. | You said you exercise outdoors, and the forecast is above the national 24-hour limit. | Conditions change through the day and across the city; this forecast cannot show a specific park or route. |
| `exercise.check-conditions` | action, medium | `outdoorExercise` and level not `elevated` | Check conditions before outdoor exercise | Before a long or hard outdoor session, check local air-quality updates and advisories. | You said you exercise outdoors. | Air quality can change during the day. |
| `commute.lower-traffic` | action, high | `commuteMode` ∈ walk, cycle, two_wheeler and `elevated` (air rule) | Consider a lower-traffic route or time | If you have a choice, consider a route with less traffic, or travelling outside the busiest hours. | You travel by {walking \| cycling \| two-wheeler} close to traffic, and the forecast is above the national 24-hour limit. | No route can promise clean air; this forecast cannot see street-level differences. |
| `school.less-roadside-waiting` | action, high | `schoolCommute` and `elevated` (air rule) | Less waiting beside busy roads on the school run | Where you can, wait for school transport or pick-ups away from the roadside, and follow any advisory from the school or local authorities. | You said your household does a school run, and the forecast is above the national 24-hour limit. | This forecast does not capture street-level pollution. |
| `household.extra-caution` | action, high | `elevated` and any of `includesChildren`, `includesOlderAdults`, `mayBeMoreSensitive` (air rule; inputs = the true flags) | Extra caution for your household | Consider keeping prolonged or strenuous outdoor activity shorter for anyone who may be more affected, and follow local public-health advisories. | You said your household includes {children \| older adults \| someone who may be more sensitive to air pollution, joined with ", " and " and "}, and the forecast is above the national 24-hour limit. | General information only, not medical advice. |
| `indoor.ventilation-tradeoff` | indoor, high | `elevated` (air rule) | Ventilate for indoor sources, not by habit | Outdoor particles are forecast to be high, so windows left open all day let more of them in. Cooking, incense or smoke indoors still needs fresh air, so ventilate while those are going on and for a short while after. | The forecast is above the national 24-hour limit, and indoor sources add their own pollution. | What works best depends on your home. Staying indoors does not protect you by itself if indoor sources are present. |
| `indoor.purifier` | indoor, medium | `airPurifier` and `elevated` (air rule) | Run your air purifier where people spend most time | Consider running the purifier in the room your household uses most, following the maker's instructions. | You said you have an air purifier, and the forecast is above the national 24-hour limit. | A purifier helps with particles in that room; it does not remove every pollutant. |
| `indoor.cooking-exhaust` | indoor, medium | `kitchenExhaust` true | Use the kitchen exhaust while cooking | Switch the exhaust on before you start cooking and leave it running for a few minutes after. | You said your kitchen has an exhaust. Removing cooking smoke at the source comes first. | Some kitchen hoods recirculate air instead of venting it outside. |
| `indoor.cooking-ventilate` | indoor, medium | `kitchenExhaust` false | Ventilate the kitchen while cooking | Open a kitchen window or door while cooking and for a short while after, so smoke and fumes can leave. | You said your kitchen has no exhaust, so cooking smoke stays indoors without fresh air. | On high-pollution days, keep this to cooking time rather than all day. |
| `indoor.cleaner-fuel` | indoor, medium | `cookingFuel` biomass | Consider a cleaner cooking fuel where possible | Wood, dung or crop waste fires make a lot of indoor smoke. Where it is practical, cooking with LPG or electricity cuts this smoke at the source. | You said you cook with biomass fuel. | Until then, good kitchen ventilation and keeping others away from the stove help. |
| `indoor.smoke-sources` | indoor, low | always | Cut indoor smoke at the source | Incense, mosquito coils, candles and tobacco all add smoke indoors. Using them less, or not indoors, is the simplest indoor-air step. | These are common indoor pollution sources in any home. | — |
| `home.busy-road` | indoor, medium | `nearBusyRoad` yes | Your home is near a busy road | Air beside busy roads usually carries more traffic exhaust, especially at rush hour. When you air out your home, quieter traffic times are a better choice where possible. | You said your home is near a busy road. | This forecast covers an area about 45 km wide and cannot show conditions on your street. |
| `swap.fewer-car-trips` | swap, low | `commuteMode` ∈ car, two_wheeler | Combine trips and avoid idling | Combining errands into one trip and switching off the engine while waiting cut your vehicle's exhaust. For some trips, public transport, carpooling, walking or cycling may also be practical. | You said you get around by {car \| two-wheeler}. | We do not estimate emission savings, because we have no documented method for your vehicle and trips. |
| `swap.no-open-burning` | swap, low | always | Don't burn waste or leaves | Hand waste and garden leaves to municipal collection or composting instead of burning them; open burning adds smoke for the whole neighbourhood. | Open burning is a local pollution source any household can avoid. | — |

`{list}` in `air.elevated`: each pollutant above the limit as "PM2.5 ({a} μg/m³, limit 60)" or "PM10 ({b} μg/m³, limit 100)", joined with " and ", PM2.5 first. Averages print with exactly one decimal.

## Constraints

- Pure functions; no I/O, no clock reads (`now` is a parameter), no input mutation.
- Types in `shared/contracts.ts` (type-only, as in Phase 3). Zod lives on the server.
- Change control (`DATA_GOVERNANCE.md` §8): the source and method go in `INTEGRATIONS.md`; boundary tests at 60.0/60.1 and 100.0/100.1; this wording table is the UI-wording review; production use waits for the owner's deploy approval.

## Left to the builder

File split inside `server/src/services/recommendations/`, test names, and how the registry is typed.
