# AirAware AI: Stage 1 design concepts

**Date:** 24 Nov 2026.
**Status:** proposal for the owner. No application source was changed.
**Based on:** the Stage 0 audit ([LIVE_SITE_AUDIT.md](audit/LIVE_SITE_AUDIT.md), [FINDINGS_REGISTER.md](audit/FINDINGS_REGISTER.md)), the owner's pack (`AirAware_AI_Redesign_Kit/`), the cityscape specs of 20 and 22 Nov, and the source at `257352e`. Where the Stage 1 brief and the code differ, this document follows the code.

## 1. What Stage 1 is

The pack's structure has already shipped (Stage 0):
- 5-item navigation, the place chip, a 3-step Welcome, an answer-first Today with an auto-built recommendation, Ask, My Home, Better Habits, My Profile, Privacy (LIVE_SITE_AUDIT.md §2).
- 8 of the 20 Nov audit's 10 ranked problems fixed, 2 partly (§5).
- No P0 or P1. Four P2: F-01 save wording, F-02 layout shift, F-03 recommendation below the phone fold, F-04 Ask answer below the fold.
- axe 0 violations, 0 overflow, 0 targets under 44 px (§8).

So Stage 1 is a refinement: two visual directions for the same information architecture, plus targeted fixes for the Stage 0 findings. Output is documents and static mockups. Routes, data, APIs and scene rules do not change.

## 2. The shipped baseline

Both directions start here. The owner approved the full-screen backdrop with solid panels on 20 Nov ("Solid cards") and the city drawing on 22 Nov (variant B, "Mixed street").

| Element | Shipped | Evidence |
|---|---|---|
| Backdrop | One fixed full-screen `CitySkyline` behind every `/app` page; `aria-hidden`, no layout space, hidden in forced colours | `CitySkyline.tsx:73`; spec 2026-11-20 §5.1 |
| City band | 128 px, 176 px from 640 px wide, max 20 % of screen height; above the phone bar | `CitySkyline.tsx:76` |
| Scene data | Air look only from the 24-hour check; clouds, rain, heat only from weather fields | `scene.ts:44-67` |
| Motion | Air look fades over 700 ms; clouds settle once and rain falls, 4.8 s each; none under reduced motion | `CitySkyline.tsx:47-50`; `index.css:49-69` |
| Panels | Solid `surface-light`, 1 px `rule` border, `rounded-lg` (8 px); no `backdrop-filter` | `TodayLead.tsx:29`; `States.tsx:11,59` |
| Title block | Greeting and H1 on the sky in `text-dark`; an e2e test holds 4.5:1 against every sky | `AppShell.tsx:350-363`; `e2e/backdrop.spec.ts:236-252` |
| Today type | H1 and verdict H2 both 30 px (they tie); recommendation heading 24 px | `AppShell.tsx:355`; `TodayLead.tsx:37`; `DailyPlanSection.tsx:232` |
| Desktop Today | Two columns from `lg`, 3fr / 2fr | `AppShell.tsx:369` |
| Footer | "Background: model forecast for {place}. {tag}." + " Not current." when stale | `scene.ts:105-113` |
| Landing | Dark `bg`; H1 48 / 60 / 72 px; dated past screenshots; "01" chapter markers; no skyline | `Landing.tsx:63-75,124,140` |

Screens: `prod-today-default-390x844-first.jpg`, `prod-today-default-1280x720-first.jpg`, `prod-landing-default-1280x720-first.jpg`.

### Shared by both directions

Content, copy and state logic are identical in A and B (WIREFRAMES.md is to cover the detail). Today's states stay distinct:

