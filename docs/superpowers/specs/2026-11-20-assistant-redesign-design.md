# Assistant Redesign: Design (Phase 1)

**Status:** Approved on 20 Nov 2026. The owner approved D1–D5 "as recommended" and chose G1 (A).
**Builds on:** `docs/UX_AUDIT.md`, approved 20 Nov 2026 "as recommended", with decisions D1–D5.
**Wireframes:** `docs/superpowers/specs/2026-11-20-assistant-redesign-wireframes.html`. Open it in a browser. It has phone and desktop frames for every screen.

## 1. Why

AirAware already holds honest data and good advice, but it shows them as a long data page. Ordinary people want to know three things: how the air is today, what to do, and why. The rule for every app screen: **"One screen. One clear situation. One recommended next action."**

## 2. Goals, non-goals, anti-goals

**Goals:**
1. A 320×640 phone answers "How is my air today?" in one sentence on the first screen.
2. One recommended action, with its reason, is shown without pressing a button.
3. Every feature can be found through 5 navigation items: Today, Ask AirAware, My Home, Better Habits, My Profile.
4. All technical detail (values, units, sources, data kind, methodology, limitations) stays one tap away and unchanged.
5. Every feature that works today still works.

**Non-goals:**
- New data providers, observations, or any AQI calculation.
- An open-ended AI chat (D1).
- Email or password accounts, or any sign-in screen.
- A router library or Framer Motion (D5).

**Anti-goals.** These are failures even if the screen works:
- A verdict that reads as "safe", "healthy", "good air" or "clean air", or that reads as a measurement.
- Hiding the "Model forecast" label or the "Not current" banner to look cleaner.
- Any invented number in the app, the landing page or these wireframes.
- Saving or sending a device location.
- Storing or logging what people type into Ask AirAware.

## 3. Constraints

**Data rules (`AGENTS.md` §5, `.claude/rules/air-data.md`):**
- `model_forecast` is the only kind of data shown.
- The CPCB observation is reported as not connected.
- No AQI of any kind is shown.
- Stale data is labelled "Not current".

**Privacy (`AGENTS.md` §7):**
- Location only on request, rounded.
- No account until the user chooses to save.
- One-step delete.
- No logging of personal answers, questions or coordinates.

**AI (`AGENTS.md` §6):**
- AI only orders the rule cards and writes short wording.
- Its output is Zod-validated and checked against banned words.
- When AI is unavailable, the app uses the rules only.

**Technology:**
- React 19, Tailwind v4 tokens in `client/src/index.css`, lucide-react (already installed).
- No new runtime dependency. The Inter font files are assets under the OFL licence.

**Process:**
- One branch, `main`.
- Each phase is tested and committed locally.
- Everything is pushed once at the end, on the owner's word (each Netlify deploy costs about 15 credits).

## 4. Approaches (decided)

| Question | Chosen | Rejected and why |
|---|---|---|
| Paths between app pages | The existing `App.tsx` switch, with `history.pushState` and a `popstate` hook (about 20 lines) | A router library: a new dependency for 6 paths |
| Desktop navigation | A navy top bar | A sidebar: it wastes width on a single-column assistant |
| Ask AirAware (D1) *(amended 28 Nov, J26)* | Guided: questions matched to rule cards on the server; AI writes 2–3 sentences only | Open chat: a new AI risk surface, chat-log privacy, about 2 more days |
| Remembering (D2) | "Remember on this device" runs the existing Save; off by default | Browser storage (changes the privacy promise); no memory (onboarding repeats) |
| Recommendation (D3) | Built automatically once per place per hour | The button: the action stays hidden |
| Content gaps (D4) | New rule cards with cited sources for dust and cleaning, and for energy | Pages with gaps |
| Font and motion (D5) | Self-hosted Inter; CSS-only motion | Framer Motion; system fonts |
| App surface | Light content with navy bars (readability first, per `DESIGN.md` §2) | An all-dark app |

## 5. Information architecture

| Path | Page | Shown when |
|---|---|---|
| `/` | Landing | Always public |
| `/privacy` | Privacy | Always public |
| `/app/welcome` | Onboarding | First visit, or no place chosen |
| `/app` | Today | A place is chosen; otherwise it redirects to `/app/welcome` |
| `/app/ask` | Ask AirAware | Always. Without a place it asks for one first. |
| `/app/home` | My Home | Always |
| `/app/habits` | Better Habits | Always |
| `/app/profile` | My Profile | Always |

