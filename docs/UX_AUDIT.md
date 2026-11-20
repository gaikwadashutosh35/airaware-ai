# AirAware AI: UX Audit (Phase 0)

**Date:** 20 Nov 2026. **Scope:** every route and component in `client/src`, inspected in code and in the running app. **No source code was changed.**

## How this was checked

- **The real app ran locally:** the `api` and `web` dev servers, with live Open-Meteo data, plus one daily plan built through the real AI path (Claude Haiku, because the local Gemini key is stale).
- **Screens checked:**
  - `/`, `/app` (no place), `/app` for Pune, `/app` after "Build my daily plan", and `/privacy`.
  - Each at 320×640, 768×1024 and 1280×720, with full-page and first-screen captures.
  - A 70-character place name at 320 px.
  - The loading, error, stale and no-place screenshots from Phase C.
- **Measured:**
  - page length in screens;
  - the y-position of key answers;
  - Tab presses to reach the plan;
  - controls under 44 px;
  - sideways scroll;
  - how often technical words appear.
- **Traced in code:** every page and feature's API calls, state, auth and tests (see "What the redesign must keep working").
- **Skills used:**
  - `airaware-ui`, the project workflow;
  - `emil-design-eng`, for polish and press feedback;
  - `mobile-native`, for phone platform tells.
- **Skills not used:**
  - **Unslop:** not installed in this environment, so skipped.
  - **Hallmark:** kept for the design phases. You named it for broader design decisions, which belong in Phase 1 onwards.

## The app today, in numbers

| Measure | Phone (320×640) | Desktop (1280×720) |
|---|---|---|
| `/app` length for Pune, before a plan | 9.0 screens | 3.8 screens |
| `/app` length after "Build my daily plan" | 13.5 screens | 7.0 screens |
| Where the PM2.5 figure sits | y 1002, screen 2 | y 778, below the first screen |
| Where "Build my daily plan" sits | y 4652, screen 8 | y 1770, screen 3 |
| Tab presses from the search box to "Build my daily plan" | 17 | 17 |
| Landing page length | 10.6 screens | 6.4 screens |
| Landing call-to-action buttons | 1, at the very bottom | 1, at the very bottom |
| Sideways scroll (all pages, and a 70-character place name) | none | none |

On the Pune view, "forecast" appears 16 times, "24-hour" 8, "model" 6, "CPCB" 5 and "PM2.5" 5. Every timestamp carries "GMT+5:30".

## What works and must stay

These are strengths. The redesign moves them; it does not remove them.

- **Honest data labels:**
  - "Model forecast" on every value;
  - a "Not current" banner when data is old;
  - CPCB never faked;
  - a 24-hour check against India's limits instead of an invented AQI.
- **Explainable advice:** every suggestion has a "Why?" with its reason, inputs, sources and caveat. This is the product's best feature, and it is hidden.
- **The scene:** the skyline shows the air check and this hour's weather at a glance. It is the closest thing the app has to "one clear situation".
- **Privacy by design:**
  - location only on request, rounded to about 1 km;
  - no account until the user presses Save;
  - delete everything in one step.
- **Accessibility base:**
  - axe tests on every page;
  - 44 px controls;
  - visible focus;
  - reduced motion respected;
  - a text summary for the chart.

---

## 1. The ten most important problems

They are ranked by how much they stop an ordinary person from getting an answer.

### P1. There is no plain answer to "How is the air today?"
- **Where:** `AirReadout`, at the top of `/app`.
- **Problem:** the main element is `PM2.5 56.9 µg/m³`. Most people can't read that number. The plain verdict, "within the 60 µg/m³ limit", sits in two small grey lines below it, and still uses units.
- **User impact:** people see a number but not a situation, so the core question goes unanswered.
- **Proposed improvement:**
  - Lead with one sentence built from the existing 24-hour check, for example "Forecast within India's 24-hour limits today". Keep its level tag, the "Model forecast" label and the time.
  - Add the existing caveat: being within the limit doesn't mean the air is clean or free of risk.
  - Move the PM2.5 figure into Air quality details.
- **Priority:** Critical. **Effort:** M (about 3 h). It reuses `airCheck`, which the server already returns.