| State | What shows | Backdrop | Footer line |
|---|---|---|---|
| Success | Weather line (card's first row), verdict H2, tag + "Model forecast · Open-Meteo · updated HH:MM", meaning sentence (stays unless the owner OKs F-22), caveat; recommendation | Air look | Yes |
| Stale (over 60 min) | As success + amber "Not current: …" banner under the provenance; proposed "Reload forecast" (F-30) | Last-known look (F-44) | Yes, + "Not current." |
| Forecast error | No verdict; "We couldn't load the forecast" / "Forecast provider unavailable." / "Try again". The recommendation still builds and shows its own air line, or "Air information is unavailable for this plan." | Unknown, no weather | None |
| Incomplete check | "Live air information unavailable", "No data", provenance, the no-advice explanation; the recommendation still builds | Unknown air look; clouds and rain still from weather | Yes, "No data." |
| Plan error | Verdict as normal; "We couldn't build your recommendation." / "Something went wrong building your plan." / Try again; proposed reassurance (F-31) | Air look | Yes |
| Loading | Skeletons sized like the final cards + visible "Loading forecast…" (F-02, F-18) | Still silhouette | None |

Without a shown verdict, the plan prints its own provenance (`DailyPlanSection.tsx:256-261`, `planDisplay.ts:148-154`). It may be AI-made or rules-made in both states: the server tries the AI writer even when the forecast fails (`server/src/services/recommendations/dailyPlan.ts:151-166`).

Shared fixes: F-02 to F-06, F-08 to F-11, F-13, F-19, F-20, F-25, F-27 to F-31, F-35, F-38. Copy changes among them need the owner's OK (section 8).

## 3. Direction A: "Calm atmosphere" (recommended)

**Idea.** Keep the approved scene and solid panels; make the answer the strongest thing on screen. The sky carries the mood, the panels carry the words. A changes sizes, spacing and emphasis, not structure, so it stays closest to what the owner approved on 20–22 Nov.

| Area | Treatment |
|---|---|
| Landing | Dark page. Hero left- and top-aligned at `lg`, so the search (explicit submit) is on the first 1280×720 screen; today it starts at y 740 (F-19). A soft panoramic skyline in `rule-dark` / `elevated` / `surface` on a `bg`→`surface` gradient. About 7 phone screens at 390 (now 9.4). |
| App shell | Navy header and bar as shipped. Light solid panels, `rule` border, radius about 12 px (now 8). No shadows except overlays. Teal once per screen; links on light panels stay underlined `text-dark` (14.67:1; `secondary` is 2.27:1 there, DESIGN_SYSTEM_PROPOSAL §1.4), `secondary` only for links on dark (7.1–7.9:1); amber only for Not current. |
| Today, success | Title on the sky; H1 24 px on phones. Verdict the largest text: 30 px phone (`text-3xl`; 26–28 px needs an arbitrary size and your OK; mockup A draws 28 px), 36 px desktop. Recommendation heading 20 px. "Your plan is ready." screen-reader-only. "Make it personal" moves under the help choices, outlined. |
| Stale | Amber banner across the card under the provenance, with the proposed "Reload forecast". |
| Forecast error | The shipped error card as a light panel in the verdict's place. |
| Incomplete check | Success card shape with "No data"; no caveat. |
| Plan error | Error card in the recommendation panel + the proposed reassurance line. |
| Other pages | Title on the sky + one-line purpose. One flowing grid on My Home and Better Habits (F-25); Ask text box first (F-20); My Profile two columns on desktop (F-06). |
| Desktop backdrop | Near city row at lower contrast from `lg` (F-26); height unchanged (a 22 Nov non-goal). |

**Motion.** No new motion. Kept: the 700 ms air fade, the one-time cloud settle and rain, the 120 ms press scale, the 200 ms Ask answer rise, the landing scroll reveal (`index.css:132-169`). Under reduced motion none moves; press becomes a fade. The landing skyline is static. The F-04 scroll is instant under reduced motion.

**Changes from production:** Today type sizes, panel radius, near-row contrast at `lg`, landing hero and length, a landing skyline, the shared fixes.

**Risks:**
- Calm can read as plain; character depends on the scene.
- The landing skyline is a new drawing: it must follow the 22 Nov anti-goals (no landmark, smoke, signage, text).
- A lighter near row must keep "above" distinct from "within" (22 Nov goal G3); re-run the scene tests.
- The phone first-screen target: mockup A meets it with the meaning sentence kept and no "For you" line; an AI card with "For you" needs F-14 or F-22 (section 7).

## 4. Direction B: "Editorial city"

**Idea.** Same IA, scene and light panels, but Today's title block and verdict move onto one dark masthead panel (solid `surface`, #101c2b). Light text on it measures 16.0:1 (`text`) and 8.4:1 (`text-muted`), so the title no longer depends on the sky. Other app pages get a compact masthead with the page title. Type is editorial: larger headings, tighter tracking, small uppercase section labels.

| Area | Treatment |
|---|---|
| Landing | Headline set tight; a full-width city horizon across the lower third (`bg` / `surface` / `elevated`); alternating `bg` and `surface` sections. The 72 px headline and "01" markers already ship (`Landing.tsx:140`, `:63-75`), so B differs mainly in the horizon and rhythm. |
| App shell | Same header and bar; light panels below each masthead; uppercase labels (`text-dark-muted`, 12–13 px) above section headings. |
| Today, success | Masthead: greeting, H1, weather line, verdict, tag, provenance, meaning sentence (unless F-22 is OK'd), caveat, in light text. Recommendation stays a light panel. |
| Stale | Solid `warning` banner with `text-dark` text (8.82:1), so no dark variant is needed (DESIGN_SYSTEM_PROPOSAL §1.4, needs OK); its edge on `surface` is 9.7:1. Mockup B draws "Reload forecast" beside the banner; inside or beside is an open question (DESIGN_SYSTEM_PROPOSAL §13). |
| Forecast error | Open question (DESIGN_SYSTEM_PROPOSAL §13): (1) the shipped light `ErrorState` nested in the masthead with `on-light` (no new variant); (2) a dark error block in the masthead (mockup B; needs a dark `ErrorState` and re-checked button contrast). `ErrorState` is light-only today (`States.tsx:59-66`). |
| Incomplete check | Masthead with "No data". The tag's `text-dark` border (`TodayLead.tsx:42`) must change; `rule-dark` on `surface` is 1.4:1. |
| Plan error | As A. |
| Other pages | Compact masthead with the title (Ask adds "Using: …"). Same fixes as A. |
| Desktop backdrop | As shipped; the masthead out-weighs the near row, so F-26 matters less. |

**Motion.** As A. The masthead is static.

**Changes from production:** title and verdict leave the sky (spec 2026-11-20 §5.3); a dark-to-light switch inside every app page, against pack 03 §2's "light application experience"; labels and heading sizes on every page; landing horizon; the shared fixes.

**Risks:**
- At 390×844 the masthead fills most of the first screen. Check against the 20 Nov anti-goal "A dark or alarming full-screen look".
- Re-check on dark: stale banner, tags, focus, forced colours. `.on-dark` already switches the ring to `secondary` (7.1:1; `index.css:204-207`); the `focus` token is 3.5:1 there.
- The largest change from production; the title contrast test and many screenshots change.
- No Stage 0 finding says the title fails contrast (axe 0 violations; the 4.5:1 e2e test exists). Stage 0 checked contrast over the sky only partly: axe's needs-review items were not recorded (audit §10). B removes a constraint, not a known defect.

## 5. Side by side

| | A: Calm atmosphere | B: Editorial city |
|---|---|---|
| Look | Light panels on the sky; title on the sky | Dark masthead, then light panels; editorial labels |
| Risk | Low: inside the approved specs | Medium: changes an approved decision and pack 03 §2 |
| Effort | Mostly class changes in existing components | A masthead on every app page; a dark variant of the tag (and of the error card and loading if chosen, DESIGN_SYSTEM_PROPOSAL §7.3); labels |
| Contrast and testing load | 4.5:1 title test stays; re-run scene tests | New dark pairs, forced colours, title test rewritten |
| Change from approved specs | Near-row contrast at `lg` (F-26); a new landing skyline | Title leaves the sky (spec 2026-11-20 §5.3); a new landing skyline |
| "A living city, clearly explained" | City behind the title and between panels on every page; the answer is the largest text | Explanation in a strong frame; less sky on the phone's first screen |

## 6. Recommendation

**Proposal: Direction A.** It answers the Stage 0 findings without reopening decisions approved on 20–22 Nov, adds the fewest contrast pairs and test rewrites, and keeps the city in view on the first phone screen, the pack's visual signature (03 §1, §5).

**What B would add:** a more distinctive identity (pack 03 §1 asks for a "premium, calm environmental assistant"), title contrast by construction, and an editorial voice. B's landing can be taken on its own with A's app; only B's masthead touches an approved decision.

## 7. First-screen target and its trade-off

The pack wants the top recommendation and a visible "Why?" in the first phone viewport (05 Stitch brief, "Today page hierarchy"; DESIGN_REVIEW_CHECKLIST).

**Now** (`audit/evidence/prod-metrics.json`): at 390×844, verdict y 307, recommendation heading y 665, first "Why?" y 1049; the bar starts at about y 787. At 320×640, heading y 741, "Why?" y 1200, bar y 583.

| Change at 390×844 | Saves (estimate) | Needs |
|---|---|---|
| H1 24 px, one line | ~40 px | — |
| Drop the meaning sentence (F-22) | ~75 px | Owner OK |
| Tighter card padding | ~40 px | — |
| "Your plan is ready." screen-reader-only | ~30 px | — |
| Recommendation heading 20 px, one line | ~35 px | — |
| No "For you" without household answers (F-14) | ~100 px | Owner OK; client and server change |
| **Total** | **~320 px** | |

**Measured** (mockups, 390×844, a rules card with no "For you", weather line kept; `measure.mjs`, 24 Nov):
- **A:** "Why?" ends at y 739 with the meaning sentence kept, 48 px above the bar (y 787). Without the sentence: about y 656 (derived: the sentence is 75 px plus an 8 px gap).
- **B:** "Why?" spans y 763–807 and is cut by the bar. Without the sentence: about y 722 (derived: 75 px plus a 10 px gap).
- An AI card's "For you" line adds about 100 px (the brief's estimate, not measured). So A needs no OK for a rules card, and F-14 or F-22 for an AI card with "For you" (about y 756 with F-22 alone). B needs F-22 for a rules card, and F-22 and F-14 for an AI card with "For you".
- Mockup A draws the verdict at 28 px; the proposed `text-3xl` (30 px) adds about 7 px on a two-line verdict (estimate).

**Scope:** a fresh within-limit forecast, a one-line H1, no household answers. A stale banner, a long place name or a long AI card pushes "Why?" below the bar. Moving the weather line (F-21, about 57 px) would add margin; that is the owner's call.

**320×640 (measured, bar at y 583):** the verdict and provenance fit (provenance bottom: A 469, B 443). The caveat fits in B (bottom 581), not in A (560–625). The recommendation heading does not fit: top A 671, B 650. Without the meaning sentence (derived): A about 588, still below the bar; B about 565, its first line partly above. So the brief's 320 target (heading visible) is missed in both: a trade-off for you. "Why?" needs a scroll (A 961, B 950).
**1280×720:** two columns as shipped; verdict, recommendation and "Why?" on the first screen ("Why?" bottom: A 405, B 349; production today: top y 536).
**Direction B against A:** measured 33 px lower verdict (y 253 against 220) and 68 px lower "Why?" (807 against 739) at 390×844.

## 8. Owner decisions needed

The full list the owner answers is IMPLEMENTATION_OUTLINE.md §3 P1 Part A; this table repeats the rows this document touches.

From the Stage 1 brief (proposals):

| ID | Shipped | Proposed | Why |
|---|---|---|---|
| F-01 | "Saved on this browser only. Clearing your browser data or switching devices loses it." / "Saved on this browser." / "Saved on this browser. This is the plan as saved." / "Creates an anonymous save on this device. Delete it any time in My Profile." | "Saving creates an anonymous account (no email or name). Your answers are stored on AirAware's database host, and this browser keeps the sign-in. Delete them any time in My Profile." / "Saved to your anonymous account." / "Saved to your anonymous account. This is the plan as saved." / "Creates an anonymous account that keeps your answers, and a place you searched for, so this browser can reopen them. Delete it any time in My Profile." | Says where data goes (P2). Reworded from brief §8 to match the code: the project owner and Supabase can access the database (`Privacy.tsx:81`), and Remember never keeps a "Use my location" place (`Privacy.tsx:78-79`, `Welcome.tsx:306-309`) |
| F-16 | "Live air information unavailable" | "Air information unavailable" | No live readings exist |
| F-22 | Verdict meaning sentence (restates the H2) | Drop it from the card (keep it in Air quality details) | First-screen space; repetition |
| F-21 | Weather line as the verdict card's first row (approved 20 Nov) | Keep (A), or move it below the verdict | Owner's own approved decision |
| F-24 | Help choice "Greener habits" | "Better habits" | Matches the nav (spec 04 fixed the name) |
| F-32 | "updated HH:MM" | "retrieved HH:MM" | It is the fetch time, not the model run |
| F-15 | "0 of 10 answers · Edit" | "0 of 10 household questions answered · Edit" | Reads like a quota |
| F-40 | "No route can promise clean air; …" | Owner ruling on negated banned phrases | Literal copy rule |
| F-43 | Remember stores label + 2-dp coordinates | Keep (documented), or label only | Pack D2 wording |
| F-44 | Stale backdrop keeps the last-known look | Keep, or neutral when stale | Pack docs disagree |
| F-14 | "For you" always shown | Only when household answers exist | Restates the card |

Added by this document:

| ID | Shipped | Proposed | Why |
|---|---|---|---|
| Direction | — | A (recommended) or B | B's masthead changes spec 2026-11-20 §5.3 and pack 03 §2 |
| F-23 | "Why this recommendation?" (`DailyPlanSection.tsx:268`); "Why it matters" (`MyHome.tsx:117`, `GuideGroups.tsx:78`) | "Why?" everywhere; card title kept in the screen-reader name | Pack 04 §6: one pattern; the wireframes assume it |
| Landing skyline | None (Landing is a non-goal in spec 2026-11-20 §3) | A static decorative skyline, both directions | Pack 03 §5; 22 Nov anti-goals apply |
| F-26 | Near row `fill-text-dark` at 0.9 opacity, every width (`CitySkyline.tsx:244`) | Lower contrast from `lg`; height unchanged | The answer should out-weigh the city |
| F-41 | Saved-plan note uses a non-approved disclaimer form | "…and not the CPCB National AQI." | The approved disclaimer |

**New-element copy (proposals; may appear in mockups as new elements):** visible "Loading forecast…" (F-18); "Reload forecast" (F-30); "The forecast above is still up to date." (F-31); "No saved plans yet. Use Save plan under See your full day on Today." (F-06); Welcome line "See today's air forecast for your place and one thing you could do." (F-27); "No places found. Try a nearby city, or use your location." and "Search isn't working right now. Try again, or use your location." (F-35); 404 "We couldn't find that page", "Go to AirAware", "Home" (F-08); Ask intro "Ask about your air, home or day. Answers come from AirAware's rules and today's forecast." (F-20); chip "Choose place" (F-10); "Back to AirAware" on Privacy (F-28).

## 9. Mockups

Built in parallel; paths only:
- Gallery: [mockups/index.html](mockups/index.html), each page at 390×844 and 1280×720.
- Direction A: [landing](mockups/a/landing.html), [today-success](mockups/a/today-success.html), [today-stale](mockups/a/today-stale.html), [today-forecast-error](mockups/a/today-forecast-error.html), [today-incomplete](mockups/a/today-incomplete.html), [home](mockups/a/home.html).
- Direction B: [landing](mockups/b/landing.html), [today-success](mockups/b/today-success.html), [today-stale](mockups/b/today-stale.html), [today-forecast-error](mockups/b/today-forecast-error.html), [today-incomplete](mockups/b/today-incomplete.html), [home](mockups/b/home.html).
- Token values: [mockups/tokens.css](mockups/tokens.css). Its colour tokens are copied from `client/src/index.css`; its radius, nav and header values are mockup values (`--radius-panel` is the 12 px proposal; shipped panels are 8 px, controls 6 px).

They show shipped strings, except the proposed "Why?" label (F-23) and new-element strings (such as "Reload forecast", the landing "Search" and headings, the My Home purpose line), each named in the page's mockup note. They carry "Illustrative sample — not live data", and contain no pollutant values, units or percentages. Plan error has no mockup page; section 2 describes it. Measured positions are in section 7 (`measure.mjs`, 24 Nov).

## 10. Tools and skills used

Stage 1 record, from the brief:
- **airaware-ui:** the project UI workflow.
- **modern-web-guidance:** searched (navbar, content-first-noise-reduction, form-factor-adaptation). Reflected: reserve space (F-02); bars under 12 % of the viewport (56 px is 8.8 % at 640); safe-area padding on all sides (F-38); the backdrop already clips itself; removing the html/body clip (`index.css:78-81`) is a separate tested step (DESIGN_SYSTEM_PROPOSAL §8.3). `text-wrap` already ships (`index.css:179-192`).
- **design-taste-frontend:** loaded, not used: its own palette and photo stand-ins break the existing-tokens rule.
- **mobile-native:** checklist applied in Stage 0. **Unslop:** not installed. **Hallmark:** not named.
- **Google Stitch:** not available to Claude. The owner can run `AirAware_AI_Redesign_Kit/05_STITCH_DESIGN_BRIEF.md` in Stitch and check the output against section 8 and the data rules.

No further skill was loaded to write this document; the advisor was consulted before writing.
