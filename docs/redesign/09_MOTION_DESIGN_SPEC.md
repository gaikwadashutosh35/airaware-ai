# 09 · Motion design spec

**Status:** read-only proposal, 28 Nov 2026. Nothing here is built, and every RECOMMENDED row needs an owner decision. That includes new CSS-only motion, because the current design system says "No new animation" (`docs/redesign/DESIGN_SYSTEM_PROPOSAL.md:394`, `docs/redesign/DESIGN_CONCEPTS.md:69`).

**Labels used in this doc**

| Label | Meaning |
|---|---|
| **OBSERVED (code)** | Read in the local working tree (commit b0c4278, 28 Nov). Cited as `file:line`. |
| **OBSERVED (live)** | Measured on https://airaware-ai.netlify.app on 28 Nov 2026. The probe was one headless Chromium run with 3 page loads: Landing at 1440, and Today for Pune at 390×844 and 1440×900. Script: `C:/Users/Ashutosh/AppData/Local/Temp/claude/5f56e6022b99d9b4/526cd9ef-a7c8-4b28-b2da-f59162db31c3/scratchpad/redesign/motion-probe.mjs`. Output: `.../scratchpad/redesign/motion-probe.json` in the same folder. The live site serves `index-Dg6rzCu3.js`. Local `main` is 25 commits ahead of `origin/main`, so live and local can differ. |
| **RECOMMENDED** | A proposal. It is not built. |
| **UNVERIFIED** | General knowledge or browser support that was not checked this session. |

**Skills used:** `emil-design-eng` (SKILL.md), `review-animations` (SKILL.md and STANDARDS.md) and `animation-performance` (SKILL.md). All were read from `C:/Users/Ashutosh/.claude/skills/` and none was run as a tool. `animate` and `improve-animations` were not read.

**CSS snippets:** none of the snippets in this doc has been checked against `modern-web-guidance`. Its `npx` package is not installed, so it could not run in this read-only phase (`03_SKILL_DISCOVERY_AND_SELECTION.md`, ruling 2).

---

## 0. Summary

1. **Today's motion is small and CSS-only, and it stops (OBSERVED).**
   - **At rest:** six seconds after Today loads, the only CSS animations still running are loading pulses.
   - **Not covered by that check:** the J18 cycling hint types through `setTimeout` and React state. `document.getAnimations()` cannot see it, so it needs its own test.
   - **Reduced motion:** with `prefers-reduced-motion: reduce` emulated, `document.getAnimations()` returns an empty list on Today at both widths (live).
2. **Recommendation: stay CSS-only.**
   - **Why:** this follows D5 (`docs/UX_AUDIT.md:393`), G-04 (`REDESIGN_ACCEPTANCE_CRITERIA.md:59`) and doc 08 (`08_COMPONENT_LIBRARY_DECISIONS.md` §3.7).
   - **What is proposed:** three recommended CSS changes (C2, C5, C13), four optional ones (C1, C8, C9, C11) and one conditional one (C7). None of them needs a package.
3. **Motion for React, GSAP, React Bits / Magic UI and Rive / Lottie: none now.** §3.2–3.5 give each one's flip condition.
4. **Three existing motions break this brief's own rules (OBSERVED).** §2 lists them as exceptions, and each comes with options:
   - **the air-look fade** animates paint properties, not transform or opacity;
   - **the skeleton pulse** runs forever while loading;
   - **the cycling hint** loops on Today, which J18 approved.
5. **One small inconsistency (OBSERVED, live).** On the Landing CTAs, the Tailwind `transition duration-150` utility overrides the shared 120 ms press timing.

---

## 1. Rules every animation here follows