- **One app shell (`AppShell`)** wraps every `/app/*` page. It holds the place, forecast, plan and household answers, so moving between pages never fetches or builds anything twice.
- **URLs:**
  - The existing `?place=&lat=&lon=` link works on any `/app/*` path.
  - A searched place is written into the URL as it is today.
  - A device location never is.
- **Server and Netlify** add the new paths to their `index.html` fallback.

## 6. Navigation

**Phone (under 768 px):**
- A fixed bottom bar with 5 items: lucide icon plus short label.
  - **Today:** `Sun`
  - **Ask:** `MessageCircle`
  - **Home:** `House`
  - **Habits:** `Leaf`
  - **Profile:** `CircleUser`
- The bar is 56 px tall plus `env(safe-area-inset-bottom)`, and the page gets bottom padding so nothing hides behind it.

**768 px and wider:**
- A navy top bar: the logo, then the 5 items, with full labels from 1024 px.
- The place chip sits on the right.

**Current page:**
- `aria-current="page"`, a filled teal pill behind the icon and a bold label. Colour is never the only signal.
- The `<nav>` is labelled "Main", and a "Skip to content" link comes first.

**Place chip:**
- It reads "Pune, Maharashtra ▾" and is truncated with an ellipsis; the full name is its accessible name.
- It opens a native `<dialog>` with the existing `LocationSearch` and `UseMyLocation`.
- Focus returns to the chip when the dialog closes.

## 7. Screens

Each screen lists its content in order, then its states. The wireframes show each one.

### 7.1 Onboarding (`/app/welcome`)

**Layout:** three steps, one per screen. A step indicator shows "Step 1 of 3", and "Back" is on steps 2–3. When a step opens, focus moves to its heading.

**Step 1, "Where should we check air quality?":**
- The existing search and "Use my location", with its rounding hint.
- Choosing a place moves on to step 2.

**Step 2, "What does your typical day look like?":**
- Optional chips: native checkboxes styled as chips.
  - Office commute
  - School commute
  - Outdoor exercise
  - Work from home
- "Office commute" reveals a "How do you usually travel?" chip group: Walk, Cycle, Two-wheeler, Car, Public transport.
- "Work from home" and "Office commute" exclude each other.
- They map to `routine.commuteMode`, `routine.schoolCommute` and `routine.outdoorExercise`.
- "Skip" is always available.

**Step 3, "Tell us a little about your home":**
- Optional groups:
  - **Cooking fuel:** LPG, Electric, Wood/coal/crop waste, Other, Prefer not to say.
  - **Kitchen exhaust or chimney:** Yes, No.
  - **Air purifier:** Yes, No.
  - **Near a busy road:** Yes, No, Not sure.
- They map to the `home.*` fields.
- Then a checkbox, "Remember on this device", off by default, with the line "Creates an anonymous save on this device. Delete it any time in My Profile."
- The "See my air" button goes to Today.

**Who lives with you:** these questions are not in onboarding. They live in My Profile and are offered from "My family".

**Arriving with a place:** a visitor who arrives from the landing page with a place goes straight to Today. Today then shows a dismissible invite, "Make it personal: 2 quick questions", which opens step 2.

### 7.2 Today (`/app`)

**Content, in order:**
1. A greeting by device time ("Good morning", "Good afternoon" or "Good evening"), then the H1 "Today in {place}".
2. **The scene.** The existing `CitySkyline` plus its weather strip.
3. **The verdict.** The largest text on the screen (§8), with the existing level tag.
4. **The provenance line.** "Model forecast · Open-Meteo · updated {local time}".
5. **The "Not current" banner,** when stale. It is never hidden.
6. **The caveat.** One line, from the existing rule caveat.
7. **"Your recommendation for today".** One `PlanCard` with "Why this recommendation?", which is the existing "Why?". The card is the plan's first featured action; for a rules-only plan, the first card that is not a notice. The air notice itself is not repeated, because the verdict already says it.
8. **"See your full day".** A collapsed `PlanView` without its air notice or air check (both are in the verdict and the details), plus "Save plan".
9. **"What would you like help with?"** Four links, each with an icon and a one-line description:
   - **Outdoor activities** ("Walks, exercise, commutes") opens `/app/ask` and asks the outdoors topic at once. *Amended (Phase 7): the topic is held in memory, never `?topic=` in the address.*
   - **My home** ("Cooking, windows, purifiers") goes to `/app/home`.
   - **My family** ("Children, older adults, school runs") opens `/app/ask` and asks the family topic at once (in memory, as above).
   - **Greener habits** ("Small swaps that cut smoke and exhaust") goes to `/app/habits`.
