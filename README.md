# AirAware AI — Urban Air Quality Assistant

**Hack2skill PromptWars Virtual · Main Challenge 06**  
**Breathe smarter. Make informed daily choices.**

AirAware AI is a GenAI-powered assistant for households and communities. It combines clearly labelled air-quality model forecasts with optional routine and home context to offer explainable daily actions, practical indoor-air suggestions, and sustainable swaps.

## Why AirAware AI?

Environmental readings are not always easy to translate into useful daily choices. AirAware AI helps users understand what data is available, how current it is, what limitations apply, and what practical changes may fit their declared routines.

## Main features

- Manual location search and opt-in geolocation.
- Air-quality overview with provider, data kind, time, pollutant, units, and freshness.
- Model forecasts always labelled as such; the official CPCB observation is shown as not connected (no permitted feed yet), never filled in.
- Personalized daily action plan.
- Indoor air-quality assistant.
- Sustainable everyday alternatives.
- Explainable AI recommendations and limitations.
- Optional saved plans and household preferences.

## Try it in 5 minutes

Open https://airaware-ai.netlify.app. There is no sign-in. Nothing is saved unless you tick **Remember on this device**, or press **Save my answers** or **Save plan**. A plan usually takes up to 30 seconds to build. Plans (Save plan included) and Ask answers share a limit of 10 requests a minute. If you see "Too many requests. Try again in a minute.", wait a minute and try again.

1. Press **Check My Air**.
2. Search a city in India, for example `Pune`, `Delhi` or `Tezpur`, and pick it from the list. Or press **Use my location**: your browser asks first, and the location is rounded to about 1 km.
3. Answer the two optional steps as **Household A** (table below), then press **See my air**.
4. On **Today**, read the one-sentence verdict and its **Model forecast** label with the time it was retrieved. Open **Air quality details** for the PM2.5 and PM10 figures, the 48-hour chart, units and sources.
5. Press **See your full day**. It says who made the plan:
   - **Made with AI**: Gemini (or the Claude backup) picked and timed our rules' suggestions;
   - **Made by our rules**: AI is unavailable right now, and everything else still works.

   Open **Why?** under a card for its reason, sources and any caveat.
6. In **My Profile**, switch to **Household B**: travel **I work from home**, outdoor exercise **No**, cooking **LPG gas**, kitchen exhaust **Yes**, busy road **No**. Then open **See your full day** on Today again. The household cards change.
7. Open **Ask AirAware** and try the questions below.

**Two households, same city, same day:**

| Question | Household A | Household B |
|---|---|---|
| Your day | Office commute, Outdoor exercise | Work from home |
| How do you usually travel? | Car | (not asked) |
| What do you mostly cook with? | Wood, coal or crop waste | LPG |
| Kitchen exhaust or chimney? | No | Yes |
| Near a busy road? | Yes | No |

