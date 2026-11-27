# AirAware AI — Accessibility Requirements

## Goal
The app must be usable by people with different visual, motor, cognitive, and assistive-technology needs. Target WCAG 2.2 AA as the design and test goal; verify actual conformance rather than claiming certification.

## Interaction
- All core paths work with keyboard only.
- Use semantic HTML and correct heading order.
- Ensure visible focus indicators.
- Avoid keyboard traps.
- Use accessible names for icon-only buttons.
- Dialogs manage focus and return focus to the trigger.
- Location search supports keyboard selection and announcements.
- Provide clear labels, hints, and associated validation messages.

## Visual
- Do not use color as the only way to communicate AQI status.
- Pair status colors with text labels and/or icons.
- Maintain sufficient text and control contrast.
- Support zoom and reflow without horizontal scrolling at common mobile widths.
- Do not encode meaning only in charts or maps.

## Charts and data
- Every chart has a textual summary or data table alternative.
- Include units, timestamps, and source labels.
- Explain missing values.
- Distinguish observed, forecast, and demo through text labels.
- Avoid color-only pollutant comparisons.

## Motion
- Respect `prefers-reduced-motion`.
- Avoid flashes and unnecessary parallax.
- Do not require animation to understand information.
- Pause nonessential continuous animation.

## Dynamic updates
- Announce important async results without overwhelming screen readers.
- Keep focus predictable after generating a plan or changing location.
- Error messages should identify how to recover.

## Testing
- axe-core automated tests.
- Keyboard-only walkthrough.
- Browser zoom/reflow.
- Screen-reader spot checks using available tools.
- Contrast checks.
- Manual chart and form review.

Automated scans do not prove full accessibility conformance.

## Results (Phase 8, 2026-11-19)

_Superseded by the Phase 9 results below where they differ: the `/app` walk here predates the redesign._

**axe in a real browser** (Chromium, colour contrast included, desktop and Pixel 7):
- `/` and `/privacy`: no violations (`e2e/pages.spec.ts`, 4/4).
- The dashboard's failure states and the full journey: no violations (`e2e/failures.spec.ts`, `e2e/journey.spec.ts`).
- The app backdrop (20 Nov 2026): decorative (`aria-hidden`, no focus, no clicks). Every word sits on a solid panel except each page's title block, which is `text-dark` and passes 4.5:1 against every colour that can pass behind it in each look. A browser check finds any text left on the scene, and axe passes over the within, above and unknown looks (`e2e/backdrop.spec.ts`).

**Keyboard walk** (Tab and Shift+Tab only, built-in browser, Vite dev build):

| Page | Focus order | Focus visible | Traps |
|---|---|---|---|
| `/` | wordmark → "Check My Air" → "Meet Your Assistant" → place search → the four example "Why?" panels → the two source links in the open example → "Check My Air" → footer links (Open-Meteo.com, Privacy) → wraps to the top | Yes. A blue ring on the dark page; the light-theme ring inside the light example panels | None |
| `/app`, with a plan built | place search → Use my location → Hourly forecast → the 10 household questions → Save my answers → Delete my saved data → Build my daily plan → each card's "Why?" → Save plan → source links → footer links → wraps | Yes (checked on Build my daily plan). After building, the live region says "Your plan is ready." | None |
| `/privacy` | heading → Open-Meteo.com → Privacy → wordmark → wraps | Yes | None |

Focus order follows the visual order on every page.

**Covered by component tests, not walked by hand:**
- the saved-plans list and the delete confirmation (focus moves to Cancel);
- the snapshot banner (focus moves to it on Open). *Superseded (assistant redesign, Phase 6): a saved plan opens in My Profile, and "Close" returns focus to its Open button.*

A screen-reader pass with a real reader has not been done yet.

## Results (Phase 9, 2026-11-21)

**Automated, in a real browser** (`e2e/responsive.spec.ts`, Chromium; the desktop project runs the set sizes, and the Pixel 7 project adds touch for the target, axe and forced-colour checks):
- **Every page** (`/`, `/privacy`, `/app`, `/app/ask`, `/app/home`, `/app/habits`, `/app/profile`, `/app/welcome`) at 320×640, 640×400, 768×1024, 1024×768 and 1280×800:
  - nothing reaches past the screen, measured by each element's edges (the page clips sideways overflow, so scroll width can't show it);
  - exactly one `h1`.