10. **"Ask AirAware anything".** An input, plus 3 starter questions. Submitting opens `/app/ask` with the question asked.
11. **"Air quality details"** (collapsed, §7.3).

**Desktop:** the scene and verdict sit on the left and the recommendation on the right. Below them, the help choices are 4 across, then the Ask box and the details. The maximum width is 72 rem.

**States:**
- **Forecast loading:** the existing skeleton with its band.
- **Plan building:** a one-card skeleton labelled "Finding your recommendation…".
- **Forecast error:** the existing titled error card stays in place of the verdict. The plan is still built, because the server's rules handle missing air data. The help choices and Ask box stay.
- **Plan error:** "We couldn't build your recommendation." with "Try again". The verdict stays.
- **Data unavailable:** the verdict reads "Live air information unavailable", the existing notice title.
- **Long place name:** the H1 wraps and the chip truncates.

### 7.3 Air quality details

A `<details>` element. When open, it holds the existing parts, unchanged in content:
- the PM2.5 figure with its unit and hour, and the provider and resolution lines from `AirReadout`;
- `ForecastPanel` (the chart, its text summary, the pollutant table and the hourly table);
- one line: "Official CPCB observations are not connected yet";
- "How the 24-hour check works": India's NAAQS 24-hour limits for PM2.5 (60) and PM10 (100), with the note "We don't calculate an AQI";
- `SourcesPanel`, with the limitations merged into distinct lines (the wording is shown to the owner in Phase 6).

### 7.4 Ask AirAware (`/app/ask`)

*Amended (21 Nov): Ask is now a guided chat, see `2026-11-21-ask-guided-chat-design.md`. It adds a greeting, the conversation oldest first, questions back and suggestions, and drops the pressed-topic tick. The typed question's path and the AI input are unchanged.*

**Layout:**
- The heading "Ask AirAware", then a context line: "Using: the {place} model forecast, updated {time} · {n} of 10 answers". It links to My Profile.
- Without a place, the inline search comes first.
- Topic chips:
  - Outdoor activities
  - Windows and ventilation
  - Indoor air
  - My family
  - Commuting
  - Greener habits

  *Amended (Phase 7): there is no `?topic=`. A chip asks its topic at once, and the latest answer's topic shows as pressed with a tick.*
- Starter questions (from the brief), the ones for the chosen topic first:
  - "Can I go for a morning walk today?"
  - "Is it a good idea to open my windows?"
  - "How can I improve my indoor air?"
  - "What should I consider for my children's outdoor activities?"
  - "How can I reduce pollution while commuting?"
- **Input:** labelled "Ask about your air, home or day", up to 200 characters, with `enterkeyhint="send"` and a "Send" button.

**Each answer contains:**
1. A short answer in 1–2 sentences, labelled "Made with AI" or "Made by our rules". *Amended (Phase 7, decision 2): the plan's writer (`daily-plan-v2`) writes it; a rules answer uses the verdict's explanation.*
2. "Based on": the verdict, its time, "Model forecast", and any stale or missing-data notice.
3. Up to three cards, each with "Why?":
   - first, today's personal cards for the topic;
   - then general guide cards for the topic (§9.3, decision G1).
4. The safety note: "General information only, not medical advice. Follow local public-health advisories."

It never says yes or no to safety.

**States:**
- **Thinking:** "AirAware is thinking…", with a skeleton. *Amended (Phase 7): one screen-reader status line says it, then "Answer ready. …"; focus moves to the new answer's heading (§11).*
- **Error:** the existing `ErrorState` with "Try again".
- **Out-of-scope question:** "I can help with outdoor plans, windows and ventilation, indoor air, family and greener habits", with the topic chips.
- **Medical question:** "I can't give medical advice. For health concerns, please talk to a doctor.", followed by the forecast.

**History:** the conversation stays in memory for the visit only.

