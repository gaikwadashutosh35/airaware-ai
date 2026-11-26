# AirAware AI — UI/UX Design System

## 1. Product design direction

Create a trustworthy environmental technology product. Use the storytelling quality and visual hierarchy of the GitHub homepage as inspiration, not as a template to clone. AirAware must have its own identity, copy, illustrations, and interaction language.

**Reference:** https://www.awwwards.com/sites/github-homepage  
**Product inspiration:** https://github.com/  
**Additional reference:** https://github.blog/news-insights/company-news/how-we-designed-and-wrote-the-narrative-for-our-homepage/

## 2. Two complementary experiences

### Marketing website
- Editorial storytelling and immersive hero.
- Deep navy atmospheric environment.
- Bold headline and concise supporting copy.
- Alternating story chapters explaining product capabilities.
- Product screenshots and real UI visualizations.
- Strong CTAs: “Check My Air” and “Meet Your Assistant”.

### Application dashboard
- Prioritize information readability over atmosphere.
- Show observation/forecast distinction immediately.
- Clear pollutant values, units, source, and timestamps.
- Use accessible status labels and chart summaries.
- Keep the user's daily actions easy to scan.

## 3. Brand and visual tokens

Suggested starting palette (validate in browser and contrast tooling):

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#080F1C` | Marketing dark base |
| `--color-surface` | `#101C2B` | Dark panels |
| `--color-elevated` | `#172638` | Raised dark surfaces (navigation bars, active nav item) |
| `--color-surface-light` | `#F5F8FA` | Dashboard light surface option |
| `--color-primary` | `#39D5C2` | Primary accent/actions |
| `--color-secondary` | `#64A9FF` | Informational accents |
| `--color-text` | `#F4F7FA` | Dark-theme text |
| `--color-text-dark` | `#182435` | Light-theme text |
| `--color-warning` | `#F5B84B` | Warning |
| `--color-danger` | `#F06B72` | Severe/error status |
| `--color-success` | `#3BAA82` | Success |

Do not use these colors as the only indicators. Every AQI/status signal also needs text, icon/label, and accessible semantics.

## 4. Typography

- Primary UI: Inter or a similar highly legible sans-serif.
- **Inter is self-hosted:**
  - One Latin variable file, `client/public/fonts/inter-latin-wght-normal.woff2`, from `@fontsource-variable/inter` 5.3.0, under the OFL licence (`OFL.txt` beside it).
  - It is preloaded and uses `font-display: swap`, so text is never hidden.
  - Other glyphs fall back to the system sans.
- Display headings: choose one restrained display family only if it supports the editorial narrative.
- Use a limited scale: display, H1, H2, H3, body, small, caption.
- Keep dashboard body text comfortably readable.
- Avoid shouty uppercase tracking and excessive weight variation.

## 5. Layout and spacing

- Define a spacing scale and apply it consistently.
- Establish a readable content max-width.
- Use grid for dashboard composition and flexible stacking on mobile.
- Maintain a clear spacing rhythm between chapters.
- App pages: the gap above the footer card is 32 px on every tab, the same as between panels (main `py-8 sm:pt-12`, footer row `pb-8`, J21).
- Avoid repetitive card grids; use cards when they represent real independent objects/actions.
- Keep charts large enough to read and pair with textual interpretation.

## 6. Marketing homepage story