- **Touch targets of 44 px or more at 320** on every page. Links inside a sentence are exempt (WCAG 2.5.8). Fixed in Phase 9: the header wordmarks, the footer "Privacy" links and the source links.
- **axe at 320** on every page: no violations.
- **200 % text** (text enlarged, breakpoints fixed) at 900, 1024 and 1280: nothing past the screen and no clipped text.
  - Fixed in Phase 9, changed in redesign P2: when enlarged text makes the header row outgrow the screen, it wraps onto a second line (it scrolled sideways before), so the nav and the place chip stay reachable.
  - At normal text the header stays one 64 px row: the chip's label truncates first, also with a desktop scrollbar's width taken.
- **Header Tab order** (redesign P2): logo, place chip, then the five nav items, on phones and desktop, matching what is seen.
- **Wider text spacing** (WCAG 1.4.12) at 320: no clipped text on any page.
- **Long places:** at 320×640, "Chhatrapati Sambhajinagar, Maharashtra" keeps the verdict above the bottom bar. A 70-character place keeps the header on screen at every size.
- **Windows High Contrast** (forced colours, emulated):
  - the backdrop steps aside;
  - focus outlines show;
  - the header's forced colours reach 4.5:1;
  - the highlighted place suggestion, chosen Welcome chips and pressed Ask topics get an outline (fixed in Phase 9; they were marked by colour alone, which forced colours remove). *Superseded for Ask (21 Nov): the guided chat has no pressed topic; your message bubble keeps a visible edge under forced colours instead.*
  - axe passes with every rule except colour-contrast. That rule misreads forced colours in Chromium (it takes the authored `-webkit-text-fill-color`, not the painted colour), so the header's contrast is checked directly instead.

**Keyboard walk** (Tab and Shift+Tab only, scripted in Chromium at 1280 and 390, every page and the place dialog):

| Page | Stops | Traps | Focus visible | Shift+Tab steps back |
|---|---|---|---|---|
| `/` | 13 | None | Every stop | Yes |
| `/privacy` | 3 | None | Every stop | Yes |
| `/app` | 24 | None | Every stop | Yes |
| `/app/ask` | 24 | None | Every stop | Yes |
| `/app/home` | 16 | None | Every stop | Yes |
| `/app/habits` | 16 | None | Every stop | Yes |
| `/app/profile` | 22 | None | Every stop | Yes |
| `/app/welcome` | 12 | None | Every stop | Yes |