**The typed question:**
- It goes only to our server, which uses it to choose a topic.
- It is never passed to the AI writers, saved or logged.
- This keeps the basis on which Gemini's free tier was accepted (INTEGRATIONS.md: the AI input "holds only the app's own fixed text and model-forecast numbers").
- *Amended (28 Nov, J26, ADR-008): a typed question that is not medical now goes to Claude (never Gemini), with up to 2 earlier questions. It is still never saved or logged. See `2026-11-28-ask-claude-grounded-design.md`.*

### 7.5 My Home (`/app/home`)

1. **"Today, for your home".** The indoor cards from today's plan (they depend on the forecast and your answers). Hidden when there are none.
2. **"Ways to improve indoor air".** Evergreen cards, grouped:
   - **Cooking and smoke:** kitchen exhaust, ventilate the kitchen, cleaner fuel.
   - **Ventilation:** the existing trade-off card on high-forecast days, plus a new evergreen ventilation card (D4). It never gives a blanket "always open" or "always close".
   - **Dust and cleaning:** new (D4).
   - **Indoor habits:** cut indoor smoke at the source.
   - **Filtration:** a purifier card; a new evergreen one (D4).
   - **Near a busy road:** shown when you answered yes.
3. Each card's "Why?" becomes "Why it matters": the same reason, sources and caveat.

### 7.6 Better Habits (`/app/habits`)

Each card has "Why it matters", and no numbers for emission savings.

- **Daily commuting and vehicle idling:** "Combine trips and avoid idling".
- **Waste:** "Don't burn waste or leaves".
- **Cooking:** "Consider a cleaner cooking fuel where possible".
- **Energy use:** new cards (D4).

### 7.7 My Profile (`/app/profile`)

1. **Your answers.** The full existing form: the same 10 fields in 3 groups, with chips on phones and selects kept for long lists. It has "Save my answers".
2. **Your place.** The remembered place, with "Forget this place".
3. **Saved plans.** The existing list. It is always visible, with the empty state "No saved plans yet. Save one from Today." Opening a plan shows it inline, with "Close".
4. **Your data.** "Delete my saved data", shown only when something is saved. It uses the existing confirmation.
5. Links to Privacy and to "Sources and limitations".

### 7.8 Landing (`/`)

Eight sections, on the dark theme:
1. **Hero.**
   - "The air around you matters."
   - "Understand your city's air quality. Discover smarter daily routines. Make better choices for your home and community."
   - The buttons "Check My Air" (goes to `/app`) and "Meet Your Assistant" (goes to `/app/ask`), and the existing place search under "Or search a city".
   - A fresh screenshot of the new Today page, labelled as a past screenshot with its date.
2. **Understand Your Air:** the verdict, the "Model forecast" label and the details explained in plain words, with a screenshot.
3. **Your Personal Daily Plan:** the existing chapter and its real rule card.
4. **Improve Indoor Air:** the existing chapter.
5. **Sustainable Everyday Choices:** the existing chapter.
6. **Explainable AI:** the existing "See why" chapter, with "Why?" open.
7. **How AirAware Works:** the 4 real steps as a flow, plus the existing limits statement (not the CPCB AQI; observations not connected).
8. **Final CTA:** "Check My Air".

**Motion:** scroll reveals (opacity, plus an 8 px rise) use the CSS `animation-timeline: view()` under `@supports` and `motion-safe`. Without support, nothing moves.

*Amended (Phase 4, owner decisions of 20 Nov 2026):*
- The hero's screenshot is Today in the phone view, 390 px wide, shown at its real size.
- Section 2's screenshot is the open "Air quality details", because the verdict and the details sit too far apart for one screenshot; the hero shot already shows the verdict.
- Section 6 keeps the name "Explainable AI", with the text "AI can arrange our rules' suggestions and word them for your day, but it never decides them. Every suggestion opens to its reason, the answers and forecast check it used, its sources and its limits."
- The captions say "Today", not "dashboard".

## 8. Copy rules

| Air check (`air.level`) | Verdict (existing rule titles) | Plain explanation |
|---|---|---|
| `not_elevated` | "Forecast within India's 24-hour limits" | "Fine and coarse particles are forecast below the national daily limits for the next 24 hours." |
| `elevated` | "Forecast above India's 24-hour limit" | "{Fine particles (PM2.5) / coarse particles (PM10)} are forecast above the national daily limit for the next 24 hours." |
| `unknown` | "Live air information unavailable" | "We could not get a complete 24-hour forecast for this place, so there's no advice about today's air. The suggestions below apply on any day." |

