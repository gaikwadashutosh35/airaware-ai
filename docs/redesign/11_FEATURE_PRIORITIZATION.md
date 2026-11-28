# 11 · Feature prioritisation

**Date:** 28 Nov 2026. Read-only proposal. No code, config or existing doc was changed.

**Baseline:**
- **Code:** the local tree at commit `b0c4278` (28 Nov).
- **Production:** the live site captured on 28 Nov (`docs/redesign/audit/screenshots/redesign-2026-11-28/current/`).
- **J26 (Claude answers typed Ask questions) is built locally but not deployed.** The live Ask page still shows the pre-J26 intro, "Answers come from AirAware's rules and today's forecast." (`current/ask-1440.jpg`). The local intro is "Claude (Anthropic) reads your question…" (`client/src/features/ask/ask.ts:56-57`). Local `main` is 25 commits ahead of `origin/main`.

**Labels:**
- **OBSERVED:** seen in code, a doc or a capture, with a citation.
- **RECOMMENDED:** our proposal. Every row's class, value, effort, risk and priority is RECOMMENDED. The "Today (OBSERVED)" column is what exists now.

**Companion docs:**
- `13_DATA_AND_API_DEPENDENCY_MATRIX.md` ("13"): data sources S1–S12, limits, the CSP, and the "what new features would need" table in §5.
- `12_AI_ASSISTANT_UX_SPEC.md` ("12"): the detail behind every Ask row.
- `06_INFORMATION_ARCHITECTURE.md` ("06"): the day timeline (N1) and the "I'll try this" storage rule.
- `08_COMPONENT_LIBRARY_DECISIONS.md` ("08"): no new dependency.
- `02_REFERENCE_COMPARISON.md` ("02"): recommendations R1–R9.

---

## 1. How rows are scored

### 1.1 Classes (each row has exactly one)

| Code | Class | Meaning here |
|---|---|---|
| **UI** | Existing functionality with UI improvement | The feature already works. The change is layout, copy, hierarchy, styling, accessibility or performance, using data the client already receives. |
| **FE** | New frontend functionality | New client behaviour using data and APIs that already exist. There is no server change. |
| **BE** | New backend/API requirement | Needs a server, contract, prompt, schema or route change. The data already exists (S1–S12). |
| **DATA** | Requires additional verified data | Needs a data source, method or measurement AirAware does not have. 13 §5 marks each of these as missing. |
| **DEFER** | Future idea to defer | Possible, but value is unproven, an owner decision rules it out for now, or the cost and risk outweigh the value at this stage. |

When a feature needs both client and server work, it is split into two rows.

### 1.2 Other columns

- **User value:** H, M or L, measured against the journey UNDERSTAND → ASK → GET GUIDANCE → TAKE ACTION → LEARN.
- **Effort:** S is about a day including tests. M is 2–4 days. L is a week or more. Test churn is included: `AppShell.test.tsx` is 2,681 lines and `firstscreen.spec.ts` has 62 tests (01 §7).
- **Risk:** L, M or H, with the kind of risk:
  - **DI:** data integrity;
  - **PR:** privacy;
  - **RG:** regression or test churn;
  - **CO:** cost or quota.
- **Depends on:** a source or section in 13, or a decision ID in `OWNER_DECISIONS.md`.
- **Priority:**
  - **Now:** the next UI pass. No new data, API or dependency; at most copy approval (CP-04).
  - **Next:** after Now. A small new frontend feature, or one owner decision.
  - **Later:** backend, data or service work, or a larger decision. Every DEFER row is Later.

**Rules that apply to every row:**
- **New copy:** any new user-facing string needs the owner's approval before it ships (`REDESIGN_ACCEPTANCE_CRITERIA.md:310`, CP-04).
- **No new package:** no row adds one (08 §1).
- **Approval for server and data rows:** every BE, DATA and DEFER row needs an owner decision before any build, even where its cells do not say so (AGENTS.md §9; doc 14 ground rule 4 keeps them out of R1–R9). Added in the critic pass.
- **Five destinations stay:** Today, Ask AirAware, My Home, Better Habits and My Profile. "Insights" and "Daily Plan" are sections inside them, never new nav items (master guide §9 lines 430-432; 06 line 29).

