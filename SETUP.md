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

The `server` and `client` workspaces declare their own dependencies. Later phases add packages (for example `@supabase/supabase-js`, `recharts`, Tailwind) in the phase that first needs them; install Tailwind with its current official guide for the Vite version in use.

The server runs TypeScript directly on Node ≥24 (built-in type stripping), so it needs no `tsx`, `ts-node-dev` or `dotenv`. It needs no `cors` because the client and API share one origin (ADR-005).

## 5. Frontend variables

Phase 6 (Supabase) adds `client/.env.example`:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

In production the client calls the API on the same origin (`/api/v1`), so no API base URL variable is needed (ADR-005). In development Vite runs on port 5173 and the API on 8080; a Vite `server.proxy` for `/api` is added together with the client's first API call (Phase 3). Only public browser-safe values belong in `VITE_` variables. These values are bundled into frontend assets. Never put Gemini keys or Supabase service-role credentials here.

## 6. Backend variables

`server/.env.example` currently holds only `NODE_ENV` and `PORT`. The full set expected by the end of the project is below; each variable is added in the phase that first needs it (`docs/IMPLEMENTATION_PLAN.md` §8):
```env
NODE_ENV=development
PORT=8080
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=
DATA_GOV_IN_API_KEY=
```

Open-Meteo base URLs, the forecast cache TTL (10 min) and the rate limit (60/min per IP) are code constants in `server/src`, not environment variables. Fixed base URLs keep the outbound-host allowlist out of configuration.

`DATA_GOV_IN_API_KEY` is only needed for the CPCB follow-up (see `docs/IMPLEMENTATION_PLAN.md` §5.2). Do not enable a scraper or undocumented endpoint. Activate CPCB integration only after verifying supported access, terms and units.

## 7. Supabase setup

1. Create project.
2. Configure Auth providers and redirect URLs.
3. Apply migrations under `supabase/migrations/`.
4. Enable RLS on every user-owned table.
5. Test with at least two separate users.
6. Keep service-role key on backend only.

## 8. Local run

Terminal 1:
```bash
cd server
npm run dev
```

Terminal 2:
```bash
cd client
npm run dev
```

The server listens on `PORT` (default 8080; Cloud Run sets it in production). Confirm `GET http://localhost:8080/api/v1/health` responds. Root scripts run every workspace: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

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
