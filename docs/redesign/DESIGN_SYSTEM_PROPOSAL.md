# AirAware AI: design system proposal (Stage 1)

**Date:** 24 Nov 2026.
**Status:** proposal. Nothing here is built. Items marked **needs OK** wait for the owner.
**Scope:** the visual system both directions share (A "Calm atmosphere", B "Editorial city"), and where they differ.
**Sources checked:**
- `client/src/index.css`, every `.tsx` under `client/src`, and `e2e/`;
- `DESIGN.md`;
- the cityscape specs (`docs/superpowers/specs/2026-11-20-cityscape-backdrop-design.md`, `2026-11-22-cityscape-brief-finish-design.md`);
- the Stage 0 audit (`docs/redesign/audit/`).

**Rule for this document:** it uses only the tokens that already exist. Where the brief and the code disagree on a fact, the code wins, and section 12 lists each case.

---

## 1. Tokens

### 1.1 What exists

The tokens are in `client/src/index.css:26-75`, inside `@theme static`. Tailwind's default colours and fonts are cleared there, so these are the only colour utilities.

| Token | Hex | Where it is used today (examples) |
|---|---|---|
| `bg` | #080f1c | App header (`AppShell.tsx:270`), phone bottom bar (`AppNav.tsx:42`), Landing page (`Landing.tsx:124`), dialog backdrop at 60 % (`PlaceChip.tsx:53`) |
| `surface` | #101c2b | Landing step cards (`Landing.tsx:246`) |
| `elevated` | #172638 | Current-page pill in the nav (`AppNav.tsx:52,54`), Landing secondary button hover (`Landing.tsx:56`) |
| `surface-light` | #f5f8fa | Body background (`index.css:84`), every app panel, footer, dialog, inputs |
| `primary` | #39d5c2 | Primary buttons (`DailyPlanSection.tsx:66-67`, `AskBox.tsx:56`, `Ask.tsx:168`), the Today invite (`AppShell.tsx:429`), current nav icon, Landing numbers and CTA |
| `secondary` | #64a9ff | Focus ring on dark (`index.css:205-207`); sky colour mixes (`CitySkyline.tsx:25-45`) |
| `text` | #f4f7fa | Text on the header, the bar and the Landing page |
| `text-dark` | #182435 | Body text (`index.css:85`), input and button borders, level tag, Ask bubble fill (`AskEntry.tsx:212`) |
| `warning` | #f5b84b | Stale banner (`AirReadout.tsx:45`), above-limit marker (`AirReadout.tsx:26`), sun glow and heat shimmer in the backdrop |
| `danger` | #f06b72 | Not used anywhere in `client/src` |
| `success` | #3baa82 | Not used anywhere in `client/src` |
| `text-muted` | #a9b7c8 | Muted text on dark (nav labels, Landing) |
| `text-dark-muted` | #4a5a6e | Muted text on light (provenance, caveat, footer) |
| `rule` | #d3dce6 | 1 px borders of panels and cards; sky and cloud colours |
| `rule-dark` | #22344a | Bar top border, place chip border, Landing borders |
| `focus` | #1f6fd6 | Focus ring on light (`index.css:194-197`) |

There is no white anywhere: a search for `bg-white` and `#fff` found nothing. Panels use `surface-light`.

### 1.2 Role mapping per direction

| Role | Shipped | Direction A | Direction B |
|---|---|---|---|
| Page ground, app | The `CitySkyline` sky over `surface-light` | Same | Same |
| Page ground, Landing | `bg` | `bg` | `bg`, with alternating `surface` sections |
| Panels | `surface-light`, 1 px `rule` border, `rounded-lg` | Same. Radius: section 3.4 | Below the masthead, as A |
| Masthead | None | None (the title block sits on the sky) | `surface`, text in `text`, metadata in `text-muted`; class `on-dark` |
| Header and nav | `bg`; labels `text-muted`; current page in `text` + `elevated` pill + `primary` icon | Same, plus a current-page outline (section 4) | Same as A |
| Primary action | `primary` fill. Labels are `text-dark` on most buttons, but `bg` on the Today invite (`AppShell.tsx:429`) and the Landing CTA (`Landing.tsx:44`) | One per screen; label `text-dark` in the app | Same as A; no primary button inside the masthead |
| Secondary action | Outlined: 1 px `text-dark` border, `text-dark` label | Same | Same |
| Links on light | `text-dark`, underlined | Same. `secondary` can't be used here (2.27:1, section 1.3) | Same |
| Links on dark | `text`, underlined (Landing footer) | `text` or `secondary` (7.1–7.9:1) | Same |
| Warning ("Not current") | `warning` at 15 % fill, `warning` border, `text-dark` text | **Proposal, needs OK:** solid `warning` fill with `text-dark` text (8.82:1) | Same solid banner, so it reads the same on the dark masthead |
| Focus ring | `focus` on light (4.58:1); `secondary` inside `.on-dark` (7.08–7.91:1) | Same, plus `text-dark` for the ring inside the title block on the sky (**proposal, needs OK**, section 4.2) | The masthead takes `on-dark`, so its ring is `secondary` (7.08:1 on `surface`) |
| Rules and dividers | `rule` on light, `rule-dark` on dark | Same | Inside the masthead: `rule-dark` (decorative only) |
| Muted text | `text-dark-muted` on light, `text-muted` on dark | Same | Same; masthead metadata in `text-muted` (8.42:1) |
| Level tag pill | `text-dark` border and label | Same | On the masthead: `text` border and label (15.97:1) |
| `danger`, `success` | Unused | Unused | Unused |

### 1.3 Contrast, computed

**Method:**
- WCAG 2.x relative luminance and contrast ratio, from the hex values in `index.css`.
- Blended colours are composited in sRGB, the way a browser draws `bg-warning/15` over a panel.
- The sky stops are mixed in OKLab, as `CitySkyline.tsx:25-45` does with `color-mix(in oklab, …)`.
- Formulas: channel `c/255` linearised as `c/12.92` when ≤ 0.04045, else `((c+0.055)/1.055)^2.4`; luminance `0.2126 R + 0.7152 G + 0.0722 B`; ratio `(L1+0.05)/(L2+0.05)`. Alpha blends: `top·a + base·(1−a)` per sRGB channel. OKLab conversion: Björn Ottosson's published matrices.
- Computed with small Node scripts (no packages) on 24 Nov 2026. They are outside the repo; the return report gives their paths.

**Thresholds:** 4.5:1 for text, 3:1 for UI parts and focus rings (WCAG 1.4.3, 1.4.11).