Seven sections (redesign P7, owner rulings G1–G7; before: eight, from the assistant redesign's Phase 4). Every screenshot is a real capture of the app, labelled as a past screenshot with its date, before the image. Three “Check My Air” links: hero, mid-page and final.

1. **Hero — “The air around you matters.”** One line on what AirAware does, “Check My Air” (`/app`), “Meet Your Assistant” (`/app/ask`), then the place search under “Or search a city” with an outlined “Search” button (landing only: Enter and the button choose a highlighted place, otherwise open the list, and never pick one on their own). Top-aligned from 1024 px, so the search is on the first 1280×720 screen. Beside it from 1024 px (after the search on phones), the dated phone screenshot of Today at its real size (G3). A still, decorative skyline (`aria-hidden`, the app's skyline paths, no air look) runs along the hero's bottom (G2).
2. **Understand your air.** The verdict and the “Model forecast” label in plain words; no screenshot (the Air quality details capture was dropped, G1).
3. **What AirAware helps with.** The four help choices' titles and lines, as plain text (the same data as Today's help choices).
4. **Explainable AI.** AI arranges and words the rules' suggestions but never decides them, plus the former “Your personal daily plan” text (G1); the example's “Why?” is open, with its sources; then a compact “Check My Air”.
5. **My Home and Better Habits.** “Improve indoor air” and “Sustainable everyday choices”, each with a real rule card labelled “Example from our rules”, side by side from 1024 px.
6. **How AirAware works.** The 4 real steps as a flow.
7. **Your city, the next two days.** The limits (model estimates, not station measurements, not the CPCB National AQI; observations not connected), then “Check My Air”.

## 7. Today information hierarchy

Today answers "How is my air?" first, then "What should I do?" (assistant redesign, Phase 6):

1. A greeting by device time, then the H1 "Today in {place}" (24 px below 640 px, 30 px from 640 px; redesign P3).
2. The weather strip (this hour's weather in words; the city scene is the page backdrop), then the verdict (the largest text), its word tag, "Model forecast · Open-Meteo · retrieved {time}", the "Not current" banner when stale (never hidden; a solid warning fill with "Reload forecast"), the meaning sentence when the forecast is above the limit or unknown, and the caveat. Within the limit the meaning sentence moves into "Air quality details" (owner ruling B1).
3. "Your recommendation for today": one plan card with "Why?" (every card's disclosure says "Why?", with the card title in its screen-reader name; owner ruling E1). Its "For you" line shows only once the household has answers (B2). "See your full day" folds the rest of the plan and "Save plan".
4. "Weather · Open-Meteo model data": a table of Yesterday, Today and Tomorrow (rows "At {local hour}", "Min–max", "Rain") with the note "Yesterday is past model data, not station measurements." It is hidden while loading, on error and when "Not current" (J20).
5. "What would you like help with?": four choices.
6. With no household answers, "Make it personal: 2 quick questions" (outlined, so the page keeps one teal action) and "Not now" (B8).
7. "Ask AirAware anything".
8. "Air quality details", closed: the PM2.5 figure, the forecast panel, the forecast location, the CPCB line, the 24-hour method, and sources with limitations.

From `lg`, the verdict sits on the left and the recommendation on the right; the rest runs full width below. Official observations, once connected, stay visibly separate from the model forecast. A saved plan opens in My Profile, never on Today.

Never show a large AQI number if its index type is ambiguous. If only PM2.5 is available, show PM2.5 concentration with units instead of inventing a CPCB AQI.

## 8. Components

- `LocationSearch` (the field shows the hint "e.g. Pune, India", J19)
- `LocationPermissionDialog`
- `DataProvenanceBadge`
- `FreshnessIndicator`
- `ObservationSummary`
- `ForecastSummary`
- `PollutantMetric`
- `PollutantTrendChart`
- `RecommendationCard`
- `RecommendationEvidence`
- `DailyPlanTimeline`
- `HouseholdPreferencesForm`
- `IndoorAirTip`
- `SustainableSwapCard`
- `SourceAndLimitationsPanel`
- `EmptyState`, `ErrorState`, `StaleDataState`, `Skeleton`
- **Built in the assistant redesign:**
  - `AppShell`: the frame for every `/app` page.
  - `AppNav`: one `<nav aria-label="Main">`. It is a bottom bar on phones, inline in the navy top bar from `md`, and marks the current page with `aria-current="page"`, an elevated pill and a teal icon; on desktop the pill also has a `text-muted` outline, and under forced colours the current item is underlined. The bottom bar pads for the bottom, left and right safe areas. A click that navigates moves focus to `#main` with `preventScroll`, so the new page still starts at its top (redesign P11). At 200 % text on a phone, each item's icon pill and label shrink to their cell (the label ends in an ellipsis only when it cannot fit: with 32 px text, at 390 none does, at 320 four of five do, and each link keeps its full `aria-label`), so nothing passes the screen edge; at normal text nothing changes.
  - `PlaceChip`: the place button and a native modal `<dialog>` holding `LocationSearch` and `UseMyLocation`.
  - `Profile`: the household answers, the remembered place ("Forget this place") and saved plans. An opened plan shows below the list under its snapshot banner, with "Close", which returns focus to its Open button. Redesign P6 (rulings F2, F3): DOM order "Your place" (only with a remembered place or its status line), the household form, "Saved plans", "Your data"; from `lg` the form is the left column and the rest the right. "Saved plans" always shows; with no session it says "No saved plans yet. Use Save plan under See your full day on Today." and makes no request (with saving not set up: "Saving isn't set up on this site."). "Your data" holds the full save note and "Delete my saved data", which shows only when a session exists, answers were saved, or the session check failed. "Save my answers" keeps the note's first sentence beside it and is described by both. If the list fails to load, "Try again" reloads it and keeps focus on the Saved plans heading (redesign P11).
  - `TodayLead`: the weather strip (the backdrop's words), verdict (`h2`), word tag, provenance line, stale banner (with "Reload forecast", which reloads and keeps focus on the H1) and caveat. While the forecast loads, `TodayLeadLoading` shows "Loading forecast…" in a card as tall as the within-limit card (rem minimum heights measured for Pune), so nothing below moves when it lands.
  - `CitySkyline` (the app backdrop, adaptive cityscape):
    - **Where:** one fixed, full-screen, `aria-hidden` backdrop behind every `/app/*` page. `AppShell` draws it once and keeps it mounted between pages; it takes no clicks or focus.
    - **Layers:** a sky gradient over the screen; the daylight glow and clouds under the header; the city band at the bottom (variant B, "Mixed street", 22 Nov: far towers; middle-row older flats with sunshades, society blocks with balconies and stair cores, and glass offices with fins, with their light details at every width; near shop-houses and walk-ups with parapets, awnings and rooftop water tanks, and from 640 px their windows, balcony lines and shutters; no landmark; path data in `skylineGeometry.ts`), above the phone bar, up to a third of the screen high on phones (`min(16rem,32vh)`) and up to 40 % from sm up (`min(24rem,40vh)`), drawn 1.74x wider than the screen and centred from md up so each building is bigger (owner ruling H5, 26 Nov), and hidden on screens under 33.3rem tall (rem follows the browser's own text size, so with large text the city steps aside before any title block can reach it: checked at 16 to 32 px default text on ten screen sizes, redesign P8, D7; at normal text it hides below about 533 px tall, a phone held sideways), where the sky alone carries the look; veils fading in from the band's top; rain over the whole screen; heat at the city's base.
    - **Air look:** only from `airCheck.level`, tuned in redesign P8 (owner ruling H4) toward the art-direction images with existing tokens only (`color-mix`): within, a crisp, slightly cyan daylight sky; above, a warmer, hazier sky (a touch of `warning` low down, never orange) with veils over the far and middle rows; unknown, a cool neutral sky. The city is drawn in the look's own hue (a `--city-hue` per look), light and tonal, from the faint far row to the darker near row, so the answer reads before the city. Under an overcast deck the sky's top mutes, and the within sky keeps most of its colour strength (chroma), so it never passes for an above one.
    - **Weather:** clouds, rain (forecast amount only), heat and the glow (`weather.isDay`) follow only the weather. No fog band (owner, 22 Nov): visibility can't tell fog from smog, and the band looked like the air haze. Missing cloud cover draws no clouds and no glow (owner kept this, 22 Nov). Weather counts for an hour after its own hour, like the forecast; past that the scene draws none, so a page left open never shows rain or sun from hours ago.
    - **Stale:** keeps the last-known look. The footer adds "Not current." and Today keeps its banner. A same-place hourly reload keeps the look until the new forecast arrives.
    - **Loading and none:** a still silhouette while a place's first forecast loads; the neutral unknown look with no place or after an error.
    - **Readability:** every section sits on a solid `bg-surface-light` panel. Only each page's title block (`data-part="title-block"`) rests on the sky, all in `text-dark`, checked at 4.5:1 against every sky, cloud, deck, glow and rain colour (`e2e/backdrop.spec.ts`). Each page ends with space as tall as the city (the longer band, H5).
    - **Label:** the footer says "Background: model forecast for {place}. {level tag}." while a forecast is shown, except on Ask with a place (J16) (the tag is "Within the limit", "Above the limit" or "No data"; "No data" also covers a partial check, as on Today, which the owner kept on 22 Nov), so the sky's tint is never the only sign of the level.
    - **Hourly reload:** Today and My Home reload the forecast once it is an hour old, as the plan rebuilds hourly there too, so the sky and the plan refresh together. Ask reloads too, so its "retrieved" time is never over an hour old. Other pages keep the last look, and the footer then adds "Not current.". On My Home, a plan rebuilt for changed answers on a forecast over a minute newer than the backdrop's reloads the backdrop once (seconds apart is the same model run), so the sky and the plan's air words rest on the same data.
    - **Forced colours** (Windows High Contrast): the whole backdrop hides, so the words sit on the system background.
  - `DailyPlanSection`: builds by itself while Today or My Home is shown (no plan, changed answers, or a plan over an hour old by the device clock), never twice at once. After an error it waits for "Try again". It shows the top card, with the full day in a `<details>`, and reports its state (nothing, building, an error with a retry, a stale plan, or the current one) for My Home, which shows the same states and never a stale plan as today's. Redesign P3: it names the air the plan used when no verdict is on screen or the verdict's level differs (B5); while building, a placeholder as tall as the ready plan holds the space; "Your plan is ready." is for screen readers only, while the building, error and save lines stay visible; after a failed build, with the forecast ready and under an hour old, it adds "Your forecast on this page is still up to date." (A11).
  - `HelpChoices`: four links in a list, each with an icon and one line. Outdoor and Family ask their topic through `useAsk` and open Ask.
  - `AskBox`: a labelled input (200 characters, `enterkeyhint="send"`; while empty and not focused, an `aria-hidden` hint types, holds, fades and cycles through the example questions, still under reduced motion, J18), "Send", and three starter questions that fill it. Send asks through `useAsk` and opens Ask; the question never goes into the address. The input row wraps, so at large text Send drops below the input (redesign P4, C9).
  - `Ask` (Phase 7; order from redesign P4, rulings D1–D5 and A12): one `h1`, the intro "Answers come from AirAware's rules and today's forecast.", the context line with "Edit" to My Profile, the place search when there is no place, then the guided chat (21 Nov, `docs/superpowers/specs/2026-11-21-ask-guided-chat-design.md`):
    - one panel with `TopicChips` (plain buttons), the first three starter buttons and a `<details>` "More questions" holding the other two; there is no greeting;
    - the conversation (`data-part="ask-thread"`): one solid `bg-surface-light` surface, a rule line between exchanges, the exchanges oldest first, each with your message as an `h2` bubble (a hidden "You asked:" or 'Your answer to "…":' prefix) and AirAware's reply;
    - the question box last (`data-part="ask-composer"`, Ask chat redesign, 26 Nov, rulings J1 to J17): the whole column is centred (J15); the box has a small credit line under its row (`data-part="ask-credit"`: Open-Meteo.com, CC BY 4.0, CAMS, Privacy), and Ask with a place has no footer card (J16); a labelled textarea (an `aria-hidden` cycling hint while it is empty and not focused, J18; no `name`, `autocomplete="off"`, 200 characters, `field-sizing: content`, up to about 4 lines, then it scrolls) and "Send" on one row, wrapping at large text. Enter sends, Shift+Enter adds a line (also on phones), and Enter during IME composition does nothing. Send is disabled when the box is empty or a reply is pending. A failed question comes back to the box unless something new was typed. On phones (below 48rem) it is pinned from the start; from md up it sits in the page under the topics until the first question (J17), and the column's gap is 16 px from md up so it fits at 1280x720. Pinned, and only on screens at least 30.2rem tall (the city's own threshold is 33.3rem, H5), it is `position: sticky`, flush on the 3.5rem phone bar or, from md up, at the window's bottom edge, with no rounded bottom corners only while stuck (scroll-state query on the panel inside it; elsewhere a rounded card); below that it sits in the page after the thread;
    - on the newest reply only, a question back (a `fieldset` whose `legend` is the My Profile question) and "You could also ask:".
    - The context line reads "…, retrieved HH:MM", adding "· Not current" once the forecast is over an hour old. While the forecast loads, an invisible, `aria-hidden` stand-in of the same locale format holds the line's length, so nothing below moves when the time lands.
    - One `sr-only` `<output>` says "AirAware is thinking…", then "Answer ready. …", "Noted. …", or the medical or out-of-scope sentence; an error is ErrorState's own alert. Send, chips, starters and answers are disabled while an answer is coming.
  - `AskEntry`: an `<article>` per answer with its `h2` (the question or chip label, `tabIndex={-1}`). A new exchange scrolls instantly to the top of the view, then its `h2` takes focus with `preventScroll` (redesign P4, F-04); "Try again" and Skip focus with `preventScroll` too, as does Ask's "Edit" link. "Based on: {verdict} · Model forecast · Open-Meteo · retrieved HH:MM" names the forecast only when the server used one; without one it is the verdict title alone (D4). Cards are `PlanCard`s at level 3 with "Why?", rendered `flat` on Ask only (a top rule instead of a border; Today, My Home and Landing keep the bordered card). An answer has no panel of its own: the thread's surface carries it (J6; this replaces P4's "each answer is a solid panel"), so a failed answer shows its error card on that surface. "Open-Meteo" links to the answer's real `sourceUrl`. On a topic answer with a forecast, a closed `<details>` "Sources and limitations" (Today's label) lists `forecast.limitations`; "Model forecast", the time and "Not current" stay outside it, always visible.
  - `AirDetails`: one closed `<details>` with every number, unit, time and source behind the verdict. The 24-hour limits come from the server's check.
  - `GuideGroups`: the guide library's groups, each heading at a given level (2 on Better Habits, 3 on My Home) with its `PlanCard`s one level below and "Why?", then the safety note. A group left empty by its `hide` filter is left out. Redesign P5 (F-25): one grid of 20rem columns, as many as fit (`repeat(auto-fill, minmax(min(20rem, 100%), 1fr))`, a size container). Each group is a grid item laid out on the same columns (`subgrid`, heading across the top); a group with 2 or more cards spans 2 columns once 2 fit (`@min-[41rem]`), and with 3 or more, 3 once 3 fit (`@min-[62rem]`). Nothing is reordered, so the visual order is the DOM order. From about 1090 px wide (3 columns), Better Habits reads "Daily commuting, Waste, Cooking" then "Energy use" across all three columns.
  - `MyHome`: a purpose line under the title (the landing page's "Indoor suggestions look at…"), then "Today, for your home" (the plan's indoor cards, full size, on the same 20rem grid) before "Ways to improve indoor air". With a place, "Today, for your home" shows from the first paint: a placeholder as tall as a no-answers plan (one indoor card) while the plan is due or building, and "No suggestions for your answers today." when the plan has no indoor card. With no place it is absent. A guide whose `personalRuleId` is on screen is hidden; "Near a busy road" needs a yes.
  - `BetterHabits`: a purpose line under the title (the landing page's "Practical habits that cut pollution…"), then the habit groups at level 2, with no savings figures. While the guides load, a placeholder as tall as the loaded library holds the space.
  - Controls whose only edge is their border (help choices, Today's and Ask's starter pills) use `text-dark-muted` (6.61:1 on `surface-light`); panels keep `rule` (owner ruling E5).
  - `Welcome`: three steps for a first visit.
    - One `h1` per step, with "Step N of 3"; focus moves to the heading.
    - Choices are native checkboxes and radios styled as 44 px chips (`has-checked:`, plus a tick, so never colour alone), in `fieldset`s.
    - "Remember on this device" is off by default.
    - Step 1 (redesign P6, F4): the line "See today's air forecast for your place and one thing you could do." under the heading, and no place chip in the header (the step has its own search); steps 2 and 3 keep the chip. While saved answers load, a placeholder as tall as the step-1 panel holds the space.
  - `Privacy` (redesign P6, F5): the app's navy header with only the logo (to `/`), "Back to AirAware" (to `/app`), an "In short" panel with three lines restating the page, and "Supabase (our database host)" explained once.

## 9. Interaction and motion

- Motion communicates state change, hierarchy, or continuity.
- Use transform/opacity for low-cost transitions where appropriate.
- Avoid constant animation and distracting particles.
- Pause or simplify off-screen motion.
- Honor `prefers-reduced-motion`.
- Avoid scroll-jacking. Normal scrolling must remain predictable.
- On mobile, prioritize touch targets and reduce heavy visual effects.

- **Press feedback:**
  - Enabled buttons, and links with the `press` class, scale to 0.97 while pressed (120 ms, `cubic-bezier(0.23, 1, 0.32, 1)`), only under `prefers-reduced-motion: no-preference`.
  - With reduced motion, a pressed button fades to 80% opacity instead, with no movement. Tailwind's preflight already removes the phone tap highlight for everyone.
  - Phones have no double-tap delay (`touch-action: manipulation`).
  - Enabled buttons show the pointer cursor (redesign P11; Tailwind v4's preflight dropped it).
- A new Ask answer rises in: opacity 0 → 1 and `translate: 0 8px` → 0 over 200 ms with the same curve, from `@starting-style`, only under `prefers-reduced-motion: no-preference`. Browsers without `@starting-style` show it at once.
- Landing sections after the hero rise in (opacity, 8 px `translate`) as they scroll into view, from `animation-timeline: view()`, only under `prefers-reduced-motion: no-preference` and where supported; otherwise they are still.
- The scene's animations, `transform` only and `motion-safe:animate-*`, so they stay still under reduced motion:
  - the rain falls for under 5 seconds, then rests;
  - the clouds settle 16 px into place over 4.8 s once, then rest;
  - both play when a place's forecast is first drawn, never on a page change or the hourly reload (the rain layer stays mounted, hidden when dry, so rain that starts at a reload shows still).
  - The heat band and the buildings are still.
- The air look (the sky's colours, the glow, the veils) changes over 700 ms, ease-out, under `motion-safe:` only, so it changes at once under reduced motion. The glow and the middle veil stay mounted at opacity 0 when off, so they fade. A place's first scene, after the silhouette, appears at once.

## 10. Responsive behavior

- Mobile: single-column flow, compact nav, stacked metrics, readable chart summaries.
- Tablet: two-column cards where useful.
- Desktop: dashboard grid and editorial homepage chapters.
- Avoid horizontal overflow at narrow viewport widths.
- Test long location names, missing data, and translated content.
- **Guarded by `e2e/responsive.spec.ts`** (Phase 9), on every page:
  - at 320, 640, 768, 1024 and 1280 px: nothing reaches past the screen, measured by each element's edges (the page clips sideways overflow, so scroll width can't show it), and exactly one `h1`;
  - at 320: 44 px targets, except links inside a sentence;
  - at 900, 1024 and 1280: 200 % text, nothing clipped;
  - at 320: WCAG text spacing, nothing clipped;
  - a long place keeps the header on screen and, at normal text, the header one 64 px row with the nav on one line, also with a desktop scrollbar's width taken (simulated, since headless Chromium hides scrollbars).
- **Ask chat pin and padding (26 Nov):** the question box is sticky only `@media (min-height: 30.2rem)`, so very large text or a short screen puts it back in the page. Once the box is pinned (on phones always; from md up with `[data-pinned]`, after the first question), `scroll-padding-bottom` keeps a focused element clear of the box: 18.5rem on phones and 14.5rem from md up (the credit line made the form 230 px tall on phones and 222 on desktop; it was 16rem and 13rem); it is dropped while the box has focus, so Tab or typing in the box never moves the page. Guarded by `e2e/firstscreen.spec.ts` AK-11 to AK-20 and `client/src/styles.test.ts`.
- **Footer card and box tray (26 Nov):** on app pages the footer is a rounded card (`rounded-lg border border-rule bg-surface-light`) inside the content width, so the sky shows around it (J14). The Ask box shows its flat "tray" bottom only while stuck, through a scroll-state container query on the panel inside it (J9); a browser without scroll-state keeps a rounded card.
- **Side safe areas (ruling C7, redesign P11):** the header row, the page and the footer on the app, Landing and Privacy pad `max(<side padding>, env(safe-area-inset-left/right))`, so a phone held sideways keeps content clear of the notch; with no notch the padding is the same as before.
- **Readable lines (redesign P11):** the Privacy lists and the purpose lines on My Home and Better Habits are `max-w-prose`.
- **Top bar:** logo, place chip, then the nav, which is also the Tab order. Below 1024 px the chip shows the text before the first comma ("Pune"), and from 1024 px the whole place. At normal text the chip gives way first (its label truncates), so the header stays one 64 px row; at 768 px a longer first word such as "Mumbai" is cut (owner ruling C11). With text enlarged past the breakpoints, the header row wraps onto a second line, so every control stays reachable.

## 11. Accessibility requirements

- Semantic landmarks and heading order.
- Keyboard-accessible menus and dialogs.
- Visible focus indicators.
- Labels and error descriptions for every form field.
- Status labels not encoded by color alone.
- Chart summaries in text/table form.
- Contrast checked with automated and manual review.
- Reduced-motion behavior.

## 12. Unslop/Hallmark usage

- Use Hallmark during initial visual direction and broad page design if installed.
- Use Unslop to audit a rendered interface and propose refinements before editing.
- Preserve strong existing design decisions; do not redesign a screen merely to create activity.
- Inspect the actual browser rendering, not just source code.
- If Unslop instructions or scripts are installed, review shell commands and file/network operations before execution.
- Unslop is licensed CC BY 4.0; retain required credit if its material is copied or adapted.

## 13. Design acceptance checklist

- [ ] The product has an identifiable environmental-tech visual identity.
- [ ] Marketing and app experiences are visually related but optimized for different jobs.
- [ ] Source, time, and data-kind are visible.
- [ ] UI does not imply unsupported data certainty.
- [ ] Mobile and desktop are usable.
- [ ] Keyboard navigation and reduced motion work.
- [ ] Empty, stale, error, and loading states are designed.
- [ ] All controls have real functionality.