---

## 2. Summary

| Class | Rows | Now | Next | Later |
|---|---|---|---|---|
| UI: existing functionality with UI improvement | 32 | 14 | 16 | 2 |
| FE: new frontend functionality | 14 | 0 | 11 | 3 |
| BE: new backend/API requirement | 12 | 0 | 3 | 9 |
| DATA: requires additional verified data | 5 | 0 | 0 | 5 |
| DEFER: future idea to defer | 10 | 0 | 0 | 10 |
| **Total** | **73** | **14** | **30** | **29** |

*Critic pass, 28 Nov (counts re-made by grep): P1 moved Now → Next because it reverses the owner's 27 Nov ruling (14 D13), and X1 moved Now → Later to match doc 14 §4.*

**The Now set** is mostly hierarchy, copy and accessibility on existing features:
- the Today first screen (T1, T2, T4);
- Ask answer structure and starter copy (A1–A6);
- touch targets (L4, A5, X2);
- one copy point that needs an owner ruling (L1);
- two open items from Stage 5 (M2, X3).

None of it needs new data, a new API or a new package.

**The largest user gains that need more than UI:**
- **GET GUIDANCE:** the day timeline (P3, client-only, per 06 §4.3).
- **TAKE ACTION:** "I'll try this" (P4).
- **ASK:** "Ask about this" (A10).
- **UNDERSTAND, later:** a check for the following 24 hours (I3, server).
- **Blocked:** history and trends (I1, I2) until a past-data source is verified.

---

## 3. Landing (`/`)

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| L1 | Reword the closing line so "AQI" appears only in the phrase the brief allows | The page ends with "…and not the CPCB National AQI." (`current/landing-1440-reduced-motion.jpg`). `copy.spec.ts:20` and A7 allow "CPCB National AQI"; the brief allows only "We don't calculate an AQI". **This conflict needs an owner ruling.** | UI | M | S | L (RG: `Landing.test.tsx`) | S9, S12 | Now |
| L2 | Frame sections 01–03 and "How AirAware works" as the journey (Understand → Ask → Guidance → Action → Learn), each linked to its destination | Numbered sections 01–03, plus "How AirAware works" in 4 steps (`current/landing-1440-reduced-motion.jpg`) | UI | M | S | L | S12 | Next |
| L3 | "How AirAware answers" block (R7): the rules decide, Claude explains, what is sent, what it will not do | No Claude wording on the live site; J26 is not deployed | UI | M | S | M (DI: must match the deployed server) | S6, S7, S11; J26. Location not settled: 06 puts R7 on `/privacy`, 12 §4 in the Ask welcome card (14 D12) | Next (after the J26 deploy) |
| L4 | 44 px target for the Open-Meteo credit link | 117×17 px at 390 (live capture `results.json`) | UI | L | S | L | S1 | Now |
| L5 | Sharing metadata: og tags, manifest and touch icon (F-36) | None in `client/index.html` (01 D5) | FE | M | S | L | S12 | Next |
| L6 | Route splitting, so Landing does not load AppShell, Supabase or Ask code (F-37) | One bundle (`App.tsx:1-4`; 01 D4). Landing reached DOMContentLoaded in 1.8–2.5 s in one headless run | FE | M | M | M (RG) | S8 (client loads only when needed) | Next |
| L7 | Recapture the landing's Today screenshot after the redesign | G4 (25 Nov) keeps the 22 Nov capture, labelled as past | UI | L | S | M (needs one real plan request and a G4 reversal) | S12; G4 | Later |
| L8 | Animated or 3D hero scene | A still SVG skyline (G2). No canvas or WebGL on the live site (0 canvases) | DEFER | L | L | H (bundle; 08 §3.8) | 13 §5 "Rich or 3D cityscape" | Later |
| L9 | Section content visible without depending on the scroll timeline (R8): check print and non-scrolling renders | Full-page captures are blank below the hero because of the `.reveal` scroll timeline (`index.css:212`). **This is a capture artifact, not a confirmed user bug.** Verify first | UI | L | S | L | none | Next |