**The pairs the brief asked for:**

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| `text-dark` on `surface-light` | 14.67:1 | 4.5 | pass |
| `text-dark-muted` on `surface-light` | 6.61:1 | 4.5 | pass |
| `text` on `surface` | 15.97:1 | 4.5 | pass |
| `text-muted` on `surface` | 8.42:1 | 4.5 | pass |
| `text-dark` on `warning` | 8.82:1 | 4.5 | pass |
| `primary` on `bg` | 10.47:1 | 4.5 | pass |
| `focus` ring on `surface-light` | 4.58:1 | 3 | pass |
| `focus` ring on `surface` | 3.52:1 | 3 | pass (narrow; `.on-dark` uses `secondary` instead, 7.08:1) |

**Other pairs that matter for the redesign:**

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| `text-dark` on `primary` (primary button label) | 8.54:1 | 4.5 | pass |
| `bg` on `primary` (invite and Landing CTA label) | 10.47:1 | 4.5 | pass |
| `primary` on `surface` (B: an action on the masthead) | 9.38:1 | 4.5 | pass |
| `text` on `bg`; `text-muted` on `bg` | 17.83:1; 9.40:1 | 4.5 | pass |
| `text` on `elevated` (current nav label) | 14.25:1 | 4.5 | pass |
| `primary` on `elevated` (current nav icon) | 8.37:1 | 3 | pass |
| `secondary` ring on `bg` / on `surface` | 7.91:1 / 7.08:1 | 3 | pass |
| `focus` ring on `bg` | 3.93:1 | 3 | pass |
| `surface-light` on `text-dark` (Ask bubble, chosen Welcome chip) | 14.67:1 | 4.5 | pass |
| `text-dark` on `warning` 15 % over `surface-light` (stale banner today) | 13.58:1 | 4.5 | pass |
| `text` on `warning` 15 % over `surface` (stale banner on a B masthead) | 11.76:1 | 4.5 | pass |
| `text-dark-muted` chip border on `surface-light` | 6.61:1 | 3 | pass |
| `text-dark` on `danger` / on `success` (if they were ever used as fills) | 5.25:1 / 5.41:1 | 4.5 | pass |

**The title block on the sky (direction A, shipped).** The sky stops come from `CitySkyline.tsx:25-45`. The test that guards them is `e2e/backdrop.spec.ts:116-253`.

| Sky stop | Colour | `text-dark` | `text-dark-muted` |
|---|---|---|---|
| within, top | #b3d5ff | 10.34:1 | 4.66:1 |
| within, overcast top | #bbd7f9 | 10.58:1 | 4.77:1 |
| within, bottom (`surface-light`) | #f5f8fa | 14.67:1 | 6.61:1 |
| above, top | #c4d5ea | 10.47:1 | 4.72:1 |
| above, overcast top | #ccd9e8 | 10.92:1 | 4.92:1 |
| above, bottom | #e6ebf1 | 13.05:1 | 5.88:1 |
| unknown, top (`rule`) | #d3dce6 | 11.28:1 | 5.09:1 |

- **Worst case for `text-dark`:** 4.81:1, a rain streak over the glow centre on the within sky. That passes. It is a conservative bound: the scene never draws the glow while it rains (`scene.ts`, `glow` needs `!rain`). The e2e test computes the same superset of combinations.
- **`text-dark-muted`:** 4.66:1 on the bare sky, and lower under rain. This is why the backdrop spec §5.3 moved every title-block line to `text-dark`. Keep that.

### 1.4 Pairs under the threshold

| Pair | Ratio | Where it matters | Proposal |
|---|---|---|---|
| `secondary` as text on `surface-light` | 2.27:1 | The brief's "secondary blue for links" (direction A) | Do not use `secondary` for text on light. Links on light stay `text-dark`, underlined (14.67:1). `secondary` is for links and rings on dark only. |
| `focus` ring on the sky, title block | 3.23–3.52:1 on a bare stop. **2.85:1 over the glow centre in the within look.** The glow is drawn only by day, with known cover, no rain, no overcast and a known air look. At its 0.22 strength in the above look the ring keeps 3.10:1. A 1.5 px rain streak crossing the ring is lower, over a pixel or two. | The only focusable thing in a title block is Ask's "Edit" link (`Ask.tsx:87-99`). On a phone, the glow sits near the top right, where "Edit" can wrap. This overlap is a worst case from the geometry, not something seen in a screenshot. | **Needs OK:** inside `[data-part="title-block"]`, the ring uses `text-dark` (4.81:1 worst case, the same colour the e2e test already checks). One CSS rule in `index.css` (section 4.2). |
| `focus` / `secondary` ring on a solid `warning` banner | 2.75:1 / 1.37:1 | Only if the solid stale banner (below) is accepted: its "Reload forecast" button's ring would sit on amber. On B's masthead the `.on-dark` rule would make it `secondary`. | The same rule covers `[data-part="stale-banner"]`: ring in `text-dark` (8.82:1 on `warning`). |
| `elevated` pill against `bg` | 1.25:1 | The current-page indicator. The brief (section 6) wants 3:1 against its background. Today the state is carried by the bold label, the colour change from `text-muted` to `text`, and the teal icon. Only the bold label is not colour. In forced colours the pill disappears, so only the bold label is left. | **Needs OK:** a 1 px outline in `text-muted` on the current pill (9.40:1 against `bg`, 7.51:1 against `elevated`). An outline takes no layout space and stays visible in forced colours. While focused, the focus ring replaces it. Mockup B draws another option: a light `text` fill with a `text-dark` label (17.83:1 against `bg`; label 14.55:1), **needs OK**. |
| `rule` on `surface-light` | 1.30:1 | Fine for panels, which aren't controls. Not fine for controls whose only visible edge is this border: the help-choice cards (`HelpChoices.tsx:66`), Today's starter chips (`AskBox.tsx:71`) and Ask's starters (`AskEntry.tsx:25-26`). | Controls use a `text-dark-muted` border (6.61:1), which Ask's topic chips already use (`AskEntry.tsx:23-24`). This also brings the two pill styles in F-20 down to one. |
| `rule-dark` on `bg` | 1.51:1 | The place chip's border (`PlaceChip.tsx:41`). Its label and icons identify it, so it doesn't fail WCAG, but its edge is faint. | Optional, **needs OK:** `border-text-muted` (9.40:1). |
| `primary` fill against `surface-light` | 1.72:1 | The edge of the teal button on a light panel. Not a WCAG failure: the label (8.54:1) identifies the button. | None. Noted because the button reads softer on light than on navy. |
| `warning` on `surface-light` | 1.66:1 | The stale banner's border and tint. The text passes, but the banner reads only as a pale tint, and the brief asks for "Not current" to be prominent. | **Needs OK:** a solid `warning` fill with `text-dark` text (8.82:1), in both directions. B then needs no dark variant of the banner. Mockup A shows the shipped 15 % tint with the button inside; mockup B draws the solid fill with the button beside it (placement: §13). |
| `danger`, `success` as text on light | 2.79:1, 2.71:1 | Not used today | If either is ever used, only as a fill with `text-dark` text. |

