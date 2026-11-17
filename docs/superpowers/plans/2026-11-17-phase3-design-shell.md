# Phase 3 — Design Shell and First Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A landing page and a dashboard where a visitor searches a place, or opts in to their location, and sees the real Open-Meteo model forecast with full provenance. Express serves the built client from the same origin and is packaged for Cloud Run.

**Architecture:**
- React 19 pages are switched by `location.pathname` (`/` and `/app`).
- The client talks only to the same-origin `/api/v1` through a typed `services/api.ts`.
- Types come from a root `shared/contracts.ts` through **type-only** imports, which are erased at build time.
- Styling is Tailwind v4 with DESIGN.md tokens in `@theme`.
- Express adds static serving plus a production-only `trust proxy`.
- A multi-stage Dockerfile packages it.

**Tech Stack:**
- Already installed: React 19.3, Vite 8.3, TypeScript 7, Vitest 5 with jsdom and Testing Library, Express 5.
- New: `tailwindcss` and `@tailwindcss/vite` 4.3.4, `lucide-react` 1.66.0, `axe-core` 4.14.0 (dev).
- Docker 29.8 for the image.

**Spec:**
- `docs/superpowers/specs/2026-11-17-phase3-design-shell-design.md`: approved, and the authority for this plan.
- Also `DESIGN.md`, `ACCESSIBILITY.md`, `API.md` §3, `.claude/rules/frontend.md` and `.claude/rules/air-data.md`.

## Global Constraints

**Data display**
- Every displayed air value shows: pollutant, value, unit (from `units`), time (local time with zone name), the data kind label "Model forecast", the provider, and limitations.
- No large AQI number anywhere. "AQI" appears only inside the disclaimer "Not the CPCB National AQI".
- No invented numbers, screenshots, testimonials or logos.
- Decorative visuals never resemble data.

**Privacy and network**
- Coordinates leave the browser only as `value.toFixed(2)` strings.
- Places are kept in React state only. Never in the URL, `localStorage` or `sessionStorage`.
- Geolocation is requested only from a button click.
- No third-party requests from the browser: no CDN fonts, scripts or analytics.

**Styling**
- Colours and fonts come only from `@theme` tokens.
- No arbitrary colour or font utilities (`bg-[#…]`, `text-[#…]`, `font-[…]`).
- `focus-visible` styles on every interactive element.
- `prefers-reduced-motion` respected.
- No horizontal scroll at 320 px.

**Accessibility**
- Landmarks (`header`, `main`, `footer`) and one `h1` per page.
- Every control has an accessible name.
- Status is never carried by colour alone.
- axe reports 0 violations in the jsdom tests (the colour-contrast rule is disabled there and checked in the browser instead).

**Process**
- Pin new packages to the versions above (each released 14 or more days before 2026-11-17).
- Load `modern-web-guidance` before writing HTML, CSS or client JS (Tasks 3–5), and `hallmark` for Task 5.
- One branch `main`. Commit per task. Never push or deploy without the owner's explicit yes.

## Review Focus

1. **Out-of-order search responses.** The user types "Pun" then "Pune", and the slower "Pun" response must never replace the "Pune" results. Earlier requests are aborted. Test in Task 3.
2. **Geolocation missing, denied or timed out.** Each case gives a specific message, and search stays usable and focused. Test in Task 3.
3. **Switching place while a forecast is loading.** The old place's response must never render under the new place's heading. Test in Task 4.
4. **The "now" hour is not in the series, or a value is `null`.** Fall back to the first hour, show its own time, and print "No value". Test in Task 4.
5. **A long place name at 320 px** (for example "Thiruvananthapuram, Kerala"). It wraps with no horizontal scroll. Manual browser check in Task 5.

---

### Task 1: Shared contracts and client API service

**Files:**
- Create: `shared/contracts.ts`, `client/src/services/api.ts`, `client/src/services/api.test.ts`
- Modify:
  - `server/src/errors.ts`: import `ErrorCode` from shared.
  - `server/src/services/air-data/openMeteo.ts`: import `Pollutant` and `ForecastSeries` from shared. The adapter returns `Omit<ForecastSeries, 'freshness'>`.
  - `server/src/services/location/geocoding.ts`: schema annotated `z.ZodType<LocationResult>`.
  - `server/src/routes/airQuality.ts`: `SOURCES: SourceInfo[]`.
  - `client/vite.config.ts`: add `server.proxy`: `'/api'` → `'http://localhost:8080'`.