| # | Rule | Source |
|---|---|---|
| 1 | **Frequency.** An action seen tens of times a day gets little or no motion, and a keyboard action gets none. Occasional actions (a dialog) get standard motion. | `emil-design-eng` "Should this animate at all?"; `review-animations` standard 2 |
| 2 | **Purpose.** Every animation must name one job: feedback, state change, spatial continuity, or preventing a jarring change. "Looks nice" fails. | `review-animations` standard 1; `DESIGN.md:160` |
| 3 | **Properties.** Animate `transform` and `opacity` only, and never use `transition: all`. | Brief; `animation-performance` hard rules 1 and 4 |
| 4 | **Timing.** UI motion stays under 300 ms. Entering motion uses a strong ease-out, `cubic-bezier(0.23, 1, 0.32, 1)`, the curve the app already uses (`index.css:183`). Never use ease-in. Exits are faster than entries. | `review-animations` STANDARDS "Easing", "Duration", "Asymmetric timing" |
| 5 | **Entrances.** Never start at `scale(0)`. Start from `scale(0.95–0.97)` with opacity 0. Modals stay centred. | STANDARDS "Physicality" |
| 6 | **Interruption.** Use transitions, not keyframes, for anything that can be triggered again mid-way. | STANDARDS "Interruptibility" |
| 7 | **Hover.** Hover motion only where the device has a real pointer. Tailwind v4's `hover:` already does this: the local build CSS contains `@media (hover:hover)` (`client/dist/assets/index-DJfP1i95.css`, build date unknown). | STANDARDS "Accessibility" |
| 8 | **Reduced motion means zero motion in this app.** The global cap (`index.css:270-284`) shortens every animation and transition to 0.01 ms, and a pressed button fades to 80 % instead of shrinking. The skills say "gentler, not zero". This project chose zero, and this doc keeps that choice rather than contradicting it quietly. | `DESIGN.md:164,169-170`; `emil-design-eng` "prefers-reduced-motion" |
| 9 | **Decorative motion stops within 5 s.** It plays only on a place's first draw, never on a page change or the hourly reload. | `DESIGN.md:175-178`; cityscape brief-finish §3 anti-goals (`docs/superpowers/specs/2026-11-22-cityscape-brief-finish-design.md:47`) |
| 10 | **Motion never carries data.** It never animates the verdict or any figure: no count-ups, no chart line that draws itself, no "live" pulse. A model forecast must never look like a live measurement. | `DESIGN_SYSTEM_PROPOSAL.md:389`; AGENTS.md §5-6; cityscape spec §5.2 ("no … pulsing warning effects") |
| 11 | **No continuous motion on data screens** (Today, Ask, My Home, Better Habits, My Profile). Loading pulses and the J18 hint are the only exceptions, and both are in §2. | Brief; `DESIGN.md:162` |
| 12 | **Focus and reading never wait for an animation.** Focus moves at once, and scrolling is instant (AK-05). | `AskEntry.tsx:297-299`; `REDESIGN_ACCEPTANCE_CRITERIA.md:96` |

---

## 2. What exists today (OBSERVED)