On any day, Household A gets "Ventilate the kitchen while cooking", "Consider a cleaner cooking fuel where possible", "Your home is near a busy road" and "Combine trips and avoid idling", plus "Check conditions before outdoor exercise" (or "Consider an indoor alternative for exercise" when the forecast is above India's limit). Household B gets none of these; it gets "Use the kitchen exhaust while cooking" instead. In the plan, "Extra caution for your household" (children, older adults or someone more sensitive), "Less waiting beside busy roads on the school run" and "Consider a lower-traffic route or time" (walking, cycling or two-wheeler commutes) appear only when the forecast's 24-hour check is above India's limit.

The table uses the first-visit wording. My Profile (step 6) words the same questions slightly differently.

**Questions for Ask AirAware** (in brackets, the topic each one is answered under):

- "Can I go for a run this evening?" (Outdoor activities)
- "Should I open the windows today?" (Windows and ventilation)
- "How can I reduce smoke when cooking?" (Indoor air)
- "Can my kids play outside after school?" (My family)
- "How can I make my commute greener?" (Commuting)
- "What can I do instead of burning leaves?" (Better habits)
- "I have asthma, which medicine should I take?" (no medical advice: it points you to a doctor)

## How it works

1. **Place.** You search a place in India (Open-Meteo geocoding), or press **Use my location**. Coordinates are rounded to 2 decimal places, about 1 km.
2. **Forecast.** The server asks the Open-Meteo Air Quality API for 48 hourly values from the CAMS global model: PM2.5, PM10, NO₂, SO₂, O₃ and CO. It caches each forecast for 10 minutes. Every value carries its unit, source and time.
3. **24-hour check.** The server averages the next 24 hourly PM2.5 and PM10 values and compares them with India's 24-hour limits: 60 and 100 μg/m³ (CPCB National Ambient Air Quality Standards, 18 November 2009). If an hour is missing, that pollutant's 24-hour average is shown as not available, never guessed.
4. **Rules.** Fixed rules (`server/src/services/recommendations/rules.ts`) turn the check and your optional answers into suggestions. Each suggestion has its reason. Suggestions based on the forecast cite Open-Meteo and the CPCB 2009 standards; general ones say they have no external source.
5. **AI, optional.** Gemini, with Claude as an optional backup, may pick, order and time those suggestions and add a short summary and "for you" lines. For plans and topic summaries it sees only the check result and the rule cards: no coordinates and no typed questions. Its answer must pass a Zod schema and content checks, or it is dropped and the rules' plan is shown. The AI cannot change the advice text, the sources or any forecast value.
6. **Ask.** A typed question that isn't medical goes to Claude (Anthropic) with up to 2 of your earlier questions, the forecast check and the text of the cards the rules allow for you. It never gets your place name, coordinates or raw answers. Claude picks up to three of those cards and writes a short answer, which must pass checks (numbers, wording, no yes or no on safety, card ids) or the rules' answer is shown. The question is not saved, logged or sent to Gemini. Medical questions call no AI. Topic buttons use the rules and the forecast check, and Gemini may word their summary. Without an Anthropic key, typed questions take the rules' topic path.
7. **Screen.** Air readings are labelled "Model forecast" with their time; Today, the plan and Air quality details also name the source. More than an hour after retrieval, Today, Ask answers and the background note say "Not current", and a plan says its forecast is more than an hour old.

## Air data: what you see

**We don't calculate an AQI.**

- **What you see:** Open-Meteo's model forecast (CAMS global) for a grid cell about 45 km wide, hourly for the next 48 hours. Each forecast carries these limitations, word for word: "Model forecast, not a station observation.", "Not the CPCB National AQI." and "Grid cell is about 45 km wide; conditions near roads or local sources can differ."
- **Why there is no index number:** the CPCB National AQI follows CPCB's own method (sub-indices for several pollutants, each over a set averaging period) and is published by CPCB. A number we computed from a model forecast would look official without being so. Open-Meteo's European and US index values are not requested, because they are not the CPCB National AQI.
- **What you get instead:** the 24-hour check above, written as one sentence, with the averages and limits one tap away.
- **Official observations:** CPCB is the reference for station observations. No supported, permitted machine-readable feed has been verified yet, so the app says "Official CPCB observations are not connected yet." and never fills that gap.
- **Freshness and failures:** a forecast retrieved more than an hour ago is marked "Not current" (the app gets no model run time from Open-Meteo). If the provider fails, the app says the information is unavailable; it never shows demo values in its place.

## Challenge vertical

Urban Air Quality Assistant — personalized low-emission routines, indoor-air improvements, sustainable swaps, and explainable recommendations for families and communities.

## Technology

React, Vite, TypeScript, Tailwind CSS, Node.js, Express, Zod, Gemini provider adapter with a Claude backup, Supabase PostgreSQL/Auth, Vitest, Playwright, Netlify (live at https://airaware-ai.netlify.app).

## Repository structure

```text
airaware-ai/
├── client/
├── server/
├── shared/
├── netlify/functions/
├── e2e/
├── supabase/migrations/
├── docs/
├── .github/workflows/
├── netlify.toml
├── Dockerfile
├── AGENTS.md
├── README.md
└── .gitignore
```

## Documentation index

- `PRD.md` — product requirements and personas.
- `DESIGN.md` — UI/UX system and GitHub-inspired storytelling reference.
- `ARCHITECTURE.md` — system design and stack.
- `DATABASE.md` — schema and relationships.
- `API.md` — endpoints and contracts.
- `AGENTS.md` — Claude Code operating instructions.
- `IMPLEMENTATION_ROADMAP.md` — chronological plan.
- `SETUP.md` — local environment and variables.
- `FEATURE_DEVELOPMENT.md` — implementation steps and logic.
- `AUTHENTICATION_SECURITY.md` — access control and security.
- `MCP_CONNECTION.md` — optional development-time MCP tools.
- `INTEGRATIONS.md` — external services and data sources.
- `TESTING_QA.md` — verification and scripts.
- `DEBUGGING.md` — logs, diagnosis, edge cases.

## Run locally

Needs Node 24 or newer. From the repository root:

```bash
npm ci
```

```bash
npm run dev -w server
```

```bash
npm run dev -w client
```

Open `http://localhost:5173`, search an Indian city and see its hourly model forecast from Open-Meteo. No API keys are needed: without them the plan and Ask answers come from the rules. The production Docker image and checks are in `SETUP.md` §8; the live site and its checks are in `DEPLOYMENT.md`.

## Quick start

1. Read `AGENTS.md` and `PRD.md`.
2. Follow `SETUP.md`.
3. Use `IMPLEMENTATION_ROADMAP.md` phase by phase.
4. Run the checks in `TESTING_QA.md`.
5. Follow `AUTHENTICATION_SECURITY.md` before production deployment.

## Data integrity

CPCB is the reference for the CPCB National AQI and for official station observations; no verified, permitted feed for them is connected yet. Open-Meteo provides model forecasts, not CPCB station data. Its European and US index values are never requested or relabelled as the CPCB National AQI. The app shows the labelled model forecast and never fabricates a live reading or shows demo values in its place.

## Responsible-use limitations

This product provides general information, not medical diagnosis or treatment. It cannot promise that any activity or place is free of risk. Indoor and outdoor conditions differ. Follow current local authority guidance and consult qualified medical professionals for health questions.

## Challenge repository requirements

- Public GitHub repository.
- Exactly one branch (`main`).
- Repository size below 10 MB, including Git history.
- Complete source code.
- README explains vertical, approach, logic, operation, and assumptions.
- Maximum three attempts: perform the final audit before submission.


## Extended engineering documentation

- `START_HERE.md` — recommended reading order and first session.
- `CLAUDE.md` — Claude Code project entry point importing `AGENTS.md`.
- `CLAUDE_CODE_START_PROMPT.md` — complete master prompt for Claude Code.
- `AI_PROMPTS.md` — runtime system prompt templates and AI guardrails.
- `DATA_GOVERNANCE.md` — provenance, freshness, caching, attribution.
- `CODE_QUALITY.md` — CodeQL, SonarQube Cloud, Unslop, quality gate.
- `ACCESSIBILITY.md` — accessibility design and verification.
- `PRIVACY.md` — location, household context, retention and deletion.
- `THREAT_MODEL.md` — assets, trust boundaries, threats and controls.
- `PERFORMANCE.md` — frontend, backend, and provider efficiency.
- `OBSERVABILITY_RUNBOOK.md` — provider, database, and AI failure handling.
- `CONTRIBUTING.md` — contribution and commit practices.
- `CHANGELOG.md` — change history.
- `GLOSSARY.md` — domain terminology.
- `ARCHITECTURE_DECISIONS.md` — decision records.
- `USER_GUIDE.md` — end-user workflow.
- `RELEASE_CHECKLIST.md` — production and challenge release gate.
- `COST_AND_LIMITS.md` — service cost and quota management.
- `SECURITY.md` — vulnerability reporting policy.
- `.claude/rules/` — path-scoped frontend, backend, data, and testing rules.

## Links

- Live app: https://airaware-ai.netlify.app
- API: https://airaware-ai.netlify.app/api/v1/health (the same site: `/api/*` runs the Express API as one Netlify Function)
- Repository: https://github.com/gaikwadashutosh35/airaware-ai

## Author

Ashutosh Gaikwad — https://github.com/gaikwadashutosh35
