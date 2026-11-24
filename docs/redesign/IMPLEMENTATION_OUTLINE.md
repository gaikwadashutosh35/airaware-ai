# AirAware AI redesign: implementation outline (Stage 1 proposal)

**Date:** 24 Nov 2026.
**Status:** proposal. Nothing is implemented. Each phase below starts only after the owner approves it.
**Covers:** Stage 5 items 6–8 of the brief: (a) the files likely to change, (b) the tests and e2e strings that pin the text or layout the redesign changes, (c) risks with mitigations, (d) a phased plan.
**Source read:** commit `257352e` (the production commit), read on 24 Nov 2026. Line numbers below were checked in that source. Where the brief and the code disagree, the code wins; the disagreements are listed in §6.
**Criteria:** IDs such as TD-03 or PF-01 refer to [REDESIGN_ACCEPTANCE_CRITERIA.md](REDESIGN_ACCEPTANCE_CRITERIA.md).

**Paths:** every path in this document was checked with `test -e` on 24 Nov. Paths marked **(new)** do not exist yet:
- `client/public/404.html` (new);
- `e2e/firstscreen.spec.ts` (new): first-screen positions, layout shift, focus order and request counts at 320x640, 390x844 and 1280x720;
- `docs/redesign/evidence/capture-after.mjs` (new): a copy of the Stage 0 capture script whose screenshots and JSON go to the scratchpad, never into `docs/redesign/audit/`.

`client/src/pages/Profile.tsx` and `client/src/features/daily-plan/PlanCard.tsx` have no test file of their own. They are tested through `AppShell.test.tsx` and `PlanView.test.tsx`, and new tests go there.

## 1. Rules for every phase