---

## 4. Today (`/app`)

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| T1 | A first-screen order that answers the four questions in master guide §9.2: place, verdict, top recommendation, next step. Weather table, fire hotspots, help tiles, "Make it personal" and the Ask box move into a calmer second tier | Roughly 3,700 px on a phone. Text-heavy cards that look alike follow the verdict (live-capture notes; `current/today-390.jpg`) | UI | H | M | M (RG: `firstscreen.spec.ts`, the per-breakpoint skeleton heights in 01 D3, DI-06) | S1, S2, S5 | Now |
| T2 | A stronger visual state for the verdict (within, above or unknown) using existing tokens only. Labels unchanged: "Within the limit", "Above the limit", "No data" | A pill plus text. Few colour accents (live capture) | UI | M | S | M (DI: three states only, no band scale, nothing that reads like an AQI colour; DI-02) | S1 | Now |
| T3 | A "What does this mean?" explainer for "model forecast" and "24-hour limit", reusing `APP_LIMITATIONS` and `LIMITATIONS` | Explained only inside the closed "Air quality details" (01 §8) | UI | M | S | L | S1, S11 | Next |
| T4 | A next-step row after the recommendation (Ask about today, home plan, one habit), reusing `HelpChoices` | `HelpChoices` sits lower, after the hotspots (`current/today-390.jpg`; `helpChoices.ts:7-40`) | UI | M | S | L | none | Now |
| T5 | Fire hotspots on a map: point coordinates in the API, a renderer and tiles | Count, nearest km and latest time only (`contracts.ts:13-31`) | BE | L | L | M (CSP change in 13 §4, tile terms, keeping "not proof that smoke reaches you") | S5; 13 §4 | Later |
| T6 | Find why the hidden Today subtree on Ask, Habits and Profile keeps an `aria-busy` "Finding your recommendation…" placeholder that never clears | Seen in the live DOM, 0×0 px inside `[hidden]` (live capture). Today stays mounted while hidden (`AppShell.tsx:341-359,406`) | UI | L | S | L | none | Next |

The hourly shape is covered by P3 (the day timeline) and the timed rule card by P5. Both sit in the plan, as 06 §4.3 proposes.

---

## 5. Ask AirAware (`/app/ask`)

