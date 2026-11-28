# 07 · Screen wireframes (low fidelity)

**Date:** 28 Nov 2026.
**Status:** this is a proposal. Nothing here is built, and no application file was changed.
**Structure source:** `06_INFORMATION_ARCHITECTURE.md`. Component names and line references come from `04_EXISTING_COMPONENT_INVENTORY.md`.
**Read with doc 14 (critic note, 28 Nov).** These frames show the structure from doc 06 and were drawn before the direction choice in doc 05. Where they differ, doc 14 sets what is built and when:
- Today's verdict here has no ledger. Doc 05 and 14 R3 add Direction A's ledger, if the owner allows numbers on the first screen (14 D3).
- §4 draws the N1 clock-band timeline inside the 60svh box. Doc 14 R4 removes the box (14 D13) and ships the simpler "Your day" strip first. N1 is "Later" (14 §4).
- R7 "How AirAware answers" is drawn as a `/privacy` link. Its location is still open (14 D12; 12 §4, 11 L3).

**Live reference:** captures of 28 Nov in `audit/screenshots/redesign-2026-11-28/current/`. I opened `today-390.jpg`, `today-1440.jpg`, `ask-390.jpg`, `home-390.jpg` and `landing-390-reduced-motion.jpg`. Habits and Profile are drawn from code and from the live-capture digest, and are labelled that way.

## How to read the frames

- **Two frames per screen:**
  - **Phone** is 390 px wide and drawn mobile-first. It must also hold at 320 px: everything stacks, with no sideways scroll.
  - **Desktop** is 1280 px wide; 1440 px uses the same layout in a wider gutter (`max-w` container).
  - 768 px uses the phone order with the nav in the header (OBSERVED `AppNav.tsx`, from `md`).
- **Heights are not to scale.** `╞══╡` marks the phone fold at the top of the bottom bar, about y 787 at 390×844 (as in WIREFRAMES of 24 Nov §1).
- **Text in frames** is the shipped string, quoted exactly. New strings are marked **[N]** and need owner OK (CP-04).
- **Placeholders:**
  - `HH:MM` stands for a time;
  - `{Day}` stands for a weekday;
  - `{a}–{b} µg/m³` stands for a model value range taken straight from the forecast hours.
  - There are no invented values.

| Mark | Meaning |
|---|---|
| **[E]** | EXISTING. Shipped as it is (restyle allowed). |
| **[C]** | CHANGED. Shipped, but moved, re-grouped or given a new behaviour. |
| **[N]** | NEW. Does not exist. Needs owner OK. |
| `[Check My Air]` | The single filled teal action on the screen. |
| `(Not now)` | Outlined button, at least 44 px tall. |
| `‹Within the limit›` | Level tag: a border plus a word, never colour alone. |
| `▸` / `▾` | Closed / open `<details>`. |
| `[◉ Pune ▾]` | `PlaceChip`. |
| `~~~` | `CitySkyline`: decorative, `aria-hidden`. |
| `◂` | Note. |

**Shared app frame [E], for every app page except Landing:**
- **Header** (navy): logo, `PlaceChip`, then `AppNav` from `md`.
- **Phone nav:** a fixed bottom bar with the 5 items.
- **Backdrop:** the `CitySkyline` sky and city.
- **Cards:** `card-surface` (J22).
- **Footer card:**
  - "Background: model forecast for {place}. {tag}.";
  - the Open-Meteo / CAMS attribution;
  - Privacy;
  - on Ask with a place, a credit line inside the composer instead (J16).

None of these change.

---

## 1. Landing (`/`)

OBSERVED order (`landing-390-reduced-motion.jpg`, `Landing.tsx:181-409`): hero, past Today screenshot, 01 Understand your air, What AirAware helps with, 02 Explainable AI, 03 My Home and Better Habits, How AirAware works, closing, footer. The proposal keeps this order and adds one journey strip.

### Phone 390