- **Order:** focus follows the screen and nothing is focused off screen.
  - On phones the bottom nav comes right after the header (it sits in the header in the page's code), the same order as on desktop.
  - Welcome starts at its step heading, as designed.
- **Place dialog:**
  - opening it from the chip puts focus inside;
  - Tab cycles its controls (the search, "Use my location", "Close") and the document itself, never another control on the page;
  - Escape closes it and focus returns to the chip;
  - search, arrow and Enter choose a place with the keyboard alone.
- **Welcome by keyboard:** choosing a place moves focus to step 2's heading, Space ticks a chip, Next opens step 3, and focus moves to its heading.
- **Kept as `e2e/keyboard.spec.ts`,** so all of the above re-runs with the suite. It measures that a ring is drawn, not how clear it looks.
- **Checked by eye** in the built-in browser with real Tab presses: rings on the wordmark, a nav pill and the place chip at 1024 (with a classic scrollbar); a bottom-bar item at 390; a help card and the Ask box at 1280. All were clearly visible and none was cut off.

**Accessibility tree** (Playwright `ariaSnapshot`, every page at 1280):
- **Landmarks:** banner, main and contentinfo on every page; navigation "Main" on the app pages.
- **Headings:** one `h1`, with headings in order.
- **Names:** no unnamed buttons or links.
- **Backdrop:** absent from the tree.
- **Live regions:** Ask's status line is present.
- **Data labels:**
  - "Model forecast" is on Today;
  - with a stale forecast, both "Not current: …" and the footer's "… Not current." are in the tree.

**Real phone** (21 Nov 2026, the owner's own phone, over home Wi-Fi to the Vite dev server):
- The owner ran the 12 items in `docs/REAL_PHONE_CHECKLIST.md` and reported "All fine": tap feedback, no stuck hover, notch and home-bar spacing, the city at the end of Today, no zoom and no keyboard covering the inputs, scrolling, long press, the status bar colour, the sideways look, rain (on Bhubaneswar, where rain was forecast that hour), and the place dialog.
- The report didn't say whether the optional item 12 (TalkBack or VoiceOver) was tried, so it isn't counted here.
- **Device:** the phone model, OS and browser weren't recorded (the checklist now asks for them).
- That check ran before the final Phase 9 fixes, which made the header row scroll only under enlarged text and outlined chosen chips in High Contrast. A glance at the phone's bottom bar is due in Phase 10.
- "Use my location" needs HTTPS and is still to be checked on the live site.

No real screen reader has been confirmed yet.

## Redesign P3, Today (2026-11-24)

- **Focus ring:** inside the title block and the stale banner the ring is `text-dark` (owner ruling B11; `client/src/styles.test.ts` checks the rule exists and comes after the `.on-dark` rules). Dark text, the "Reload forecast" border and the ring on the banner's solid `warning` fill: 8.82:1.
- **Live region:** "Your plan is ready." stays in the same `<output>` but is for screen readers only; the building, error and save lines stay visible (TD-10).
- **"Reload forecast":** a 44 px button; after it, focus moves to the H1, as after "Try again" (`AppShell.test.tsx`, `e2e/firstscreen.spec.ts` ST-01a).
- **Loading:** "Loading forecast…" is visible text inside the `aria-busy` placeholder.
- **Order:** the invite now follows the help choices in the DOM as on screen; the Tab walks in `e2e/keyboard.spec.ts` pass on both projects. Its place-dialog test is flaky (see the P4 section below).
- Not done: a real screen reader, and a check on a real phone of the new banner and placeholder.

## Redesign P4, Ask AirAware (2026-11-24)

- **Order:** title, intro, context line, the question box, topics, three starters, "More questions" (a native `<details>`, 44 px summary), then the conversation. The DOM follows the screen; `e2e/keyboard.spec.ts`'s Tab walk on Ask passes on both projects.
- **New answer:** the exchange scrolls instantly to the top of the view, then its heading takes focus with `preventScroll`, so there is no second jump and nothing animates the scroll (AK-04, AK-05 in `e2e/firstscreen.spec.ts`).
- **Large text:** Send drops below the input; at 200 % text the input fills its row on phones (AK-10).
- **200 % text (fixed in P8, D7):** at 390×844 the Ask title block used to reach about 165 px into the fixed city drawing on first load. The city then hid on screens under 30.2rem tall (33.3rem since H5, 26 Nov), so with large browser text it steps aside first (see P8 below).
- **Place-dialog keyboard test:** across the P3 and P4 runs on 24 Nov it failed 3 times (twice in a full 8- or 7-spec run, once in a run of `keyboard.spec.ts` alone) and passed in the other full runs and 50 of 50 repeats on its own. Fixed on 25 Nov: the browser closes the dialog on Escape a task before its `close` event, so a tap on the place chip in that gap was lost. Reproduced every time in Chromium with `requestClose()` then a chip click; the chip now reopens the dialog in that gap (focus in the search box) and a late `close` is ignored. `PlaceChip.test.tsx` pins it, and the keyboard test then passed 50 of 50.

## Redesign P5, My Home and Better Habits (2026-11-25)

- **One disclosure label:** every card's summary reads "Why?", and its accessible name adds the card title ("Why? (Use the kitchen exhaust while cooking)"), so a screen-reader list of controls still tells them apart (owner ruling E1).
- **Card grid:** groups and cards flow into as many 20rem columns as fit, but nothing is reordered: the visual order, the Tab order and the heading order stay the DOM order (WCAG 1.3.2; no `grid-auto-flow: dense`). Group headings keep their levels.
- **Control borders:** help choices and starter pills now have a `text-dark-muted` border, 6.61:1 on `surface-light` (was `rule`, 1.30:1), so their edge is visible (WCAG 1.4.11; ruling E5).
- **Purpose lines:** in each title block, in `text-dark` like Today's greeting; the backdrop contrast check covers that colour.
- **Loading:** "Today, for your home" and the guides keep their space while loading; the placeholders say "Finding today's suggestions…" and "Loading guides" to screen readers only, as before.

## Redesign P6, My Profile, Welcome and Privacy (2026-11-25)

- **My Profile order:** "Your place" (when remembered), the household form, "Saved plans", "Your data". The DOM follows that order; from 1024 px the form is the left column and the rest the right, so Tab goes place, form, saved plans, your data.
- **"Save my answers"** is described by the note's first sentence beside it and by the full note in "Your data" (`aria-describedby` names both).
- **Delete:** "Delete my saved data" and its confirmation moved into "Your data"; the confirmation still moves focus to Cancel. Its result goes to a status region that is always in the page, so a screen reader announces it.
- **Welcome step 1:** no place chip in the header, so Tab goes logo, navigation, then the step's own search; the chip returns on step 2.
- **Privacy:** a "Back to AirAware" link (44 px) and the app's navy header; the logo and the focus ring use the header's dark-theme colours.
- **Checked by e2e** (both projects, every non-localhost request aborted): no page creates an account or calls Supabase sign-in without Save or Remember (0 requests, no stored session); location is read only after "Use my location" (0 calls on load, 1 after one click).
- Not checked: the "with saved data" states in a real browser (a session needs Supabase), and a real screen reader.

## Redesign P7, Landing (2026-11-25)

- **Headings:** one `h1`, an `h2` per section in order, and `h3`s for "Improve indoor air" and "Sustainable everyday choices" (their rule cards are `h4`).
- **Search:** the landing-only "Search" button is 88×48 px with an accessible name. A mouse press keeps focus in the combobox, so the highlighted option is chosen as with Enter; Tab to the button keeps the list open, and Tab away closes it. The combobox, listbox and announcements are unchanged.
- **Labels before images:** the hero screenshot's "A past screenshot…" caption and each rule card's "Example from our rules." are still read first.
- **Skyline:** `aria-hidden`, not focusable, still under every motion setting.
- **Checked by e2e** (both projects, every request to another server blocked and counted at 0): nothing past the screen at 320, no layout shift at 390 and 1280, the search on the first 1280×720 screen.
- Not checked: a real screen reader on the new Search button.

## Redesign P8, backdrop and large text (2026-11-25)

- **Large text (D7):** the city band hides on screens under 33.3rem tall (H5, 26 Nov; was 30.2rem). Checked with Chromium's own default-font setting at 16, 20, 24, 28 and 32 px, on ten screen sizes (320×640 to 1440×900, including 375×667, 393×873, 412×915, 414×896 and 430×932) and six pages: no title block reaches the visible city (0 px). At 16 px the city still shows on every phone 640 px tall or more.
- **Title contrast:** `text-dark` title-block text against every colour that can pass behind it, now including the far and middle city rows as drawn: at least 4.58:1 (within), 4.95:1 (above) and 5.04:1 (unknown).
- **The city no longer competes with the answer (CS-10):** the near row against the sky's bottom stop fell from 10.93:1 to 2.39:1 (within), 9.91:1 to 1.76:1 (above) and 10.93:1 to 1.92:1 (unknown), and stays above 1.5:1 so it is still a shape.
- Unchanged: the backdrop is `aria-hidden`, hides under forced colours, and is still under reduced motion.

## Redesign P11 polish (2026-11-26)

- **Main navigation focus:** a click that navigates moves focus to the new page's `main` (`tabIndex={-1}`), with `preventScroll`, so the page still starts at its top. A modified click (new tab) leaves focus alone (`AppNav.test.tsx`). After a nav click, also on the current tab, the page is at scroll 0 with focus on `main`, at 390×844 and 1280×800 (`e2e/firstscreen.spec.ts`).
- **Saved plans "Try again":** after a failed load, the button reloads the list and moves focus to the Saved plans heading first, so focus never falls to the page when the button goes (`SavedPlansList.test.tsx`).
- **Bottom bar at 200 % text:** with Chromium's own default font at 32 px, at 320×640 and 390×844, no part of the bar passes the screen edge (before: the icon pills reached 16 px past each side at 320 and 9 px at 390, and at 320 the labels ran into each other), each of the five links is at least 44 px wide and tall, and each keeps its full `aria-label`. At 390 every label shows whole; at 320 "Today", "Home", "Habits" and "Profile" end in an ellipsis (each needs 67 to 73 px in a 64 px cell), and "Ask" shows whole. At normal text, at 320, 390 and 768, every label shows whole (`e2e/firstscreen.spec.ts`).
- **Side safe areas:** the header row, page and footer clear the left and right insets (ruling C7). Headless Chromium reports 0 for these insets, so a notched phone is still a manual check.
- **Readable lines:** the Privacy lists and the purpose lines on My Home and Better Habits are `max-w-prose` (about 65 characters).

## Ask chat (2026-11-26)

- **The box is a textarea.** It keeps its visible label, `enterkeyhint="send"` and 200 characters. Enter sends and Shift+Enter adds a line, also on phones. Enter while an input method is composing a word (`isComposing` or key code 229) sends nothing, so confirming a Hindi, Marathi or Japanese word does not send.
- **Send is disabled** when the box is empty or only spaces, or while a reply is pending, so an empty send or a double send makes no request (`Ask.test.tsx`; AK-14 and AK-15 in `e2e/firstscreen.spec.ts`).
- **On phones the box is pinned from the start; from md up it sits in the page until the first question** (J17, 26 Nov), then it is pinned (sticky) only on screens at least 30.2rem tall, flush on the phone bar or at the window's bottom edge. `scroll-padding-bottom` (18.5rem on phones, 14.5rem from md up) keeps a focused element out from under it (WCAG 2.4.11 Focus Not Obscured). AK-12 checks that every Tab stop in the thread sits above the box's top, at 320x640, 390x844, 768x1024 and 1280x720.
- **It unpins below 30.2rem** (very large browser text or a short screen), so it never covers half the screen: with the default text at 32 px it is `position: static` (AK-16).
- **Focus never scrolls the page by itself:** the Edit link, Skip and Try again focus with `preventScroll`. Only a new question scrolls its exchange to the top, plus once more when its reply (or error) lands, because the reply grows below the short placeholder. That second scroll happens only if focus is still on the exchange's heading and the page has not moved, so a reply never pulls back someone who scrolled up to an older answer.
- **"Model forecast" and "Not current"** stay visible; only the limitations sit in the closed "Sources and limitations", which comes after the caveat and "Not current" so the banner stays next to the time and above the pinned box (AK-20, 320x640, 390x844 and 1280x720).
- **Focus and typing in the box do not scroll the page:** the large scroll padding is dropped while the box has focus (`:focus-within`), because Chromium scrolled the page by 449 px (390x844) and 415 px (1280x720) on Tab into the box without it. AK-19 checks `scrollY` is unchanged after Tab and after typing.
- **At 768x1024 with 32 px browser text** the box stays pinned (966 px threshold); AK-16 checks nothing passes the edge and that the box plus the bar take at most half the screen.
- **Run on 26 Nov (stubbed, Playwright):** `firstscreen.spec.ts` 260 passed; the nine stubbed specs 599 passed, 83 skipped, 0 failed (re-run 26 Nov after the big city, H5: the city now hides under 33.3rem tall, up from 30.2rem, so large text still keeps every title off it; earlier, after phones were pinned from the start and the md gap cut to 16 px; AK-01 asserted again: margins 56 px at 390x844 and 320x640, 9.4 px at 1280x720).
- **Still needs a real phone:** the software keyboard on Android and iOS. The page has no `interactive-widget=resizes-content`, and Playwright can only emulate this (AK-18 shrinks the viewport at 390x500 and 390x480). Check typing with the keyboard open, sending, and scrolling back.
- **Real-phone check:** with predictive text on, type a word and press the keyboard's send key at once: it sends once (no new line, no nothing).

## Cycling hint, place-search hint, weather table (2026-11-26)

- **Cycling example questions (J18):** the hint in both empty Ask boxes is `aria-hidden`, so a screen reader hears only the box's visible label as its name, never a half-typed sentence. It hides on focus or when there is text, never covers Send, and under `prefers-reduced-motion` (also when it is turned on while the page is open) it shows the first example still, with no timers (`CyclingHint.test.tsx`, `Ask.test.tsx` with axe). It loops only before the first question: once the shared conversation has an entry it shows the first example, still. It also pauses on a hidden browser tab and while Today is not the page on screen. Why: "pause nonessential continuous animation" above, and WCAG 2.2.2 (Pause, Stop, Hide).
- **Place-search hint (J19):** the field's `placeholder` is "e.g. Pune, India". The visible label stays the name (`LocationSearch.test.tsx`).
- **Weather table (J20):** a native `<table>` with a `<caption>` ("Weather · Open-Meteo model data"), `<th scope="col">` for Yesterday, Today and Tomorrow and `<th scope="row">` for each row; missing values read "—". It is hidden while loading, on error and when "Not current", so a stale figure is never shown as current. It fits 320x640 with every column whole, inside its panel's content box (AK-24). The table is `w-full table-fixed`, cells wrap, and a value never parts from its unit (a no-break space in `27 °C`, `30 % cloud`, `2.3 mm`), so it also fits at 200 % text on desktop. The corner header holds a screen-reader-only "Weather" (the caption's word). It shows only while the middle column's date is the place's date now, so "Yesterday" is never mislabelled near local midnight.
- **Run on 26 Nov (stubbed, Playwright, the nine specs), after the fix wave:** 601 passed, 83 skipped, 0 failed (16.5m). The two earlier failures, `responsive.spec.ts` "text at 200 % still fits: /app" at 1024x768 and 1280x800 (the weather table ran past the screen edge), now pass: the table is `table-fixed` in its panel, cells wrap and values keep their unit.
- **Unit and build, 26 Nov:** server 349 passed (5 skipped), client 656 passed; format, lint, typecheck and build clean.
- **Layout gaps, 26 Nov (owner):** Today's weather table sits under the verdict from lg, card grids on My Home and Better Habits end at their content, My Profile's form spans the width from lg with three question columns, Saved plans and Your data side by side. MP-04's from-lg check was updated to the new Profile layout. The nine stubbed specs, re-run after the last Profile change: 601 passed, 83 skipped, 0 failed (17.0m), layout-shift and TD-03 gates included. CSS columns were tried for My Home's "Today, for your home" cards and dropped on 27 Nov. Opening a card's "Why?" rebalanced the columns and moved cards, even the opened one, to another column, which breaks a stable focus and pointer position. The cards stay in the `items-start` grid. The nine stubbed specs on the final code with see-through cards, 27 Nov: 621 passed, 83 skipped, 0 failed (17.2m).

## See-through cards (27 Nov)

- **Contrast:** page cards are 85 % `surface-light` over an 8 px blur (`card-surface`). Over the darkest rendered city pixel, `rgb(90,153,194)` (near row, "within" look), `text-dark-muted` is 5.75:1, `text-dark` 12.75:1 and the focus colour 3.98:1. Floor: over pure black an 85 % card still gives 4.68:1, 10.38:1 and 3.24:1, and 4.93:1 over the dark question bubble passing under the Ask box. Do not go below 85 %: at 84 % `text-dark-muted` drops to 4.57:1 and at 83 % to 4.45:1.
- **Reduced transparency:** under `prefers-reduced-transparency: reduce` the card is solid `surface-light` with no filter.
- **e2e (`e2e/backdrop.spec.ts`):** "cards are see-through with a blur, solid under reduced transparency"; "card text keeps 4.5:1 over the darkest city colour" for each look; "the page ends at the footer"; "the place list is above the footer card" (a see-through card is a stacking context, so the card holding the place search is lifted with `relative z-[1]`). Every stubbed spec sets `prefers-reduced-transparency: no-preference` through CDP in `routeApi`, so the suite tests the see-through cards even on a machine with transparency effects off.