### 1.5 New tokens

**None proposed.** Every role in section 1.2 maps to an existing token. Each gap in section 1.4 is closed with an existing token in a different role. The one hard-coded copy is the static 404 page (section 10), which can't read `index.css`.

---

## 2. Typography

### 2.1 Font

- Inter variable (weights 100–900), self-hosted:
  - the file is `client/public/fonts/inter-latin-wght-normal.woff2`;
  - it is preloaded in `client/index.html` and declared with `font-display: swap` (`index.css:10-20`);
  - `styles.test.ts:12-26` pins it.
- Weights in use: 400, 500 (`font-medium`), 600 (`font-semibold`). Keep to these three.
- `font-synthesis: none` (`index.css:87`).
- **No change proposed.**

### 2.2 The steps available

These are Tailwind v4 defaults. `index.css` does not clear `--text-*`, so they all exist.

| Class | Size / line height |
|---|---|
| `text-xs` | 12 / 16 px |
| `text-sm` | 14 / 20 px |
| `text-base` | 16 / 24 px (body sets `line-height: 1.55` where no size class is given) |
| `text-lg` | 18 / 28 px |
| `text-xl` | 20 / 28 px |
| `text-2xl` | 24 / 32 px |
| `text-3xl` | 30 / 36 px |
| `text-4xl` | 36 / 40 px |
| `text-5xl` | 48 / 48 px |
| `text-6xl` | 60 / 60 px |
| `text-7xl` | 72 / 72 px |

No step gives 26–28 px, as the brief asks for the phone verdict, or 40 px, as it asks for B's phone Landing headline. An arbitrary size such as `text-[1.75rem]` would work, but it adds a value outside the scale. So the proposal uses the nearest steps. **Needs OK** if the owner wants the in-between sizes.

### 2.3 Scale per direction

"Phone" means below `sm` (640 px). "Desktop" means from `lg` (1024 px) unless the row says otherwise.

| Role | Shipped (all widths) | A phone | A desktop | B phone | B desktop |
|---|---|---|---|---|---|
| Today H1 "Today in {place}" | `text-3xl` (`AppShell.tsx:355`) | `text-2xl` (24 px; F-11: aims to keep "Thiruvananthapuram" on one line at 320; mockups measure it) | `sm:text-3xl` | `text-2xl` | `sm:text-3xl`, `tracking-tight` |
| Other page H1s (Ask, My Home, Better Habits, My Profile, Welcome, Privacy) | `text-3xl` | `text-2xl` | `sm:text-3xl` | `text-2xl` | `sm:text-3xl` |
| Greeting, "Step N of 3" | `text-base`, `text-sm` | Same | Same | Same, in `text-muted` on the masthead | Same |
| Verdict H2 (largest text on Today) | `text-3xl` (`TodayLead.tsx:37`) | `text-3xl` (the nearest step to 26–28 px; unchanged) | `lg:text-4xl` (36 px) | `text-3xl` | `lg:text-5xl` (48 px), `tracking-tight` |
| Panel H2 ("Your recommendation for today", "What would you like help with?", …) | `text-2xl` | `text-xl` (20 px; aims for one line at 390, which Stage 5 must measure) | `sm:text-2xl` | `text-xl` | `sm:text-2xl` |
| B section label above a panel heading | None | None | None | `text-xs`, `font-semibold`, `uppercase`, `tracking-wider`, `text-dark-muted` (6.61:1) | Same |
| Card title (`PlanCard` H3) | `text-base` semibold | Same | Same | Same | Same |
| Body | `text-base` | Same | Same | Same | Same |
| Metadata (provenance, caveat, "Made by…", footer) | `text-sm` | Same | Same | Same | Same |
| Nav label | `text-xs` phone, `md:text-sm` | Same | Same | Same | Same |
| Landing hero H1 | `text-5xl sm:text-6xl lg:text-7xl`, leading 1.05 (`Landing.tsx:140`) | Same | Same | `text-5xl` (40 px is not a step), `tracking-tighter` | `lg:text-7xl`, `tracking-tighter` |
| Landing section H2 | `text-4xl sm:text-5xl` | Same | Same | Same, with a `text-sm` `tabular-nums` ordinal ("01") above it, as `Landing.tsx:65-77` already draws | Same |
| PM2.5 figure in "Air quality details" | `text-6xl tabular-nums` (`AirReadout.tsx:103`) | Same | Same | Same | Same |

**Sizes the mockups draw** (not Tailwind steps unless named; arbitrary, **needs OK** if kept). The measured mockup positions come from these sizes:

| Role | Mockup A | Mockup B |
|---|---|---|
| Verdict H2 | 28 px phone (`a/style.css:536`), 36 px from 1024 | 26 px phone (`b/style.css:506`), 36 px from 640, 40 px from 1024 |
| Today H1 | 24 px phone, 30 px from 1024 | 24 px phone, 32 px from 640 (masthead) |
| Other page H1 | as Today | 28 px phone, 36 px from 640 (compact masthead) |
| Landing hero H1 | 40 px phone, 68 px from 1024 (shipped: 48 / 60 / 72) | `clamp(2.5rem, 5.6vw + 0.5rem, 4.75rem)`: 40–76 px (`b/style.css:1065`) |

**Notes:**
- **"The verdict is the largest text"** holds while "Air quality details" is closed. Opened, the PM2.5 figure (60 px) is larger. It sits below the verdict, inside a section the user opened, so no change is proposed.
- **B's uppercase labels:**
  - `DESIGN.md` §4 says "Avoid shouty uppercase tracking". Small 12 px labels with `tracking-wider` are the mildest form of it, but this is still a conflict for the owner to rule on.
  - Write the label in sentence case in the source and use the `uppercase` class, so screen readers read words, not letters.
- **Form fields stay at 16 px.** The inputs in `AskBox.tsx:52`, `Ask.tsx:163` and `LocationSearch.tsx:136` inherit `text-base`, so iOS does not zoom on focus. No input may get `text-sm`.

### 2.4 Tabular numbers