**Interfaces — Produces** (`shared/contracts.ts`; types only, no runtime code):
- `DataKind`, `Pollutant`, `ErrorCode`: the same unions the server uses today.
- `interface ForecastSeries`: exactly as in `API.md` §3, with `freshness: 'unknown'`.
- `interface LocationResult { id; name; admin1?; country; latitude; longitude; timezone }`
- `interface SourceInfo { id: string; name: string; dataKind: DataKind; status: 'available' | 'unavailable'; url: string; licence?: string; attribution?: string; limitations: string[] }`
- `interface ApiErrorBody { error: { code: ErrorCode; message: string; details?: unknown } }`

**Produces** (`client/src/services/api.ts`):
- `class ApiError extends Error { readonly status: number; readonly code: ErrorCode | 'NETWORK_ERROR' | 'UNEXPECTED_RESPONSE' }`. Fields are declared explicitly, because `erasableSyntaxOnly` is on.
- `getForecast(latitude: number, longitude: number, signal?: AbortSignal): Promise<ForecastSeries>`. Sends `toFixed(2)` strings.
- `searchLocations(query: string, signal?: AbortSignal): Promise<LocationResult[]>`
- `getSources(signal?: AbortSignal): Promise<SourceInfo[]>`
- Unwrapping:
  - A 2xx response returns `body.data`.
  - A non-2xx response with the envelope throws `ApiError(status, code, message)`.
  - A non-2xx response without the envelope throws `ApiError(status, 'UNEXPECTED_RESPONSE', 'Unexpected response from the server.')`.
  - A rejected fetch that is not an abort throws `ApiError(0, 'NETWORK_ERROR', 'Could not reach AirAware. Check your connection.')`.
  - An abort re-throws the `AbortError` unchanged.

Steps:
- [ ] Write the failing tests in `api.test.ts` (fetch stubbed):
  - `getForecast(18.519571, 73.855347)` requests `/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86` and returns `data`.
  - A 502 with the envelope rejects with `{ status: 502, code: 'PROVIDER_ERROR' }`.
  - A 502 with an HTML body rejects with `code: 'UNEXPECTED_RESPONSE'`.
  - A rejected fetch gives `code: 'NETWORK_ERROR'`.
  - An aborted signal rejects with `name: 'AbortError'`.
  - `searchLocations(' Pune ')` encodes `q` with `URLSearchParams`.
- [ ] Run `npm test -w client`. Expect failure: module not found.
- [ ] Create `shared/contracts.ts`, switch the server to `import type` from it, implement `api.ts` and add the Vite proxy.
- [ ] Run `npm test`, `npm run typecheck` and `npm run lint`. Expect all green, and server 48/48 unchanged.
  - If oxlint's type-aware mode rejects `shared/contracts.ts` for having no tsconfig, add `shared/tsconfig.json` with the server's strict options and `"include": ["."]`.
- [ ] Commit `feat(client): add shared contracts and typed API client`.

### Task 2: Tailwind, tokens, page switch and test harness

**Files:**
- Create:
  - `client/src/index.css`: `@import "tailwindcss";`, `@theme` holding the DESIGN.md §3 tokens and fonts, and base layer rules for `html`/`body` (`overflow-x: clip`) and `:focus-visible`.
  - `client/src/pages/Landing.tsx` and `client/src/pages/Dashboard.tsx` as minimal placeholders.
  - `client/src/test/axe.ts`
- Modify: `client/vite.config.ts` (add `@tailwindcss/vite`), `client/src/main.tsx` (import `index.css`), `client/src/App.tsx`, `client/src/App.test.tsx`

