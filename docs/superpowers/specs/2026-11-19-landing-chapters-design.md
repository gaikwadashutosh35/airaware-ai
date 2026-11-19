# Landing chapters 3–6 (short design)

Status: approved by the owner, 2026-11-19 ("Approve, build it"). Plan: `docs/superpowers/plans/2026-11-19-landing-chapters.md`. Owner choices:
- the chapters follow straight after Phase 7;
- each chapter shows a real plan card, not a screenshot.

**Intent.** The landing page still tells only the forecast story. Phase 7 shipped the daily plan, which is the product's main value (PRD §1: the decision-support layer). The Phase 3 design promised four chapters for it: the plan, indoor air, sustainable swaps and "see why". They let a visitor see what the app does before opening it.

**Goals**
- Four chapters after "Where every number comes from" and before the limits band. Each has a heading, one or two sentences, and a real plan card captioned "Example from our rules."
- The cards are drawn by the app's own `PlanCard`. Their text is real output of the server's rules, and a test keeps it identical to the rules.
- The "see why" chapter shows its card with "Why?" already open: reason, what it used, sources and caveat.

**Non-goals**
- No hero change.
- No new screenshot: the one-screenshot limit stays.
- No API calls from the landing page.
- No AI text ("For you" lines or a summary) on the landing page.

**Anti-goals**
- An example that reads as today's air for a real place: no place names and no pollutant values in the examples.
- Rule text that drifts from the real rules.
- A light panel whose focus ring fails contrast.

**Constraints**
- DESIGN.md: "alternating story chapters", with real UI as the visual.
- The Hallmark floor: no card inside a card, no eyebrows, about 80 words per screen.
- The "invents no numbers" test gains only `24-hour` and the source's date `18 November 2009`.

**Approaches** (the owner picked 1)
1. **Real plan cards:**
   - no image weight;
   - always matches the app;
   - accessible text.

   It's an example, so it carries a label.
2. **Four small screenshots (~200 KB):** closest to the Phase 3 wording. They go out of date with every UI change, and they lift the one-screenshot limit.
3. **Text only:** lightest, but shows least.

**The chapters** (copy is my call):

| # | Heading | Text | Card (rule id; the air level it was generated for) |
|---|---|---|---|
| 3 | A plan for your day | "Choose your place and, if you like, answer a few questions about your routine and home. Our fixed rules decide the advice; AI can arrange it into your day when it's available." | `exercise.check-conditions` (forecast within the limit) |
| 4 | Cleaner air at home | "Indoor suggestions look at what you cook with and what burns inside, as well as the air outside." | `indoor.cooking-exhaust` |
| 5 | Small swaps, honestly | "Practical habits that cut pollution for you and your neighbours. We never show an emissions saving we can't calculate." | `swap.fewer-car-trips` |
| 6 | See why, every time | "Every suggestion opens to its reason, the answers and forecast check it used, its sources and its limits." | `indoor.purifier` (forecast above the limit), with "Why?" open |

Chapter 6's caption adds a clause: "Example from our rules, for a day when the forecast is above India's 24-hour limit." That is because its reason says so.

**Layout (my calls):**
- Each chapter is a two-column row on wide screens: text on one side, the card on the other, alternating sides. On narrow screens the text comes first, then the card.
- The card sits on a light (`surface-light`) panel, like the app.
- The card's title is an `h3` under the chapter's `h2`, so `PlanCard` accepts `level={3}`.
- `PlanCard` gains `openWhy`.
- A small CSS rule gives focus rings inside the light panel the light-theme colour.

**Keeping the text real.** The examples live in `client/src/pages/landingExamples.ts`. A server test calls `buildCandidates` with the documented household and air level and checks each example deep-equals the real candidate. It also checks the example sources match `SOURCE_REFERENCES`.

**Tests:**
- **Landing:** the chapter headings in order; each figure has its caption and its card's title; the chapter-6 card's "Why?" is open and shows its reason and both source links; axe passes; no numbers beyond the allowed ones.
- **Server:** the drift test.
- **Browser:** checked at 320 px and 1280 px.

**Left to the builder:** spacing, and exact class names.