12 has the detail for every row.

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| A1 | The context line as chips (R3), same strings: place · Model forecast · retrieved HH:MM · Not current · x of 10 answered | One sentence line (`Ask.tsx:128-161`; `current/ask-1440.jpg`) | UI | M | S | L | S1 | Now |
| A2 | Answer structure: answer, provenance chips, "Not current", cards with "Why?", the note once, then actions (12 §6) | The fields exist. "Based on" and "Sources and limitations" sit between the answer and the cards (`AskEntry.tsx:184-237`) | UI | H | M | M (RG: `Ask.test.tsx` is 760 lines; AK-20) | S1, S7, S11 | Now |
| A3 | Starter wording that does not invite a yes/no verdict | "Can I go for a morning walk today?" and "Is it a good idea to open my windows?" (`ask.ts:26-29`) | UI | M | S | L (CP-04; tests pin the strings) | S11 | Now |
| A4 | A visible tooltip for Copy on focus and hover (08 §3.3) | Native `title` only (`AskEntry.tsx:123-124`) | UI | L | S | L | none | Now |
| A5 | 44 px targets for Edit, Open-Meteo.com and Privacy on Ask | 25×17, 100×15 and 42×15 px at 390 (live capture) | UI | M | S | L | none | Now |
| A6 | The medical reply also offers what AirAware can help with (the topic chips) | Fixed line, air line and note only. The out-of-scope reply already shows chips (`AskEntry.tsx:163-182`) | UI | M | S | L (no AI involved) | S11 | Now |
| A7 | The out-of-scope reply adds a pointer for questions about the data (Air quality details on Today) | Fixed line plus topic chips (`AskEntry.tsx:163-169`) | UI | M | S | L | S1 | Next |
| A8 | A "Jump to latest answer" link when the person has scrolled up (08 §3.5) | Not built. The code never yanks the scroll (`AskEntry.tsx:302-321`) | FE | L | S | L | none | Next |
| A9 | Contextual starters: the client picks which approved starters show, from the air level and household answers it already holds | A fixed first 4 (`ask.ts:41`) | FE | M | S | M (CP-04; never "safe") | S1 | Next |
| A10 | "Ask about this" on "Why?" panels and on My Home and Better Habits cards. It fills the box and does not send (R4) | None | FE | M | M | M (CO: each send is a Claude call) | S7 | Next |
| A11 | "What Claude saw": a fixed-copy disclosure under the first answer listing exactly what J26 D2 sends (R5) | None | FE | M | S | M (DI: must match the deployed server) | S7; J26 | Next (after the J26 deploy) |
| A12 | A remaining-characters hint near the 200-character limit | `maxLength={200}` silently stops typing (`Ask.tsx:272`) | FE | L | S | L | none | Next |
| A25 | Send topic-chip exchanges as earlier context too, using the chip label as the question, so "Why do you recommend that?" after a chip has context | Only typed questions that got an answer are sent as history (`useAsk.ts:137-154`). Starters count, because they are sent as typed questions (`Ask.tsx:100-101`) | FE | M | S | M (changes what Claude receives; J26 D2 says "earlier questions") | S7; J26 D2 | Next (owner decision) |
| A13 | A one-line note that the conversation lives on this page only | Nothing is said (`useAsk.ts:60-63`) | UI | L | S | L (CP-04) | none | Next |
| A14 | "Start over", which clears the thread for this visit | **J7 says no "new chat".** The thread clears only on reload, a place change or "Delete everything" (`useAsk.ts:70-82`) | FE | L | S | L | J7 | Later (owner decision) |
| A15 | "Useful / Not useful" feedback with a real server handler that records topic, `generatedBy`, card ids and prompt version, and never the question | **J7 says no feedback.** No handler exists | BE | M | M | H (PR: Privacy page, logging rules) | S7, S8; J7 | Later |
| A16 | Weather and fire context for Claude | Excluded by J26 D3 (`askOutput.ts:19-27`) | BE | M | M | H (DI: never infer pollution from weather, `prompts.ts:76`) | S2, S5, S7; J26 D3 | Later |
| A17 | Hourly forecast values in Claude's input, with checks | Claude is told to say hourly data is missing (`prompts.ts:72`) | BE | M | M | H (DI: no "best hour") | S1, S7 | Later |
| A18 | Tailored out-of-scope text from Claude | Claude's `out_of_scope` text is thrown away and the fixed line shows (`ask.ts:363-364`) | BE | L | S | M (DI: the new text needs checks) | S7 | Later |
| A19 | Deterministic answers in the rules path for data and app questions (CPCB, model forecast, "Not current", the index, saving and privacy), plus a prompt line that sends account and privacy questions to the Privacy page | When Claude is off or fails, "Is this an official CPCB observation?" gets the off-topic line, and "Do you have a monitoring station near my home?" gets indoor cards (12 §13, from running `classify()`) | BE | M | M | M (contract: a topic or answer kind) | S1, S11 | Next |
| A20 | A separate rate limiter for Ask, not shared with plans and saves | One 10/min/IP limiter covers all three (01 D7; `app.ts:126-138`) | BE | L | S | L | 13 §2 S6/S7 | Later |
| A21 | Streaming answers | Completed JSON only. Validation must run on the whole output (13 §5) | DEFER | L | L | H (DI) | 13 §5; 08 §3.5 flip condition | Later |
| A22 | Conversations kept across visits | Memory only, by design (`routes/assistant.ts:9-11`) | DEFER | L | L | H (PR) | 13 §5; J7 | Later |
| A23 | AI-written follow-up suggestions or clarification questions | J26: follow-ups stay non-AI | DEFER | L | M | M (DI) | J26 | Later |
| A24 | Answers in languages other than English | English only; the check rejects other scripts (`askOutput.ts:57-65`) | DEFER | M | L | H (DI: the checks are English-only) | 13 §5 | Later |

