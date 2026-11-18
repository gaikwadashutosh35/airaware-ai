# Phase 3 — Design Shell and First Deploy (short design)

Status: approved by the owner on 2026-11-17, with Tailwind v4 for styling.

Sources this design builds on:
- `DESIGN.md`: the locked visual system and the source of truth for the look.
- `IMPLEMENTATION_PLAN.md` §7 Phase 3.
- `PRD.md` §7–9.
- `ACCESSIBILITY.md` and `.claude/rules/frontend.md`.
- The Phase 2 API (`API.md` §3).

## Intent

Give a visitor the first real end-to-end experience:
1. Land on a page that explains AirAware honestly.
2. Pick a place by search or by opting in to location.
3. See the real Open-Meteo forecast with its source, time, unit, "model forecast" label and limitations.
4. See plainly that official CPCB data is not available.

All of this should be reachable at a live URL as early as possible.

**Why:** this is a challenge submission judged on a live preview. An early working URL lowers risk, and every screen shown must be true.

## Goals
- Landing page with only the chapters that have real features behind them. **Owner decision, 2026-11-17.**
- Dashboard covering PRD US-01 (manual search), US-02 (opt-in geolocation), US-03 (understand the reading) and US-04 (observation separate from forecast).
- Designed states:
  - idle (no place yet)
  - loading
  - provider error
  - rate limited
  - official data unavailable
  - forecast freshness unknown
- Keyboard-complete and accessible to WCAG 2.2 AA as the target.
- Reduced motion respected.
- Correct at 320, 768 and 1280 px.
- Express serves the built client from the same origin.
- A Dockerfile ready for Cloud Run, with the deploy itself gated (see Constraints).

## Non-goals (later phases)
- Landing chapters 3–6 (plan, indoor, swaps, "see why"): Phase 7, each with a screenshot of its real feature.
- Charts (Phase 7), daily plan (Phases 4–5), auth (Phase 6).
- A demo mode: no demo adapter exists, so there is no demo state.
- Hindi/Marathi (P1).

## Anti-goals
These would be a failure even if the code works:
- Any number, screenshot, testimonial or claim on the landing page that the product cannot back up today.
- Any large "AQI" number.
- Decorative particles that look like sensor data.
- Model forecast values that read as current official measurements.

## Constraints
- **Air-data and privacy rules** (`AGENTS.md` §5 and §7) apply in full.
- **Coordinates:** they leave the browser rounded to 2 decimals, because the API rejects more. They are never put in storage.
- **Place in the URL (owner decision, 2026-11-18):** a *searched* place goes in the dashboard URL as `?place=<label>&lat=<2 dp>&lon=<2 dp>`, so links can be shared and reloaded. A device location never goes in the URL; choosing it clears the query.
- **Third-party requests:** no third-party font, script or analytics call from the browser. Everything is same-origin under Helmet's default CSP.
- **Repo size:** under 10 MB. At most one landing screenshot is committed, as WebP of about 150 KB or less.
- **Live deploy:** needs your Google Cloud project with billing (D4) and installing the `gcloud` CLI on this machine. Both need your yes at that step. Everything before it runs locally.

## Approaches (my calls unless marked as an owner decision)

| Decision | Picked | Considered | Why |
|---|---|---|---|
| Styling | **Tailwind v4** (`tailwindcss` + `@tailwindcss/vite` 4.3.4). DESIGN.md tokens are declared once in `@theme`, which Tailwind emits as `:root` custom properties. Utilities use only those tokens: no arbitrary colour or font values (`bg-[#…]`, `font-[…]`), which keeps Hallmark's token rule. | Plain CSS with tokens; a component kit (shadcn) | **Owner decision, 2026-11-17** (matches IMPLEMENTATION_PLAN). A kit would add a generic look and dependencies. |
| Routing | `location.pathname` switch between `/` and `/app`, plain `<a href>` links. Express serves `index.html` for both. | react-router | Two pages, no nested state. A router later costs one small change. |
| Shared types | Root `shared/contracts.ts`, **type-only** imports from server and client | Separate workspace package; duplicated types | Type-only imports are erased at build time. No package, no runtime coupling, no drift. |
| Data fetching | A typed `services/api.ts` plus small hooks using `fetch` with `AbortController` | TanStack Query | Three GET calls with no mutations. A cache library is not needed yet. |
| Selected place | Searched place in the URL query (2 decimals); device location in memory only | Memory only; localStorage | **Owner decision 2026-11-18** (Awwwards-inspired landing search). A public city in the URL is shareable; a device location never leaves memory. |
| Icons | `lucide-react` 1.66.0 (ISC licence) | Hand-copied SVGs | Consistent and accessible (`aria-hidden`), and tree-shaken. Status is never carried by an icon alone. |
| Fonts | Self-hosted or system stack, at most 2 families, chosen in the Hallmark pass | Google Fonts | CSP and privacy: no third-party request. |
| A11y tests | `axe-core` 4.14.0 inside Vitest (structure), plus a manual keyboard walk and a contrast check in the browser | Playwright E2E now | Playwright needs a browser download and CI setup. Its full E2E journey is Phase 7. |