### P2. The recommendation hides behind a button, 8 phone screens down
- **Where:** `DailyPlanSection` and `HouseholdPreferencesForm` on `/app`.
- **Problem:** nothing tells the user what to do until they scroll past the chart, the table and a 9-question form, then press "Build my daily plan" (17 Tab presses away).
- **User impact:** the app's most useful output, a ranked action with "Why?", is missed by most visitors.
- **Proposed improvement:**
  - Build the plan automatically once a place is chosen (see decision D3).
  - Show only its top suggestion under "Your recommendation for today", with the existing "Why?".
  - Put the full day behind "See your full day".
- **Priority:** Critical. **Effort:** M (about 4 h). It uses the existing endpoint and `PlanCard`.

### P3. On a phone, the first screen is a search form even after a place is chosen
- **Where:** the `Dashboard` header block.
- **Problem:** the H1 "Air quality near you", the search box and "Use my location" (with its hint) fill the whole first phone screen. The place's air starts on screen 2.
- **User impact:** returning users see input fields, not their air.
- **Proposed improvement:** once a place is set, show it as a compact place chip ("Pune, Maharashtra ▾") that opens the search and "Use my location". Show the full search only when no place is set.
- **Priority:** Critical. **Effort:** S–M (about 2 h).

### P4. Technical detail is shown to everyone by default
- **Where:** `AirReadout`, `ForecastPanel`, `ObservationPanel`, `SourcesPanel`.
- **Problem:** the default view shows:
  - a 48-hour chart and a 6-pollutant table;
  - "0.4° (~45 km) grid" and "Model run time not reported by the provider";
  - raw coordinates ("Forecast location: 18.52, 73.86");
  - an "Official observation: unavailable" card;
  - 3 sources with licences, and 7 limitations.
- **User impact:** an ordinary user scrolls through analyst content to find meaning, and the screen reads as a data portal.
- **Proposed improvement:** one collapsed **Air quality details** section holding all of it unchanged: values, units, chart, hourly table, provider, data kind, timestamps, the 24-hour method, resolution, the CPCB status, sources and limitations. The default view keeps a one-line provenance ("Model forecast · Open-Meteo · updated 08:15") and the stale banner.
- **Priority:** High. **Effort:** M (about 3 h). The parts move; they are not rewritten.

### P5. The same facts are repeated 3 to 6 times on one page
- **Where:** after a plan is built, on `/app`.
- **Problem:**
  - The 24-hour check appears 4 times: two readout lines, a table column, the plan's "Air notice" and the plan's "Air check".
  - "Model forecast, not a station measurement, not the CPCB AQI" appears about 6 times.
  - Plan cards appear under "Your day" and again as references under "Indoor air" and "Sustainable swaps".
  - The limitations list has near-duplicate pairs ("Model forecast, not a station observation" / "Forecasts are model estimates…"; "We do not calculate the CPCB National AQI" / "Not the CPCB National AQI").
  - "Saved on this browser only…" appears twice.
- **User impact:** repetition reads as noise and hides what is new.
- **Proposed improvement:**
  - State the air check once, at the top.
  - State the model and CPCB caveat once in the default view and once in the details.
  - Merge the duplicate limitations; drop the duplicate topic lists from the default view.
  - Nothing is lost: every statement stays in the details.
- **Priority:** High. **Effort:** S (about 2 h), plus test updates.

### P6. There is no navigation, and every feature sits in one long scroll
- **Where:** `App.tsx` (3 paths), and the `Dashboard` header (logo only).
- **Problem:**
  - Indoor advice, habits, household answers, saved plans and sources all live inside one page.
  - "Saved plans" appears only after a save.
  - There is no way to go straight to "my home" or "habits".
- **User impact:** people can't find features or form a picture of what the app does. Everything competes for the same screen.
- **Proposed improvement:** the 5-item navigation in section 3 (Today, Ask AirAware, My Home, Better Habits, My Profile): a bottom bar on phones and a top bar on desktop.
- **Priority:** High. **Effort:** M (about 4 h). It needs new paths, plus server and Netlify fallbacks.

### P7. The household form is a 9-question wall placed before the answer
- **Where:** `HouseholdPreferencesForm`, phone screens 5–7 of `/app`.
- **Problem:**
  - 9 dropdowns, all "Not answered", plus "Save my answers" and "Delete my saved data", even when nothing is saved.
  - Answers vanish on reload unless saved, and saving quietly creates an anonymous account.
  - There is no first-run flow.
