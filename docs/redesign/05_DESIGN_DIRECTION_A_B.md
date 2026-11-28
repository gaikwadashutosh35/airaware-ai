# 05 · Design directions A and B

**Status:** proposal only, read-only phase, 28 Nov 2026. I changed no application code, config, test or existing doc, and I did not edit the prototypes. This doc describes the two directions, scores them, recommends one and lists ideas to take from the other.

**Labels**
- **OBSERVED** means I saw it in code, a doc or a rendered prototype screenshot. Each one cites a file:line or a screenshot path.
- **DESIGNER-MEASURED** means a figure from the designer's section file or results JSON that I did not re-run.
- **RECOMMENDED** means a proposal that needs the owner's OK.

**Naming note: read this first.** "Direction A" and "Direction B" in this doc are **new labels for this audit round**.
- They are not the owner's approved "Direction A: Calm atmosphere" (`OWNER_DECISIONS.md:3`).
- They are not the dropped "Direction B: Editorial city" (`DESIGN_CONCEPTS.md:79-103`; P9 dropped at `OWNER_DECISIONS.md:204`).
- Both new directions build on the shipped Calm atmosphere look. Neither replaces it.
- If the owner approves one, give it a new name in OWNER_DECISIONS, for example "A2 Editorial" or "A2 Sky stage", so the IDs don't collide.
- A's landing eyebrow ("Atmospheric environmental intelligence") also reuses B's working title. Pick one.

**Sources**
- Section files from the designers. These are temporary scratch files and are not committed:
  - `C:/Users/Ashutosh/AppData/Local/Temp/claude/5f56e6022b99d9b4/526cd9ef-a7c8-4b28-b2da-f59162db31c3/scratchpad/redesign/direction-a.md`
  - `C:/Users/Ashutosh/AppData/Local/Temp/claude/5f56e6022b99d9b4/526cd9ef-a7c8-4b28-b2da-f59162db31c3/scratchpad/redesign/direction-b.md`
- The prototypes: `docs/redesign/prototypes/direction-a.html` and `direction-b.html`.
- The screenshots listed in §1.
- Spot checks against `client/src` and `server/src`, cited inline.

---

## 1. How to open each prototype

| | Direction A | Direction B |
|---|---|---|
| File | `docs/redesign/prototypes/direction-a.html` (77 kB) | `docs/redesign/prototypes/direction-b.html` (96 kB) |
| Open | Double-click it, or `start docs\redesign\prototypes\direction-a.html`. It works offline with no build step and makes no network calls (DESIGNER-MEASURED) | The same, with `direction-b.html` |
| Switch screens | Black bar at the top: Landing, Today, Ask AirAware, Daily Plan, My Home, Better Habits, My Profile. These are hash links (`#s-today` and so on) | Black bar with a dashed edge, marked "PROTOTYPE". Hashes `#landing`, `#today`, `#ask`, `#plan`, `#home`, `#habits`, `#profile` |
| Switch air state | "Sample state" select in the top bar: Within the limit, Above the limit, No data, Not current | Dashed "Prototype state" control on Today: Within, Above, Unavailable, Not current |
| Labels | "Prototype · Direction A · Sample data · Not the live app · Not checked against modern-web-guidance" | "PROTOTYPE · Direction B: Atmospheric · Sample data, not the live app · Not checked against modern-web-guidance" |
| Screenshots | `docs/redesign/audit/screenshots/redesign-2026-11-28/direction-a/`. 38 JPEGs: `<screen>-{1440,390}.jpg` (full page), `<screen>-{w}-fold.jpg` (first screen), `{today,home,habits}-{w}-scrolled.jpg`, `today-{above,unknown,stale}-1440.jpg`, `today-1440-motion.jpg` | `.../direction-b/`. 34 JPEGs: `<screen>-{1440,390}.jpg` (full page, sticky bars set to static), `<screen>-{w}-fold.jpg`, `today-{above,unknown,stale}-{1440,390}.jpg` |