Shipped:
- the PM2.5 figure (`AirReadout.tsx:103`);
- both forecast tables (`ForecastPanel.tsx:62,151`);
- the chart axis (`ForecastChart.tsx:78`);
- the Landing ordinals (`Landing.tsx:70`).

Gaps where figures are compared:
- the 24-hour check list in details (`AirReadout.tsx:121`, "PM2.5 24-hour average … µg/m³…");
- the "Values for HH:MM" line (`AirReadout.tsx:87`).

**Proposal:** add `tabular-nums` to the two elements that hold them. Times in running text ("updated HH:MM") stay proportional.

---

## 3. Spacing, layout, grid, radius, borders, elevation

### 3.1 Spacing

- **The scale** is Tailwind's 0.25 rem step. There is no custom scale and none is proposed.
- **The shipped rhythm:**
  - page: `gap-8` between sections (`AppShell.tsx:295`);
  - panels: `p-5 sm:p-6`;
  - the verdict card: `p-5 sm:p-8` (`TodayLead.tsx:34`);
  - inside panels: `gap-3` or `gap-4`.
- **Proposal for Today on phones only, both directions.** This is part of the first-screen budget in the brief §3. Desktop is unchanged.

| Change | File:line | Saves at 390 (estimate; Stage 5 measures) |
|---|---|---|
| Page gap `gap-8` → `gap-6 sm:gap-8` | `AppShell.tsx:295` | about 8 px above the verdict |
| Verdict card `p-5` → `p-4`, inner `gap-3` → `gap-2`, weather row `px-5` → `px-4` | `TodayLead.tsx:31,34` | about 16–20 px |
| Recommendation panel `p-5` → `p-4`, `gap-4` → `gap-3` | `DailyPlanSection.tsx:226` | about 12–16 px |
| "Your plan is ready." shown only to screen readers (the region stays) | `DailyPlanSection.tsx:237` | about 40 px (24 px `min-h-6` plus one gap) |

**About the `<output>`:** it is also where save results appear ("Saved…", the 20-plan limit, rate limits). Only the building and ready messages become screen-reader-only. A save result, which appears under "See your full day", must stay visible. So the element keeps its live region and becomes `sr-only` only while it holds the building or ready text.

### 3.2 Widths

| Area | Shipped | Proposal |
|---|---|---|
| App header, main, footer | `max-w-6xl` (1152 px), `px-4 sm:px-6` | Keep |
| Ask column | `max-w-3xl` (`Ask.tsx:79`) | Keep |
| Welcome column | `max-w-xl`, centred from `md` | Keep |
| Privacy | `max-w-3xl` main, `max-w-5xl` header | Header becomes the app header (F-29); main keeps `max-w-3xl` |
| Line length | `max-w-prose` / `max-w-[70ch]` on long notes | Keep |

### 3.3 Grid

- **Today (shipped, kept):**
  - one column below `lg`;
  - from `lg`: `grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` (`AppShell.tsx:369`), close to the brief's 7/12 and 5/12.
- **My Profile (shipped, kept):** `lg:grid-cols-2` (`Profile.tsx:80`). The form goes left; saved plans and your data go right (F-06).
- **Card groups (F-25).** Today: `grid gap-4 md:grid-cols-2` in:
  - `GuideGroups.tsx:66` (My Home and Better Habits);
  - `MyHome.tsx:110` ("Today, for your home");
  - `AskEntry.tsx:134` (answer cards).

  Help choices use `grid gap-3 sm:grid-cols-2 lg:grid-cols-4` (`HelpChoices.tsx:55`).

**The proposal, one template:**

```
grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]
```

- **`min(20rem, 100%)` is required.** A bare `minmax(20rem, 1fr)` overflows a padded panel on a phone: the panel's inner width is about 316 px at 390 and 246 px at 320.
- **Guide groups become the grid items.** The guide outer `flex flex-col gap-8` (`GuideGroups.tsx:29`) becomes this grid, and each group (heading plus its cards) is one item:
  - a group with one card takes one column;
  - a group with two or more cards spans the row (`col-span-full`) and lays its cards out on the same template inside, so its columns line up with the outer ones.
- **No `grid-auto-flow: dense`.** The visual order stays the DOM order, and headings stay in order (WCAG 1.3.2).

**Worked example with the real groups** (`server/src/services/recommendations/guides.ts:216-240`):

| Width | Panel inner width (approx.) | Columns | Better Habits (groups of 1, 1, 1, 3 cards) | My Home (groups of 2, 1, 1, 1, 1, and a hidden 1) |
|---|---|---|---|---|
| 390 | 316 px | 1 | One column, as today | One column, as today |
| 768 | 670 px | 2 | Commuting + Waste; Cooking + one empty cell; Energy spans the row (2 + 1) | Cooking and smoke spans the row; then the single groups 2 per row |
| 1280 | 1054 px | 3 | Commuting, Waste, Cooking in one row; Energy spans the row with 3 cards. No half-empty row. | Cooking and smoke spans the row (2 of 3 cells); the 4 single groups go 3 + 1 |

Empty cells remain when a group of 2+ cards follows an incomplete row. That is the cost of keeping DOM order, and it is far less empty space than today (`prod-habits-default-1280x720-full.jpg`).

- **Help choices.** They keep their own `sm:grid-cols-2 lg:grid-cols-4`. Four equal items fill those rows exactly.

### 3.4 Radius

| Shape | Shipped | Proposal |
|---|---|---|
| Panels (top level) | `rounded-lg` (8 px). There are 25 `rounded-lg` uses in all, nested cards included; the top-level panels are a subset. | **Needs OK:** the brief's "~12 px" is `rounded-xl` for top-level panels only. No test pins radius (searched `*.test.*` and `e2e/`). If the owner prefers fewer changes, keep 8 px. |
| Cards inside panels (`PlanCard`, `ForecastPanel`) | `rounded-lg` | Keep 8 px, so nested corners stay tighter than the panel around them |
| Buttons, inputs | `rounded-md` (6 px) | Keep |
| Pills: tags, chips, nav pill, place chip | `rounded-full` | Keep |
| Dialog, Landing figures | `rounded-xl` | Keep |
| B masthead | None | The same radius as the panels |

### 3.5 Borders

- **Panels and cards:** 1 px `rule`. It is decorative, so 1.30:1 is acceptable for things that aren't controls. **Keep.**
- **Controls:**
  - inputs and outlined buttons use 1 px `text-dark` (14.67:1);
  - chips and card-links need a visible edge: `text-dark-muted` (6.61:1) per section 1.4.
- **Footer:** `border-t border-rule` on a solid `surface-light` (`AppShell.tsx:471`). **Keep.**

### 3.6 Elevation