```text
┌──────────────────────────────────────────┐
│ AirAware AI                              │ ◂ [E] dark page, no app shell
│ The air around you matters.              │ ◂ [E] H1
│ Understand your city's air quality.      │ ◂ [E]
│ Discover smarter daily routines. …       │
│ [Check My Air]                           │ ◂ [E] the one teal action
│ (Meet Your Assistant)                    │ ◂ [E]
│ Or search a city                         │ ◂ [E] LocationSearch
│ [e.g. Pune, India________] (Search)      │
│ A past screenshot of Today for Pune,     │ ◂ [E] caption above the image (DI-10)
│ 22 Nov 2026. Open the app for current    │
│ values.                                  │
│ ┌ phone image ┐                          │ ◂ [E] today-phone.jpg
│ ~~~~~~~~~~~~ skyline ~~~~~~~~~~~~        │ ◂ [E] HeroSkyline (static SVG)
╞══════════════════════════════════════════╡
│ Understand → Ask → Get guidance →        │ ◂ [N] journey strip, 5 short steps, text only
│ Take action → Learn                      │   (N4; wraps at 320; not a nav)
│ 01 Understand your air                   │ ◂ [E]
│ What AirAware helps with  (4 tiles)      │ ◂ [E] CHOICES
│ 02 Explainable AI                        │ ◂ [E] ExampleCard → PlanCard, Why? open
│ 03 My Home and Better Habits (2 cards)   │ ◂ [E]
│ How AirAware works (4 steps)             │ ◂ [E]
│ Forecasts are model estimates, not       │ ◂ [E] verbatim; "AQI" wording is owner
│ station measurements, and not the CPCB   │   question O-7 (06 §10)
│ National AQI.                            │
│ Official CPCB observations are not       │ ◂ [E]
│ connected yet.                           │
│ [Check My Air]                           │ ◂ [E] closing action (repeat of the hero's)
│ footer · attribution · Privacy           │ ◂ [E]
└──────────────────────────────────────────┘
```

