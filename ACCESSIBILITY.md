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

**axe in a real browser** (Chromium, colour contrast included, desktop and Pixel 7):
- `/` and `/privacy`: no violations (`e2e/pages.spec.ts`, 4/4).
- The dashboard's failure states and the full journey: no violations (`e2e/failures.spec.ts`, `e2e/journey.spec.ts`).

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
