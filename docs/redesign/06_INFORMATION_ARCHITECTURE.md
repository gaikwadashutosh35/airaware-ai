# 06 · Information architecture

**Date:** 28 Nov 2026.
**Baseline:** the local working tree at commit `b0c4278` (source), and the live site https://airaware-ai.netlify.app as captured on 28 Nov at about 15:37–15:48 IST, for Pune (`audit/screenshots/redesign-2026-11-28/current/`).
**Status:** this is a proposal. Nothing here is built, and no application file was changed.
**Companions:**
- `07_SCREEN_WIREFRAMES.md` (frames for every screen in this doc);
- `04_EXISTING_COMPONENT_INVENTORY.md` (component names and reuse ratings);
- `13_DATA_AND_API_DEPENDENCY_MATRIX.md` (what data exists);
- `02_REFERENCE_COMPARISON.md` (recommendation IDs R1–R9).

## How to read this

| Label | Meaning |
|---|---|
| **OBSERVED** | Seen in code (`path:line`), in a doc, or in a named screenshot. |
| **RECOMMENDED** | Our proposal. Every RECOMMENDED item that adds or changes visible text also says **needs owner OK** (acceptance criterion CP-04). |
| **EXISTING / NEW / CHANGED** | Used in tables and frames. EXISTING means shipped as it is. CHANGED means shipped but moved or restyled. NEW means it does not exist. |

Shipped copy is quoted word for word, including two strings the brief's word list would catch: the caveat "does not mean the air is clean" (`today.ts:32`) and "not the CPCB National AQI" (Landing closing, `PlanView.tsx:14`). This doc does not rewrite them. They are listed for the owner in §10.

---

## 1. Summary

1. **The five destinations stay as they are**: Today, Ask AirAware, My Home, Better Habits, My Profile. The routes, labels, icons and order stay too, and nothing is added to the nav or to the routes (OBSERVED `AppNav.tsx:4-35`, `App.tsx:7-12`).
2. **The journey UNDERSTAND → ASK → GET GUIDANCE → TAKE ACTION → LEARN is mostly built already.** What it lacks is visible links between the steps, and the TAKE ACTION and LEARN steps are thin (`01_CURRENT_STATE_AUDIT.md` §8). Each step gets one home destination (§3) and a small set of cross-links (§7).
3. **The Daily Plan stays inside Today**, in the existing "See your full day" disclosure of `DailyPlanSection`. It gains a deterministic **day timeline**: Morning, Afternoon, Evening and Night bands built from the forecast's own hours in the place's local time. The model values for each band (PM2.5 and PM10) sit behind one closed disclosure, so no pollutant figure enters Today's default view. There are never verdicts per band (§4).
4. **Insights is not a page or a nav item.** The only data available is forward-looking: the 48-hour model series, the weather for 3 days, and the 24-hour fire count. Insights therefore means a forward-looking summary inside Today's plan timeline and inside "Air quality details". Air history stays blocked until the owner decides on a data source (§5).
5. **Technical detail stays behind 3 layers of disclosure** (§6). These three are never folded away: the provenance line, the "Not current" banner and the attribution.
6. **Every destination has one defined state table** (§8), taken from the states the code already renders.

**Cross-doc status (added by the critic pass, 28 Nov; read this with doc 14, which sets the build order):**
- **Numbers on Today.** This doc keeps pollutant figures out of Today's default view (§6, O-9). Doc 05 recommends Direction A's verdict ledger, which shows the PM2.5 and PM10 24-hour averages in the default view. Doc 14 makes this owner decision **D3** (keep DI-04, or amend it for the ledger). §6 and O-9 below hold only if D3 keeps DI-04.
- **"Your day".** The N1 clock-band timeline (§4.3) is this doc's longer-term design. Doc 14 ships a simpler "Your day" strip of the existing AI periods first (R4, from 05 G1) and holds N1 as "Later" (14 §4).
- **The 60svh box.** O-3 below said "keep for now". Docs 05 G1, 11 P1 and 14 R4 recommend removing it with the strip. That reverses the owner's 27 Nov ruling, so it is owner decision **D13** (doc 14).
- **"I'll try this".** This doc keeps it off guide cards (§4.6). 11 B2 proposes it on Better Habits cards. Owner picks one; storage stays O-5.
- **"How AirAware answers" (R7).** This doc puts it on `/privacy`. 12 §4 puts it in a closed fold on the Ask welcome card, and 11 L3 on Landing. Owner picks one location (14 D12).

