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

**Ruling during P2, approved by the owner on 24 Nov 2026:**

| ID | Decision | Answer |
|---|---|---|
| C11 | At 768 px the logo and five nav links leave the chip about 105–120 px, so "Mumbai" shows "Mum…", "Thiruvananthapuram" shows "Thi…" and "Choose a place" is cut ("Pune" fits, as C3 requires) | **Keep as is**: the header stays one row; the chip's accessible name and the page title keep the full place. Tightening the tablet nav was not chosen |

## D. Ask AirAware (P4)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| D1 | Starters | **Option 1**: the first 3 of the existing 5 starters, the other 2 behind "More questions"; no new starter copy | Smallest; no behaviour change |
| D2 | Desktop layout | **Keep** one column | Smallest; two columns are not in the brief |
| D3 | Ask greeting | **Drop** it; the shortened intro (A12) replaces it | Gets the text box onto the first screen |
| D4 | F-34: answer provenance | **Approve**: "… · Model forecast · Open-Meteo · retrieved HH:MM", and "Model forecast" only when a forecast exists | Provenance matches the data |
| D5 | F-33: Ask header time | **Approve** "· Not current" when over 60 minutes old | Stale is marked where the time is shown |

**Ruling during P4, approved by the owner on 24 Nov 2026:**

| ID | Decision | Answer |
|---|---|---|
| D7 | At 200 % text (390x844), Ask's title block reaches about 165 px into the fixed city drawing on first load (29 px without the A12 intro; Today's none), so the end of the context line and "Edit" sit over the buildings | **Commit P4 as built; fix in P8** with the backdrop work (for example, hide the city when text is very large), which also removes the 29 px that predates P4 |

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

**Answers and rulings during P6, from the owner on 25 Nov 2026:**

| ID | Decision | Answer |
|---|---|---|
| F6 | Is `delete-idle-anonymous-users` scheduled in production? | **Yes, active** (the owner checked `cron.job`). The Privacy page now says what `PRIVACY.md` says: "A nightly job deletes anonymous accounts that have not been used for 30 days, together with their saved answers and plans." |
| F7 | "Your household answers stay on this page until you press "Save my answers"." is false for Remember (found in the P6 review) | **Fix it:** "…until you press "Save my answers" or tick "Remember on this device"." |

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

**Ruling during P7, from the owner on 25 Nov 2026:**

| ID | Decision | Answer |
|---|---|---|
| G4 | Recapture the landing's Today screenshot from the redesigned Today (one real plan request), or keep the 22 Nov capture | **Keep the 22 Nov capture.** It stays labelled "A past screenshot of Today for Pune, 22 Nov 2026", so it shows the pre-redesign Today truthfully; no plan request was made |

## H. Direction A visuals (P8)

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| H1 | F-26: desktop skyline contrast | **Approve** `lg:opacity-60` on the near row, height unchanged | The answer outweighs the city |
| H2 | Panel radius 12 px | **Keep 8 px** as shipped | A visual preference with test churn; not a finding |
| H3 | Arbitrary type sizes | **Use Tailwind steps only** (verdict `text-3xl` on all widths) | No new scale |
| H4 | The backgrounds in `AirAware_Cityscape_Background_Assets/` (decided 24 Nov 2026) | **Decided: art direction only.** No PNG is shipped. The existing SVG backdrop's three air looks are tuned toward the three named images, with existing tokens only (`color-mix`): a crisper, slightly cyan "within" sky (more `secondary`, a little `primary`); a warmer, hazier "above" (`rule` with a touch of `warning`, the haze veil kept); a cool neutral "unknown" (`rule` with a little `secondary`). The city moves from dark silhouettes toward a lighter, tonal city in the sky's hue, with the near row darkest for depth; this replaces H1's opacity tweak. The final mix values are set in P8 against before/after screenshots and the existing title-contrast test (4.5:1 on every sky stop). | Keeps the weather and day/night logic (sun only on a known day, clouds and rain from data), the tiny SVG and the approved stale rule (last look plus "Not current"). The images' painted sun and clouds, 16:9 crop and cyan outside the tokens are why they aren't shipped. The three ID-named concept boards stay reference only: they contain invented classes ("Moderate", "Poor") and claims ("Better conditions today", "Clearer air"). Before anything from the folder is committed, the owner confirms where the original image came from and that it may be published |
| H5 | Big city (owner, 26 Nov) | **Decided:** band `min(16rem,32vh)` on phones and `min(24rem,40vh)` from sm up; from md up the city is drawn 1.74x wider, centred, so each building is bigger. The city's hide threshold rises from 30.2rem to 33.3rem tall (the taller band reached Welcome titles at 28 px text on 932 px phones: 932 / 28 = 33.29rem). The question box's own 30.2rem pin is unchanged. | Supersedes the backdrop design's "never takes over a fifth of the screen" (`docs/superpowers/specs/2026-11-20-cityscape-backdrop-design.md` §5.1) and H1's "height unchanged". The owner found the buildings hard to see on phones and small on desktop |