| ID | Motion | Where | Properties | Duration and easing | Trigger | Under reduced motion | Live evidence | Meets this brief? |
|---|---|---|---|---|---|---|---|---|
| E1 | Press shrink | `index.css:180-189` | `transform: scale(0.97)` | 120 ms, `cubic-bezier(0.23,1,0.32,1)` | `:active` on enabled buttons and `.press` links | Fades to 80 % opacity (`index.css:279-283`) | Computed on `nav a` and buttons: `transform 0.12s cubic-bezier(0.23, 1, 0.32, 1)` | Yes |
| E2 | Landing CTA press and hover | `Landing.tsx:53,65` (`press … transition duration-150 hover:bg-*`) | Tailwind's `transition` list: colours, opacity, box-shadow, transform and others | 150 ms, `cubic-bezier(0.4, 0, 0.2, 1)` | Hover and `:active` | Cap makes it instant | Computed on `a.press`: `0.15s cubic-bezier(0.4, 0, 0.2, 1)` over about 20 properties | **Partly.** The utility layer beats the base `.press` rule, so these two links don't follow DESIGN.md §9's 120 ms curve. See C2 |
| E3 | Ask answer rises in | `index.css:191-204`; `AskEntry.tsx:334` | opacity, `translate: 0 8px` | 200 ms, same curve, `@starting-style` | A new exchange is added | None | Not observed (no question was typed) | Yes |
| E4 | Landing sections reveal | `index.css:206-225`; `Landing.tsx:46` | opacity, `translate: 0 8px` | Scroll-driven, `view()`, entry 0 to 120 px | Section scrolls into view | None (only defined under `no-preference`) | 6 `reveal` animations on scroll timelines | Yes. Note: full-page headless captures show sections blank because of this (live-capture digest). Cross-doc: docs 05 and 14 R7 propose dropping `.reveal`, while 11 L9 asks to confirm a real user effect first. Owner call; this doc has no motion reason to remove it |
| E5 | Clouds settle | `index.css:59-69`; `CitySkyline.tsx:221` | `translateX(-16px → 0)` | 4.8 s, strong ease-out, once | A place's forecast first drawn | Still (`motion-safe:`) | `cloud-drift` running at 1 s, `finished` at 6 s (390 and 1440) | Yes, within the 5 s rule |
| E6 | Rain falls | `index.css:45-57`; `CitySkyline.tsx:301-310` | `translate(-12px, 32px)` loop | 0.8 s × 6, linear | First draw. The layer stays mounted and hidden when dry | Still | `rain-fall` running at 1 s **on the invisible layer** (dry hour), gone by 6 s | Yes. It plays while invisible, which the comment at `:301-306` intends. Cost: one small transform for 4.8 s |
| E7 | Air look fades | `CitySkyline.tsx:71-74`; brief-finish §5.2 | **`stop-color`, `fill`, `background-color`**, opacity | 700 ms, Tailwind `ease-out` = `cubic-bezier(0, 0, 0.2, 1)` | A same-place reload brings a different level | Instant | Computed on the sky `stop` and `veil-far`: `stop-color, opacity, background-color, fill 0.7s cubic-bezier(0, 0, 0.2, 1)` | **Exception.** Three of the four properties are paint-tier (`animation-performance` "What You Animate"). It is rare (at most hourly) and short. See C7 |
| E8 | Skeleton pulse | `States.tsx:4-5`; `TodayLead.tsx:9`; `AskEntry.tsx:362-365` | opacity (Tailwind `animate-pulse`) | 2 s, infinite | While a section loads | `motion-reduce:animate-none` | 3 `pulse` animations still running at 6 s on Today. Inferred, not recorded: they were the plan still loading. The probe logged class names only, not which section, whether visible, or whether they cleared | **Exception.** Continuous on a data screen until the content lands. Copies inside a `[hidden]` (display: none) Today don't run (UNVERIFIED spec behaviour, not probed on Ask). See C8 |
| E9 | Cycling hint | `CyclingHint.tsx:4-6,56-70,76` | Text typed through React state; opacity fade | 35 ms per character, 1.6 s hold, 300 ms fade, loops | Empty, unfocused Ask box before the first question | Still (first starter) | Not measured | **Exception, owner-approved (J18).** Loops on Today and updates state every 35 ms while typing. Pauses on hidden tabs (`:16,26-28`). See C9 |
| E10 | Disclosures (`<details>`) | `DailyPlanSection.tsx:312`; `AirDetails.tsx:11`; 7 sites | None | Instant **by decision** ("opened often, so no animation") | Click or keyboard | n/a | `summary` computed `transition-duration: 0s` | Yes |
| E11 | Place dialog | `PlaceChip.tsx:28-33,58-67` | None | Instant (native `showModal`, `backdrop:bg-bg/60`) | Place chip | n/a | Not opened | Yes (no motion) |
| E12 | Hover colours | e.g. `AskEntry.tsx:131`, `HelpChoices.tsx:28`, `LocationSearch.tsx:211` | colour, border | Instant (no transition) | Pointer hover only | n/a | n/a | Yes |
| E13 | Scroll to a new answer | `AskEntry.tsx:297-299,318` | n/a | Instant `scrollIntoView` and `focus({preventScroll:true})` | New exchange | n/a | n/a | Yes (AK-05) |
| E14 | Global reduced-motion cap | `index.css:270-284` | All | 0.01 ms, 1 iteration | `prefers-reduced-motion: reduce` | — | `getAnimations()` = `[]` on Today at 390 and 1440 with `reduce` emulated; cloud `animation-name: none` | Yes |

**Related fact (OBSERVED, live).** 13 elements carry `backdrop-filter` (J22 `card-surface`), and 10 of them are laid out on Today.