---

## 2. Destinations (unchanged structure)

All OBSERVED unless marked.

| # | Destination | Route | Nav label (phone / ≥1024 px) | Job | Journey step it owns | Works without a place? |
|---|---|---|---|---|---|---|
| 1 | Today | `/app` | Today / Today | Answers "How is my air?" and "What could I do today?" | **UNDERSTAND**, then **GET GUIDANCE** (Daily Plan) | No. Opens `/app/welcome` (`AppShell.tsx:151-155`). |
| 2 | Ask AirAware | `/app/ask` | Ask / Ask AirAware | Answers a practical question from the rules and today's forecast. Claude Haiku answers typed questions (J26). | **ASK** | Yes. It shows its own place search (`Ask.tsx`). |
| 3 | My Home | `/app/home` | Home / My Home | Today's indoor cards plus indoor guides | **GET GUIDANCE** (indoor), **LEARN** | Yes, with guides only. |
| 4 | Better Habits | `/app/habits` | Habits / Better Habits | Qualitative habits that cut smoke and exhaust | **LEARN**, **TAKE ACTION** (habit level) | Yes |
| 5 | My Profile | `/app/profile` | Profile / My Profile | Household answers, saved plans, your data | **TAKE ACTION** (save), personalising | Yes |

These stay outside the nav (OBSERVED): `/` Landing, `/privacy`, and `/app/welcome` (the 3-step first run).

**Not proposed:** a sixth nav item, a `/app/plan` or `/app/insights` route, or a router library. This agrees with master guide §9 (lines 430-432), `01` §9 and `08` (no new dependency).

---

## 3. The journey mapped to screens

| Step | Home screen | EXISTING pieces (OBSERVED) | Gap (OBSERVED) | RECOMMENDED (smallest change) |
|---|---|---|---|---|
| **UNDERSTAND** | Today | `TodayLead`: the verdict, tag, "Model forecast · Open-Meteo · retrieved HH:MM" and the caveat.<br>`WeatherCompare`, `FireHotspots`, the `CitySkyline` backdrop.<br>`AirDetails`, closed, holding `AirReadout`, `ForecastPanel`, the method and `SourcesPanel`. | The hourly shape is only in the closed details. There is no plain-language "what this means" outside the details. There is no history. | **N1** the day timeline in the plan (§4). **N2** a "How the 24-hour check works" link under the verdict that opens Air quality details at that section; the link text needs owner OK. The verdict copy stays as it is. |
| **ASK** | Ask AirAware | The `Ask` page: the "Using" line, 4 starters plus "More topics", the "Conversation" region, a pinned composer, `AskEntry` answers with "Why?", copy and "Sources and limitations".<br>Today's `AskBox`, plus the `HelpChoices` that open Ask. | Learning content and "Why?" panels do not link to Ask. The "Using" line is plain text. | **R3** show the "Using" line as chips (layout only). **R4** an "Ask about this" link pre-fills the Ask box from a "Why?" panel or a guide card, and does not send. |
| **GET GUIDANCE** | Today, then "Your recommendation for today" and "See your full day" | `DailyPlanSection`, `PlanView`, `PlanCard` with "Why?". My Home's "Today, for your home". | "Your day" periods appear only in AI plans (`plan.ts:28-32`). A rules plan has no time structure. | **N1** the day timeline: forecast-hour bands for every plan, with cards placed in a band only when the plan gives them a period (§4). |
| **TAKE ACTION** | Today (Save plan), then My Profile (Saved plans) | "Save plan" creates an anonymous account and keeps snapshots (`DailyPlanSection.tsx:327-342`, `SavedPlansList`). | No done-tracking, reminders or action history. There is no schema for any of them (`01` §8). | **R6** an "I'll try this" tick on plan cards, **held in memory for this visit only** (§4.6). Anything stored needs an owner decision. Not proposed: reminders or notifications. |
| **LEARN** | My Home, Better Habits | `GuideGroups` of sourced `GuideCard`s: 7 on My Home, 6 on Better Habits, all qualitative. The Privacy page states what Claude receives. | No path between guides. No short "how AirAware answers" explainer. | **N3** one "Next:" link at the end of Today, My Home and Better Habits (§7). This extends `02`'s R1, a next-step line under the purpose lines of My Home and Better Habits. Either placement works; the owner picks one. **R7** a "How AirAware answers" section on `/privacy` (an existing route), linked from Ask. **R4** "Ask about this" on guide cards. |