- **User impact:** it feels like a form to fill before getting help, and the work is lost on refresh.
- **Proposed improvement:**
  - A short, skippable 3-step onboarding with tap-to-choose answers, mapped onto the same 10 fields.
  - The full form moves to My Profile.
  - Show "Delete my saved data" only when something is saved.
- **Priority:** High. **Effort:** M–L (about 5 h). It needs decision D2.

### P8. The landing page explains plumbing before benefits and has no early call to action
- **Where:** `Landing.tsx`.
- **Problem:**
  - The hero has a search box but no button.
  - The first chapter is "Where every number comes from" (CAMS model, Open-Meteo, server, grid size).
  - The only button, "Check your area's air quality", sits at the end of 10.6 phone screens.
  - There is no route into an assistant.
- **User impact:** visitors meet architecture before value, and many never reach the call to action.
- **Proposed improvement:** the 8-section story in your brief, with "How AirAware works" moved near the end, and hero buttons "Check My Air" and "Meet Your Assistant" kept beside the search.
- **Priority:** High. **Effort:** M (about 3 h). Most sections exist and are re-ordered and re-captioned.

### P9. The empty and first-run state is 5 screens of disabled parts
- **Where:** `/app` with no place.
- **Problem:**
  - It shows the household form, a disabled "Build my daily plan" ("Choose a place first.") and the full sources panel.
  - The new "Search for a place" card is good but sits among them.
- **User impact:** a first visit looks broken or demanding, not welcoming.
- **Proposed improvement:** with no place, show only onboarding step 1, "Where should we check air quality?", with search and "Use my location". Everything else appears after a place is chosen.
- **Priority:** Medium–High. **Effort:** S (about 1.5 h), within the onboarding work.

### P10. It feels like a website on a phone, not an assistant
- **Where:** global (`index.html`, `index.css`, all buttons).
- **Problem:**
  - No control has a press state: there are no `active:` styles anywhere. The only hover and transition is the colour change on the landing call-to-action.
  - The phone tap highlight is already removed by Tailwind's preflight (corrected in Phase 3), so a tap gives no feedback at all.
  - There is no `theme-color` and the favicon is blank (`data:,`).
  - "Inter" is named but never loaded, so phones show Roboto or SF, and Windows shows Segoe UI.
  - The header logo link is 28 px tall.
- **User impact:**
  - Taps give no feedback.
  - The brand looks different on every device.
  - The app doesn't feel installed or premium.
- **Proposed improvement:**
  - The mobile baseline: tap highlight, `touch-action`, hover gated to devices with fine pointers, a 16 px input floor (already met) and `theme-color` per scheme.
  - Press feedback through `:active` scale, at 100–160 ms.
  - A real favicon.
  - Self-hosted Inter (decision D5).
  - Safe-area padding for the new bottom bar.
- **Priority:** Medium. **Effort:** S–M (about 2.5 h).

---

## 2. All findings by category

**Priority:** C = Critical, H = High, M = Medium, L = Low. **Effort:** S under 2 h, M 2–5 h, L more than 5 h.

### 2.1 Information overload
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 1.1 | Pune view is 9–13.5 phone screens | `/app` | Tiring; answers buried | Today shows status, one action, 4 help choices, Ask; the rest is collapsed or on its own page (P4, P6) | C | M |
| 1.2 | Chart, 6-row pollutant table and 48-hour table shown by default | `ForecastPanel` | Analyst content up front | Into Air quality details (P4) | H | S |
| 1.3 | 3 sources × (status, licence, attribution) plus 7 limitations by default | `SourcesPanel` | Reads as legal small print | Into details; one provenance line by default | H | S |

### 2.2 Duplicate sections
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 2.1 | 24-hour check shown 4 times | readout, table, plan notice, plan check | Noise | Once at top; full table in details (P5) | H | S |
| 2.2 | Plan cards listed twice (by time of day, then by topic) | `PlanView` | Looks like more advice than there is | Default view by time of day; topics become the My Home / Better Habits pages | M | S |
| 2.3 | Near-duplicate limitations | `limitations.ts` and the forecast's limitations | Reads as padding | Merge to 4–5 distinct lines (wording reviewed with you, as it is data copy) | M | S |
| 2.4 | "Saved on this browser only…" twice | form and plan | Noise | Once, in My Profile | L | S |

