# Phase 5 — AI Daily Plan (short design)

Status: draft for owner approval, 2026-11-18. Scope and approach chosen by the owner: daily plan only, no chat ("You pick"); option 2, "Gemini adds, your wording stays".

Sources this design builds on:
- `docs/IMPLEMENTATION_PLAN.md` §7 Phase 5 (and its Phase 4 review requirement: never drop the air notice).
- `AI_PROMPTS.md` §1–3, §6–7; `API.md` §3–4; `INTEGRATIONS.md` §4, §11–12.
- `AGENTS.md` §5–7; `.claude/rules/backend.md`; `THREAT_MODEL.md`; `COST_AND_LIMITS.md`.
- Phase 4: `server/src/services/recommendations/` (`assessAir`, `buildCandidates`, `SOURCE_REFERENCES`).

## Intent

Turn the Phase 4 candidates into a short, personal daily plan. Gemini decides which actions to feature, in what order and at what time of day, and writes a summary plus one "why this matters for you" line per featured action. Every piece of advice text, reason, caveat and source still comes from the rules, word for word.

## Goals

- `POST /api/v1/recommendations/daily-plan` returns a plan for a place and optional household details.
- Gemini's part is visible and personal, and always validated before anyone sees it.
- When Gemini is missing, slow, failing or produces anything invalid, the same request still returns a complete plan from the rules alone, labelled as such.
- Nothing a user types reaches Gemini.

## Non-goals

- No chat endpoint (`/assistant/chat`); revisit after Phase 8.
- No screen: the plan UI is Phase 7. Phase 5 is checked by tests and one live call.
- No saving plans (Phase 6).
- Gemini never writes or edits advice text, reasons, caveats, sources or numbers.

## Anti-goals (a failure even if it works)

- Gemini's text contradicts the forecast, invents a number, names a medical condition, mentions an AQI, or calls anything safe or healthy.
- A plan is shown without its air notice (the notice carries the model-forecast caveat).
- A user's place name, coordinates or answers are sent to Google verbatim.
- An AI or forecast failure turns into an error page instead of a rules-only plan.

## Approaches (owner chose 2)

1. Gemini rewrites the advice text — the approved wording is replaced at runtime by unreviewed text; checks cannot catch a change of meaning.
2. **Gemini adds, the approved wording stays** — chosen. Gemini picks, orders and times the actions and writes a summary and per-action "for you" lines; every safety-relevant sentence stays reviewed.
3. Gemini only orders and summarises — safest, but a thin use of GenAI.

## Request

```json
{
  "place": { "label": "Pune, Maharashtra", "latitude": 18.52, "longitude": 73.86 },
  "householdContext": { "routine": { "commuteMode": "two_wheeler" } }
}
```

- `place.label`: trimmed, 1–120 characters (the same limit the dashboard URL uses). Echoed back; never sent to Gemini.
- `latitude`/`longitude`: JSON numbers in range with at most 2 decimals, the same privacy rule as the forecast endpoint; more decimals → 400.
- `householdContext`: optional; validated by the Phase 4 `householdContextSchema`. Missing → `{}`.
- Unknown fields → 400. Body over 4 KB → 413 `PAYLOAD_TOO_LARGE`. Malformed JSON → 400 `VALIDATION_ERROR`.
- Rate limit: 10 requests per minute per IP on this route, on top of the existing 60/min on `/api/v1`.

## Flow