The journey runs in order on Today: verdict → recommendation → full day → help choices → Ask box → details. That is already the shipped DOM order (OBSERVED, `AppShell.tsx:406-567`; `today-390.jpg`). It is kept as it is.

---

## 4. Daily Plan: where it lives and how it is structured

### 4.1 Placement

| Question | Answer |
|---|---|
| Where | Inside Today's "Your recommendation for today" card, in the existing "See your full day" `<details>` (OBSERVED, `DailyPlanSection.tsx:317-344`). |
| Default state | Open, in its own scroll box at most 60svh tall (OBSERVED, owner ruling 27 Nov, `DESIGN.md:88`). This doc keeps that. Whether to drop the inner scroll box is owner question **O-3** (§10). The capture shows the box cutting the plan off at "Sustainable swaps" (`today-390.jpg`, `today-1440.jpg`). |
| Also shown on | My Home shows only the indoor cards, through `PlanReport` (OBSERVED, `planDisplay.ts:18-23`). Saved plans in My Profile use `PlanView snapshot`. The timeline is **not** shown in snapshots, because a saved plan does not keep the forecast hours (`DailyPlan.forecast` has no `hours`, `contracts.ts:232-240`). |
| Not proposed | A Daily Plan page, nav item or route. |

### 4.2 What the code has today (OBSERVED)

- `PlanPeriod` is `'morning' | 'commute' | 'daytime' | 'evening' | 'home'` (`contracts.ts:223`). It has no Afternoon and no Night.
- Periods are set **only by the AI writer** (`plan.ts:28-32`, `prompts.ts:42`). A rules plan sets every `period` to `null`. The live capture showed a rules plan: "Made by our rules. AI personalisation is unavailable right now." (`today-390.jpg`).
- `PlanView` shows "Your day" (AI periods) and then the topics "Outdoors and travel", "Indoor air" and "Sustainable swaps" (`planDisplay.ts:42-54`, `PlanView.tsx:116-155`).
- Forecast hours are UTC ISO strings, 48 hours forward from now. There are no past hours (`openMeteo.ts:69,96`).
- The place's UTC offset exists only on `weather.utcOffsetSeconds` (`contracts.ts:179`), and `weather` can be `null`. `formatTime` uses the browser's time zone with the zone name shown (`forecast.ts:26-36`).
- India's limits are 24-hour averages. That is why the chart draws no limit line (`ForecastChart.tsx:11-12`). The hourly values are never compared with a limit.

### 4.3 RECOMMENDED: the day timeline (N1)

A deterministic, client-only section at the top of the full day, above the topics. It needs **no API change**.