---

## 6. Daily Plan (a section of Today, not a destination)

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| P1 | Remove the plan's inner scroller and show the full day through disclosure only | `max-h-[60svh]` scroller (`DailyPlanSection.tsx:325`). The phone capture cuts off at "Sustainable swaps" (`current/today-390.jpg`) | UI | H | S | M (RG: layout tests, layout shift) | S1, S6; reverses the owner's 27 Nov ruling (`DESIGN.md:88`), so 14 D13 | Next (critic pass: was Now, but it reverses a dated owner ruling (27 Nov), so it cannot ship as a decision-free UI pass; 14 R4) |
| P2 | Make a rules plan look as complete as an AI plan: tidy topic groups, the same rhythm | A rules plan has no "Your day" (`planDisplay.ts:56-59`). Live Today showed "Made by our rules. AI personalisation is unavailable right now." (`planDisplay.ts:102`) | UI | M | S | L | S6, S7 | Next |
| P3 | Day timeline (06 §4.3, N1): the hours behind today's 24-hour check in place-local bands, with PM2.5 model ranges and no verdict per band | The hours exist in `ForecastSeries.hours` but sit only in the closed details | FE | H | M | M (DI: no "best" or "cleanest"; band cut-offs need owner OK; DI-04 holds only while the timeline stays behind "See your full day") | S1, S2 (UTC offset) | Next (doc 14 holds it unscheduled under §4 "Later" until O-1/O-2 and D3 are ruled; 14 R4 ships the simpler AI-period strip first) |
| P4 | "I'll try this" toggle on full-day cards (R6), **memory only** for the visit (06 §4.6). No counts or streaks | None (01 §8) | FE | H | M | M (PR: browser storage or saving needs an owner decision) | none | Next |
| P5 | A timed rule card (a deterministic "commute when the forecast is lower" rule, with sources and tests) | No timing rule (06 line 104) | BE | M | M | H (DI) | S1, S11 | Later |
| P6 | Deterministic "Your day" periods for rules plans | Periods come from the AI only (`plan.ts:28-32`) | BE | M | M | M (DI: no invented times) | S11 | Later |
| P7 | Copy or share the plan as text with its provenance lines (the same pattern as `answerText`) | Save plan only | FE | M | S | L | S1 | Later |
| P8 | Server-side action history and streaks | No schema (01 §8) | DEFER | L | L | H (PR, plus streak pressure) | S8; 13 §5 | Later |
| P9 | Reminders and notifications | No service worker and no push (13 §5) | DEFER | M | L | H (PR, CO) | 13 §5 | Later |

---

## 7. My Home (`/app/home`)

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| H1 | A purpose / next-step line pair at the top (R1) | Purpose only (E4) | UI | M | S | L (CP-04) | none | Next |
| H2 | "Today, for your home" says plainly that its forecast line is the **outdoor** model forecast | The heading "Today, for your home" (`MyHome.tsx:93`) sits above "Today: {verdict} · Model forecast · Open-Meteo · retrieved HH:MM" (`MyHome.tsx:120`, `planDisplay.ts:156`). The line shows no values and doesn't say "outdoor" | UI | M | S | L (DI) | S1 | Next |
| H3 | Visual rhythm for guide groups on My Home and Better Habits: a lucide icon per group (lucide is installed), a calmer card stack | Plain text cards, few accents (live capture) | UI | M | S | L | none | Next |
| H4 | Indoor readings | Not available; all air data is outdoor model data (13 §5) | DATA | M | L | H (DI) | 13 §5 "Indoor readings" | Later |
| H5 | An air purifier sizing calculator | None. It would need a sourced method | DATA | L | M | H (DI, claims) | 13 §5 | Later |

"Ask about this" on My Home cards is A10.

---