- **What the probe measured:** the sum of their bounding boxes over the whole page, with nested cards counted twice. That is about 1.43 million px at 390×844 and about 2.15 million px at 1440×900.
- **What the browser actually re-blurs:** only the part on screen. So the work per frame is bounded by roughly one viewport (329,160 px at 390, 1,296,000 px at 1440), plus overlap where cards nest.
- **Cost per frame:** not measured.

Any visible blurred card still re-blurs whenever the pixels behind it change. That is why motion behind the cards must stay short (`animation-performance` "Blur"; and see doc 10 §6).

---

## 3. Proposed animations

Every row has a status:

| Status | Meaning |
|---|---|
| **Keep** | Already right. Do nothing. |
| **REC** | Recommended. Needs an owner decision. |
| **Optional** | Owner's choice. Either way is fine. |
| **Cond.** | Only if a device recording shows a problem. |
| **No** | Not recommended. |

**Columns:** Duration is the enter duration, with the exit after a slash. Easing names are the curves in rule 4: *strong-out* = `cubic-bezier(0.23,1,0.32,1)`, *drawer* = `cubic-bezier(0.32,0.72,0,1)`.

### 3.1 CSS (the whole recommended set; no dependency)

| ID | Animation | Purpose | Trigger | Duration | Easing | Reduced motion | Perf risk | Status | Test churn and notes |
|---|---|---|---|---|---|---|---|---|---|
| C1 | **Motion tokens** in `@theme`: `--ease-out` (strong-out), `--ease-drawer`, and the durations 120, 160, 200 and 700 ms | One source for the curve, which is repeated at `index.css:183,195-196,61`. The air fade uses Tailwind's weaker `ease-out` instead | n/a | n/a | n/a | n/a | None | Optional; do it only if C2, C5, C11 or C13 is approved | `styles.test.ts:80` matches the literal curve string |
| C2 | **Landing CTA press**: remove `transition duration-150` from `Landing.tsx:53,65` so `.press` controls the press (120 ms, strong-out). Hover then changes colour instantly, as everywhere else in the app (E12) | Feedback, made consistent with DESIGN.md §9 | `:active` | 120 ms | strong-out | 80 % opacity (existing) | None | **REC** (smallest fix) | Check `Landing.test.tsx` for class assertions. Alternative if the owner wants the hover fade kept: `transition: background-color 150ms ease, transform 120ms var(--ease-out)` |
| C3 | Hover and pressed on tiles, chips and nav | Feedback | Hover, `:active` | Hover instant; press E1 | — | E1 | None | **Keep** | Tens of times a day, so it is not animated further (rule 1) |
| C4 | Disclosures (`Why?`, "See your full day", "Air quality details", "More topics", "Sources and limitations") | — | — | Instant | — | — | — | **Keep** | Recorded decision (`DailyPlanSection.tsx:312`, `AirDetails.tsx:11`). A height animation would also break rule 3 |
| C5 | **Place dialog in and out**: the panel goes from opacity 0 and `scale(0.97)` to 1 and `scale(1)`, and the backdrop from opacity 0 to 1. Exit is faster. Built with `@starting-style` plus `transition-behavior: allow-discrete` on `display` and `overlay` | Stops the dialog popping over the page; it is used occasionally | `showModal()` / `close()` | 180 ms / 120 ms | strong-out | Instant (cap) | Low: a small box plus one full-screen opacity layer. Focus is not delayed, because `showModal` focuses at once | **REC** | Browser support for animating `overlay` and `display` is UNVERIFIED. Browsers without it show the dialog at once. `PlaceChip.test.tsx` is unaffected (jsdom). Origin stays centred (modal exemption) |
| C6 | Prompt selection (starter chips on Ask and Today) | Feedback, then continuity | Chip press | E1, then E3 | — | — | — | **Keep** | A chip sends at once (`Ask.tsx:180-193` `onStarter`). Press plus answer-rise already covers it |
| C7 | **Air-look fade, composite-only**: stack one sky and veil layer per look and crossfade their opacity, instead of transitioning `stop-color` and `fill` | Rule 3 | Same-place level change | 700 ms | strong-out | Instant | Today: expected (not measured) up to 700 ms of full-screen repaint, at most once an hour. After the change: two more full-screen layers kept mounted | **Cond.** Only if a recording on a mid-range Android shows dropped frames during the fade. No jank has been measured | `CitySkyline.test.tsx:276-294` (asserts the transition classes); DESIGN.md §9 line 180; CS-09. See doc 10 P3 |
| C8 | **Skeleton pulse capped**: `animation-iteration-count: 2` (4 s), then still at full tone. The visible and screen-reader "Finding…" text carries on | Keeps the loading cue without endless motion on a data screen | A section loading | 2 s × 2 | Tailwind default | None (existing) | None. It reduces work | **Optional** (owner chooses between A, keep, and B, cap) | `States.test.tsx:32-35`. Risk: on a slow plan (up to about 9 s live) a still skeleton may read as stuck, so the visible label must stay. WCAG 2.2.2's loading exemption applies only when nothing else can be used meanwhile, and here the rest of the page can (UNVERIFIED reading) |
| C9 | **Cycling hint, calmer variant**: show each whole starter in turn with a 200 ms opacity crossfade every 4 s and stop after one round. No per-character typing | Same job as J18 with no 35 ms React updates and no endless loop | Empty, unfocused box | 200 ms fade, 4 s hold, 1 round | ease | Still (existing) | Lower than today | **Optional.** J18 stands unless the owner changes it | `CyclingHint.test.tsx`; J18 row in OWNER_DECISIONS |
| C10 | "Not current" banner and stale state | Status must be seen at once | Data older than 60 minutes | Instant | — | — | — | **Keep. Never animate or pulse it** | Cityscape spec §5.2; data-integrity rules |
| C11 | **First scene fades in** over the grey silhouette: opacity 0 to 1 when a place's first forecast lands | Prevents a pop when the forecast arrives (the scene took about 2.7 to 3.3 s to land, live) | `data-air` goes from `loading` to a look | 300 ms | strong-out | Instant | One full-screen opacity transition, once per place | **Optional** | Brief-finish §5.2 left this out because both drawings would need to be mounted together. It raises no data-integrity issue: the silhouette is neutral, so no old place's look shows under the new place. Churn: `CitySkyline.tsx:128-151`, `CitySkyline.test.tsx`, `scene.spec` |
| C12 | Moving between the five destinations | — | Nav | Instant | — | — | — | **Keep** | Tens of times a day. The fixed city already gives continuity. No View Transition |
| C13 | **Copy answer, icon to tick**: crossfade with `scale(0.9 → 1)` and opacity, optionally with a 2 px blur during the swap | State change (it worked) | Copy succeeds (`AskEntry.tsx:118,128`) | 150 ms | strong-out | Instant | None | **REC** (small) | Today the icon swaps instantly. The text status stays the real signal |
| C14 | Save confirmations ("Save plan", "Save my answers") | Status | Save | Instant text in a live region | — | — | — | **Keep** | No celebration motion: it would sit oddly next to health-adjacent content |
| C15 | Cityscape: clouds settle (E5), rain (E6), the 700 ms fade (E7) | Atmosphere | First draw; level change | As built | As built | Still or instant | Low | **Keep** | Owner D2a (settle once) replaced the cityscape spec's 35–60 s drift. Doc 10 covers depth changes |

