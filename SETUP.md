# AirAware AI — Local Setup and Environment

## 1. Prerequisites

- Git.
- Node.js LTS and npm (use the version supported by current dependencies).
- Claude Code.
- GitHub account and public repository.
- Supabase project for Auth/Postgres.
- Gemini API access if live AI is enabled.
- Optional: access to air-quality provider services.

## 2. Create and clone the repository

Create a public GitHub repository named `airaware-ai`. Keep only `main` as the branch.

```bash
git clone https://github.com/YOUR_USERNAME/airaware-ai.git
cd airaware-ai
```

Windows PowerShell uses the same Git commands. Verify:

```powershell
git branch --show-current
git status
```

## 3. Suggested project scaffold

```text
airaware-ai/
├── client/
├── server/
├── supabase/migrations/
├── docs/
├── .github/workflows/
├── AGENTS.md
├── README.md
└── .gitignore
```

## 4. Dependencies

Install everything from the repository root using the committed lockfile:
```bash
npm ci
```

The `server` and `client` workspaces declare their own dependencies. Later phases add packages (for example `@supabase/supabase-js`, Tailwind) in the phase that first needs them; install Tailwind with its current official guide for the Vite version in use. The forecast chart is hand-drawn SVG, so there is no chart package.

For the end-to-end tests (`@playwright/test`, a root dev dependency), download Chromium once. It goes to your user cache, not the repository:
```bash
npx playwright install chromium
```

The server runs TypeScript directly on Node ≥24 (built-in type stripping), so it needs no `tsx`, `ts-node-dev` or `dotenv`. It needs no `cors` because the client and API share one origin (ADR-005).

## 5. Frontend variables

Phase 6 (Supabase) adds `client/.env.example`. Copy it to `client/.env`:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Both are optional. Without them the household form says "Saving isn't set up on this site." The key must be the publishable key (`sb_publishable_…`); the client ignores anything else. For the production image, pass both as Docker build args (`--build-arg VITE_SUPABASE_URL=… --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=…`), because `.dockerignore` keeps `.env` files out. Client tests always run with saving off (`client/vite.config.ts`).

In production the client calls the API on the same origin (`/api/v1`), so no API base URL variable is needed (ADR-005). In development Vite runs on port 5173 and the API on 8080; `client/vite.config.ts` proxies `/api` to the API. Only public browser-safe values belong in `VITE_` variables. These values are bundled into frontend assets. Never put Gemini keys or Supabase service-role credentials here.

## 6. Backend variables

`server/.env.example` currently holds `NODE_ENV`, `PORT`, `GEMINI_API_KEY` and a commented `GEMINI_MODEL`. The full set expected by the end of the project is below; each variable is added in the phase that first needs it (`docs/IMPLEMENTATION_PLAN.md` §8):
```env
NODE_ENV=development
PORT=8080
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=
DATA_GOV_IN_API_KEY=
```

