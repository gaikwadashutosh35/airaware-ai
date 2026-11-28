# AirAware AI: user flows (Stage 1 proposal)

**Date:** 24 Nov 2026.
**Baseline:** production https://airaware-ai.netlify.app, commit `257352e`.
**Status:** proposal. Nothing here is built.
**Companion:** [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) (pages, navigation, content inventory) and the Stage 0 [findings register](audit/FINDINGS_REGISTER.md).

## How to read the flow tables

Each flow is a table of steps. Columns:

- **User does:** the action.
- **Screen and state:** what is on screen after it, with shipped text in quotes.
- **Saved or sent:** what is written, and where (see §0), or what leaves the browser.
- **Evidence:**
  - `prod:` a production capture in [audit/screenshots/](audit/screenshots/);
  - `local:` a local capture with the repo's e2e fixtures (same client code; states that can't be forced in production);
  - `code:` read in the source, not seen on screen.
- **Change:**
  - "none";
  - "Proposal (F-xx)": a layout or behaviour change from the Stage 1 brief;
  - "Proposal, needs your OK (F-xx)": any copy change, new copy included, or an owner question.

Times are written "HH:MM". No step uses a real clock time or weather value.

**Not exercised in Stage 0.** Stage 0 never created an account, so these steps are code-trace only: saving, the remembered-place return, the saved-plans list, an opened snapshot, both delete confirmations, and "Forget this place". Ask's medical, out-of-scope and no-forecast answers were not exercised either (`LIVE_SITE_AUDIT.md` §10).

## 0. Where things are kept

### 0.1 Storage map

