# Redesign Phase A2: Weather in the Skyline Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The readout's skyline band shows real forecast weather (clouds, rain, heat, fog) on top of the air haze, with a weather line in words.

**Architecture:**
- **Server:** fetches this hour's weather from Open-Meteo's forecast API, cached for 10 minutes and never fatal. It adds the result to the forecast response as `weather`.
- **Client:** a pure `sceneFromConditions()` turns `airCheck` and `weather` into scene flags. `CitySkyline` draws them, and `AirReadout` prints the weather line.

**Tech Stack:** Express 5, Zod 4, React 19, Tailwind v4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-weather-scene-design.md` (approved by the owner, 2026-11-19). It builds on `docs/superpowers/specs/2026-11-19-stitch-redesign-design.md`.

## Global Constraints

- **Weather source:** the weather base URL is the constant `https://api.open-meteo.com/v1/forecast`, called with the same 2-decimal coordinates as the air call, never logged. The variables are `temperature_2m,precipitation,precipitation_probability,cloud_cover,visibility`, with `timeformat=unixtime` and `forecast_hours=2`.
- **Failure:** a failed weather call makes `weather` null. The forecast route still answers 200 with the air data.
- **Thresholds (the spec's calls):**
  - rain when `precipitationMm ≥ 0.2` or `precipitationProbability ≥ 60`;
  - heat when `temperatureC ≥ 35` and there is no rain;
  - clouds 0/1/2/3 below 20 / from 20 / from 50 / from 80 % `cloudCoverPercent`;
  - fog when `visibilityM < 1000`;
  - thick smog when the air haze level is 5.
- **Words:** no "smoke", "safe", "healthy" or "clean air". The weather line names Open-Meteo as a weather forecast.
- **Motion:** transforms and opacity only, wrapped in `motion-safe:`, and static under reduced motion. At most one animated layer: rain, otherwise the heat shimmer.
- **Unchanged:** no new dependency and no CSP change. Phase A's e2e names stay (see the Phase A plan's Global Constraints).
- **Workflow:** `.claude/skills/airaware-ui/SKILL.md` for the client tasks, plus `animation-performance` for the motion.
- **Git:** one branch `main`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push only with the owner's yes.

## Review Focus

1. **The weather provider is down or slow** (5 s timeout). Expected: the air forecast still renders, `weather` is null, and the line reads "Weather unavailable". Task 1 test: `a failed weather call leaves the air forecast intact`.
2. **The weather hour doesn't contain `now`**, for example across an hour boundary or with only past hours. Expected: `weather` is null, never a stale hour. Task 1 test: `returns null when no hour contains now`.
3. **Some weather fields are null.** Expected: the scene uses only known fields (no rain unless rain data says so), and the line lists only known values. Task 2 test: `unknown fields add no weather`. Task 3 test: `the weather line names only known values`.
4. **Rain and heat at once** (a hot, showery afternoon). Expected: rain wins, so there is no heat shimmer, and only one animated layer. Task 2 test: `rain suppresses heat`.
5. **Reduced motion.** Expected: no animation class without `motion-safe:`. Task 3 test: `animations only run when motion is welcome`.

---

### Task 1: Server weather for this hour

**Files:**
- Create:
  - `server/src/services/air-data/openMeteoWeather.ts`
  - `server/src/services/air-data/cachedWeather.ts`
- Modify:
  - `shared/contracts.ts` (`WeatherNow`, and `ForecastData.weather`);
  - `server/src/routes/airQuality.ts` (`airQualityRouter(forecast, weather)`, a third source);
  - `server/src/app.ts` (wiring);
  - `client/src/test/fixtures.ts` (`forecastFixture.weather`, the third source);
  - `API.md`, `INTEGRATIONS.md` (a new "Open-Meteo Weather Forecast API" entry), `PRIVACY.md` (one line: weather is called with the same rounded coordinates).
- Test:
  - `server/src/services/air-data/openMeteoWeather.test.ts`
  - `server/src/routes/airQuality.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface WeatherNow {
    time: string;
    temperatureC: number | null;
    precipitationMm: number | null;
    precipitationProbability: number | null;
    cloudCoverPercent: number | null;
    visibilityM: number | null;
    retrievedAt: string;
  }
  // ForecastData gains: weather: WeatherNow | null
  ```
- Produces: `fetchWeather(latitude: number, longitude: number, now: Date): Promise<WeatherNow | null>`, which never throws.
- Produces: `createCachedWeather(): (latitude, longitude, now) => Promise<WeatherNow | null>`, with a 10-minute TTL and a key of `lat,lon`. A null result is not cached.