- `GEMINI_API_KEY` (optional, server-only): a Gemini API key from Google AI Studio. Empty or missing → every daily plan is rules-only, and startup logs "Gemini not configured; plans are rules-only." Never put it in a `VITE_` variable or commit it.
- `ANTHROPIC_API_KEY` (optional, server-only): an Anthropic API key. Claude (`CLAUDE_MODEL`, default `claude-haiku-5-5`) writes the plan only when Gemini gives no accepted answer, and it reads and answers typed Ask questions. Without this key, typed Ask questions fall back to the keyword topic path (Gemini may word the topic's cards; the question itself is never sent to Gemini), so the Ask page intro, "Claude (Anthropic) reads your question and answers from AirAware's rules and today's forecast.", assumes the key is set. Startup logs "Claude backup: configured (…)" or "Claude backup not configured." The key goes only to `https://api.anthropic.com`, whatever `ANTHROPIC_BASE_URL` says. A Windows user variable with the same name overrides `server/.env` locally, so remove any stale one.
- `GEMINI_MODEL` (optional): defaults to `gemini-3.8-flash`. Lowercase letters, digits, `.` and `-` only.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (optional, Phase 6): the project URL (https) and its publishable key (`sb_publishable_…`). Without both, every saved-data route returns `503 SAVE_UNAVAILABLE`, and startup logs "Supabase not configured; saving is off." Startup fails if the key is not a publishable key. The secret (service-role) key is not used.

Open-Meteo base URLs, the Gemini endpoint and 10-second timeout, the forecast and plan cache TTLs (10 min), the rate limits (60/min per IP; 10/min for daily plans) and the 4 KB daily-plan body limit are code constants in `server/src`, not environment variables. Fixed base URLs keep the outbound-host allowlist out of configuration.

`DATA_GOV_IN_API_KEY` is only needed for the CPCB follow-up (see `docs/IMPLEMENTATION_PLAN.md` §5.2). Do not enable a scraper or undocumented endpoint. Activate CPCB integration only after verifying supported access, terms and units.

## 7. Supabase setup

1. Create a free project. Choose the South Asia (Mumbai) region and keep the database password in a password manager.
2. **Authentication → Sign In / Providers:** turn on **Allow anonymous sign-ins**. No redirect URLs are needed, because no email links are sent.
3. Read `supabase/migrations/20261118120000_saved_data.sql`, then run it in the dashboard's **SQL Editor**. It creates both tables, enables RLS, and adds the 20-plan limit and `delete_my_account()`.
4. Copy the project URL and publishable key into `server/.env` and `client/.env` (§5–6).
5. Run the two-user check: `SUPABASE_LIVE=1 npm test -w server -- src/services/saved/supabase.live.test.ts`. It creates two anonymous users and deletes them again.

The project used for development also has "Grant API access to new tables automatically" turned off, as Supabase recommends. The migration grants access explicitly, so it works either way.
6. Never use the secret (service-role) key in this app.

## 8. Local run

Terminal 1 (API on port 8080):
```bash
npm run dev -w server
```

Terminal 2 (client on port 5173, proxying `/api`):
```bash
npm run dev -w client
```

Open `http://localhost:5173`. The server listens on `PORT` (default 8080; Cloud Run sets it in production). `GET http://localhost:8080/api/v1/health` confirms it is up. Root scripts run every workspace: `npm run typecheck` (it also checks `e2e/`), `npm run lint`, `npm test`, `npm run test:coverage`, `npm run build`. CI installs with `npm ci --ignore-scripts`, because no dependency needs an install script.

End-to-end tests build the client and start their own server on port 8090 (your dev servers can keep running):
```bash
npm run e2e
```
They need the network and both `.env` files; see `TESTING_QA.md` §7.

### Production image (local production run; the live site runs on Netlify, see `DEPLOYMENT.md`)

```bash
docker build -t airaware:local .
```

```bash
docker run --rm -p 8080:8080 airaware:local
```

Open `http://localhost:8080`. A single Express process serves `/api/v1` and the built client. `NODE_ENV=production` also makes it trust exactly one proxy hop for the rate limit. On Netlify the limit uses Netlify's client-IP header instead.

## 9. Git discipline and 10 MB rule

`.gitignore` must exclude:
```gitignore
node_modules/
dist/
build/
coverage/
.env
.env.*
!.env.example
.DS_Store
*.log
playwright-report/
test-results/
```

Check repository size/history:
```bash
git count-objects -vH
git status
git branch -a
git ls-files
```

Avoid large images, videos, screenshots, package caches, and generated output. Deleting a file in a later commit does not remove it from history.

## 10. Troubleshooting

- Vite cannot find env var: check file location/prefix and restart dev server.
- Server exits at startup with "Invalid environment configuration": fix the named variable in `server/.env`.
- Supabase permission error: inspect JWT claims, RLS, grants, and owner filter.
- AI failure: inspect server-only key/model/quota and sanitized logs.
- Forecast provider error: check coordinates, variables, units, rate limits, and provider terms.
