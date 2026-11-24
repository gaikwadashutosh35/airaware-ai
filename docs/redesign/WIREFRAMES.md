# AirAware AI: Stage 1 wireframes (proposal)

**Date:** 24 Nov 2026.
**Status:** proposal for the owner. Nothing here is built. No application file was changed.
**Inputs:** the Stage 1 brief (shared decisions, sections 1 to 8), the Stage 0 audit ([LIVE_SITE_AUDIT.md](audit/LIVE_SITE_AUDIT.md), [FINDINGS_REGISTER.md](audit/FINDINGS_REGISTER.md), [PRODUCTION_VS_LOCAL.md](audit/PRODUCTION_VS_LOCAL.md)), the owner's pack (`AirAware_AI_Redesign_Kit/04_SCREEN_BY_SCREEN_SPEC.md`, `DESIGN_REVIEW_CHECKLIST.md`), and the source at commit `257352e`.
**Rule when they disagree:** the brief decides Stage 1 questions; the code decides facts about the app. Every place where they differ is listed in [section 20](#20-where-the-brief-and-the-code-differ).

## 1. How to read this file

- **Two frames per screen:** phone at 390x844, desktop at 1280x720. Each frame shows one screen of content in order, top to bottom. Text wraps roughly where it would at that width; heights are not to scale.
- **Fold line** `╞═══╡`: where the first screen ends. On app pages at 390x844 that is the top of the bottom bar, **y 787** (measured in Stage 0: `evidence/prod-metrics.json`, `navs[0].top` for every app route at 390x844). At 320x640 it is **y 583**. Desktop folds at **y 720**; the desktop navigation is in the header, so nothing covers the page.
- **Fold lines in proposed layouts are targets**, worked out from the brief's estimated savings (section 3 of the brief). They are not measurements. The mockup agents measure them with Playwright at 320x640 and 390x844.
- **Text inside frames** is the shipped string, word for word, with three placeholders: `HH:MM` for a time, `{day}` for a weekday, `{date, HH:MM}` for a saved date. There are no pollutant values, units or percentages in any frame.
- **Right-margin notes** (`◂`) explain a line. "proposal, needs OK (F-xx)" marks wording that differs from production; the frame still shows the shipped words. "proposal, needs OK (new text)" marks a new element with no shipped wording yet; the frame shows the proposed words. Every proposal carries the phrase "proposal, needs OK", so one search finds them all.
- **Legend:**

| Mark | Meaning |
|---|---|
| `[Check My Air]` | Filled teal primary button or link (one per screen) |
| `(Try again)` | Outlined secondary button |
| `[________]` | Text input |
| `‹Within the limit›` | Level tag pill: border plus text, never colour alone |
| `▸ Why?` / `▾ Why?` | Closed / open disclosure (`<details>`) |
| `[◉ Pune ▾]` | Place chip in the header. Shows the text before the first comma; the full name is in its `aria-label` (brief section 3, F-10) |
| `[Today]` | Current page in the navigation: filled pill, bold label and `aria-current="page"` |
| `~~~~` | Decorative skyline drawing (`aria-hidden`, no text) |

## 2. Shared parts (every app page)

| Part | Phone (< 768 px) | Desktop (>= 768 px; full nav names from 1024 px) | Source |
|---|---|---|---|
| Header | Navy (`bg`), 64 px: logo left, place chip right. Logo goes to `/app` with the current query (F-28). | Navy, 64 px: logo, 5 navigation links, place chip. | `AppShell.tsx:270-291`, `AppNav.tsx`, `PlaceChip.tsx:37-46` |
| Navigation | Fixed bottom bar, 56 px, icon and short label, padded by the bottom, left and right screen insets (F-38). Focus order: owner pick (INFORMATION_ARCHITECTURE.md §4.4). Option A (recommended; drawn in both mockups): logo, chip, bar, content. Option B: logo, chip, content, bar (needs the nav after `<main>`). | Inline in the header, 44 px pills. | `AppNav.tsx:38-68` |
| Backdrop | One fixed CitySkyline behind every app page: sky, glow, clouds, city band at the screen bottom above the bar. Decorative, no layout space. | Same; city band 176 px max 20% of the screen. Direction A lowers the near layer on >= 1024 px (F-26). | `CitySkyline.tsx`, cityscape specs of 20 and 22 Nov |
| Panels | Solid light panels (`surface-light`), 1 px `rule` border, no glass, no shadow. | Same. | `index.css` tokens |
| Footer | Light panel: "Background: model forecast for {place}. {tag}." (plus " Not current." when stale), the Open-Meteo and CAMS attribution, "Privacy". Then open space as tall as the city band. | Same. | `AppShell.tsx:471-496`, `scene.ts:105-113` |

Landing, Privacy and the 404 page are outside the app shell. They have no place chip, no bottom bar and no backdrop; each frame says so.

## 3. Stage 0 positions these frames start from

`y` is the top edge, in page pixels, of the first visible element whose own text matches ([evidence/capture.mjs](audit/evidence/capture.mjs) lines 124-165). "prod" is the live site with a real Pune forecast and one real AI plan. "local" is the same client code with the e2e fixtures; its cards differ, so its positions sit about 20-35 px off production (PRODUCTION_VS_LOCAL.md).

| Screen and state | Source | 320x640 | 390x844 | 1280x720 |
|---|---|---|---|---|
| Bottom bar top (the fold) | prod | 583 | 787 | none (top bar) |
| Today: verdict H2 / provenance / "Your recommendation for today" / first "Why" | prod | 327 / 447 / 741 / 1200 | 307 / 391 / 665 / 1049 | 299 / 347 / 234 / 536 |
| Today stale: "Not current" / recommendation heading / first "Why" | local | 549 / 890 / 1311 | 493 / 790 / 1185 | 385 / 234 / 548 |
| Today forecast error: recommendation heading / first "Why" | local | 465 / 895 | 437 / 842 | 234 / 538 |
| Today incomplete check: explanation sentence* / recommendation heading / first "Why" | local, state `unavailable-plan` | 549 / 739 / 1106 | 493 / 658 / 1001 | 385 / 234 / 470 |
| Today plan error: recommendation heading | local | 761 | 685 | 234 |
| Ask: free-text box | prod (F-20) | not measured | 878 | 733 |
| My Home: plan air line / first "Why" | prod | 229 / 640 | 229 / 565 | 249 / 496 |
| Better Habits: first "Why" | prod | 492 | 418 | 381 |
| Landing: "Check My Air" / page length | prod | 435 / 13.3 screens | 357 / 9.4 screens | 587 / 7.8 screens (search input at y 740, F-19) |

\* In the incomplete state the capture's "verdict" pattern matches the explanation sentence ("We could not get a complete…"), not the H2 "Live air information unavailable", which the pattern does not include.

Page lengths at 390x844 (prod): Welcome 1.1, Today 3.4, Ask 1.7, My Home 3.4, Better Habits 2.9, My Profile 2.5, Privacy 3.4 screens.

## 4. Landing (`/`)

This file's mapping of the brief's seven landing sections (brief section 3, F-19) onto the shipped content. It is a proposal and follows the same section list as INFORMATION_ARCHITECTURE.md section 6. Two choices are this file's own and need the owner's OK: the dated Air quality details capture (chapter 01's image) is dropped, and the chapter "Your personal daily plan" is folded into section 4 without its card.

| # | Proposed section | Shipped content it uses |
|---|---|---|
| 1 | Hero: headline, benefit, two actions, search with a submit button. Text only, top-aligned, over the skyline. | Hero text and actions (`Landing.tsx:138-155`) |
| 2 | Today preview, headed "Understand your air" | The dated Today capture and its caption (`Landing.tsx:158-177`), with chapter 01's heading and text (`Landing.tsx:180-186`). The details capture is dropped (proposal, needs OK). |
| 3 | What AirAware helps with (new heading) | The four help-choice titles and lines from `HelpChoices.tsx:15-40` |
| 4 | One recommendation explained + compact "Check My Air" (as both mockups) | Chapter "Explainable AI", one card with "Why?" open. "Your personal daily plan" folded in, its card not repeated (proposal, needs OK). |
| 5 | My Home and Better Habits together, under the new heading "My Home and Better Habits" (proposal, needs OK; both mockups) | Chapters "Improve indoor air" and "Sustainable everyday choices" as sub-headings, side by side on desktop |
| 6 | How AirAware works | The 4-step flow, unchanged |
| 7 | Transparency + final action | "Forecasts are model estimates…", "Official CPCB observations are not connected yet.", "Your city, the next two days", "Check My Air" |

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                              │  ◂ navy page (bg); no place chip, no bottom bar, no app backdrop
├──────────────────────────────────────────┤
│ The air around you                       │  ◂ H1 (A: 48 px as shipped; B: about 40 px, tight)
│ matters.                                 │
│ Understand your city's air quality.      │
│ Discover smarter daily routines. Make    │
│ better choices for your home and         │
│ community.                               │
│ [Check My Air]  (Meet Your Assistant)    │  ◂ shipped pair: teal primary + outlined twin
│ Or search a city                         │
│ Search for a city or area in India       │
│ Type at least 2 letters, then choose a   │
│ place from the list.                     │
│ [________________________]  (Search)     │  ◂ proposal, needs OK (new text): outlined "Search" submit, so the hero keeps one teal primary (pack 04 section 1)
│ ~~~~~~ soft panoramic skyline ~~~~~~~~   │  ◂ A: quiet layered silhouettes; B: deeper horizon
╞═ fold at y 844 (target)══════════════════╡  ◂ Stage 0: "Check My Air" at y 357, page 9.4 screens
├─ 2 Today preview─────────────────────────┤
│ Understand your air                      │  ◂ shipped chapter 01 heading and text
│ (chapter 01 text, as shipped)            │
│ A past screenshot of Today for Pune,     │  ◂ label first, then the image (shipped caption)
│ 22 Nov 2026. Open the app for current    │
│ values.                                  │
│┌─ dated Today capture (image)───────────┐│
││ (phone screenshot of Today, 390 wide)  ││
│└────────────────────────────────────────┘│
├─ 3───────────────────────────────────────┤
│ What AirAware helps with                 │  ◂ proposal, needs OK (new heading, pack 04 section 1, item 3)
│ Outdoor activities                       │
│   Walks, exercise, commutes              │
│ My home                                  │
│   Cooking, windows, purifiers            │
│ My family                                │
│   Children, older adults, school runs    │
│ Greener habits                           │  ◂ shipped; proposal, needs OK (F-24): "Better habits"
│   Small swaps that cut smoke and exhaust │
├─ 4───────────────────────────────────────┤
│ Explainable AI                           │  ◂ shipped chapter: one rule card, "Why?" open
│┌────────────────────────────────────────┐│
││ Run your air purifier where people     ││
││ spend most time                        ││
││ ▾ Why? Reason · Based on · Sources     ││
│└────────────────────────────────────────┘│
│ [Check My Air]                           │  ◂ compact mid-page action (F-19), after the explained card as in both mockups
├─ 5───────────────────────────────────────┤
│ My Home and Better Habits                │  ◂ proposal, needs OK (new heading, drawn in both mockups)
│ Improve indoor air                       │  ◂ two shipped chapters as sub-headings, each with its rule card
│ Sustainable everyday choices             │
├─ 6───────────────────────────────────────┤
│ How AirAware works                       │  ◂ unchanged 4-step flow, near the end
├─ 7───────────────────────────────────────┤
│ Forecasts are model estimates, not       │
│ station measurements, and not the        │
│ CPCB National AQI.                       │
│ Official CPCB observations are not       │
│ connected yet.                           │
│ Your city, the next two days             │
│ [Check My Air]                           │
├─ footer──────────────────────────────────┤
│ AirAware AI · attribution · Privacy      │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI                                                                                │  ◂ navy page; header 64 px; no place chip
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ The air around you                                                                         │  ◂ hero text top-aligned at lg (was centred, Landing.tsx:138)
│ matters.                                                                                   │
│ Understand your city's air quality. Discover smarter daily                                 │
│ routines. Make better choices for your home and community.                                 │
│ [Check My Air]  (Meet Your Assistant)                                                      │
│ Or search a city                                                                           │
│ Search for a city or area in India                                                         │
│ Type at least 2 letters, then choose a place from the list.                                │
│ [___________________________________]  (Search)                                            │  ◂ proposal, needs OK (new text): outlined "Search"; input was at y 740 (F-19)
│ ~~~~~~~~~~~~~~~~~~~~~~ wide, soft panoramic skyline across the hero ~~~~~~~~~~~~~~~~~~~~~~ │
╞═ fold at y 720 (target: search on the first screen)════════════════════════════════════════╡
│ 2  Understand your air                               A past screenshot of Today for Pune,  │  ◂ Today preview: text left, dated capture right
│ (chapter 01 text, as shipped)                        22 Nov 2026. Open the app for current │
│                                                      values.  ▣ dated Today capture (image)│
│ 3  What AirAware helps with                                                                │  ◂ proposal, needs OK (new heading)
│ Outdoor activities     My home                My family              Greener habits        │  ◂ 4-up row; shipped titles and lines
│ Walks, exercise,       Cooking, windows,      Children, older        Small swaps that cut  │
│ commutes               purifiers              adults, school runs    smoke and exhaust     │
│ 4  Explainable AI ................................. rule card with "Why?" open, right      │
│ [Check My Air]                                                                             │  ◂ compact mid-page action (F-19), after the explained card as in both mockups
│ 5  My Home and Better Habits                                                               │  ◂ proposal, needs OK (new heading, drawn in both mockups)
│    Improve indoor air                      Sustainable everyday choices                    │  ◂ the two shipped chapters as sub-headings, side by side, each with its rule card
│ 6  How AirAware works: 4 steps in one row                                                  │
│ 7  Forecasts are model estimates, not station measurements, and not the CPCB National AQI. │
│    Official CPCB observations are not connected yet.                                       │
│    Your city, the next two days      [Check My Air]                                        │
├─ footer────────────────────────────────────────────────────────────────────────────────────┤
│ AirAware AI · attribution · Privacy                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone:** headline, benefit, "Check My Air", "Meet Your Assistant", the search label, hint, input and submit. The Today preview starts below.
- **Above the fold, desktop:** the same, over the skyline. Target: the search input above y 720 (now y 740). The dated capture moves out of the hero to section 2, so the hero no longer needs its 100dvh height (F-39).
- **States:** search results open (listbox under the input); no result: shipped "No places found" (proposal F-35: "No places found. Try a nearby city, or use your location."); search error (proposal F-35: "Search isn't working right now. Try again, or use your location."); reduced motion (no `reveal` animation); 320 px width with no sideways scroll.
- **Findings:** F-19 (length, mid-page action, top-aligned hero), F-39 (`svh` for the hero height), F-23 (one "Why?" label), F-35 (search messages).
- **A vs B:** A keeps the shipped headline size over a quiet panoramic skyline in `rule-dark`/`elevated`/`surface` tones. B sets the headline very large and tight (about 56-72 px desktop, 40 px phone), runs a full-width city horizon across the hero's lower third, numbers sections 01-07, and alternates `bg` and `surface` sections.

## 5. Onboarding step 1 (`/app/welcome`, no place)

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                              │  ◂ place chip hidden on step 1 (F-27); logo goes to /app
├──────────────────────────────────────────┤  ◂ sky backdrop: unknown look (no forecast yet)
│ Step 1 of 3                              │
│ Where should we check air                │  ◂ H1, takes focus on arrival
│ quality?                                 │
│ See today's air forecast for your        │  ◂ proposal, needs OK (new text): value line (F-27)
│ place and one thing you could do.        │
│┌────────────────────────────────────────┐│
││ Search for a city or area in India     ││
││ Type at least 2 letters, then choose   ││
││ a place from the list.                 ││
││ [________________________________]     ││
││ (results list opens here)              ││
││ (Use my location)                      ││  ◂ the only place geolocation is requested
││ Your browser asks first. Your          ││
││ location is rounded to about 1 km      ││
││ before it leaves your browser.         ││
│└────────────────────────────────────────┘│
│ (open space: city band height)           │
╞═ fold at y 787═══════════════════════════╡  ◂ Stage 0: page 1.1 screens at 390
├─ footer──────────────────────────────────┤  ◂ no "Background" line: no forecast yet
├──────────────────────────────────────────┤
│ Today    Ask    Home   Habits  Profile   │  ◂ fixed bar; no current page on Welcome
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    Today  Ask AirAware  My Home  Better Habits  My Profile                     │  ◂ chip hidden on step 1 (F-27)
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                    Step 1 of 3                                                             │  ◂ one centred column, max about 36rem (as shipped)
│                    Where should we check air quality?                                      │
│                    See today's air forecast for your place and                             │  ◂ proposal, needs OK (new text, F-27)
│                    one thing you could do.                                                 │
│                    ┌──────────────────────────────────────────────────────┐                │
│                    │ Search for a city or area in India                   │                │
│                    │ Type at least 2 letters, then choose a place         │                │
│                    │ from the list.                                       │                │
│                    │ [____________________________________]               │                │
│                    │ (Use my location)                                    │                │
│                    │ Your browser asks first. Your location is            │                │
│                    │ rounded to about 1 km before it leaves your          │                │
│                    │ browser.                                             │                │
│                    └──────────────────────────────────────────────────────┘                │
│                    ~~~~~~~~~~~~ city band at screen bottom ~~~~~~~~~~                      │
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone and desktop:** step label, H1, value line, the whole search panel, "Use my location" and its hint.
- **States:** loading saved answers ("Loading your place", sized like the panel, F-02); results open; no result and search error (F-35 proposals as on Landing); location denied (shipped: "Location permission was denied. Search for a place instead."); location not found (shipped); finding location ("Finding your location…").
- **Findings:** F-27, F-35, F-02 (Welcome CLS 0.182 at 320 and 0.157 at 390), F-13, F-28.
- **A vs B:** A puts the step label, H1 and value line on the sky in `text-dark`. B puts them in a compact dark masthead (`surface`, light text); the search panel stays light.

## 6. Onboarding step 2 (`/app/welcome`, place chosen)

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │  ◂ chip returns once a place is chosen
├──────────────────────────────────────────┤
│ Step 2 of 3                              │
│ What does your typical day look          │  ◂ H1, takes focus when the step changes
│ like?                                    │
│┌────────────────────────────────────────┐│
││ Choose any that fit. All optional.     ││
││ Your day                               ││  ◂ fieldset legend
││ (✓ Office commute) (School commute)    ││  ◂ chips are native checkboxes; a tick marks "chosen"
││ (Outdoor exercise) (Work from home)    ││
││ How do you usually travel?             ││  ◂ shown only after "Office commute"
││ (Walk) (Cycle) (Two-wheeler) (Car)     ││
││ (Public transport)                     ││
││ (Back)   [Next]   (Skip)               ││
│└────────────────────────────────────────┘│
╞═ fold at y 787═══════════════════════════╡
│ footer                                   │
├──────────────────────────────────────────┤
│ Today    Ask    Home   Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    Today  Ask AirAware  My Home  Better Habits  My Profile        [◉ Pune ▾]   │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                    Step 2 of 3                                                             │
│                    What does your typical day look like?                                   │
│                    ┌──────────────────────────────────────────────────────┐                │
│                    │ Choose any that fit. All optional.                   │                │
│                    │ Your day                                             │                │
│                    │ (✓ Office commute) (School commute)                  │                │
│                    │ (Outdoor exercise) (Work from home)                  │                │
│                    │ How do you usually travel?                           │                │
│                    │ (Walk) (Cycle) (Two-wheeler) (Car)                   │                │
│                    │ (Public transport)                                   │                │
│                    │ (Back)   [Next]   (Skip)                             │                │
│                    └──────────────────────────────────────────────────────┘                │
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone and desktop:** the whole step, including Back, Next and Skip.
- **States:** nothing chosen (Next and Skip both continue); "Office commute" and "Work from home" exclude each other (`onboarding.ts:24-37`); long place in the chip ("Thiruvananthapuram", ellipsis if needed).
- **Findings:** F-10 (chip label), F-13.
- **A vs B:** same as step 1.

## 7. Onboarding step 3 (`/app/welcome`)

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤
│ Step 3 of 3                              │
│ Tell us a little about your home.        │
│┌────────────────────────────────────────┐│
││ What do you mostly cook with?          ││
││ (LPG) (Electric) (Other)               ││
││ (Wood, coal or crop waste)             ││
││ (Prefer not to say)                    ││
││ Kitchen exhaust or chimney?            ││
││ (Yes) (No)                             ││
││ Air purifier?                          ││
││ (Yes) (No)                             ││
││ Near a busy road?                      ││
││ (Yes) (No) (Not sure)                  ││
╞═ fold at y 787═══════════════════════════╡
││ [ ] Remember on this device            ││  ◂ off by default; native checkbox
││ Creates an anonymous save on this      ││  ◂ shipped; proposal, needs OK (F-01): "Creates an anonymous account that keeps your answers, and a place you searched for, so this browser can reopen them. Delete it any time in My Profile."
││ device. Delete it any time in My       ││
││ Profile.                               ││
││ (Back)   [See my air]   (Skip)         ││
│└────────────────────────────────────────┘│
│ footer                                   │
├──────────────────────────────────────────┤
│ Today    Ask    Home   Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    Today  Ask AirAware  My Home  Better Habits  My Profile        [◉ Pune ▾]   │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                    Step 3 of 3                                                             │
│                    Tell us a little about your home.                                       │
│                    ┌──────────────────────────────────────────────────────┐                │
│                    │ What do you mostly cook with?                        │                │
│                    │ (LPG) (Electric) (Wood, coal or crop waste)          │                │
│                    │ (Other) (Prefer not to say)                          │                │
│                    │ Kitchen exhaust or chimney?   (Yes) (No)             │                │
│                    │ Air purifier?                 (Yes) (No)             │                │
│                    │ Near a busy road?    (Yes) (No) (Not sure)           │                │
│                    │ [ ] Remember on this device                          │                │
│                    │ Creates an anonymous save on this device.            │                │  ◂ shipped; proposal, needs OK (F-01)
│                    │ Delete it any time in My Profile.                    │                │
│                    │ (Back)   [See my air]   (Skip)                       │                │
│                    └──────────────────────────────────────────────────────┘                │
╞═ fold at y 720 (estimate: the buttons may sit just below it)═══════════════════════════════╡
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone:** the four questions. "Remember on this device", its note and the buttons need one scroll. **Desktop:** the whole step (estimate).
- **States:** Remember ticked with a device location: shipped "Your location isn't saved; only your answers are."; saving not set up (checkbox disabled, shipped "Saving isn't set up on this site."); save failed and rate limited (shipped alerts, `Welcome.tsx:19-22`); busy (buttons disabled).
- **Findings:** F-01 (the note), F-43 (Remember stores the label and 2-decimal coordinates: owner to confirm), F-13.
- **A vs B:** same as step 1.

## 8. Today: success (`/app?place=…`)

This is the brief's anchor (section 7). **All five Today frames draw the target layout**, which leaves out three shipped lines: the verdict's meaning sentence (F-22, needs the owner's OK), the "For you" line when no household answers exist (F-14, needs OK), and the visible "Your plan is ready." (brief decision: screen-reader-only, live region kept). The mockups keep the meaning sentence (shipped text) and measure "Why?" at 390x844 with a rules card: A bottom y 739, 48 px above the fold; B y 807, cut by the bar (about 722 without the sentence, derived). An AI card's "For you" line (about 100 px, the brief's estimate) needs F-14 or F-22 in A, and both in B (DESIGN_CONCEPTS.md §7). The anchor also gets four code facts: the "Made with AI / Made by our rules" line and "See your full day" sit inside the recommendation card, the invite keeps its shipped label, and the help choices are one column below 640 px as shipped (see section 20).

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │  ◂ aria-label "Change place: Pune, Maharashtra"
├──────────────────────────────────────────┤  ◂ sky backdrop: air look from the 24-hour check only
│ Good morning                             │  ◂ time of day, no name
│ Today in Pune, Maharashtra               │  ◂ H1 24 px on one line on phones (F-11); A: on the sky; B: dark masthead
│┌────────────────────────────────────────┐│  ◂ VERDICT CARD (A: light panel; B: inside the dark masthead)
││ Weather for {day}, HH:MM: temperature  ││  ◂ placeholder wording; first row as approved 20 Nov (moving it is F-21, an owner question)
││ and cloud cover from Open-Meteo        ││
│├────────────────────────────────────────┤│
││ Forecast within India's 24-hour        ││  ◂ verdict H2, the largest text (26-28 px phone)
││ limits                                 ││
││ ‹Within the limit› Model forecast ·    ││  ◂ tag pill + provenance (TodayLead.tsx:41-46)
││ Open-Meteo · updated HH:MM             ││  ◂ proposal, needs OK (F-32): "retrieved HH:MM"
││ Being within the national limit does   ││  ◂ caveat; the meaning sentence goes only if F-22 is OK'd
││ not mean the air is clean or free of   ││
││ risk.                                  ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│  ◂ RECOMMENDATION CARD (light panel)
││ Your recommendation for today          ││  ◂ H2 20 px, one line; "Your plan is ready." becomes screen-reader-only
││┌──────────────────────────────────────┐││
│││ Cut indoor smoke at the source       │││  ◂ top PlanCard H3; no "For you" without household answers (F-14)
│││ Incense, mosquito coils, candles and │││
│││ tobacco all add smoke indoors. Using │││
│││ them less, or not indoors, is the    │││
│││ simplest indoor-air step.            │││
│││ ▸ Why this recommendation?           │││  ◂ shipped label; proposal, needs OK (F-23): "Why?"
││└──────────────────────────────────────┘││
╞═ fold at y 787═══════════════════════════╡  ◂ now "Why" is at y 1049 (prod); A measured: "Why?" bottom 739
││ Made with AI. General information      ││  ◂ shipped made-by line + the general-information note (DailyPlanSection.tsx:274-276)
││ only, not medical advice. Follow       ││
││ local public-health advisories.        ││
││ ▸ See your full day                    ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ What would you like help with?         ││
││ Outdoor activities                     ││  ◂ 4 choice cards, one column below 640 px (HelpChoices.tsx:55)
││ My home                                ││
││ My family                              ││
││ Greener habits                         ││  ◂ proposal, needs OK (F-24): "Better habits"
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ (Make it personal: 2 quick questions)  ││  ◂ moved under the help choices; outlined, so teal is used once
││ (Not now)                              ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Ask AirAware anything                  ││
││ Ask about your air, home or day        ││
││ [_______________________]  [Send]      ││  ◂ Send drops below the input at large text (F-12)
││ (Can I go for a morning walk today?)   ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ ▸ Air quality details                  ││  ◂ closed; all numbers, units and sources live here
│└────────────────────────────────────────┘│
├─ footer──────────────────────────────────┤
│ Background: model forecast for Pune,     │
│ Maharashtra. Within the limit.           │
│ Open-Meteo and CAMS attribution          │
│ Privacy                                  │
│ (open space: city band height)           │
│ ~~~~~~~~~~~~ city band ~~~~~~~~~~~~~~~   │
├──────────────────────────────────────────┤
│ [Today]  Ask    Home   Habits  Profile   │  ◂ fixed bar 56 px + bottom/left/right insets (F-38)
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    [Today]  Ask AirAware  My Home  Better Habits  My Profile        [◉ Pune ▾] │  ◂ chip text: see section 20
├────────────────────────────────────────────────────────────────────────────────────────────┤  ◂ sky backdrop; city band pinned to the screen bottom
│ Good morning                                                                               │
│ Today in Pune, Maharashtra                                                                 │  ◂ H1 30 px (as shipped from sm)
│ ┌─ verdict card, about 3/5────────────────────────────┐ ┌─ recommendation card, about 2/5─┐│  ◂ columns 3fr / 2fr (AppShell.tsx:369)
│ │ Weather for {day}, HH:MM: temperature and cloud     │ │ Your recommendation for today   ││
│ │ cover from Open-Meteo                               │ │┌───────────────────────────────┐││
│ ├─────────────────────────────────────────────────────┤ ││ Cut indoor smoke at the source│││
│ │ Forecast within India's 24-hour limits              │ ││ Incense, mosquito coils,      │││
│ │ ‹Within the limit› Model forecast · Open-Meteo ·    │ ││ candles and tobacco all add   │││
│ │ updated HH:MM                                       │ ││ smoke indoors. Using them     │││
│ │ Being within the national limit does not mean       │ ││ less, or not indoors, is the  │││
│ │ the air is clean or free of risk.                   │ ││ simplest indoor-air step.     │││
│ └─────────────────────────────────────────────────────┘ ││ ▸ Why this recommendation?    │││
│                                                         │└───────────────────────────────┘││
│                                                         │ Made with AI. General           ││
│                                                         │ information only, not medical   ││
│                                                         │ advice. Follow local            ││
│                                                         │ public-health advisories.       ││
│                                                         │ ▸ See your full day             ││
│                                                         └─────────────────────────────────┘│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡  ◂ prod today: "Why" at y 536, so both cards fit
│ Outdoor activities     My home                My family              Greener habits        │  ◂ help choices, 4 in a row from lg
│ (Make it personal: 2 quick questions)  (Not now)                                           │
│ Ask AirAware anything   [_____________________________________________]  [Send]            │
│ ▸ Air quality details                                                                      │
│ footer: Background: model forecast for Pune, Maharashtra. Within the limit. · attribution  │
│ ~~~~~~~~~~~~ city band; A lowers the near layer on >= 1024 px (F-26) ~~~~~~~~~~~~~~~~~~~~~~│
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone (measured in the mockups; rules card, weather row and meaning sentence kept):** greeting, H1, weather row, verdict H2, tag and provenance, meaning sentence, caveat, recommendation heading, top card title and text, "Why". A: "Why?" bottom y 739, 48 px margin (about 656 without the meaning sentence, derived). B: y 807, cut by the bar (about 722 without the sentence). A "For you" line (about 100 px, estimate) needs F-14 or F-22 in A, and both in B. At 320x640 (fold y 583) the verdict and provenance fit; the recommendation heading does not (top A 671, B 650), so the brief's 320 target is missed in both. "Why" needs a scroll there.
- **Above the fold, desktop:** both cards in full, including "Why" and "See your full day" (prod: "Why" at y 536).
- **States:** loading (skeleton sized like the verdict card, F-02, with visible "Loading forecast…": proposal, needs OK (F-18); the shipped label "Loading forecast" is screen-reader-only, `States.tsx:7-23`); plan building (shipped "Building your plan. This can take up to 30 seconds." in the live region, skeleton sized like the card); "Forecast above India's 24-hour limit" with tag ‹Above the limit› and no caveat (`today.ts:35-44`): there the meaning sentence is the only line that names which pollutant is above the limit, so dropping it under F-22 loses information (open question 11); AI plan with household answers ("For you" shown, F-14); no card (shipped "No suggestions for your answers today."); long place ("Today in Thiruvananthapuram, Kerala" wraps at a space; the chip shows "Thiruvananthapuram"); the four states in sections 9 to 12; 200% text (header wraps to two rows, F-12).
- **Findings:** F-03, F-11, F-14, F-21, F-22, F-23, F-24, F-26, F-32, F-02, F-18, F-10, F-12, F-13, F-28, F-38.
- **A vs B:** A keeps the greeting and H1 on the sky and the verdict in a light panel. B puts the greeting, H1 and the whole verdict card content in one dark masthead (`surface`, light text, at least 7:1); the recommendation card and everything below stay light.

## 9. Today: stale forecast

Forecast ready, but retrieved more than 60 minutes ago (`AppShell.tsx:377-381`). Rows below the recommendation card are as in section 8.

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤  ◂ backdrop keeps the last-known look as shipped (F-44, owner pick pending)
│ Good morning                             │
│ Today in Pune, Maharashtra               │
│┌────────────────────────────────────────┐│
││ Weather for {day}, HH:MM: temperature  ││
││ and cloud cover from Open-Meteo        ││
│├────────────────────────────────────────┤│
││ Forecast within India's 24-hour        ││
││ limits                                 ││
││ ‹Within the limit› Model forecast ·    ││
││ Open-Meteo · updated HH:MM             ││
││┌──────────────────────────────────────┐││  ◂ amber banner directly under the provenance: warning border, light warning fill, clock icon, bold
│││ Not current: retrieved more than an  │││
│││ hour ago. Reload for the latest      │││
│││ forecast.                            │││
│││ (Reload forecast)                    │││  ◂ proposal, needs OK (new text, F-30): calls the existing forecast.retry()
││└──────────────────────────────────────┘││
││ Being within the national limit does   ││
││ not mean the air is clean or free of   ││
││ risk.                                  ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your recommendation for today          ││
││ The forecast behind this plan is more  ││  ◂ shipped PLAN_STALE; shown only when the plan's own forecast is also old
││ than an hour old.                      ││
╞═ fold at y 787 (estimate)════════════════╡  ◂ Stage 0 (local): "Not current" y 493, heading y 790, "Why" y 1185
││┌──────────────────────────────────────┐││
│││ Cut indoor smoke at the source       │││
│││ ▸ Why this recommendation?           │││
││└──────────────────────────────────────┘││
│└────────────────────────────────────────┘│
│ (rows below: as section 8)               │
├─ footer──────────────────────────────────┤
│ Background: model forecast for Pune,     │  ◂ " Not current." added when stale (scene.ts:112)
│ Maharashtra. Within the limit. Not       │
│ current.                                 │
├──────────────────────────────────────────┤
│ [Today]  Ask    Home   Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    [Today]  Ask AirAware  My Home  Better Habits  My Profile        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Good morning                                                                               │
│ Today in Pune, Maharashtra                                                                 │
│ ┌─ verdict card───────────────────────────────────────┐ ┌─ recommendation card────────────┐│
│ │ Weather for {day}, HH:MM: temperature and cloud     │ │ Your recommendation for today   ││
│ │ cover from Open-Meteo                               │ │ The forecast behind this plan   ││
│ ├─────────────────────────────────────────────────────┤ │ is more than an hour old.       ││
│ │ Forecast within India's 24-hour limits              │ │┌───────────────────────────────┐││
│ │ ‹Within the limit› Model forecast · Open-Meteo ·    │ ││ Cut indoor smoke at the source│││
│ │ updated HH:MM                                       │ ││ (card text)                   │││
│ │┌───────────────────────────────────────────────────┐│ ││ ▸ Why this recommendation?    │││
│ ││ Not current: retrieved more than an hour ago.     ││ │└───────────────────────────────┘││
│ ││ Reload for the latest forecast.                   ││ │ Made with AI. (note)            ││
│ ││ (Reload forecast)                                 ││ │ ▸ See your full day             ││  ◂ proposal, needs OK (new text, F-30)
│ │└───────────────────────────────────────────────────┘│ └─────────────────────────────────┘│
│ │ Being within the national limit does not mean       │                                    │
│ │ the air is clean or free of risk.                   │                                    │
│ └─────────────────────────────────────────────────────┘                                    │
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡  ◂ Stage 0 (local): "Not current" y 385, "Why" y 548
│ (rows below: as section 8)                                                                 │
│ footer: Background: model forecast for Pune, Maharashtra. Within the limit. Not current.   │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone (estimate):** verdict, provenance, the whole banner with its button, caveat, recommendation heading. "Why" falls below the fold: the banner costs about 100 px. That is the accepted trade-off; the banner must never move lower.
- **Above the fold, desktop:** both cards, including the banner and "Why".
- **States:** stale while a same-place reload runs (the backdrop keeps the previous look, `AppShell.tsx:141-146`); reload fails (becomes section 10); reload succeeds (banner goes, footer drops "Not current."); stale "above the limit".
- **Findings:** F-30, F-44, F-32, F-33 (Ask header has no stale mark; see section 13).
- **A vs B:** in B the amber banner sits on the dark masthead. Its fill, text colour, icon and the button's focus ring need a new contrast check, including forced colours.

## 10. Today: forecast error

The provider failed. No verdict, no weather row, no tag. The error card takes the verdict card's place (`AppShell.tsx:384-394`). The plan still builds from the rules and names the air it used (`DailyPlanSection.tsx:256-262`).

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤  ◂ backdrop: unknown look (grey, no weather)
│ Good morning                             │
│ Today in Pune, Maharashtra               │
│┌────────────────────────────────────────┐│  ◂ role="alert"; same slot and similar height as the verdict card (F-02)
││ We couldn't load the forecast          ││  ◂ H2 (shipped)
││ Forecast provider unavailable.         ││  ◂ PROVIDER_ERROR; network and rate-limit errors have their own shipped lines
││ (Try again)                            ││  ◂ keeps focus on the H1 while it reloads
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your recommendation for today          ││
││ Today: Forecast above India's 24-hour  ││  ◂ planAirLine: the plan's own forecast (seen in local-today-unavailable-390x844-first.jpg)
││ limit · Model forecast · Open-Meteo ·  ││
││ updated HH:MM                          ││
││┌──────────────────────────────────────┐││
│││ Consider an indoor alternative for   │││
│││ exercise                             │││
│││ Important today                      │││
│││ Consider exercising indoors today, or│││
│││ keeping outdoor sessions shorter and │││
│││ less intense. Check local conditions │││
│││ before you go.                       │││
╞═ fold at y 787 (estimate)════════════════╡  ◂ Stage 0 (local): heading y 437, "Why" y 842
│││ ▸ Why this recommendation?           │││
││└──────────────────────────────────────┘││
││ Made by our rules. General             ││
││ information only, not medical advice.  ││
││ Follow local public-health advisories. ││
│└────────────────────────────────────────┘│
│ (rows below: as section 8)               │
├─ footer: attribution and Privacy only────┤  ◂ no "Background" line: no forecast is shown (useRequest.ts: previous is null after an error)
├──────────────────────────────────────────┤
│ [Today]  Ask    Home   Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    [Today]  Ask AirAware  My Home  Better Habits  My Profile        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Good morning                                                                               │
│ Today in Pune, Maharashtra                                                                 │
│ ┌─ error card in the verdict slot─────────────────────┐ ┌─ recommendation card────────────┐│
│ │ We couldn't load the forecast                       │ │ Your recommendation for today   ││
│ │ Forecast provider unavailable.                      │ │ Today: Forecast above India's   ││
│ │ (Try again)                                         │ │ 24-hour limit · Model forecast  ││
│ └─────────────────────────────────────────────────────┘ │ · Open-Meteo · updated HH:MM    ││
│                                                         │┌───────────────────────────────┐││
│                                                         ││ Consider an indoor alternative│││
│                                                         ││ for exercise                  │││
│                                                         ││ (card text)                   │││
│                                                         ││ ▸ Why this recommendation?    │││
│                                                         │└───────────────────────────────┘││
│                                                         │ Made by our rules. (note)       ││
│                                                         │ ▸ See your full day             ││
│                                                         └─────────────────────────────────┘│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡  ◂ Stage 0 (local): "Why" y 538
│ (rows below: as section 8; Air quality details hold only the CPCB line and sources)        │
│ footer: attribution and Privacy only                                                       │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone:** H1, the whole error card, the recommendation heading, the plan's air line and the top card's title and most of its text. **Desktop:** everything, including "Why".
- **States:** the plan had no forecast either: shipped "Air information is unavailable for this plan." replaces the air line (`planDisplay.ts:143`). Both mockups draw this variant: when the provider is down the plan's own fetch usually fails too, since forecast and plan share one cache (`server/src/services/recommendations/dailyPlan.ts:151-154`; `server/src/routes/recommendations.test.ts:201`); network error ("Could not reach AirAware. Check your connection."); rate limited ("Too many requests. Try again in a minute."); Try again → loading skeleton → success or the same card.
- **Findings:** F-02 (the error card and the skeleton reserve the verdict card's height), F-17 (the plan's air line can differ from what the verdict would have said), F-18.
- **A vs B:** in A the error card is a light panel. B is not defined by the brief for this state: open question 7, with the same two options as DESIGN_SYSTEM_PROPOSAL.md §13 (mockup B draws option 2).

## 11. Today: incomplete 24-hour check

The forecast arrived, but the 24-hour check is `unknown` (fewer than 24 values or a wrong unit). No advice about the day's air.

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤  ◂ backdrop: unknown look (grey); clouds and rain still from weather fields
│ Good morning                             │
│ Today in Pune, Maharashtra               │
│┌────────────────────────────────────────┐│
││ Weather for {day}, HH:MM: temperature  ││
││ and cloud cover from Open-Meteo        ││
│├────────────────────────────────────────┤│
││ Live air information unavailable       ││  ◂ shipped H2; proposal, needs OK (F-16): "Air information unavailable"
││ ‹No data› Model forecast · Open-Meteo  ││  ◂ tag pill + provenance
││ · updated HH:MM                        ││
││ We could not get a complete 24-hour    ││  ◂ shipped explanation (today.ts:46-51); no caveat in this state
││ forecast for this place, so there's no ││
││ advice about today's air. The          ││
││ suggestions below apply on any day.    ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your recommendation for today          ││
││┌──────────────────────────────────────┐││
│││ Check conditions before outdoor      │││  ◂ top rules card in the fixture state unavailable-plan (evidence/local-metrics.json)
│││ exercise                             │││
╞═ fold at y 787 (estimate)════════════════╡  ◂ Stage 0 (local): heading y 658, "Why" y 1001
│││ Before a long or hard outdoor        │││
│││ session, check local air-quality     │││
│││ updates and advisories.              │││
│││ ▸ Why this recommendation?           │││
││└──────────────────────────────────────┘││
││ Made by our rules. (general-info note) ││
│└────────────────────────────────────────┘│
│ (rows below: as section 8)               │
├─ footer──────────────────────────────────┤
│ Background: model forecast for Pune,     │
│ Maharashtra. No data.                    │
├──────────────────────────────────────────┤
│ [Today]  Ask    Home   Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    [Today]  Ask AirAware  My Home  Better Habits  My Profile        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Good morning                                                                               │
│ Today in Pune, Maharashtra                                                                 │
│ ┌─ verdict card───────────────────────────────────────┐ ┌─ recommendation card────────────┐│
│ │ Weather for {day}, HH:MM: temperature and cloud     │ │ Your recommendation for today   ││
│ │ cover from Open-Meteo                               │ │┌───────────────────────────────┐││
│ ├─────────────────────────────────────────────────────┤ ││ Check conditions before       │││
│ │ Live air information unavailable                    │ ││ outdoor exercise              │││
│ │ ‹No data› Model forecast · Open-Meteo · updated     │ ││ (card text)                   │││
│ │ HH:MM                                               │ ││ ▸ Why this recommendation?    │││
│ │ We could not get a complete 24-hour forecast for    │ │└───────────────────────────────┘││
│ │ this place, so there's no advice about today's      │ │ Made by our rules. (note)       ││
│ │ air. The suggestions below apply on any day.        │ │ ▸ See your full day             ││
│ └─────────────────────────────────────────────────────┘ └─────────────────────────────────┘│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡  ◂ Stage 0 (local): "Why" y 470
│ (rows below: as section 8)                                                                 │
│ footer: Background: model forecast for Pune, Maharashtra. No data.                         │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone (estimate):** H1, weather row, H2, ‹No data› with provenance, the explanation, the recommendation heading and the top card's title. **Desktop:** everything.
- **States:** variant: when the plan's own fetch failed too, the shipped "Air information is unavailable for this plan." sits under the recommendation heading (fixture `unavailable-plan`; `DailyPlanSection.tsx:257`). In the common case drawn here (forecast ready, so `airShown` is true) no plan air line appears (`DailyPlanSection.tsx:258`; both mockups). Stale and incomplete together (banner under the provenance, as section 9); Air quality details show "Air information unavailable" and "24-hour average not available" lines (`AirReadout.tsx:112-114`).
- **Findings:** F-16, F-44 (the unknown look is never optimistic), F-02.
- **A vs B:** in B the ‹No data› pill (border and text) sits on the dark masthead and needs a contrast and forced-colours check.

## 12. Today: plan error

The forecast is fine; the recommendation failed (`DailyPlanSection.tsx:241-252`).

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤
│ Good morning                             │
│ Today in Pune, Maharashtra               │
│┌────────────────────────────────────────┐│
││ Weather for {day}, HH:MM: temperature  ││
││ and cloud cover from Open-Meteo        ││
│├────────────────────────────────────────┤│
││ Forecast within India's 24-hour        ││
││ limits                                 ││
││ ‹Within the limit› Model forecast ·    ││
││ Open-Meteo · updated HH:MM             ││
││ Being within the national limit does   ││
││ not mean the air is clean or free of   ││
││ risk.                                  ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your recommendation for today          ││
││┌──────────────────────────────────────┐││  ◂ role="alert", H3
│││ We couldn't build your               │││
│││ recommendation.                      │││
│││ Something went wrong building your   │││
│││ plan.                                │││
│││ The forecast above is still up to    │││  ◂ proposal, needs OK (new text, F-31): only when the forecast is ready and not stale
│││ date.                                │││
│││ (Try again)                          │││  ◂ focus stays on the card heading while it rebuilds
╞═ fold at y 787 (estimate)════════════════╡  ◂ Stage 0 (local): heading y 685
││└──────────────────────────────────────┘││
│└────────────────────────────────────────┘│
│ (rows below: as section 8)               │
├─ footer──────────────────────────────────┤
│ Background: model forecast for Pune,     │
│ Maharashtra. Within the limit.           │
├──────────────────────────────────────────┤
│ [Today]  Ask    Home   Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    [Today]  Ask AirAware  My Home  Better Habits  My Profile        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Good morning                                                                               │
│ Today in Pune, Maharashtra                                                                 │
│ ┌─ verdict card (as section 8)────────────────────────┐ ┌─ recommendation card────────────┐│
│ │ Weather for {day}, HH:MM: temperature and cloud     │ │ Your recommendation for today   ││
│ │ cover from Open-Meteo                               │ │┌───────────────────────────────┐││
│ ├─────────────────────────────────────────────────────┤ ││ We couldn't build your        │││
│ │ Forecast within India's 24-hour limits              │ ││ recommendation.               │││
│ │ ‹Within the limit› Model forecast · Open-Meteo ·    │ ││ Something went wrong building │││
│ │ updated HH:MM                                       │ ││ your plan.                    │││
│ │ Being within the national limit does not mean       │ ││ The forecast above is still up│││  ◂ proposal, needs OK (new text, F-31); wording at >= 1024 px is an open question (the forecast is to the left)
│ │ the air is clean or free of risk.                   │ ││ to date.                      │││
│ └─────────────────────────────────────────────────────┘ ││ (Try again)                   │││
│                                                         │└───────────────────────────────┘││
│                                                         └─────────────────────────────────┘│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡
│ (rows below: as section 8)                                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone (estimate):** the full verdict card, the recommendation heading and the whole error card with "Try again". **Desktop:** everything.
- **States:** rate limited (shipped "Too many requests. Try again in a minute."); Try again → building (skeleton sized like the card) → success or the same card; stale forecast plus plan error (the reassurance line is not shown: it would be false).
- **Findings:** F-31, F-02.
- **A vs B:** no difference beyond the B masthead around the verdict.

## 13. Ask AirAware: empty (`/app/ask`)

Order from the brief: title, purpose line, the text box first, topic chips, three starters, then the thread (F-20). The desktop two-column layout is a layout proposal of this file, not in the brief (open question).

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤
│ Ask AirAware                             │  ◂ H1
│ Ask about your air, home or day.         │  ◂ proposal, needs OK (new text): purpose line (brief section 3)
│ Answers come from AirAware's rules and   │
│ today's forecast.                        │
│ Using: the Pune, Maharashtra model       │  ◂ shipped (Ask.tsx:86); proposals F-15 and F-32 below
│ forecast, updated HH:MM · 0 of 10        │
│ answers · _Edit_                         │
│┌────────────────────────────────────────┐│
││ Ask about your air, home or day        ││  ◂ input label (shipped)
││ [_______________________]  [Send]      ││  ◂ the box is first (F-20); now at y 878 (prod)
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ (Outdoor activities)                   ││  ◂ 6 topic chips: each sends at once (shipped)
││ (Windows and ventilation)              ││
││ (Indoor air) (My family)               ││
││ (Commuting) (Greener habits)           ││
││ → Can I go for a morning walk today?   ││  ◂ starters drawn as text rows, not pills, so they differ from chips
││ → Is it a good idea to open my         ││
││   windows?                             ││
││ → How can I improve my indoor air?     ││
││ ▸ More questions                       ││  ◂ proposal, needs OK (new text): holds the other 2 shipped starters
│└────────────────────────────────────────┘│
╞═ fold at y 787 (target)══════════════════╡
│ footer                                   │
├──────────────────────────────────────────┤
│ Today   [Ask]   Home   Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    Today  [Ask AirAware]  My Home  Better Habits  My Profile        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Ask AirAware                                                                               │
│ Ask about your air, home or day. Answers come from AirAware's rules and today's forecast.  │  ◂ proposal, needs OK (new text): purpose line
│ Using: the Pune, Maharashtra model forecast, updated HH:MM · 0 of 10 answers · _Edit_      │
│ ┌────────────────────────────────────────────────────────┐ ┌──────────────────────────────┐│  ◂ proposal (layout): topics and starters in a right column from 1024 px
│ │ Ask about your air, home or day                        │ │ (Outdoor activities)         ││
│ │ [______________________________________]  [Send]       │ │ (Windows and ventilation)    ││
│ └────────────────────────────────────────────────────────┘ │ (Indoor air) (My family)     ││
│ (thread appears here, oldest first)                        │ (Commuting) (Greener habits) ││
│                                                            │ → Can I go for a morning walk││
│                                                            │   today?                     ││
│                                                            │ → Is it a good idea to open  ││
│                                                            │   my windows?                ││
│                                                            │ → How can I improve my indoor││
│                                                            │   air?                       ││
│                                                            │ ▸ More questions             ││  ◂ proposal, needs OK (new text)
│                                                            └──────────────────────────────┘│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡  ◂ now the box is at y 733 (prod)
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone (target):** title, purpose line, "Using" line, the text box with Send, the six chips and the three starters. **Desktop:** all of it, side by side.
- **States:** no place (shipped: the search panel and "Use my location" instead of the box); forecast loading or failed ("Using" line without a time); busy (chips, starters and Send disabled; "AirAware is thinking…"); 200% text (Send drops below the input, F-12); forecast older than 60 minutes (proposal F-33: add "· Not current" to the "Using" line).
- **Proposals on this screen:** F-15 "0 of 10 household questions answered · Edit"; F-32 "retrieved HH:MM"; F-24 for the "Greener habits" chip; dropping the shipped greeting "Good morning. I'm AirAware. Ask me about your day, your home or your commute." in favour of the purpose line (proposal, needs OK).
- **Findings:** F-20, F-15, F-32, F-33, F-12, F-24, F-25 (desktop width).
- **A vs B:** A keeps the title and "Using" line on the sky. B puts them in a compact dark masthead.

## 14. Ask AirAware: after an answer

The frame shows the screen **after** the new exchange scrolls to its top (F-04): the page title, box and chips are above, out of view. The sample is the e2e fixture answer (`client/src/test/askFixtures.ts`, `rulesAskFixture`: forecast above the limit, rules only), as captured in `local-ask-answer-390x844-full.jpg`. It is not paired with Today's "within" example, because a within-limit answer was never captured.

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ (page above scrolled out of view)        │  ◂ header and title are above; the bar stays fixed
│           ┌───────────────────────────┐  │  ◂ your question: H2 bubble, right-aligned, takes focus with preventScroll
│           │ Can I go for a morning    │  │
│           │ walk today?               │  │
│           └───────────────────────────┘  │
│┌────────────────────────────────────────┐│
││ Fine particles (PM2.5) are forecast    ││  ◂ short answer: the verdict's explanation when there is no AI summary
││ above the national daily limit for     ││
││ the next 24 hours.                     ││
││ Made by our rules                      ││
││ Based on: Forecast above India's       ││  ◂ shipped; proposal, needs OK (F-34): add "· Open-Meteo", and "Model forecast" only when a forecast exists
││ 24-hour limit · Model forecast ·       ││
││ updated HH:MM                          ││
││┌──────────────────────────────────────┐││
│││ Consider an indoor alternative for   │││
│││ exercise                             │││
│││ Important today                      │││
│││ Consider exercising indoors today, or│││
│││ keeping outdoor sessions shorter and │││
│││ less intense. Check local conditions │││
│││ before you go.                       │││
│││ ▸ Why?                               │││  ◂ "Why?" is already the label here (PlanCard default)
││└──────────────────────────────────────┘││
╞═ fold at y 787 (target)══════════════════╡
││ Check the air before a long outdoor    ││  ◂ cards 2 and 3 (titles only here)
││ activity · Choose routes and times     ││
││ away from heavy traffic                ││
││ General information only, not medical  ││
││ advice. Follow local public-health     ││
││ advisories.                            ││
││ You could also ask:                    ││
││ → How can I reduce pollution while     ││
││   commuting?                           ││
│└────────────────────────────────────────┘│
│ (the text box is at the top of the page) │
├──────────────────────────────────────────┤
│ Today   [Ask]   Home   Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ (page above scrolled out of view)                                                          │  ◂ the right column is sticky from 1024 px (proposal, layout)
│                    ┌─────────────────────────────────────┐ ┌──────────────────────────────┐│
│                    │ Can I go for a morning walk today?  │ │ (Outdoor activities)         ││
│                    └─────────────────────────────────────┘ │ (Windows and ventilation)    ││
│ ┌────────────────────────────────────────────────────────┐ │ (Indoor air) (My family)     ││
│ │ Fine particles (PM2.5) are forecast above the          │ │ (Commuting) (Greener habits) ││
│ │ national daily limit for the next 24 hours.            │ │ → Can I go for a morning walk││
│ │ Made by our rules                                      │ │   today?                     ││
│ │ Based on: Forecast above India's 24-hour limit ·       │ │ ▸ More questions             ││  ◂ proposal, needs OK (new text)
│ │ Model forecast · updated HH:MM                         │ └──────────────────────────────┘│
│ │┌──────────────────────────────────────────────────────┐│                                 │
│ ││ Consider an indoor alternative for exercise          ││                                 │
│ ││ Important today                                      ││                                 │
│ ││ Consider exercising indoors today, or keeping        ││                                 │
│ ││ outdoor sessions shorter and less intense.           ││                                 │
│ ││ ▸ Why?                                               ││                                 │
│ │└──────────────────────────────────────────────────────┘│                                 │
╞═ fold at y 720 (target)════════════════════════════════════════════════════════════════════╡  ◂ now only the question bubble shows at 1280x720 (F-04)
│ (cards 2 and 3 side by side from md, general-information note, "You could also ask:")      │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone and desktop (target):** the question, the short answer, "Made by our rules", the "Based on" line, and the first card with its "Why?". At 320x640 (fold y 583) the target is the question, the short answer and the "Based on" line.
- **States:** thinking (shipped "AirAware is thinking…" with one skeleton line); answer error (shipped title "We couldn't answer that", "Try again"); medical question (shipped "I can't give medical advice. For health concerns, please talk to a doctor."); out of scope (shipped line plus the topic chips); stale answer (Not current banner inside the answer); a household question back ("One question so I can be more specific:", choices, Skip); no forecast on the server (F-34: no "Model forecast").
- **Findings:** F-04, F-34, F-23.
- **A vs B:** no difference inside the thread; B's masthead is above, out of view.

## 15. My Home (`/app/home`)

"Today, for your home" is rendered from the first paint with a sized skeleton (F-02). Groups become headings in one flowing grid (F-25).

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤
│ My Home                                  │  ◂ H1
│ Indoor suggestions look at what you      │  ◂ purpose line: shipped landing text reused (Landing chapter "Improve indoor air"); proposal, needs OK (placement)
│ cook with and what burns inside, as      │
│ well as the air outside.                 │
│┌────────────────────────────────────────┐│  ◂ reserved from first paint (F-02); CLS now 0.416 at 390 (prod)
││ Today, for your home                   ││  ◂ H2
││ Today: Forecast within India's 24-hour ││  ◂ planAirLine (shipped); proposal F-32: "retrieved"
││ limits · Model forecast · Open-Meteo · ││
││ updated HH:MM                          ││
││┌──────────────────────────────────────┐││
│││ Cut indoor smoke at the source       │││
│││ Incense, mosquito coils, candles and │││
│││ tobacco all add smoke indoors. Using │││
│││ them less, or not indoors, is the    │││
│││ simplest indoor-air step.            │││
│││ ▸ Why it matters                     │││  ◂ shipped; proposal, needs OK (F-23): "Why?"
││└──────────────────────────────────────┘││
││ Made with AI. General information      ││
││ only, not medical advice. Follow       ││
╞═ fold at y 787═══════════════════════════╡  ◂ prod: plan air line y 229, "Why" y 565
││ local public-health advisories.        ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Ways to improve indoor air             ││  ◂ H2
││ Cooking and smoke                      ││  ◂ H3 group heading
││┌──────────────────────────────────────┐││
│││ Use the kitchen exhaust while cooking│││
│││ ▸ Why it matters                     │││
││└──────────────────────────────────────┘││
││┌──────────────────────────────────────┐││
│││ Consider a cleaner cooking fuel where│││
│││ possible                             │││
│││ ▸ Why it matters                     │││
││└──────────────────────────────────────┘││
││ Ventilation · Dust and cleaning ·      ││  ◂ remaining groups (prod), one column on phones
││ Filtration                             ││
││ General information only, not medical  ││
││ advice. Follow local public-health     ││
││ advisories.                            ││
│└────────────────────────────────────────┘│
├─ footer──────────────────────────────────┤
│ Background: model forecast for Pune,     │
│ Maharashtra. Within the limit.           │
├──────────────────────────────────────────┤
│ Today    Ask   [Home]  Habits  Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    Today  Ask AirAware  [My Home]  Better Habits  My Profile        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ My Home                                                                                    │
│ Indoor suggestions look at what you cook with and what burns inside, as well as the air    │  ◂ proposal, needs OK (placement): shipped landing line reused
│ outside.                                                                                   │
│┌──────────────────────────────────────────────────────────────────────────────────────────┐│
││ Today, for your home                                                                     ││
││ Today: Forecast within India's 24-hour limits · Model forecast · Open-Meteo ·            ││
││ updated HH:MM                                                                            ││
││ ┌──────────────────────────────────────────┐ ┌──────────────────────────────────────────┐││  ◂ today's cards in the same flowing grid (auto-fill, min about 20rem)
││ │ Cut indoor smoke at the source           │ │ (a second indoor card, if any)           │││
││ │ (card text)                              │ │                                          │││
││ │ ▸ Why it matters                         │ │                                          │││
││ └──────────────────────────────────────────┘ └──────────────────────────────────────────┘││
││ Made with AI. General information only, not medical advice. Follow local public-health   ││
││ advisories.                                                                              ││
│└──────────────────────────────────────────────────────────────────────────────────────────┘│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡  ◂ prod: "Why" y 496
│┌──────────────────────────────────────────────────────────────────────────────────────────┐│
││ Ways to improve indoor air                                                               ││
││ Cooking and smoke                                                                        ││  ◂ a group with 2+ cards spans the row; its cards sit on the same columns (DESIGN_SYSTEM_PROPOSAL §3.3)
││ ┌───────────────────────────┐ ┌───────────────────────────┐                              ││
││ │ Use the kitchen exhaust   │ │ Consider a cleaner        │                              ││
││ │ while cooking             │ │ cooking fuel where        │                              ││
││ │ ▸ Why it matters          │ │ possible                  │                              ││
││ │                           │ │ ▸ Why it matters          │                              ││
││ └───────────────────────────┘ └───────────────────────────┘                              ││
││ Ventilation                   Dust and cleaning             Filtration                   ││  ◂ one-card groups take one cell each, so they share a row instead of each leaving a half-empty row (F-25)
││ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐││
││ │ Air out while you cook    │ │ Clean with a damp cloth   │ │ If you use an air         │││
││ │ or burn incense           │ │ or mop                    │ │ purifier, match it to     │││
││ │ ▸ Why it matters          │ │ ▸ Why it matters          │ │ the room                  │││
││ └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘││
│└──────────────────────────────────────────────────────────────────────────────────────────┘│
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone:** H1, purpose line, "Today, for your home" with its air line and the whole top card including "Why it matters". **Desktop:** H1, purpose line and the whole "Today, for your home" panel.
- **States:** plan building (shipped "Finding today's suggestions…" with a skeleton in the reserved panel); plan error (shipped "We couldn't get today's suggestions", "Try again"); plan stale (shipped "The forecast behind this plan is more than an hour old." in place of the cards); no indoor card today (the panel keeps its space with a one-line note, new text needed, or collapses before first paint: open question); guides loading, guides error (shipped "We couldn't load the guides"); "Near a busy road" group only after a yes (`MyHome.tsx:44-49`).
- **Findings:** F-02, F-25, F-23, F-14 (no "For you" without answers), F-32.
- **A vs B:** A puts the title and purpose line on the sky. B puts them in a compact dark masthead and adds small uppercase group labels (`text-dark-muted`, 12-13 px, letter-spaced) above the group headings.

## 16. Better Habits (`/app/habits`)

No forecast data on this page. Groups in one flowing grid, as on My Home.

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤
│ Better Habits                            │  ◂ H1
│ Practical habits that cut pollution for  │  ◂ purpose line: shipped landing text reused; proposal, needs OK (placement)
│ you and your neighbours. We never show   │
│ an emissions saving we can't calculate.  │
│┌────────────────────────────────────────┐│  ◂ reserved from first paint (F-02); CLS now 0.284 at 390 (prod)
││ Daily commuting and vehicle idling     ││  ◂ group heading
││┌──────────────────────────────────────┐││
│││ Switch off the engine while you wait │││
│││ Turn the engine off at red lights and│││
│││ while waiting, instead of idling. For│││
│││ some trips, public transport or      │││
│││ sharing a ride may be practical.     │││
│││ ▸ Why it matters                     │││  ◂ shipped; proposal, needs OK (F-23): "Why?"
││└──────────────────────────────────────┘││
││ Waste                                  ││
││┌──────────────────────────────────────┐││
│││ Don't burn waste or leaves           │││
╞═ fold at y 787═══════════════════════════╡  ◂ prod: first "Why" y 418
│││ ▸ Why it matters                     │││
││└──────────────────────────────────────┘││
││ Cooking · Energy use (3 cards)         ││  ◂ remaining groups (prod)
││ General information only, not medical  ││
││ advice. Follow local public-health     ││
││ advisories.                            ││
│└────────────────────────────────────────┘│
│ footer                                   │
├──────────────────────────────────────────┤
│ Today    Ask    Home  [Habits] Profile   │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    Today  Ask AirAware  My Home  [Better Habits]  My Profile        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Better Habits                                                                              │
│ Practical habits that cut pollution for you and your neighbours. We never show an          │  ◂ proposal, needs OK (placement): shipped landing line reused
│ emissions saving we can't calculate.                                                       │
│┌──────────────────────────────────────────────────────────────────────────────────────────┐│
││ Daily commuting and vehicle   Waste                         Cooking                      ││  ◂ one grid of group cells (F-25); in production single-card groups use only the left half
││ idling                        ┌───────────────────────────┐ ┌───────────────────────────┐││
││ ┌───────────────────────────┐ │ Don't burn waste or       │ │ Consider a cleaner        │││
││ │ Switch off the engine     │ │ leaves                    │ │ cooking fuel where        │││
││ │ while you wait            │ │ (card text)               │ │ possible                  │││
││ │ (card text)               │ │ ▸ Why it matters          │ │ ▸ Why it matters          │││
││ │ ▸ Why it matters          │ └───────────────────────────┘ └───────────────────────────┘││
││ └───────────────────────────┘                                                            ││
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡  ◂ prod: first "Why" y 381
││ Energy use                                                                               ││  ◂ a group with 3 cards spans the full row
││ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐││
││ │ Choose star-labelled      │ │ (second Energy use        │ │ Switch off lights you     │││
││ │ appliances                │ │ card, as shipped)         │ │ are not using             │││
││ └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘││
││ General information only, not medical advice. Follow local public-health advisories.     ││
│└──────────────────────────────────────────────────────────────────────────────────────────┘│
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone:** H1, purpose line, the first group with its whole card and "Why it matters", and the next group's heading and title. **Desktop:** H1, purpose line and the first row of three groups.
- **States:** guides loading (skeleton sized like the first row, F-02); guides error (shipped "We couldn't load the guides" / "Something went wrong loading the guides." / "Try again").
- **Findings:** F-02, F-25, F-23.
- **A vs B:** as My Home.

## 17. My Profile: no session (`/app/profile`)

Order from the brief: remembered place (only if any), the household form, saved plans (always rendered), your data (F-05, F-06). With no session there is no remembered place and nothing to delete, so neither block shows. Nothing here makes an API call or creates an account.

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤
│ My Profile                               │  ◂ H1
│┌────────────────────────────────────────┐│
││ Your household (optional)              ││  ◂ H2
││ Answers make the daily plan fit your   ││
││ routine and home. Every question is    ││
││ optional, and none asks about health   ││
││ conditions.                            ││
││ Your routine                           ││  ◂ fieldset legend
││ How do you usually travel to work or   ││
││ college?                               ││
││ [Not answered                    ▾]    ││
││ Do you exercise outdoors?              ││
││ [Not answered                    ▾]    ││
││ Does a child in your home travel to    ││
││ school?                                ││
││ [Not answered                    ▾]    ││
╞═ fold at y 787═══════════════════════════╡
││ Your home (4 questions) · Who lives    ││
││ with you (3 questions)                 ││
││ (Save my answers)                      ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Saved plans                            ││  ◂ H2, now always rendered (F-06)
││ No saved plans yet. Use Save plan      ││  ◂ first sentence shipped; second: proposal, needs OK (new text, F-06)
││ under See your full day on Today.      ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your data                              ││  ◂ proposal, needs OK (new heading)
││ Saved on this browser only. Clearing   ││  ◂ shipped SAVE_NOTE; proposal, needs OK (F-01): "Saving creates an anonymous account (no email or name)…"
││ your browser data or switching         ││
││ devices loses it.                      ││
││ (no "Delete my saved data": nothing is ││  ◂ hidden with no session (F-05)
││ saved)                                 ││
│└────────────────────────────────────────┘│
│ footer                                   │
├──────────────────────────────────────────┤
│ Today    Ask    Home   Habits [Profile]  │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    Today  Ask AirAware  My Home  Better Habits  [My Profile]        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ My Profile                                                                                 │
│ ┌─ form, left───────────────────────────────┐ ┌─ right column─────────────────────────────┐│  ◂ the right column is no longer empty (F-06, F-25)
│ │ Your household (optional)                 │ │ Saved plans                               ││
│ │ Answers make the daily plan fit your      │ │ No saved plans yet. Use Save              ││  ◂ second sentence: proposal, needs OK (new text, F-06)
│ │ routine and home. Every question is       │ │ plan under See your full day              ││
│ │ optional, and none asks about health      │ │ on Today.                                 ││
│ │ conditions.                               │ └───────────────────────────────────────────┘│
│ │ Your routine                              │ ┌───────────────────────────────────────────┐│
│ │ How do you usually travel to work or      │ │ Your data                                 ││  ◂ proposal, needs OK (new heading); the note under it is shipped SAVE_NOTE (F-01 proposal)
│ │ college?  [Not answered          ▾]       │ │ Saved on this browser only.               ││
│ │ Do you exercise outdoors?                 │ │ Clearing your browser data or             ││
│ │ [Not answered          ▾]                 │ │ switching devices loses it.               ││
│ │ (6 more questions)                        │ └───────────────────────────────────────────┘│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡
│ │ (Save my answers)                         │                                              │
│ └───────────────────────────────────────────┘                                              │
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone:** H1, the form's heading, intro and first three questions. Saved plans and Your data follow. **Desktop:** the form's start on the left; Saved plans and Your data on the right.
- **States:** saving not set up (shipped "Saving isn't set up on this site.", Save disabled); save succeeded (shipped "Saved on this browser.", proposal F-01 "Saved to your anonymous account."); save failed or rate limited (shipped, answers kept); saved answers could not load (shipped "Your saved answers couldn't be loaded right now.").
- **Open point:** with the F-01 note in "Your data", it sits below Saved plans on phones, far from "Save my answers", which points to it with `aria-describedby`. Keeping one line next to the button is an option (open question).
- **Findings:** F-05, F-06, F-01, F-25.
- **A vs B:** A puts the title on the sky; B in a compact dark masthead, with small uppercase section labels.

## 18. My Profile: with saved data

Code-trace only: Stage 0 never captured a session (audit section 10), because a session creates an account. Dates are `{date, HH:MM}`; answers are illustrative.

### Phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                [◉ Pune ▾]    │
├──────────────────────────────────────────┤
│ My Profile                               │
│┌────────────────────────────────────────┐│
││ Your place                             ││  ◂ shipped heading (Profile.tsx:104); shown only with a remembered place
││ Remembered place: Pune, Maharashtra    ││
││ (Forget this place)                    ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your household (optional)              ││
││ (intro as shipped)                     ││
││ Your routine                           ││
││ How do you usually travel to work or   ││
││ college?                               ││
││ [Walk                            ▾]    ││  ◂ illustrative saved answer
││ Do you exercise outdoors?              ││
││ [Yes                             ▾]    ││
╞═ fold at y 787═══════════════════════════╡
││ (7 more questions)                     ││
││ (Save my answers)                      ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Saved plans                            ││
││ Pune, Maharashtra                      ││
││ Saved {date, HH:MM}                    ││
││ (Open)  (Delete)                       ││  ◂ screen-reader names include the place and date
││ Pune, Maharashtra                      ││
││ Saved {date, HH:MM}                    ││
││ (Open)  (Delete)                       ││
│└────────────────────────────────────────┘│
│┌────────────────────────────────────────┐│
││ Your data                              ││  ◂ proposal, needs OK (new heading)
││ (F-01 note, as section 17)             ││
││ (Delete my saved data)                 ││  ◂ shown only when a session or saved answers exist (F-05)
│└────────────────────────────────────────┘│
│ footer                                   │
├──────────────────────────────────────────┤
│ Today    Ask    Home   Habits [Profile]  │
└──────────────────────────────────────────┘
```

### Desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI    Today  Ask AirAware  My Home  Better Habits  [My Profile]        [◉ Pune ▾] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ My Profile                                                                                 │
│ ┌─ form, left───────────────────────────────┐ ┌───────────────────────────────────────────┐│
│ │ Your household (optional)                 │ │ Your place                                ││
│ │ (intro as shipped)                        │ │ Remembered place: Pune,                   ││
│ │ Your routine                              │ │ Maharashtra                               ││
│ │ How do you usually travel to work or      │ │ (Forget this place)                       ││
│ │ college?  [Walk                  ▾]       │ └───────────────────────────────────────────┘│
│ │ Do you exercise outdoors?                 │ ┌───────────────────────────────────────────┐│
│ │ [Yes                   ▾]                 │ │ Saved plans                               ││
│ │ (7 more questions)                        │ │ Pune, Maharashtra                         ││
│ │ (Save my answers)                         │ │ Saved {date, HH:MM}                       ││
│ └───────────────────────────────────────────┘ │ (Open)  (Delete)                          ││
│                                               └───────────────────────────────────────────┘│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡
│                                               ┌─ Your data: note + (Delete my saved data)─┐│
│                                               └───────────────────────────────────────────┘│
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone:** H1, Your place with "Forget this place", the form's start. **Desktop:** the form's start, Your place and the first saved plan.
- **States:** delete confirmation (shipped "This deletes your saved answers and plans from AirAware. It can't be undone." with "Delete everything" and "Cancel", focus on Cancel); deleted (shipped "Deleted. Nothing is saved now."); one plan's delete confirmation (shipped "Delete this saved plan? It can't be undone."); an opened plan below the list (shipped "Saved plan from {date, HH:MM}. This is a snapshot, not current air information." and "Close"; its disclaimer wording is F-41); list failed (shipped "Your saved plans couldn't be loaded right now."); 20-plan limit message at save time; place forgotten (shipped "This place is no longer remembered.").
- **Findings:** F-01, F-05, F-41, F-43.
- **A vs B:** as section 17.

## 19. Privacy (`/privacy`) and the 404 page

### Privacy, phone 390x844

```text
┌──────────────────────────────────────────┐
│ AirAware AI                              │  ◂ navy app-style header (F-29); logo goes to / ; no chip, no bar, no backdrop
├──────────────────────────────────────────┤
│ ‹ Back to AirAware                       │  ◂ proposal, needs OK (new text, F-28): link to /app
│ Privacy                                  │  ◂ H1
│ AirAware AI is built to need as little   │
│ about you as possible. This is what      │
│ goes where.                              │
│┌────────────────────────────────────────┐│  ◂ new "In short" block (F-29): three lines built from existing statements (Privacy.tsx:75, :96, :87 and :80); proposal, needs OK
││ In short                               ││  ◂ proposal, needs OK (new heading)
││ • Nothing is stored until you press    ││
││   "Save my answers" or "Save plan", or ││
││   tick "Remember on this device".      ││
││ • AirAware AI has no analytics,        ││
││   tracking or advertising.             ││
││ • "Delete my saved data" removes your  ││
││   account, saved answers and saved     ││
││   plans; Supabase's own logs may keep  ││
││   your IP address.                     ││
│└────────────────────────────────────────┘│
│ What stays in your browser               │  ◂ the 7 shipped sections follow, claims unchanged
│ • Your household answers stay on this    │
│   page until you press "Save my          │
│   answers".                              │
╞═ fold at y 844 (no bottom bar)═══════════╡  ◂ prod: 3.4 screens at 390
│ What Open-Meteo receives                 │
│ What the AI writers receive              │
│ What happens to your questions           │
│ What Supabase stores                     │  ◂ proposal, needs OK (F-29): gloss once, "Supabase (our database host)"
│ How to delete                            │  ◂ retention line waits for the owner's check (F-07)
│ No analytics                             │
│ This page describes how the app works.   │
│ It is not legal advice.                  │
├─ footer──────────────────────────────────┤
│ attribution · Privacy                    │
└──────────────────────────────────────────┘
```

### Privacy, desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI                                                                                │  ◂ navy header; no chip, no navigation (not an app page)
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                    ‹ Back to AirAware                                                      │  ◂ proposal, needs OK (new text, F-28)
│                    Privacy                                                                 │
│                    AirAware AI is built to need as little about you as                     │
│                    possible. This is what goes where.                                      │
│                    ┌─ In short────────────────────────────────────────────┐                │  ◂ proposal, needs OK (new heading and 3 lines, F-29): from Privacy.tsx:75, :96, :87 and :80
│                    │ • Nothing is stored until you press "Save my answers"│                │
│                    │   or "Save plan", or tick "Remember on this device". │                │
│                    │ • AirAware AI has no analytics, tracking or          │                │
│                    │   advertising.                                       │                │
│                    │ • "Delete my saved data" removes your account, saved │                │
│                    │   answers and saved plans; Supabase's own logs may   │                │
│                    │   keep your IP address.                              │                │
│                    └──────────────────────────────────────────────────────┘                │
│                    What stays in your browser                                              │
│                    • Your household answers stay on this page until you                    │
│                      press "Save my answers".                                              │
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡
│                    (the other 6 sections, one reading column)                              │
│ footer                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold, phone:** back link, H1, intro, "In short", the first section's start. **Desktop:** the same plus the first section.
- **States:** none beyond long-text reading; keyboard walk not yet done on this page (audit section 10).
- **Findings:** F-29, F-28, F-07 (retention wording after the owner checks the cleanup job).
- **A vs B:** A: navy header, light reading page. B is not defined by the brief for Privacy; proposal: a compact dark masthead with "Privacy" and the intro, as on the other pages (open question).

### 404 page, phone 390x844

A static `client/public/404.html` (F-08): app colours and Inter, no JavaScript, no backdrop, no bottom bar.

```text
┌──────────────────────────────────────────┐
│ AirAware AI                              │  ◂ navy page (bg); logo links to /
├──────────────────────────────────────────┤
│ We couldn't find that page               │  ◂ H1; proposal, needs OK (new text, brief section 3)
│ [Go to AirAware]                         │  ◂ proposal, needs OK (new text): links to /app
│ (Home)                                   │  ◂ proposal, needs OK (new text): links to /
│ ~~~~~~~~~~ static skyline (optional) ~~  │  ◂ decorative inline SVG, aria-hidden; optional
╞═ fold at y 844═══════════════════════════╡
└──────────────────────────────────────────┘
```

### 404 page, desktop 1280x720

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AirAware AI                                                                                │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ We couldn't find that page                                                                 │  ◂ proposal, needs OK (new text, F-08)
│ [Go to AirAware]   (Home)                                                                  │  ◂ proposal, needs OK (new text, F-08)
│ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ static skyline (optional) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│
╞═ fold at y 720═════════════════════════════════════════════════════════════════════════════╡
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Above the fold:** everything, at both widths.
- **States:** none. Netlify serves it with status 404 for any unknown path outside `/app`. Unknown `/app/*` names go to `/app` with the query kept (F-09); that is a redirect, not this page.
- **Findings:** F-08 (now Netlify's own "Page not found", `prod-unknown-default-1280x720-first.jpg`), F-09.
- **A vs B:** not defined by the brief; proposal: A uses the landing's navy page with the shipped headline size; B uses the editorial large headline. One file either way (open question).

## 20. Where the brief and the code differ

The code wins on facts. These frames follow the code and record each difference here.

| # | Brief says | Code says | What the frames do |
|---|---|---|---|
| 1 | The Today anchor shows no made-by line | "Made with AI" or "Made by our rules", then the general-information note, sit inside the recommendation card (`DailyPlanSection.tsx:274-276`; note text `server/src/services/recommendations/plan.ts:13-14`) | Kept in every Today frame |
| 2 | Invite button "[Tailor this to your household]" | Shipped label "Make it personal: 2 quick questions" plus "Not now" (`AppShell.tsx:431,438`); the brief only moves and restyles it | Shipped label, outlined |
| 3 | Phone anchor draws "See your full day" outside the card | It is a `<details>` inside the recommendation card (`DailyPlanSection.tsx:278-301`) | Inside the card |
| 4 | Desktop anchor chip reads "Pune, Maharashtra" | Brief section 3 decides "text before the first comma"; the chip has room for more on desktop (`PlaceChip.tsx:41` `md:max-w-56`) | "Pune" at every width; the owner can choose the full name on desktop |
| 5 | Anchor: help choices "2x2" on phones | `grid gap-3 sm:grid-cols-2 lg:grid-cols-4` (`HelpChoices.tsx:55`): one column below 640 px | One column on phones (shipped), four in a row from lg. The brief's 2 x 2 is a layout proposal drawn in both mockups (INFORMATION_ARCHITECTURE.md §6.1 T12) |
| 6 | Ask: "3 starter questions for the chosen topic" | Five starters, one per topic and none for habits; a topic chip sends at once, so there is no "chosen topic" state (`ask.ts:17-38`, `AskEntry.tsx:28-52`) | Three shipped starters plus "More questions" for the other two; no invented questions |
| 7 | My Profile section "Remembered place" | Heading "Your place", line "Remembered place: {label}" (`Profile.tsx:98-108`) | Shipped heading |
| 8 | Today desktop "verdict card (7/12)", "recommendation (5/12)" | Columns are `3fr` / `2fr` (`AppShell.tsx:369`) | About 3/5 and 2/5 |
| 9 | Forecast error: "no footer Background line" | Confirmed: after an error `previous` is null, so `shown` is null and the line is not rendered (`useRequest.ts`, `AppShell.tsx:143-146,473`) | No Background line (no conflict; checked) |

## 21. Copy in these frames that needs the owner's OK

The full list the owner answers is IMPLEMENTATION_OUTLINE.md §3 P1 Part A; this table repeats the rows this document touches. Frames show shipped text. These are the proposed replacements and new strings, by place.

| ID | Where | Shipped | Proposed |
|---|---|---|---|
| F-01 | Welcome step 3; My Profile; Save plan | "Creates an anonymous save on this device. Delete it any time in My Profile." / "Saved on this browser only. Clearing your browser data or switching devices loses it." / "Saved on this browser." | As brief section 8 (anonymous account, AirAware's database host, delete in My Profile), reworded to match the code: "…, and this browser keeps the sign-in." instead of "only this browser can open them" (`Privacy.tsx:81`); Remember: "Creates an anonymous account that keeps your answers, and a place you searched for, so this browser can reopen them. Delete it any time in My Profile." (`Privacy.tsx:78-79`) |
| F-10 | Place chip, no place | "Choose a place" | "Choose place" |
| F-15 | Ask "Using" line | "0 of 10 answers · Edit" | "0 of 10 household questions answered · Edit" |
| F-16 | Today incomplete check | "Live air information unavailable" | "Air information unavailable" |
| F-22 | Today verdict card | Meaning sentence under the provenance | Drop it from the card (keep it in Air quality details). Open question 11 for the above-limit state |
| F-14 | Today top card, My Home | "For you" line always shown | Only when household answers exist |
| F-18 | Today while the forecast loads | "Loading forecast" (screen-reader-only; grey bars only) | Visible "Loading forecast…" |
| F-23 | Today, My Home, Better Habits | "Why this recommendation?", "Why it matters" | "Why?" everywhere; the card title stays in the screen-reader name |
| F-24 | Today help choice; Ask chip; Landing section 3 | "Greener habits" | "Better habits" |
| F-30 | Today stale banner | (no control) | "Reload forecast" button |
| F-31 | Today plan error | (nothing) | "The forecast above is still up to date." |
| F-32 | Today, Ask, My Home | "updated HH:MM" | "retrieved HH:MM" |
| F-33 | Ask "Using" line | (no stale mark) | "· Not current" when over 60 minutes old |
| F-34 | Ask "Based on" line | "… · Model forecast · updated HH:MM" | Add "· Open-Meteo"; "Model forecast" only when a forecast exists |
| F-35 | Place search | "No places found"; the server's message | "No places found. Try a nearby city, or use your location." / "Search isn't working right now. Try again, or use your location." |
| F-27 | Welcome step 1 | (nothing) | "See today's air forecast for your place and one thing you could do." |
| F-06 | My Profile, no session | "No saved plans yet." (only with a session) | "No saved plans yet. Use Save plan under See your full day on Today." |
| F-08 | 404 page | Netlify's page | "We couldn't find that page", "Go to AirAware", "Home" |
| F-28 | Privacy | (no link) | "Back to AirAware" |
| F-29 | Privacy | (no summary); "What Supabase stores" | "In short" with three lines built from existing statements (section 19); "Supabase (our database host)" once |
| F-19 | Landing | (no submit; chapters as shipped) | Outlined "Search" submit button; "What AirAware helps with" and "My Home and Better Habits" headings; drop the Air quality details capture; fold "Your personal daily plan" into section 4 without its card |
| - | Ask | "Good morning. I'm AirAware. Ask me about your day, your home or your commute." | Replaced by "Ask about your air, home or day. Answers come from AirAware's rules and today's forecast." |
| - | Ask | (no control) | "More questions" disclosure |
| - | My Home, Better Habits | (no purpose line) | Reuse the shipped landing lines for "Improve indoor air" and "Sustainable everyday choices" |
| - | My Profile | (no heading) | "Your data" section heading |

## 22. Open questions for the owner

1. **Landing:** drop the Air quality details capture and fold "Your personal daily plan" into section 4 without its card? Moving the dated Today capture to section 2 leaves the desktop hero as text over the skyline; the alternative keeps it in the hero's right column, as shipped.
2. **Ask on desktop:** the two-column layout (text box and thread left, topics and starters in a sticky right column from 1024 px) is this file's proposal, not the brief's. The alternative is the shipped single 48rem column.
3. **Ask purpose line:** its first sentence repeats the input label "Ask about your air, home or day". Keep both, or shorten the purpose line? Drop the shipped greeting?
4. **My Profile:** the F-01 note moves to "Your data", far below "Save my answers" on phones. Keep one line next to the button as well?
5. **Plan error:** "The forecast above is still up to date." is wrong on desktop, where the forecast sits to the left. One wording for both widths is needed.
6. **My Home:** when today's plan has no indoor card, keep the reserved panel with a one-line note (new text) or remove it before first paint?
7. **Direction B gaps:** the masthead in the forecast-error state, Privacy and the 404 page are not defined by the brief. Forecast error, the same two options as DESIGN_SYSTEM_PROPOSAL.md §13: (1) the shipped light `ErrorState` nested in the masthead with `on-light` (no new variant); (2) a dark error block in the masthead (mockup B; needs a dark `ErrorState` and re-checked button contrast). Privacy and 404: the proposals in section 19 need a yes or no.
8. **Place chip on desktop:** "Pune" at every width (section 3 of the brief) or the full name from 1024 px (the anchor)?
9. **Guide grids:** settled in DESIGN_SYSTEM_PROPOSAL.md §3.3 (each group is one grid item; a group with 2+ cards spans the row). Section 15 and mockup B draw it; mockup A differs, and its note says so.
10. **Fold lines:** closed for Today success. The mockups measured "Why?" at 390x844: A y 739 (above the fold), B y 807 (below); see section 8 and DESIGN_CONCEPTS.md §7. The other Today frames' folds remain estimates.
11. **F-22 in the above-limit state:** the meaning sentence ("Fine particles (PM2.5) are forecast above the national daily limit for the next 24 hours.") is the only line that names which pollutant is above, and that state has no caveat. Keep the sentence there even if it goes from the within-limit card?
12. **Privacy line 44 (a copy finding outside the Stage 0 register):** "No account exists until you press a save button." (`Privacy.tsx:44`) leaves out the Remember tick, which `Privacy.tsx:75` names. The proposed "In short" line uses `:75`. Fix `:44` the same way?