### Desktop 1280

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI                                                                          │
│ The air around you matters.                         ┌ past Today screenshot ┐        │ ◂ [E] two columns
│ Understand your city's air quality. …               │ caption above image   │        │
│ [Check My Air] (Meet Your Assistant)                └───────────────────────┘        │
│ [e.g. Pune, India_____________] (Search)                                             │
│ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ skyline ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Understand ─ Ask ─ Get guidance ─ Take action ─ Learn                                │ ◂ [N] one row
│ 01 Understand your air        │ What AirAware helps with: 4 tiles in a row           │ ◂ [E]
│ 02 Explainable AI: rule card, Why? open                                              │ ◂ [E]
│ 03 Improve indoor air  │  Sustainable everyday choices                               │ ◂ [E]
│ How AirAware works: 01 CAMS → 02 Open-Meteo → 03 AirAware server → 04 Your screen    │ ◂ [E]
│ closing lines · [Check My Air] · footer                                              │ ◂ [E]
└──────────────────────────────────────────────────────────────────────────────────────┘
```

| Element | Component (04) | Status |
|---|---|---|
| Hero, search | `Landing` hero, `LocationSearch`, `HeroSkyline`, `SKYLINE` | E |
| Help tiles | `CHOICES` (`helpChoices.ts`) | E |
| Example cards | `ExampleCard` → `PlanCard`, `landingExamples.ts` | E |
| Journey strip | none. A static list inside `Landing`. | N |

**Notes:**
- The full-page `.reveal` blank area (`landing-390.jpg`) is a capture artefact of the scroll timeline, not a design.
- The **R8** item in `02` asks for content that always renders. That applies to Landing's `.reveal` only if the owner wants it.

---

## 2. Today (`/app`)

The OBSERVED order (`AppShell.tsx:406-567`, `today-390.jpg`) is kept. Changes:
- **N2:** a link under the verdict.
- **N1:** the timeline inside the full day (frame §4).
- **N3:** "Next:" at the end (this extends `02` R1).
- **R4:** "Ask about this" inside "Why?".

### Phone 390 (ready, within the limit)

```text
┌──────────────────────────────────────────┐
│ AirAware AI                  [◉ Pune ▾]  │ ◂ [E]
│ Good afternoon                           │ ◂ [E] greeting(now)
│ Today in Pune, Maharashtra               │ ◂ [E] H1, focus target
│┌────────────────────────────────────────┐│ ◂ [E] TodayLead
││ Weather for {Day}, HH:MM GMT+5:30: …   ││
││ Forecast within India's 24-hour limits ││ ◂ [E] largest text
││ ‹Within the limit›                     ││
││ Model forecast · Open-Meteo ·          ││ ◂ [E] never folded
││ retrieved HH:MM                        ││
││ Being within the national limit does   ││ ◂ [E] verbatim (O-7)
││ not mean the air is clean or free of   ││
││ risk.                                  ││
││ How the 24-hour check works →          ││ ◂ [N] N2: opens Air quality details at
│└────────────────────────────────────────┘│   that section; 44 px row
│┌────────────────────────────────────────┐│ ◂ [E] DailyPlanSection
││ Your recommendation for today          ││
││┌──────────────────────────────────────┐││ ◂ [E] PlanCard level 3
│││ Cut indoor smoke at the source       │││
│││ Incense, mosquito coils, candles and │││
│││ tobacco all add smoke indoors. …     │││
│││ ▸ Why?                               │││
││└──────────────────────────────────────┘││
╞══════════════════════════════════════════╡
││ Made by our rules. General information ││ ◂ [E] made-by + safety note
││ only, not medical advice. Follow local ││
││ public-health advisories.              ││
││ ▾ See your full day                    ││ ◂ [E] open, 60svh box (O-3) → frame §4
│└────────────────────────────────────────┘│
│ Weather · Open-Meteo model data (table)  │ ◂ [E] WeatherCompare; hidden when stale
│ Fire hotspots nearby                     │ ◂ [E] FireHotspots; caveat kept
│ What would you like help with? (4)       │ ◂ [E] HelpChoices
│ (Make it personal: 2 quick questions)    │ ◂ [E] only with no answers
│ (Not now)                                │
│ Ask AirAware anything                    │ ◂ [E] AskBox + CyclingHint (J18)
│ [__________________________] [Send]      │
│ (Can I go for a morning walk today?) …   │
│ ▸ Air quality details                    │ ◂ [E] AirDetails, closed
│ Next: (Ask about your day →)             │ ◂ [N] N3, outlined
│ footer card                              │ ◂ [E]
│ [Today]  Ask   Home   Habits   Profile   │ ◂ [E] AppNav
└──────────────────────────────────────────┘
```

Note: on the shipped Today the only teal control is the Ask box's "Send" (OBSERVED, `today-1440.jpg`). The proposal adds no teal.

### Desktop 1280

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI  [◉ Pune, Maharashtra ▾]       [Today] Ask AirAware  My Home  …  Profile │ ◂ [E]
│ Good afternoon / Today in Pune, Maharashtra                                          │
│ ┌ TodayLead (3fr) ──────────────────────────┐ ┌ DailyPlanSection (2fr) ────────────┐ │ ◂ [E] grid
│ │ Weather for … · verdict · tag · provenance│ │ Your recommendation for today      │ │
│ │ caveat · How the 24-hour check works → [N]│ │ PlanCard · ▸ Why?                  │ │
│ └───────────────────────────────────────────┘ │ made-by + safety note              │ │
│ ┌ WeatherCompare ───────────────────────────┐ │ ▾ See your full day                │ │
│ │ Yesterday | Today | Tomorrow              │ │   Plan for … / timeline [N] /      │ │ ◂ frame §4
│ └───────────────────────────────────────────┘ │   topics / Save plan               │ │
│ ┌ FireHotspots ─────────────────────────────┐ │                                    │ │
│ └───────────────────────────────────────────┘ └────────────────────────────────────┘ │
│ What would you like help with?  [Outdoor] [My home] [My family] [Better habits]      │ ◂ [E]
│ (Make it personal: 2 quick questions) (Not now)                                      │ ◂ [E]
│ Ask AirAware anything [____________________________________________] [Send]          │ ◂ [E]
│ ▸ Air quality details                                                                │ ◂ [E]
│ Next: (Ask about your day →)                                                         │ ◂ [N]
│ footer card                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Today: state frames (phone, verdict area only)

```text
STALE                                   FORECAST ERROR                       INCOMPLETE CHECK
┌──────────────────────────────────┐   ┌──────────────────────────────┐    ┌────────────────────────────┐
│ Forecast within India's 24-hour  │   │ We couldn't load the forecast│    │ Air information unavailable│
│ limits  ‹Within the limit›       │   │ Forecast provider unavailable│    │ ‹No data›                  │
│ Model forecast · Open-Meteo ·    │   │ (Try again)                  │    │ Model forecast · … HH:MM   │
│ retrieved HH:MM                  │   └──────────────────────────────┘    │ We could not get a complete│
│█ Not current: retrieved more than│   plan: builds; "Air information     │ 24-hour forecast …         │
│█ an hour ago… (Reload forecast) █│   is unavailable for this plan."     └────────────────────────────┘
└──────────────────────────────────┘   weather table hidden; timeline     timeline hidden (no window)
plan: "The forecast behind this plan    hidden
is more than an hour old."
weather table + timeline hidden
```

| Element | Component (04) | Status |
|---|---|---|
| Title block | inline in `AppShell` (extract to `TodayPage`, `04` §11) | E (C if extracted, no visual change) |
| Verdict | `TodayLead`, `StaleBanner`, `today.ts` | E |
| N2 link | a link that opens `AirDetails` and focuses its method heading | N |
| Recommendation | `DailyPlanSection`, `PlanCard` | E |
| Weather, fires | `WeatherCompare`, `FireHotspots` | E |
| Help, invite, Ask box | `HelpChoices`, invite markup, `AskBox`, `CyclingHint` | E |
| Details | `AirDetails` → `AirReadout`, `ForecastPanel`, `ForecastChart`, `SourcesPanel` | E |
| Next link | none. An outlined link using the existing button class. | N |
| States | `TodayLeadLoading`, `ErrorState`, `Loading` | E |

---

## 3. Ask AirAware (`/app/ask`)

OBSERVED: `ask-390.jpg`, `Ask.tsx`. The live intro still reads "Answers come from AirAware's rules and today's forecast". The local source has the J26 line (`ask.ts:56-57`), and the frames draw the **local** string. The 896 px column (J25), the pinned composer (J17), the context lines shown once (J23) and the copy button stay. Feedback, history, streaming and "new chat" stay out (J7).

### Phone 390, empty

```text
┌──────────────────────────────────────────┐
│ AirAware AI                  [◉ Pune ▾]  │
│ Ask AirAware                             │ ◂ [E] H1
│ Claude (Anthropic) reads your question   │ ◂ [E] J26 intro (local; live shows the older line)
│ and answers from AirAware's rules and    │
│ today's forecast.                        │
│ (How AirAware answers →)                 │ ◂ [N] R7 → /privacy#how-airaware-answers
│ Using:                                   │ ◂ [C] R3: same facts as chips, Edit kept
│ ‹Pune model forecast · retrieved HH:MM›  │
│ ‹0 of 10 household questions answered›   │
│ (Edit)                                   │ ◂ [C] was 25×17 px text link → 44 px target
│┌────────────────────────────────────────┐│
││ How can I help you today?              ││ ◂ [E] J25
││ (Can I go for a morning walk today?)   ││ ◂ [E] 4 StarterButtons
││ (Is it a good idea to open my windows?)││   (wording note O-8)
││ (How can I improve my indoor air?)     ││
││ (How can I reduce pollution while      ││
││  commuting?)                           ││
││ ▸ More topics                          ││ ◂ [E] TopicChips (6) + 5th starter
│└────────────────────────────────────────┘│
│┌ composer, pinned ──────────────────────┐│ ◂ [E] J17: pinned from the start on phones
││ Ask about your air, home or day        ││
││ [Ask about your air, home or daily   ] ││ ◂ [E] fixed placeholder (J25), 200 chars
││ [routine…                            ] ││
││                               [Send]   ││ ◂ [E] teal, disabled while empty
││ Forecasts: Open-Meteo.com (CC BY 4.0), ││ ◂ [E] J16 credit
││ based on CAMS · Privacy                ││
│└────────────────────────────────────────┘│
│ Today  [Ask]  Home   Habits   Profile    │
└──────────────────────────────────────────┘
```

### Phone 390, after an answer

```text
┌──────────────────────────────────────────┐
│ ── Conversation (region) ──              │ ◂ [E]
│                 Can I go for a morning ▐ │ ◂ [E] your message
│                 walk today?            ▐ │
│ AirAware                                 │ ◂ [E] AskEntry label
│ {first sentence, largest text}           │ ◂ [E] Claude answer or rules answer
│ {rest of summary}                        │
│ ┌ PlanCard ─────────────────────────────┐│ ◂ [E] ≤ 3 approved cards
│ │ Check conditions before outdoor       ││
│ │ exercise · ▸ Why?                     ││
│ └───────────────────────────────────────┘│
│ Made with AI                             │ ◂ [E] or "Made by our rules" (AskEntry.tsx:191)
│ Based on: Forecast within India's        │ ◂ [E] AirLine (AskEntry.tsx:104)
│ 24-hour limits · Model forecast ·        │
│ Open-Meteo · retrieved HH:MM             │
│ {caveat} · {safety note}                 │ ◂ [E] context lines: first answer, then
│ ▸ Sources and limitations                │   only on change (J23); closed (J11)
│ [⧉] Copy answer                          │ ◂ [E] CopyAnswer; tooltip on focus too (08 doc)
│ One question so I can be more specific:  │ ◂ [E] question back + options + Skip
│ You could also ask: (…) (…)              │ ◂ [E] fixed starters (J26: non-AI)
│ ┌ composer, pinned ┐                     │ ◂ [E]
└──────────────────────────────────────────┘
```

### Desktop 1280

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ header + nav                                                                         │
│                 ┌──────── 896 px column, centred (J15/J25) ───────────┐              │
│                 │ Ask AirAware                                        │              │
│                 │ Claude (Anthropic) reads your question … forecast.  │              │
│                 │ (How AirAware answers →) [N]                        │              │
│                 │ Using: ‹Pune model forecast · HH:MM› ‹0 of 10 …›    │ ◂ [C] R3     │
│                 │        (Edit)                                       │              │
│                 │ How can I help you today?  4 starters · ▸ More topics              │
│                 │ ── Conversation ──                                  │              │
│                 │ composer (pinned after the first question, J17)     │              │
│                 └─────────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**States:**
- **No place:** `LocationSearch` plus `UseMyLocation` in a panel, with the footer card kept.
- **Thinking:** an `aria-busy` entry, and Send rests.
- **Error:** "We couldn't answer that" plus (Try again).
- **Claude failure:** the rules answer is shown with no visible error (J26 D4).
- **Medical question:** no AI is called.
- **Stale:** "Not current" on every answer (J23).
- **R4 pre-fill:** arriving from "Ask about this", the composer holds the text and has focus. **Nothing is sent** until Send.

| Element | Component (04) | Status |
|---|---|---|
| Page | `Ask` | E |
| Using chips | the existing "Using" line, re-laid as chips (no new data) | C |
| Starters, topics | `StarterButtons`, `TopicChips`, `ask.ts` | E |
| Thread | `AskEntry`, `Answer`, `AirLine`, `CopyAnswer`, `PlanCard` | E |
| State | `useAsk` (owned by `AppShell`) | E. Pre-fill needs one new `draft` value in shell memory. |
| How AirAware answers link | a link | N |

---

## 4. Daily Plan (inside Today → "See your full day")

This is where the plan stays (`06` §4). The timeline is **N1**: a deterministic presentation of `ForecastSeries.hours` in the place's clock (`weather.utcOffsetSeconds`). Its window is the 24-hour check's own: 24 hours from the UTC hour containing "now" (`airCheck.ts:23-34`). It needs one new prop on `DailyPlanSection`, the `ForecastData` that `AppShell` already holds (`06` §4.3).

**Example timing.** Retrieved at 15:38 IST. The window starts at 10:00 UTC, which is **15:30 IST**: in India each hourly value starts at HH:30 local time. There are **no verdicts per band** and no limit lines (`ForecastChart.tsx:11-12`). All values are placeholders.

**Default view (the full day starts open).** Band labels and cards only, with **no numbers**. The PM2.5 and PM10 ranges sit behind one closed disclosure (`06` §6; O-9).

### Phone 390, AI plan (periods present)

```text
││ ▾ See your full day                    ││ ◂ [E] open; 60svh scroll box (O-3)
││┌──────────────────────────────────────┐││
│││ Plan for Pune, Maharashtra           │││ ◂ [E]
│││ {AI summary}                         │││ ◂ [E] AI plans only
│││ Made with AI ({model}, prompt {v}).  │││ ◂ [E] madeByLine
│││ The advice text and sources come     │││
│││ from our fixed rules.                │││
││└──────────────────────────────────────┘││
││ The hours behind today's 24-hour check ││ ◂ [N] heading; times are place time
││ ▸ Model values for these hours         ││ ◂ [N] closed; contents below
││ ┌ Afternoon · from 15:30 ────────────┐ ││ ◂ [N] band; started band says "from"
││ │ ┌ PlanCard (period: daytime) ────┐ │ ││ ◂ [E] card placed by its AI period
││ │ │ Check conditions before outdoor│ │ ││
││ │ │ exercise · For you: … · ▸ Why? │ │ ││
││ │ │ (I'll try this)                │ │ ││ ◂ [N] R6, aria-pressed, memory only
││ │ └────────────────────────────────┘ │ ││
││ └────────────────────────────────────┘ ││
││ ┌ Evening · 17:30–20:30 ─────────────┐ ││ ◂ real hour starts, not rounded
││ │ (cards with period: evening)       │ ││
││ └────────────────────────────────────┘ ││
││ ┌ {Day} Morning · 06:30–11:30 ───────┐ ││ ◂ next-day bands carry the weekday
││ │ (cards with period: morning)       │ ││
││ └────────────────────────────────────┘ ││ ◂ Night and the last Afternoon hold no
││                                        ││   card, so in default view they are not
││                                        ││   drawn as rows (they still list values
││                                        ││   in the disclosure)
││ Any time today                         ││ ◂ [N] heading
││  ‹Commute› Consider a lower-traffic    ││ ◂ [C] period chip kept from "Your day"
││  route or time · ▸ Why?                ││
││  ‹At home› Run your air purifier …     ││
││ Outdoors and travel                    ││ ◂ [E] topics; banded items repeat compact
││ Indoor air                             ││
││ Sustainable swaps                      ││
││ General information only, not medical  ││ ◂ [E] safetyNote
││ advice. Follow local public-health     ││
││ advisories.                            ││
││ (Save plan)                            ││ ◂ [E] outlined; SAVE_PLAN_NOTE
```

### "Model values for these hours", opened (any plan)

```text
││ ▾ Model values for these hours         ││ ◂ [N]
││ PM2.5 model forecast: {a}–{b} µg/m³,   ││ ◂ [N] chart.ts summarize wording, formatted
││ highest around {Day} HH:MM.            ││   in place time
││ PM10 model forecast: {a}–{b} µg/m³,    ││ ◂ both pollutants of the 24-hour check
││ highest around {Day} HH:MM.            ││
││ Model forecast · Open-Meteo ·          ││ ◂ [E] provenance string, repeated here
││ retrieved HH:MM                        ││
││ Afternoon from 15:30: PM2.5 {a}–{b},   ││ ◂ [N] one text row per band, µg/m³;
││   PM10 {a}–{b} µg/m³                   ││   no tag, no colour, no limit
││ Evening 17:30–20:30: …                 ││
││ Night 21:30–05:30: … · 2 hours without ││ ◂ missing hours counted, never filled
││   a value                              ││
││ {Day} Morning 06:30–11:30: …           ││
││ {Day} Afternoon 12:30–14:30: …         ││ ◂ ends at the window's last hour
```

### Phone 390, rules plan (live case: "Made by our rules. AI personalisation is unavailable right now.")

```text
││ Plan for Pune, Maharashtra             ││ ◂ [E]
││ Made by our rules. AI personalisation  ││ ◂ [E] observed live (today-390.jpg)
││ is unavailable right now.              ││
││ The hours behind today's 24-hour check ││ ◂ [N]
││ ▸ Model values for these hours         ││ ◂ [N] no band rows: no card has a period
││ Outdoors and travel                    ││ ◂ [E] all cards stay in their topics
││   No suggestions in this area for your ││ ◂ [E] emptyTopic
││   answers today.                       ││
││ Indoor air                             ││
││   Cut indoor smoke at the source …     ││ ◂ [E] PlanCard + (I'll try this) [N]
││ Sustainable swaps                      ││
││ safety note · (Save plan)              ││ ◂ [E]
```

### Desktop 1280

The full day sits in the right column (2fr) of Today, as shipped (`today-1440.jpg`). The bands stack in the same way. From `xl` they may show as a 2×2 grid of band cards, each at least 18rem wide. That grid is a layout proposal only, and the order stays chronological in the DOM.

**When the timeline is hidden** (it falls back to the shipped layout, with the topics only):
- the forecast is stale;
- the forecast errored or the plan has no forecast;
- the check level is `unknown`;
- `weather` is null (no place offset);
- the plan's `air.windowStart` differs from the forecast on screen;
- the plan is a saved snapshot in My Profile.

| Element | Component (04) | Status |
|---|---|---|
| Plan header, topics, safety note, Save | `PlanView`, `PlanCard`, `planDisplay.ts` (`groupPlan`, `madeByLine`), `DailyPlanSection` | E |
| Timeline | new `DayTimeline` rendered in `DailyPlanSection` above `PlanView`; one new optional `forecast` prop passed from `AppShell`; it uses `chart.ts` (`valueRuns`, plus `summarize` wording with a place-time formatter), `forecast.ts`, and the `Part` pattern | N |
| Any time today | `groupPlan` output re-grouped: `commute` and `home` items | C |
| I'll try this | a toggle on `PlanCard` (new optional prop) | N |

---

## 5. My Home (`/app/home`)

OBSERVED: `home-390.jpg`, `MyHome.tsx`. Intro: "Indoor suggestions look at what you cook with and what burns inside, as well as the air outside." Groups seen live: Cooking and smoke, Ventilation, Dust and cleaning, Filtration. The code also has "Indoor habits" and "Near a busy road" (`guides.ts:219-227`), which are hidden when a card duplicates today's plan or an answer.

### Phone 390

```text
┌──────────────────────────────────────────┐
│ My Home                                  │ ◂ [E] H1
│ Indoor suggestions look at what you cook │ ◂ [E]
│ with and what burns inside, as well as   │
│ the air outside.                         │
│┌────────────────────────────────────────┐│
││ Today, for your home                   ││ ◂ [E] from PlanReport
││ Today: Forecast within India's 24-hour ││ ◂ [E] planAirLine; never "indoor" values
││ limits · Model forecast · Open-Meteo · ││
││ retrieved HH:MM                        ││
││ ┌ PlanCard: Cut indoor smoke at the  ┐ ││ ◂ [E]
││ │ source · ▸ Why?                    │ ││
││ │   └ (Ask about this)               │ ││ ◂ [N] R4, inside the open Why? panel
││ │ (I'll try this)                    │ ││ ◂ [N] R6, same memory state as Today
││ └────────────────────────────────────┘ ││
││ Made with AI. General information only,││ ◂ [E]
││ not medical advice. …                  ││
││ (See your full day on Today →)         ││ ◂ [N] cross-link
│└────────────────────────────────────────┘│
╞══════════════════════════════════════════╡
│┌────────────────────────────────────────┐│
││ Ways to improve indoor air             ││ ◂ [E] GuideGroups level 2
││ Cooking and smoke (2 cards)            ││
││ Ventilation · Dust and cleaning ·      ││
││ Filtration (each card ▸ Why?)          ││
││ General information only, not medical  ││ ◂ [E]
││ advice. Follow local public-health     ││
││ advisories.                            ││
│└────────────────────────────────────────┘│
│ Next: (Habits that cut smoke →)          │ ◂ [N] N3
│ footer card                              │
│ Today  Ask  [Home]  Habits  Profile      │
└──────────────────────────────────────────┘
```

### Desktop 1280

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ My Home · intro                                                                      │
│ ┌ Today, for your home (full width) ── air line · PlanCard(s) · made-by · link [N] ┐ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ Ways to improve indoor air ───────────────────────────────────────────────────────┐│
│ │ Cooking and smoke │ Ventilation │ Dust and cleaning │ Filtration  (subgrid cards) ││ ◂ [E] GuideGroups subgrid
│ └───────────────────────────────────────────────────────────────────────────────────┘│
│ Next: (Habits that cut smoke →) [N]                                                  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**States** (`PlanReport`):
- **none:** no place, so guides only.
- **building:** `Loading`.
- **error:** retry.
- **stale:** "The forecast behind this plan is more than an hour old." and no cards.
- **ready with no indoor card:** "No suggestions for your answers today."
- **guides error:** `ErrorState`.

The wireframe never labels an outdoor value as indoor.

| Element | Component (04) | Status |
|---|---|---|
| Page | `MyHome` (shaped skeletons replace hard-coded heights, `04` §11) | E / C |
| Plan part | `PlanCard`, `planAirLine`, `PlanReport` | E |
| Guides | `GuideGroups`, `PlanCard` | E |
| Ask about this, I'll try this, links | small additions to `PlanCard` and the page | N |

---

## 6. Better Habits (`/app/habits`)

OBSERVED in code (`BetterHabits.tsx:18-32`, `guides.ts:232-240`) and in the live-capture digest. I did not open `habits-390.jpg` myself.

### Phone 390

```text
┌──────────────────────────────────────────┐
│ Better Habits                            │ ◂ [E] H1
│ Practical habits that cut pollution for  │ ◂ [E] verbatim
│ you and your neighbours. We never show   │
│ an emissions saving we can't calculate.  │
│┌────────────────────────────────────────┐│
││ Daily commuting and vehicle idling     ││ ◂ [E] GuideGroups level 2
││ ┌ Combine trips and avoid idling ────┐ ││
││ │ … · ▸ Why?                         │ ││
││ │   └ (Ask about this)               │ ││ ◂ [N] R4: pre-fills Ask, does not send
││ └────────────────────────────────────┘ ││ ◂ no "I'll try this" on guide cards (06 §4.6)
││ Waste · Cooking · Energy use           ││ ◂ [E] 6 cards total, qualitative only
│└────────────────────────────────────────┘│
│ Next: (Make it personal →)               │ ◂ [N] N3 → My Profile
│ footer card                              │
│ Today  Ask  Home  [Habits]  Profile      │
└──────────────────────────────────────────┘
```

### Desktop 1280

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Better Habits · intro (max-w-prose)                                                  │
│ ┌ Commuting and idling │ Waste │ Cooking │ Energy use  (subgrid of PlanCards) ──────┐ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ Next: (Make it personal →) [N]                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**States:**
- Loading: "Loading guides".
- Error: "We couldn't load the guides" / "Something went wrong loading the guides." with (Try again).

**Rule:** no savings figures, CO₂ numbers or percentages (AGENTS.md §6).

| Element | Component (04) | Status |
|---|---|---|
| Page, groups | `BetterHabits`, `GuideGroups`, `PlanCard` | E |
| Ask about this, Next | additions | N |

---

## 7. My Profile (`/app/profile`)

OBSERVED in code (`Profile.tsx:74-100`, `HouseholdPreferencesForm.tsx:236-330`, `SavedPlansList.tsx:17-24,144`, `householdFields.ts:14-17`) and in the live-capture digest. I did not open `profile-390.jpg` myself.

### Phone 390

```text
┌──────────────────────────────────────────┐
│ My Profile                               │ ◂ [E] H1
│┌ Your place (only when remembered) ─────┐│ ◂ [E]
││ Remembered place: Pune, Maharashtra    ││
││ (Forget this place)                    ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your household (optional)              ││ ◂ [E]
││ Answers make the daily plan fit your   ││ ◂ [E] verbatim; no health questions
││ routine and home. Every question is    ││
││ optional, and none asks about health   ││
││ conditions.                            ││
││ Your routine     (3 selects)           ││ ◂ [E] each "Not answered" by default
││ Your home        (4 selects)           ││
││ Who lives with you (3 selects)         ││
││ {SAVE_LINE}                            ││
││ [Save my answers]                      ││ ◂ [E] the one teal action
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Saved plans                            ││ ◂ [E] SavedPlansList
││ No saved plans yet. Use Save plan      ││ ◂ [E] verbatim; RECOMMENDED: "Today" as a
││ under See your full day on Today.      ││   link (C)
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your data                              ││ ◂ [E]
││ {SAVE_NOTE}                            ││
││ (Delete my saved data)                 ││ ◂ [E] confirm fieldset: "This deletes your
│└────────────────────────────────────────┘│   saved answers and plans from AirAware.
│ footer card                              │   It can't be undone."
│ Today  Ask  Home  Habits  [Profile]      │
└──────────────────────────────────────────┘
```

### Desktop 1280

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ My Profile                                                                           │
│ ┌ Your place (col-span 2, when remembered) ────────────────────────────────────────┐ │
│ ┌ Your household (optional), col-span 2: 3 fieldsets side by side · [Save my answers]┐│ ◂ [E] lg grid
│ ┌ Saved plans ─────────────────────┐ ┌ Your data ─────────────────────────────────┐  │
│ │ list · Open · Delete             │ │ note · (Delete my saved data)              │  │
│ └──────────────────────────────────┘ └────────────────────────────────────────────┘  │
│ opened plan: snapshot banner "…not current air information" · PlanView snapshot ·    │ ◂ [E] no timeline in
│ (Close) → focus back to its Open button                                              │   a snapshot (06 §4.1)
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**States:**
- **Saving not set up:** the `NOT_SET_UP` note, and Save is disabled.
- **Load failed:** "Your saved plans couldn't be loaded right now."
- **Delete failed:** "Nothing was deleted. Try again in a moment."
- **Deleted:** "Saved plan deleted."
- **Forget failed:** "Nothing was changed. Try again in a moment."

"I'll try this" ticks are **not** shown or stored here (memory only, `06` §4.6).

| Element | Component (04) | Status |
|---|---|---|
| Page | `Profile` | E |
| Form, Your data | `HouseholdPreferencesForm`, `householdFields.ts` | E |
| Saved plans, snapshot | `SavedPlansList`, `PlanView snapshot` | E |
| "Today" link in the empty text | the existing string, with one word linked | C |

---

## 8. Accessibility and layout checks every frame must pass (RECOMMENDED acceptance)

| Check | Applies to |
|---|---|
| No sideways scroll at 320, 390, 768, 1280 and 1440. The timeline bands stack at 320, and band labels wrap. | All |
| Targets at least 44 px. This fixes the observed under-sized "Edit" (25×17), Open-Meteo.com and Privacy links on Ask by giving them a block row or padding; the inline attribution link may use the WCAG inline exception if the owner accepts it. | Ask, footers |
| One teal action per screen. All [N] controls are outlined. | All |
| "Ask about this" and "I'll try this" are real `<a>` / `<button aria-pressed>` elements with visible focus, and the card title is in their accessible name. | Plan cards, guides |
| The timeline is a list of `<section>`s with headings. Values are in text, not bars only. Nothing relies on colour. | Daily Plan |
| No motion is added. Any band reveal follows the existing `motion-safe` pattern and stops under reduced motion. | Daily Plan |
| A banned-word grep of all [N] strings (safe, healthy, clean air, good air, bad air, AQI): none found in this doc's new strings. | All |

## 9. Supersedes / still stands (vs WIREFRAMES.md of 24 Nov)

| 24 Nov frame | This doc |
|---|---|
| §8–12 Today frames: "updated HH:MM", solid panels, "Why this recommendation?", "Greener habits" | Shipped strings now read "retrieved", "Why?" and "Better habits"; panels are `card-surface` (J22) |
| §13–14 Ask: box at the top, greeting panel, 3 starters | Pinned composer (J17), J25 starters, J26 intro |
| §15 My Home: "Why it matters" | "Why?" (E1) |
| §4 Landing: dropping the details capture, the mid-page "Check My Air" | Not re-proposed. Live Landing is drawn as shipped. |
| §5–7 Welcome, §19 Privacy and 404 | **Still stand**. Not redrawn here. R7 adds one section to Privacy. |

## 10. Not verified

- `habits-*.jpg`, `profile-*.jpg`, `ask-1440.jpg`, `home-1440.jpg` and `landing-1440-reduced-motion.jpg` were not opened by me.
- None of the state frames was seen rendered live; they come from code.
- The Ask answer state was not captured live (no question was typed).
- Band cut-offs, all [N] strings and the `xl` 2×2 band grid are untested proposals.
- No prototype was built or measured.
- **Ask fit was not measured.** The R3 chips, the larger Edit row and the R7 link add height above the starters. In `ask-390.jpg`, "More topics" already sits against the pinned composer. Fit at 390×844, 320×640 and 1280×720 must be checked against J10 (scroll padding) and J17 (pinning) before this is approved.
- The 06:00–11:59-style band labels assume India's +5:30 offset gives HH:30 hour starts. Places at a whole-hour offset were not considered beyond the formula.
- These designs were **not checked against modern-web-guidance** (`03` ruling 2).