## 8. Better Habits (`/app/habits`)

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| B1 | A purpose / next-step line pair (R1) | An intro line: "We never show an emissions saving we can't calculate" (`BetterHabits.tsx:26-27`) | UI | M | S | L (CP-04) | none | Next |
| B2 | "I'll try this" on habit cards (the P4 mechanism, memory only) | None | FE | M | S | M (PR) | **Conflicts with 06 §4.6**, which keeps the tick off guide cards (Better Habits and the My Home library). Owner picks one | Next |
| B3 | Emissions savings with numbers | Qualitative only, by rule (AGENTS.md §6) | DATA | M | L | H (DI) | 13 §5 "Quantified emissions savings" | Later |
| B4 | A shareable community card (master guide `CommunityShareCard`, P2) | None | DEFER | L | M | M | none | Later |

Group visuals are H3. "Ask about this" is A10.

---

## 9. Insights (inside Today and Air quality details, never a destination)

This agrees with 06 §5: the word "Insights" is not used in the UI.

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| I1 | Past air trends ("this week") labelled as past model data | No past air data is requested or stored (`openMeteo.ts:69`) | DATA | M | L | H (DI: no gap filling) | 13 §5 "Air history"; owner data decision | Later |
| I2 | Yesterday versus today for air, like the weather table (J20) | Weather has yesterday; air does not. Whether Open-Meteo serves past air-quality model data is unverified | DATA | M | M | M (DI) | S1 (to verify) | Later |
| I3 | A check for the following 24 hours: `assessAir` on hours 25–48 of the series already fetched | The check covers the 24 hours from the current UTC hour, a rolling window, not a calendar day (`airCheck.ts:16-33`). The request is 48 hours from now (`openMeteo.ts:69`) | BE | H | M | M (DI: label it "the following 24 hours", never "tomorrow" or today's verdict; the window must have all 24 hours) | S1 | Next |
| I4 | Short sourced explainers (PM2.5 vs PM10, model vs observation, what the 24-hour limit means) as server-owned guide cards | Only limitation lines; no learning content (01 §8 LEARN) | BE | M | M | L | S11 (`routes/guides.ts` topic) | Next |
| I5 | A recap of saved plans ("cards that came up most") | Saved plans are listed only (`SavedPlansList.tsx`) | DEFER | L | M | M (snapshots are not current air) | S8 | Later |

---

## 10. My Profile (`/app/profile`)

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| M1 | Show "x of 10 answered" at the top of the household form (reusing `answeredCount`, which Ask already shows) | Three headed groups ("Your routine", "Your home", "Who lives with you") of 10 selects in a 3-column grid at 1440, all "Not answered" (`current/profile-1440.jpg`). No count on this page | UI | L | S | L (RG: form tests) | S8 | Next |
| M2 | Make the delete-everything button look different from Cancel | Still open: "the danger buttons" (`STAGE5_REPORT.md:107`). Not re-checked in code | UI | M | S | L | S8; 14 D4 (the existing `danger` token fails contrast on light, so a new token is needed first) | Now |
| M4 | More than one saved place | `SavedPreferences.place` holds a single place (`contracts.ts:320-336`) | BE | M | L | M (contract and migration; searched places only) | S8; 13 §5 | Later |
| M5 | Download my saved answers and plans as a file | None. The data already comes from existing GET routes | FE | L | S | L | S8 | Later |

---

## 11. Cross-cutting (every destination)

| ID | Feature | Today (OBSERVED) | Class | Value | Effort | Risk | Depends on | Priority |
|---|---|---|---|---|---|---|---|---|
| X1 | Shared Button, Card, Chip and Section primitives, plus spacing, radius and type tokens | No primitives. `card-surface` appears 34 times in 16 files. Only colour and animation tokens (01 D2) | UI | H | M | M (RG) | none | Later (critic pass: was Now. Doc 14 §4 defers it under the owner's "no extra abstractions" rule; tokens are added only when a phase needs them) |
| X2 | 44 px targets for the credit link on Today, Home, Habits and Profile | Open-Meteo.com is 117×17 px (live capture) | UI | L | S | L | S1 | Now |
| X3 | The place chip at 200 % text shows only its icons | Still open (`STAGE5_REPORT.md:76,107`). Not re-checked | UI | M | S | L | S3 | Now |
| X4 | Motion polish in CSS only, with reduced motion respected (08 §3.7) | CSS animations only (`index.css:180-225`) | UI | M | S | L | none | Next |
| X5 | Remove the remaining `focus()` calls without `preventScroll` | Reported in `AskBox.tsx`, `HelpChoices.tsx` and `Ask.tsx` (`STAGE5_REPORT.md:109`). `Ask.tsx:153` now passes `preventScroll`, so re-check the other two | UI | L | S | L | none | Next |
| X6 | A 3D or WebGL cityscape | SVG only; no runtime installed (08 §3.8) | DEFER | L | L | H (bundle, motion) | 13 §5 | Later |

---

## 12. Never build (from references and rules)

These items are not prioritised. They break a rule.

- **No AQI** numbers, bands, colour scales or toggles, and **no computed CPCB index** (AGENTS.md §5; 02 §5).
- **No demo or sample data** (DI-10, `REDESIGN_ACCEPTANCE_CRITERIA.md:241`; R2).
- **No dose, "cigarettes' worth" or CO₂ figures** without a documented method (AGENTS.md §6).
- **No "cleanest hours", "best time" or "safe to go out"** wording, and no yes/no verdicts (`askOutput.ts:16-17`).
- **No "live", "measured", "sensor" or "observed" wording** for model data.
- **No health-condition questions** in My Profile or Ask (`householdContext.ts:4-6`).
- **No pre-ticked actions.**
- **No sixth navigation item** (Insights, Daily Plan or Community).
- **No new component, chat or motion package** (shadcn/ui, Radix, assistant-ui, Motion, GSAP, three) (08 §1).
- **No fake streaming or typing effect** (master guide §8.3).

---

## 13. Conflicts this doc does not resolve

| # | Conflict | Rows | What the owner decides |
|---|---|---|---|
| C1 | The brief allows "AQI" only in "We don't calculate an AQI". `copy.spec.ts:20` and A7 also allow "CPCB National AQI", which the landing uses | L1 | Keep the allowance, or reword the landing and remove it from `copy.spec.ts` |
| C2 | The brief asks for feedback controls and a history feel. J7 (26 Nov) says no feedback, history or new chat "in this pass" | A13, A14, A15 | Whether J7 still stands |
| C3 | `today.ts:32` keeps the negated caveat "…does not mean the air is clean". The brief bans "clean air" (01 §9) | T2 copy | Keep the caveat or reword it |
| C4 | DI-04 says the default Today view shows no numbers. The day timeline shows PM2.5 ranges | P3 | Keep the timeline behind "See your full day", or change DI-04 |
| C5 | The live Today showed a rules plan; My Home, loaded 4 minutes later in its own context, said "Made with AI" (live capture) | P2 | Not a feature. Check the production Gemini and Claude plan-writer logs to see whether the fallback was transient |

---

## 14. Not verified

- Production state of optional keys (Gemini, Anthropic, FIRMS, Google, Supabase) and whether J26 will deploy as built.
- Whether Open-Meteo offers past air-quality model data (I1, I2).
- Effort figures are estimates from file sizes and test counts. No build or spike was run.
- The capture artifact in L9 has not been reproduced in a real browser by scrolling, printing or find-in-page.
- The hidden `aria-busy` subtree (T6) was seen in one headless run only.
- Contents of closed disclosures (Air quality details, "Why?" panels) were not viewed in the live captures. Where rows cite them, they rely on code.
- The Stage 5 open items (M2, X3, X5) are cited from `STAGE5_REPORT.md` and were not re-checked in code or in a browser.
- Not opened for this doc:
  - `04_EXISTING_COMPONENT_INVENTORY.md`;
  - `07_SCREEN_WIREFRAMES.md` (written in parallel);
  - `AirAware_Ask_AirAware_Chat_UI_Redesign_Spec.md`;
  - `WIREFRAMES.md` and `DESIGN_CONCEPTS.md`.
- Only parts of `06_INFORMATION_ARCHITECTURE.md` and the master guide (§8.4 and §9) were read.