**Screenshot caveats (OBSERVED)**
- A's full-page shots draw the fixed city and the phone nav partway down the page. Use the `-fold` and `-scrolled` shots for the true view.
- In both directions, the prototype's own top bar takes space from the first screen: about 160 px in A at 390 and about 100 px in B. B's prototype state control also pushes the lens down at 390. So neither fold shot is exactly what the app would show.
- Both rendered a system fallback font, not Inter (both designers' notes). Expect small spacing changes in the app.
- The sample numbers differ between the two (A: PM2.5 31 / PM10 58; B: 38 / 71). Don't compare them as data.

**Screenshots I opened myself for this doc**
- A: `today-1440-fold`, `today-1440`, `today-390-fold`, `today-390`, `today-above-1440`, `today-stale-1440`, `today-unknown-1440`, `landing-1440-fold`, `plan-390-fold`, `ask-1440`, `home-390-scrolled`, `profile-390-fold`.
- B: `today-1440-fold`, `today-1440`, `today-390-fold`, `today-390`, `today-above-390`, `today-stale-390`, `today-stale-1440`, `today-unknown-1440`, `landing-1440-fold`, `plan-390-fold`, `ask-1440`, `home-390-fold`, `habits-390-fold`.
- I did not view the rest. That includes both directions' `landing-390`, `ask-390`, the 1440 Home, Habits and Profile shots, A's `today-1440-motion`, and B's `today-above-1440`. My statements about those come from the designers' notes and the prototype HTML.

---

## 2. Direction A: "Calm editorial"

**Idea, in one line:** keep the shipped look and fix density with type, space and fewer boxes. No new components and no dependencies.

### 2.1 Principles (RECOMMENDED, from direction-a.md §2)
1. One editorial statement per screen: Today's verdict, Plan's "Your day", Home's "Today, for your home".
2. Words carry the meaning. Every number sits with its unit, its data kind and its time.
3. Boxes only for real units. The verdict, the recommendation, the plan, the Home panel, the Ask answer and the Profile form stay as panels. Weather, hotspots, help choices and guide groups become hairline lists **on one continuous 85 % `.sheet`**, never on open sky.
4. The city is the brand. It is reused exactly and tuned slightly quieter.
5. Small teal journey eyebrows on sections: UNDERSTAND, GUIDANCE, ASK, TAKE ACTION, LEARN. The five destinations are unchanged.
6. Only the shipped motions. Nothing loops.

### 2.2 Palette and contrast
- **Tokens:** the shipped 16 are unchanged (OBSERVED `client/src/index.css:28-43`).
- **New tokens (RECOMMENDED):**
  - `--primary-ink` #0b6b62, for small teal text on light. It is needed because primary on surface-light is 1.72:1, so primary can only ever be a fill.
  - A danger ink, #a3262e, for the delete button.
- **Contrast (DESIGNER-MEASURED, `contrast.mjs`, WCAG 2 formula):**

| Pair | Ratio |
|---|---|
| text-dark on surface-light | 14.67 |
| text-dark-muted on surface-light | 6.61 |
| primary-ink on surface-light / on an 85 % card over the darkest city pixel | 5.98 / 5.21 |
| text-dark on teal button / on warning banner | 8.54 / 8.82 |
| text / text-muted on bg (landing) | 17.83 / 9.40 |
| text-dark on sky top: within / above / unknown | 9.31 / 9.86 / 10.58 |
| danger ink on surface-light | 6.85 |
| **text-dark-muted on within sky top** | **4.20, fails** |
| **primary-ink on within sky top** | **3.79, fails** |
| **text-dark-muted on raw city pixel, no sheet** | **2.27, fails** |

- **The rule that follows:** everything below the title block sits on a panel or the sheet. Text on open sky uses text-dark only.
- **Cross-check:** the pairs both designers measured agree exactly (9.31, 9.86, 10.58, 4.20, 14.67, 6.61, 8.54, 8.82). That is good evidence the method is consistent.

### 2.3 Type
- Inter only, at weights 400, 500 and 600, using Tailwind steps (H3 kept). There is no second face, because the CSP blocks third-party fonts and the editorial feel comes from scale.
- Sizes: display 48/60/72; page H1 30/36; H2 and verdict 24/30; card title 18/600; meta 14; **eyebrow 12, uppercase, 0.08em (new)**; ledger value 30 with tabular numbers.
- **The verdict is 24 px below 640 px** (OBSERVED in `direction-a.html` CSS: `.h2{font-size:24px}`, then 30px from 640px). **That is a small departure from H3** ("verdict `text-3xl` on all widths"), which A's notes don't list.

### 2.4 Layout
- 72rem container; gutters 16, 24 and 32 px.
- Today is 7fr/5fr from 1024 px: verdict on the left; recommendation and mini Ask on the right. On phones the recommendation comes straight after the verdict. **Correction (critic, 28 Nov):** the shipped page already does this. `AppShell.tsx:439-506` renders `TodayLead`, then `DailyPlanSection`, then weather and hotspots, and the 3fr/2fr grid applies only from `lg`. So this is kept, not new.
- Plan, Home, Habits and Profile use a 12rem label rail plus a 48rem column.
- **Ask is about 45rem wide**, against the shipped 896 px (`Ask.tsx:122`).

### 2.5 Cityscape
- **Geometry (OBSERVED in the prototype):** the shipped paths are exported unchanged from `skylineGeometry.ts`. Hue, veils, glow, clouds and forced-colours hiding are copied from `CitySkyline.tsx`.
- **Tuning (RECOMMENDED):**
  - quieter rows: far .30, mid .32, near .72 (shipped .36, .40, .90);
  - **lower band**: min(14rem,28vh) and min(20rem,34vh), against **H5**'s 16rem/32vh and 24rem/40vh;
  - the sky fades to paper at the bottom.
- **Landing:** the same geometry as a dusk silhouette with faint warm windows. No PNG (H4).

### 2.6 Components
- **Verdict ledger.** This is A's signature. It is OBSERVED in `today-1440-fold.jpg`.
  - Inside the verdict panel, PM2.5 and PM10 each get a row: the value in µg/m³, "24-hour model forecast average", "India's 24-hour limit 60 µg/m³" (100 for PM10) and the level tag.
  - A thin `aria-hidden` line puts the limit tick at 60 % of its width.
  - The source line sits in the same panel.
- **Level pill** with a dot: "Within the limit", "Above the limit", "No data" (`planDisplay.ts`).
- **"Not current":** a solid warning banner, plus "· Not current" appended to the source line (`today-stale-1440.jpg`).
- **Rule cards** with a "Why?" `<details>`: the chevron rotates and the body is indented behind a 2 px rule.
- **Help choices** become a two-column hairline list with arrows.
- **One teal pill per screen:** Check My Air, See your full day, Send, Save plan, Save my answers. Home and Habits have none.
- **"Ask about this"** fills the Ask box without sending. **"I'll try this"** tick. Both are marked "Proposal, not built".
- **Ask:** "Using" context as chips with Edit; 4 starters plus More topics; the answer card restates cards; Sources and limitations; Copy answer; "You could also ask:".

### 2.7 Motion
- Kept as shipped: press 0.97 over 120 ms, Ask answer rise over 200 ms, air fade over 700 ms, clouds settling once over 4.8 s.
- New: the Why? chevron, 160 ms. Cross-doc note: 09 C4 records disclosures as instant by decision. The panel still opens at once here and only the chevron turns, but it is new motion and needs the owner's OK.
- **Removed:** the landing scroll-timeline `.reveal`. It blanked the live captures. Keeping it in the app is the owner's call.
- Under reduced motion everything drops to 0.01 ms, and press becomes opacity only.

### 2.8 Per-screen highlights (OBSERVED in the screenshots named)

| Screen | What stands out |
|---|---|
| Landing (`landing-1440-fold`) | Dark hero with the shipped H1, Check My Air, Meet Your Assistant and search. On the right is a **drawn sample Today card** labelled "Sample data · An example of Today, not a live reading", in place of the shipped past screenshot. Then a dusk city, a 5-step journey band, and the closing line "We don't calculate an AQI." |
| Today (`today-1440`, `today-390`) | Greeting title block; verdict panel with ledger; recommendation panel with Why?, See your full day and Ask about this; mini Ask; "Also today" list (weather and FIRMS with its caveat word for word); a **placeholder link** for the 3-day weather table; help list; Make it personal; Air quality details (closed); footer |
| Ask (`ask-1440`) | J26 intro "Claude (Anthropic) reads your question…" (`ask.ts:57`); context chips; starters; sample conversation; composer credit "…(CC BY 4.0), based on CAMS…" |
| Daily Plan (`plan-390-fold`) | Its own view; Today stays active in the nav. "Sample AI plan" and "Made with AI…". A note explains that times of day appear only for AI plans. "For you" lines; By-area folds; Save plan |
| My Home (`home-390-scrolled`) | "This is the forecast for outside. AirAware has no reading from inside your home." Guide groups as hairline rows on the sheet |
| Better Habits | Shipped groups, with "We never show an emissions saving we can't calculate". No figures |
| My Profile (`profile-390-fold`) | 10 shipped questions in 3 fieldsets, 3 answered (matches Ask's "3 of 10"); Delete in danger ink |

### 2.9 Owner decisions A reopens or adds
- **H5:** band size and row opacities.
- **H3 (minor):** the verdict is 24 px on phones instead of `text-3xl`. Keeping 30 px removes this.
- **New tokens:** `--primary-ink` and danger ink.
- **New type role:** uppercase eyebrows.
- **Ask width:** narrower than shipped.
- **Landing `.reveal`:** removed.
- **G4:** keep the labelled 22 Nov capture, or use a drawn sample card. See §5, S8.
- **The `.sheet` surface:** a J22-style surface, so J22 is kept.
- **New copy, under CP-04:** landing eyebrow and statement; Home indoor line; Profile data sentence; plan note.

### 2.10 Effort (designer estimate)
About **9–12 engineer-days** on the existing stack, including E2E, copy-spec and axe updates. "Ask about this" adds about 0.5 day; the tick adds 1–2 days.

---

## 3. Direction B: "Sky stage"

**Idea, in one line:** sky above, ground below.
- Today opens on an open sky stage, with the verdict set large on the sky and a glass "reading lens" with both 24-hour averages over the city.
- Below the city's ground line, everything sits on one solid light sheet.
- Glass is used only for the nav pill, the place chip, the lens and the phone tab bar.

### 3.1 Principles (RECOMMENDED, from direction-b.md §1)
1. The sky carries state; words carry meaning. The picture stays `aria-hidden`.
2. One strong statement per screen: the verdict on Today, and the page title on a short sky band elsewhere.
3. Translucency is earned. Long text sits on solid ground.
4. Numbers belong to code; prose belongs to rule cards. The lens shows only `check.average24h` and the limit.
5. Calm motion. Decorative motion ends within 5 s.

### 3.2 Palette and contrast
- **Tokens:** the 16 shipped tokens only.
- **One off-token value:** #9b1c24 on the delete button (7.62:1). It needs a decision.
- **Contrast (DESIGNER-MEASURED from rendered pixels, `results-b.json`):**

| Pair | Within | Above | Unknown |
|---|---|---|---|
| text-dark on sky top / bottom | 9.31 / 12.95 | 9.86 / 12.01 | 10.58 / 12.56 |
| **text-dark-muted on sky top** | **4.20** | **4.44** | 4.77 |
| focus ring on sky bottom (needs 3:1) | 4.04 | 3.75 | 3.92 |
| text-dark-muted on lens over darkest city pixel | 5.81 | 5.98 | 5.93 |
| text-dark-muted on 85 % lens over black (floor) | 4.69 | 4.69 | 4.69 |

- **Ground contrast:** text-dark 14.67, muted 6.61, focus 4.58. "For you" tint 13.60. Landing: primary 10.47, secondary 7.91.
- **The rule that follows:** all text on the sky is text-dark. The `backdrop.spec.ts` contrast test would have to cover the lens and the eyebrow.

### 3.3 Type
- Inter only, Tailwind steps.
- **Verdict at 48 px from `lg` (`text-5xl`). This conflicts with H3** ("verdict `text-3xl` on all widths").
- Page title 24/30; section 20/24; card 18; data value 24 with tabular numbers.

### 3.4 Layout
- 72rem; gutters 16, 24 and 32 px.
- Today stage 7/5 (verdict | lens); ground 8/4 (main | aside with weather and hotspots).
- Home and Habits use two guide columns; Profile 7/5.
- **Ask stays at 56rem, as shipped.**
- New spacing tokens 4–64; sections 48 px apart.

### 3.5 Cityscape
- Geometry and looks are copied from `skylineGeometry.ts` and `CitySkyline.tsx:27-85` at the **shipped** opacities.
- Today keeps H5's band.
- **Shorter band (8.5rem / 11rem) on the other pages: conflicts with H5.**
- **Solid ground sheet below the title: conflicts with J22.** The implementation note says to keep the fixed backdrop and give content a solid background.
- Landing: the same city in navy tokens with faint teal lit windows, static.

### 3.6 Components
- **App header on the sky.** No navy bar; glass segmented nav pill from 1024 px; glass bottom tab bar on phones labelled Today, Ask, My Home, Habits, Profile. That is close to the shipped short labels (`AppNav.tsx:5-31`: Today, Ask, Home, Habits, Profile), except "My Home".
- **Verdict block on the sky.** Outline pill, provenance, explanation, caveat. "Not current" is a solid banner **with a "Reload forecast" button** (B10), seen in `today-stale-390.jpg`.
- **Reading lens.**
  - "24-hour average, model forecast" with a Sample data tag.
  - Each row shows the value in µg/m³, a bar on a 0–1.5× limit scale with a limit mark, and "Limit 60 · Within the limit".
  - Footnote: "Compared with India's 24-hour limits (NAAQS, CPCB 2009)… We don't calculate an AQI."
  - With no data, the readings are hidden and the lens says "No 24-hour comparison without a complete forecast." (`today-unknown-1440.jpg`).
- **Featured card:** one bordered box per section. Everything else is divided rows.
- **"Your day":** a **5-period strip on Today** (Morning, Commute, Daytime, Evening, At home; it matches `planDisplay.ts:42-48`). It opens a full timeline view that replaces the 60svh inner scroller (`DailyPlanSection.tsx:325`).
- **Help topics** become link rows. Ask starters are 2×2 tiles with icons, and the question is a dark bubble on the right.
- **Delete:** a red outline, distinct from Cancel. "I'll try this" is marked "Proposal".

### 3.7 Motion
- As shipped: air fade over 700 ms, clouds settling once over 4.8 s, press 0.97.
- New: a 200 ms screen rise, a 160 ms chevron, a 3 px arrow on hover, and the lens bar easing over 700 ms.
- No `.reveal`.
- DESIGNER-MEASURED: 0 running animations 5.2 s after load.

### 3.8 Per-screen highlights (OBSERVED in the screenshots named)

| Screen | What stands out |
|---|---|
| Landing (`landing-1440-fold`) | Night city with lit windows, shipped H1, a new sub-line, CTAs and a labelled search, plus "We use your device location only if you ask us to." **The right half of the hero is empty at 1440.** Then a journey band that names a destination for each step, and "Code owns the numbers. AI explains the rule cards." |
| Today (`today-1440`, `today-390`) | The verdict on the sky is the strongest first screen of the two. The lens shows both averages against the limits. Ground: featured recommendation, Your day strip, aside with Weather ("Weather sets the sky's clouds and rain only") and FIRMS hotspots, help rows, Ask entry, Air quality details |
| Ask (`ask-1440`) | Short sky band with the J26 intro and chips; starter tiles; "Sample answer, written for this prototype"; the answer gives no yes or no and cites one card; Sources and limitations; Copy answer; pinned composer |
| Daily Plan (`plan-390-fold`) | "Back to Today · Your full day"; the plan air line; a period timeline with sun-arc glyphs; "For you: you said you exercise outdoors." |
| My Home (`home-390-fold`) | "Outdoor model forecast for Pune… AirAware does not measure the air inside your home." Featured card, then rows |
| Better Habits (`habits-390-fold`) | Intro keeps the emissions line; rows with "I'll try this · Proposal" |
| My Profile | 3 of 10 answered (Car, Yes, Yes; `direction-b.html:901-908`). Note: direction-b.md §8 says "all Not answered", which is stale. The prototype is consistent with Ask's "3 of 10" |

### 3.9 Owner decisions B reopens or adds
- **H3:** verdict at 48 px.
- **H5:** compact band on non-Today pages.
- **J22:** solid ground sheet in place of see-through cards.
- **Header:** the shipped dark header is replaced by a glass nav on the sky.
- **Off-token value:** the delete red.
- **New first-screen numbers:** the lens.
- **New copy, under CP-04:** landing sub-line, location note, journey band, lens title and footnote, Home indoor line, plan note, Profile location line, "Back to Today".

### 3.10 Effort (designer estimate)
About **3–4 engineer-weeks** if everything is approved. No new dependency, API or data-model change, except persistence for "I'll try this".

---

## 4. Side by side (OBSERVED in prototypes unless marked)

| Topic | A | B |
|---|---|---|
| First thing on Today | Greeting, then the verdict **in a panel** with ledger rows | Verdict **on the sky**, large, with the lens beside it (1440) or below it (390) |
| 24-hour numbers | Inside the verdict panel, sharing its source line | In a separate glass lens with no source line or time of its own |
| Bar picture | Limit tick at 60 % of the width | 0–1.5× limit, so the tick is at about 67 % |
| Surfaces | 85 % panels plus one 85 % `.sheet` (J22 kept) | Solid ground sheet; glass only on nav, chip, lens and tab bar (J22 reopened) |
| Header | Shipped dark bar | Glass on the sky |
| Plan | Own view; Today shows the recommendation plus a teal "See your full day" | Today shows the 5-period strip; full timeline view |
| Journey signposting | In-app eyebrows on every section | Journey band on the landing only; in-app it comes from the strip and rows |
| Phone nav labels | Full names ("Ask AirAware", "Better Habits", …) | Mostly the shipped short labels (Ask, Habits, Profile), but "My Home" where shipped has "Home" |
| Stale banner | Solid, text only, **no Reload button** (a prototype omission: the shipped banner already has Reload, `TodayLead.tsx:53`) | Solid, **with "Reload forecast"** (matches B10 and shipped) |
| No-data state | Readings blank, **but the bars and the PM10 tag still show** (see S1) | Readings hidden; a clear line instead |
| Ask column | About 45rem | 56rem (shipped) |
| Phone Today length (`today-390.jpg`, prototype bar included) | 3,379 px | 3,495 px |
| Owner decisions touched | H5, G4, H3 (phone verdict 24 px, minor), plus new tokens and eyebrows | H3, H5, J22, header, plus new numbers on the first screen |
| Effort | 9–12 days | 15–20 days |

**On density:** the live Today was about 3,700 px on a phone (live-capture digest). The prototypes come in about 5–10 % shorter, before removing their own top bars. The comparison is not like-for-like:
- the shipped page hides the plan in an inner scroller;
- A leaves the 3-day weather table undrawn;
- B hides "Make it personal" because its sample household has answers;
- B shows the whole "Your day" strip.

So **neither direction proves a large cut in phone length**. What both do show is fewer look-alike boxes and a clearer order.

---

## 5. Banned-word and data-integrity slips: noted, not fixed

I did not edit the prototypes. I ran a word-boundary grep over both files' visible text: safe, healthy, clean air, good air, bad air, AQI, guarantee, live, measured, sensor and savings. Then I spot-checked the hits against source.

| # | Where | What | Severity | Suggested handling |
|---|---|---|---|---|
| S1 | **A**, No data state (`today-unknown-1440.jpg`; confirmed in the current HTML) | With no complete forecast, the PM rows still draw **filled bars**, and the PM10 row still reads **"India's 24-hour limit 100 µg/m³ · Within the limit"**. The PM2.5 row ends in a dangling "·". This implies a comparison that does not exist. Cause: the PM10 tag is hard-coded with no `data-when` (`direction-a.html:448`), and `setState()` sets the bar widths from 31 and 58 for any state other than "above" (the script near the end of the file) | **High.** It breaks "never present a check we didn't run" | Hide the ledger rows (or bars and tags) when the level is unknown, as B does, and show the shipped unavailable sentence only |
| S2 | **B**, lens (`direction-b.html:534-540`; `today-stale-1440.jpg`) | The lens numbers have **no source or retrieved time of their own**. In the Not-current state the lens is **not marked** "Not current": the banner sits on the left, while the lens beside it shows unchanged values and the footnote. The footer credit isn't marked either, though DI-05 lists the footer's " Not current." as a shipped marker (`REDESIGN_ACCEPTANCE_CRITERIA.md:236`). At 390 the lens sits below the banner and the verdict | Medium. Timestamps and stale warnings must travel with the numbers | Add "Model forecast · Open-Meteo · retrieved HH:MM" (plus "· Not current") to the lens foot |
| S3 | **B**, lens rows | "Limit 60" and "Limit 100" have **no unit** (the value has µg/m³). A writes "India's 24-hour limit 60 µg/m³" | Low–medium (units rule) | "Limit 60 µg/m³" |
| S4 | **B**, Ask composer credit (`direction-b.html` Ask panel, lines 637-699) | "Answers use AirAware's rules and an Open-Meteo model forecast (CC BY 4.0)…" **drops "based on CAMS"** and the **Privacy** link. Shipped `Ask.tsx:290-297` has both, and `Attribution.tsx:1` notes that Open-Meteo's terms require crediting CAMS. The Ask screen has no footer to make up for it | Medium (licence credit) | Keep the shipped credit line |
| S5 | **A**, Ask composer credit | Keeps CAMS, but **drops the Privacy link**, and Open-Meteo.com is plain text rather than a link (A §11 risk 2 already notes the link) | Low | Keep the shipped links |
| S6 | **B**, My Home guide "Air out while you cook or burn incense" | B **silently drops** the shipped second sentence "When the air outside is poor, keep windows open for shorter spells." (`server/src/services/recommendations/guides.ts:60`). It is not listed in B's deviation table | Medium. It changes rule-card text, which the server owns, and loses an outdoor-air caveat | Use the shipped text. If "poor" is the worry, raise it as a copy change for the owner |
| S7 | **A** (kept) and **B** (reworded): the within caveat | Shipped `today.ts:32`: "…does not mean the air is clean or free of risk." A keeps it word for word, on the landing card too. B shortens it to "…free of risk." | Owner call. "clean" is negated, not the banned phrase "clean air", but the brief's spirit is close. B's change also touches `rules.ts:175`, `today.test.ts:40` and `TodayLead.test.tsx:59` | Decide once; change server and client strings together |
| S8 | **A**, landing | Replaces the labelled past screenshot (G4: "Keep the 22 Nov capture") with a **drawn sample card**. It is labelled "Sample data · An example of Today, not a live reading", so it is not presented as real, but it is demo-like content on a page DI-10 ("No demo data", `REDESIGN_ACCEPTANCE_CRITERIA.md:241`) is meant to keep clean | Owner call | Keep the shipped capture (G4) unless the owner changes G4 |
| S9 | **B**, landing at 1440 | Empty right half. **G3** says "Keep a Today preview beside the hero, no empty half-screen" | Low (layout decision) | Put the shipped labelled capture there, as B's own note suggests |
| S10 | **Both**, Ask starters | "Is it a good idea to open my windows?" is shipped (`ask.ts:28`). The AI prompt bans "good idea" in **outputs**, not in user questions | Flag only | Owner call; no change needed for integrity |
| S11 | **Both**, "AQI" wording | Both use only "We don't calculate an AQI" and drop the shipped "not the CPCB National AQI" (`rules.ts:68-69`; A7; `copy.spec.ts` allows both) | Rule conflict between the brief and A7 | Owner picks one rule; then update `copy.spec.ts` or the prototypes |
| S12 | **B**, Today recommendation | It shows "Cut indoor smoke at the source" while the strip leads with "Check conditions before outdoor exercise". `topRecommendation` (`today.ts:56-72`) picks the AI plan's **first featured** item, not the first period, so this can be right if the AI featured it first. The sample doesn't show which | To confirm, not a verdict | Make the sample's featured order explicit |
| S13 | **Both**, the limit-line picture | Both draw value ÷ (scaled) limit as a bar. It is `aria-hidden`, no number or percentage is printed, and the words come first. It can still be read as a gauge or index | Owner call (both designers flag it) | Keep it decorative and unlabelled, or drop it |

**Clean in both (OBSERVED by grep):**
- no "safe", "healthy", "clean air", "good air" or "bad air";
- no live, measured or sensor wording for model data;
- weather is never given as a cause; B says outright "Weather sets the sky's clouds and rain only";
- outdoor values are explicitly not indoor on My Home in both;
- no emissions figures;
- "Made with AI. General information only, not medical advice…" is kept;
- the FIRMS caveat is kept word for word;
- "Model forecast · Open-Meteo · retrieved 3:38 PM" is on the verdict.

---

## 6. Scores

The scale runs from 1 (poor) to 5 (strong). Each score rests on the prototypes and screenshots above, not on a built app.

| Criterion | A | B | Evidence |
|---|---|---|---|
| **Journey clarity** (Understand → Ask → Guidance → Action → Learn) | **4** | **4** | A labels every section with a journey eyebrow and keeps the recommendation straight after the verdict on phones (as shipped); "Ask about this" links Guidance to Ask. B's 5-period "Your day" strip makes Guidance and Action concrete on Today and removes the inner scroller, and its landing band maps each step to a destination. In-app, though, B has no step labels. These strengths are different, so the scores tie |
| **Readability and accessibility** | **4** | **4** | Both: text-dark only on the sky, 44 px targets, no overflow at 320, 390 or 1440, visible focus (DESIGNER-MEASURED). A depends on 85 % translucency for every text surface, and its 12 px uppercase eyebrows are small. B's solid ground is the most robust surface, and its glass is limited to 3–4 elements, but its 48 px verdict and lens sit on the sky, where muted text fails, and its focus ring is 3.75:1 on the above sky. Neither was checked with axe, a screen reader, 200 % zoom or at 768 and 1280 |
| **Data-trust presentation** | **4** | **3** | A keeps the numbers, the limits with units, "24-hour model forecast average" and the source line in one panel, and appends "Not current" to that line. But it draws bars and "Within the limit" in the No data state (S1, high). B handles No data cleanly, but its lens has no source or time, isn't marked stale, and its limits lack units (S2, S3). It also drops the CAMS credit on Ask (S4) and silently cuts a rule-card sentence (S6). Once S1 is fixed, A is clearly ahead |
| **Distinctiveness vs generic SaaS** | **3** | **4** | B's open-sky verdict, glass nav on the sky and night city with lit windows read as AirAware and nobody else. A is refined, but its uppercase eyebrows, hairline lists and a ledger in a card are common editorial-dashboard patterns; its identity still rests on the shipped city |
| **Fit with existing identity and code (effort)** | **5** | **3** | A touches H5 and G4, adds two tokens, and makes a minor phone-size departure from H3. It keeps the dark header and J22. 9–12 days. B reopens H3 (at desktop), H5 and J22, replaces the header, adds first-screen numbers and touches all 34 `card-surface` uses. 3–4 weeks. `docs/UI_SKILLS_AND_REDESIGN.md:58-64` gives a **29 Nov** submission deadline with 3 attempts, and proposes submitting attempt 1 first and redesigning for attempt 2. Neither direction fits before 29 Nov, but A's slices ship independently |
| **Mobile quality** | **4** | **4** | A at 390: the verdict panel starts high and the recommendation follows straight after. Full-length nav labels fit, but are longer than the shipped short ones. B at 390: the verdict is readable on the sky without card chrome, uses the shipped short tab labels, and has the clearest stale banner with Reload. Its lens falls below the first screen (partly because of the prototype state control), and the period strip becomes a tidy list. Fold shots in both are skewed by prototype chrome |
| **Motion and performance risk** | **5** | **4** | A: shipped motions plus one chevron; drops the `.reveal`; blur count about the same as shipped. B: CSS only, ends in 5 s (0 animations at 5.2 s), and **fewer** blurred layers than shipped. But it adds a screen-rise transition, `@property` colour animation and a 700 ms bar ease, and moving the header onto the sky adds blur over a changing backdrop on every page. Both are low risk, with no library and no canvas |
| **Total (out of 35)** | **29** | **26** | |

---

## 7. Recommendation

**Use Direction A as the base, fix S1, and take B's best Today ideas (listed in §8).**

Why A:
1. **It is the safer base for data trust.** Numbers, limits with units, data kind, source, time and "Not current" all live in one panel. That matches AGENTS.md §5-6 better than a separate lens. Its one serious slip (S1) is a small conditional fix. B's slips (S2–S4, S6) are spread across the lens, the Ask credit and rule-card text.
2. **It reopens the fewest owner decisions.** J22 and the header stay as decided. H5 (band and opacities) and G4 are touched, and H3 only at phone width, which goes away if the verdict stays at 30 px. B needs new decision rows for H3, H5 and J22 and a header change.
3. **Effort and deadline.** 9–12 days against 3–4 weeks. A's work splits into independent slices (tokens, Today recomposition, guide lists, Ask chips), so a partial landing is still coherent.
4. **It keeps the shipped identity intact,** which the brief asks for ("without rebuilding it").

Where B is better:
- the first screen is more distinctive;
- the stale and no-data states are better handled;
- the plan strip is clearer;
- the solid ground is more robust.

Those are worth taking. The full sky stage is worth keeping as a **later, separately approved phase** if the owner wants more character after A ships.

---

## 8. Ideas to take from B into A (RECOMMENDED; each needs the owner's OK)

| # | Take from B | Why | Decision ID / cost |
|---|---|---|---|
| G1 | **"Your day" 5-period strip on Today**, linking to the full timeline view (replaces the 60 svh inner scroller, `DailyPlanSection.tsx:325`) | Makes Guidance → Take action visible on Today; removes a nested scroller. Periods exist only for AI plans (`planDisplay.ts:56-58`), so with the rules fallback show A's recommendation alone. Removing the scroller reverses the owner's 27 Nov ruling (`DESIGN.md:88`), so it needs D13 (doc 14). Doc 06's N1 clock-band timeline is a different, later design; doc 14 ships this strip in R4 and holds N1 as "Later" | D13 (doc 14); part of A's plan-view work (M) |
| G2 | **No-data handling: hide the readings and show one plain line** | Fixes S1 | None (S) |
| G3 | **"Reload forecast" button inside the solid stale banner** | A's prototype omits it, and B10 requires it. **It already ships** (`StaleBanner onReload`, `TodayLead.tsx:53`, wired at `AppShell.tsx:442`; doc 14 R2), so this means "keep it", not "add it" | B10 (already decided); no build cost |
| G4 | **Shipped short phone tab labels** (Today, Ask, Home, Habits, Profile, `AppNav.tsx:5-31`). B comes close, but uses "My Home" | Keeps the shipped behaviour; more room at 320 | None; this means don't adopt A's full labels |
| G5 | **Danger outline button distinct from Cancel** (use A's danger ink as the token instead of B's off-token red) | Closes the open "danger looks like Cancel" finding | New token row (S) |
| G6 | **"Weather sets the sky's clouds and rain only."** under the weather rows | Says plainly that weather is never treated as a cause | CP-04 new copy (S) |
| G7 | **Help topics as link rows with a trailing arrow**, and Ask starters with lucide icons | Same density goal as A; icons already ship (lucide-react) | None (S) |
| G8 | **Landing night city with a few lit windows in `primary`** (instead of A's warning windows) | Lifts the landing a little; same geometry, no PNG (H4) | H4-compatible (S) |
| G9 | **Landing journey band that names each step's destination** ("Ask · Ask AirAware", "Take action · My Home / Better Habits"…) | Ties the journey to the five destinations | CP-04 (S) |
| G10 | **Keep the Ask column at the shipped 56rem** (drop A's 45rem) | No reason to change a decided width | Avoids a new decision |

**Do not take now (defer as an optional "Sky stage" phase):**
- the verdict on open sky at 48 px (H3);
- the solid ground sheet in place of `card-surface` (J22);
- the glass header on the sky;
- the compact band on non-Today pages (H5);
- the separate glass lens (if it ever ships, fix S2 and S3 first).

**From A, keep as is:**
- the ledger inside the verdict panel (with S1 fixed);
- journey eyebrows;
- `--primary-ink` for small teal text;
- recommendation-first order on phones (already shipped; see the §2.4 correction);
- the `.sheet` rule for text below the title;
- dropping the landing `.reveal`.

**Both "Proposal, not built" items** ("Ask about this" and "I'll try this") stay separate owner decisions. "I'll try this" needs a storage ruling: browser-only unless saved. No server schema exists for it today.

---

## 9. Decisions the owner needs to make before any build

1. Choose the base direction: A as recommended, B, or neither.
2. **H5:** keep the shipped band, take A's lower and quieter band, or take B's compact band on non-Today pages. **Cross-doc note (critic):** H5 records the owner asking for a *bigger* city (26 Nov), and doc 10 §3 keeps H5's sizes and deepens the tones (P1). A's smaller, quieter band runs the other way. The team recommendation is therefore to keep H5 as shipped and use doc 10 P1/P2 for depth, unless the owner now wants a quieter city (doc 14 D7).
3. **AQI rule:** "We don't calculate an AQI" only (the brief), or also "not the CPCB National AQI" (A7, `copy.spec.ts`). See S11.
4. **The within caveat:** keep "…clean or free of risk" or shorten it to "…free of risk" (S7). Change server and client together.
5. **The limit-line picture:** keep it decorative or drop it (S13).
6. **Landing:** keep the labelled 22 Nov capture (G3/G4) beside the hero; no drawn sample card (S8) and no empty half (S9).
7. **New tokens:** `--primary-ink` #0b6b62 and the danger ink.
8. **Uppercase eyebrows** as a new type role.
9. **New copy under CP-04:** the lists in direction-a.md §9 and §11 and direction-b.md §9, plus G6 and G9.
10. **Any build phase** must first run modern-web-guidance (gate rule, `.claude/skills/airaware-ui/SKILL.md:15`). It needs `npx`, which this phase did not allow.

---

## 10. Not verified

- Neither prototype was rendered at **768×1024 or 1280×720**. Overflow was checked only at 320, 390 and 1440 (DESIGNER-MEASURED).
- **No axe run, no screen-reader pass, no 200 % zoom, no forced-colours, dark-mode or reduced-transparency renders** for either direction.
- Not checked against **modern-web-guidance** (both prototypes say so).
- **Inter did not render** in either set of screenshots; a system fallback (likely Segoe UI) did.
- **Rain, heat-shimmer and overcast** sky looks were not drawn in either direction.
- **Contrast ratios** are the designers' figures. I did not re-run them, though their shared pairs agree.
- **Effort figures** are the designers' estimates. I did not re-estimate them against the code.
- B's proposed implementation (fixed backdrop plus solid sheet sliding over it) was not built. Its prototype anchors the scene per page.
- The screenshots listed in §1 as not viewed by me were checked only through the designers' notes and the HTML.
- The live site was not reloaded for this doc. Current-app facts come from the live-capture and code-audit digests.