- **There are no shadows anywhere in `client/src`** (searched `shadow`, `backdrop-blur`, `backdrop-filter`). Panels are solid; the backdrop spec rules out frosted glass.
- **The overlays already separate without shadows:**
  - the place dialog sits over a `bg` 60 % backdrop (`PlaceChip.tsx:53`);
  - the suggestion list has a `text-dark` border (`LocationSearch.tsx:144`).
- **Proposal: no shadows at all.** Tailwind's default shadows use a black colour that is not a token. Adding one to overlays would need **an OK**, and gains little.

---

## 4. Component states

### 4.1 States table

| State | How it works today (checked) | Proposal |
|---|---|---|
| **Hover** | Tailwind 4.3.4's `hover:` compiles to `@media (hover: hover) { &:hover }` (checked in `node_modules/tailwindcss/dist/lib.js`), so it never sticks on touch screens. Three uses: `HelpChoices.tsx:66`, `Landing.tsx:44,56`. | No change. "Hover" already means "device can hover". A stricter `pointer: fine` would need a custom variant, and no case calls for one. |
| **Pressed** | Enabled buttons and `.press` links scale to 0.97 over 120 ms, `cubic-bezier(0.23, 1, 0.32, 1)`, only under `prefers-reduced-motion: no-preference` (`index.css:132-141`). Under reduced motion they fade to 80 % opacity with no movement (`index.css:224-228`). `styles.test.ts:40-67` pins both. | Keep. Any new link styled as a button (the 404 links, "Reload forecast" if it is a link) takes `press`. |
| **Focus-visible** | 2 px outline, 2 px offset, `focus` (`index.css:194-197`); `secondary` inside `.on-dark` (`:204-207`); `focus` again inside `.on-dark .on-light` (`:211-213`). Programmatic `tabindex=-1` targets show no ring (`:200-202`). | Add the title-block ring (section 4.2, needs OK). B's masthead gets `on-dark`. A light card nested in it (the error card) gets `on-light`. |
| **Disabled** | Primary buttons: `disabled:opacity-60` (`DailyPlanSection.tsx:67`). Ask chips: the same (`AskEntry.tsx:24,26`). Welcome chips: `has-disabled:opacity-60` and `cursor-not-allowed` (`Welcome.tsx:72`). **Gap:** the outlined `buttonClass` in `HouseholdPreferencesForm.tsx:179` and `SavedPlansList.tsx:37` has no disabled style. From the classes, "Save my answers" and "Delete my saved data" would look the same while `disabled` is set (saving not set up, or busy). This was read in the code, not seen on screen. | Add `disabled:opacity-60` to those two class strings. Disabled controls are exempt from the contrast rule; the change is about honesty. |
| **Current page** | `aria-current="page"`, bold label, label colour `text-muted` → `text`, an `elevated` pill, and a `primary` icon (`AppNav.tsx:52-61`). | Add the 1 px `text-muted` outline on the pill (section 1.4, **needs OK**). It keeps a non-colour cue in forced colours, where fills disappear. |
| **Selected** (Welcome chips, place suggestions) | Fill inverts to `text-dark` with a tick icon. In forced colours, a 2 px outline (`Welcome.tsx:72`, `LocationSearch.tsx:158`). | Keep. |
| **Open / closed** (`<details>`) | Native disclosure triangle; `summary` is `min-h-11`. | Keep. "Why?" becomes the one label everywhere (F-23, brief §3). |
| **Loading** | `aria-busy` box with grey bars; the label is screen-reader-only (`States.tsx:7-23`). | Visible label and skeletons sized like the final content (section 9; F-02, F-18). |
| **Error** | `role="alert"` card with a heading, a plain reason, and "Try again" (`States.tsx:39-72`). | Keep. On B's masthead: open question (§13), a nested light card with `on-light`, or a dark variant (mockup B). |
| **Stale** | Amber banner directly under the provenance (`TodayLead.tsx:47`, `AirReadout.tsx:41-58`). | Solid `warning` fill (**needs OK**). Add a "Reload forecast" button on Today only (F-30; proposed copy), inside the banner or beside it (open question, §13). |

### 4.2 The focus ring in the title block and on the stale banner

- The title block is the one place where controls sit on the sky. Today the only focusable element there is Ask's "Edit" link.
- The solid stale banner (if accepted) puts the "Reload forecast" button's ring on amber.
- **Proposal, needs OK:** one rule,
  `[data-part='title-block'] :focus-visible, [data-part='stale-banner'] :focus-visible { outline-color: var(--color-text-dark); }`.
  - On the sky: 4.81:1 in the worst case computed above, against 2.85:1 for `focus` over the glow.
  - On `warning`: 8.82:1, against 2.75:1 (`focus`) and 1.37:1 (`secondary`).
- **Order matters.** `.on-dark :focus-visible` has the same specificity, so the rule goes after `index.css:211-213`, or B's masthead would turn the banner's ring back to `secondary`.
- In B there is no title block on the sky, so only the banner half of the rule applies there.

---

## 5. Icons

- **Library:** `lucide-react` ^1.66.0, already a dependency (`client/package.json`).
- **Icons in use:**

| File | Icons |
|---|---|
| `AppNav.tsx` | `Sun`, `MessageCircle`, `House`, `Leaf`, `CircleUser` |
| `PlaceChip.tsx` | `MapPin`, `ChevronDown` |
| `HelpChoices.tsx` | `Footprints`, `House`, `Leaf`, `Users` |
| `Welcome.tsx` | `Check` |
| `Landing.tsx` | `ArrowDown`, `ArrowRight` |

- **Two inline SVGs** are not from lucide and stay: the stale banner's clock (`AirReadout.tsx:47-52`) and the detail marker (`AirReadout.tsx:21-38`).
- **Rules:**
  - every icon is `aria-hidden="true"` and sits next to a visible text label;
  - no icon-only control. The phone nav shows short labels; the place chip shows the place name;
  - sizes: `size-5` (20 px) in the nav and help choices, `size-4` (16 px) in the chip and Welcome tick. Default stroke.
- **New icons:** none needed. "Reload forecast", the 404 links and the empty states are text.

---

## 6. Motion

All motion is CSS. There is no motion library, and none is proposed.