1. Validate the body.
2. Forecast through the same 10-minute cache the forecast endpoint uses (one shared cache). A provider failure is not an error here: the plan is built with no forecast, so the air check says `unknown` and the plan carries the "Live air information unavailable" notice.
3. `air = assessAir(series, now)`; `candidates = buildCandidates(context, air)`.
4. If Gemini is configured, ask it for its part and validate the answer. Otherwise, or on any failure, build the rules-only plan.
5. Plans are cached for 10 minutes by (coordinates, household details, the forecast window's start hour), so refreshing does not spend Gemini quota.

## What Gemini receives (and nothing else)

- The air check: level, and per pollutant (labelled `PM2.5`/`PM10`) the status, 24-hour average and limit. Not the window start: it is a UTC time, and Gemini must not state clock times.
- Every candidate: `id`, `section`, `priority`, `title`, `text`, `reason` (notices included, marked as notices, so the summary can reflect them).

Not sent: the place label, coordinates, the raw household answers, anything typed by a user. The candidates' reasons already say what matters ("You said you exercise outdoors…").

Free-tier note: Google may use free-tier prompts and responses to improve its products, and people may read them. The input above contains only the app's own fixed text and model-forecast numbers.

## What Gemini returns

```json
{
  "summary": "string",
  "featured": [{ "id": "candidate id", "period": "morning | commute | daytime | evening | home", "forYou": "string" }]
}
```

## Checks on Gemini's answer (all must pass, else the rules-only plan)

1. Valid JSON matching the schema above (parse or schema failure → one retry, then rules-only).
2. `summary` 20–300 characters; each `forYou` 10–200 characters.
3. `featured`: 1–8 items, no duplicate ids, every id is a non-notice candidate id, and every `high`-priority non-notice candidate is included.
4. Numbers: every number in `summary` and `forYou` must also appear in the input sent to Gemini (so "PM2.5", "24-hour" and the averages pass; a new figure fails). Number words ("twice", "two") count as numbers, and a number with a time, distance or clock unit must appear with that unit ("24 hours" passes because of "24-hour"; "60 minutes" fails). *(Final review I3, 2026-11-18.)*
5. Banned wording in `summary` and `forYou` (case-insensitive): safe/safer/safest/unsafe/safely/safety, guarantee, healthy/healthier, risk-free, "no risk", "low/little/minimal risk", "clean air", "air is clean", "good day/air", "air quality is good", diagnos-, treat-, cure, medic- (medical, medicine, medication), prescri-, symptom, asthma, COPD, inhaler, lung, heart, respirat-, allerg-, bronch-, pregnan-, disease, illness, "breathing problems/difficulty", AQI, "air quality index", `http`/`www.`, "always open"/"always close", "open/close all windows", `%`. *(Comparatives, conditions and reassurance added after the final review, I1–I2.)*

A content failure (checks 2–5) does not retry: it falls back at once.

## Response

```json
{ "data": {
  "generatedBy": "ai | rules",
  "model": "gemini-3.8-flash | null",
  "promptVersion": "daily-plan-v1 | null",
  "summary": "string | null",
  "place": { "label": "Pune, Maharashtra" },
  "air": "AirAssessment (Phase 4, with windowStart)",
  "forecast": "{ provider, sourceUrl, dataKind: 'model_forecast', modelResolution, retrievedAt, limitations } | null",
  "notices": "RecommendationCandidate[] — always every notice",
  "featured": "[{ candidate, period | null, forYou | null }]",
  "more": "RecommendationCandidate[] — the rest, in rules order",
  "sources": "[{ id, name, url }] — only the sources cited",
  "safetyNote": "General information only, not medical advice. Follow local public-health advisories."
} }
```

- AI plan: `featured` in Gemini's order with its periods and lines; `more` = the remaining non-notice candidates.
- Rules-only plan: `summary` null; `featured` = every non-notice candidate in rules order with `period` and `forYou` null; `more` empty.
- The endpoint returns 200 for every valid request, whatever happens to Gemini or Open-Meteo.

## Gemini call

- Model `gemini-3.8-flash` (stable, released 2026-09-02, no shutdown date; checked 2026-11-18), overridable with `GEMINI_MODEL`. The 2.5 models shut down on 2026-12-01.
- **My call:** call the REST `generateContent` endpoint with `fetch` instead of adding `@google/genai`: a few lines, no new dependency, and full control over what is logged. JSON mode with a JSON Schema generated from the Zod output schema (`z.toJSONSchema`). Timeout 10 s, bounded output tokens (8192, which includes thinking tokens), thinking level `low`, no temperature (deprecated for Gemini 3 models; changed from 0.4 after the final review, I4). The exact field names are confirmed by the live call before Phase 5 is committed.
- Prompts: the `AI_PROMPTS.md` §2 system prompt verbatim, plus a daily-plan task prompt rewritten for option 2, versioned `daily-plan-v1`. The candidates go in as data, introduced as data, never inside the instructions.
- `GEMINI_API_KEY` is optional: without it, every plan is rules-only and startup logs "Gemini not configured; plans are rules-only." The key is never logged.

## Logging and privacy

- Never logged: the key, prompts, Gemini's answers, household details, place labels, coordinates, request bodies.
- On a Gemini failure, one line with the category only: timeout, HTTP status, invalid JSON, schema, or the name of the failed check.

## Errors

- `errorHandler` maps the JSON body parser's errors: malformed JSON → 400 `VALIDATION_ERROR` "Malformed JSON body."; too large → 413 `PAYLOAD_TOO_LARGE` "Request body too large." (new `ErrorCode`). No body in logs.

## Docs to update

`API.md` (daily-plan contract replaces the old example), `AI_PROMPTS.md` §3 (option-2 task prompt, version), `INTEGRATIONS.md` §4 (model, REST call, what is sent, free-tier note), `SETUP.md` (env vars), `CHANGELOG.md`, `docs/IMPLEMENTATION_PLAN.md` Phase 5 "As built".

## Left to the builder

File split, the exact task-prompt wording within the rules above, the plan-cache key format, and test names.