**Plain words:**
- "fine particles (PM2.5)" and "coarse particles (PM10)";
- "updated 8:15 AM" in device time (the details keep the full time zone);
- no coordinates, grid sizes or model names in the default view.

**Never used:** "safe", "healthy", "clean air", "good" or "bad air", and "AQI", except in "We don't calculate an AQI".

**Kept word for word:** "Model forecast", "Not current: …", the rule card text, and the safety note.

## 9. Data and API changes

1. **Saved preferences gain `place`** (D2): `{label ≤ 120, latitude, longitude}`, with coordinates at 2 decimals. These are the same values the URL already carries for searched places.
   - A device-location place is never saved.
   - While "Remember" is on, choosing a new searched place replaces the saved one. A device location never replaces it.
   - My Profile shows the remembered place with "Forget this place".
   - This is a Zod contract change plus tests. There is no SQL migration, because the field is jsonb.
   - PRIVACY.md and the Privacy page are updated ("your last searched place").
2. **Auto-build** (D3):
   - The shell calls the existing `POST /recommendations/daily-plan` when a place is set and memory holds no plan for that place and hour.
   - It calls again when onboarding finishes.
   - **Answers changed without saving:** when Today opens and the current answers differ from the ones the plan used, it rebuilds once. The existing changed-answers check does this, and no account is needed.
   - It stays within the shared limit of 10 a minute.
3. **`GET /api/v1/recommendations/guides?topic=home|habits`** (Phase 8):
   - It returns general guide cards with their sources, from `rules.ts`, so the advice text has one source.
   - **Why general cards are needed:** today's rules fire only for certain answers or for days above the limit, and their reasons are personal ("You said…"). On a day within the limits with no answers, they give only 3 cards. General cards have neutral reasons.
   - Guide cards appear in Ask, My Home and Better Habits only. They are **not** added to the daily plan, so plans, the AI input and the e2e tests stay unchanged.
   - The scope of this content is decision G1 (§15).
   - Sources are researched and shown to the owner before commit.
4. **`POST /api/v1/assistant/answer`** (Phase 7):
   - **Request:** `{question (1–200 chars), place, householdContext?}` or `{topic, place, householdContext?}`, exactly one of `question` and `topic`. *Amended (Phase 7, decision 1).*
   - **Response:** `{topic, summary, generatedBy, air, forecast, cards[], sources[], notices[], safetyNote}`. *Amended (Phase 7): `forecast` (the model-forecast metadata, or null) carries "updated {time}" and the stale check; `summary` is null for a rules answer; `topic` can be `medical` or `out_of_scope`. Never the question, model or prompt version.*
   - **Topic choice:** deterministic keyword lists on the server, unit-tested, plus a medical-question guard.
   - **AI:** writes only the summary, from the topic, the forecast check and the chosen cards (never the question text), under the plan's existing output checks. *Amended (28 Nov, J26): for a typed question Claude reads the question and answers, `history` joins the request, and the rules' answer is the fallback; topic chips are unchanged. See the 28 Nov design.*
   - **Caching:** summaries come from the plan's writer, cached for 10 minutes by exactly what the writer is asked (the air check and the cards), never by the question text. *Amended (Phase 7).*
   - **Logging:** the question is never logged or stored.
   - **Rate limit:** the plan's limiter.

## 10. Motion (CSS only)

| Where | What | Timing |
|---|---|---|
| Buttons, chips, nav items | `:active` scale(0.97) | 120 ms ease-out |
| Hover | Gated by `(hover: hover) and (pointer: fine)` | 150 ms |
| New Ask answer | `@starting-style`: opacity 0 and translateY(8px), to the resting state | 200 ms ease-out |
| Details and "See your full day" | Instant (opened often, so no animation) | n/a |
| Place dialog | Opacity plus scale(0.97) entrance; exit faster than entrance | 200 ms in, 150 ms out |
| Landing sections | Scroll reveal (§7.8) | Tied to the scroll |

All of it is off under `prefers-reduced-motion`. The rain is unchanged.