**Interfaces — Produces:**
- `App()` renders `<Dashboard />` when `location.pathname === '/app'`, and `<Landing />` otherwise.
- `expectNoAxeViolations(container: HTMLElement): Promise<void>` runs `axe.run` with `color-contrast` disabled and asserts `violations` equals `[]`.
- Token names (Tailwind namespaces) map from DESIGN.md §3:
  - Colours: `--color-bg`, `--color-surface`, `--color-surface-light`, `--color-primary`, `--color-secondary`, `--color-text`, `--color-text-dark`, `--color-warning`, `--color-danger`, `--color-success`.
  - Fonts: `--font-sans`, a self-hosted family or a system stack.

Steps:
- [ ] Install the pinned packages:
  - `npm install -w client tailwindcss@4.3.4 @tailwindcss/vite@4.3.4 lucide-react@1.66.0`
  - `npm install -w client -D axe-core@4.14.0`
- [ ] Write the failing tests in `App.test.tsx`:
  - At `/`, there is one `main` and an `h1` named "The air around you matters.".
  - At `/app` (set with `window.history.pushState({}, '', '/app')`), the `h1` is "Air quality near you".
  - `expectNoAxeViolations` passes on both pages.
- [ ] Run them and see them fail (the current App shows a different heading).
- [ ] Implement the CSS, the page switch and the placeholder pages.
- [ ] Run `npm test -w client`, `npm run build -w client` and `npm run lint`. Expect green. The built CSS contains `--color-primary`.
- [ ] Commit `feat(client): add Tailwind tokens and page switch`.

### Task 3: Location search and opt-in geolocation

**Load first:** `modern-web-guidance`. Check the ARIA combobox and the async search pattern against it.

**Files:**
- Create:
  - `client/src/features/location/place.ts` + `place.test.ts`
  - `client/src/features/location/LocationSearch.tsx` + `LocationSearch.test.tsx`
  - `client/src/features/location/UseMyLocation.tsx` + `UseMyLocation.test.tsx`

**Interfaces:**
- Consumes `searchLocations` and `ApiError` (Task 1).
- Produces:
  - `interface Place { label: string; latitude: number; longitude: number }`
  - `placeFromResult(result: LocationResult): Place`: the label is `"<name>, <admin1>"`, or `name` alone when there is no `admin1`.
  - `placeFromPosition(latitude: number, longitude: number): Place`: label `'Near you (approximate)'`, coordinates rounded to 2 decimals.
  - `<LocationSearch onSelect={(place: Place) => void} />`
  - `<UseMyLocation onLocate={(place: Place) => void} />`

**Pinned behaviour — search:**
- The query is trimmed and needs at least 2 characters.
- Debounce is 300 ms. Each new query aborts the previous request.
- The ARIA 1.2 combobox has an `input` with `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`, plus a `listbox` of `option`s.
- Arrow Down/Up move through options, Enter selects, and Esc closes.
- A polite live region announces "5 places found", "No places found" or the error message.

**Pinned behaviour — geolocation:**
- `getCurrentPosition` is called only on the button click, with `{ enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }`.
- Messages:
  - Denied: "Location permission was denied. Search for a place instead."
  - Unavailable or timed out: "Your location could not be found. Search for a place instead."
  - No `navigator.geolocation`: the button is not rendered.

Steps:
- [ ] Write the failing tests:
  - `place.test.ts`: `placeFromPosition(18.519571, 73.855347)` gives `{ label: 'Near you (approximate)', latitude: 18.52, longitude: 73.86 }`. A result without `admin1` gives the label `'Pune'`.
  - `LocationSearch.test.tsx` (fake timers, fetch stubbed):
    - "P" makes no request.
    - "Pune" gives one request after 300 ms, and the listbox shows options.
    - ArrowDown then Enter calls `onSelect` with the Pune place.
    - Esc closes the list.
    - The live region reads "5 places found".
    - **Review Focus 1:** a slow "Pun" response resolved after the "Pune" response leaves only the "Pune" results, and the first request's signal is aborted.
    - An empty result gives "No places found".
    - A 429 shows its error message.
  - `UseMyLocation.test.tsx` (`navigator.geolocation` stubbed):
    - Nothing is requested on render.
    - A click calls `getCurrentPosition` once.
    - Success calls `onLocate` with rounded coordinates.
    - **Review Focus 2:**
      - error code 1 shows the denied message
      - code 3 (timeout) shows the not-found message
      - with geolocation undefined, no button is rendered
  - Both components pass `expectNoAxeViolations`.