- [ ] **Step 1: Write the failing tests.**
  - **`openMeteoWeather.test.ts`** stubs `fetch` with a 2-hour body, `hourly_units` included:
    - `asks the fixed host for this hour's variables`: the URL host is `api.open-meteo.com`, the path is `/v1/forecast`, latitude is `18.52`, `hourly` is the 5 variables, `timeformat` is `unixtime` and `forecast_hours` is `2`.
    - `returns the hour containing now`: with `now` at 10:30 and hours at 10:00 and 11:00, the result is the 10:00 values, with `retrievedAt = now.toISOString()`.
    - `maps missing variables to null`: a body without `visibility` gives `visibilityM: null`.
    - `returns null when no hour contains now`: hours at 08:00 and 09:00 with `now` at 10:30 give `null`.
    - `returns null on a provider failure`: a 500 gives `null`.
  - **`airQuality.test.ts`:**
    - `returns this hour's weather with the forecast`: with an air stub and a weather stub routed by URL host, `res.body.data.weather.temperatureC` equals the stubbed value.
    - `a failed weather call leaves the air forecast intact`: the weather host answers 500, and the result is 200 with `data.weather === null` and `data.hours.length > 0`.
    - **Update** the sources test: it now expects 3 sources, with the third `{ id: 'open-meteo-weather', dataKind: 'model_forecast', status: 'available', licence: 'CC BY 4.0' }`. Ledger this as a deliberate contract change.
- [ ] **Step 2:** Run `npx vitest run src/services/air-data/openMeteoWeather.test.ts src/routes/airQuality.test.ts` (in `server/`). Expected: FAIL (the module is missing, and `weather` is undefined).
- [ ] **Step 3: Implement.**
  - **`fetchWeather`:** uses `fetchJson` with a zod schema. Every variable array is optional and must match `time` in length. It catches any error and returns `null`. It picks the hour with `start ≤ now < start + 1 h`.
  - **The route:** `Promise.all` of the air forecast and the cached weather. The weather promise is wrapped so it can't reject.
  - **The third source:**
    - `name: 'Open-Meteo Weather Forecast API'`
    - `url: 'https://open-meteo.com/en/docs'`
    - `attribution: 'Weather forecasts from Open-Meteo.com.'`
    - `limitations: ['Weather is a model forecast for the same grid area; local showers can differ.']`
  - **The fixtures:** `forecastFixture.weather` is a real-looking hour, flagged in a comment as illustrative test data. `sourcesFixture` gets the third entry.
  - **Docs:** `API.md`, `INTEGRATIONS.md` and `PRIVACY.md` as listed.
- [ ] **Step 4:** Run `npm test`, `npm run typecheck` and `npm run lint` at the root. Expected: all pass.
- [ ] **Step 5: Commit**, `feat(api): this hour's weather with the forecast`.

### Task 2: Scene flags from air and weather

**Files:**
- Create:
  - `client/src/features/air-quality/scene.ts`
  - `client/src/features/air-quality/scene.test.ts`

**Interfaces:**
- Consumes: `hazeLevel` and `HazeLevel` (Phase A), `AirAssessment`, `WeatherNow`.
- Produces:
  ```ts
  export interface Scene {
    haze: HazeLevel;
    clouds: 0 | 1 | 2 | 3;
    rain: boolean;
    heat: boolean;
    fog: boolean;
    smog: boolean;
  }
  export function sceneFromConditions(air: AirAssessment, weather: WeatherNow | null): Scene;
  ```

- [ ] **Step 1: Write the failing tests** (values from Global Constraints):
  - `no weather adds no weather layers`: `weather` null gives `clouds 0`, and `rain`, `heat` and `fog` all false.
  - `clouds by cover`: 10 / 20 / 49 / 50 / 80 % give 0 / 1 / 1 / 2 / 3.
  - `rain by amount or chance`: 0.2 mm gives true; 0.1 mm with 59 % gives false; 0 mm with 60 % gives true.
  - `heat from 35 °C`: 34.9 gives false and 35 gives true.
  - `rain suppresses heat`: 38 °C with 0.5 mm gives `rain` true and `heat` false.
  - `fog below 1 km visibility`: 999 gives true and 1000 gives false.
  - `smog at the worst haze`: haze level 5 gives `smog` true; 4 gives false.
  - `unknown fields add no weather`: every field null gives no clouds, rain, heat or fog.