1. **One focused phase per approval.** Each phase ends with a report: what changed, skills used, agents and models that ran, the real output of the checks, and open risks (RP-06).
2. **Test first where possible.** Write the failing test that pins the new text or position, then change the code.
3. **Checks per phase:** `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and the **stubbed** e2e specs.
   - The stubbed specs answer every request in the browser: `responsive`, `copy`, `keyboard`, `backdrop`, `scene`, `failures`, `ask`, `landing`.
   - `pages.spec.ts` uses the real local server's guides, with no external service, but it counts against the API's 60-a-minute limit.
   - **Live specs** run only with the owner's OK: `onboarding.spec.ts` (live Open-Meteo search) and `journey.spec.ts` (live Open-Meteo, plus real anonymous accounts in the production Supabase project, F-42).
4. **Git:**
   - commit on `main` (the challenge's one-branch rule);
   - stage files by name, never `git add docs/redesign` (§5.6);
   - no push until the owner says so after all phases (about 15 Netlify credits per push).
5. **No new dependency, token value, config or API change** without the owner's OK.
6. **Delegation** (project `model-task-router` skill):
   - code: `feature-implementer` (Sonnet);
   - tests: `test-engineer` (Sonnet);
   - privacy copy (P1, P6): `security-reviewer` (Opus);
   - rulings, commits and the push stay in the main session.

## 2. Phased plan

| Phase | Scope | Direction | Effort (hours) | Approval gate before it starts |
|---|---|---|---|---|
| P0 | Preparation: screenshot handling, after-measurement script | both | 0.5–1 | OK on the `.gitignore` line and the measurement plan |
| P1 | **Copy rulings** (one decision round), then the approved pure string swaps | both | 3–4 after the rulings | The owner's answers to the copy table in P1 |
| P2 | Shell, navigation, place chip, routing, 404 page | both | 5–6 | Chip label rule; desktop chip position; how the 404 page is tested |
| P3 | Today: first screen and the four states | both | 8.5–11 | P1 rulings on F-22, F-21, F-14, F-44 |
| P4 | Ask AirAware: box first, answer in view, provenance fixes | both | 5–6 | Reading of "3 starters for the chosen topic" |
| P5 | My Home and Better Habits: reserved space, flowing cards, one "Why?" label | both | 4–5 | F-23 confirmed |
| P6 | My Profile, Welcome, Privacy | both | 5–6 | F-07 fact check (cleanup job), F-43 ruling |
| P7 | Landing: 7 sections, hero search on the first screen | both (B's hero in P9) | 6–8 | What happens to the two landing captures; the landing skyline itself |
| P8 | Direction A visual refinements (desktop skyline, type scale, panels) | **A only** | 3–4 | The owner picks A; F-26 approved |
| P9 | Direction B: masthead, editorial landing, section labels | **B only** | 10–14 | The owner picks B |
| P10 | Optional design-system cleanup (`overflow-x: clip`, `svh`) | both | 2–3 | OK to touch a global rule |
| P11 | Full regression, after-measurement, release, push | both | 3–4 | The owner's word to push |

**Totals:**
- **Direction A:** P0–P8 plus P11, about 43–55 hours (P10 adds 2–3).
- **Direction B:** P0–P7, P9 and P11, about 50–65 hours.

**Note:** these totals were not re-estimated after phases P2, P4, P5, P6 and P10 gained scope.

## 3. Phases in detail

### P0 Preparation (no application change)

| Item | Detail |
|---|---|
| Scope | (1) Keep the audit screenshots out of git. (2) Create the after-measurement script. (3) Confirm the "before" numbers. They are already in `docs/redesign/audit/evidence/`, so nothing is re-measured. |
| Files | `.gitignore`: proposed new line `docs/redesign/audit/screenshots/` (a configuration change, so it needs the owner's OK). The alternative is to always stage by name. `docs/redesign/evidence/capture-after.mjs` **(new)**: a copy of `docs/redesign/audit/evidence/capture.mjs` with `SHOTS` (line 18) and `OUT` (line 19) pointed at the scratchpad, local mode by default. |
| Tests | None. |
| Criteria | RP-03, RP-05; §0.2 of the criteria (CAP, CAP-PROD). |
| Effort | 0.5–1 h. |
| Gate | Owner OK on both files. |

### P1 Copy rulings and approved string swaps

**Part A: one decision round.** The owner answers every row once, early, so later phases never mix layout work with copy changes. Each row is a proposal. "Keep" is always a valid answer. This is the master list: the "needs your OK" tables in DESIGN_CONCEPTS.md §8, INFORMATION_ARCHITECTURE.md §8.1 and WIREFRAMES.md §21 repeat only the rows each document touches.

| Row | Shipped | Proposed | Built in |
|---|---|---|---|
| F-01 | 4 save and remember notes ("Saved on this browser only…", "Saved on this browser.", "Saved on this browser. This is the plan as saved.", "Creates an anonymous save on this device…") | The 4 strings in DESIGN_CONCEPTS.md §8: brief §8's, with two reworded to match `Privacy.tsx:78-81` ("this browser keeps the sign-in"; Remember "keeps your answers, and a place you searched for") | P1 |
| F-16 | "Live air information unavailable" | "Air information unavailable" | P1 |
| F-22 | Meaning sentence on the verdict card | Move it into "Air quality details" (within and above states only; the unknown state keeps its sentence) | P3 |
| F-21 | Weather row first on the card (approved 20 Nov) | Keep, or move below the verdict | P3 |
| F-24 | Help choice "Greener habits" | "Better habits" (and say whether Ask's topic chip "Greener habits", `client/src/features/ask/ask.ts:23`, changes too) | P1 |
| F-32 | "updated HH:MM" | "retrieved HH:MM" | P1 |
| F-15 | "0 of 10 answers · Edit" | "0 of 10 household questions answered · Edit" | P1 |
| F-40 | "No route can promise clean air; …" (`rules.ts:222`) | Ruling on negated banned phrases; if banned, reword and test | P1 |
| F-43 | Remember stores label + 2-decimal coordinates | Keep (documented), or label only (see the risk in §5.3) | P6 |
| F-44 | Stale backdrop keeps the last-known look | Keep, or neutral when stale (both directions) | P3 |
| F-14 | "For you" always shown | Only when household answers exist | P3 |
| F-41 (not in brief §8) | "…not the CPCB AQI." (`PlanView.tsx:14`) | "…and not the CPCB National AQI." | P1 |
| F-23 (brief §3, not §8) | "Why this recommendation?", "Why it matters" | "Why?" everywhere | P5 |
| F-10 label (brief §3, not §8) | No-place chip "Choose a place" | "Choose place" | P2 |
| F-07 (fact first) | "Unused accounts are not removed automatically yet." (`Privacy.tsx:90`) | Whatever is true once the owner checks whether the cleanup job runs in production | P6 |
| F-35 | "No places found"; the server's message on error | "No places found. Try a nearby city, or use your location." / "Search isn't working right now. Try again, or use your location." (a 429 keeps "Too many requests. Try again in a minute.") | P1 |
| F-33 (register only, not in brief §3) | Ask header time has no stale mark | Append "· Not current" when the forecast is over 60 minutes old (AK-08) | P4 |
| F-17 (register only, not in brief §3) | The plan's air line is hidden on Today | Show it when the plan's level differs from the verdict's (DI-06) | P3 |
| F-12 (register only, not in brief §3) | Header scrolls sideways and the Ask input shrinks at 200 % text | Header wraps; Send wraps below the input (SH-07, AK-10) | P2, P4 |
| F-39 (register only, not in brief §3) | `env()` inside `calc()` without a fallback; `100dvh` hero | Add `, 0px` fallbacks (P2); `svh` hero and touch callout (P10) | P2, P10 |
| F-13 phone order | Logo, bar, chip, content | Option A: logo, chip, bar, content (recommended; both mockups). Option B: logo, chip, content, bar (INFORMATION_ARCHITECTURE.md §4.4) | P2 |
| F-34 wording | "… · Model forecast · updated HH:MM", always | "… · Model forecast · Open-Meteo · updated HH:MM", and "Model forecast" only with a forecast | P4 |
| Ask greeting | Shown (`Ask.tsx:113-114`) | Drop it (the purpose line replaces it), or keep it below the text box | P4 |
| My Profile heading | None | "Your data" (holds the F-01 note and "Delete my saved data") | P6 |
| Landing labels | None | "Search" (submit), the headings "What AirAware helps with" and "My Home and Better Habits", and the preview caption if a drawing replaces the dated capture | P7 |
| My Home empty line | None (the section is removed) | A new line, or reuse "No suggestions for your answers today." (`DailyPlanSection.tsx:42`; DESIGN_SYSTEM_PROPOSAL §9.3) | P5 |
| My Home and Better Habits purpose lines | None | Reuse the shipped landing lines "Indoor suggestions look at what you cook with and what burns inside, as well as the air outside." and "Practical habits that cut pollution for you and your neighbours. We never show an emissions saving we can't calculate." (`landingExamples.ts:52,72`; WIREFRAMES.md §15–§16; mockup B). Alternative for My Home, drawn in mockup A: "Suggestions for your home today, then ways to improve indoor air on any day." | P5 |
| B kicker labels | None | "Your plan", "Get help", "Ask", "Today", "Guides" (mockup B), against `DESIGN.md` §4 | P9 |
| Landing skyline | None (spec 2026-11-20 §3 lists the landing as a non-goal) | A static decorative skyline, both directions | P7 |
| F-26 | Near row `fill-text-dark` at 0.9 opacity at every width | `lg:opacity-60` on the group at `CitySkyline.tsx:244`; height unchanged | P8 |
| Help choices on phones | One column below 640 px (`HelpChoices.tsx:55`) | 2 x 2 below 640 px, as brief §7 draws (both mockups) | P3 |
| B forecast-error card | n/a | Option 1 or 2 in the design-system block below | P9 |
| Privacy line 44 | "No account exists until you press a save button." omits Remember | Align it with `Privacy.tsx:75` (a copy finding outside the Stage 0 register) | P6 |
| Direction | — | A (recommended) or B | P8 or P9 |
| Invite placement | Before the help choices, teal (`AppShell.tsx:421-441`) | Under the help choices, outlined; label unchanged (brief §3; both mockups) | P3 |
| Landing content | 8 sections | Drop the Air quality details capture; fold "Your personal daily plan" into section 4 without its card (WIREFRAMES.md §4, §22 item 1) | P7 |
| First screen with an AI plan (390x844) | Production plans are usually AI-made, and every AI plan has a "For you" line (`server/src/services/ai/planOutput.ts:165` rejects a `forYou` under 10 characters) | Approve enough for "Why?" to reach the first screen with an AI plan and no household answers. Direction A: F-14 or F-22. Direction B: F-22 for a rules plan; F-14 and F-22 for an AI plan. The "For you" line is about 100 px (the brief's estimate, not measured). Mockup B's other trade for a rules plan: drop its "Your plan" label (about 20 px). DESIGN_CONCEPTS.md §7; TD-03, TD-05 | P3 |
| First screen at 320x640 | Recommendation heading at y 741, bar at y 583 | Accept that the brief's 320 target is missed in both directions: the verdict and provenance fit, the recommendation heading does not (top: A 671, B 650; without the meaning sentence about A 588, B 565), and "Why?" needs a scroll. TD-01 and TD-02 gate only the verdict and provenance. DESIGN_CONCEPTS.md §7 | P3 |
| Place chip label (F-10) | Full label, truncated (`max-w-44`, `md:max-w-56`) | Two proposals: the text before the first comma at every width ("Pune": INFORMATION_ARCHITECTURE.md §4.3, WIREFRAMES.md §20 item 4, both mockups); or short below `lg` and the full name from `lg` (§6 C-2; keeps `responsive.spec.ts:340-346`) | P2 |
| Desktop chip position (after F-13) | Logo, nav, chip, in both DOM and visual order | With the chip before the nav in the DOM, `md:order-*` draws it at the right end, so desktop Tab goes logo, chip (far right), nav (mockup B measured this at 1280). (a) Draw the chip right after the logo on desktop; or (b) accept and document the jump. §5.4 | P2 |
| Chip on Welcome (F-27) | Shown on every step | Hide it on step 1 only (Welcome tells the shell its step through a callback, as P6 plans), or on all of `/app/welcome`. COMPONENT_REUSE_MAP.md §4 item 3 | P6 |
| Testing the 404 page (F-08) | The local server answers unknown paths with JSON (`server/src/app.ts:148-152`) | Test on Netlify only, with `E2E_BASE_URL` after the push; or serve `404.html` locally from `app.ts:148-152`, which changes `server/src/app.test.ts:84-91`. §5.5 | P2 |
| F-22 in the above-limit state (C-7) | The meaning sentence is on the card in every state. In "above" it is the only line that names the pollutant above the limit, and that state has no caveat | Move it to "Air quality details" in both states (the F-22 row), or keep it on the card in the above state only. WIREFRAMES.md §22 item 11; §6 C-7 | P3 |
| F-31 wording from 1024 px | None | "The forecast above is still up to date." is wrong from 1024 px, where the forecast sits to the left. One wording that fits both widths is needed; none is drafted yet. WIREFRAMES.md §12, §22 item 5 | P3 |
| Hourly reload on Today | The verdict card is replaced by the loading placeholder until the new forecast arrives (`AppShell.tsx:373-397`) | Keep, or keep the old verdict on screen, marked as not current, until the new one lands. Not in the brief. INFORMATION_ARCHITECTURE.md §10 item 7 | P3 |
| F-14 gating place | — | If F-14 is approved: gate on the client only, in `DailyPlanSection` and My Home (smallest; keeps `today.test.ts:77`), or also on the server in `plan.ts:28-32`. §6 question 6 | P3 |
| Ask starters (C-3) | All 5 starters shown; a topic chip sends at once | Option 1 (recommended): the first 3 of the existing 5, the other 2 behind "More questions"; no new starter copy. Option 2: a topic chip selects a topic, then lists that topic's starters; new starter copy and a chip behaviour change. INFORMATION_ARCHITECTURE.md §6.3; §6 C-3 | P4 |
| Ask on desktop | One 48rem column | Keep, or two columns from 1024 px: text box and thread left, topics and starters in a sticky right column (WIREFRAMES.md §13–§14, §22 item 2; not in the brief) | P4 |
| Ask purpose line and input label | Input label "Ask about your air, home or day" | The proposed purpose line starts with the same words. Keep both, or shorten the purpose line. WIREFRAMES.md §22 item 3 | P4 |
| My Home with no place | "Today, for your home" hidden | What the reserved space shows before a place is chosen: nothing (DESIGN_SYSTEM_PROPOSAL.md §9.3 reserves it only once a place is set), or new content (new copy). INFORMATION_ARCHITECTURE.md §6.4, §10 item 6 | P5 |
| F-01 note beside "Save my answers" | The save note sits in the form, by the button | Only in "Your data" (far below the button on phones; the button points to it with `aria-describedby`), or also keep one line next to the button. WIREFRAMES.md §17, §22 item 4 | P6 |
| "Back to AirAware" target (F-28) | No link | A plain link to `/app`: a remembered place comes back, otherwise Welcome opens and a searched place is lost (the footer Privacy link is a full page load). Or carry the place query to `/privacy` and back. INFORMATION_ARCHITECTURE.md §4.5, §10 item 3 | P6 |
| Landing captures | Two dated past captures from 22 Nov (`today-phone.jpg`, `air-details.jpg`) | Keep them (truthful, but they show the pre-redesign UI); recapture from the local build against live Open-Meteo after P3 (one real plan request); recapture from production after the push (one more push); or a drawn preview with an honest caption and an `aria-label`, as both mockups draw (caption in the "Landing labels" row; risk §5.3). §3 P7 gate | P7 |
| Landing hero from 1024 px | Dated Today capture in the hero's right column | Move it to section 2, leaving the hero as text over the skyline (the right half is empty sky in mockup A); or keep a Today preview beside the hero from `lg`. WIREFRAMES.md §22 item 1 | P7 |
| Landing search submit | No submit; `LocationSearch` is shared by Landing, the place-chip dialog, Welcome and Ask | Landing only (a landing-only wrapper, as P7 plans) or all four searches; and with no highlighted result, submit picks the first result or opens the list. INFORMATION_ARCHITECTURE.md §6.8, §10 item 4 | P7 |
| F-35 on Landing | "No places found"; the server's message | The proposed lines end "or use your location", but Landing has no location button (`Landing.tsx:153`). A Landing variant without that clause is needed (wording needs OK). COMPONENT_REUSE_MAP.md §4 item 4 | P1 |
| Landing footer landmark | The Privacy link sits in the footer with no `<nav>` (`Landing.tsx:296-307`) | Keep, or wrap it in `<nav aria-label="Footer">`, as both mockups draw (a new landmark name; no new links). No document proposes it | P7 |
| B masthead on desktop | n/a | It spans both columns, or only the verdict column (the title block then moves into the left grid column, `AppShell.tsx:350-369`). COMPONENT_REUSE_MAP.md §4 item 5 | P9 |
| B loading placeholder | n/a | A light card inside the masthead (no dark variant), or bars at `bg-text/10` on the masthead. DESIGN_SYSTEM_PROPOSAL.md §7.3 | P9 |
| B on Privacy and the 404 page | n/a (the brief does not define them) | Privacy: a compact dark masthead with "Privacy" and the intro. 404: the editorial large headline. Yes or no to each. WIREFRAMES.md §19, §22 item 7 | P9 |
| Live tests and Supabase (F-42) | `journey.spec.ts` creates real anonymous accounts in the production Supabase project | A separate development Supabase project, or one approved live `journey.spec.ts` run in P11. §5.2 | P11 |

New-element copy (all proposals, built with their elements):
- Welcome step 1 value line, brief §3: "See today's air forecast for your place and one thing you could do.";
- "Loading forecast…" shown on screen;
- "Reload forecast";
- "The forecast above is still up to date.";
- the My Profile no-session line "No saved plans yet. Use Save plan under See your full day on Today.";
- the 404 page heading "We couldn't find that page" and its links "Go to AirAware" and "Home";
- Privacy "In short" (3 lines), "our database host" and "Back to AirAware";
- Ask's intro line, brief §3: "Ask about your air, home or day. Answers come from AirAware's rules and today's forecast.", and "More questions";
- the one-line purpose on My Home and on Better Habits (row above).

**Design-system rulings** (copied from DESIGN_SYSTEM_PROPOSAL.md §13; each needs OK; "Built in" names the phase):

| Item | Built in |
|---|---|
| Focus ring in the title block (and on a solid stale banner) uses `text-dark`: one rule in `index.css` after line 213 (DESIGN_SYSTEM_PROPOSAL §4.2) | P3 |
| Current-page outline in `text-muted` (or, B only, the light pill mockup B draws) | P2 |
| Stale banner as a solid `warning` fill | P3 |
| "Reload forecast" inside the banner (the §4.2 ring rule assumes this) or beside it (mockup B) | P3 |
| Place chip border `text-muted` | P2 |
| Panel radius 12 px (both directions' panels use it) | P8 (A) or P9 (B) |
| Arbitrary type sizes (26–28 px verdict, 40 px B headline, the mockup sizes in DESIGN_SYSTEM_PROPOSAL §2.3) | P8 (A) or P9 (B) |
| B uppercase section labels against `DESIGN.md` §4 | P9 |
| B forecast error: (1) the shipped light `ErrorState` nested in the masthead with `on-light`; (2) a dark error block (mockup B) | P9 |
| Safe-area bottom minimum of 0.75 rem | P2 |
| Removing the html/body `overflow-x: clip` | P10 |
| My Home empty line when a plan has no indoor cards (row above) | P5 |
| `lg:opacity-60` on the near row (F-26, row above) | P8 |

Design-system proposals not on that list, approved with their phase: `tabular-nums` on `AirReadout.tsx:87,121` (P3); control borders `rule` → `text-dark-muted` on `HelpChoices.tsx:66`, `AskBox.tsx:71`, `AskEntry.tsx:25-26` (P5); `disabled:opacity-60` on the outlined `buttonClass` in `HouseholdPreferencesForm.tsx:179` and `SavedPlansList.tsx:37` (P6); a `styles.test.ts` check that the hex values in `404.html` exist in `index.css` (P2).

The brief's wireframe also names the Today invite "Tailor this to your household", while the shipped text is "Make it personal: 2 quick questions". The shipped text stays unless the owner adds this row.

**Part B: the code.** Pure string swaps only, for the approved rows built in P1.

| Item | Detail |
|---|---|
| Files | See §4 for every source line per row. Main ones: `client/src/features/daily-plan/HouseholdPreferencesForm.tsx:28-31`, `DailyPlanSection.tsx:38`, `client/src/pages/Welcome.tsx:303` (F-01); `client/src/features/today/today.ts:47`, `server/src/services/recommendations/rules.ts:133` (F-16); `client/src/features/today/HelpChoices.tsx:36` (F-24); `client/src/features/today/TodayLead.tsx:45`, `planDisplay.ts:153`, `client/src/features/ask/AskEntry.tsx:82-88`, `client/src/pages/Ask.tsx:86`, `client/src/pages/Landing.tsx:184` (F-32); `Ask.tsx:86` (F-15); `rules.ts:222` (F-40); `client/src/features/daily-plan/PlanView.tsx:14` (F-41); `client/src/features/location/LocationSearch.tsx:52,57-64` (F-35). Docs quoting the strings: `API.md:230,279`, `USER_GUIDE.md:26,63`, `README.md:60`. |
| Tests to update | Every test line in §4 for the approved rows; add a "no old string" GREP check to the phase report. Extend `e2e/copy.spec.ts` with an opened saved plan (F-41 is not reached by any e2e today). |
| Criteria | CP-01 to CP-07, PR-05, DI-01, DI-03, AK-07, MP-05, ST-10. |
| Effort | 3–4 h once the rulings are in. |
| Gate | The owner's written answers. After the code: `security-reviewer` reads the F-01 strings against `Privacy.tsx:44,75-81`. |

### P2 Shell, navigation, place chip, routing

| Item | Detail |
|---|---|
| Scope | **F-13:** per the ruling (Option A: the place chip comes before the navigation in DOM order; Option B also moves the nav after `<main>` on phones). **Design system:** the current-page outline, the chip border and the bottom minimum, per the rulings. **F-10:** the chip's short label and minimum width. **F-28:** the logo goes to `/app` plus the query. **F-09:** an unknown app page redirects to `/app`. **F-08:** a static 404 page. **F-38:** side safe areas. **SH-03:** the current item is visible in forced colours. Proposals not in brief §3, only if approved in P1: **F-39** `env()` fallbacks; **F-12** the header wraps at 200 % text. |
| Files | `client/src/pages/AppShell.tsx:270-291`: header row order (logo, chip, nav, with `md:order-*` per the chip-position ruling); `:274`: `overflow-x-auto` becomes wrapping; `:275-280`: the logo's `href`; `:114-119`: the Welcome redirect effect, next to it a redirect for unknown page names; `:493-496`: `, 0px` fallbacks in the end spacer. |
| | `client/src/components/AppNav.tsx:41-44`: bar padding (bottom `max(0.75rem, env(safe-area-inset-bottom, 0px))` if chosen, plus left and right insets); `:52`: current-item marker that survives forced colours. |
| | `client/src/components/PlaceChip.tsx:37-46`: visible label (text before the first comma below `lg`, the full name from `lg`, if the owner agrees); `min-w` at `md`; the no-place label per the ruling; the accessible name unchanged. |
| | `client/src/lib/navigation.ts:33-36`: let the shell tell an unknown page name from Today (today `appPage` maps it to `'today'`). |
| | `client/src/index.css:122-126`: scroll padding, if the bar height changes. `client/src/features/air-quality/CitySkyline.tsx:76`: the city band's bottom offset (3.5 rem + inset) must follow the bar height; add the `, 0px` fallback. |
| | `client/public/404.html` **(new)**: no script, Inter from `/fonts/`, inline styles only (the CSP allows inline styles, not scripts: `client/public/_headers`). |
| | Optional, owner's call: `server/src/app.ts:148-152`. Serve `404.html` with status 404 for non-API GETs, so the local e2e server can test it. |
| Tests to update | `PlaceChip.test.tsx:33` (expects the full name in the chip's text), `:55-59` (no-place label). `AppShell.test.tsx:186` (chip name pattern). `navigation.test.tsx:21` (unknown → today). `responsive.spec.ts:209` (`header .truncate` must equal the 70-character name at every size) and `:340-346` (Mumbai whole at 1280: unchanged if the full name returns at `lg`). `styles.test.ts:69-74` if the scroll padding changes. `server/src/app.test.ts:84-91` ("keeps the JSON 404 for /nope") only if the server option is taken. |
| Tests to add | `e2e/firstscreen.spec.ts` **(new)**: SH-01, SH-04, SH-05, SH-06 (phone Tab order), SH-07, NF-03. `e2e/pages.spec.ts`: NF-01, skipped unless `E2E_BASE_URL` is set. `styles.test.ts`: the hex values in `404.html` exist in `index.css` (DESIGN_SYSTEM_PROPOSAL §10). |
| Criteria | SH-01 to SH-07, NF-01 to NF-04, G-01, G-02, AC-05, AC-06, AC-08. |
| Effort | 5–6 h. |
| Gate | Owner picks: (1) the chip label rule, (2) the F-13 phone order (Option A / B) and the desktop chip position (see risk §5.4), (3) Netlify-only or server-side 404 testing. |

### P3 Today: first screen and the four states

| Item | Detail |
|---|---|
| Scope | **F-03 savings:** H1 at 24 px on phones, tighter card padding on phones, "Your plan is ready." screen-reader-only, recommendation heading at 20 px. Also F-22 and F-21 per ruling, and F-14 per ruling. **F-11:** no mid-word break in the H1. **F-18:** a visible "Loading forecast…" and a placeholder sized like the card. **F-02:** reserved space on Today. **F-30:** "Reload forecast" (proposed in the brief). **F-31:** the reassurance line (proposed in the brief). **G-05:** the invite moves under the help choices, outlined. Only if approved in P1 (register finding, not in brief §3): **F-17**, the plan's air line when the levels differ. **F-44** per ruling (both directions). **Design system** per the rulings: solid stale banner, "Reload forecast" inside or beside it, the title-block and banner ring rule, `tabular-nums`; help choices 2 x 2 on phones if approved. |
| Files | `client/src/pages/AppShell.tsx:350-363`: title block, H1 class at `:355` (`text-3xl`); `:375-382`: pass a reload callback to `TodayLead`; `:384-394`: error card (unchanged text); `:396`: `<Loading label="Loading forecast" />`; `:402-417`: pass the verdict level and the forecast state to `DailyPlanSection`, **keeping its `key` at `:405` unchanged**; `:421-441`: move the invite after `HelpChoices` (`:444-448`), with an outlined class instead of `bg-primary` (`:429`). |
| | `client/src/features/today/TodayLead.tsx:31-33`: weather row (F-21); `:34`: padding `p-5 sm:p-8`; `:37`: H2 size; `:47`: `StaleBanner` with the reload button; `:48`: the explanation (F-22: render only in the unknown state). |
| | `client/src/features/air-quality/AirReadout.tsx:39-58` (`StaleBanner`): an optional button **after** the sentence, so the sentence stays word for word; solid fill if approved. `:87`, `:121`: `tabular-nums`. |
| | `client/src/index.css`: the ring rule after line 213 (DESIGN_SYSTEM_PROPOSAL §4.2), if approved. `client/src/features/today/HelpChoices.tsx:55`: 2 x 2 if approved. `client/src/features/air-quality/scene.ts:88-101` (`backdropScene`), for F-44. |
| | `client/src/features/today/AirDetails.tsx` (or `AirReadout.tsx:70-144`): show the moved meaning sentence (F-22). |
| | `client/src/components/States.tsx:6-23` (`Loading`): visible label; a height option sized like the final card. |
| | `client/src/features/daily-plan/DailyPlanSection.tsx:226-235`: heading (`text-2xl` at `:232`); `:237`: the `<output>` is `sr-only` only for the READY message, while the save messages stay visible; `:247-252`: plan error plus the reassurance line when the forecast is ready and not stale; `:258-262`: show `planAirLine` when the plan level differs from the verdict level (F-17); `:263-269`: pass `forYou: null` when the household context is empty (F-14). |
| | F-14 alternatives, owner's choice: gate inside `client/src/features/today/today.ts:56-72` (`topRecommendation`, but that breaks `today.test.ts:77`), or on the server in `server/src/services/recommendations/plan.ts:28-32`. Gating in `DailyPlanSection` is the smallest change. My Home's cards (`client/src/pages/MyHome.tsx:38-42`) get the same gate. |
| Tests to update | `TodayLead.test.tsx:40-42` (pins the meaning sentence on the card), `:68-80` (exact `textContent` of the stale banner: keep the button outside `[data-part="stale-banner"]`'s text or update the expectation). `States.test.tsx:15-21` (`textContent` is exactly "Loading forecast"). `DailyPlanSection.test.tsx:679` (READY text, still passes), `:300`, `:386-390` (plan error). `AppShell.test.tsx:715-741` (Today reading order: still holds), `:1757` (invite after the recommendation: still holds; add "after the help choices"). `today.test.ts:77` only if `topRecommendation` is changed. `scene.test.ts` (stale case) for F-44. |
| Tests to keep passing | `responsive.spec.ts:82-105` (verdict above the bar at 320), `failures.spec.ts:19-55,87-125`, `copy.spec.ts:56-76`, `backdrop.spec.ts:262-285` (title off the city on short landscape phones). |
| Tests to add | `e2e/firstscreen.spec.ts`: TD-01 to TD-09, the first-screen layout-shift check, and PF-07 (one plan POST per visit). `copy.spec.ts`: the unknown-check and plan-error states. Unit tests for TD-10, TD-12, ST-01a, ST-04 and DI-06. |
| Criteria | TD-01 to TD-15, ST-01 to ST-06, DI-01, DI-04 to DI-07, G-05, PF-01 (Today), PF-07, AC-12. |
| Effort | 8.5–11 h (up to 1 h of it for F-44, if "neutral when stale"). |
| Gate | Before: the P1 rulings. After: the measured TD-03 margin is reported, and the owner reviews 320x640 and 390x844 screenshots of every state. |

### P4 Ask AirAware

| Item | Detail |
|---|---|
| Scope | **D6 (owner, 24 Nov):** the AI prompt line "say that live air information is unavailable" (`server/src/services/ai/prompts.ts:57`, also `AI_PROMPTS.md:75`) becomes "say that air information is unavailable", with a new prompt version and its tests. **F-20:** text box first, an intro line, and starters (3 shown, the rest behind "More questions"). **F-04:** scroll the new exchange to the top, with focus via `preventScroll`. **F-34:** "Based on" names the provider only when a forecast was used. Only if approved in P1 (register findings, not in brief §3): **F-33**, "· Not current" on the header time; **F-12**, the input row wraps at large text (Ask page and Today box). **F-02 (Ask):** trace the shift (0.119 at 320; the cause was not traced in Stage 0) and reserve that space from first paint; PF-01 for Ask. The greeting per the P1 ruling. |
| Files | `client/src/pages/Ask.tsx:78-176`: order; `:86` header line; `:112-121` greeting, topics, starters; `:140-173` the form moves to the top; `:153` the row may wrap. `client/src/features/ask/ask.ts:26-37` (`STARTERS`: which 3 show first) and `:39-60` (`ASK_COPY`: intro line, "More questions"). `client/src/features/ask/AskEntry.tsx:82-88` and `:131` (F-34); `:192-194`: scroll, then focus with `preventScroll`, instant under reduced motion. `client/src/features/today/AskBox.tsx:41-58`: the row wraps. `client/src/pages/AppShell.tsx:333-348`: pass what Ask needs for the stale mark (it already gets `updatedAt`, and `now`). |
| Tests to update | `Ask.test.tsx:176` (the question box), `:200` (greeting holds topics and starters), `:219` ("the thread reads oldest first, then the question box": order changes), `:144,162` (header, if F-15 was approved). `AskEntry.test.tsx:81`, `:119-122` (pins "Based on: Live air information unavailable · Model forecast" with no forecast, the exact F-34 defect), `:133`, `:196-200` (focus). |
| Tests to keep passing | `ask.spec.ts:14-62` (Today box to Ask; "A topic chip answers at once"), `keyboard.spec.ts:102-140`, `responsive.spec.ts:111-144,483-516`, `copy.spec.ts:78-147`. |
| Tests to add | `e2e/firstscreen.spec.ts`: AK-01, AK-04, AK-05, AK-10. |
| Criteria | AK-01 to AK-10, DI-05, PF-01 (Ask). |
| Effort | 5–6 h. |
| Gate | The owner confirms the starters reading (§6, conflict C-3). |

### P5 My Home and Better Habits, and one "Why?" label

| Item | Detail |
|---|---|
| Scope | **F-02:** reserve "Today, for your home" from first paint; size Better Habits' loading placeholder like the guides. **F-25:** cards flow on wide screens. **F-23:** "Why?" everywhere. Plus a one-line purpose under each title, and the My Home empty line, per the P1 rulings. **Design system:** control borders `rule` → `text-dark-muted` on `HelpChoices.tsx:66`, `AskBox.tsx:71`, `AskEntry.tsx:25-26`. |
| Files | `client/src/pages/MyHome.tsx:50-54` (`showToday`: also while a build is due), `:72-130` (the section), `:110` (`grid gap-4 md:grid-cols-2`), `:117` (`whyLabel="Why it matters"`). `client/src/features/guides/GuideGroups.tsx:55-80`: `:66` grid, `:78` `whyLabel`. `client/src/pages/BetterHabits.tsx:17-43`: purpose line; `:42` `<Loading label="Loading guides" />` sized like the guides. `client/src/features/daily-plan/DailyPlanSection.tsx:268` (`whyLabel="Why this recommendation?"`). `client/src/features/daily-plan/PlanCard.tsx:15,25` (the default is already "Why?"; remove the overrides). |
| Tests to update | `MyHome.test.tsx:83-99` ("Why it matters" ×4), `:110-120` (no "Today, for your home" without a plan: decide when it is reserved). `GuideGroups.test.tsx:37-40`, `BetterHabits.test.tsx:27-43`, `DailyPlanSection.test.tsx:419-432`, `PlanView.test.tsx:235-239`. E2E-LIVE `journey.spec.ts:179-181` (summary text "Why this recommendation?"). |
| Tests to keep passing | `pages.spec.ts:37-47` (guide headings and axe), `backdrop.spec.ts:44-67`. |
| Tests to add | `e2e/firstscreen.spec.ts`: MH-01, MH-03, BH-02 and layout shift on both pages. |
| Criteria | MH-01 to MH-05, BH-01 to BH-04, CP-06, PF-01. |
| Effort | 4–5 h. |
| Gate | F-23 confirmed. After: owner reviews 1280x720 and 1440x900 screenshots of both pages. |

### P6 My Profile, Welcome, Privacy

| Item | Detail |
|---|---|
| Scope | **F-05:** Delete only with data. **F-06:** Saved plans always shown, with a static empty line. **My Profile:** section order and desktop columns. **F-27:** Welcome step 1 without the header chip, plus a value line. **F-29:** Privacy summary, gloss, header and way back. **F-07:** retention text. **F-43** per ruling. **F-02 (Welcome):** size the "Loading your place" placeholder like the step-1 panel (WIREFRAMES.md §5); WE-03. **Design system:** `disabled:opacity-60` on the outlined `buttonClass` in `HouseholdPreferencesForm.tsx:179` and `SavedPlansList.tsx:37`. |
| Files | `client/src/pages/Profile.tsx:72-150`: order, columns (`:80` `lg:grid-cols-2`), and a "Your data" section. `client/src/features/daily-plan/HouseholdPreferencesForm.tsx:236-252`: the Delete button's visibility; `:160-176`: `deleteEverything` with no session. `client/src/features/daily-plan/SavedPlansList.tsx:15` (`EMPTY`), `:132` (`hidden` returns `null`): render the section with the static line and no request. |
| | `client/src/pages/Welcome.tsx:176-205`: value line on step 1. Welcome owns `step`, but the chip lives in `AppShell.tsx:282-289`, so Welcome must tell the shell when step 1 shows (a callback prop). |
| | `client/src/pages/Privacy.tsx:22-31`: header and "Back to AirAware"; `:40-92`: "In short", the gloss, `:90` retention. `client/src/pages/AppShell.tsx:40-47` (`toSaved`) and `:202-211` (`restore`) only if F-43 becomes "label only". |
| Tests to update | `HouseholdPreferencesForm.test.tsx:315-347` (delete with a session: still holds), `:350-367` (session check fails: keep), `:514-525` ("saving not set up disables the buttons": it also expects a disabled Delete with no session, which becomes absent). `SavedPlansList.test.tsx:78` ("shows nothing and fetches nothing without a session" becomes "shows the empty line and fetches nothing"). `AppShell.test.tsx:2140-2155` (expects no "Saved plans" heading after a delete). `Welcome.test.tsx:90` (step 1), `:170-233` (Remember). `Privacy.test.tsx:8-16`. E2E-LIVE `journey.spec.ts:237-239,248-255` (expects no "Saved plans" heading after a delete). |
| Tests to keep passing | `backdrop.spec.ts:69-80` (Welcome has no text on the scene), `keyboard.spec.ts:190-214`, `onboarding.spec.ts` (live; owner OK). |
| Tests to add | PR-01 (no auth request on any page without Save), PR-02 (geolocation count), MP-04 (order and columns), WE-01. |
| Criteria | MP-01 to MP-05, WE-01 to WE-04, PV-01 to PV-06, PR-01 to PR-06, PF-01 (Welcome). |
| Effort | 5–6 h. |
| Gate | Before: the owner checks whether the cleanup migration `supabase/migrations/20261119180000_cleanup_idle_anonymous.sql` is scheduled in production (F-07), and rules on F-43. After: `security-reviewer` checks every privacy sentence against the code. |

### P7 Landing

| Item | Detail |
|---|---|
| Scope | **F-19:** 7 sections in the brief's order. Hero top-aligned from `lg`, so the search is on the first 1280x720 screen. Search with an explicit submit. A compact mid-page "Check My Air". Tighter spacing. Direction A's panorama (Direction B's hero is P9). |
| Files | `client/src/pages/Landing.tsx:120-310`: sections; `:138`: hero (`lg:min-h-[calc(100dvh-4rem)]` and `items-center`); `:40-61`: `ActionLink` and `AssistantLink`, reused mid-page; `:151-154`: the hero search with a submit control (a landing-only wrapper, so the `LocationSearch` behaviour in Welcome and the place dialog does not change); `:180-196`: the details capture; `:199-222`: example chapters; `:224-280`: "How AirAware works"; `:282-293`: the final call to action. `client/src/pages/landingExamples.ts:33-108`: which examples stay. `client/src/assets/today-phone.jpg` and `client/src/assets/air-details.jpg`: replaced only by real, dated captures (risk §5.3). |
| Tests to update | `Landing.test.tsx:45-58` (expects 2 "Check My Air" links), `:64-78` (7 H2s in today's order), `:80-100`, `:102-160` (chapters), `:164-174` (hero search), `:176-184` (`CHAPTERS` ordinals), `:186-233` (pipeline steps), `:235-249` (hero capture date), `:307-316` (expects 7 revealing sections). `landing.spec.ts:5` (`SECTION = 'Understand your air'` for the reveal test), `:56-63` (step arrows), `:65-90` (details capture size), `:100-119` (hero buttons). |
| Tests to keep passing | `pages.spec.ts:7-20` (axe on `/`), and `/` in `responsive`, `keyboard` and `copy` specs. |
| Criteria | LA-01 to LA-08, CS-13, PF-05, DI-09. |
| Effort | 6–8 h. |
| Gate | The owner picks one: keep the 22 Nov captures (truthful, but they show the pre-redesign UI); recapture from the local build against live Open-Meteo after P3 (one real plan request, with the owner's OK); or recapture from production after the push (one more push). Also (4): the landing skyline itself (spec 2026-11-20 §3 lists the landing as a non-goal). |

### P8 Direction A visual refinements (A only)

| Item | Detail |
|---|---|
| Scope | **Backdrop art direction (owner decision H4, 24 Nov):** tune the three air looks in `CitySkyline.tsx` (`SKY` at lines 25-44, the veils and the building fills) toward the named images in `AirAware_Cityscape_Background_Assets/`, using existing tokens through `color-mix` only, with before/after screenshots and the title-contrast test. A lighter, tonal city replaces the dark silhouettes, so it also settles F-26. No PNG is shipped, and the weather, day/night and stale rules are unchanged. **F-26:** covered by H4 (the earlier plan was `lg:opacity-60` on the near row at `CitySkyline.tsx:244`); height unchanged (22 Nov non-goal). Type scale (the verdict is the largest text), per the type-size ruling. Panel borders and radius per `DESIGN_SYSTEM_PROPOSAL.md` (no token value changes). Current-page marker refinements. (F-44 is built in P3.) |
| Files | `client/src/features/air-quality/CitySkyline.tsx:208-260` (city layers; the near group's opacity at `:244`). `client/src/index.css` (component rules only). `client/src/features/today/TodayLead.tsx:37` (verdict size). |
| Tests to update | `CitySkyline.test.tsx` (`:260` keeps passing; add the `lg:` class check). |
| Tests to keep passing | `backdrop.spec.ts:236-253` (title ≥ 4.5:1 against every sky), `scene.spec.ts`. |
| Criteria | CS-01 to CS-12, AC-10, the design review rows in criteria §11. |
| Effort | 3–4 h. |
| Gate | Before: the owner picks A and approves F-26. After: owner review of 1280x720 and 1440x900 first screens, with the measured near-layer contrast before and after. |

### P9 Direction B (B only)

| Item | Detail |
|---|---|
| Scope | Today's title block and verdict content sit on one dark masthead panel (solid `surface`). The other app pages get a compact masthead (title, plus Ask's "Using:" line). Editorial landing hero, numbered sections, alternating `bg`/`surface` sections. Small uppercase section labels in the app. |
| Files | `client/src/pages/AppShell.tsx:350-382`: the masthead wraps the title block and `TodayLead`, with class `on-dark` so focus rings use `secondary`. `client/src/features/today/TodayLead.tsx:26-53`: dark variant (tag pill `:42`, provenance `:41`, caveat `:50`). `client/src/features/air-quality/AirReadout.tsx:39-58`: banner on dark. `client/src/components/States.tsx:39-72`: `ErrorState` where it replaces the verdict, per the B forecast-error ruling (nested light card, or a dark variant). Panel radius and type sizes per the rulings. Title blocks: `client/src/pages/Ask.tsx:80-102`, `client/src/pages/MyHome.tsx:67-72`, `client/src/pages/BetterHabits.tsx:17-24`, `client/src/pages/Profile.tsx:74-79`, `client/src/pages/Welcome.tsx:176-186`. `client/src/pages/Landing.tsx:120-310`. `client/src/index.css` (no new tokens). |
| Tests to update | `backdrop.spec.ts:116-253`: the title-contrast test measures title text against the sky; on the masthead it must measure against `surface` (DB-06). `backdrop.spec.ts:13-41` (`textOnScene`: the masthead is opaque, so it should pass) and `:262-285`. `responsive.spec.ts:230-295` (forced colours). `TodayLead.test.tsx` (classes). `Landing.test.tsx` (sections, as P7). |
| Tests to add | DB-01 to DB-05 contrast and forced-colour checks on the masthead. |
| Criteria | DB-01 to DB-09, plus every A criterion that is not marked "A only". |
| Effort | 10–14 h. |
| Gate | The owner picks B. After: owner review of every page at 390x844 and 1280x720. |

### P10 Optional design-system cleanup

| Item | Detail |
|---|---|
| Scope | Remove `overflow-x: clip` from `html, body` (`index.css:78-81`); no `CitySkyline` change, because the backdrop root already clips itself (`CitySkyline.tsx:72-73`; DESIGN_SYSTEM_PROPOSAL §8.3). Use `svh` for the landing hero. Optionally add `-webkit-touch-callout: none` on link controls (F-39). |
| Files | `client/src/index.css:78-81`; `client/src/pages/Landing.tsx:138`; the comment in `e2e/layout.ts:79-81`, which assumes the page clips. |
| Tests | Full `responsive.spec.ts` (every size, 200 % text), `backdrop.spec.ts:328-348`, `styles.test.ts`. New e2e assertion: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` on every page and state at 320, 390, 768 and 1280, and at 200 % text. `pastTheEdge` skips anything inside `[data-air]` (`e2e/layout.ts:91-94`), so no decorative element outside `CitySkyline` may carry `data-air` (mockup B's landing horizon now uses `data-part`). |
| Criteria | AC-03, CS-08. |
| Effort | 2–3 h. |
| Gate | Owner OK. It touches a global rule, and an overhang missed by the tests would show as a sideways scroll on phones. |

### P11 Full regression, after-measurement, release

| Item | Detail |
|---|---|
| Scope | **Before the push:** the full local gate; the after-measurement script in local mode at all 5 widths (screenshots in the scratchpad); owner review. **Push:** one push, on the owner's word. **After the push:** the after-measurement script in prod mode, with the owner's OK; it sends one real plan request. Then the stubbed specs with `E2E_BASE_URL` (NF-01 and smoke). Then a real phone check. |
| Files | Docs only: `CHANGELOG.md`, `DESIGN.md`, `ACCESSIBILITY.md`, `USER_GUIDE.md`, `README.md`; `API.md` if F-16 changed; `PRIVACY.md` if F-07 changed. A Stage 5 report in `docs/redesign/`. |
| Criteria | All. Especially RP-01 to RP-07, PF-01 (production confirmation), PF-02, TD-05, AC-13. |
| Effort | 3–4 h. |
| Gate | The owner's push instruction. |

## 4. Tests and strings that pin what the redesign changes

Format: `file:line`. **E2E** specs are stubbed unless marked **(live)**.

| Change | Source | Unit tests | E2E | Docs |
|---|---|---|---|---|
| F-01 save and remember notes | `HouseholdPreferencesForm.tsx:28-29` (`SAVE_NOTE`, also used by Save plan), `:31` (`SAVED`); `DailyPlanSection.tsx:38`; `Welcome.tsx:303` | `HouseholdPreferencesForm.test.tsx:28,34`; `DailyPlanSection.test.tsx:41` | `journey.spec.ts:20` (live) | — |
| F-16 "Live air information unavailable" | `today.ts:47`; `server/…/rules.ts:133` | `today.test.ts:55`; `TodayLead.test.tsx:63`; `AskEntry.test.tsx:119`; fixtures `askFixtures.ts:442`, `planFixtures.ts:238` | `responsive.spec.ts:99` (pattern `unavailable`, still matches) | `API.md:230,279` |
| F-22 meaning sentence | `TodayLead.tsx:48`; text in `today.ts:30` and `:42` | `TodayLead.test.tsx:40-42`; `today.test.ts` (the explanation strings) | — | — |
| F-21 weather row | `TodayLead.tsx:31-33`; `forecast.ts:85-86` | `TodayLead.test.tsx:81-147` (text, not position) | — | Approved in `2026-11-20-cityscape-backdrop-design.md` §5.4 |
| F-24 "Greener habits" | `HelpChoices.tsx:36`; Ask chip `client/src/features/ask/ask.ts:23` | `HelpChoices.test.tsx:22`; `client/src/features/ask/ask.test.ts:33` | — | `USER_GUIDE.md:26,63`; `README.md:60` |
| F-32 "updated" | `TodayLead.tsx:21-24,45`; `planDisplay.ts:153`; `AskEntry.tsx:82-88`; `Ask.tsx:86`; `Landing.tsx:184` | `TodayLead.test.tsx:51`; `planDisplay.test.ts:123`; `DailyPlanSection.test.tsx:141,152`; `AppShell.test.tsx:1248,1274`; `AskEntry.test.tsx:81,122,133`; `Ask.test.tsx:144`; `Landing.test.tsx:16` | — | — |
| F-15 "of 10 answers" | `Ask.tsx:86` | `Ask.test.tsx:144,162` | — | — |
| F-40 negated "clean air" | `server/…/rules.ts:222` | `server/…/rules.test.ts:365-376` (banned list lacks "clean air") | No fixture reaches this rule | Rules spec |
| F-41 "not the CPCB AQI" | `PlanView.tsx:14` | `PlanView.test.tsx:14` | None (add to `copy.spec.ts`) | — |
| F-43 Remember storage | `AppShell.tsx:40-47` (`toSaved`), `:202-211` (`restore` relies on the coordinates) | `AppShell.test.tsx` Remember tests (`:1631`, `:1668`); `Privacy.test.tsx:15` | `onboarding.spec.ts:57` (live) | `Privacy.tsx:78`; `CHANGELOG.md:120` |
| F-44 stale backdrop | `scene.ts:88-101` | `scene.test.ts` | `backdrop.spec.ts` | Two pack docs disagree |
| F-14 "For you" | `PlanCard.tsx:49-54`; `today.ts:56-72`; `MyHome.tsx:38-42`; server `plan.ts:28-32` | `today.test.ts:77` (if gated there); `PlanView.test.tsx:88` (keep) | `failures.spec.ts:87-107` (keep: "Your day" keeps "For you") | — |
| F-23 one "Why?" label | `DailyPlanSection.tsx:268`; `MyHome.tsx:117`; `GuideGroups.tsx:78`; `PlanCard.tsx:15,25` | `DailyPlanSection.test.tsx:419-432`; `PlanView.test.tsx:235-239`; `GuideGroups.test.tsx:37-40`; `BetterHabits.test.tsx:27-43`; `MyHome.test.tsx:83-99` | `journey.spec.ts:179-181` (live) | — |
| F-07 retention | `Privacy.tsx:90` | `Privacy.test.tsx` | — | `PRIVACY.md`, `DATABASE.md` |
| F-35 search messages | `LocationSearch.tsx:52,57-64` | `LocationSearch.test.tsx:162,179-181` (a 429 keeps its message) | — | — |
| F-10 chip label | `PlaceChip.tsx:39,41,44` | `PlaceChip.test.tsx:33,55-59`; `AppShell.test.tsx:186` | `responsive.spec.ts:209,340-346`; `keyboard.spec.ts:185-187` (name pattern, still matches) | — |
| F-13 focus order | `AppShell.tsx:275-289` | — | `keyboard.spec.ts:94-96` (relative, still holds); no test pins the new order yet | — |
| F-28 logo | `AppShell.tsx:275-280` | none | none | — |
| F-09 unknown app page | `navigation.ts:33-36` | `navigation.test.tsx:21` | — | — |
| F-08 404 page | new `client/public/404.html`; `server/src/app.ts:148-152` | `server/src/app.test.ts:84-91` (JSON 404 for `/nope`) | — | — |
| F-12 header and input at 200 % | `AppShell.tsx:274`; `Ask.tsx:153`; `AskBox.tsx:41` | — | `responsive.spec.ts:107-192` (keep); `:216-223,318-323` (one nav row at normal text: keep) | — |
| F-38 safe areas, bar height | `AppNav.tsx:42-43`; `CitySkyline.tsx:76`; `AppShell.tsx:495`; `index.css:122-126` | `styles.test.ts:69-74` | — | — |
| F-18 loading label | `States.tsx:13` (`sr-only`); `AppShell.tsx:396` | `States.test.tsx:15-21` | — | — |
| F-30 Reload forecast | `AirReadout.tsx:39-58`; `TodayLead.tsx:47` | `TodayLead.test.tsx:68-80` (exact banner `textContent`) | `failures.spec.ts:47-49`; `copy.spec.ts:60`; `responsive.spec.ts:442` (substring or `^Not current:`: still match) | — |
| F-31 reassurance | `DailyPlanSection.tsx:247-252` | `DailyPlanSection.test.tsx:300,386-390`; `AppShell.test.tsx:2062` | `failures.spec.ts:118-123` | — |
| "Your plan is ready." screen-reader-only | `DailyPlanSection.tsx:36,237` (the same `<output>` shows save messages) | `DailyPlanSection.test.tsx:679` | — | — |
| Invite position and style | `AppShell.tsx:421-441` | `AppShell.test.tsx:1736,1750,1757,1768,1857` | — | — |
| Today reading order | `AppShell.tsx:349-469` | `AppShell.test.tsx:715-741` (verdict, recommendation, help, ask, details) | `responsive.spec.ts:82-105` | — |
| H1 size | `AppShell.tsx:355` | — | `backdrop.spec.ts:262-285` | — |
| F-20 Ask order | `Ask.tsx:112-173` | `Ask.test.tsx:176,200,219` | `ask.spec.ts:49-59` (topic chip answers at once) | `USER_GUIDE.md:63` |
| F-04 Ask scroll and focus | `AskEntry.tsx:192-194` | `AskEntry.test.tsx:196-200` | — | — |
| F-34 "Based on" | `AskEntry.tsx:82-88,131` | `AskEntry.test.tsx:81,119-122,133` | `copy.spec.ts:78-98` | — |
| F-05 Delete visibility | `HouseholdPreferencesForm.tsx:236-252,160-176` | `HouseholdPreferencesForm.test.tsx:315-347,350-367,514-525`; `AppShell.test.tsx:2086,2148` | `journey.spec.ts:91` (live) | `Privacy.tsx:87` |
| F-06 Saved plans always shown | `SavedPlansList.tsx:15,132` | `SavedPlansList.test.tsx:78`; `AppShell.test.tsx:2140-2155` | `journey.spec.ts:237-239,248-255` (live) | — |
| F-27 Welcome step 1 | `Welcome.tsx:176-205`; `AppShell.tsx:282-289` | `Welcome.test.tsx:90` | `backdrop.spec.ts:69-80`; `keyboard.spec.ts:190-214` | — |
| F-29 Privacy | `Privacy.tsx:22-31,40-92` | `Privacy.test.tsx:8-16` | `pages.spec.ts:7-20`; `keyboard.spec.ts` (`/privacy`) | — |
| F-19 Landing | `Landing.tsx:120-310`; `landingExamples.ts:33-108` | `Landing.test.tsx:45-58,64-78,80-100,102-160,164-174,176-184,186-233,235-249,307-316` | `landing.spec.ts:5,29-39,56-63,65-90,100-119` | — |
| F-02 My Home reserve | `MyHome.tsx:50-54` | `MyHome.test.tsx:110-120` | — | — |
| F-25 grids | `MyHome.tsx:110`; `GuideGroups.tsx:66` | — | — | — |
| Direction B masthead | `AppShell.tsx:350-382`; `TodayLead.tsx:26-53` | `TodayLead.test.tsx` | `backdrop.spec.ts:116-253` (title contrast against the sky) | — |

## 5. Risks and mitigations

### 5.1 APIs and rate limits

| Risk | Mitigation |
|---|---|
| **Extra plan requests.** Today builds a plan on load. Plans, Ask and plan saves share 10 requests a minute per address (`server/src/app.ts:107`), and the API allows 60 a minute overall (`:74`). Anything that remounts `DailyPlanSection` sends a new plan POST: its `key` at `AppShell.tsx:405` includes the place, the forecast key and `resets`. Moving it, wrapping it differently between pages, or changing that key would rebuild the plan. | Keep the component mounted and its key unchanged (P3). Add PF-07: one plan POST per visit across Today and My Home, counted in an e2e request log. The plan rebuild still happens hourly or when the answers change (`DailyPlanSection.tsx:183-190`). |
| **"Reload forecast" taps.** Each tap is a forecast GET counted against the 60-a-minute limit. | Disable the button while loading (ST-01a). It reuses `forecast.retry()`, so the hourly reload logic (`AppShell.tsx:136-149`) is unchanged. |
| **Measurement traffic.** Stage 0's prod mode let one real plan request through and made about 82 API calls. | Local mode for all gates; prod mode only after the push, with the owner's OK, once. |
| **e2e and the limits.** One worker keeps the suite under 10 plans a minute (`e2e/playwright.config.ts`). `pages.spec.ts` waits out a 429 on the guides. | Keep new specs stubbed (`stub()` in `e2e/layout.ts`), so they spend no shared limit. |
| **Verdict and recommendation can disagree** (F-17): the plan fetches its own forecast (`server/src/services/recommendations/dailyPlan.ts`), and per-instance caches on Netlify can differ. | If approved in P1, DI-06: when the levels differ, the card shows the plan's own air line. No new request. |

### 5.2 Privacy

| Risk | Mitigation |
|---|---|
| **Save copy promises the wrong storage** (F-01). It is the only P2 privacy finding. | Fix in P1, the first code phase, if approved. The new strings state only facts already on the Privacy page; `security-reviewer` checks them. |
| **Anonymous accounts created by accident.** New empty states (My Profile with no session, MP-02) or the Delete visibility check (MP-01) could call `tokenForSave()` instead of `currentToken()`. | PR-01: an e2e check that no page creates an auth request without Save or Remember. Unit tests keep `tokenForSave` uncalled (the pattern at `HouseholdPreferencesForm.test.tsx:191-196`). |
| **Shared Supabase project** (F-42). Local runs and `journey.spec.ts` create and delete real anonymous accounts in the production project. | Run only stubbed specs per phase. Run the live journey once, in P11, with the owner's OK, or after a separate development project exists (the owner's decision). |
| **F-43 "label only"** would make a remembered place need a geocoding call on every return (`restore`, `AppShell.tsx:202-211`, uses the saved coordinates). | If the owner picks "label only", treat it as a behaviour change with its own tests, not a copy change. Otherwise document the current choice (label plus 2-decimal coordinates, about 1 km) on the Privacy page (already at `Privacy.tsx:78`). |
| **Retention claim** (F-07). | Change nothing until the owner checks the production database. |

