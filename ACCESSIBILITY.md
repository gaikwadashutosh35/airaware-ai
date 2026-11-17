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