### 2.3 Unnecessary statistics in the default view
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 3.1 | Raw coordinates "18.52, 73.86" | place bar | Meaningless to most; feels technical | Details only | M | S |
| 3.2 | NO₂, SO₂, O₃, CO values all marked "Not assessed" | `ForecastPanel` table | "Not assessed" next to numbers confuses | Details only, with one line on why they are not assessed | M | S |
| 3.3 | Model id and prompt version "claude-haiku-5-5, prompt daily-plan-v2" | `PlanView` made-by line | Jargon in the main answer | Keep "Made with AI" by default; ids into "Why?" or the details | M | S |

### 2.4 Confusing technical terms
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 4.1 | "PM2.5", "µg/m³", "24-hour average", "CAMS", "0.4° grid", "GMT+5:30" in the default view | readout, plan, landing | Not understood | Plain words by default ("fine particles", "today's forecast", "updated 08:15"), with exact terms kept in details. Data-kind labels stay word for word. | H | M |
| 4.2 | Chart marker "At load" | `ForecastChart` | Unclear | "Now" or "Loaded 08:15" (the chart moves to details) | L | S |
| 4.3 | Landing step cards open with "CAMS global model… grid about 45 km" | `Landing` | Architecture before value | Move to "How AirAware works", near the end | M | S |

### 2.5 Weak visual hierarchy
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 5.1 | Biggest text is a unit-bearing number, not a verdict | `AirReadout` | Wrong thing in focus | Verdict sentence is the largest text; the number goes into details (P1) | C | M |
| 5.2 | The H1 "Air quality near you" is generic, and the place is an H2 | `Dashboard` | The page never says "you are looking at Pune" | Greeting plus place as the heading ("Good morning · Pune, Maharashtra") | M | S |
| 5.3 | One primary teal button ("Build my daily plan") is the only accent in the app | `/app` | Nothing guides the eye to the answer | The recommendation card is the visual focus; the teal accent is used for one primary action per screen | M | S |

### 2.6 Too many cards
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 6.1 | Not the main issue: `/app` has 6 bordered panels; the problem is long stacked panels, not card grids | `/app` | n/a | Keep cards for real objects (a suggestion, a saved plan); use plain sections elsewhere | L | n/a |
| 6.2 | Landing pipeline uses 4 equal cards (a generic SaaS grid) | `Landing` | Looks templated | A numbered horizontal flow or diagram in "How AirAware works" | L | S |

### 2.7 Calls to action
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 7.1 | The opposite of repetition: the landing page has one button, at the end | `Landing` | Low conversion | Hero "Check My Air" and "Meet Your Assistant"; final CTA repeats "Check My Air" (P8) | H | S |
| 7.2 | Two save buttons with different meanings ("Save my answers", "Save plan") plus a delete, all on one page | form, plan | Unclear what is saved where | Answers saved in onboarding or Profile; "Save plan" stays on the plan; delete lives in Profile | M | S |

### 2.8 Navigation
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 8.1 | No navigation at all (logo plus a footer "Privacy" link) | all pages | Features not discoverable | 5-item navigation (P6) | H | M |
| 8.2 | Saved plans invisible until the first save | `SavedPlansList` | Feature unknown | Listed in My Profile, with an empty state | M | S |

### 2.9 Content grouping
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 9.1 | Indoor advice exists only inside a built plan | rules `indoor.*` (6 cards) | No place to learn "how do I improve my home's air" | My Home page grouped by Cooking and smoke, Ventilation, Filtration, Indoor habits | H | M |
| 9.2 | Habit advice is 2 cards inside a plan | rules `swap.*` | Thin and hidden | Better Habits page. **Content gap:** no rule covers energy use, or dust and cleaning (decision D4). | M | M–L |
| 9.3 | "Who lives with you" answers have no visible result except plan cards | form; `household.extra-caution`, `school.*` | Family needs feel unanswered | "My family" help choice opens family-focused questions in Ask AirAware | M | S |

### 2.10 User journeys
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 10.1 | No first-run journey; the landing search jumps straight into the full dashboard | `Landing` → `/app` | Overwhelming first visit | Landing → onboarding (3 short skippable steps) → Today | H | M |
| 10.2 | No question-led journey ("Can I go for a walk?") | n/a | Users must interpret data themselves | Ask AirAware (decision D1) | H | M–L |
| 10.3 | A returning visitor lands on a search form | `/app` | Repeats work | Remember the place (decision D2); Today opens with their place | H | S |