| Motion | Duration and curve | Trigger | Reduced motion | Source |
|---|---|---|---|---|
| Cloud settle | 4.8 s, `cubic-bezier(0.23, 1, 0.32, 1)`, **once** | A place's forecast first drawn | Still (`motion-safe:`) | `index.css:61-69`, `CitySkyline.tsx:188` |
| Rain | 0.8 s × 6 = 4.8 s, linear, then rests | First draw with rain | Still | `index.css:49-57`, `CitySkyline.tsx:278-281` |
| Air-look fade (sky stops, glow, veils) | 700 ms ease-out | Same-place level change | Instant | `CitySkyline.tsx:49-50` |
| Press | 120 ms scale 0.97 | `:active` | 80 % opacity, no movement | `index.css:132-141`, `224-228` |
| New Ask answer | 200 ms opacity and 8 px translate, `@starting-style` | Answer added | None | `index.css:145-156` |
| Landing sections | Scroll-driven, opacity and 8 px | Entering view | None | `index.css:163-169` |
| Skeleton pulse | Tailwind `animate-pulse` | While loading | `motion-reduce:animate-none` | `States.tsx:3-4` |

**What stays true:**
- decorative motion stops within 5 s (`DESIGN.md` §9);
- nothing animates the verdict or any figure;
- the global reduced-motion rule caps everything (`index.css:215-229`).

**Proposals:**
- **F-04 (new exchange in Ask).** The view moves so the new exchange's top is in view, then focus moves to its heading without scrolling again (`AskEntry.tsx:193`). Use an instant scroll in every case. A jump is not motion, so no reduced-motion branch is needed.
- **No new animation.** The "Reload forecast" press uses the existing press rule.

---

## 7. The cityscape rules, per direction

### 7.1 Shared by both directions (shipped, kept)

**Where it sits:**
- one fixed, full-screen backdrop drawn by `AppShell`, kept mounted between pages;
- `aria-hidden`, with no clicks and no focus (`CitySkyline.tsx:72-73`);
- not on Landing or Privacy;
- it hides in forced colours (`forced-colors:hidden`).

**The city band:**
- 128 px, 176 px from 640 px wide, never over 20 % of the screen height;
- above the phone bar (`3.5rem` plus the safe-area inset), at the bottom from `md` (`CitySkyline.tsx:75-76`);
- hidden on screens under 24 rem tall.

**Data:**
- the air look comes only from `airCheck.level` (`scene.ts`, `AIR` map);
- clouds, rain, heat and glow come only from `weather` fields;
- neither is inferred from the other;
- loading shows a still grey silhouette; no place or a forecast error shows the neutral "unknown" look;
- stale keeps the last-known look (`DESIGN.md` §8). The owner still has to pick between this and a neutral stale look (F-44).

**Readability:**
- every section sits on a solid `surface-light` panel, with no `backdrop-filter`;
- the footer is solid;
- each page ends with space as tall as the band (`AppShell.tsx:493-496`);
- the footer says "Background: model forecast for {place}. {tag}.", with " Not current." added when stale.

**Fog:** there is no fog layer. The owner removed the fog band on 22 Nov (`scene.ts` comment on `Scene`; `DESIGN.md` §8). The brief's baseline lists "fog at the city base". The code wins, so neither direction draws fog.

### 7.2 Direction A

- **The title block stays on the sky**, all in `text-dark`, with 4.81:1 or better (section 1.3). `e2e/backdrop.spec.ts:233-253` keeps checking it.
- **F-26: lower contrast for the near row on wide screens.**
  - Today the near row is `text-dark` at 0.9 opacity (`CitySkyline.tsx:244`): 10.93:1 against `surface-light`. It is the darkest shape on the first screen at 1280 (`prod-today-default-1280x720-first.jpg`).
  - **Proposal:** at `lg`, add the class `lg:opacity-60` to that group. CSS overrides the attribute, so the group computes to 4.14:1 against `surface-light`, close to the middle row's weight.
  - Height unchanged, so the band, the end spacer and the e2e band checks are untouched.
  - `CitySkyline.test.tsx:260` checks the `opacity="0.9"` attribute. It keeps passing; add one assertion for the `lg:` class.
- **Panels:** unchanged.

### 7.3 Direction B

- **The backdrop is the same**, with the same layers and data rules.
- **Today's masthead:**
  - the greeting, the H1 and the verdict card content sit on one solid `surface` panel with `on-dark`;
  - the sky shows around and below it.
- **The other pages** get a compact masthead holding the page title. On Ask, it also holds the "Using: …" line.
- **What must change with it:**
  - **The title-block contrast test changes meaning.** `e2e/backdrop.spec.ts:116-253` measures title-block text against the sky. With light text on a solid masthead, it would fail, and wrongly so. In B the test must assert that the masthead is opaque, and drop the sky comparison.
  - **The "no text rests on the scene" test** (`e2e/backdrop.spec.ts:45`) must count the masthead as a solid background. It already allows any solid background.
  - **Header and masthead are both navy:** `bg` against `surface` is 1.12:1. Keep the page's top padding (sky) between them, or they merge into one block.
  - **Dark variants needed on the masthead:**
    - the level tag (`text` border and label);
    - the provenance and caveat (`text-muted`);
    - the weather row divider (`rule-dark`).
  - **No dark variant needed:**
    - the stale banner, if the solid `warning` proposal is accepted. Its "Reload forecast" ring still needs the `text-dark` rule of section 4.2, placed after the `.on-dark` rules;
    - the error card, if option 1 of the §13 question is picked: a nested light card with `on-light`. Option 2, a dark variant, is what mockup B draws, and costs more;
    - the loading skeleton, if it stays a light card inside the masthead. The alternative is bars at `bg-text/10`, which are decorative and need no contrast.
  - **Forced colours:** the masthead's `surface` becomes the system canvas, and the text stays readable. `e2e/responsive.spec.ts` "forced colours" checks must run on the masthead pages.

---

## 8. Items from modern-web-guidance (brief §6)

### 8.1 Safe areas on all four sides (F-38)

**Today:**
- `viewport-fit=cover` is set (`client/index.html:7`), but only the bottom inset is used;
- the bar: `pb-[env(safe-area-inset-bottom,0px)]` (`AppNav.tsx:42`);
- the city band and the end spacer: `env(safe-area-inset-bottom)` with no fallback (`CitySkyline.tsx:76`, `AppShell.tsx:495`; F-39);
- the scroll padding: `calc(4rem + env(safe-area-inset-bottom, 0px))` (`index.css:122-126`). `styles.test.ts:69-74` pins that exact text.