| Store | What it holds | Written when | Cleared when | Code |
|---|---|---|---|---|
| **URL query** | `place`, `lat`, `lon` (2 decimals) for a searched or remembered place | A search result is picked; a remembered place is restored | "Use my location" clears it; a new search replaces it | `place.ts:22-28`; `AppShell.tsx:189-211` |
| **Page memory** (React state) | The place (including a device location); household answers on screen; the built plan; the Ask thread (at most 10 exchanges); questions back skipped; "Not now" on the invite; an opened saved plan | As the visitor uses the app | Full page load or closing the tab. A new place clears the plan and the Ask thread. "Delete everything" clears answers, plan and thread. | `AppShell.tsx:63-112`; `useAsk.ts:44,53-76` |
| **Browser `localStorage`** | The Supabase sign-in session, and nothing else | The first "Save my answers", "Save plan", or Welcome finish with Remember ticked | "Delete everything" signs out locally. Clearing browser data loses access, but the data stays on the server. | `supabase.ts:6-13,26-40`; `Privacy.tsx:43-44,90` |
| **Supabase** (AirAware's database host, Mumbai region) | An anonymous account (no email, name or password); saved answers; a remembered place (label plus 2-decimal coordinates); saved plans with their place name | Save my answers; Save plan; Remember; a new searched place while one is remembered | "Forget this place"; "Delete plan"; "Delete everything" | `Privacy.tsx:72-83`; `AppShell.tsx:40-47,213-229` |
| **Nowhere** | A typed Ask question. It goes only in the POST body, and the server uses it to pick a topic. | — | — | `server/src/routes/assistant.ts:9-10,26`; `Privacy.tsx:64-71` |

There is no other browser storage in the client (a search of `client/src` finds `localStorage` only in `lib/supabase.ts` comments and tests).

### 0.2 What each request sends

| Request | When | Sends | Session | Code |
|---|---|---|---|---|
| `GET /api/v1/air-quality/sources` | Any app page loads | nothing | no | `AppShell.tsx:120`; `api.ts:129-130` |
| `GET /api/v1/air-quality/forecast` | A place is set; hourly on Today, My Home and Ask; "Try again" | latitude and longitude, 2 decimals | no | `AppShell.tsx:121-149`; `api.ts:96-108` |
| `GET /api/v1/locations/search` | 2 or more letters typed, 300 ms after the last key | the typed text | no | `LocationSearch.tsx:7-8,31-71`; `api.ts:111-116` |
| `POST /api/v1/recommendations/daily-plan` | Today or My Home with a place, after saved answers are checked; answers changed; plan over an hour old; "Try again" | place label and 2-decimal coordinates; the answers on screen | no | `DailyPlanSection.tsx:115-149,183-190`; `AppShell.tsx:409-411` |
| `GET /api/v1/recommendations/guides` | My Home, Better Habits | `topic=home` or `topic=habits` | no | `api.ts:122-126` |
| `POST /api/v1/assistant/answer` | Ask: a topic chip, a starter, a typed question, an answer to a question back that changes the cards, "Try again" | a topic or the question text; place label and 2-decimal coordinates; the answers on screen | no | `useAsk.ts:119-161`; `api.ts:182-186` |
| `GET /api/v1/profile/preferences` | App load, only if a session already exists | token | yes; never creates one | `HouseholdPreferencesForm.tsx:105-134` |
| `PUT /api/v1/profile/preferences` | "Save my answers"; Welcome finish with Remember; a remembered place following a new search; "Forget this place" | token; answers and/or place | Save and Remember create one | `api.ts:143-148`; `AppShell.tsx:213-244` |
| `GET /api/v1/plans` | App load on any app page, because My Profile is always mounted; only with a session; again after a save or delete | token | yes | `SavedPlansList.tsx:60-84`; `AppShell.tsx:297-315` |
| `POST /api/v1/plans` | "Save plan" | token; the plan's request body, unchanged | creates one | `DailyPlanSection.tsx:151-173` |
| `GET /api/v1/plans/:id` | "Open" | token | yes | `SavedPlansList.tsx:91-102` |
| `DELETE /api/v1/plans/:id` | "Delete plan", confirmed | token | yes | `SavedPlansList.tsx:104-130` |
| `DELETE /api/v1/account` | "Delete everything", confirmed, only if a session exists | token | yes | `HouseholdPreferencesForm.tsx:160-176` |
| Supabase anonymous sign-in | The first save action of any kind | — | creates it | `supabase.ts:26-35` |

**Limits:** 60 requests a minute overall. Plans, Ask and plan saves share 10 a minute (`LIVE_SITE_AUDIT.md` §2).

**Saving switched off.** If the site has no Supabase publishable key, saving is off. Save buttons and Remember are disabled, with "Saving isn't set up on this site." (`supabase.ts:8-13`; `HouseholdPreferencesForm.tsx:30,97,178`; `Welcome.tsx:295,302-304`; `DailyPlanSection.tsx:288,296`).

### 0.3 What "an anonymous account" means

The first save action calls Supabase's anonymous sign-in (`supabase.ts:26-35`). That gives:

- an account with no email, name or password (`Privacy.tsx:76`);
- a sign-in session kept in this browser's `localStorage`, which is the only way back to the data (`supabase.ts:6-7`);
- saved rows in Supabase's South Asia (Mumbai) region, which the project owner and Supabase can access (`Privacy.tsx:75,81`);
- Supabase's sign-in service also stores the IP address and browser type with the session (`Privacy.tsx:80`).

Clearing browser data loses access but doesn't delete the data. Whether unused accounts are cleaned up is unresolved (F-07). The save notes in the app today say "Saved on this browser…" instead (F-01, flow 9).

## 1. First visit from the landing page

Start: `/`, a visitor with no session (`prod-landing-default-390x844-first.jpg`).

### 1a. "Check My Air"

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Opens `/` | Hero: "The air around you matters.", "Check My Air", "Meet Your Assistant", "Or search a city" with the search, and a dated past screenshot of Today | nothing | prod: `prod-landing-default-390x844-first.jpg`; code: `Landing.tsx:138-178` | Proposal (F-19): 7 sections; at 1024 px and up the hero is top-aligned, so the search is in the first screen |
| 2 | Taps "Check My Air" | Full page load of `/app` (a plain link). H1 "Today" and a placeholder while saved answers are checked | `GET` sources | code: `Landing.tsx:40-49`; `AppShell.tsx:114-119,365` | none |
| 3 | (no session found) | The address is replaced with `/app/welcome`: Welcome step 1. Continues as **flow 2**, step 2. | nothing | prod: `prod-app-noplace-default-390x844-first.jpg`; code: `AppShell.tsx:114-119` | See flow 2 |

### 1b. "Meet Your Assistant"

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Taps "Meet Your Assistant" | Full page load of `/app/ask`. No place: H1 "Ask AirAware", then a panel with the search and "Use my location". No Welcome redirect (that happens only on Today). Header chip "Choose a place". | `GET` sources | code: `Landing.tsx:51-61`; `Ask.tsx:105-109`; `AppShell.tsx:115-119` | none |
| 2 | Picks a place (as in flow 6) | Ask with a place: "Using: the {place} model forecast, updated HH:MM · 0 of 10 answers · Edit", the greeting panel with 6 topic chips and 5 starters, and the text box at the bottom. The forecast loads for the hidden Today; the plan builds only when Today or My Home is shown (`AppShell.tsx:411`). | URL query set; `GET` forecast | prod: `prod-ask-default-390x844-first.jpg`; code: `Ask.tsx:84-121` | Proposal (F-20): text box first. Proposal, needs your OK (F-15): header wording. |
| 3 | Asks a question | Continues as **flow 5** | — | — | — |

The visitor never sees Welcome on this path. The personalise invite appears only on Today (`AppShell.tsx:421`).

### 1c. Landing search

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Types 2 or more letters | After 300 ms: a list of places and "{n} places found" | `GET` search with the typed text | local: `local-landing-search-390x844-first.jpg`; code: `LocationSearch.tsx:31-71` | Proposal: an explicit submit control (brief §3). What it does with no highlighted result is an open question (IA §10). |
| 2 | Picks a place (click, or arrows and Enter) | Full page load of `/app?place=…&lat=…&lon=…` | URL query | code: `Landing.tsx:11-14` | none |
| 3 | (arrives) | Today, with the place from the URL. Focus stays put. The verdict loads, then the plan builds with no household answers. The invite "Make it personal: 2 quick questions" / "Not now" sits under the recommendation. | `GET` forecast; `POST` daily-plan (no answers) | prod: `prod-today-default-390x844-first.jpg`; code: `AppShell.tsx:63-65,172-177,421-441` | Proposal: the invite moves under the help choices as an outlined button. The label stays (any new label needs your OK). |
| 4 | Taps "Make it personal: 2 quick questions" | Welcome opens on **step 2**, because a place exists. The query travels with it. Continues as flow 2, step 5. | nothing | code: `AppShell.tsx:423-428`; `Welcome.tsx:122` | none |
| 4′ | Or taps "Not now" | The invite hides for this visit | page memory | code: `AppShell.tsx:433-439` | none |

No result and search errors are handled as in flow 6, steps 3′ and 3″.

## 2. First visit straight to `/app`

Start: a link or a typed `/app`, with no session.

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Opens `/app` | H1 "Today" and a placeholder while saved answers are checked | `GET` sources | code: `AppShell.tsx:350-365` | Proposal (F-02, F-18): a placeholder near the final height, with a visible label (label needs your OK) |
| 2 | (no session) | The address is replaced with `/app/welcome`. "Step 1 of 3", H1 "Where should we check air quality?", the search, and "Use my location" with "Your browser asks first. Your location is rounded to about 1 km before it leaves your browser." No Back and no Skip on this step. Header chip "Choose a place". | nothing | prod: `prod-welcome-default-390x844-first.jpg`; local: `local-welcome-noplace-390x844-first.jpg`; code: `Welcome.tsx:177-204,320` | Proposal (F-27): header chip hidden on step 1. Proposal, needs your OK (F-27): a value line, "See today's air forecast for your place and one thing you could do." |
| 3a | Picks a search result | Step 2 | URL becomes `/app/welcome?place=…` | code: `Welcome.tsx:190-195`; `AppShell.tsx:189-199` | none |
| 3b | Or taps "Use my location" and allows it | Step 2. The place is "Near you (approximate)", rounded to 2 decimals. The URL has no query. | page memory only | code: `UseMyLocation.tsx:23-45`; `place.ts:47-54`; `AppShell.tsx:184-187` | none |
| 3c | Or denies permission | "Location permission was denied. Search for a place instead." Stays on step 1. | nothing | code: `UseMyLocation.tsx:4,41` | none |
| 4 | — | Step 2: H1 "What does your typical day look like?", "Choose any that fit. All optional.", chips "Office commute", "School commute", "Outdoor exercise", "Work from home"; "How do you usually travel?" appears when "Office commute" is ticked. Buttons Back, Next, Skip. | page memory | local: `local-welcome-step2-390x844-full.jpg`; code: `Welcome.tsx:206-238` | none |
| 5 | Next, or Skip (Skip keeps the earlier answers for this step) | Step 3: H1 "Tell us a little about your home.", fuel, exhaust, purifier and busy-road chips; "Remember on this device", **unticked**, with "Creates an anonymous save on this device. Delete it any time in My Profile." Buttons Back, "See my air", Skip. | page memory | local: `local-welcome-step3-390x844-full.jpg`; code: `Welcome.tsx:125,240-311` | Proposal, needs your OK (F-01): the note becomes "Creates an anonymous account so this browser can reopen your place. Delete it any time in My Profile." |
| 6a | "See my air" or Skip, Remember **off** (default) | Today opens at `/app` (with the query if the place was searched). Focus moves to the place H1. The answers apply for this visit only. | page memory only; no account | code: `AppShell.tsx:232-250`; `Welcome.tsx:138-163` | none |
| 6b | Ticks Remember, then "See my air" or Skip | As 6a, after the save. Skip on step 3 still honours Remember. With a device location, step 3 adds "Your location isn't saved; only your answers are." and only the answers are saved. | Anonymous account created (§0.3); `PUT` preferences with the answers and, for a searched place only, the label and 2-decimal coordinates | code: `AppShell.tsx:239-244`; `Welcome.tsx:306-310,350-357` | none (F-43, label only or label plus coordinates, is your open call) |
| 6c | Save fails | Stays on step 3 with an alert: "Saving isn't available right now. Untick Remember to continue without saving." or, when rate-limited, "Too many requests. Try again in a minute, or untick Remember to continue without saving." | nothing saved | code: `Welcome.tsx:19-22,154-159,312-316` | none |

## 3. Returning visitor

The app checks for a session on every app page, because My Profile's form is always mounted and loads once (`AppShell.tsx:297-315`; `HouseholdPreferencesForm.tsx:105-134`).

| Case | Steps and screen | Saved or sent | Evidence | Change |
|---|---|---|---|---|
| **A. Remembered place** | Opens `/app` → H1 "Today" and a placeholder → session found → saved answers and place load → the place and its query are written into the URL (replace) → Today for that place. The plan waits until saved answers have loaded, so it builds once, with them. | `GET` preferences (token); `GET` forecast; `POST` daily-plan with the saved answers | code: `AppShell.tsx:201-211,409-411` | Proposal (F-02): a sized placeholder. Otherwise none. |
| A′. Same, opened on `/app/ask` or `/app/home` | The remembered place is restored on that page too | `GET` preferences; `GET` forecast; `POST` daily-plan only on My Home | code: `AppShell.tsx:205-210,411` | none |
| A″. Same, with a different `?place=` in the URL | The URL place wins. The remembered place stays saved and is shown in My Profile. | as A | code: `AppShell.tsx:205` | none |
| **B. Session with answers, no remembered place** | `/app` → saved answers load into the form and the page → no place → Welcome **step 1**, starting from the saved answers | `GET` preferences | code: `HouseholdPreferencesForm.tsx:119-126`; `Welcome.tsx:123` | none |
| B′. The saved answers fail to load | Treated as nothing saved → Welcome step 1. My Profile says "Your saved answers couldn't be loaded right now." | — | code: `HouseholdPreferencesForm.tsx:36,128-132` | none |
| **C. No session** (or saving switched off) | Same as a first visit: flow 2 | nothing | prod: `prod-app-noplace-default-390x844-first.jpg` | See flow 2 |
| **D. Bookmarked or shared `/app?place=…`** | Today for that place, straight away. A remembered place (if any) doesn't override it. | `GET` forecast; `POST` daily-plan | prod: `prod-today-default-390x844-first.jpg`; code: `AppShell.tsx:63-70` | none |
| E. Last visit used "Use my location" | Never remembered and never in the URL, so the visitor chooses again (case B or C) | — | code: `AppShell.tsx:197-198,241` | none |

## 4. Find the answer and the recommendation, and open "Why?"

Start: Today for a searched place, forecast ready, plan built.

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Reads the top of Today | Greeting; H1 "Today in {place}"; the verdict card: weather line first ("Weather for {day}, HH:MM: …"), verdict H2 (for example "Forecast within India's 24-hour limits"), tag "Within the limit", "Model forecast · Open-Meteo · updated HH:MM", the meaning sentence, and the caveat "Being within the national limit does not mean the air is clean or free of risk." | — | prod: `prod-today-default-390x844-first.jpg`; code: `TodayLead.tsx:31-51`; `today.ts:21-34` | Proposal (F-11, F-03): 24 px H1, tighter card. Proposal, needs your OK: keep or move the weather line (F-21), drop the meaning sentence (F-22), "retrieved" for "updated" (F-32). |
| 2 | Scrolls (phones) | "Your recommendation for today", the live line "Your plan is ready.", then the top card: title, text, "For you: …" (AI plans), "Why this recommendation?", then "Made with AI" or "Made by our rules" and the general-information note, then "See your full day". At 390x844 production, "Why?" sits at y 1049 and the bar starts at y 787. At 1280x720 all of it is on the first screen. | — | prod: `prod-today-default-390x844-full.jpg`, `prod-today-default-1280x720-first.jpg`; code: `DailyPlanSection.tsx:224-301` | Proposal (F-03): "Your plan is ready." screen-reader-only; 20 px heading. Proposal, needs your OK (F-14): "For you" only with household answers. Measured in the mockups at 390x844 (rules card, meaning sentence kept): A "Why?" bottom y 739, above the bar with no OK needed; an AI card's "For you" line then needs F-14 or F-22. B: y 807, cut by the bar; it needs F-22 (about y 722, derived), plus F-14 for an AI card (DESIGN_CONCEPTS.md §7). |
| 3 | Opens "Why this recommendation?" | Reason; Based on ("today's forecast check" or "general guidance"); What it used (each input named); Sources (links), or "No external source; this is general guidance."; Caveat | — | local: `local-today-details-open-390x844-full.jpg`; code: `PlanCard.tsx:58-111` | Proposal, needs your OK (F-23): the label becomes "Why?" (the card title stays in the accessible name) |
| 4 | Opens "See your full day" | "Plan for {place}", the AI summary (AI plans), who made it; "Your day" by period (AI plans); "Outdoors and travel", "Indoor air", "Sustainable swaps", each card with its own "Why?" (the top card appears again here); the note; "Save plan" with its note | — | local: `local-today-details-open-390x844-full.jpg`; code: `PlanView.tsx`; `DailyPlanSection.tsx:278-301` | Save note: see flow 9 (F-01) |
| 5 | Opens "Air quality details" | The forecast location (2 decimals); this hour's PM2.5 with its unit; the 24-hour check lines; provider and "Model run time not reported by the provider. Retrieved HH:MM."; the chart and pollutant table; "Hourly forecast ({n} hours)"; "Official CPCB observations are not connected yet."; "How the 24-hour check works" ("… We don't calculate an AQI."); "Sources and limitations" | — | local: `local-today-details-open-390x844-full.jpg`; code: `AirDetails.tsx:36-80` | If F-22 is accepted, the meaning sentence moves here |

Keyboard: 9 Tab presses from page load to "Why this recommendation?" at 390 and 1280 (`LIVE_SITE_AUDIT.md` §4).

## 5. Ask a question

Start: `/app/ask` with a place. One request runs at a time; chips, starters and Send are disabled while "AirAware is thinking…" shows (`useAsk.ts:148-151`; `AskEntry.tsx:225-233`). The thread lives in page memory, up to 10 exchanges, and is cleared by a new place or "Delete everything" (`useAsk.ts:44,63-75`).

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Opens Ask | H1 "Ask AirAware"; the "Using: …" line; the greeting panel: "{greeting}. I'm AirAware. Ask me about your day, your home or your commute.", 6 topic chips, 5 starter questions; the text box "Ask about your air, home or day" with Send at the bottom (y 878 at 390x844) | — | prod: `prod-ask-default-390x844-first.jpg`; code: `Ask.tsx:79-173` | Proposal (F-20): a one-line purpose (needs your OK), the text box first, then chips, then 3 starters with "More questions" (label needs your OK). Proposal, needs your OK (F-15): "{n} of 10 household questions answered · Edit". |
| 2a | Taps a **starter**, for example "Can I go for a morning walk today?" | Your message appears in the thread, then "AirAware is thinking…". The answer: a summary; "Made with AI" or "Made by our rules"; "Based on: {verdict} · Model forecast · updated HH:MM"; the caveat (within-limit days); the stale banner if old; up to 3 cards, each with "Why?"; the general-information note; possibly one question back; "You could also ask:". Focus goes to your message. | `POST` assistant/answer with the question text, place and answers | local: `local-ask-answer-390x844-full.jpg`; code: `AskEntry.tsx:84-146,192-194,249-308` | Proposal (F-04): scroll the new exchange to its top. At 320x640 and 1280x720 only your message is visible today (`local-ask-answer-320x640-first.jpg`, `local-ask-answer-1280x720-first.jpg`). |
| 2b | Taps a **topic chip**, for example "Windows and ventilation" | Same as 2a; your message is the chip's label | `POST` with the topic, not a question | code: `AskEntry.tsx:29-52`; `Ask.tsx:73-74` | none |
| 2c | Types a **free-text** question and taps Send | Same as 2a. The server picks a topic from fixed word lists. The question is never logged, stored or sent to the AI. *Amended (28 Nov): a typed question the medical word list does not flag now goes to Claude, with up to 2 earlier questions (J26, ADR-008); topic chips never do.* | `POST` with the question text | code: `Ask.tsx:140-147`; `server/src/routes/assistant.ts:9-10,26`; `server/src/services/recommendations/askTopics.ts:229-238` | none |
| 2d | Starts from **Today**: a help choice ("Outdoor activities" or "My family") | Ask opens and sends that topic. "My home" and "Greener habits" open My Home and Better Habits instead. | `POST` with the topic | code: `HelpChoices.tsx:8-41,58-66`; `AppShell.tsx:444-448` | Proposal, needs your OK (F-24): "Better habits" |
| 2e | Starts from **Today's Ask box** | Its 3 starters fill the box and don't send. Send opens Ask and sends the question. | `POST` with the question text | code: `AskBox.tsx:26-35,62-77` | none |
| 3 | Answers the **question back** ("One question so I can be more specific:") | The answer joins the answers on screen for this visit. If it changes the cards, the topic is asked again; otherwise "Noted. That doesn't change this answer." Note: "This changes your answers for this visit. To keep them, save in My Profile." | page memory; maybe another `POST` | code: `useAsk.ts:166-197`; `features/ask/ask.ts:55-60` | none |
| 3′ | Taps Skip on the question back | "Skipped. You can answer it in My Profile any time." | page memory | code: `useAsk.ts:199-214` | none |
| 4 | Asks a **medical** question | A fixed reply, with no cards and no AI: "I can't give medical advice. For health concerns, please talk to a doctor.", then "Today: {verdict} · Model forecast · updated HH:MM", the stale banner if old, and the general-information note | `POST`; the server classifies it as medical | code: `AskEntry.tsx:114-123`; `features/ask/ask.ts:45-46`; `server/src/services/recommendations/ask.ts:247-251` | none |
| 5 | Asks something **out of scope** | "I can help with outdoor plans, windows and ventilation, indoor air, family and greener habits", followed by the 6 topic chips. No cards and no AI. | `POST` | code: `AskEntry.tsx:106-113`; `features/ask/ask.ts:47-48` | none |
| 6 | Asks while the server **has no forecast** | The server answers anyway with the air "unknown". The summary is the AI's (when it ran), else the unknown verdict's explanation. The answer reads "Based on: Live air information unavailable · Model forecast", with no time. The cards come from the rules. | `POST` | code: `server/src/services/recommendations/ask.ts:240-244`; `features/ask/ask.ts:146-148`; `AskEntry.tsx:84-89` | Proposal (F-34): add "Model forecast · {provider} · updated HH:MM" only when a forecast exists (wording needs your OK). Proposal, needs your OK (F-16): "Air information unavailable". |
| 7 | The request **fails** | "We couldn't answer that", a reason, "Try again" (sends the same body again) | — | code: `AskEntry.tsx:234-245`; `useAsk.ts:153-161` | none |

The "Using: …" header shows ", updated HH:MM" only while the shell's forecast is ready (`Ask.tsx:86`). It has no stale check (F-33, not in the brief).

## 6. Change location

Start: any app page with a place. The chip reads the full label, truncated ("Pun…" at 768 px, F-10).

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Taps the place chip ("Change place: {label}") | A modal dialog: H2 "Change place", "Search for a city or area in India", "Type at least 2 letters, then choose a place from the list.", "Use my location" and its hint, Close | — | local: `local-place-dialog-open-390x844-first.jpg`; code: `PlaceChip.tsx:37-71`; `LocationSearch.tsx:108-113` | Proposal (F-10): the chip shows "Pune", with a minimum width at 768 px |
| 2 | Types 2 or more letters | "{n} places found" and the list | `GET` search | local: `local-place-dialog-results-390x844-first.jpg`; code: `LocationSearch.tsx:31-55` | none |
| 3 | Picks a result | The dialog closes. New place; the URL query is replaced. On Today, focus moves to the H1 "Today in {new place}". The verdict reloads and the plan area starts afresh. The Ask thread empties. If a place was remembered, the new searched place replaces it silently. | URL; `GET` forecast; `POST` daily-plan when Today or My Home is shown (else on the next visit to either); `PUT` preferences (place only) if remembered | code: `AppShell.tsx:172-199,405,411`; `useAsk.ts:63-75` | none |
| 3′ | No result | "No places found" | `GET` search | local: `local-place-search-no-result-390x844-first.jpg`; code: `LocationSearch.tsx:50-54` | Proposal, needs your OK (F-35): "No places found. Try a nearby city, or use your location." |
| 3″ | Search fails | The server's own message, in production "Data provider unavailable."; "Search failed. Try again." for an unexpected error | — | local: `local-place-search-error-390x844-first.jpg`; code: `LocationSearch.tsx:56-64` | Proposal, needs your OK (F-35): "Search isn't working right now. Try again, or use your location." |
| 4 | Taps "Use my location" | "Finding your location…", then the browser's permission prompt | — | code: `UseMyLocation.tsx:23-45,55` | none |
| 4a | Allows it | The dialog closes. H1 "Today near you (approximate)". The URL query is cleared. Coordinates are rounded to 2 decimals before any request. Never remembered. | page memory; `GET` forecast with 2-decimal coordinates | code: `place.ts:44-54`; `AppShell.tsx:184-198`; `AppShell.tsx:357-361` | none |
| 4b | Denies permission | "Location permission was denied. Search for a place instead." The dialog stays open. | nothing | code: `UseMyLocation.tsx:4,41` | none |
| 4c | Position unavailable or timed out (10 s) | "Your location could not be found. Search for a place instead." | nothing | code: `UseMyLocation.tsx:5-6,41-43` | none |
| 4d | Picks a search result while location is still pending | The search result wins; a late location answer is ignored | — | code: `AppShell.tsx:184-187` | none |
| 5 | Escape, Close, or a click outside | The dialog closes; focus returns to the chip | — | Stage 0 keyboard check (`LIVE_SITE_AUDIT.md` §8); code: `PlaceChip.tsx:47-52,62-68` | none |

The browser hides "Use my location" when it has no geolocation (`UseMyLocation.tsx:21`).

## 7. Stale forecast and reload

"Stale" means the forecast was retrieved more than 60 minutes ago, by the device clock (`clock.ts:5-8`). The clock ticks every minute, and at once when the tab is shown again (`clock.ts:10-31`).

| # | Event | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | The forecast loads | The verdict as in flow 4. The server may serve a cached forecast, so its retrieval time can be up to 10 minutes older than the load (F-33). | `GET` forecast | code: `AppShell.tsx:121-129` | none |
| 2 | Retrieval time passes 60 minutes | The amber "Not current: retrieved more than an hour ago. Reload for the latest forecast." appears directly under the provenance. The footer becomes "Background: model forecast for {place}. {tag}. Not current." Ask answers based on it show the same banner. The backdrop keeps its last look (F-44). | — | local: `local-today-stale-390x844-full.jpg` (fixture retrieved two hours ago); code: `TodayLead.tsx:47`; `AirReadout.tsx:41-58`; `scene.ts:105-113` | Proposal (F-30): a "Reload forecast" button inside or beside the banner (placement open, DESIGN_SYSTEM_PROPOSAL.md §13) that calls the existing retry; the banner text stays. Label needs your OK. Backdrop while stale: your call (F-44). |
| 3 | The plan's forecast is also old | The recommendation card adds "The forecast behind this plan is more than an hour old." My Home shows that line instead of its cards. | — | code: `DailyPlanSection.tsx:175-181,255`; `MyHome.tsx:90-91` | none |
| 4 | Load time passes 60 minutes, on Today, My Home or Ask | Automatic reload. While it runs, the verdict card is replaced by the loading placeholder; the backdrop keeps the previous look. | `GET` forecast | code: `AppShell.tsx:130-149`; `useRequest.ts:66-72` | Open question (IA §10, item 7): keep the old verdict on screen during the reload |
| 4′ | The visitor is on Better Habits, My Profile or Welcome | No reload there. Returning to Today, My Home or Ask triggers it at once. | — | code: `AppShell.tsx:136-139` | none |
| 5a | The reload succeeds | A new verdict without the banner. The plan rebuilds once it is over an hour old. | `POST` daily-plan when due | code: `DailyPlanSection.tsx:183-190` | none |
| 5b | The reload fails | The error card replaces the verdict: **flow 8**. There is no automatic retry. | — | code: `AppShell.tsx:134-135,384-394` | See flow 8 |
| 6 | The visitor reloads the browser (today's only manual way) | Full page load: in-memory answers, the Ask thread and a device-location place are lost. A searched place returns from the URL. | `GET` forecast; `POST` daily-plan | code: `AppShell.tsx:63-65` | Proposal (F-30): the in-page button avoids this |

## 8. Forecast failure and recovery

| # | Event | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | The forecast request fails | No verdict. The card "We couldn't load the forecast" (an H2, announced as an alert) with one reason: "Forecast provider unavailable.", "Could not reach AirAware. Check your connection.", "Too many requests. Try again in a minute." or "Something went wrong loading the forecast."; then "Try again". | — | local: `local-today-unavailable-390x844-full.jpg`; code: `AppShell.tsx:384-394`; `States.tsx:25-72` | none |
| 2 | (same time) | The recommendation still builds. The server fetches its own forecast; the cards always come from the rules, and the AI writer still runs ("Made with AI" or "Made by our rules"). Its air line names what it used: "Today: {verdict} · Model forecast · {provider} · updated HH:MM" when the server got a forecast, else "Air information is unavailable for this plan." | `POST` daily-plan | local: `local-today-unavailable-390x844-full.jpg`; e2e: `e2e/failures.spec.ts:19-36`; code: `server/src/services/recommendations/dailyPlan.ts:150-170`; `DailyPlanSection.tsx:257-262`; `planDisplay.ts:143-154` | Proposal, needs your OK (F-32): "retrieved" |
| 3 | (same time) | The backdrop shows the neutral look; the footer has no "Background" line; "Air quality details" holds only the CPCB line and the sources. Ask's header drops ", updated HH:MM". | — | code: `scene.ts:88-101`; `AppShell.tsx:473-481`; `AirDetails.tsx:48-76`; `Ask.tsx:86` | none |
| 4 | Taps "Try again" | Focus moves to the H1; the loading placeholder shows | `GET` forecast | code: `AppShell.tsx:386-391` | Proposal (F-02, F-18): sized placeholder, visible label |
| 5a | Succeeds | The verdict appears; the plan's air line hides, because the verdict now shows the air | — | code: `DailyPlanSection.tsx:258` | none |
| 5b | Fails again | The same card, until the next tap. Nothing retries by itself. | — | code: `AppShell.tsx:134-135` | none |

Related Today states (IA §6.2):

| State | Screen | Evidence | Change |
|---|---|---|---|
| Incomplete 24-hour check | H2 "Live air information unavailable", tag "No data", the provenance line, and "We could not get a complete 24-hour forecast for this place, so there's no advice about today's air. The suggestions below apply on any day." The plan's cards come from the rules; "Made with AI" or "Made by our rules", because the AI writer also runs on unknown air. | local: `local-today-unknown-check-390x844-full.jpg`, `local-today-unavailable-plan-390x844-full.jpg`; code: `today.ts:46-51`; `server/src/services/recommendations/dailyPlan.ts:150-170` | Proposal, needs your OK (F-16): "Air information unavailable" |
| Plan failed, forecast fine | The verdict as normal; "We couldn't build your recommendation." / "Something went wrong building your plan." (or a coded reason) / "Try again" | local: `local-today-plan-error-390x844-full.jpg`; code: `DailyPlanSection.tsx:37,241-252` | Proposal, needs your OK (F-31): add "The forecast above is still up to date." |

## 9. Save, open and delete

Every step that needs a session (a save, the saved-plans list, an opened snapshot, both delete confirmations, "Forget this place") is code-trace only (§ "Not exercised in Stage 0"). Steps with no session were captured in production.

### 9a. Save answers (My Profile)

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Opens My Profile | H1 "My Profile"; "Your household (optional)" with "Answers make the daily plan fit your routine and home. Every question is optional, and none asks about health conditions."; 10 questions; the note "Saved on this browser only. Clearing your browser data or switching devices loses it."; "Save my answers"; "Delete my saved data" (always shown) | Nothing new: `GET` preferences and `GET` plans already ran at app load, and only if a session exists | prod: `prod-profile-default-390x844-full.jpg`; local: `local-profile-empty-390x844-full.jpg`; code: `HouseholdPreferencesForm.tsx:28-29,186-253` | Proposal (IA §6.6): section order, with delete moved to "Your data". Proposal, needs your OK (F-01): the note becomes "Saving creates an anonymous account (no email or name). Your answers are stored on AirAware's database host, and only this browser can open them. Delete them any time in My Profile." |
| 2 | Changes an answer | Today's plan rebuilds with it the next time Today or My Home shows | page memory | code: `HouseholdPreferencesForm.tsx:78-82`; `DailyPlanSection.tsx:183-190` | none |
| 3 | Taps "Save my answers" | "Saved on this browser." | Anonymous account on the first save (§0.3); `PUT` preferences with the answers only | code: `HouseholdPreferencesForm.tsx:141-158` | Proposal, needs your OK (F-01): "Saved to your anonymous account." |
| 3′ | The save fails | "Saving isn't available right now. Your answers are still on screen." or "Too many requests. Try again in a minute. Your answers are still on screen." | nothing | code: `HouseholdPreferencesForm.tsx:32-35,149-155` | none |

### 9b. Save a plan (Today)

"Save plan" exists only on Today, inside "See your full day" (`DailyPlanSection.tsx:278-301`). My Home has no "See your full day" (`MyHome.tsx:104-127`). The register's F-01 row also names My Home; the code doesn't support that.

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Opens "See your full day" | The full plan, "Save plan" and the note "Saved on this browser only. Clearing your browser data or switching devices loses it." | — | code: `DailyPlanSection.tsx:284-298` | Proposal, needs your OK (F-01): the same corrected note as 9a |
| 2 | Taps "Save plan" | "Saved on this browser. This is the plan as saved." The plan on screen becomes the server's saved copy, and "Save plan" hides. My Profile's list reloads. | Anonymous account on the first save; `POST` plans with the plan's request body | code: `DailyPlanSection.tsx:151-173,220-221,284` | Proposal, needs your OK (F-01): "Saved to your anonymous account. This is the plan as saved." |
| 2′ | The save fails | "You can keep up to 20 saved plans. Delete one to save another." (limit), "Too many requests. Try again in a minute." or "Saving isn't available right now." | nothing | code: `DailyPlanSection.tsx:38-48` | none |

### 9c. Open and delete a saved plan (My Profile)

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Opens My Profile with **no session** | No "Saved plans" section at all | nothing | prod: `prod-profile-default-1280x720-full.jpg`; code: `SavedPlansList.tsx:132` | Proposal (F-06): always show the section. With no session, a static line "No saved plans yet. Use Save plan under See your full day on Today.", with no token and no API call. The line needs your OK. |
| 1′ | Opens it with a session and no plans | "Saved plans", "No saved plans yet." | `GET` plans | code: `SavedPlansList.tsx:15,149-150` | none |
| 2 | Sees the list | Newest first; each row: place name, "Saved {date, time}", Open, Delete | `GET` plans | code: `SavedPlansList.tsx:66-76,152-191` | none |
| 3 | Taps Open | Below the list: "Saved plan from {date, time}. This is a snapshot, not current air information.", Close, and the full plan worded for "that day". Focus moves to the banner. | `GET` plans/:id | code: `Profile.tsx:47-50,131-152`; `SavedPlansList.tsx:91-102` | none |
| 3′ | Open fails | "This saved plan couldn't be opened right now." or "Too many requests. Try again in a minute." | — | code: `SavedPlansList.tsx:17-19,95-100` | none |
| 4 | Taps Close | The snapshot closes; focus returns to its Open button | — | code: `Profile.tsx:52-59` | none |
| 5 | Taps Delete | "Delete this saved plan? It can't be undone.", "Delete plan" and Cancel. Focus is on Cancel. | — | code: `SavedPlansList.tsx:86-89,192-216` | none |
| 6 | Taps "Delete plan" | The row goes, "Saved plan deleted.", and focus moves to the heading. If it was the plan just saved on Today, Today stops calling it saved and "Save plan" returns. | `DELETE` plans/:id | code: `SavedPlansList.tsx:104-121`; `DailyPlanSection.tsx:219-221` | none |
| 6′ | Delete fails | "Nothing was deleted. Try again in a moment." or "Too many requests, so nothing was deleted. Try again in a minute." | — | code: `SavedPlansList.tsx:18,20-21,122-126` | none |

### 9d. Forget the remembered place

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Sees "Your place" | "Remembered place: {label}", "Forget this place". Shown only when a place is remembered. | — | code: `Profile.tsx:93-117` | Proposal: this section moves to the top of My Profile (IA §6.6) |
| 2 | Taps "Forget this place" | "This place is no longer remembered."; focus moves to the heading. The place on screen doesn't change. | `PUT` preferences with no place | code: `Profile.tsx:61-70`; `AppShell.tsx:225-229` | none |
| 2′ | Fails | "Nothing was changed. Try again in a moment." | — | code: `Profile.tsx:13,67-69` | none |

### 9e. Delete everything

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Taps "Delete my saved data" | "This deletes your saved answers and plans from AirAware. It can't be undone.", "Delete everything" and Cancel. Focus is on Cancel. | — | code: `HouseholdPreferencesForm.tsx:136-139,245-279` | Proposal (F-05): the button shows only when data exists (a session, or saved answers loaded) |
| 2 | Taps "Delete everything" | "Deleted. Nothing is saved now." Answers are cleared; the plan area starts afresh; the Ask thread empties; the remembered place is gone; the saved-plans list reloads. The place on screen stays. | `DELETE` account (if a session exists); local sign-out clears the session from `localStorage` | code: `HouseholdPreferencesForm.tsx:160-176`; `AppShell.tsx:307-311`; `supabase.ts:37-40` | none |
| 2′ | No session (today's F-05 case) | The same "Deleted. Nothing is saved now." is shown, and the answers on screen are cleared, although nothing was stored | no request | prod: `prod-profile-default-390x844-full.jpg` (button visible); code: `HouseholdPreferencesForm.tsx:164-170` | Proposal (F-05): never reached, because the button is hidden |
| 2″ | Delete fails | "Nothing was deleted. Try again in a moment." | — | code: `HouseholdPreferencesForm.tsx:38,171-173` | none |

**F-01 copy proposal, together** (needs your OK; mockups keep the shipped text):

| Where | Shipped | Proposed |
|---|---|---|
| My Profile note, Today's "Save plan" note | "Saved on this browser only. Clearing your browser data or switching devices loses it." | "Saving creates an anonymous account (no email or name). Your answers are stored on AirAware's database host, and this browser keeps the sign-in. Delete them any time in My Profile." |
| After "Save my answers" | "Saved on this browser." | "Saved to your anonymous account." |
| After "Save plan" | "Saved on this browser. This is the plan as saved." | "Saved to your anonymous account. This is the plan as saved." |
| Welcome step 3, under Remember | "Creates an anonymous save on this device. Delete it any time in My Profile." | "Creates an anonymous account that keeps your answers, and a place you searched for, so this browser can reopen them. Delete it any time in My Profile." |

Two strings are reworded from brief §8 to match the code: "only this browser can open them" is not true, because the project owner and Supabase can access the database (`Privacy.tsx:81`); and the Remember line covers both cases, because a "Use my location" place is never saved (`Privacy.tsx:78-79`). With a device location, the shipped line "Your location isn't saved; only your answers are." still follows it (`Welcome.tsx:306-309`).

## 10. Privacy page and back to the app

| # | User does | Screen and state | Saved or sent | Evidence | Change |
|---|---|---|---|---|---|
| 1 | Taps "Privacy" in the footer of any app page (or the landing footer) | A full page load of `/privacy`, because the footer uses a plain link. Unsaved answers, the Ask thread, the built plan and a device-location place are lost, unless the browser restores the app from its back-forward cache. | nothing | code: `AppShell.tsx:483-488`; `Landing.tsx:300-305` | none |
| 2 | Reads Privacy | A light header with the logo; H1 "Privacy"; one intro line; 7 sections ("What stays in your browser" … "No analytics"); "This page describes how the app works. It is not legal advice."; a footer whose Privacy link points to the same page. About 3.4 phone screens at 390. | — | prod: `prod-privacy-default-390x844-full.jpg`; code: `Privacy.tsx:18-117` | Proposal (F-29): the app-style navy header and a 3-line "In short" from existing statements (needs your OK). Proposal, needs your OK (F-29): gloss Supabase once as "our database host". Needs your OK (F-07): the retention line, after you confirm the cleanup job. |
| 3a | Taps the logo | The landing page `/` | — | code: `Privacy.tsx:24-29` | none |
| 3b | Uses the browser's Back | The app page reloads at its old address. A searched place returns from the query; a remembered place is restored; otherwise Today opens Welcome. | `GET` forecast once a place is known; `POST` daily-plan if the page is Today or My Home | code: `AppShell.tsx:63-65,114-119,201-211,411` | none |
| 3c | (proposed) Taps "Back to AirAware" | `/app`: the remembered place if any, else Welcome step 1 | — | — | Proposal (F-28); link text needs your OK. Open question: carry the place query so a searched place survives (IA §10, item 3). |

## 11. Steps that change in the redesign

| Flow | Steps that change | Findings |
|---|---|---|
| 1 Landing | 1a.1 (sections, hero alignment), 1b.2 (Ask layout), 1c.1 (explicit submit), 1c.3 (invite position) | F-19, F-20, F-15 |
| 2 Straight to `/app` | 1 (placeholder), 2 (chip hidden, value line), 5 (Remember note) | F-02, F-18, F-27, F-01 |
| 3 Returning | A (placeholder) | F-02 |
| 4 Answer and "Why?" | 1, 2, 3, 5 | F-03, F-11, F-14, F-21, F-22, F-23, F-32 |
| 5 Ask | 1, 2a, 2d, 6 | F-20, F-15, F-04, F-24, F-34, F-16 |
| 6 Change location | 1, 3′, 3″ | F-10, F-35 |
| 7 Stale | 2, 4 (open question), 6 | F-30, F-44 |
| 8 Forecast failure | 2, 4; incomplete check; plan failed | F-32, F-02, F-18, F-16, F-31 |
| 9 Save, open, delete | 9a.1, 9a.3, 9b.1, 9b.2, 9c.1, 9d.1, 9e.1 | F-01, F-05, F-06 |
| 10 Privacy | 2, 3c | F-28, F-29, F-07 |

## 12. Evidence used

- **Code:** the paths cited in each row; all line numbers were read on commit `257352e`'s working tree.
- **Stage 0:** [audit/LIVE_SITE_AUDIT.md](audit/LIVE_SITE_AUDIT.md) §2, §4, §8 and §10; [audit/FINDINGS_REGISTER.md](audit/FINDINGS_REGISTER.md); [audit/PRODUCTION_VS_LOCAL.md](audit/PRODUCTION_VS_LOCAL.md); the screenshots named in the tables.
- **Pack:** `AirAware_AI_Redesign_Kit/02_PRODUCT_UX_REQUIREMENTS.md` §5 (first-time and returning journeys) and `04_SCREEN_BY_SCREEN_SPEC.md` §2, §4, §7, §8.