- [ ] Run them and see the failures.
- [ ] Implement them, styled only with token utilities.
- [ ] Run `npm test -w client` and `npm run lint`. Expect green.
- [ ] Commit `feat(client): add accessible location search and opt-in geolocation`.

### Task 4: Dashboard data panels and states

**Load first:** `modern-web-guidance`.

**Files:**
- Create:
  - `client/src/features/air-quality/forecast.ts` + `forecast.test.ts`
  - `client/src/features/air-quality/useRequest.ts`
  - `client/src/features/air-quality/ForecastPanel.tsx`
  - `client/src/features/air-quality/ObservationPanel.tsx`
  - `client/src/features/air-quality/SourcesPanel.tsx`
  - `client/src/components/States.tsx`
  - `client/src/pages/Dashboard.test.tsx`
- Modify: `client/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes `getForecast`, `getSources` and `ApiError` (Task 1), plus `Place`, `LocationSearch` and `UseMyLocation` (Task 3).
- Produces:
  - `type RequestState<T> = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: ApiError }`
  - `useRequest<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): { state: RequestState<T>; retry: () => void }`
    - A `null` key gives `idle`.
    - Changing the key aborts the in-flight request.
    - An `AbortError` never becomes an error state.
  - `hourForNow(series: ForecastSeries, now: Date): ForecastSeries['hours'][number] | undefined`
    - Returns the hour where `time ≤ now < time + 1 h`, otherwise the first hour.
    - Returns `undefined` only for an empty series.
  - `formatTime(iso: string): string`. Uses `Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })`, which gives the browser's local time with its zone name.
  - `POLLUTANT_LABELS: Record<Pollutant, { short: string; name: string }>`. For example `PM2_5 → { short: 'PM2.5', name: 'Fine particles' }`, `NO2 → { short: 'NO₂', name: 'Nitrogen dioxide' }`.

**Pinned copy:**
- Heading after a place is chosen: `"Air quality: <place.label>"`. Focus moves to it after selection (`tabIndex={-1}`).
- Observation panel: `"Official CPCB observation unavailable"`, followed by the CPCB `limitations[0]`.
- Data kind badge text: `"Model forecast"`.
- Freshness note: `"Model run time not reported by the provider. Retrieved <formatTime(retrievedAt)>."`
- Null value: `"No value"`.
- Error states:
  - `PROVIDER_ERROR` or `NETWORK_ERROR`: `"Forecast provider unavailable."` with a "Try again" button that calls `retry`.
  - `RATE_LIMITED`: `"Too many requests. Try again in a minute."`.
  - Any other code: `"Something went wrong loading the forecast."` with "Try again".
- Idle: `"Search for a place or use your location to see its air-quality forecast."`.
- Loading: a skeleton with `aria-busy="true"` and the visually hidden text "Loading forecast".

Steps:
- [ ] Write the failing tests:
  - `forecast.test.ts` (**Review Focus 4**):
    - at `17:30Z` it returns the `17:00Z` hour
    - at `16:59Z` (before the series) it returns the first hour
    - an empty series returns `undefined`
  - `Dashboard.test.tsx` (fetch routed by URL to the Phase 2 fixtures):
    - Idle copy shows before any place is chosen, and `/forecast` is not requested.
    - After choosing Pune:
      - The heading "Air quality: Pune, Maharashtra" has focus.
      - The "Model forecast" badge shows.
      - The PM2.5 metric shows `48` and `μg/m³` together with its hour.
      - The text "Official CPCB observation unavailable" shows.
      - The freshness note shows.
      - The sources panel contains "Open-Meteo.com".
    - A `null` value renders "No value".
    - A 502 renders "Forecast provider unavailable." and Try again re-requests and renders the data.
    - A 429 renders the rate-limit copy.
    - **Review Focus 3:** place A's forecast is held pending, place B is chosen, then A resolves. Only B's values render under B's heading.
    - No text node matches `/\bAQI\b/` except inside "Not the CPCB National AQI".
    - The `<details>` table has a header row `Time`, then the pollutant short labels, and 3 body rows for the fixture.
    - `expectNoAxeViolations` passes in the idle, ready and error states.
- [ ] Run them and see the failures.
- [ ] Implement them, keeping data logic in `forecast.ts` and `useRequest.ts` and out of the components.
- [ ] Run `npm test -w client`, `npm run typecheck` and `npm run lint`. Expect green.
- [ ] Commit `feat(client): add forecast dashboard with provenance and states`.

### Task 5: Hallmark visual pass, owner checkpoint and landing page

**Load first:** `hallmark`, `modern-web-guidance` and `mobile-native`.
- `DESIGN.md` is a locked system: no theme is dealt.
- Material: the real dashboard. Audience: urban households in India. Action: "Check your area's air quality". Tone: atmospheric, deep navy for marketing, light and readable for the app.
- Add `.hallmark/` to `.gitignore`.

**Files:**
- Modify: `client/src/index.css`, `client/src/pages/Landing.tsx`, `client/src/pages/Dashboard.tsx`, and the feature components (classes only), `.gitignore`.
- Create:
  - `client/src/pages/Landing.test.tsx`
  - `client/src/assets/dashboard.webp`: one capture of the real dashboard for Pune, ≤150 KB.

**Landing content** (`DESIGN.md` §6, chapters 1, 2 and 7 only, plus the limits note):
1. **Hero:**
   - `h1` "The air around you matters."
   - One sentence.
   - A primary link "Check your area's air quality" → `/app`.
   - An original inline SVG/CSS haze-over-skyline visual with `aria-hidden="true"`, no numbers and no data-like particles.
2. **"Understand your air":** short copy plus `dashboard.webp`. Alt text describes what is shown: "AirAware dashboard showing a model forecast for Pune with pollutant values, units, times and sources".
3. **Limits note:** "Forecasts are model estimates, not station measurements, and not the CPCB National AQI. Official CPCB observations are not connected yet."
4. **CTA:** repeat the primary link.
5. **Footer:** "Air-quality forecasts from Open-Meteo.com (CC BY 4.0), based on CAMS global forecasts from the Copernicus Atmosphere Monitoring Service." Link to the source.

Steps:
- [ ] Write the failing `Landing.test.tsx`:
  - Exactly one `h1`.
  - Two links named "Check your area's air quality" with `href="/app"`.
  - The image alt text is as pinned.
  - The limits-note text is present.
  - The footer contains "Open-Meteo.com" and "CC BY 4.0".
  - Outside the footer, after removing the token `PM2.5`, the page text has no digits (this guards against invented metrics).
  - `expectNoAxeViolations` passes.
- [ ] Run it and see it fail.
- [ ] Build the hero and dashboard styling through Hallmark's flow:
  - the stamp line at the top of `index.css`
  - picks recorded in `.hallmark/`
  - `node <hallmark-dir>/scripts/sloplint.mjs` with `--render` until every FAIL is fixed and every REFLEX is fixed or waived
- [ ] **Browser review:**
  - Run `npm run dev -w server` and `npm run dev -w client`, and open the browser pane at `http://localhost:5173` and `/app`.
  - Check widths 320, 768 and 1280 px.
  - Do a keyboard-only walk: Tab order, the combobox, Try again.
  - Check `prefers-reduced-motion`.
  - Check contrast of every text/background token pair used. The target is 4.5:1 for body text and 3:1 for large text and UI.
  - **Review Focus 5:** select "Thiruvananthapuram" (or type a long name) at 320 px and confirm there is no horizontal scroll.
