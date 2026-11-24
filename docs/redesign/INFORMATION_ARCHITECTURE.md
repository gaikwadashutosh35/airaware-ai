# AirAware AI: information architecture (Stage 1 proposal)

**Date:** 24 Nov 2026.
**Baseline:** production https://airaware-ai.netlify.app, commit `257352e` (client code equals local `HEAD`, see [audit/PRODUCTION_VS_LOCAL.md](audit/PRODUCTION_VS_LOCAL.md)).
**Status:** proposal. Nothing here is built. Stage 1 changes no application source.
**Companion docs:** [USER_FLOWS.md](USER_FLOWS.md) (step-by-step flows and storage), the Stage 0 [findings register](audit/FINDINGS_REGISTER.md) (F-01 to F-44), and the other Stage 1 docs in this folder.

## How to read this

- **Shipped** means production today. Every shipped fact cites the code (`path:line`) or a Stage 0 screenshot in [audit/screenshots/](audit/screenshots/).
- **Proposal** means a Stage 1 layout or behaviour change from the Stage 1 brief. You still decide.
- **Proposal, needs your OK** means a copy change (shipped text or new text), or an open owner question. Mockups keep the shipped text for changed strings, except "Why?" (F-23); new strings appear in mockups only with a mockup note.
- Finding IDs (F-xx) point to the register.

## 1. Summary

- The structure the pack asked for has shipped: 8 routes, 5-item navigation, place chip, 3-step Welcome, answer-first Today.
- Stage 1 keeps every route and the URL contract. It adds two small routing changes: a branded static 404 page (F-08), and unknown `/app/*` addresses go to `/app`, keeping the query (F-09).
- Navigation changes are small: phone focus order (F-13), the logo goes to `/app` (F-28), side safe-area padding on the bottom bar (F-38), and a readable place chip (F-10).
- Most changes are about what each page shows by default, and in what order: Today's first screen (F-03), Ask's text box first (F-20), My Profile's sections (F-05, F-06), and wide layouts (F-25).

## 2. Sitemap

### 2.1 Shipped routes (verified in code)

There is no router library. `App.tsx` switches on the path, and `AppShell` picks the app page from the path.

```
Public (no app shell)
  /                Landing            App.tsx:11 (also every unknown path in the client)
  /privacy         Privacy            App.tsx:9

App (AppShell: header, navigation, place chip, backdrop, footer)   App.tsx:10
  /app             Today              navigation.ts:33-36 (anything not in PAGES is Today)
  /app/welcome     Welcome (3 steps)  navigation.ts:30; AppShell.tsx:316-330
  /app/ask         Ask AirAware       AppShell.tsx:333-348
  /app/home        My Home            AppShell.tsx:331
  /app/habits      Better Habits      AppShell.tsx:332
  /app/profile     My Profile         AppShell.tsx:297-315 (always mounted, hidden off-page)
```

| Route | Page title (`<title>`) | Rendered by | Notes |
|---|---|---|---|
| `/` | "AirAware AI: hourly air-quality forecasts for Indian cities" | `Landing.tsx:120-310` | Dark page; own header and footer |
| `/privacy` | "Privacy \| AirAware AI" | `Privacy.tsx:18-117` | Light header; logo goes to `/` |
| `/app` | "Today \| AirAware AI" | `AppShell.tsx:349-469` | No place: opens Welcome once saved answers are checked (`AppShell.tsx:114-119`) |
| `/app/welcome` | "Welcome \| AirAware AI" | `Welcome.tsx:101-363` | Steps are page state, not in the URL (`Welcome.tsx:99-100`) |
| `/app/ask` | "Ask AirAware \| AirAware AI" | `Ask.tsx:27-178` | No place: shows its own search and "Use my location" (`Ask.tsx:105-109`), not Welcome |
| `/app/home` | "My Home \| AirAware AI" | `MyHome.tsx:19-161` | Works without a place (guides only) |
| `/app/habits` | "Better Habits \| AirAware AI" | `BetterHabits.tsx:9-46` | Works without a place |
| `/app/profile` | "My Profile \| AirAware AI" | `Profile.tsx:18-157` | Works without a place |

Titles come from `AppShell.tsx:49-56,259`. Today and My Profile stay mounted (hidden) on every app page, so a built plan, a build in flight and unsaved answers survive moving pages (`AppShell.tsx:297-299,349`).

**Hosting.** Netlify serves `index.html` for `/app`, `/app/*` and `/privacy` (`netlify.toml:18-30`). Any other path gets Netlify's own 404 page (`prod-unknown-default-1280x720-first.jpg`, F-08). In the Vite dev server, the same path renders Landing (`App.tsx:11`).

**Unknown app paths.** `appPage()` maps any unknown name to Today (`navigation.ts:33-36`):
- with no place, `/app/nope` becomes `/app/welcome` (`prod-unknown-app-default-390x844-first.jpg`, F-09);
- with a place, `/app/nope?place=…` shows Today under the wrong address (code-trace).

### 2.2 Proposed routing additions

| # | Addition | Behaviour | Finding | Status |
|---|---|---|---|---|
| R1 | Branded static 404 page | A static `client/public/404.html` (no script), in the app's tokens and self-hosted Inter. Netlify serves it with status 404 for any path not matched in `netlify.toml`. Heading "We couldn't find that page"; links "Go to AirAware" (`/app`) and "Home" (`/`). | F-08 | Proposal. Page copy: proposal, needs your OK. |
| R2 | Unknown `/app/*` goes to `/app` | For a name not in `PAGES` (`navigation.ts:30`), replace the address with `/app` plus the current query (`navigate('/app', { replace: true })`, which keeps the query: `navigation.ts:21-22`). Back skips the bad address. With no place, Today then opens Welcome as today. `/app/` (trailing slash) stays Today. | F-09 | Proposal |

Not proposed: a 404 inside the client for unknown public paths. `App.tsx:11` keeps rendering Landing in development. Only production uses R1.

### 2.3 Proposed sitemap (same routes, plus R1 and R2)

```
Public
  /                Landing (7 sections, proposal F-19)
  /privacy         Privacy ("In short", app-style header, "Back to AirAware", F-29, F-28)
  any other path   404.html (static, status 404)                                  NEW (R1)

App
  /app             Today
  /app/welcome     Welcome (3 steps; header place chip hidden on step 1, F-27)
  /app/ask         Ask AirAware
  /app/home        My Home
  /app/habits      Better Habits
  /app/profile     My Profile
  /app/<unknown>   → /app (query kept, address replaced)                          NEW (R2)
```

## 3. URL contract (unchanged)