## I. Process and environment

| ID | Decision | Recommended answer | Why |
|---|---|---|---|
| I1 | P0: keep the 8.8 MB audit screenshots out of git | **Approve** adding `docs/redesign/audit/screenshots/` to `.gitignore` | Repository limit is 10 MB |
| I2 | P0: after-measurement script | **Approve** a copy of the Stage 0 capture script for the "after" numbers | Same method before and after |
| I3 | F-42: live tests and the shared Supabase project | **One approved live `journey.spec.ts` run in P11**; no new Supabase project | No new service |
| I4 | P10: removing the html/body `overflow-x: clip` | **Defer** (optional cleanup, risk of sideways-scroll regressions) | Not needed for the findings |
| I5 | Push | **Unchanged rule**: one push at the end, on your word | About 15 Netlify credits per push |

## J. Ask chat (26 Nov 2026)

Approved by the owner on 26 Nov 2026 ("Approve as recommended"): D-1 to D-8 of `docs/redesign/ASK_CHAT_PHASE1.md` section 4, here as J1 to J8. Built, not committed.

| ID | Decision | Answer | What it replaces |
|---|---|---|---|
| J1 | Where the question box sits | **Pinned** at the bottom of the screen, after the thread. It is pinned only on screens at least 30.2rem tall (the question box's own threshold; it was also the city's until H5 raised the city's to 33.3rem); below that it sits in the page after the thread | AK-02 (the box before the chips and thread) and the AK-04 limit (now the box's top, not the bar) |
| J2 | Starter prompts | **Keep** the approved set: 6 topic chips, 3 starters, 2 behind "More questions"; no new copy | Nothing (D1 stands) |
| J3 | Welcome heading and supporting line | **Keep** "Ask AirAware" and the approved intro (A12) | Nothing (A12 and D3 stand) |
| J4 | Placeholder "Ask anything about your air…" | **None** | Nothing |
| J5 | Disclosure under the box | **None**: every answer already carries the safety note | Nothing |
| J6 | Answer look | **One solid surface** for the whole thread, a rule line between exchanges, no panel per answer; cards flat on Ask only (Today, My Home and Landing unchanged). "Open-Meteo" links to the answer's real `sourceUrl`; a closed "Sources and limitations" (Today's label) lists the forecast's limitations. "Model forecast", the time and "Not current" stay visible | DESIGN.md "each answer is a solid panel" (P4) |
| J7 | New chat, copy, feedback, history | **None** in this pass | Nothing |
| J8 | Question box behaviour | **Yes:** a textarea that grows to about 4 lines, then scrolls; Enter sends and Shift+Enter adds a line; Send disabled when empty or thinking; a failed question comes back to the box. Label and 200 characters kept | The Ask.test.tsx check that Send is enabled on an empty box |

**Rulings during the build (controller, 26 Nov 2026):**

