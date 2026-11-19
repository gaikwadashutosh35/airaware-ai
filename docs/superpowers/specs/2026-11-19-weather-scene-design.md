# Weather in the skyline scene (design, redesign Phase A2)

Status: approved by the owner, 2026-11-19 ("Approve the weather design, write plan").

**Owner choices:**
- "Add real weather (Recommended)": Open-Meteo's free weather forecast, which needs no key and comes from the same provider as the air data.
- "Readout band (Recommended)": the scene stays the band at the top of the air readout, made bigger and richer.

Builds on Phase A (`2026-11-19-stitch-redesign-design.md`).

## Intent

The owner wants the scene to change automatically with conditions: haze, fog, pollution and smoke from the air, and rain, heat and clouds from the weather. Every effect must come from real forecast data, never from mood. People should read the day at a glance, and the words beside the scene still carry the meaning.

## Goals

1. **The server fetches the weather for this hour** from Open-Meteo's forecast API (`https://api.open-meteo.com/v1/forecast`). It asks for `temperature_2m`, `precipitation`, `precipitation_probability`, `cloud_cover` and `visibility` for the same rounded coordinates, uses the same 10-minute cache pattern, and fixes the base URL as a constant.
2. **The forecast response gains `weather`:**
   ```
   weather: {
     time,
     temperatureC,
     precipitationMm,
     precipitationProbability,
     cloudCoverPercent,
     visibilityM,
     retrievedAt,
   } | null
   ```
   - It is the hour containing `now`. Any field can be `null` when the provider leaves it out.
   - The value is `null` when the weather call fails, so **the air forecast never fails because of the weather**.
3. **The scene adds weather layers.**

   | Layer | Condition (my calls, below) | Look |
   |---|---|---|
   | Clouds | `cloudCoverPercent` | 0 clouds below 20 %, 1 from 20 %, 2 from 50 %, 3 from 80 % |
   | Rain | `precipitationMm ≥ 0.2`, or `precipitationProbability ≥ 60` | slanted rain streaks; the sun is hidden |
   | Heat | `temperatureC ≥ 35` and no rain | a larger, brighter sun and a heat-shimmer band near the ground |
   | Weather fog | `visibilityM < 1000` | a pale white mist band, separate from the grey pollution haze |
   | Air haze / smog | the existing 24-hour check (Phase A) | unchanged |
   | Thick smog | air haze level 5 | an extra low, dense band (a look only; no "smoke" wording) |

4. **A weather line in words** sits under the scene, for example "Weather this hour: 31 °C, rain likely (70 %), 85 % cloud cover. Open-Meteo weather forecast." Only the fields with values appear. When `weather` is null, it reads "Weather unavailable".
5. **The band** grows to about 128 px on phones and 176 px from `sm`.
6. **Sources panel:** it gains the Open-Meteo weather source (CC BY 4.0) and one limitation line: "Weather is a model forecast for the same grid area; local showers can differ."

## Non-goals

- Day and night, wind, or air-quality advice based on the weather.
- Weather anywhere except the readout band and its line.
- A weather page or history.

## Anti-goals

- Rain, heat or clouds shown without forecast data saying so.
- "Smoke" or any cause named for the pollution.
- The air forecast failing, or slowing much, because of the weather call.
- Motion that ignores reduced-motion settings, or animation that drops frames.
- Text placed on top of the scene.

## Constraints

- No new dependency, no new client-side host and no CSP change (the server calls Open-Meteo).
- Rounded coordinates only, and no logging of them.
- **Motion:**
  - Rain falls and the heat shimmer drifts using CSS transforms and opacity only.
  - Both are static under `prefers-reduced-motion`.
  - At most one animated layer is shown at a time.
- The `airaware-ui` Done checklist, including `animation-performance` for the motion.

## Approaches

1. **Weather inside the forecast response (chosen).** One client request, with the weather fetched in parallel on the server and allowed to fail (null). Smallest client change.
2. **A separate `/api/v1/weather` endpoint.** Rejected: a second request and a second loading state for one decorative band and one line.
3. **The browser calls Open-Meteo directly.** Rejected: it needs a CSP change and sends the location from the browser to a third party.

## My calls (owner can override)

- **Thresholds:**
  - rain at 0.2 mm or a 60 % chance;
  - heat at 35 °C (India's IMD heat-wave criteria start around 40 °C on the plains; 35 °C is a "hot" look, not a heat-wave claim, and the words just state the temperature);
  - clouds at 20, 50 and 80 %;
  - fog below 1,000 m visibility.
- **Thick smog** reuses haze level 5. It adds no new data claim.
- **Scope:** the weather covers the current hour only, not the 48-hour chart.

## Left to the builder

The exact shapes of the clouds, rain and shimmer, the animation timings, the file split and the test names.