| Part | Rule | Code |
|---|---|---|
| Path | `/app` and `/app/{welcome,ask,home,habits,profile}` | `navigation.ts:30-36` |
| `place` | The place label, as chosen from search ("Name, State"), at most 120 characters | `place.ts:9-15,18,33-36` |
| `lat`, `lon` | Exactly what `toFixed(2)` gives: 2 decimals, about 1 km. Anything else, or out of range, means "no place". | `place.ts:17,22-28,37-41` |
| Example | `/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86` | `LIVE_SITE_AUDIT.md` §1 |
| In-app moves | `navigate()` keeps the query, so a searched place travels between pages | `navigation.ts:19-28` |
| Back/Forward | The shell puts the current place's query back on older entries | `AppShell.tsx:66-83` |
| Device location | Never in the URL. "Use my location" clears the query; the label is "Near you (approximate)". | `AppShell.tsx:179-196`; `place.ts:44-54` |
| Remembered place | Written into the URL when it is restored on arrival | `AppShell.tsx:201-211` |
| Ask questions and topics | Never in the URL; held in memory and sent only in the POST body | `AskBox.tsx:10-11`; `HelpChoices.tsx:43-44`; `useAsk.ts:53-56` |
| Welcome step | Not in the URL | `Welcome.tsx:99-100` |

The redesign changes none of this. R2 and the logo change (§4.5) both reuse `navigate()`, so they keep the query too.

## 4. Navigation

### 4.1 Items (unchanged)

| Order | Page | Link | Accessible name (always) | Visible label below 1024 px | Visible label from 1024 px | Icon |
|---|---|---|---|---|---|---|
| 1 | Today | `/app` | Today | Today | Today | Sun |
| 2 | Ask | `/app/ask` | Ask AirAware | Ask | Ask AirAware | MessageCircle |
| 3 | My Home | `/app/home` | My Home | Home | My Home | House |
| 4 | Better Habits | `/app/habits` | Better Habits | Habits | Better Habits | Leaf |
| 5 | My Profile | `/app/profile` | My Profile | Profile | My Profile | CircleUser |

Source: `AppNav.tsx:4-34,49,60-61`. One `<nav aria-label="Main">` landmark (`AppNav.tsx:40-41`). Plain clicks stay in the app; modified clicks open as normal links (`navigation.ts:38-50`).

### 4.2 Phone and desktop

| | Phone (below 768 px) | Desktop (768 px and up) |
|---|---|---|
| Form | Fixed bottom bar, 5 equal columns, icon over label | Inline in the navy header, between logo and place chip |
| Height | 56 px links (`min-h-14`) plus a 1 px top rule | 44 px links (`md:min-h-11`) |
| Current page | `aria-current="page"`, bold label in the light `text` colour, a filled pill behind the icon, teal icon | `aria-current="page"`, bold label, a filled pill behind the whole item |
| Safe area | Bottom only: `env(safe-area-inset-bottom, 0px)` | none |
| Code | `AppNav.tsx:42,52,54-58` | `AppNav.tsx:42,52` |

Evidence: `prod-today-default-390x844-first.jpg` (bar from y 787 at 390x844), `prod-today-default-1280x720-first.jpg`.

**Proposed changes:**

| Item | Proposal | Finding | Status |
|---|---|---|---|
| Side safe area | Pad the bar's left and right with `env(safe-area-inset-left/right, 0px)` for a notched phone in landscape | F-38 | Proposal. Confirm on a real phone. |
| Bottom padding | The brief quotes `max(0.75rem, env(safe-area-inset-bottom, 0px))`. That adds 12 px to the bar on phones without a home indicator: at 390x844 the bar would start at y 775, not 787, which costs the first-screen target 12 px (see §6.1). Keeping today's `env(…, 0px)` costs nothing. | F-38 | Proposal, needs your OK (pick one) |
| Forced colours | Keep the current-page pill visible as an outline in forced-colours mode | brief §6 | Proposal |
| Current page | No change: it is already not colour alone (bold label plus pill). | — | none |

### 4.3 Header (all app pages)

Shipped order in the DOM (`AppShell.tsx:264-291`): skip link → logo "AirAware AI" → navigation → place chip. The header row scrolls sideways at very large text (`AppShell.tsx:271-274`, F-12).

**Place chip** (`PlaceChip.tsx:37-46`):
- shows the full label, truncated (`max-w-44`, `md:max-w-56`), so it reads "Pun…" at 768 px (`prod-ask-default-768x1024-first.jpg`, F-10);
- accessible name "Change place: {label}", or "Choose a place" with no place;
- opens a native modal dialog "Change place" with the search, "Use my location" and "Close" (`PlaceChip.tsx:47-71`); Escape and click outside close it, and focus returns to the chip (Stage 0 keyboard check).

| Chip proposal | Finding | Status |
|---|---|---|
| Show the text before the first comma ("Pune"); keep the full label in the accessible name | F-10 | Proposal |
| A minimum width from 768 px so the short name never truncates | F-10 | Proposal |
| No-place label "Choose place" instead of "Choose a place" | F-10 | Proposal, needs your OK |
| Hidden on Welcome step 1, where the page has its own search | F-27 | Proposal |

### 4.4 Phone focus order (F-13)

Shipped, measured at 390x844 (`audit/evidence/prod-metrics.json`, `keyboard`): skip link → logo → the 5 bottom-bar links (at the bottom of the screen) → "Change place" (back at the top) → page content. Focus jumps down and back up (WCAG 2.4.3).