**What stays still on data screens after the first 5 s:** everything except loading pulses (E8, or C8) and the J18 hint (E9, or C9). If C8 and C9 are both approved, nothing moves after 5 s.

### 3.2 Motion for React (not installed)

**Status, OBSERVED:** `motion` and `framer-motion` are absent from `node_modules` and `client/package.json:14-19`.

**What stands against it:**
- **D5:** declined CSS-plus-Framer Motion (`docs/UX_AUDIT.md:393`).
- **G-04:** no new dependency.
- **Doc 08 §3.7:** whole-entry upper bound of 64.3 kB gzip. The vendor states about 43 kB for the motion component and about 5 kB for `m` with LazyMotion.
- **Cityscape spec:** rules out Framer Motion for the backdrop (`AirAware_AI_Adaptive_Cityscape_Background_Spec.md:267,413`).

| ID | Animation | Purpose | Trigger | Duration | Easing | Reduced motion | Perf risk | CSS / platform alternative | Status |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Chat message entry | Continuity | New exchange | 200 ms | strong-out | None | Low (WAAPI path) | **Already built:** E3 (`@starting-style`) | No |
| M2 | Layout animation as the Ask thread grows, or a card expands | Continuity | New entry; expand | 200–250 ms | spring | None | **High.** `layout`/`layoutId` run on the main thread, and the thread grows while a request is in flight (`animation-performance` "Where It Runs") | Instant growth plus E3. Same-document View Transitions if ever needed (support UNVERIFIED) | No |
| M3 | Prompt selection morph (chip flies into the box) | Spatial continuity | Chip press | 250 ms | drawer | None | Medium | C6. The chip sends at once, so there is nothing to fly to | No |
| M4 | Drawers and bottom sheets | Spatial | Open and close | 300 ms / 200 ms | drawer | None | Medium | The app has **no drawer**. "More topics" is a `<details>`, and the place picker is a native `<dialog>` (C5) | No |
| M5 | Exit animation for a removed list item (e.g. deleting a saved plan) | Prevents a jarring change | Delete | 150 ms | strong-out | None | Low | `transition-behavior: allow-discrete`, or instant removal plus a status message | No |