- [ ] **Step 2:** Run `npx vitest run src/features/air-quality/scene.test.ts` (in `client/`). Expected: FAIL (the module is missing).
- [ ] **Step 3: Implement** `sceneFromConditions`. `haze` comes from `hazeLevel(air)`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(ui): scene flags from the air check and this hour's weather`.

### Task 3: The scene and the weather line

**Files:**
- Modify:
  - `client/src/features/air-quality/CitySkyline.tsx` (takes `scene: Scene` instead of `level`);
  - `client/src/features/air-quality/AirReadout.tsx` (passes `sceneFromConditions(...)`, adds the weather line);
  - `client/src/index.css` (two keyframes, `rain-fall` and `heat-shimmer`, as `--animate-*` theme tokens).
- Test: `CitySkyline.test.tsx` and `AirReadout.test.tsx` (both updated)

**Interfaces:**
- Consumes: `Scene` and `sceneFromConditions` (Task 2), `ForecastData.weather` (Task 1).

- [ ] **Step 1: Write the failing tests.**
  - **`CitySkyline.test.tsx`:** move the existing tests to `scene` props (`{ haze: n, clouds: 0, rain: false, heat: false, fog: false, smog: false }`). Add:
    - `draws clouds by count`: `clouds: 2` gives 2 elements with `data-part="cloud"`.
    - `rain hides the sun and draws streaks`: `rain: true` gives no `data-part="sun"` and one `data-part="rain"`.
    - `heat draws a shimmer and a larger sun`: the `data-part="sun"` radius is bigger than without heat, and there is one `data-part="shimmer"`.
    - `fog and smog draw their own bands`: there is `data-part="fog"` when fog is set, and `data-part="smog"` when smog is set.
    - `animations only run when motion is welcome`: every element whose class contains `animate-` also contains `motion-safe:animate-`.
  - **`AirReadout.test.tsx`:**
    - `the weather line names only known values`: with `{ temperatureC: 31, precipitationProbability: 70, precipitationMm: 0.4, cloudCoverPercent: 85, visibilityM: null }`, the text contains "Weather this hour: 31 °C, rain likely (70 %), 85 % cloud cover. Open-Meteo weather forecast." and no "visibility".
    - `says when weather is unavailable`: `weather: null` gives "Weather unavailable".
    - `the scene follows the weather`: a rain hour gives `[data-part="rain"]` inside the readout.
- [ ] **Step 2:** Run `npx vitest run src/features/air-quality` (in `client/`). Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **Clouds:** flat rounded shapes, using `fill-surface-light` at opacity 0.9, upper sky, spaced.
  - **Rain:** a `<g data-part="rain">` of thin slanted lines (`stroke-text-dark-muted`, opacity about 0.5) with `motion-safe:animate-rain`, which translates Y by one pattern height in 0.8 s, linear and infinite.
  - **Heat:** a sun radius of 24 (instead of 18), and a ground band `data-part="shimmer"` at opacity about 0.25 with `motion-safe:animate-shimmer` (translateX ±4 px, 3 s ease-in-out, alternate).
  - **Fog:** a white band `fill-surface-light` at opacity 0.6, low.
  - **Smog:** a low band `fill-text-dark-muted` at opacity 0.35.
  - The band is `h-32 sm:h-44`.
  - **The weather line** sits under the band in `text-sm`. Its parts:
    - `${t} °C`;
    - "rain likely (P %)" when rain comes from the chance alone, or "rain (X mm)" when the amount is at least 0.2;
    - `${c} % cloud cover`;
    - "visibility under 1 km" when fog.
    - Joined with commas, then "Open-Meteo weather forecast."
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(ui): clouds, rain, heat and fog in the readout scene`.

### Task 4: Proof and docs

**Files:** `CHANGELOG.md`, `DESIGN.md` (one line under motion: the scene animations are `motion-safe` and transform/opacity only).

- [ ] **Step 1: The gate:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run e2e` (all 16).
- [ ] **Step 2: See it.**
  - Write a scratch Playwright script, never committed, that loads `/app` for Pune on localhost and uses `page.route` to swap `data.weather` for: (a) rain, (b) 38 °C dry, (c) fog, (d) null.
  - Screenshot each at 320 px and 1280 px.
  - Also emulate `reducedMotion: 'reduce'` and confirm the computed `animation-name` is `none` on the rain layer.
- [ ] **Step 3: Load `animation-performance`** and confirm that only `transform` and `opacity` animate, and that there is one animated layer.
- [ ] **Step 4: Commit**, `docs: weather scene`, with a CHANGELOG line. Show the owner the screenshots and ask before pushing.