| Option | Phone order | How | Trade-off |
|---|---|---|---|
| A (register's fix) | skip link → logo → place chip → bottom bar → content | Put `PlaceChip` before `AppNav` inside the header, and use `md:order-*` so the desktop row still reads logo, navigation, chip | Smallest change; one `<nav>`; no jump back to the top. The bar is still reached before the content, as on most sites, and the skip link passes it. |
| B (brief's wording) | skip link → logo → place chip → content → bottom bar | The `<nav>` must come after `<main>` in the DOM on phones. `md:order` cannot do this, because the nav sits inside `<header>` and `<main>` is outside it. It needs either the nav moved out of the header (desktop then positions it back into the header row), or the nav rendered twice with only one shown per width. | Matches native-app tab-bar order. More code, a layout risk on desktop, or duplicated markup. |

Recommendation: **Option A**, which both mockups draw. Option B is listed because the brief states that order. You pick one; until then WIREFRAMES.md §2 and REDESIGN_ACCEPTANCE_CRITERIA.md SH-06 state both options.

### 4.5 Logo and "back" links (F-28)

| Where | Shipped | Proposed | Status |
|---|---|---|---|
| App header logo | `<a href="/">`: leaves the app and drops the place (`AppShell.tsx:275-280`) | Goes to `/app` with the current query, as an in-app move (`follow()`), so memory state (answers, Ask thread, a device-location place) is kept | Proposal |
| Privacy header logo | `/` (`Privacy.tsx:24-29`) | Unchanged | none |
| Privacy "Back to AirAware" | none | A link to `/app` near the top of Privacy | Proposal. Link text: proposal, needs your OK. Where it lands without a remembered place is an open question (§10). |
| Landing logo | `/` (`Landing.tsx:128-133`) | Unchanged | none |

Consequence: once the app logo goes to `/app`, the landing page is no longer linked from inside the app. It stays reachable from Privacy's logo and the 404 page's "Home".

### 4.6 Unchanged navigation pieces

- The skip link "Skip to content" is the first Tab stop (`AppShell.tsx:264-269`).
- A new page starts at its top; Back and Forward keep the browser's scroll (`navigation.ts:25-26`).
- Every app page ends with open space as tall as the city band plus the phone bar (`AppShell.tsx:491-496`).

## 5. Pages: purpose and primary action

One teal (primary) action per screen is a brief rule (§4 Direction A). The "Primary action" column names it.

| Page | Purpose (one line) | Primary action | Secondary actions |
|---|---|---|---|
| Landing `/` | Say what AirAware does and get the visitor to their place | "Check My Air" | "Meet Your Assistant", the hero search |
| Welcome `/app/welcome` | Get a first-time visitor to Today in at most 3 short steps | Step 1: pick a place. Steps 2–3: "Next" / "See my air" | "Use my location", Back, Skip, "Remember on this device" |
| Today `/app` | Answer "How is my air?" and "What could I do today?" | Read the verdict and the top recommendation (no button). No teal button is needed in the first screen. | "Why?", "See your full day", help choices, Ask box, "Air quality details", personalise invite |
| Ask `/app/ask` | Answer a practical question from the rules and today's forecast | Send a question (the text box) | Topic chips, starter questions, "Why?" on answer cards |
| My Home `/app/home` | Show today's indoor suggestions and ways to improve indoor air | None (reading page) | "Why?" on each card |
| Better Habits `/app/habits` | Show everyday habits that cut smoke and exhaust | None (reading page) | "Why?" on each card |
| My Profile `/app/profile` | Manage household answers, saved plans and saved data | "Save my answers" | Open or delete a saved plan, "Forget this place", "Delete my saved data" |
| Privacy `/privacy` | Say plainly what goes where | None | "Back to AirAware" (proposed) |
| 404 (proposed) | Recover from a broken link | "Go to AirAware" | "Home" |

Shipped exceptions to "one teal action": on Today, "Make it personal: 2 quick questions" and the Ask box's "Send" are both teal (`AppShell.tsx:429`, `AskBox.tsx:56`; audit §5 row 5.3). The brief moves the invite under the help choices as an outlined button. The Ask box's "Send" stays teal; it is below the first screen.

## 6. Content inventory per page

Each table lists what shows by default and what sits behind a disclosure (a `<details>` element or a "Why?" summary), in screen order.

### 6.1 Today, with a place and a ready forecast

#### Progressive disclosure in today's build

This replaces UX_AUDIT §3.4, which was the 20 Nov proposal, with what ships now.

| Default view (no tap) | "Why this recommendation?" (1 tap, top card) | "See your full day" (1 tap) | "Air quality details" (1 tap) |
|---|---|---|---|
| Greeting by time of day, no name (`today.ts:7-14`) | Reason | "Plan for {place}"; the AI summary when there is one; who made it (`PlanView.tsx`) | "Forecast location: {lat}, {lon}" at 2 decimals (`AirDetails.tsx:50-52`) |
| H1 "Today in {place}" (`AppShell.tsx:352-362`) | Based on ("today's forecast check" or "general guidance") | "Your day" by period (AI plans only) | "Model forecast" block: "Values for HH:MM", the PM2.5 figure with its unit, the 24-hour window, one check line per pollutant with its limit (`AirReadout.tsx:62-130`) |
| Weather line as the card's first row (`TodayLead.tsx:31-33`) | What it used (each input named) | "Outdoors and travel", "Indoor air", "Sustainable swaps", each card with its own "Why?" (the top card appears again here, audit 2.2) | Provider and model resolution; "Model run time not reported by the provider. Retrieved HH:MM." (`AirReadout.tsx:132-140`) |
| Verdict H2 (`TodayLead.tsx:35-40`) | Sources (links), or "No external source; this is general guidance." | The plan's general-information note | "Your city, the next two days": the PM2.5/PM10 chart and the pollutant table for one hour (`ForecastPanel.tsx:49-138`) |
| Level tag and "Model forecast · Open-Meteo · updated HH:MM" (`TodayLead.tsx:41-46`) | Caveat | "Save plan" and its note (`DailyPlanSection.tsx:284-298`) | "Hourly forecast ({N} hours)", a nested disclosure (2 taps) (`ForecastPanel.tsx:141-144`) |
| Stale banner, only when stale (`TodayLead.tsx:47`) | | | "Official CPCB observations are not connected yet." plus the CPCB source's own note (`AirDetails.tsx:57-62`) |
| Meaning sentence (`TodayLead.tsx:48`) | | | "How the 24-hour check works", ending "We don't calculate an AQI." (`AirDetails.tsx:63-72`) |
| Caveat, within-limit only (`TodayLead.tsx:49-51`) | | | "Sources and limitations" (`SourcesPanel.tsx:16-47`) |
| "Your recommendation for today" H2 and the live line "Your plan is ready." (`DailyPlanSection.tsx:228-237`) | | | |
| Top card: title, "Important today" when high priority, text, "For you" when present (`PlanCard.tsx:36-54`) | | | |
| "Made with AI" or "Made by our rules", plus the general-information note (`DailyPlanSection.tsx:274-276`) | | | |
| Invite "Make it personal: 2 quick questions" / "Not now", only with no household answers (`AppShell.tsx:421-441`) | | | |
| "What would you like help with?": 4 choices (`HelpChoices.tsx:8-41`) | | | |
| "Ask AirAware anything": text box, Send, 3 starter chips (`AskBox.tsx:4-8,23-77`) | | | |
| Footer: "Background: model forecast for {place}. {tag}." (+ " Not current."), attribution, Privacy link (`AppShell.tsx:471-490`) | | | |

No pollutant figure, unit or CPCB name is in the default view (audit §4, "Technical words in Today's default view").

#### Proposed changes to Today's default view

The order follows brief §3 and §7.

| # | Change | Finding | Status |
|---|---|---|---|
| T1 | H1 at 24 px on phones, so a long place name breaks cleanly and takes fewer lines | F-11 | Proposal |
| T2 | Weather line stays as the card's first row (approved 20 Nov in the cityscape backdrop spec §5.4). Moving it below the verdict is your call. | F-21 | Proposal, needs your OK (keep or move) |
| T3 | Drop the meaning sentence from the card; keep it inside "Air quality details" | F-22 | Proposal, needs your OK |
| T4 | Tighter verdict-card padding on phones | F-03 | Proposal |
| T5 | "Your plan is ready." becomes screen-reader-only; the live region stays | F-03 | Proposal |
| T6 | Recommendation heading at 20 px on one line on phones | F-03 | Proposal |
| T7 | "For you" only when household answers exist (a server and client change) | F-14 | Proposal, needs your OK |
| T8 | One disclosure label "Why?" on Today, My Home, Better Habits and Ask; the card title stays in the accessible name (`PlanCard.tsx:61`) | F-23 | Proposal, needs your OK (label change) |
| T9 | Invite moves under the help choices as an outlined button. Label stays "Make it personal: 2 quick questions". The brief's §7 wireframe shows "Tailor this to your household", which is not in its copy table. | 5.3 (audit) | Layout: proposal. Any new label: proposal, needs your OK. |
| T10 | Help choice "Greener habits" reads "Better habits" | F-24 | Proposal, needs your OK |
| T11 | Provenance word "updated" reads "retrieved" | F-32 | Proposal, needs your OK |
| T12 | Help choices 2 x 2 below 640 px (`grid-cols-2 lg:grid-cols-4`), as the brief's §7 wireframe draws. Shipped: one column below 640 px (`HelpChoices.tsx:55`); WIREFRAMES.md frames keep it. Both mockups draw 2 x 2 with 0 targets under 44 px and no overflow at 320 (`measure.mjs`). | brief §7 | Proposal, needs your OK (layout) |

**First-screen target (phones).** Production at 390x844: "Why?" at y 1049; the bar starts at y 787 (brief §3, from Stage 0). The mockups measure the proposal (`measure.mjs`, 24 Nov; a rules card with no "For you", weather line kept). At 390x844, "Why?" ends at y 739 in A with the meaning sentence kept (about 656 without it, derived), and at y 807 in B, cut by the bar (about 722 without it). So A needs no OK for a rules card; an AI card's "For you" line (about 100 px, the brief's estimate) needs T7 or T3. B needs T3, plus T7 for an AI card with "For you". At 320x640 (bar from y 583), the verdict and provenance fit in both; the recommendation heading does not (top A 671, B 650), so the brief's 320 target is missed: a trade-off. "Why?" needs a scroll there. Desktop (1280x720) shows the verdict, top card and "Why?" in the first screen (`prod-today-default-1280x720-first.jpg`; mockups: "Why?" bottom A 405, B 349). DESIGN_CONCEPTS.md §7 has the full numbers.

### 6.2 Today: the other states

Four states stay distinct (brief §3). Evidence is the local fixture captures, since these states can't be forced in production.

| State | Verdict area | Recommendation area | Backdrop and footer | Evidence | Proposed change |
|---|---|---|---|---|---|
| No place | H1 "Today" and a loading placeholder until saved answers are checked; then Welcome opens (`AppShell.tsx:114-119,365`) | Not built | Neutral scene; no "Background" line | `prod-app-noplace-default-390x844-first.jpg` | none |
| Loading forecast | Grey placeholder; the label "Loading forecast" is screen-reader-only (`States.tsx:7-23`) | "Building your plan. This can take up to 30 seconds." in the live line, plus a placeholder (`DailyPlanSection.tsx:35,238-240`) | No scene yet (`scene.ts:88-101`) | `local-today-loading-390x844-first.jpg`, `local-today-plan-building-390x844-first.jpg` | Placeholders near final card heights (F-02). Visible label "Loading forecast…" (F-18): proposal, needs your OK. |
| (a) Stale | Verdict as normal, then the amber "Not current: retrieved more than an hour ago. Reload for the latest forecast." under the provenance (`AirReadout.tsx:41-58`) | Plan as normal; "The forecast behind this plan is more than an hour old." when the plan's forecast is old (`planDisplay.ts:26-27`) | Last-known look (F-44 open); footer adds " Not current." (`scene.ts:105-113`) | `local-today-stale-390x844-full.jpg` | A "Reload forecast" button inside or beside the banner (placement open, DESIGN_SYSTEM_PROPOSAL.md §13), calling the existing retry (F-30): proposal; button label needs your OK |
| (b) Forecast error | No verdict. Card "We couldn't load the forecast", one of four reasons, "Try again" (`AppShell.tsx:384-394`; `States.tsx:25-36`) | Builds as normal. The server fetches its own forecast; if that fails too, the air is "unknown". The cards always come from the rules; the AI writer still runs, so the line reads "Made with AI" or "Made by our rules" (`server/src/services/recommendations/dailyPlan.ts:150-170`). It shows the plan's own air line or "Air information is unavailable for this plan." (`DailyPlanSection.tsx:257-262`) | Neutral scene; no "Background" line | `local-today-unavailable-390x844-full.jpg`; e2e `e2e/failures.spec.ts:19-36` | none |
| (c) Incomplete 24-hour check | H2 "Live air information unavailable", tag "No data", provenance, "We could not get a complete 24-hour forecast for this place, so there's no advice about today's air. The suggestions below apply on any day." (`today.ts:46-51`) | Plan cards from the rules. "Made with AI" or "Made by our rules": the AI writer runs on unknown air too (`dailyPlan.ts:150-170`; `server/src/services/ai/prompts.ts:57`). The brief's "Made by our rules" holds only when the AI is off or fails. | Unknown look; footer "… No data." | `local-today-unknown-check-390x844-full.jpg`, `local-today-unavailable-plan-390x844-full.jpg` (unknown check with a plan built without a forecast) | H2 "Air information unavailable" (F-16): proposal, needs your OK |
| (d) Plan error | Verdict as normal | "We couldn't build your recommendation." / reason / "Try again" (`DailyPlanSection.tsx:241-252`) | As (verdict) | `local-today-plan-error-390x844-full.jpg` | Add "The forecast above is still up to date." when the forecast is ready (F-31): proposal, needs your OK |

The four forecast-error reasons (`States.tsx:25-36`): "Forecast provider unavailable." (provider), "Could not reach AirAware. Check your connection." (network), "Too many requests. Try again in a minute." (rate limit), and "Something went wrong loading the forecast." (anything else).

### 6.3 Ask AirAware

| Shipped, in order | Default or disclosure | Code | Proposed |
|---|---|---|---|
| H1 "Ask AirAware" | default | `Ask.tsx:81-83` | A one-line purpose under it: "Ask about your air, home or day. Answers come from AirAware's rules and today's forecast." Proposal, needs your OK (new copy). |
| "Using: the {place} model forecast, updated HH:MM · {n} of 10 answers · Edit" | default | `Ask.tsx:84-101` | "{n} of 10 household questions answered · Edit" (F-15). Proposal, needs your OK. |
| No place: search and "Use my location" in a panel | default | `Ask.tsx:105-109` | none |
| Greeting panel: "{greeting}. I'm AirAware. Ask me about your day, your home or your commute." | default | `Ask.tsx:113-114`; `features/ask/ask.ts:53-54` | Proposal, needs your OK: drop it; the purpose line replaces it (WIREFRAMES.md §13). Alternative: keep it below the text box. |
| 6 topic chips (each sends at once) | default | `AskEntry.tsx:29-52`; `features/ask/ask.ts:17-24` | Kept, under the text box |
| 5 starter questions (each sends at once) | default | `features/ask/ask.ts:26-38`; `AskEntry.tsx:55-80` | 3 shown, 2 behind "More questions" (label needs your OK). See the note below. |
| Thread: your message, then the answer card | default | `Ask.tsx:122-139` | After sending, scroll the new exchange to its top (F-04). Proposal. |
| Answer: summary, made by, "Based on: {verdict} · Model forecast · updated HH:MM", caveat, stale banner, up to 3 cards, general-information note | default | `AskEntry.tsx:84-146` | "Based on" adds "Model forecast · {provider} · updated HH:MM" only when a forecast exists (F-34). Proposal; wording needs your OK. |
| Each answer card's "Why?" | disclosure | `PlanCard.tsx:58-111` | Label "Why?" everywhere (F-23) |
| Question back ("One question so I can be more specific:"), "You could also ask:" | default, newest answer only | `AskEntry.tsx:249-308` | none |
| Text box "Ask about your air, home or day" + Send | default, at the bottom (y 878 at 390x844) | `Ask.tsx:140-173`; `prod-ask-default-390x844-first.jpg` | Moves to the top, under the title (F-20). Proposal. |

**Starter note.** The brief asks for "3 starter questions for the chosen topic". In the code a topic chip sends a question at once, so there is no "chosen topic" before sending (`AskEntry.tsx:43`, `Ask.tsx:73-74`). There is one starter per topic, and none for greener habits (`features/ask/ask.ts:26-38`). Two ways to read it:
1. **(recommended, no new copy)** Show the first 3 of the existing 5 starters, and the other 2 behind "More questions". After any answer, the shipped "You could also ask:" already lists starters for nearby topics (`features/ask/ask.ts:77-90`).
2. Change topic chips to select a topic first and then list that topic's starters. This needs new starter questions (new copy, your OK) and a change in chip behaviour.

### 6.4 My Home

| Shipped, in order | Default or disclosure | Code | Proposed |
|---|---|---|---|
| H1 "My Home" | default | `MyHome.tsx:67-72` | Add a one-line purpose (new copy, needs your OK) |
| "Today, for your home": shown only while the plan builds, fails, is stale, or has indoor cards. It is inserted after first paint. | default | `MyHome.tsx:50-54,74-129` | Space reserved from first paint (F-02). Proposal. What it shows with no place is an open question (§10). |
| Its plan air line, indoor cards, made by + general-information note | default | `MyHome.tsx:104-127` | none |
| "Ways to improve indoor air": groups "Cooking and smoke", "Ventilation", "Dust and cleaning", "Indoor habits", "Filtration", "Near a busy road" (server library; a card already in today's plan or contradicting an answer is hidden) | default | `MyHome.tsx:130-158`; `server/src/services/recommendations/guides.ts:219-227` | Groups as section headings in one flowing grid (F-25). Proposal. |
| Each card's "Why it matters" | disclosure | `GuideGroups.tsx:78`; `MyHome.tsx:117` | "Why?" (F-23), needs your OK |

My Home has no "Save plan" and no "See your full day". Those exist only on Today (`DailyPlanSection.tsx:278-301`).

### 6.5 Better Habits

| Shipped, in order | Default or disclosure | Code | Proposed |
|---|---|---|---|
| H1 "Better Habits" | default | `BetterHabits.tsx:17-24` | Add a one-line purpose (new copy, needs your OK) |
| One panel with groups "Daily commuting and vehicle idling", "Waste", "Cooking", "Energy use" (cards in a 2-column grid per group) | default | `BetterHabits.tsx:25-28`; `GuideGroups.tsx:67`; `server/src/services/recommendations/guides.ts:232-239` | One flowing grid so a single-card group doesn't leave half a row empty (F-25, `prod-habits-default-1280x720-full.jpg`). Proposal. |
| Each card's "Why it matters" | disclosure | `GuideGroups.tsx:78` | "Why?" (F-23), needs your OK |

### 6.6 My Profile

| Shipped (`Profile.tsx`) | Code | Proposed order and change | Finding | Status |
|---|---|---|---|---|
| H1 "My Profile" | `:74-79` | 1. H1 (unchanged) | — | none |
| Desktop: form left, everything else right (`lg:grid-cols-2`) | `:80` | Desktop: form left; saved plans and "Your data" right | F-25 | Proposal |
| "Your place" with "Remembered place: {label}" and "Forget this place", only when remembered | `:93-120` | 2. "Your place", first, only when remembered | — | Proposal (order only) |
| "Your household (optional)": 10 questions in groups, the save note, "Save my answers", "Delete my saved data" (always shown) | `HouseholdPreferencesForm.tsx:182-282` | 3. "Your household (optional)" with "Save my answers" | — | Proposal (delete moves out) |
| "Saved plans": only with a session; hidden otherwise | `SavedPlansList.tsx:132` | 4. "Saved plans", always shown. With no session: "No saved plans yet. Use Save plan under See your full day on Today." No token, no API call. | F-06 | Proposal; new copy needs your OK |
| Opened saved plan: snapshot banner and the full plan, below the list | `:131-152` | Unchanged, below the list | — | none |
| (none) | — | 5. "Your data": what saving does (corrected copy) and "Delete my saved data", only when data exists (a session, or saved answers loaded) | F-01, F-05 | Proposal; heading and copy need your OK |

`prod-profile-default-1280x720-full.jpg` and `prod-profile-default-1440x900-first.jpg` show today's empty right column.

### 6.7 Welcome

| Step | Shipped content (`Welcome.tsx`) | Proposed |
|---|---|---|
| All | "Step {n} of 3", H1 per step (`:165-185`); header place chip visible | Chip hidden on step 1 (F-27) |
| 1 | "Where should we check air quality?": search and "Use my location". No Back, no Skip (`:188-204`, `:320`) | Add one value line: "See today's air forecast for your place and one thing you could do." (F-27). Proposal, needs your OK. |
| 2 | "What does your typical day look like?": "Choose any that fit. All optional.", 4 day chips, travel chips when "Office commute" is ticked; Back, Next, Skip (`:206-238`) | none |
| 3 | "Tell us a little about your home.": fuel, exhaust, purifier, busy road; "Remember on this device" (off), its note; Back, "See my air", Skip (`:240-318`) | Note copy (F-01). Proposal, needs your OK. |

Welcome opens on step 2 when a place already exists (`Welcome.tsx:122`), for example from Today's "Make it personal" invite. Evidence: `local-welcome-noplace-390x844-first.jpg`, `local-welcome-step2-390x844-full.jpg`, `local-welcome-step3-390x844-full.jpg`.

### 6.8 Landing

Shipped (8 sections; 9.4 phone screens at 390, 7.8 at 1280; audit §4):

| # | Section | Code |
|---|---|---|
| 1 | Hero: H1 "The air around you matters.", benefit line, "Check My Air", "Meet Your Assistant", "Or search a city" with the search, a dated past screenshot of Today | `Landing.tsx:138-178` |
| 2 | "01 Understand your air", with a dated screenshot of Air quality details | `Landing.tsx:180-196` |
| 3–6 | "Your personal daily plan", "Improve indoor air", "Sustainable everyday choices", "Explainable AI": each a rule card labelled "Example from our rules." with "Why?" ("Explainable AI" opens it) | `Landing.tsx:199-222`; `landingExamples.ts:33,51,71,90` |
| 7 | "How AirAware works": 4 steps, then "Forecasts are model estimates, not station measurements, and not the CPCB National AQI." and "Official CPCB observations are not connected yet." | `Landing.tsx:224-280` |
| 8 | "Your city, the next two days" and "Check My Air" | `Landing.tsx:282-293` |

Proposed (brief §3, F-19): about 7 phone screens at 390 and 6 at 1280, in 7 sections, with one compact mid-page "Check My Air". The hero top-aligns from 1024 px so the search is in the first 1280x720 screen. The mapping below is a proposal; WIREFRAMES.md is the layout source.

| Proposed section | Content taken from |
|---|---|
| 1 Hero | Shipped hero text and both calls to action; the search gains an explicit submit (see §10, it touches every place search) |
| 2 Today preview | The dated past screenshot of Today (and its caption) |
| 3 What AirAware helps with (4 items) | New short section. WIREFRAMES.md fills it with the four help-choice titles and lines from `HelpChoices.tsx:15-40`. The section heading is new copy and needs your OK. |
| 4 One recommendation explained | "Your personal daily plan" and "Explainable AI": one rule card with "Why?" open |
| 5 My Home and Better Habits | "Improve indoor air" and "Sustainable everyday choices" |
| 6 How it works | "How AirAware works" (4 steps), near the end |
| 7 Transparency and final "Check My Air" | The two disclaimer lines and the closing call to action |

Whether the Air quality details screenshot (shipped chapter 01) is kept is a WIREFRAMES.md decision.

### 6.9 Privacy

| Shipped (`Privacy.tsx`) | Proposed | Finding | Status |
|---|---|---|---|
| Light header, logo to `/` (`:22-31`) | App-style navy header; logo unchanged | F-29 | Proposal |
| No way back into the app | "Back to AirAware" link | F-28 | Proposal; text needs your OK |
| H1, one intro line, 7 sections (`:33-99`) | A 3-line "In short" at the top, from existing statements only | F-29 | Proposal; the 3 lines need your OK |
| "Supabase" named, not described (`:72-83`) | Gloss once: "our database host" | F-29 | Proposal, needs your OK |
| "Unused accounts are not removed automatically yet." (`:90`) | Align with PRIVACY.md once you confirm whether the cleanup job runs | F-07 | Needs your OK (fact check first) |
| Footer links to Privacy itself (`:104-114`) | Unchanged | — | none |

No privacy claim changes otherwise.

### 6.10 404 page (proposed, R1)

Static page, no script: logo, H1 "We couldn't find that page", "Go to AirAware" (`/app`), "Home" (`/`). All copy is new: proposal, needs your OK.

### 6.11 Footer on every app page (unchanged)

"Background: model forecast for {place}. {tag}." (plus " Not current." when stale; only while a forecast is shown), the CC BY 4.0 attribution, and a Privacy link (`AppShell.tsx:471-490`; `scene.ts:105-113`).

## 7. Where every feature lives

| Feature | Component (path) | Page(s) | Change in the redesign |
|---|---|---|---|
| Place search (combobox) | `features/location/LocationSearch.tsx` | Landing hero, place-chip dialog, Welcome step 1, Ask with no place | Next-step copy for no result and error (F-35), needs your OK. Explicit submit on Landing (open question, §10). |
| Use my location | `features/location/UseMyLocation.tsx` | Place-chip dialog, Welcome step 1, Ask with no place | none |
| Place chip and dialog | `components/PlaceChip.tsx` | Header of every app page | Short name, min width, hidden on Welcome step 1 (F-10, F-27) |
| Navigation | `components/AppNav.tsx` | Every app page | Focus order (F-13), side safe area (F-38) |
| Backdrop | `features/air-quality/CitySkyline.tsx`, `scene.ts` | Behind every app page | Desktop near-layer contrast (F-26, Direction A); stale look is F-44 (open) |
| Verdict card | `features/today/TodayLead.tsx` | Today | T1–T5, T11 |
| Stale banner | `features/air-quality/AirReadout.tsx` (`StaleBanner`) | Today, Ask answers | "Reload forecast" button on Today (F-30) |
| Recommendation (top card + full day + Save plan) | `features/daily-plan/DailyPlanSection.tsx`, `PlanView.tsx`, `PlanCard.tsx` | Today (the full day and Save plan only here); My Home mirrors its indoor cards | T5–T8; plan-error line (F-31) |
| "Why?" disclosure | `features/daily-plan/PlanCard.tsx` | Today, My Home, Better Habits, Ask answers, Landing examples | One label (F-23) |
| Help choices | `features/today/HelpChoices.tsx` | Today | "Better habits" (F-24, needs your OK) |
| Personalise invite | `pages/AppShell.tsx:419-441` | Today, with no household answers | Moves under help choices, outlined (T9) |
| Ask box (on Today) | `features/today/AskBox.tsx` | Today | none (its starters fill the box; they don't send) |
| Air quality details | `features/today/AirDetails.tsx`, `AirReadout.tsx`, `ForecastPanel.tsx`, `ForecastChart.tsx`, `SourcesPanel.tsx` | Today | Receives the meaning sentence if T3 is accepted |
| Ask thread | `pages/Ask.tsx`, `features/ask/AskEntry.tsx`, `useAsk.ts`, `ask.ts` | Ask | F-20, F-04, F-15, F-34 |
| Guides | `features/guides/GuideGroups.tsx` | My Home, Better Habits | One flowing grid (F-25), "Why?" (F-23) |
| Household form, save answers | `features/daily-plan/HouseholdPreferencesForm.tsx` | My Profile | Delete moves to "Your data" (F-05); note copy (F-01) |
| Remembered place, forget | `pages/Profile.tsx:93-120`; `AppShell.tsx:201-229` | My Profile | Shown first |
| Saved plans, open snapshot, delete plan | `features/daily-plan/SavedPlansList.tsx`; `Profile.tsx:131-152` | My Profile | Always shown, static empty state (F-06) |
| Delete everything | `HouseholdPreferencesForm.tsx:160-176,245-279` | My Profile | Only when data exists (F-05) |
| Onboarding | `pages/Welcome.tsx` | Welcome | Value line, chip hidden (F-27); Remember note (F-01) |
| Loading and error cards | `components/States.tsx` | Every page with data | Sized placeholders (F-02), visible label (F-18) |
| Footer note and attribution | `AppShell.tsx:471-490`; `components/Attribution.tsx` | Every app page | none |

## 8. What changes compared with production

| # | Area | Production (`257352e`) | Proposal | Finding | Status |
|---|---|---|---|---|---|
| 1 | Unknown public path | Netlify's unbranded 404 | Static branded `404.html` | F-08 | Proposal; copy needs your OK |
| 2 | Unknown `/app/*` | Silently Today (or Welcome) | Replace with `/app`, keeping the query | F-09 | Proposal |
| 3 | App logo | Goes to `/` | Goes to `/app` with the query, in-app | F-28 | Proposal |
| 4 | Privacy | No way back into the app; light header | "Back to AirAware"; app-style header; "In short" | F-28, F-29 | Proposal; copy needs your OK |
| 5 | Phone focus order | Logo, bar, chip, content | Logo, chip, bar, content (Option A) | F-13 | Proposal |
| 6 | Bottom bar sides | Bottom inset only | Left and right insets too | F-38 | Proposal |
| 7 | Place chip | Full label truncated ("Pun…" at 768) | Short name, min width; "Choose place" | F-10 | Proposal; label needs your OK |
| 8 | Welcome step 1 | Header chip beside the page's own search; no value line | Chip hidden; one value line | F-27 | Proposal; line needs your OK |
| 9 | Today first screen (phone) | "Why?" at y 1049 at 390x844 | T1–T7 (§6.1) | F-03, F-11, F-14, F-21, F-22 | Mixed; see §6.1 |
| 10 | Today loading | Wordless placeholders, shorter than the cards | Sized placeholders, visible label | F-02, F-18 | Proposal; label needs your OK |
| 11 | Stale recovery | Text only | "Reload forecast" button | F-30 | Proposal; label needs your OK |
| 12 | Plan error | No word on the verdict | "The forecast above is still up to date." | F-31 | Proposal, needs your OK |
| 13 | Incomplete check H2 | "Live air information unavailable" | "Air information unavailable" | F-16 | Proposal, needs your OK |
| 14 | Disclosure labels | "Why this recommendation?", "Why it matters", "Why?" | "Why?" everywhere | F-23 | Proposal, needs your OK |
| 15 | Help choice | "Greener habits" | "Better habits" | F-24 | Proposal, needs your OK |
| 16 | Provenance word | "updated HH:MM" | "retrieved HH:MM" | F-32 | Proposal, needs your OK |
| 17 | Ask layout | Text box at the bottom; 11 pills first | Text box first, then chips, then 3 starters | F-20 | Proposal; "More questions" needs your OK |
| 18 | Ask after sending | Scrolls only to your message at 320 and 1280 | Scroll the exchange to its top | F-04 | Proposal |
| 19 | Ask header line | "{n} of 10 answers · Edit" | "{n} of 10 household questions answered · Edit" | F-15 | Proposal, needs your OK |
| 20 | Ask "Based on" | Always says "Model forecast" | Only when a forecast exists, with the provider | F-34 | Proposal; wording needs your OK |
| 21 | My Home | "Today, for your home" inserted late; 2-column groups | Reserved space; one flowing grid | F-02, F-25 | Proposal |
| 22 | Better Habits | Half-empty rows on wide screens | One flowing grid | F-25 | Proposal |
| 23 | My Profile | Delete always shown; saved plans hidden with no session | Delete only with data; saved plans always, static empty state | F-05, F-06 | Proposal; empty-state copy needs your OK |
| 24 | Save and Remember notes | "Saved on this browser…" | Says an anonymous account is created on AirAware's database host | F-01 | Proposal, needs your OK |
| 25 | Place search messages | "No places found"; server text on error | Next step in both | F-35 | Proposal, needs your OK |
| 26 | Landing | 8 sections, 9.4 phone screens | 7 sections, about 7 phone screens; top-aligned hero | F-19 | Proposal |
| 27 | Desktop backdrop | Near city layer is the highest-contrast shape | Lower near-layer contrast from 1024 px; height unchanged | F-26 | Proposal (Direction A) |

### 8.1 Everything in these two docs that needs your OK

The full list the owner answers is IMPLEMENTATION_OUTLINE.md §3 P1 Part A; this table repeats the rows this document touches. Mockups keep the shipped text for every row until you approve it, except F-23: both mockup sets show "Why?" (the brief's §7 anchor), named in a mockup note. "Brief §8" means the row is already in the brief's copy table; the others are added here.

| # | Where | Shipped | Proposed | Finding | Source |
|---|---|---|---|---|---|
| 1 | My Profile note and Today's "Save plan" note | "Saved on this browser only. Clearing your browser data or switching devices loses it." | "Saving creates an anonymous account (no email or name). Your answers are stored on AirAware's database host, and this browser keeps the sign-in. Delete them any time in My Profile." | F-01 | Brief §8, reworded: the project owner and Supabase can access the database (`Privacy.tsx:81`) |
| 2 | After "Save my answers" | "Saved on this browser." | "Saved to your anonymous account." | F-01 | Brief §8 |
| 3 | After "Save plan" | "Saved on this browser. This is the plan as saved." | "Saved to your anonymous account. This is the plan as saved." | F-01 | Brief §8 |
| 4 | Welcome step 3, under Remember | "Creates an anonymous save on this device. Delete it any time in My Profile." | "Creates an anonymous account that keeps your answers, and a place you searched for, so this browser can reopen them. Delete it any time in My Profile." | F-01 | Brief §8, reworded: Remember keeps the answers and never a "Use my location" place (`Privacy.tsx:78-79`, `Welcome.tsx:306-309`) |
| 5 | Incomplete-check H2 (Today; Ask "Based on") | "Live air information unavailable" | "Air information unavailable" | F-16 | Brief §8 |
| 6 | Verdict meaning sentence | On the card | Dropped from the card; kept in "Air quality details" | F-22 | Brief §8 |
| 7 | Weather line | The card's first row (approved 20 Nov) | Keep, or move below the verdict | F-21 | Brief §8 |
| 8 | Help choice; also Ask's topic chip (`features/ask/ask.ts:23`) and the landing section 3 list, per the ruling | "Greener habits" | "Better habits" | F-24 | Brief §8 |
| 9 | Provenance | "updated HH:MM" | "retrieved HH:MM" | F-32 | Brief §8 |
| 10 | Ask header | "{n} of 10 answers · Edit" | "{n} of 10 household questions answered · Edit" | F-15 | Brief §8 (brief §3 states it as decided) |
| 11 | "For you" line | Always shown when present | Only with household answers | F-14 | Brief §8 |
| 12 | Remembered place contents | Label and 2-decimal coordinates | Keep (documented), or label only | F-43 | Brief §8 |
| 13 | Backdrop while stale | Last-known look | Keep, or neutral | F-44 | Brief §8 |
| 14 | Disclosure labels | "Why this recommendation?", "Why it matters" | "Why?" everywhere | F-23 | Added (brief §3 states it; §8 omits it) |
| 15 | Place chip with no place | "Choose a place" | "Choose place" | F-10 | Added (brief §3) |
| 16 | Personalise invite label | "Make it personal: 2 quick questions" | Keep. The brief's §7 wireframe shows "Tailor this to your household". | — | Added |
| 17 | Ask purpose line | none | "Ask about your air, home or day. Answers come from AirAware's rules and today's forecast." | F-20 | Added (brief §3) |
| 18 | Ask starters | All 5 shown | 3 shown; "More questions" for the other 2 | F-20 | Added |
| 19 | Ask "Based on" | "… · Model forecast · updated HH:MM", always "Model forecast" | "Model forecast · {provider} · updated HH:MM" only when a forecast exists | F-34 | Added (brief §3) |
| 20 | My Home and Better Habits purpose lines | none | Reuse the shipped landing lines (`landingExamples.ts:52,72`; WIREFRAMES.md §15–§16; mockup B for My Home). Mockup A draws a draft alternative for My Home: "Suggestions for your home today, then ways to improve indoor air on any day." | — | Added (brief §3) |
| 21 | My Profile, no session | (no section) | "No saved plans yet. Use Save plan under See your full day on Today." | F-06 | Added (brief §3) |
| 22 | My Profile | (no section) | Heading "Your data", with row 1's text and "Delete my saved data" | F-01, F-05 | Added |
| 23 | Welcome step 1 | none | "See today's air forecast for your place and one thing you could do." | F-27 | Added (brief §3) |
| 24 | Place search, no result | "No places found" | "No places found. Try a nearby city, or use your location." | F-35 | Added (brief §3) |
| 25 | Place search, error | The server's text ("Data provider unavailable.") | "Search isn't working right now. Try again, or use your location." | F-35 | Added (brief §3) |
| 26 | Stale banner button | none | "Reload forecast" | F-30 | Added (brief §3) |
| 27 | Forecast loading | Label screen-reader-only | Visible "Loading forecast…" | F-18 | Added (brief §3) |
| 28 | Plan error | (no line) | "The forecast above is still up to date." | F-31 | Added (brief §3) |
| 29 | Privacy | (no summary; no way back) | "In short" (3 lines from existing statements); "our database host" gloss; "Back to AirAware" | F-29, F-28 | Added (brief §3) |
| 30 | Privacy retention line | "Unused accounts are not removed automatically yet." | Match PRIVACY.md once you confirm the cleanup job | F-07 | Added (brief §3) |
| 31 | 404 page | Netlify's page | "We couldn't find that page", "Go to AirAware", "Home" | F-08 | Added (brief §3) |
| 32 | Landing section 3 heading | none | "What AirAware helps with" | F-19 | Added (brief §3) |
| 33 | Landing search submit | none | A submit control labelled "Search" (WIREFRAMES.md §4; both mockups) | F-19 | Added (brief §3) |
| 34 | Ask greeting | "{greeting}. I'm AirAware. Ask me about your day, your home or your commute." | Drop it (the purpose line replaces it), or keep it below the text box | F-20 | Added (WIREFRAMES.md §13) |

F-40 (a negated phrase in one rule caveat) is in brief §8 but touches no IA or flow step, so it is not repeated here.

## 9. What does not change

- **Routes and URL contract:** the 8 routes, plain paths with no router library, `?place=&lat=&lon=` at 2 decimals, and a device location never in the URL.
- **Navigation:** the 5 items, their names, icons and order; bottom bar below 768 px, top bar from 768 px; short labels below 1024 px.
- **Data and its labels:** Open-Meteo model forecasts only; "Model forecast · Open-Meteo · updated HH:MM" stays with every verdict, unless F-32 is accepted; the stale banner directly under the provenance; the 24-hour check against India's 24-hour limits; no index is computed or shown, and the only index wording stays the approved disclaimers ("We don't calculate an AQI.", "not the CPCB National AQI").
- **Today's skeleton:** verdict first, then the auto-built recommendation, help choices, Ask box, and "Air quality details" closed by default; Today and My Profile stay mounted across pages.
- **Welcome:** 3 steps, Skip on steps 2 and 3, "Remember on this device" off by default; Today opens Welcome only when there is no place.
- **Privacy behaviour:** location only on "Use my location", rounded to about 1 km; no account until Save or Remember; one confirmed step to delete; Ask questions never stored or put in the URL; the Ask thread lives in memory for the visit.
- **APIs and storage:** every endpoint, request body, limit and table stays as it is (see USER_FLOWS.md §0).
- **Backdrop rules:** decorative and hidden from screen readers; its air look comes only from the air check, and weather only from weather fields.
- **Components:** every component in §7 is reused; none is renamed or replaced.

## 10. Open questions for you (IA)

1. **Bottom-bar padding:** keep `env(safe-area-inset-bottom, 0px)`, or use the brief's `max(0.75rem, …)` and give up 12 px of first screen on phones without a home indicator? (§4.2)
2. **Phone focus order:** Option A (bar before content, smallest change) or Option B (bar last, as the brief words it)? (§4.4)
3. **"Back to AirAware" target:** a plain link to `/app` loses the searched place (the footer's Privacy link is a full page load, `AppShell.tsx:483-488`). A visitor with a remembered place gets it back; one without lands on Welcome. Accept that, or carry the place query to `/privacy` and back? (§4.5)
4. **Explicit submit on the landing search:** `LocationSearch` is shared by Landing, the place chip, Welcome and Ask. A submit button only on Landing needs a prop; on all four it changes every search. What should submit do with no highlighted result: pick the first result, or open the list? (§6.8)
5. **Ask starters:** option 1 (3 of the existing 5, no new copy) or option 2 (topic-first, new starter copy)? (§6.3)
6. **My Home with no place:** what fills the reserved "Today, for your home" space before a place is chosen? It is hidden today. (§6.4)
7. **Hourly reload on Today:** during the automatic hourly reload, the verdict card is replaced by the loading placeholder until the new forecast arrives (`AppShell.tsx:373-397`), while the backdrop keeps the previous look (`AppShell.tsx:143-146`). Keep it, or keep the old verdict (marked as old) on screen until the new one lands? This is not in the brief.

## 11. Evidence used

- **Code:** `client/src/App.tsx`, `lib/navigation.ts`, `pages/AppShell.tsx`, `components/AppNav.tsx`, `components/PlaceChip.tsx`, `components/States.tsx`, `features/location/*`, `features/today/*`, `features/daily-plan/*`, `features/ask/*`, `features/guides/GuideGroups.tsx`, `features/air-quality/AirReadout.tsx`, `ForecastPanel.tsx`, `SourcesPanel.tsx`, `scene.ts`, `pages/*.tsx`, `lib/supabase.ts`, `services/api.ts`, `netlify.toml`, `server/src/services/recommendations/guides.ts`.
- **Stage 0:** [audit/FINDINGS_REGISTER.md](audit/FINDINGS_REGISTER.md), [audit/LIVE_SITE_AUDIT.md](audit/LIVE_SITE_AUDIT.md) §2, §4, §5, [audit/PRODUCTION_VS_LOCAL.md](audit/PRODUCTION_VS_LOCAL.md), and the screenshots named above.
- **Pack:** `AirAware_AI_Redesign_Kit/02_PRODUCT_UX_REQUIREMENTS.md` §3 and §5, `04_SCREEN_BY_SCREEN_SPEC.md` §2–§9.
- **Earlier IA:** `docs/UX_AUDIT.md` §3 (20 Nov proposal, now shipped).
