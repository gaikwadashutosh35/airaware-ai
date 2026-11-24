# AirAware AI redesign: decisions for the owner (Direction A)

**Date:** 24 Nov 2026. **Direction A ("Calm atmosphere") approved by the owner on 24 Nov 2026.**

This sheet answers every row of [IMPLEMENTATION_OUTLINE.md](IMPLEMENTATION_OUTLINE.md) §3, P1 Part A, plus the design-system rulings, with a recommended answer for each.

**How to answer:**
- **Approve the sheet as it is**, or
- **approve it with changes**, naming rows by ID (for example "C4: option b").
- Rows that only apply to Direction B are listed at the end as not needed.

Each recommendation follows the same principles:
- the smallest change that fixes the finding;
- shipped and approved decisions are kept unless a finding shows a problem;
- no new service, dependency or data.

## A. Copy changes (built in P1, the first code phase)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| A1 | F-01: the 4 save and "Remember" notes | **Approve** the reworded strings in [DESIGN_CONCEPTS.md](DESIGN_CONCEPTS.md) §8 ("Saving creates an anonymous account (no email or name)…") | Users must know saving creates an account; the current text says "on this browser" (P2 finding) |
| A2 | F-16: "Live air information unavailable" | **Change** to "Air information unavailable" | The app never has live readings |
| A3 | F-24: help choice "Greener habits" | **Change** to "Better habits", and the Ask topic chip too | One name for one page |
| A4 | F-32: "updated HH:MM" | **Change** to "retrieved HH:MM" everywhere it shows the fetch time | It is when AirAware fetched the forecast, not when the model ran; matches the stale banner |
| A5 | F-15: Ask "0 of 10 answers · Edit" | **Change** to "0 of 10 household questions answered · Edit" | Reads like a question quota |
| A6 | F-40: negated "clean air" in a rule caveat | **Reword** to "No route can promise less pollution; this forecast cannot see street-level differences.", and add it to the copy test. Negations stay allowed only in the approved verdict caveat ("does not mean the air is clean or free of risk") | Keeps the literal rule simple and testable |
| A7 | F-41: "not the CPCB AQI" in an opened saved plan | **Change** to "…and not the CPCB National AQI." | The approved disclaimer form |
| A8 | F-35: place search, no result and error | **Approve** "No places found. Try a nearby city, or use your location." and "Search isn't working right now. Try again, or use your location.". On the Landing page, which has no location button: "No places found. Try a nearby city." and "Search isn't working right now. Try again in a moment." | A next step instead of a dead end |
| A9 | Privacy line "No account exists until you press a save button." | **Align** with `Privacy.tsx:75` ("…or tick 'Remember on this device'") | Remember also creates an account |
| A10 | New-element copy (Welcome value line, "Loading forecast…", "Reload forecast", the no-session saved-plans line, the 404 page, Privacy "In short", Ask intro, "More questions", the My Home and Better Habits purpose lines) | **Approve** as listed in IMPLEMENTATION_OUTLINE §3 P1, with A11 and A12 below | All are new elements from the findings |
| A11 | F-31: plan-error reassurance (the drafted line is wrong at desktop width) | **Use** "Your forecast on this page is still up to date." at every width | One wording that fits both layouts |
| A12 | Ask intro line repeats the input label | **Shorten** the intro to "Answers come from AirAware's rules and today's forecast." | No repeated words |

**Rulings during P1, approved by the owner on 24 Nov 2026:**

| ID | Decision | Answer |
|---|---|---|
| A13 | The Save plan note | The A1 sentence adapted for a plan: "…Your plan is stored on AirAware's database host… Delete it any time in My Profile." |
| A14 | Place search when the connection fails | Keeps "Could not reach AirAware. Check your connection."; a rate limit keeps its own message too |
| A15 | Saved data after clearing the browser | Both save notes end "Clearing this browser's data loses access but does not delete them" ("it" for a plan), as `Privacy.tsx:90` says |
| A16 | Ask's off-topic reply | "…family and better habits" (was "greener habits"), matching A3 |
| D6 | The AI prompt's "say that live air information is unavailable" (`server/src/services/ai/prompts.ts:57`) | Changed in P4 with a new prompt version and its tests, not in P1 |

