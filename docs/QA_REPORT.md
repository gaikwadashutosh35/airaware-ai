# AirAware AI — QA report (assistant redesign, Phase 10)

Follows `TESTING_QA.md` §11. Each field says what was actually run; a field still open says so.

```text
Date: 21 Nov 2026
Commit: (filled in Task 3)
Build: (Task 3)
Typecheck: (Task 3)
Lint: (Task 3)
Unit: (Task 3)
API: (Task 3)
E2E: (Task 3; live run in Task 5)
Accessibility: see ACCESSIBILITY.md "Results (Phase 9)"
CodeQL: (Task 5, after the push)
SonarQube: (Task 5, after the push)
Data provider and data kind: (Task 5, live)
Timestamp/freshness: (Task 5, live)
Critical issues: (Task 4)
Known limitations: (Task 5)
Release decision: (Task 5)
```

## Browser review (Task 1)

**How:**
- Every page and state at 320×640, 768×1024 and 1280×800 in Chromium, at rest (reduced motion).
- The forecast, plan, Ask answer and place search were answered with the test fixtures so each state is repeatable.
- The first screens were looked at side by side, plus the phone's whole page.
- Headless Chromium has no scrollbar. The header with a real 15 px scrollbar was checked separately in the built-in browser in Phase 9 (one nav row, nothing scrolling, focus rings whole).

**Looked at:** the landing, Privacy, Today (within, above, stale and loading), Ask (empty, and with an answer), My Home, Better Habits, My Profile, Welcome steps 1–3, and the place dialog with suggestions.

**Found:** no defects needing a code change. Notes:
- **My Profile at 1280:** the household form fills the left column and the right one is empty sky, because that column only holds a remembered place and saved plans. That's a design call, not a defect; the owner may prefer the form to span both columns when the right one is empty.
- **Short pages at 768 and 1280** (Welcome): the solid footer ends mid-screen with the sky and the whole city below it. This is the backdrop design ("each page ends on the whole city").
- **The place dialog at 320:** the open suggestion list covers "Use my location" and "Close" below it, as a dropdown does. The list closes on a choice or Escape.
- **Not app issues:** the review's own fixtures caused three things seen in the shots. These were a "more than an hour old" note on the plan, an old Ask answer showing "Not current", and its topic chip not matching the question. The e2e tests stamp these fixtures with the current time.

**`DESIGN.md` §13 design acceptance checklist:**

| Item | Met? | Evidence |
|---|---|---|
| An identifiable environmental-tech visual identity | Yes | Navy bars, teal actions and Inter on every page; the adaptive city sky behind every app page; the dark editorial landing |
| Marketing and app related, but each fit for its job | Yes | The same palette, type and wordmark; the landing is a dark story with one call to action, the app light panels with one answer each |
| Source, time and data kind visible | Yes | Today: "Model forecast · Open-Meteo · updated 10:21 AM"; Ask: "Using: the Pune, Maharashtra model forecast, updated …"; every app footer: "Background: model forecast for …" |
| No unsupported certainty | Yes | "Forecast within India's 24-hour limits", with "Being within the national limit does not mean the air is clean or free of risk"; the "Not current" banner when stale |
| Mobile and desktop usable | Yes | This review at 320, 768 and 1280; `e2e/responsive.spec.ts` (edges, targets, zoom, spacing); the owner's phone check |
| Keyboard navigation and reduced motion work | Yes | `e2e/keyboard.spec.ts`; the reduced-motion e2e checks; rings checked by eye in Phase 9 |
| Empty, stale, error and loading states designed | Yes | Loading (skeleton over the still city), stale (banner and "Not current." in the footer), the error card, and Ask before a question: all seen here, and checked at 320 by the other-states tests |
| All controls have real functionality | Yes | The journey e2e (search, plan, explain, save, reload, isolation, delete); no inert control seen in this review |