**Proposal:**
- **Left and right** (bar, header row, main, footer): `env(safe-area-inset-left, 0px)` and `env(safe-area-inset-right, 0px)` added to the existing side padding, e.g. `pl-[max(1rem,env(safe-area-inset-left,0px))]` where `px-4` is today. This touches nothing vertical.
- **Bottom:** the brief asks for `max(0.75rem, env(safe-area-inset-bottom, 0px))`. That adds 12 px under the bar on every phone without a home indicator.
  - The bar becomes 68 px.
  - Its top moves from y 787 to y 775 at 390×844, and from y 583 to y 571 at 320×640 (Stage 0 nav top; the links start 1 px lower).
  - The brief's §3 first-screen sums are measured against the old position.
  - Four places mirror the bar height and must change together:
    - `AppNav.tsx:42` (the bar);
    - `CitySkyline.tsx:76` (the band offset);
    - `AppShell.tsx:495` (the end spacer);
    - `index.css:124` (the scroll padding), with `styles.test.ts:69-74`.
- **My recommendation (needs OK):** use `env(…, 0px)` with no minimum on all four sides. This keeps the bar at 56 px plus the real inset. It also adds the missing `, 0px` fallbacks at `CitySkyline.tsx:76` and `AppShell.tsx:495`. Take the 0.75 rem minimum only if the owner accepts the 12 px.
- **Bar height in either case:** 56/640 = 8.75 % (68/640 = 10.6 %) of a small phone screen. Both are under the guide's 12 %. The header is not sticky, so it does not count.

### 8.2 `text-wrap`

Shipped:
- `h1–h4 { text-wrap: balance }`;
- `p, li, dd { text-wrap: pretty }` (`index.css:179-192`).

**Keep; no change.** (`TodayLead.tsx:37` also has a redundant `text-balance`. It is harmless and can stay.)

### 8.3 The html/body `overflow-x: clip` note

**Facts (code over brief):**
- **It was not added for the backdrop.** `html, body { overflow-x: clip }` (`index.css:78-81`) came in commit `feb0805` on 18 Nov, "add Tailwind tokens and page switch", two days before the backdrop.
- **The backdrop clips itself.** Its root is `fixed inset-0 overflow-hidden` (`CitySkyline.tsx:72-73`), which contains the rain layer's 64 px overhang. So the brief's "scope the clip to the backdrop container" is already true.
- **`clip` is not `hidden`.** It creates no scroll container, so `position: sticky` still works. Its cost is that it hides real overflow bugs: content past the edge is cut off instead of scrolling.
- **The e2e checks already ignore it.** The overflow check `pastTheEdge` (`e2e/layout.ts:79-81`, `82-150`) measures element edges and walks ancestors only up to `body`, so it already disregards the html/body clip.

**Proposal (needs OK; low priority; a separate small step):**
- Remove the rule from `index.css`.
- Run the full `responsive`, `backdrop` and `pastTheEdge` checks at 320–1280, every page and every state.
- Add one assertion, `document.documentElement.scrollWidth <= clientWidth`, on every page and state at 320, 390, 768 and 1280, and at 200 % text (as IMPLEMENTATION_OUTLINE.md P10).
- Update the comment at `e2e/layout.ts:79-81`.
- **Places to check first:** the elements that scroll sideways on purpose. These are the header row (`AppShell.tsx:274`, `overflow-x-auto`, which F-12 proposes to wrap instead) and the two forecast tables (`ForecastPanel.tsx:60,149`).
- If anything spills, fix that element and keep the rule out.

### 8.4 Other guide items, already met

- Scroll padding at the bottom ≥ the bar height: 4 rem against 3.5 rem (`index.css:122-126`).
- Inputs are 16 px.
- `dialog:modal` has overscroll containment (`index.css:110-118`).
- `touch-action: manipulation` is set (`index.css:97-104`).

---

## 9. Loading skeletons and layout shift (F-02, F-18)

### 9.1 Baseline

Production CLS from `evidence/prod-metrics.json` (Stage 0; one unthrottled run each):

| Page | 320 | 390 | 768 | 1280 | 1440 |
|---|---|---|---|---|---|
| Today | 0.171 | 0.283 | 0.155 | 0.104 | 0.106 |
| My Home | 0.468 | 0.416 | 0.348 | 0.226 | 0.199 |
| Better Habits | 0.314 | 0.284 | 0.157 | 0.196 | 0.143 |

**Cause, on Today at 390:**
- the skeleton is 160 px tall: y 230–390 in `local-today-loading-390x844-first.jpg`;
- the verdict card that replaces it is about 410 px: y 230–640 in `local-today-within-390x844-first.jpg`;
- the generic `Loading` (`States.tsx:7-23`) draws three bars of 24, 56 and 16 px whatever it stands for.

### 9.2 Target and method

**Target:** CLS under 0.1 on Today, My Home and Better Habits, at 320, 390, 768 and 1280.

**Measurement:** a new e2e check.
- It sums `layout-shift` entries without recent input, from a `PerformanceObserver`.
- The API responses are delayed by the stub, so the skeleton really shows.
- Its file is chosen in `IMPLEMENTATION_OUTLINE.md`.
- No CLS check exists in `e2e/` today.

**Method:**
1. **A skeleton mirrors the rows of the content it stands for**, with the same panel classes, padding and gaps as the final card. Each bar is one line of the final text class: `h-[1lh]` inside an element with that text class. So a bar for the verdict is 36 px at `text-3xl`, and it grows with enlarged text. Browser support for the `lh` unit (Chrome 109+, Safari 16.4+, Firefox 120+) is from memory and not verified here; Stage 5 confirms it, or falls back to fixed `h-*` steps. Bars are `bg-text-dark/10`, decorative and `aria-hidden`, as today.
2. **The number of lines per bar** is the common final state at each width. The heights are **measured in Stage 5** from the built cards, not guessed here.
3. **The label is visible** (F-18): "Loading forecast…" as the first row in `text-sm text-text-dark-muted`, where the weather line will appear. The `aria-busy` box keeps the label as its accessible text.
4. **No content is inserted above content already on screen.** Slots that appear late are reserved from the first paint.

### 9.3 Reserved slots