### 5.3 Data provenance

| Risk | Mitigation |
|---|---|
| **Labels lost in layout work.** Moving the weather row (F-21) or the meaning sentence (F-22) could separate the provenance from the verdict. | DI-01 and CP-01 grep checks; the provenance line stays directly under the H2 in every state. |
| **Stale state softened.** The amber banner must stay directly under the provenance, word for word. | Put the reload button outside the sentence (ST-01a). `TodayLead.test.tsx:68-80` keeps pinning the exact text. |
| **States merged.** A shared "error" layout could put a verdict on the forecast-error card, or drop "No data" in the unknown state. | One e2e test per state that asserts what is absent (§3 of the criteria). |
| **Reassurance line when it is not true** (F-31). | Show "The forecast above is still up to date." only when the forecast is ready and not stale (ST-04). |
| **"For you" gating** (F-14) could hide real personal lines. | Gate only on an empty household context; "Your day" keeps its lines (`failures.spec.ts:87-107`). |
| **Landing captures.** Recapturing from a fixture build would show fixture values as real (DI-09). | Only real captures, dated, labelled "past"; `width`/`height` must equal the file at 2x (`landing.spec.ts:89`). Keeping the 22 Nov captures is truthful; they just show the old UI. |
| **Ask claims a forecast it did not use** (F-34), pinned today by `AskEntry.test.tsx:119`. | Fix in P4 and invert that test. |

