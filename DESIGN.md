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
- Strong CTA: “Check your area's air quality”.

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
- Avoid repetitive card grids; use cards when they represent real independent objects/actions.
- Keep charts large enough to read and pair with textual interpretation.

## 6. Marketing homepage story

1. **Hero — “The air around you matters.”** Explain the product and invite location exploration. Use an original atmospheric urban visualization; decorative particles must not pretend to represent sensor measurements.
2. **Understand your air.** Introduce readings, pollutant values, provider labels, and timestamps.
3. **Turn information into a routine.** Show a daily plan that responds to user context.
4. **Make indoor choices clearer.** Explain indoor source-control and ventilation trade-offs.
5. **Choose practical swaps.** Present realistic low-emission habits without unsupported impact figures.
6. **See why.** Show recommendation explanation and source references.
7. **CTA.** Bring users into the actual app.

## 7. Today information hierarchy

Today answers "How is my air?" first, then "What should I do?" (assistant redesign, Phase 6):

1. A greeting by device time, then the H1 "Today in {place}".
2. The scene and weather strip, then the verdict (the largest text), its word tag, "Model forecast · Open-Meteo · updated {time}", the "Not current" banner when stale (never hidden), and the caveat.
3. "Your recommendation for today": one plan card with "Why this recommendation?". "See your full day" folds the rest of the plan and "Save plan".
4. "What would you like help with?": four choices.
5. "Ask AirAware anything".
6. "Air quality details", closed: the PM2.5 figure, the forecast panel, the forecast location, the CPCB line, the 24-hour method, and sources with limitations.

From `lg`, the verdict sits on the left and the recommendation on the right; the rest runs full width below. Official observations, once connected, stay visibly separate from the model forecast. A saved plan opens in My Profile, never on Today.

Never show a large AQI number if its index type is ambiguous. If only PM2.5 is available, show PM2.5 concentration with units instead of inventing a CPCB AQI.

## 8. Components

- `LocationSearch`
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
  - `AppNav`: one `<nav aria-label="Main">`. It is a bottom bar on phones, inline in the navy top bar from `md`, and marks the current page with `aria-current="page"`, an elevated pill and a teal icon.
  - `PlaceChip`: the place button and a native modal `<dialog>` holding `LocationSearch` and `UseMyLocation`.
  - `Profile`: the household answers, the remembered place ("Forget this place") and saved plans. An opened plan shows below the list under its snapshot banner, with "Close", which returns focus to its Open button.
  - `TodayLead`: the scene, weather strip, verdict (`h2`), word tag, provenance line, stale banner and caveat.
  - `DailyPlanSection`: builds by itself while Today or My Home is shown (no plan, changed answers, or a plan over an hour old by the device clock), never twice at once. After an error it waits for "Try again". It shows the top card, with the full day in a `<details>`, and reports its state (nothing, building, an error with a retry, a stale plan, or the current one) for My Home, which shows the same states and never a stale plan as today's.
  - `HelpChoices`: four links in a list, each with an icon and one line. Outdoor and Family ask their topic through `useAsk` and open Ask.
  - `AskBox`: a labelled input (200 characters, `enterkeyhint="send"`), "Send", and three starter questions that fill it. Send asks through `useAsk` and opens Ask; the question never goes into the address.
  - `Ask` (Phase 7): one `h1`, the context line with "Edit" to My Profile, the place search when there is no place, `TopicChips` (buttons with `aria-pressed` and a tick on the latest answer's topic, so never colour alone), five starter buttons, the question box (no `name`, `autocomplete="off"`), then the answers, newest first. One `sr-only` `<output>` says "AirAware is thinking…", then "Answer ready. …" or the medical or out-of-scope sentence; an error is ErrorState's own alert. Send, chips and starters are disabled while an answer is coming.
  - `AskEntry`: an `<article>` per answer with its `h2` (the question or chip label, `tabIndex={-1}`), which takes focus when the answer is new and after "Try again". Cards are `PlanCard`s at level 3 with "Why?". Answers are separated by a top rule, so the error card is never a card inside a card.
  - `AirDetails`: one closed `<details>` with every number, unit, time and source behind the verdict. The 24-hour limits come from the server's check.
  - `GuideGroups`: the guide library's groups, each heading at a given level (2 on Better Habits, 3 on My Home) with its `PlanCard`s one level below and "Why it matters", then the safety note. A group left empty by its `hide` filter is left out.
  - `MyHome`: "Today, for your home" (the plan's indoor cards, full size) before "Ways to improve indoor air". A guide whose `personalRuleId` is on screen is hidden; "Near a busy road" needs a yes.
  - `BetterHabits`: the habit groups at level 2, with no savings figures.
  - `Welcome`: three steps for a first visit.
    - One `h1` per step, with "Step N of 3"; focus moves to the heading.
    - Choices are native checkboxes and radios styled as 44 px chips (`has-checked:`, plus a tick, so never colour alone), in `fieldset`s.
    - "Remember on this device" is off by default.

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
- A new Ask answer rises in: opacity 0 → 1 and `translate: 0 8px` → 0 over 200 ms with the same curve, from `@starting-style`, only under `prefers-reduced-motion: no-preference`. Browsers without `@starting-style` show it at once.
- The readout scene's rain is its only decorative motion: it animates `transform` only, falls for under 5 seconds and then rests, and is used as `motion-safe:animate-*`, so it stays still under reduced motion. The heat band is still.

## 10. Responsive behavior

- Mobile: single-column flow, compact nav, stacked metrics, readable chart summaries.
- Tablet: two-column cards where useful.
- Desktop: dashboard grid and editorial homepage chapters.
- Avoid horizontal overflow at narrow viewport widths.
- Test long location names, missing data, and translated content.

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