## 11. Accessibility

- **Landmarks:** header, nav "Main", main and footer; a skip link.
- **Headings:** one H1 per page, in order.
- **Onboarding:** chips are real checkboxes and radios inside a `fieldset` and `legend`. Focus moves to each step's heading.
- **Ask:** one persistent `sr-only` status line (`<output>`) says "AirAware is thinking…", then "Answer ready. …" or the medical or out-of-scope sentence; focus moves to each new answer's heading. The input has a visible label. *Amended (Phase 7): a live answers list would read every card aloud.*
- **Dialog:** the native `<dialog>` closes on Escape and returns focus.
- **Targets and focus:** targets are 44 px or more, and focus is visible on the navy bars (the existing `.on-dark` focus colour).
- **Axe:** every new page gets axe tests. Playwright covers the phone and desktop projects.

## 12. Testing

- **Each phase:** test-first, with the full gate (unit, typecheck, lint, format, e2e) and screenshots at 320 and 1280 px.
- **e2e changes:** the strings listed in `docs/UX_AUDIT.md` §6 are updated in the task that changes them.
- **New e2e tests:**
  - onboarding through to Today;
  - moving between pages keeps the place without refetching;
  - an Ask answer, with the API stubbed;
  - My Profile delete.
- **Real-phone check:** Phase 9 (tap, safe areas, keyboard).

## 13. Execution order

| Order | Phase | Why this order |
|---|---|---|
| 1 | 3: design system (tokens, press states, mobile baseline, Inter, favicon) | Everything after uses it |
| 2 | 2: navigation, app shell, paths, place chip | Pages need the shell |
| 3 | 5: onboarding | Today assumes a place |
| 4 | 6: Today | Core screen |
| 5 | 8: General guide library (G1, about 15 cards with sources, owner-reviewed), the `guides` endpoint, My Home and Better Habits | Ask needs the guide cards |
| 6 | 7: Ask AirAware | Today links to it; uses the guide cards |
| 7 | 4: Landing | **My call:** moved after Today, so its screenshots show the new app. Cost if wrong: none. |
| 8 | 9 and 10: responsive and accessibility pass, real phone, final review | Last |

Each phase gets its own plan (`superpowers:writing-plans`) and owner approval before work starts.

## 14. Left to the builder

- Exact spacing within the `DESIGN.md` scale.
- Icon sizes.
- Animation durations within the §10 ranges.
- Skeleton shapes.
- Which 3 starter questions show on Today.

## 15. After the builder check

A fresh reviewer read this spec against the code. Here is how each of its questions was settled.

**Settled as my calls (cost if wrong in brackets):**
1. **The Ask question never reaches the AI** (§7.4, §9.4). This is already settled by INTEGRATIONS.md's basis for Gemini's free tier and by PRIVACY.md. (Answers are less tailored to the exact wording.) *Amended (28 Nov): reversed by J26 and ADR-008. The question reaches Claude, not Gemini, so the free-tier basis stands.*
2. **Unsaved answer changes rebuild the plan** once, when Today opens (§9.2). (One extra AI call per change.)
3. **With "Remember" on, the last searched place is the saved one.** A device location never is (§9.1). (A user who wanted the old city must search it again.)
4. **Guide cards stay out of the daily plan** (§9.3). (Plans don't show the new general advice.)
5. **Wireframe fixes:** the Ask answer and "No air data" frames now show only cards the rules can produce together.

**Decided by the owner on 20 Nov 2026: G1 (A), "Yes, write the library".** The general guide library is built before Ask (§13).

- **G1. General guide cards.** On a typical day, today's rules can't answer most Ask topics, My Home or Better Habits:
  - "My family" gets zero cards on any day within the limits;
  - "Can I go for a walk?" gets zero unless you said you exercise outdoors.

  The options:
  - **(A)** Write a general guide library: about 15 cards with neutral wording and cited sources, covering outdoor plans, family, windows and ventilation, indoor air (including dust and cleaning) and habits (including energy).
    - Ask, My Home and Better Habits use it, with your own personal cards first.
    - You review the wording and sources before they ship.
    - The content work moves before Ask in the order.
  - **(B)** Show only today's personal cards. When there are none, the answer states the forecast and lists the questions in My Profile that would personalise it.
    - My Home and Better Habits show today's cards plus the D4 cards only.