## The design

**Visual direction:**
- Hallmark runs once inside `DESIGN.md` (a locked system, so no new theme is dealt).
- The landing page is deep-navy and atmospheric. The dashboard is light and readable.
- **Checkpoint:** after the hero and dashboard first pass, I send you screenshots and wait for your OK before finishing the states and polish.

**Landing (`/`):**
1. **Hero:** "The air around you matters.", one sentence and the action "Check your area's air quality" → `/app`. It sits on an original SVG/CSS urban-haze visual that carries no data.
2. **Understand your air:** a screenshot of the real dashboard, with copy about provider, time, unit and data kind.
3. **Honest limits note:** model forecast, not the CPCB National AQI, and official observations not connected yet.
4. **CTA**, then a footer with the Open-Meteo/CAMS CC BY 4.0 attribution.

**Dashboard (`/app`), top to bottom** (`DESIGN.md` §7, trimmed to what exists):
1. **Location bar.**
   - `LocationSearch` follows the ARIA 1.2 combobox pattern: 2+ characters, a 300 ms debounce, arrow keys, Enter and Esc, and a live region announcing the result count.
   - A "Use my location" button asks for permission only on click. If you deny it, a message appears and search stays usable. The label reads "Near you (approximate)".
   - After a place is chosen, focus moves to the dashboard heading.
2. **Source line:** provider, data kind, model and retrieval time in local time with the zone name. It never uses middle-dot-joined meta text.
3. **Official observation panel:** "Official CPCB observation unavailable", driven by the CPCB entry in `/sources` (`status: 'unavailable'`) and styled visually distinct. The client does not call `/current` until a CPCB feed exists, because that endpoint has no success shape yet.
4. **Forecast panel:**
   - Header: "Model forecast".
   - `PollutantMetric` for each pollutant at the hour containing now, each with value, unit and the hour shown.
   - A native `<details>` holds the full 48-hour table.
   - `null` shows as "No value" with a note.
5. **Sources and limitations panel:** taken from `/sources`, with the attribution and the limitations list.

**States:**
- **Idle:** a prompt to choose a place.
- **Loading:** a skeleton with `aria-busy`.
- **Provider error (502):** "Forecast provider unavailable" plus a Retry button.
- **Rate limited (429):** a wait message.
- **Freshness unknown:** "Model run time not reported; retrieved at HH:MM".

**Server:**
- `express.static(client/dist)` plus `GET /app` → `index.html`.
- Unknown paths keep the JSON 404.
- `trust proxy` is set only when `NODE_ENV=production` (Cloud Run always has the Google front end), and is tested with two `X-Forwarded-For` clients.

**Deploy:**
- Multi-stage `Dockerfile` (build the client, then run on Node 26 slim) plus `.dockerignore`.
- Build and run locally with Docker. The actual Cloud Run deploy to `asia-south1` happens after your yes.

## Left to the builder
- Exact copy within the ~80-words-per-screen limit.
- Hero illustration details.
- Spacing scale.
- Which display face, if any.
- The skeleton's look.

## Estimate
About 4–5 h of build time, plus your screenshot review. The live deploy takes about 30 min once your Google Cloud project and the `gcloud` install are ready.

## Revision 2026-11-18 (owner feedback: Awwwards references)

The owner pointed at awwwards.com as the reference catalogue. The winners studied were FromEarth 2050, Deferred Damage, ZeroPact, Greenlock and WhereNext (social responsibility and data visualisation). The owner approved three changes:

- **A:** place search in the landing hero opens `/app?place=…`.
- **B:** "Where every number comes from" is a four-step diagram of the real data path, replacing the fact rows.
- **C:** PM2.5 is the dashboard's headline figure, with the other five pollutants in a quieter row. Still no AQI.
