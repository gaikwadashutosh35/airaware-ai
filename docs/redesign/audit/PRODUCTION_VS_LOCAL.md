# AirAware AI: production vs local (Stage 0)

**Date:** 24 Nov 2026.

**Production:** https://airaware-ai.netlify.app

**Local:**
- the Vite dev server on `http://localhost:5174` (`.claude/launch.json` entry `web`);
- the Express API on `http://localhost:8080` (entry `api`).

**Raw evidence:**
- [evidence/prod-vs-local-raw.txt](evidence/prod-vs-local-raw.txt) for git state, bundle names, headers and config presence. Values of secrets were never read; only presence was checked.
- [evidence/prod-metrics.json](evidence/prod-metrics.json) and [evidence/local-metrics.json](evidence/local-metrics.json).

## Verdict

- **Client code:** production runs the same client code as the local `HEAD`:
  - the live bundle `assets/index-C11ewqej.js` has the same hash as a local build of `257352e`;
  - nothing under `client/`, `server/`, `shared/` or `netlify/` differs from `HEAD`.
- **Server code:** the same `createApp` source runs in both places, but its deployed commit wasn't proven (`/api/v1/health` returns a constant `0.1.0`).
- **Behaviour:** no difference that changes what users see was found between production and local code.
- **Differences that exist** come from the environment:
  - headers;
  - per-instance caches and limits;
  - AI configuration;
  - the data behind the captures.

They matter mainly for how the local evidence should be read.

## Working tree at audit time

| Item | State |
|---|---|
| Commit | `257352e` (also on `origin/main` and live) |
| Modified tracked file | `.claude/launch.json`: the `web` entry runs on port 5174 (`--port 5174 --strictPort`), changed on the owner's request before Stage 0 because port 5173 was taken by another project. Not an application change. |
| Untracked | the owner's `AirAware_AI_Redesign_Kit/`, `AirAware_AI_Adaptive_Cityscape_Background_Spec.md`, `LINKEDIN_POST_DRAFT.md`, `docs/MODEL_ROUTING.md`, `docs/SKILL.md`, `docs/UI_SKILLS_AND_REDESIGN.md`, and this audit (`docs/redesign/`) |

## Differences

| Aspect | Production | Local | Divergent | Impact |
|---|---|---|---|---|
| Client bundle | `index-C11ewqej.js` | `index-C11ewqej.js` (build of `HEAD`) | no | Production client code equals `HEAD`. |
| Server code | Netlify Function wrapping `createApp` (`server/src/netlify.ts`) | Express (`server/src/server.ts`) | not proven | Same source; the deployed commit is inferred from the deploy, not measured. |
| Page security headers | `/` sends the full CSP (`default-src 'self'`, `script-src 'self'`, `connect-src 'self'` plus the Supabase host), `Referrer-Policy: no-referrer`, `X-Frame-Options`, `X-Content-Type-Options` and HSTS with `preload` | Vite dev server sends only `Cache-Control: no-cache`; the local API sends helmet's CSP and HSTS without `preload` | yes | CSP problems on pages can only appear in production or `vite preview`, never in local dev captures. No CSP error appeared in any production capture. |
| API rate-limit headers | not captured | `RateLimit: "60-in-1min"` and `RateLimit-Policy` | unverified | Same `createApp` code, keyed on `x-nf-client-connection-ip` in production; not measured here. |
| In-memory state (forecast cache, rate limits, AI daily budget) | per Netlify Function instance, reset on cold start; the forecast GET and the plan POST may reach different instances | one Express process | yes | Effective limits and the AI budget scale with instances in production. This is the root of F-17, where the verdict and the plan can assess different forecasts. |
| AI configuration | AI is on (the captured plan says "Made with AI"); model and backup not visible | `server/.env` has `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`; `GEMINI_MODEL` and `CLAUDE_MODEL` are unset, so the defaults apply | yes | Local runs say nothing about production AI wording. Only one real production plan reply was seen. |
| Supabase project | `icyl…yrms.supabase.co` (live bundle and CSP) | the same project (local API CSP from `SUPABASE_URL`) | no (shared) | Local saves, deletes and `e2e/journey.spec.ts` write to production data (F-42). |
| Routing | Netlify serves `index.html` for `/app`, `/app/*` and `/privacy` (200); `/nope` gets Netlify's own 404 page | Vite serves the app for app paths; Express 404 behaviour not captured | partly | Deep links work in production. The unbranded 404 is production-only (F-08). |
| Data behind the captures | real Open-Meteo forecast for Pune (within the limits); one real daily-plan reply, replayed 13 times; real guides | every API call answered by the e2e fixtures; the plan is always the rules fixture (elevated) | yes | Local captures show the right *states*, but not production wording or lengths. Card heights differ, so recommendation positions differ by about 20–35 px. |
| Today | top card "Cut indoor smoke at the source" (Made with AI); 3.4 screens at 390 | top card "Consider an indoor alternative for exercise" (Made by our rules); 3.3 screens at 390 | content only | Compare layout and states, not copy. |
| My Home | 1 card under "Today, for your home"; groups Cooking and smoke, Ventilation, Dust and cleaning, Filtration; 3.4 screens at 390 | 4 fixture plan cards; Ventilation and Filtration hidden as duplicates of the fixture's rules; 3.0 screens at 390 | yes | Local length and groups don't represent production. |
| Better Habits | Energy use has 3 cards; 2.9 screens at 390, 4.3 at 320 | the guide fixture's Energy use has 1 card; 2.1 screens at 390 | yes | The local guide fixture lags the server library (`guides.ts:237-241`). |
| Ask | default state only (no question sent in production) | a fixture answer to "Can I go for a morning walk today?" | yes | The production Ask answer path (classify, cards, AI summary, checks) was not exercised. |
| My Profile, Welcome | same headings; 2.5 and 1.1 screens at 390 | same | no | With no session, saved plans are hidden in both (`SavedPlansList.tsx:132`). |
| Failed requests and console | 0 failed requests and 0 console errors on app pages; only `/nope` logs its expected 404 | 1–3 `net::ERR_ABORTED` per page (sources; forecast where a place is set; guides on My Home and Better Habits) | yes, dev noise | React StrictMode mounts twice in dev and aborts the first fetch. Not a defect. |
| Performance | TTFB 257–665 ms, except the first hit (landing at 320, TTFB 4282 ms and LCP 5340 ms, likely a cold start); LCP about 1.0–2.4 s | TTFB 5–27 ms; LCP 0.49–1.36 s | yes | Local numbers come from an unthrottled dev server and are not representative. Use production figures, and treat them as indicative. |
| Layout shift (CLS) | My Home clearly worst (0.42–0.47 on phones); Today and Better Habits similar on phones (0.28 at 390) | My Home 0.81–0.85 on phones (the taller fixture plan), Today 0.23 at 390 | magnitude only | Same cause in both (F-02); the local values are inflated by fixture content. |

## What this means for Stage 1

- **Layout and state evidence from local fixtures is valid for production**, because the client code is identical.
- **Copy, card lengths and page lengths must come from the production captures**, because the fixture content differs.
- **Production-only checks are still needed** for the production API headers, the AI wording (more than one reply), and the Ask answer path. Each needs either a few read-only requests or an owner-approved test, because Ask answers use the AI.