## B. Today (P3)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| B1 | F-22: the verdict's meaning sentence | **Move it into "Air quality details" in the within-limit state only.** Keep it on the card in the above-limit state | It restates the heading when within; when above, it names which particle is above and that state has no caveat |
| B2 | F-14: "For you" without household answers | **Approve**: show "For you" only when household answers exist, gated on the client only (`DailyPlanSection`, My Home) | Restates the card; with B1 it lets "Why?" reach the first 390x844 screen even with an AI plan |
| B3 | F-21: weather line position | **Keep** it as the verdict card's first row | Your own approved decision of 20 Nov; A meets the first-screen target without moving it |
| B4 | F-44: backdrop when stale | **Keep** the last-known look (as approved); "Not current" stays on the card and in the footer | Approved spec; the text carries the warning |
| B5 | F-17: verdict vs plan air level | **Approve**: show the plan's own air line when its level differs from the verdict's | Prevents a self-contradicting screen |
| B6 | First screen at 320x640 | **Accept** that the recommendation needs one scroll at 320; the verdict and provenance fit | Can't fit without shrinking text below 16 px |
| B7 | Hourly reload | **Keep** the shipped behaviour (placeholder until the new forecast), with the placeholder sized like the card (F-02) | Smallest change; the sizing removes the jump |
| B8 | "Make it personal" invite | **Move** it under the help choices, outlined, keeping its label | One teal action per screen |
| B9 | Help choices on phones | **Keep** one column below 640 px (not 2x2) | 2x2 cramps the labels at 320 |
| B10 | Stale banner style | **Solid** `warning` fill, with "Reload forecast" inside the banner | Clearer warning; the ring rule is designed for it |
| B11 | Focus ring in the title block and on the solid banner | **Approve** `text-dark` ring there (one `index.css` rule) | The blue focus ring is too faint on the sky and on amber |
| B12 | `tabular-nums` on figures in Air quality details | **Approve** | Figures line up |

## C. Shell, navigation, place chip, routing (P2)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| C1 | F-13: phone focus order | **Option A**: logo, place chip, bottom bar, content | Smallest change; matches both mockups |
| C2 | Desktop chip position after C1 | **(a)** draw the chip right after the logo on desktop, so Tab order matches what is seen | Avoids a Tab jump to the far right |
| C3 | Place chip label | **Short below `lg`, full name from `lg`**: "Pune" on phones and tablets, "Pune, Maharashtra" on desktop | Fixes "Pun…" at 768 and keeps the e2e test `responsive.spec.ts:340-346` |
| C4 | No-place chip label | **Keep** "Choose a place"; give the chip more width when no place is set | Fixes the cut-off without a copy change |
| C5 | Current-page marker on desktop | **Approve** the `text-muted` outline beside the filled pill | Not colour alone |
| C6 | Place chip border | **Approve** `text-muted` | Visible on the navy header |
| C7 | Safe-area bottom minimum of 0.75 rem | **No minimum**: `env(safe-area-inset-bottom, 0px)` as shipped, plus left and right insets (F-38) | The minimum would cost 12 px of first screen |
| C8 | 404 page testing | **Netlify only**, checked after the push; no server change | Smallest; the local server keeps its JSON 404 |
| C9 | F-12: 200% text | **Approve**: the header wraps, and Send wraps below the input | Usable at large text |
| C10 | F-39: `env()` fallbacks | **Approve** `, 0px` fallbacks in P2 | Harmless robustness |

## D. Ask AirAware (P4)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| D1 | Starters | **Option 1**: the first 3 of the existing 5 starters, the other 2 behind "More questions"; no new starter copy | Smallest; no behaviour change |
| D2 | Desktop layout | **Keep** one column | Smallest; two columns are not in the brief |
| D3 | Ask greeting | **Drop** it; the shortened intro (A12) replaces it | Gets the text box onto the first screen |
| D4 | F-34: answer provenance | **Approve**: "… · Model forecast · Open-Meteo · retrieved HH:MM", and "Model forecast" only when a forecast exists | Provenance matches the data |
| D5 | F-33: Ask header time | **Approve** "· Not current" when over 60 minutes old | Stale is marked where the time is shown |

## E. My Home and Better Habits (P5)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| E1 | F-23: one "Why?" label | **Approve** "Why?" everywhere; the screen-reader name keeps the card title | One pattern |
| E2 | My Home before a place is chosen | **Nothing** (the space is reserved only once a place is set) | No new copy |
| E3 | My Home when the plan has no indoor card | **Reuse** "No suggestions for your answers today." | Shipped string |
| E4 | Purpose lines | **Reuse** the shipped Landing lines (`landingExamples.ts`) | Shipped strings |
| E5 | Control borders `rule` → `text-dark-muted` on help choices and the Ask box | **Approve** | Visible input edges (3:1) |