| Rule | Detail |
|---|---|
| Window | The same 24 hours the 24-hour check averages. `assessAir` takes the 24 hourly rows starting at the UTC hour that contains "now" and sets `windowStart` to the first of them (OBSERVED, `airCheck.ts:23-34,57-67`). Heading: "The hours behind today's 24-hour check". **Needs owner OK.** |
| Which window | The timeline uses the window of the forecast on screen (`ForecastData.airCheck.windowStart`). The plan is built from the server's own fetch, so the timeline is **hidden when `plan.air.windowStart` differs** from it. That way, cards are never placed against hours the plan did not use. |
| Data path | `DailyPlan` carries no `hours` (`contracts.ts:232-240`), and `DailyPlanSection` gets no series today. N1 therefore needs one new optional prop on `DailyPlanSection` (the `ForecastData` that `AppShell` already holds), with the timeline rendered there above `PlanView`. There is no API change. |
| Bands (place-local clock) | Morning 06:00–11:59, Afternoon 12:00–16:59, Evening 17:00–20:59, Night 21:00–05:59. An hour belongs to the band its **local start time** falls in. The cut-offs are a new convention and **need owner OK**. |
| Half-hour offset | Forecast hours are on UTC hours. In India (UTC+5:30), each hourly value therefore starts at HH:30 local time (`openMeteo.ts:96`). Band rows show the real hour starts ("from 15:30"), never rounded times. |
| Which bands show | Only bands that have hours inside the window, in time order. A band already under way says "from HH:MM", which is the window's first local hour. A band that has passed is never shown or filled in. With a retrieval at 15:38 IST, for example, the window starts at 15:30, and the order is Afternoon (from 15:30), Evening, Night, then Morning tomorrow and Afternoon tomorrow up to the window's end (15:30 tomorrow is excluded). Bands from the next day carry the weekday. |
| One clock | Every time in the timeline is in the place's clock, using `weather.utcOffsetSeconds`, and is labelled "(place time)" once. `chart.ts summarize` formats in the browser's zone (`forecast.ts:26-36`), so the timeline reuses summarize's **wording** with its own offset formatter. **If `weather` is null, the timeline is not shown.** Banding by the browser's clock would be wrong for anyone not on the place's time. The topics still show. |
| Default view (no tap) | The band label, its clock range, and any cards placed in it (below). **No numbers.** If no band holds a card (every rules plan), the band rows are not drawn and only the closed disclosure shows. |
| Behind one closed disclosure "Model values for these hours" | **Needs owner OK.** It holds:<br>• a summary line using summarize wording for **both** PM2.5 and PM10: "PM2.5 model forecast: {min}–{max} µg/m³, highest around {Day HH:MM}." (and the same for PM10). Both are shown because the 24-hour check covers both, and a PM10-driven verdict must stay explainable;<br>• "Model forecast · Open-Meteo · retrieved HH:MM";<br>• per band, the PM2.5 and PM10 ranges plus "{n} hours without a value", never interpolated.<br>There is no tag, no colour scale and no comparison with a limit. |
| Cards in bands | Only AI plans, mapped from their period: `morning`→Morning, `daytime`→Afternoon, `evening`→Evening. `commute` and `home` do not stand for one clock band, so they go in an **"Any time today"** row with their existing period chip ("Commute", "At home"). Night never gets a card, because no rule is about the night. **A rules plan puts no card in a band.** Every card stays in its topic group, exactly as today. |
| Never | Words such as "best", "cleanest", "lowest-risk" or "go out at", or any implied event time. No verdict per band. No pollutants other than PM2.5 and PM10 (the other four stay in Air quality details). No weather-as-cause text. |
| Hidden when | The forecast is stale; the forecast errored; the check level is `unknown` (incomplete check); `weather` is null; the plan's window differs; the plan is a saved snapshot. |
| Reuse | `chart.ts` (`valueRuns`, and `summarize` for the wording), `forecast.ts` (`POLLUTANTS`), `PlanCard`, and the `Part` heading pattern in `PlanView.tsx:18-44`. One new presentational component, `DayTimeline`, plus a small formatter for place time. |
| Data owner | All numbers are model values passed through from `ForecastSeries.hours`. Nothing is computed beyond min, max and a count, the same as the shipped chart summary. |

**A future change, not proposed now:** a server rule that times advice (for example, linking `commute.lower-traffic` to the lower hours) would need a new deterministic function in `recommendations/` with tests and sources, and an owner decision (`13` line 119). The AI must not invent times. Its existing period output is the only timing it gives.

### 4.4 Option set for the period names (owner question O-1)

| Option | What changes | Cost |
|---|---|---|
| **A (recommended)** | Clock bands come from forecast hours (as above). AI periods are mapped to them, and commute and home go under "Any time today". | Client only. |
| B | Change `PlanPeriod` to morning, afternoon, evening and night. | A change to the contract, the AI schema (`planOutput.ts:45`) and the prompt (`prompts.ts:42`), plus their tests. That is an API change and is out of scope for this phase. |
| C | Keep "Your day" exactly as it is, with no bands. | None, but GET GUIDANCE stays unstructured for rules plans. |

### 4.5 Order inside the full day (RECOMMENDED)

1. "Plan for {place}" plus the made-by line (EXISTING).
2. **Day timeline** (NEW, §4.3).
3. "Any time today": AI `commute` and `home` items (CHANGED from "Your day").
4. Topic groups "Outdoors and travel", "Indoor air" and "Sustainable swaps" (EXISTING; items in a band repeat here in compact form, as `groupPlan` already does).
5. The safety note (EXISTING), then "Save plan" and its note (EXISTING).