| ID | Decision | Answer |
|---|---|---|
| J9 | Where the pinned box sits | **Flush:** on phones on the 3.5rem bottom bar, from md up at the window's bottom edge; no rounded bottom corners or bottom border **while it is stuck** (26 Nov: a scroll-state query on `data-part="ask-composer-panel"`; at the page end, or in a browser without scroll-state, it is a rounded card), so it reads as a tray. This replaces the plan's 4rem and `bottom-4` values: with a gap, thread text showed beneath the box (seen at 1280x720). Cost if wrong: a flatter look; one CSS rule and the panel div |
| J10 | Scroll padding under the pinned box | **18.5rem** on phones and **14.5rem** from md up (26 Nov, after the credit line: form 230 px, plus the 56 px bar = 286; desktop 222) (desktop was 12rem, raised after the form measured 200.98 px against 192) |
| J11 | "Sources and limitations" | **Closed** at first, on topic answers that have a forecast. It holds only the limitations; "Model forecast" and "Not current" are never inside it |
| J12 | Enter on phones | **Enter sends** on phones too (as before); Shift+Enter adds a line. Enter during IME composition does nothing |
| J13 | AK-18 | Two cases: 390x500 (pinned) and 390x480 (not pinned, as 480 px is under the question box's own 30.2rem = 483.2 px; the city's threshold is 33.3rem since H5); viewport emulation only, not a real keyboard |
| J14 | Footer as a card (owner, 26 Nov) | The app footer is a rounded card aligned with the content; the sky shows around it; text stays on an opaque surface. |
| J15 | Ask column (owner, 26 Nov) | The whole Ask column (title block, topics, conversation, box) is centred inside main with `mx-auto`; text stays left-aligned. Replaces the left-aligned column. |
| J16 | Credit on Ask (owner, 26 Nov) | On Ask with a place, a one-line credit inside the question box (Open-Meteo, CC BY 4.0, CAMS, Privacy) replaces the footer card; the sky note is dropped on Ask. Other pages keep the footer card, and Ask with no place keeps it too. Replaces J14 for Ask with a place. |
| J17 | Pin after the first question; phones from the start (owner, 26 Nov) | Phones (below 48rem) pin the box from the start; from md up the box pins after the first question; the Ask column's gap is 16 px from md up so the empty-state box fits at 1280x720 (owner, 26 Nov). Replaces J1 pinned from the start on md and up. Before the trim the unpinned box measured below the first screen at all three sizes (bottom 862.6 against 787, 914.6 against 583, 726.6 against 720). |
| J18 | Cycling example questions (owner, 26 Nov) | Both empty Ask boxes (Ask, and Today's small box) show an `aria-hidden` hint that types, holds, fades and cycles through the approved example questions (STARTERS). It hides on focus or when there is text, and stays still (the first question) under reduced motion. Amended 26 Nov (owner): it loops only before the first question; once the conversation has an entry (shared by both boxes) it shows the first example, still. It also pauses on hidden tabs and while Today is not the page on screen, because ACCESSIBILITY.md says to pause nonessential continuous animation (WCAG 2.2.2). Replaces D-4 ("no placeholder") in `ASK_CHAT_PHASE1.md`. |
| J19 | Place-search hint (owner, 26 Nov) | The shared place search shows the hint text "e.g. Pune, India". The label is unchanged. Replaces the empty field. |
| J20 | Weather comparison on Today (owner, 26 Nov) | A table "Weather · Open-Meteo model data" compares Yesterday, Today and Tomorrow: rows "At {local hour}", "Min–max" and "Rain", with the note "Yesterday is past model data, not station measurements." It sits after the recommendation, because placing it after the verdict card failed Today's layout-shift and TD-03 gates. Hidden while loading, on error and when "Not current". The server asks Open-Meteo for `past_days=1`, `forecast_days=2` and daily values, and `WeatherNow` gains `utcOffsetSeconds` and `days`. Adds to the this-hour weather strip, which stays. |
| J21 | Bottom space (owner, 26 Nov) | The gap above the footer card is 32 px on every tab, the same as between panels: main `py-8 sm:pt-12`, footer row `pb-8`. Replaces 64 to 80 px (main `py-8 sm:py-12` plus the footer row's `py-8`). |
| J22 | See-through cards, no space under the footer (owner, 27 Nov) | Page cards use `card-surface`: 85 % `surface-light` with an 8 px backdrop blur, solid under `prefers-reduced-transparency`; inputs, dialog, dropdown, chart label and skip link stay solid. The end spacer is gone from `md` up (phones keep the bar's 3.5rem plus the safe-area inset), so a page ends at the footer row's `pb-8`. Welcome's step panel is included (it holds the place search, so it sits above the footer card); Landing and Privacy stay as they were. |
| J23 | Ask context lines once (owner, 27 Nov) | In a thread, "Made with AI" / "Made by our rules", "Based on", the caveat, "Sources and limitations" and the safety note show under the first answer and again only when any of them changes (`contextKey`); "Not current" always shows. |
| J24 | Answers to questions back (owner, 27 Nov) | Question, response, question, response: an answer to a question back is your own message with its question ("Is your home near a busy road? Yes"), and its reply shows only cards not already shown above, naming the rest ("Also still applies (see above): …", only cards still in the thread). An answer that changes nothing gets its own "Noted" reply. Replaces the "You answered: …" line (Skip keeps its line). |
| J25 | Ask UX spec, UI only (owner, 27 Nov; `AirAware_Ask_AirAware_Assistant_Interaction_UX_Spec.md`, Phase 1 audit) | Server unchanged (the AI still never sees the question; clarification, a forecast topic and question-aware answers are a separate decision). Ask reads in a centred 56rem (896 px) column (`max-w-4xl`), narrower than the other tabs; the owner compared 768 px, 896 px and full width the same day and chose 896 px ("shorter is good for UI"), reversing the earlier 27 Nov "as wide as the other tabs". "How can I help you today?" shows until the first question (overrides D3/J3 for this line only; the H1 and intro stay). 4 starters show and the 6 topic chips plus the 5th starter sit under "More topics" (replaces D1/J2's count and "More questions"). The box has a fixed placeholder "Ask about your air, home or daily routine…" (replaces J18 on Ask; Today's box keeps the cycling hint). Each reply has a small "AirAware" label, its first sentence is the biggest text, a copy icon (named "Copy answer" for screen readers and as a tooltip, a tick once copied; it copies the answer, its cards, "Based on" and the note; "Copied" or a failure line in a live region; overrides J7 for copy only) and the thread is a region named "Conversation". Fixes from the audit: Today's box rests while an answer is on its way and clears after sending; the stale banner says "Reload…" only where a Reload button exists; the off-topic line names Commuting and ends with a full stop; the Using line says "forecast unavailable right now" when the forecast failed. *Amended (28 Nov): "the AI still never sees the question" is replaced by J26.* |
| J26 | Claude answers typed Ask questions (owner, 28 Nov; "as recommended", D1 to D7 of `docs/superpowers/specs/2026-11-28-ask-claude-grounded-design.md`; ADR-008) | **D1** typed questions the keyword lists call out of scope go to Claude, which may still answer `out_of_scope`. **D2** up to 2 earlier questions plus their card ids go with a new one, re-checked for medical words; answer text is never sent back. **D3** no weather or fire context in v1. **D4** any Claude failure falls back to the rules' answer with no Gemini call. **D5** typed questions move off Google: the question never reaches Gemini. **D6** the Ask intro reads "Claude (Anthropic) reads your question and answers from AirAware's rules and today's forecast." **D7** the Privacy page and `PRIVACY.md` state what Claude receives and Anthropic's terms (checked 28 Nov: inputs and outputs deleted within 30 days, not used for training by default). Medical questions call no AI. Claude Ask has its own cap of 200 calls per UTC day per instance. Owner, before deploy: set a monthly spend limit in the Anthropic Console. **Replaces:** J25's "the AI still never sees the question"; D1 of 20 Nov ("AI writes 2–3 sentences only"); the 21 Nov rulings "The AI never reads what people type" and "no AI-written questions". Follow-up questions stay non-AI ("You could also ask" is still the fixed starters). The old rulings stay as history. |
| J27 | Redesign direction (owner, 28 Nov; "aproove A design") | Direction A, "Calm editorial environmental intelligence", from `docs/redesign/05_DESIGN_DIRECTION_A_B.md` (prototype `docs/redesign/prototypes/direction-a.html`). This approves the direction only: each phase in `14_IMPLEMENTATION_ROADMAP.md` (R0 rulings D1–D15, then R1 onward) still needs its own approval, and no dependency, skill install or API change is approved by it. |

## Not needed with Direction A

These rows only apply to Direction B: B kicker labels, B forecast-error card, B masthead on desktop, B loading placeholder, B on Privacy and the 404 page, B uppercase section labels. Phase P9 is dropped.