**What would change this:** an owner-approved, gesture-driven interaction, such as a drag-to-dismiss sheet with momentum, that CSS, WAAPI and View Transitions cannot do. It would also need a route split first (F-37) and the doc 08 §5 install gates.

### 3.3 GSAP (not installed)

**Status, OBSERVED:** `gsap` is absent. Doc 08 gives 27.4 kB gzip. The licence is the registry string "Standard 'no charge' license", and its terms were not reviewed.

| ID | Animation | Purpose | Trigger | Duration | Easing | Reduced motion | Perf risk | CSS alternative | Status |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Landing "How AirAware works" told on scroll (CAMS → Open-Meteo → AirAware rules → your screen) | Explanation (UNDERSTAND) | Scroll | Scroll-scrubbed | linear (scrubbed) | Static steps | Main-thread rAF plus ScrollTrigger. Pinning approaches scroll-jacking, which `DESIGN.md:165` forbids | E4 already reveals each section. A CSS `view()` timeline could add one more step: highlight each of the four steps as it crosses mid-screen (opacity 0.6 → 1). No pinning | **No** |
| G2 | Hero city with a camera intro | Delight | Load | 1–2 s | — | Static | Medium | G2 decision: a still hero skyline (`OWNER_DECISIONS.md:131`) | **No** |

**What would change this:** the owner wants a scrubbed, multi-step sequence that CSS scroll-driven animations cannot express. Even then: Landing only, no pinning, lazy-loaded, and still under reduced motion.

### 3.4 React Bits / Magic UI (reference only)

**Status, OBSERVED (doc 08 §3.6):** reference only. React Bits is MIT plus Commons Clause, and most components bring Motion, GSAP or WebGL (per-component dependencies UNVERIFIED). Nothing is copied. Any pattern used would be rewritten in CSS against our tokens.

**Why this table has fewer columns:** no animation from this group is proposed, so Purpose, Trigger, Duration, Easing, Reduced motion and Performance risk don't apply. R1 points to E4, which has those values.

| ID | Pattern | Verdict | Why |
|---|---|---|---|
| R1 | Blur or fade text and section reveal | Already have it | E4 |
| R2 | Number ticker / count-up | **Never** | Animates a figure (rule 10) |
| R3 | Marquee, aurora, animated gradient or shimmer button | **Never** on data screens; **No** on Landing | Continuous motion; the 5 s rule |
| R4 | Particles, meteors, "smoke" backgrounds | **Never** | Cityscape anti-goals (no smoke or particles); weather or pollution imagery would imply measurement |
| R5 | Animated beam or connector diagram for "How AirAware works" | **No**; a static SVG diagram if wanted | Decorative loop |
| R6 | Spotlight or tilt card on hover | **No** | Pointer-only delight, seen tens of times; adds nothing to understanding |

### 3.5 Rive / Lottie (optional, not now)