### 2.11 Empty and error states
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 11.1 | No-place state shows disabled form and plan | `/app` | Looks broken | Onboarding step 1 only (P9) | M | S |
| 11.2 | The "Official observation: unavailable" card is always shown | `ObservationPanel` | A permanent "missing" card | One line in details; never a card in the default view | M | S |
| 11.3 | Plan error says only "Something went wrong building your plan." | `DailyPlanSection` | No next step | Keep "Try again"; add "Your air status above is still current" so the page stays useful | L | S |
| 11.4 | Good as is: loading skeleton, titled error card, "Not current" banner, no-place card | Phase C | n/a | Keep; restyle only | n/a | n/a |

### 2.12 Mobile usability
| # | Current problem | Where | User impact | Proposed improvement | Pri | Effort |
|---|---|---|---|---|---|---|
| 12.1 | First phone screen is inputs (P3) | `/app` | No answer above the fold | Place chip | C | S |
| 12.2 | No press feedback (P10). Tailwind's preflight already removes the tap highlight, and Tailwind v4's `hover:` is already limited to devices that can hover. | global | Feels like a web page | Mobile baseline and `:active` | M | S |
| 12.3 | A bottom bar would need safe-area padding and `viewport-fit=cover`, absent today | `index.html` | Bar would sit under the home indicator | Add both with the bar | M | S |
| 12.4 | A 70-character place name wraps to 4 heading lines (no overflow) | place heading | Pushes content down | Smaller place line in the chip; full name in the heading only | L | S |
| 12.5 | Must be confirmed on a real phone: tap delay, safe areas, keyboard over inputs | n/a | Unknown | Phase 9 check on hardware (needs you or a USB-connected phone) | M | S |

---

## 3. Proposed information architecture

### 3.1 Site map

```
Public
  /                 Landing (8 sections)
  /privacy          Privacy

App (navigation on every page)
  /app              Today            — status, one recommendation, 4 help choices, Ask box, details (collapsed)
  /app/ask          Ask AirAware     — questions with answers from rules + current forecast
  /app/home         My Home          — indoor advice by group, each with "Why it matters"
  /app/habits       Better Habits    — commuting & idling, waste, cooking, (energy: content gap)
  /app/profile      My Profile       — household answers, saved plans, delete my data, privacy
  /app/welcome      Onboarding       — first run or no place; 3 skippable steps → Today
```

These are plain paths in the existing `App.tsx` switch, with no router library. The server (`app.ts`) and `netlify.toml` add each path to their `index.html` fallback. Old links keep working: `/app?place=…&lat=…&lon=…` still opens Today for that place.

### 3.2 Navigation

| | Phone (< 768 px) | Desktop |
|---|---|---|
| Form | Bottom bar, 5 items, icon plus text label (lucide-react, already installed), 44 px or more, safe-area padded | A restrained top bar: logo, the 5 items, place chip |
| Current page | `aria-current="page"` plus a filled icon and bold label (not colour alone) | Same |
| Items | Today · Ask · My Home · Habits · Profile | Today · Ask AirAware · My Home · Better Habits · My Profile |

### 3.3 Today, the default view (phone)

```
┌────────────────────────────────┐
│ AirAware     [Pune, MH ▾]      │  place chip opens search + "Use my location"
├────────────────────────────────┤
│ Good morning                   │
│ [ skyline scene ]              │  existing CitySkyline (status at a glance)
│ ● Forecast within India's      │  verdict from airCheck — largest text
│   24-hour limits today         │
│ Model forecast · Open-Meteo ·  │  provenance always visible
│ updated 08:15                  │
│ Within the limit doesn't mean  │  existing caveat, one line
│ the air is free of risk.       │
├────────────────────────────────┤
│ Your recommendation for today  │
│ ┌────────────────────────────┐ │
│ │ Cut indoor smoke at source │ │  plan's top featured card (PlanCard)
│ │ For you: …                 │ │
│ │ ▸ Why this recommendation? │ │  existing Why? (reason, inputs, sources)
│ └────────────────────────────┘ │
│ ▸ See your full day            │  rest of PlanView, collapsed; "Save plan" inside
├────────────────────────────────┤
│ What would you like help with? │
│ [Outdoor activities][My home]  │  Outdoor/Family → Ask with that topic
│ [My family][Greener habits]    │  Home → /app/home, Habits → /app/habits
├────────────────────────────────┤
│ Ask AirAware                   │
│ [ Can I go for a walk today? ] │  → /app/ask
│ (chip) Open my windows?  …     │
├────────────────────────────────┤
│ ▸ Air quality details          │  everything technical, unchanged (3.4)
├────────────────────────────────┤
│ Today  Ask  Home  Habits  Me   │  bottom bar
└────────────────────────────────┘
```