| Slot | File:line today | Final content (rows) | Proposal |
|---|---|---|---|
| Today verdict | `AppShell.tsx:396` (`<Loading label="Loading forecast" />`) | Weather row; verdict H2 (2 lines on phones, 1 at `lg`); tag and provenance; meaning sentence (unless F-22 is accepted); caveat | Skeleton in `TodayLead`'s shape (same `section`, weather row with its `border-b`, then bars per row) |
| Today recommendation (building) | `DailyPlanSection.tsx:238-240` | `PlanCard` (title, 3–4 lines, "Why?" row of 44 px), "Made by…", "See your full day" (44 px) | Skeleton in `PlanCard`'s shape inside the panel, which is already there |
| My Home "Today, for your home" | `MyHome.tsx:50-54,74-129`. The section only appears once the plan is building, failed, stale or has indoor cards, so it is inserted after first paint. | Heading, air line, 1–2 cards, "Made by…" | Render the section from first paint whenever a place is set. Skeleton cards on the flowing grid. If a ready plan has no indoor cards, keep the section with one line instead of removing it. The line is new copy and **needs OK**; the shipped "No suggestions for your answers today." (`DailyPlanSection.tsx:42`) could be reused. |
| Guide groups (My Home, Better Habits) | `MyHome.tsx:156`, `BetterHabits.tsx:42` | Group heading and its cards, on the flowing grid (section 3.3) | One skeleton group: a heading bar and 3 card bars on the same grid |
| Saved plans (My Profile) | `SavedPlansList.tsx:51,132`. The initial state is `hidden`, the same as "no session", so the section is absent at first. | Heading and a list, or the empty line | Render the heading at once with a one-line skeleton while the session is checked. Then show the list, or the no-session line "No saved plans yet. Use Save plan under See your full day on Today." Splitting "checking" from "no session" avoids flashing the empty line to someone who has plans. |

**Images on Landing:** they already reserve their space with `width`/`height` (`Landing.tsx:169-172`, `188-191`). No change.

---

## 10. The static 404 page (F-08)

- **New file:** `client/public/404.html`. Netlify serves it with status 404 for any path no rule matches (`netlify.toml` has rules only for `/api/*`, `/app`, `/app/*` and `/privacy`).
- **The CSP limits it.** `client/public/_headers` allows inline styles (`style-src … 'unsafe-inline'`) and fonts from `'self'`, but no inline scripts. So the page is HTML and CSS only, with no JavaScript.
- **Its colours are copied by hand** from the tokens: `bg`, `text`, `text-muted`, `primary`, `secondary` ring. This is the only copy of token values outside `index.css`.
- **Proposal:** a comment naming `index.css` as the source, and a small check in `styles.test.ts` that the hex values in `404.html` exist in `index.css`, so the copy can't drift silently.
- **Layout:** dark, like Landing. It holds:
  - the "AirAware AI" wordmark;
  - the H1 "We couldn't find that page";
  - "Go to AirAware" (`/app`) as the primary link: `primary` fill, `bg` label, 10.47:1;
  - "Home" (`/`) as the outlined link;
  - Inter loaded through the same `@font-face`.
- **Copy:** this is new copy; see the brief §3.

---

## 11. What is not proposed, and why

| Not proposed | Why |
|---|---|
| New colour tokens | Every role maps to an existing token (section 1.2). |
| A component library (shadcn, Radix or similar) | The app has 30 components already built on native elements: `<dialog>`, `<details>`, `<fieldset>`, native inputs. They carry the accessibility behaviour, and tests pin them. A library would add weight, a second styling system and new focus behaviour to re-test, for no state the app lacks. |
| A motion library | All motion is CSS and stops within 5 s. Nothing proposed needs JavaScript animation. |
| Shadows | None exist. Overlays separate by backdrop and border. A shadow needs a colour outside the tokens. |
| A second font | `DESIGN.md` §4 and the pack (03 §3) say one family. |
| Frosted panels, `backdrop-filter` | Rejected in the backdrop spec. |

---

## 12. Where the code and the brief disagree (the code wins)

| Brief says | Code says | Effect here |
|---|---|---|
| Baseline backdrop has "fog at the city base" (§4) | No fog layer; the owner removed it on 22 Nov (`scene.ts`, `DESIGN.md` §8) | No fog in either direction |
| The html/body clip contains the backdrop overhang (§6) | The clip predates the backdrop (`feb0805`, 18 Nov). The backdrop root clips itself (`CitySkyline.tsx:72-73`). | Section 8.3: it is a page-level guard; removing it is its own step |
| Direction A: "secondary blue for links" | `secondary` on `surface-light` is 2.27:1; shipped links on light are underlined `text-dark` | Links on light stay `text-dark`; `secondary` only on dark |
| "Amber only for Not current" (§4 A) | `warning` also draws the sun glow and heat shimmer (backdrop) and the above-limit marker in details (`AirReadout.tsx:26`, paired with text) | In UI chrome, amber stays only on the stale banner. The backdrop's illustration uses and the detail marker stay. |
| Panels "radius ~12 px" (§4 A), stated as the baseline | Shipped panels are `rounded-lg`, 8 px | 12 px is a class change on every top-level panel (a subset of the 25 `rounded-lg` uses); needs OK |
| `text-wrap` balance/pretty to add (§6) | Already in `index.css:179-192` | Keep |
| Phone verdict 26–28 px, B Landing headline 40 px | Not Tailwind steps | Nearest steps proposed; arbitrary sizes need OK |
| `max(0.75rem, env(...))` under the bar (§6) together with a first-screen target against a bar at y 787 (§3) | The two can't both hold: the minimum moves the bar top to y 775 | Section 8.1; owner picks |
| Shadows "only on overlays" | No shadows anywhere, overlays included | No shadows proposed |
| Focus order "content, then bottom bar" on phones by a DOM order change with `md:order` (§2, F-13) | `md:order` reorders only siblings in the header. The nav is in the header, before `main`. | Putting the chip before the nav is achievable. Content before the bar on phones needs a structural change (see `COMPONENT_REUSE_MAP.md`); open question. |

---

## 13. Needs OK (design-system items only)

| Item | Section |
|---|---|
| Ring in the title block uses `text-dark` | 1.4, 4.2 |
| Current-page outline in `text-muted` | 1.4, 4.1 |
| Stale banner as a solid `warning` fill | 1.4, 4.1 |
| Place chip border `text-muted` | 1.4 |
| Panel radius 12 px (A) | 3.4 |
| Arbitrary type sizes (26–28 px verdict, 40 px B headline, and the other mockup sizes in §2.3), if wanted | 2.2, 2.3 |
| "Reload forecast" inside the banner (the §4.2 ring rule assumes this) or beside it (mockup B) | 4.1, 4.2 |
| B forecast error: (1) the shipped light `ErrorState` nested in the masthead with `on-light` (no new variant); (2) a dark error block in the masthead (mockup B; needs a dark `ErrorState` and re-checked button contrast) | 4.1, 7.3 |
| B current-page pill: light `text` fill (mockup B), or the `text-muted` outline above | 1.4 |
| B uppercase section labels against `DESIGN.md` §4 | 2.3 |
| Safe-area bottom minimum of 0.75 rem | 8.1 |
| Removing the html/body `overflow-x: clip` | 8.3 |
| My Home empty line when a plan has no indoor cards | 9.3 |
| `lg:opacity-60` on the near row (F-26) | 7.2 |