**Status, OBSERVED:** neither is installed. Doc 08 gives 95.0 kB gzip for `@rive-app/react-canvas`. A Lottie player was not measured. Rive's WASM and CSP needs are UNVERIFIED, and `_headers` has `script-src 'self'` with no `wasm-unsafe-eval` (doc 08).

| ID | Use | Purpose | Trigger | Duration | Easing | Reduced motion | Perf risk | Status |
|---|---|---|---|---|---|---|---|---|
| L1 | Ask empty-state illustration (an "assistant" mark) | Warmth | Empty thread | ≤ 2 s once, then still | Authored in the asset (ease-out family) | Static SVG poster | Runtime weight; a character can read as an authority, which is wrong for "general information only" | **No.** A static SVG mark first |
| L2 | `/app/welcome` onboarding illustration | Explanation | First visit | ≤ 3 s once | Authored in the asset | Static poster | Weight on the very first load | **Optional later.** Only if a static illustration demonstrably fails to explain |
| L3 | Loading illustration | — | Loading | — | — | — | Would replace an honest skeleton with decoration | **No** |

---

## 4. Motion that is never allowed

| Never | Why | Source |
|---|---|---|
| Count-up or animated numbers, an animated verdict, a chart line drawing itself | Motion would make model numbers look live or measured | Rule 10; `DESIGN_SYSTEM_PROPOSAL.md:389` |
| A pulsing or blinking "live" dot, or a pulsing warning | Implies live sensing; alarm imagery | Cityscape spec §5.2 |
| Smoke, haze loops, fog or particles | Anti-goals; never infer or depict pollution from weather | Brief-finish §3; scene.ts:21-23 (no fog) |
| Continuous cloud drift (the spec's 35–60 s loop) | Superseded by owner D2a: settle once | Brief-finish §3 non-goals |
| Pointer- or gyroscope-driven parallax on app pages | Vestibular risk, battery, no touch equivalent | Cityscape spec §5.2 "parallax that moves the whole page" |
| Page transitions between the five destinations | High frequency | Rule 1 |
| Animated disclosure height | Layout property; recorded "instant" decision | E10 |
| Smooth scroll in Ask | AK-05 | `REDESIGN_ACCEPTANCE_CRITERIA.md:96` |
| Simulated typing of AI answers | Streaming is out of scope, and fake streaming misstates how answers are made | Ask spec "not built, still forbidden" list (docs digest) |
| Scroll-jacking or pinned sections | Predictable scrolling | `DESIGN.md:165` |

---

## 5. Reduced motion and accessibility

- **The global cap stays** (`index.css:270-284`). Every proposal above becomes instant under `reduce`. It was verified live: there are 0 animations on Today with `reduce` emulated.
- **Pressed buttons** still give feedback through the 80 % opacity fade (E1).
- **Focus is never delayed by motion.**
  - The dialog (C5) focuses at once, as today.
  - The answer heading gets focus with `preventScroll` (`AskEntry.tsx:299`).
- **Forced colours:** the backdrop steps aside (`CitySkyline.tsx:101-102`). No proposal depends on colour motion to carry meaning.
- **WCAG 2.2.2:** the J18 hint pauses on hidden tabs but has no user pause control other than focusing the field. C9 (one round, then still) would remove the question. Loading pulses: see C8.

---

## 6. Performance rules and how to check them

| Check | Target | Method | Status |
|---|---|---|---|
| Running CSS animations 6 s after Today loads, with content loaded | 0 decorative (pulses only while loading) | `document.getAnimations()` in an e2e test | Measured live: only `pulse` running at 6 s |
| The J18 hint (JS timers, invisible to `getAnimations()`) | Still under `reduce`; paused on a hidden tab; still after the first question | Its own test: watch the hint's text over 3 s (`CyclingHint.test.tsx` covers part of this in jsdom) | Not measured live |
| Running animations under `reduce` | 0 | Same, with `reducedMotion: 'reduce'` | Measured live: 0 |
| Animated properties | transform and opacity only; E7 is the one listed exception until C7 is decided | Code review with `review-animations` standards 3 and 7 | E2 and E7 noted |
| `transition: all` | None | grep | None found. E2 uses Tailwind's property list, not `all` |
| Frame time during C5, C7, C11 and the first scene | p95 ≤ 16.7 ms; on 120 Hz phones, note frames over 8.3 ms | DevTools Performance recording on a **real mid-range Android** over remote debugging. Headless and desktop CPU throttling don't model a weak GPU or the blur cost | **Not measured** |
| Full-screen repaints during the air fade | Documented; 0 if C7 is adopted | DevTools Rendering → Paint flashing | **Not measured** |
| `will-change` | Not added by default | Only after a recorded 1 px shift or dropped frames (`animation-performance` "will-change") | — |

**Tests and criteria any change touches:**
- `styles.test.ts:75-94` (press curve, cap);
- `CitySkyline.test.tsx:257-294,357,381-414` (motion classes, `motion-safe:` only);
- `States.test.tsx:32-35` (pulse);
- `CyclingHint.test.tsx`;
- acceptance criteria AC-07 ("2 running animations without a preference (cloud drift 4.8 s, rain 6 × 0.8 s); 0 under `reduce`") and CS-09 ("Gate: unchanged").
  - C11 adds a 300 ms transition at first draw that AC-07's count could pick up, depending on when it samples (UNVERIFIED).
  - C8 and C13 don't touch the cloud and rain count.
  - C7 changes CS-09's "fade 0.7 s" mechanism but not its timing.

---

## 7. Where this doc meets earlier decisions

| Earlier source | What it says | This doc |
|---|---|---|
| `docs/UX_AUDIT.md:393` D5 (approved 20 Nov) | CSS-only motion; no Framer Motion | Agrees. §3.2 is "none now" |
| `DESIGN_SYSTEM_PROPOSAL.md:375,394`; `DESIGN_CONCEPTS.md:69` | "No new animation" | C2, C5, C8, C11 and C13 would be new motion. Each needs an owner decision |
| Master guide §10 (`…Master_Guide.md:537-559`) | Level 2 Motion for chat, drawers and layout; Level 3 GSAP for landing; Level 4 Rive/Lottie | Kept as groups, but each is "not now". Chat entry is already CSS (E3) |
| Master guide timing table (`:563-571`): card expand 180–260 ms, navigation 150–240 ms | Animate these | Disclosures and navigation stay instant (recorded decision; frequency rule) |
| Cityscape spec §5.2 (`…Cityscape_Background_Spec.md:145`): clouds drift 35–60 s | Continuous drift | Owner D2a (settle once) and the 5 s rule win. Doc 10 keeps that |
| `DESIGN.md:141` | Says the Ask box has the cycling hint | The code and J25 use a fixed placeholder on Ask; Today keeps the hint (docs digest §8). Not changed here |
| J18 (`OWNER_DECISIONS.md:192`) | Looping typed hint on Today | Listed as exception E9; C9 is offered as an optional alternative only |
| `08_COMPONENT_LIBRARY_DECISIONS.md` §3.6–3.7 | Reference only; don't install Motion or GSAP | Agrees. Sizes are cited from it, not re-measured |

---

## 8. Not verified

- **Browsers:** support for animating `overlay` and `display` with `transition-behavior: allow-discrete` (C5), and for same-document View Transitions (UNVERIFIED).
- **Frame timing:** no frame timing of any kind was measured. Headless runs are software-rendered and blind to compositor and blur cost.
- **Not observed live:**
  - the Ask answer rise (E3);
  - the place dialog (E11);
  - the cycling hint timing (E9);
  - the above, rain and heat looks.

  The live scene was "within" with 1 cloud and the glow, in a dry hour.
- **Hidden placeholders:** whether the hidden Today pulse placeholders on Ask, Habits and Profile animate. The code puts them inside a `[hidden]` (display: none) parent, which normally stops CSS animations (UNVERIFIED; not probed).
- **WCAG reading:** my reading of WCAG 2.2.2's loading exemption (C8).
- **Unread skills:** `animate`, `improve-animations` and `find-animation-opportunities`. `modern-web-guidance` was not run.
- **Local vs live:** live serves an older build than local `main`. The motion code read locally (index.css, CitySkyline.tsx) matched what the live probe computed for E1, E2, E5–E8 and E10.