## F. My Profile, Welcome, Privacy (P6)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| F1 | F-43: what "Remember" stores | **Keep** label plus 2-decimal coordinates (about 1 km), as documented on the Privacy page | Needed to reopen Today without a new search; no precise location |
| F2 | F-01 note placement | **Keep one line next to "Save my answers"** and the full note under "Your data" | People read it at the moment they save |
| F3 | "Your data" heading in My Profile | **Approve** | Groups the note and the delete button |
| F4 | Chip on Welcome | **Hide on step 1 only** | Step 1 already has its own place search |
| F5 | "Back to AirAware" on Privacy | **Plain link to `/app`** | Simple; a remembered place comes back |
| F6 | F-07: idle-account cleanup statement | **You check** in the Supabase dashboard whether the nightly cleanup job (`20261119180000_cleanup_idle_anonymous.sql`) is scheduled. I then make the page and `PRIVACY.md` match | Only you can see the production project |

## G. Landing (P7)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| G1 | Landing content | **Approve**: drop the Air quality details capture, and fold "Your personal daily plan" into section 4 | About 7 phone screens instead of 9.4 |
| G2 | Landing skyline | **Approve** the static decorative skyline (no landmark, smoke or text, per the 22 Nov anti-goals) | The visual signature |
| G3 | Hero from 1024 px | **Keep a Today preview beside the hero** | No empty half-screen |
| G4 | Landing captures | **Recapture locally after P3**, dated and labelled as past (one real plan request, needs your OK at the time) | Shows the redesigned Today truthfully |
| G5 | Landing search submit | **Landing only**; with no highlighted result, submit opens the list (never auto-picks) | Never guesses a place |
| G6 | Landing labels ("Search", section headings) | **Approve** | New elements |
| G7 | Landing footer `<nav>` | **Keep** as shipped | No document proposes it |

## H. Direction A visuals (P8)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| H1 | F-26: desktop skyline contrast | **Approve** `lg:opacity-60` on the near row, height unchanged | The answer outweighs the city |
| H2 | Panel radius 12 px | **Keep 8 px** as shipped | A visual preference with test churn; not a finding |
| H3 | Arbitrary type sizes | **Use Tailwind steps only** (verdict `text-3xl` on all widths) | No new scale |
| H4 | The backgrounds in `AirAware_Cityscape_Background_Assets/` (decided 24 Nov 2026) | **Decided: art direction only.** No PNG is shipped. The existing SVG backdrop's three air looks are tuned toward the three named images, with existing tokens only (`color-mix`): a crisper, slightly cyan "within" sky (more `secondary`, a little `primary`); a warmer, hazier "above" (`rule` with a touch of `warning`, the haze veil kept); a cool neutral "unknown" (`rule` with a little `secondary`). The city moves from dark silhouettes toward a lighter, tonal city in the sky's hue, with the near row darkest for depth; this replaces H1's opacity tweak. The final mix values are set in P8 against before/after screenshots and the existing title-contrast test (4.5:1 on every sky stop). | Keeps the weather and day/night logic (sun only on a known day, clouds and rain from data), the tiny SVG and the approved stale rule (last look plus "Not current"). The images' painted sun and clouds, 16:9 crop and cyan outside the tokens are why they aren't shipped. The three ID-named concept boards stay reference only: they contain invented classes ("Moderate", "Poor") and claims ("Better conditions today", "Clearer air"). Before anything from the folder is committed, the owner confirms where the original image came from and that it may be published |

## I. Process and environment

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| I1 | P0: keep the 8.8 MB audit screenshots out of git | **Approve** adding `docs/redesign/audit/screenshots/` to `.gitignore` | Repository limit is 10 MB |
| I2 | P0: after-measurement script | **Approve** a copy of the Stage 0 capture script for the "after" numbers | Same method before and after |
| I3 | F-42: live tests and the shared Supabase project | **One approved live `journey.spec.ts` run in P11**; no new Supabase project | No new service |
| I4 | P10: removing the html/body `overflow-x: clip` | **Defer** (optional cleanup, risk of sideways-scroll regressions) | Not needed for the findings |
| I5 | Push | **Unchanged rule**: one push at the end, on your word | About 15 Netlify credits per push |

## Not needed with Direction A

These rows only apply to Direction B: B kicker labels, B forecast-error card, B masthead on desktop, B loading placeholder, B on Privacy and the 404 page, B uppercase section labels. Phase P9 is dropped.