When the data is old, the "Not current" banner sits directly under the verdict. When data is unavailable, the verdict reads "Air information unavailable" and the recommendation falls back to the rules-only cards, as the server does today.

### 3.4 Progressive disclosure

| Default view (what's happening, what to do, why) | Air quality details (collapsed `<details>`, one tap) |
|---|---|
| Verdict sentence from the 24-hour check, with its level tag | The PM2.5 figure with its unit and hour; the full pollutant table with units |
| "Model forecast · Open-Meteo · updated HH:MM" | 48-hour chart plus its text summary; hourly table |
| Stale banner (never hidden) | Provider, model, grid size (about 45 km), model run time not reported, retrieved time |
| One caveat line | Data kind of each value; "Official CPCB observations are not connected" |
| One recommendation with "Why?" | How the 24-hour check works (India's NAAQS limits; we don't calculate any AQI) |
| | Sources (status and licence) and the merged limitations list |

No CPCB, US or European AQI is ever shown or mixed: the app shows none today and computes none.

### 3.5 Where every existing feature goes

| Today's feature | New home | Change |
|---|---|---|
| `LocationSearch`, `UseMyLocation` | Onboarding step 1; place chip on every app page | Moved; same components |
| `AirReadout` (scene, weather line, verdict, stale banner) | Today, top | Verdict leads; figure and provider line into details |
| `ForecastPanel`, `ForecastChart` | Today → Air quality details | Moved, unchanged |
| `ObservationPanel` | Air quality details | One line instead of a card |
| `SourcesPanel` | Air quality details; also linked from Profile | Moved; limitations merged |
| `DailyPlanSection` and `PlanView` | Today: top card plus "See your full day" | Auto-built (D3); full plan collapsed |
| `PlanCard` and "Why?" | Today, My Home, Better Habits, Ask answers | Reused everywhere |
| `HouseholdPreferencesForm` | Onboarding (steps 2–3, chips) and My Profile (full form) | Same 10 fields and the same API |
| `SavedPlansList` | My Profile | Always listed, with an empty state |
| "Delete my saved data" | My Profile | Shown only when something is saved |
| Landing chapters | Landing sections 3–6 | Re-ordered; same real rule cards |

---

## 4. Decisions needed from you before Phase 1

**Approved by the owner on 20 Nov 2026: "Approve as recommended".** D1–D5 and the defaults below all stand as recommended.

Each decision has a recommendation, listed first.

| # | Decision | Options | Recommendation and why |
|---|---|---|---|
| **D1** | Scope of Ask AirAware | **(a)** Guided: starter questions plus a free-text box, matched to the existing rule cards and the current forecast; the AI only rephrases, under the same Zod checks as the daily plan. **(b)** Full open chat: a new endpoint, new prompt and safety tests, chat-log privacy rules, and more AI cost. | **(a)** first. It answers every example question in your brief from content that already has sources, adds no new AI risk surface, and can grow into (b). (b) is about 1.5–2 days and needs a threat-model update. |
| **D2** | Remembering place and onboarding answers | **(a)** End of onboarding offers "Remember on this device", which runs the existing Save (anonymous account; off by default). **(b)** Browser storage only (needs a PRIVACY.md and Privacy page change). **(c)** Don't remember: onboarding repeats on each visit. | **(a)**, because it keeps today's privacy promise ("no account until you press Save"). The place label is kept, never precise coordinates. |
| **D3** | Build the recommendation automatically on Today | **(a)** Auto-build once per place per hour, cached for the visit; each writer stays inside its 200-calls-a-day limit and falls back to rules. **(b)** Keep the button. | **(a)**, because "one recommended next action" can't hide behind a button. Cost: 1 AI call per new place per hour. |
| **D4** | Content gaps (energy use; dust and cleaning) | **(a)** Write new rule cards with cited sources, under the existing server rule tests. **(b)** Ship the pages with the 17 existing cards only. | **(a)** for "dust and cleaning" and "energy", 2–4 cards each. Sources are cited for you to review, and there are no emission numbers. |
| **D5** | Font and motion library | **(a)** Self-host Inter (one variable woff2, Latin subset; exact size measured before adding) and keep CSS-only motion. **(b)** Add Framer Motion as well. **(c)** Keep system fonts. | **(a)**. No motion library is installed, and CSS transitions plus `@starting-style` cover every motion the brief lists. Framer Motion would add a dependency (it needs your yes under `AGENTS.md` §9). |

**Defaults I'll take unless you say otherwise:**
- a light app with a navy top bar and bottom bar, and the dark landing page (`DESIGN.md` §2: the dashboard puts readability first);
- a top bar, not a sidebar, on desktop;
- a time-of-day greeting with no name (nothing new collected);
- "Outdoor activities" and "My family" open Ask AirAware with that topic's questions;
- the hero call to action becomes "Check My Air", and its tests are updated.

## 5. Where the brief meets the project's data and safety rules

| Brief says | Rule | How the design handles it |
|---|---|---|
| "Current available air-quality status" | No official observations are connected, so the status is a model forecast | The verdict always says "Forecast…" and carries the "Model forecast" label; it is never presented as a measurement |
| "Can I go outside?" | Never guarantee safety; no medical advice; never say "safe", "healthy" or "clean air" | Answers give the forecast situation plus rule-based suggestions and the existing safety note; they never say yes or no |
| AQI methodology in details | Never compute or mix CPCB, US or EU AQI | Details explain the 24-hour check against India's limits and state that no AQI is calculated |
| Greeting | Don't collect unnecessary data | Time-of-day greeting only |
| Onboarding household questions | No medical diagnoses | Same 10 existing fields; "might be more sensitive" stays optional and non-medical |
| Better Habits | No unsupported emission numbers | Rule cards with sources; no quantities |
| Framer Motion | Check existing dependencies first | None installed; CSS recommended (D5) |

## 6. What the redesign must keep working

These come from the code trace. Every phase keeps them green or updates them on purpose, and says so.

- **APIs (unchanged):**
  - `GET /api/v1/air-quality/forecast`, `/sources`;
  - `GET /api/v1/locations/search`;
  - `POST /api/v1/recommendations/daily-plan`;
  - `/api/v1/profile/preferences`, `/api/v1/plans`, `/api/v1/account` (these need the token of the anonymous account created on Save).
- **Rate limits:** 60 requests a minute overall. Plan building and plan saving share 10 a minute, which matters for auto-build (D3).
- **URL contract:** `/app?place=…&lat=…&lon=…` (e2e and the landing search use it). A device location is never put in the URL.
- **e2e strings a redesign will change:**
  - "Air quality near you";
  - "Air quality: Pune, Maharashtra";
  - "Model forecast";
  - "Official CPCB observation unavailable";
  - "Build my daily plan";
  - the PlanView region names ("Air notice", "Your day", "Outdoors and travel", "Indoor air", "Sustainable swaps").

  Each is updated in the same task that changes it.
- **Tests:**
  - 241 client unit tests and 250 server tests (5 skipped);
  - 16 e2e tests across the `desktop` and `phone` projects;
  - axe checks on every page.

## 7. Proposed phase order and effort

| Phase | Work | Effort (mine) |
|---|---|---|
| 1 | IA and wireframes for Today, Ask, Home, Habits, Profile and onboarding (phone and desktop), for your approval | about 2 h |
| 2 | Navigation and paths; place chip | about 4 h |
| 3 | Design system: elevated surface token, press and focus states, mobile baseline, Inter (D5), favicon | about 3 h |
| 4 | Landing: 8 sections, hero calls to action | about 3 h |
| 5 | Onboarding (D2) | about 5 h |
| 6 | Today: verdict, auto recommendation (D3), help choices, Ask box, details | about 7 h |
| 7 | Ask AirAware: guided (D1a) about 5 h; open chat (D1b) 1.5–2 days | 5 h or 2 days |
| 8 | My Home and Better Habits, plus new rule cards (D4) | about 6 h |
| 9 | Responsive and accessibility pass; real-phone check | about 3 h |
| 10 | Browser review at 320/768/1280, full regression, final review | about 3 h |

Each phase is tested locally and committed, with no push. Everything is pushed once at the end, on your word.