- [ ] **OWNER CHECKPOINT (stop):** send screenshots of the hero and the dashboard at 1280 and 320 px with `SendUserFile`, then wait for the owner's OK or changes before polishing further.
- [ ] After the OK:
  - Capture `dashboard.webp` from the real running app (≤150 KB) and finish the landing chapters.
  - Make `Landing.test.tsx` pass, then run `npm test` and `npm run build`. Expect green.
  - Run `git count-objects -vH` and confirm the size is still far below 10 MB.
- [ ] Commit `feat(client): apply visual design and add landing page`.

### Task 6: Server serves the client, production proxy trust, Dockerfile

**Files:**
- Modify:
  - `server/src/app.ts`: `createApp(options: { clientDir?: string; trustProxy?: boolean } = {})`.
  - `server/src/server.ts`: passes `clientDir: fileURLToPath(new URL('../../client/dist', import.meta.url))` and `trustProxy: env.NODE_ENV === 'production'`.
  - `server/src/app.test.ts`
- Create: `Dockerfile`, `.dockerignore`, `server/src/test-fixtures/client/index.html` (one line with the marker `airaware-test-client`).

**Interfaces — Produces:**
- With `clientDir` set, `express.static(clientDir)` is mounted after the API routers, plus `GET /app` → `sendFile(index.html)`. Other unknown paths keep the JSON 404.
- `trustProxy: true` → `app.set('trust proxy', 1)`.