### 4.6 "I'll try this" (R6, NEW, needs owner OK)

- An outlined toggle button with `aria-pressed`, shown on today's plan cards only: the top card and the full day on Today, and the cards in "Today, for your home" on My Home. Both pages share one in-memory set keyed by rule id. The label "I'll try this" **needs owner OK**.
- **Not shown on:** guide cards (Better Habits and the My Home library), Ask answer cards, Landing examples, or saved snapshots. `PlanCard` is shared by all of these (`04` §6), so the tick is an opt-in prop.
- **Storage: memory only**, for this visit. "Remember on this device" is off by default (`Welcome.tsx`), and no account exists until a save button is pressed (A9, Privacy). Saving ticks with a plan would need a new column in `daily_plans`. That is a schema change and an owner decision.
- No counts, streaks or impact figures.

---

## 5. Insights: only where data supports it

| Possible insight | Data exists? (OBSERVED) | Where it lives | Status |
|---|---|---|---|
| Shape of the next 24 hours of PM2.5 (range and "highest around") | Yes. 48 hourly model values in `ForecastSeries.hours`. | The plan day timeline (§4.3), plus the existing chart text summary in Air quality details (`ForecastChart.tsx:211-212`) | RECOMMENDED (N1) |
| Next 48 hours, all pollutants | Yes | Air quality details → `ForecastPanel`, hourly table (EXISTING) | EXISTING |
| Weather yesterday, today and tomorrow | Yes (`past_days=1`) | `WeatherCompare` (EXISTING, J20) | EXISTING. Weather only. **Never** used to explain pollution. |
| Fire hotspots in the last 24 hours within 50 km | Yes (count, nearest km, latest time) | `FireHotspots` (EXISTING) | EXISTING. No map: there are no coordinates in the API (`13` line 122). |
| Air history, "this week", trends, comparison with yesterday's air | **No.** No past air hours are requested or stored (`openMeteo.ts:69`). | — | **Blocked.** It needs a data decision first (`13` line 120). Whether Open-Meteo offers past air-quality model data is **unverified**. If it is added later, label it "past model data", never as observations, and never fill gaps. |
| City rankings, exposure scores, CPCB comparisons | No (CPCB not connected; `/air-quality/current` returns 503) | — | Not proposed |

**The word "Insights" is not used in the UI.** The forward-looking pieces sit under their own plain headings. A dedicated Insights area becomes worth discussing only once history data exists. This agrees with master guide §9.7 and `01` §9.

---

## 6. Progressive disclosure of technical detail

| Layer | How it is reached | What it holds (OBSERVED unless NEW) |
|---|---|---|
| **0: default view** | No tap | Greeting and H1 with the place; verdict title; tag ("Within the limit" / "Above the limit" / "No data"); **the provenance line "Model forecast · Open-Meteo · retrieved HH:MM"**; **the "Not current" banner when stale**; the caveat; the top recommendation card; the made-by line and safety note; the footer "Background: …" note and **attribution**. **None of these are ever moved behind a tap.** |
| **1: one tap** | "Why?" on any card; "More topics" on Ask; NEW "How the 24-hour check works" link (N2); NEW "Model values for these hours" (inside the full day) | Reason, "Based on", inputs used, sources, caveat. All 6 topics. The timeline's PM2.5 and PM10 ranges with their provenance line. ("See your full day" starts open, so its band labels and cards count as default view, but they carry no numbers.) |
| **2: Air quality details** | The closed `<details>` at the end of Today (`AirDetails.tsx`) | Forecast location to 2 decimals; PM2.5 for this hour with its unit; 24-hour averages against limits (`AirReadout`); provider and model resolution; "Model run time not reported by the provider"; chart and pollutant table; hourly table (a nested disclosure); "Official CPCB observations are not connected yet."; "How the 24-hour check works" ending "We don't calculate an AQI."; `SourcesPanel`. |
| **3: reference** | "Sources and limitations" (closed, J11); `/privacy`; NEW "How AirAware answers" section on `/privacy` (R7) | Limitations, licences, what Claude receives (J26 D7), and NEW: rules decide, Claude explains, what is never sent, what it will not do. |

