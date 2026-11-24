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
- the snapshot banner (focus moves to it on Open, and back to the plan heading on "Back to today").

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