**Dockerfile (multi-stage):**
- Build stage on `node:26-slim`: `npm ci`, then `npm run build -w client`.
- Runtime stage on `node:26-slim`:
  - `ENV NODE_ENV=production`
  - `npm ci --omit=dev -w server`
  - copy `server/src`, `server/package.json` and the built `client/dist`
  - `USER node`, `EXPOSE 8080`
  - `CMD ["node", "server/src/server.ts"]`

**`.dockerignore`:** `node_modules`, `**/node_modules`, `client/dist`, `.git`, `.env*`, `coverage`, `.superpowers`, `.hallmark`, `*.log`.

Steps:
- [ ] Write the failing tests in `app.test.ts`:
  - With `clientDir` set to the fixture folder:
    - `GET /` and `GET /app` return 200 `text/html` containing the marker.
    - `GET /api/v1/nope` and `GET /nope` still return the JSON 404.
  - Two-client tests:
    - With `trustProxy: true`, 60 requests with `X-Forwarded-For: 203.0.113.1`, then 1 request with `X-Forwarded-For: 203.0.113.2`, gives 200.
    - With `trustProxy: false`, the 61st request gives 429 even with a different `X-Forwarded-For` (spoofing does not bypass the limit).
- [ ] Run them and see them fail.
- [ ] Implement `createApp` options, `server.ts`, the Dockerfile and `.dockerignore`.
- [ ] Run `npm test` and `npm run typecheck`. Expect green.
- [ ] Container check:
  - `docker build -t airaware:local .` then `docker run --rm -p 8080:8080 airaware:local`.
  - `curl` `/api/v1/health`, `/`, `/app`, and `/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86` (expect a real forecast).
  - If the Docker daemon is not running, say so in the report. Do not start Docker Desktop yourself.
- [ ] Commit `feat(server): serve client build and add Cloud Run container`.

### Task 7: Docs and full gate

**Files:**
- Modify:
  - `SETUP.md` §5 and §8: the Vite proxy exists, and local run and Docker run instructions.
  - `docs/IMPLEMENTATION_PLAN.md` Phase 3: an "As built" note (Tailwind via `@theme`, no router, type-only `shared/`, Playwright deferred to Phase 7, deploy pending).
  - `CHANGELOG.md`
  - `README.md`: a short "Run locally" section. No live URL until it is verified.

Steps:
- [ ] Make the doc edits.
- [ ] Run the clean gate: `npm ci && npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`, then `npm audit --omit=dev` (expect 0) and `git count-objects -vH`.
- [ ] Commit `docs: record phase 3 shell and local run`.

### Task 8: Cloud Run deploy (GATED: every step below needs the owner's explicit yes)

**Needs from the owner:**
- the GCP project ID with billing enabled (D4)
- a yes to install the Google Cloud CLI (`winget install Google.CloudSDK`)
- doing `gcloud auth login` themselves
- a yes to deploy publicly

Steps:
- [ ] **Stop and ask.** Do nothing in this task without the yeses above.
- [ ] Deploy: `gcloud run deploy airaware --source . --region asia-south1 --allow-unauthenticated --project <id>` (Cloud Build builds the Dockerfile).
- [ ] Verify the live URL:
  - health
  - a real forecast for Pune, with timestamps that match a direct Open-Meteo call
  - security headers
  - `/` and `/app` render in the browser pane
  - two-client rate limiting: Cloud Shell and the local machine each get their own bucket
- [ ] Record the verified URL in `README.md` and `CHANGELOG.md`.
- [ ] Commit `docs: record verified Cloud Run deployment`.