Rules (RECOMMENDED, from the data rules):
- A number never appears without its unit, its source kind ("Model forecast") and the retrieval time in the same view.
- No pollutant figure or unit enters Today's default view. This keeps the shipped pattern ("No pollutant figure, unit or CPCB name is in the default view", IA 24 Nov §6.1; numbers live in Air quality details, `AirDetails.tsx:10`). The timeline's values are therefore behind their own closed disclosure, with their own provenance line.
- No layer turns a model value into a CPCB category or an index.

---

## 7. Cross-links

What travels with each link (OBSERVED, from the IA of 24 Nov §3): `navigate()` keeps the `place`, `lat` and `lon` query. Ask text and topics are **never** put in the URL; they stay in memory (`useAsk` is owned by `AppShell`).

| From | To | Trigger | Status | What travels |
|---|---|---|---|---|
| Landing | Today (or Welcome) | "Check My Air", hero search | EXISTING | Place query after search |
| Landing | Ask | "Meet Your Assistant" | EXISTING | — |
| Today, help choices "Outdoor activities" / "My family" | Ask | Tile | EXISTING (sends the topic at once, `HelpChoices.tsx`) | Topic, in memory |
| Today, help choices "My home" / "Better habits" | My Home / Better Habits | Tile | EXISTING | Query |
| Today, `AskBox` | Ask | Send | EXISTING | Question, in memory |
| Today, invite | Welcome steps 2–3 | "Make it personal: 2 quick questions" | EXISTING | — |
| Today, verdict | Air quality details, "How the 24-hour check works" | NEW text link (N2) | RECOMMENDED, needs owner OK | Opens the `<details>` and moves focus to that heading |
| Any "Why?" panel, any guide card | Ask | NEW "Ask about this" (R4) | RECOMMENDED, needs owner OK | Pre-fills the composer, in memory, with an **approved** starter or the card title as a question; **does not send** |
| Ask, "Using … · Edit" | My Profile | Edit | EXISTING (`Ask.tsx:156`) | — |
| Ask | `/privacy#how-airaware-answers` | NEW link under the intro (R7) | RECOMMENDED, needs owner OK | — |
| My Home, "Today, for your home" | Today, full day | NEW "See your full day on Today" | RECOMMENDED, needs owner OK | Query |
| End of Today, My Home, Better Habits | The next step | NEW "Next:" link (N3, extends `02` R1), outlined | RECOMMENDED, needs owner OK | Query |
| My Profile, saved plan list (empty) | Today | Existing text "Use Save plan under See your full day on Today." | EXISTING (text only); RECOMMENDED: make "Today" a link | Query |

The N3 "Next:" chain (needs owner OK): Today → Ask ("Ask about your day"); My Home → Better Habits ("Habits that cut smoke"); Better Habits → My Profile ("Make it personal"). Each page has one outlined link, so it keeps its one teal action.
- **Ask has no "Next:" link.** Its composer is pinned and there is no footer card when a place is chosen (J16, J17). The area under the box stays clear (J5).
- **My Profile has no "Next:" link.** It is the end of the chain.

"Ask about this" (R4) is shown on "Why?" panels of today's plan cards (Today, My Home) and on guide cards (My Home library, Better Habits). It is **not** shown on Ask answer cards (you are already in Ask), on Landing examples, or in saved snapshots. It is an opt-in prop on the shared `PlanCard`.

---

## 8. States: empty, loading, error, stale, partial

All OBSERVED in code, with the strings as shipped. RECOMMENDED changes are marked.

### 8.1 Today