### 5.4 Accessibility

| Risk | Mitigation |
|---|---|
| **Desktop focus order after F-13.** If the chip moves before the nav in the DOM but `md:order-*` draws it at the right end, desktop Tab order goes logo, chip (far right), then the nav. That moves the WCAG 2.4.3 mismatch from phones to desktop. | Owner picks one: (a) on desktop too, draw the chip right after the logo, so the visual order matches the DOM; or (b) accept and document the desktop jump. SH-06 tests whichever is picked. |
| **Current-page marker contrast.** The filled pill (`elevated` on `bg`) is 1.25:1 (computed from the tokens), so the bold label and the teal icon carry the state. | SH-03 adds a forced-colours check; the design system proposal may add a border or underline that reaches 3:1. |
| **Bottom bar height.** `max(0.75rem, env(…))` adds 12 px where the inset is 0. That moves the bar top from 787 to about 775 at 390x844 and costs TD-03 its margin. | Keep the total at 57 px (inner links 44 px, still ≥ 44 px), or accept and re-measure (SH-01). |
| **Direction B contrast.** On the masthead, `focus` (#1f6fd6) is only 3.52:1 on `surface`. The tag pill (`text-dark` border) and the stale banner (`text-dark` text) were designed for light panels. | `.on-dark` on the masthead (focus rings become `secondary`, 7.08:1); DB-02 to DB-05; rewrite the title-contrast e2e (DB-06). |
| **Reduced motion.** The new Ask scroll (F-04) and any new transitions. | Instant under `prefers-reduced-motion: reduce` (AK-05); the global rule at `index.css:215-224` caps durations. |
| **Forced colours.** The backdrop steps aside today. Direction B's masthead and any new outlined button must keep visible edges. | AC-08, DB-05. |
| **"Your plan is ready." hidden.** Making it screen-reader-only must not hide the save messages that share its `<output>` (`DailyPlanSection.tsx:237`). | TD-10 tests both. |

### 5.5 Tests

| Risk | Mitigation |
|---|---|
| **Copy strings pinned in many places** (§4). An approved change missed in one test fails late; a test updated without approval ships unapproved copy. | P1 updates every pinned line for approved rows in one commit; the GREP check in CP-02 proves the old string is gone. |
| **Order and layout tests that encode today's design:** `Landing.test.tsx:64-78,307-316`; `Ask.test.tsx:219`; `SavedPlansList.test.tsx:78`; `MyHome.test.tsx:110-120`; `responsive.spec.ts:209`. | Each is listed against its phase (§3). Change it in the same commit as the code, with the reason in the commit message. |
| **Live specs pin copy too:** `journey.spec.ts:20,179-181,237-239,248-255`. They only run with the owner's OK. | Update them in the same phase anyway, and note that they were not run. |
| **No e2e at 390x844 or 1440x900** today. | `e2e/firstscreen.spec.ts` (new) sets 390x844 and 1280x720 explicitly; 1440 comes from the after-measurement script. |
| **Re-running the Stage 0 capture** would overwrite the "before" screenshots. | Use only `docs/redesign/evidence/capture-after.mjs` (new) with output in the scratchpad (P0). |
| **The 404 page can't be tested locally**: Express returns JSON (`app.ts:148-152`, pinned by `app.test.ts:84-91`). | Test on Netlify with `E2E_BASE_URL` after the push, or take the server option in P2. |

### 5.6 Deployment and repository

| Risk | Mitigation |
|---|---|
| **10 MB limit.** `docs/redesign/` is wholly untracked and holds 8.8 MB of audit screenshots (157 JPEGs). One `git add docs/redesign` would commit them. The pack is untracked too. | Stage by name; the `.gitignore` line from P0; RP-02 and RP-03 after every phase. The repository is 1.80 MiB packed today. |
| **Landing capture replacements** add history even when the old files are deleted. | At most one replacement of each of the two captures (about 220 kB together). |
| **Push cost and risk.** About 15 Netlify credits per push; production is shared by real users. | One push after all approved phases (the owner's standing instruction). After the push: CAP-PROD and a smoke run, then a rollback plan (`git revert` of the phase commits, one more push) if a gate fails in production. |
| **One-branch rule.** | All work on `main`; no feature branches pushed (RP-01). |
| **CSP.** The 404 page and any landing change must not add inline scripts or third-party requests (`client/public/_headers`: `script-src 'self'`, `connect-src 'self'` plus the Supabase host). | NF-02 grep; PF-06 request counts. |

## 6. Conflicts with the brief, and open questions

### Conflicts (the code wins)

| ID | Brief says | Code says | Proposed handling |
|---|---|---|---|
| C-1 | Today wireframe (§7): invite "[Tailor this to your household] (outlined)" | Shipped text "Make it personal: 2 quick questions" (`AppShell.tsx:431`); not in the §8 table | Keep the shipped text; add a copy row only if the owner wants it. |
| C-2 | §3: chip shows the text before the first comma | Desktop wireframe (§7) shows "Pune, Maharashtra" in full at 1280; `responsive.spec.ts:340-346` pins "Mumbai, Maharashtra" whole at 1280 | Short label below `lg`, full name from `lg` (owner to confirm). |
| C-3 | §3 Ask: "3 starter questions for the chosen topic" | `STARTERS` holds 5 questions, one per topic (`client/src/features/ask/ask.ts:26-37`); topic chips answer at once (`Ask.tsx:73-74`, pinned by `ask.spec.ts:49-59` and `Ask.test.tsx:187`) | Keep chips as they are; show 3 of the 5 starters with "More questions" for the other 2. Topic-specific starters would need new copy. |
| C-4 | §3: no-place chip label "Choose place" | Shipped "Choose a place" (`PlaceChip.tsx:39,44`); not in §8 | Treated as a copy row needing OK (P1). |
| C-5 | §8 lists the copy proposals | F-41 (`PlanView.tsx:14`, "not the CPCB AQI") and F-23 ("Why?") change shipped text but are not in §8 | Added to the P1 decision round. |
| C-6 | §3: "Your plan is ready." becomes screen-reader-only | The same `<output>` shows the save results (`DailyPlanSection.tsx:237`) | Hide only the READY message (TD-10). |
| C-7 | §3: F-22 "drop it, it restates the H2" | For "above", the sentence also names which particle is above (`today.ts:40-42`) | If dropped from the card, it must stay in "Air quality details", where the readout shows the per-pollutant check. |
| C-8 | Pack 10: "Unknown/stale/loading use neutral visuals" | The build and the owner-approved backdrop spec keep the last-known look when stale (`scene.ts:88-101`) | Pending F-44; not a pass or fail until ruled (CS-04). |
| C-9 | §3 state (c): the recommendation comes "from rules with 'Made by our rules'" when the 24-hour check is unknown | The server calls the AI writers whatever the air level (`server/src/services/recommendations/dailyPlan.ts:162-164`), so the card can say "Made with AI" | ST-03 accepts either line. Forcing rules-only here would be a server behaviour change needing the owner's OK. |
| C-10 | Brief §3 does not mention F-17, F-33, F-12 or F-39 | They are Stage 0 register findings that this outline would fix | Added to the P1 decision round as proposals; their criteria (DI-06, AK-08, SH-07, AK-10) apply only if approved. |

### Open questions for the owner

1. The P1 copy table: each row keep or change.
2. The desktop chip position (§5.4): chip after the logo, or accept the desktop Tab jump.
3. The bottom bar's padding: keep 57 px in total, or add 12 px.
4. Testing the 404 page: Netlify only, or change the local server.
5. The landing captures: keep, recapture locally against live data, or recapture from production.
6. F-14 gating: client only (smallest), or also on the server.
7. F-07: is the cleanup job scheduled on the production Supabase project?
8. A separate development Supabase project (F-42), or one approved live journey run in P11.
9. Direction A or B.

## 7. Out of scope (not in the brief)

| Item | Why deferred | When to add |
|---|---|---|
| F-36 social preview tags, touch icon, manifest | Not part of the redesign brief | A separate small change with its own image asset (repository size). |
| F-37 route splitting (`React.lazy`) | Effect not measured; changes the bundle structure | After a throttled measurement shows a real gain. |
| `ForecastChart.tsx:174` "At load" marker and `ForecastPanel.tsx:16` "Not assessed" with no reason | Inside the closed details; not in the brief | With the next details pass. |