| State | Verdict area | Plan area (`DailyPlanSection`) | Weather, fires | Timeline (NEW) |
|---|---|---|---|---|
| No place | H1 "Today", `Loading` "Loading your place", then Welcome opens | "Choose a place first." | Not rendered | — |
| Loading | `TodayLeadLoading` "Loading forecast…" | `Loading` "Finding your recommendation…", sized like the ready plan | Weather hidden. Fires: "Checking for fire hotspots…" | Hidden |
| Ready, within or above | Verdict, tag, provenance, caveat (within only) | Top card, made-by line, full day | Table; fire count with caveat | Shown |
| **Stale** (> 60 min, `isOlderThan`) | Verdict plus the solid "Not current" banner with Reload | `PLAN_STALE` "The forecast behind this plan is more than an hour old." | **Weather hidden** (`AppShell.tsx:500`). Fires has its own "Not current". | **Hidden** (RECOMMENDED: it must not show hours from an old window) |
| Forecast error | `ErrorState` "We couldn't load the forecast" plus reason plus "Try again" | Builds anyway. If it has no forecast, `NO_AIR` "Air information is unavailable for this plan." | Weather hidden | Hidden |
| Incomplete 24-hour check | "Air information unavailable", tag "No data" | Rules cards, `planAirLine` returns `NO_AIR` | As normal | Hidden (level `unknown`; `windowStart` may still be set when only values are missing, `airCheck.ts:44-48,66`) |
| Weather null | Weather line "Weather unavailable" (`forecast.ts:70-71`) | As normal | Table hidden | **Hidden** (no place offset, §4.3) |
| Plan error | Verdict as normal | "We couldn't build your recommendation." plus "Try again", plus "Your forecast on this page is still up to date." when current | As normal | Hidden |
| AI unavailable | As normal | "Made by our rules. AI personalisation is unavailable right now." (`planDisplay.ts:102`) | As normal | Shown; no cards placed in bands |
| No card | As normal | `NO_CARD` "No suggestions for your answers today." | As normal | Shown |
| Fires unavailable | — | — | "Fire hotspot data is unavailable right now." plus Try again. **Never zero.** Hidden when not configured. | — |

### 8.2 Other destinations

| Destination | Empty / no place | Loading | Error | Stale / partial |
|---|---|---|---|---|
| Ask | No place: its own search and "Use my location", with the footer card kept (J16) | `aria-busy` thinking entry; Send disabled while busy | "We couldn't answer that" plus "Try again"; a Claude failure falls back to the rules answer (J26 D4); forecast failed: the Using line says "forecast unavailable right now" (J25) | "Not current" always shows on an answer (J23); a medical question calls no AI |
| My Home | No place: guides only | "Today, for your home" builds through `PlanReport` `building`; guides `Loading` | Plan `error` with retry; guides `ErrorState` | `stale` shows `PLAN_STALE` and never a stale plan as today's |
| Better Habits | — | "Loading guides" | "We couldn't load the guides" / "Something went wrong loading the guides." | — |
| My Profile | All 10 answers "Not answered"; "No saved plans yet. Use Save plan under See your full day on Today." | Answers load once | "Your saved plans couldn't be loaded right now."; "Nothing was deleted. Try again in a moment." | Saving not set up: the `NOT_SET_UP` note; an opened plan is a "snapshot, not current air information" |
| Landing | — | Static | — | The phone image is captioned "A past screenshot of Today for Pune, 22 Nov 2026" (`landing-390-reduced-motion.jpg`) |

**Known OBSERVED oddity, not resolved here:** in the live capture, Today showed a rules plan, while My Home, loaded 4 minutes later in a fresh context, said "Made with AI" (`today-390.jpg` vs `home-390.jpg`). This is consistent with separate builds per visit (`DailyPlanSection` builds per context). The cause was not verified.

---

## 9. Reconciliation with earlier docs

`INFORMATION_ARCHITECTURE.md` and `WIREFRAMES.md` (24 Nov, commit `257352e`) are not edited. Where they and this doc disagree, later owner decisions decide.

| Earlier statement | Now | Source |
|---|---|---|
| Solid panels, no glass (WIREFRAMES §2) | See-through `card-surface` with blur | J22 |
| "updated HH:MM" | "retrieved HH:MM" (shipped) | `TodayLead.tsx:51`, `today-390.jpg` |
| Ask text box moves to the top (IA §6.3, F-20) | Composer pinned at the bottom; pinned from the start on phones | J17 |
| 3 starters plus "More questions" | 4 starters plus "More topics" and "How can I help you today?" | J25 |
| Ask greeting panel / AI never sees the question | Claude Haiku answers typed questions; intro "Claude (Anthropic) reads your question and answers from AirAware's rules and today's forecast." (`ask.ts:56-57`) | J26. **The live capture still shows the pre-J26 line** "Answers come from AirAware's rules and today's forecast" (`ask-390.jpg`), so J26 was not seen rendered. |
| "Why this recommendation?" label | "Why?" | E1, shipped |
| Full day collapsed (UX_AUDIT §3.4) | Open, inside a 60svh box | Owner 27 Nov, `DESIGN.md:88` |
| Weather table and fire card | Shipped (J20; FIRMS has no decision ID) | `AppShell.tsx:494-506` |
| Master guide `DailyRoutineTimeline` (morning/afternoon/evening) | Mapped to N1 with 4 bands, forecast-backed only | Master guide §9.4 |
| Master guide `InsightPanel` | Not built as a panel; forward-looking only (§5) | Master guide §9.7 |
| No pollutant figure in Today's default view (IA 24 Nov §6.1) | Kept: the timeline's values sit behind a closed disclosure (§4.3). Whether to show them by default is O-9. | §6 |
| IA 24 Nov still stands | Routes, the URL contract, that doc's routing items IA-R1/IA-R2 (404, unknown `/app/*`; not the same as `02`'s R-IDs), focus-order options A/B, the place-chip proposals | IA §2–4 |

---

## 10. Decisions this doc needs from the owner

| ID | Question | Recommendation |
|---|---|---|
| O-1 | Period model for the Daily Plan (§4.4) | Option A, client-only bands |
| O-2 | Band cut-offs: 06–12, 12–17, 17–21, 21–06 local | Accept, or give other times |
| O-3 | Keep the full day's 60svh inner scroll box (27 Nov) or let the full day flow in the page | Originally: keep it for now and re-test with the timeline, because a nested scroll on a 640 px phone hides the bands. **Aligned in the critic pass:** that same concern favours removal, which docs 05 G1, 11 P1 and 14 R4 recommend. It reverses the 27 Nov ruling, so the owner decides (14 D13). |
| O-4 | New strings: timeline heading and summary, "Any time today", "I'll try this", "Ask about this", "How the 24-hour check works" link, "Next:" links, "How AirAware answers" | Approve each (CP-04) |
| O-5 | "I'll try this" storage | Memory only |
| O-6 | Insights / history data source | Defer. No Insights UI. |
| O-7 | Shipped strings that the brief's word list catches: "does not mean the air is clean" (`today.ts:32`), and "not the CPCB National AQI" (A7; allowed by `e2e/copy.spec.ts`) | Owner to rule. The brief allows AQI only in "We don't calculate an AQI". |
| O-9 | Show the timeline's PM2.5/PM10 ranges in the default view instead of behind "Model values for these hours" | No. Keep numbers out of the default view, as shipped. Must be read together with doc 14 D3: if the owner allows Direction A's ledger, the timeline's ranges can follow the same rule. |
| O-10 | Place the "Next:" link (N3) at the page end, or as `02` R1's line under the purpose text | Page end, so the link follows the content it leads on from |
| O-8 | The shipped starter "Is it a good idea to open my windows?" uses "good idea", which the AI prompt bans in **output** (`AI_PROMPTS.md` §3b). It is the user's voice, so it is probably fine. | Confirm |

---

## 11. Evidence used and not verified

**Read:**
- `04`, `01` §8, `13` lines 46 and 117-131, `02` R1–R9;
- `OWNER_DECISIONS.md` J10–J26;
- `DESIGN.md:86-92,134`;
- IA of 24 Nov §1–§6.4 and WIREFRAMES of 24 Nov §1–4 and §8;
- master guide lines 395-516;
- `contracts.ts:40-270`, `planDisplay.ts`, `PlanView.tsx`, `DailyPlanSection.tsx:225-349`, `AppShell.tsx:400-570`, `forecast.ts:1-60`, `ask.ts:50-62`.

**Screenshots opened:**
- `today-390.jpg`, `today-1440.jpg`, `ask-390.jpg`, `home-390.jpg`, `landing-390-reduced-motion.jpg`.
- Other pages are cited from the live-capture digest.

**Not verified:**
- whether Open-Meteo offers past air data;
- why Today and Home differed (rules vs AI);
- J26 rendered live;
- the states in §8 rendered live (they come from code);
- Profile, Habits and the 1440 Home and Ask captures, which were not opened by me;
- `Welcome.tsx`, `Privacy.tsx`, `rules.ts` bodies, which were not read in full.
