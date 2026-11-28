# 08 · Component library and dependency decisions

**Date:** 28 Nov 2026. **Status:** proposal, read-only audit. Nothing was installed, and no application file was changed.

**Labels used in this doc:**
- **OBSERVED:** seen in this repo's code or docs (file:line), or returned by a public registry or vendor page on 28 Nov 2026 (named each time).
- **RECOMMENDED:** this team's proposal. It needs the owner's OK.
- **UNVERIFIED:** an estimate or vendor claim not checked against this app.

I did not load the live site or any screenshot for this doc, so nothing here is claimed from a rendered page.

**Default answer: don't install.** A dependency is recommended only where a concrete need exists that the current code, the platform or an installed package can't meet. None of the candidates clears that bar today.

---

## 1. Verdicts at a glance

| Candidate | Verdict | One-line reason | What would change the verdict |
|---|---|---|---|
| lucide-react | **Keep** (already installed) | Covers every icon in use, tree-shaken named imports | Nothing; don't add a second icon set |
| shadcn/ui | **Don't install** | Not present (the master guide is wrong about this). Its token names don't exist in our `@theme`, and native elements already do the job | A widget the platform can't give accessibly (none found) |
| Radix UI | **Don't install** | Native `<dialog>`, `<details>` and an APG combobox already ship, with tests | Same as above, e.g. a real menu button or a roving-focus toolbar |
| Origin UI (now coss.com/ui) | **Don't install; reference only** | Duplicates shadcn's role; the repo has moved | Same as shadcn |
| assistant-ui | **Don't install. Improve the existing chat** | `useAsk` owns behaviour a generic runtime would duplicate or fight; no streaming exists to benefit from | Approved streaming, multi-thread history or branching (all out of scope today) |
| React Bits | **Reference only** | Decorative; MIT + Commons Clause licence; some components need Motion, GSAP or WebGL; Landing's skyline is fixed by G2 | An approved Landing effect that CSS can't do |
| Magic UI | **Reference only** | Marketing effects; most need Motion | Same |
| Motion Primitives | **Reference only** | Built on Motion, which we don't have | Motion approved first |
| Aceternity UI | **Reference only** | Custom licence; decorative; needs Motion | Same |
| Motion for React | **Don't install** | CSS already does every motion in the specs (press, answer rise, scroll reveal, sky fade) | A layout or exit animation that CSS and View Transitions can't do, approved by the owner |
| GSAP | **Don't install** | No approved scroll story; CSS scroll-driven `.reveal` exists | An approved, scripted Landing sequence |
| Three.js / R3F / Drei | **Don't install** | H4/H5 fixed the city as a tokenised SVG; a 3D city adds weight and data-integrity risk | An approved 3D prototype that beats the SVG on a user goal |
| Spline | **Don't install** | Proprietary runtime that fetches remote scenes; blocked by our CSP | Same as 3D, plus a CSP change |
| Rive | **Don't install** | No use case; WASM runtime needs a CSP change | An approved interactive illustration |
| Theatre.js | **Don't install** | Only useful with a 3D scene; repo last pushed Aug 2024 | Never on its own |
| Recharts | **Don't install** | The hand-drawn SVG chart is accessible, tested and tiny | A chart type the SVG can't reasonably draw |

---

## 2. What the app is built with today (OBSERVED)

### 2.1 Dependencies

`client/package.json:14-19` lists four runtime dependencies:
- `@supabase/supabase-js`;
- `lucide-react` ^1.66.0 (1.66.0 installed);
- `react` and `react-dom` ^19.3.1 (19.3.1 installed).

Dev tooling (`client/package.json:20-34`): Vite ^8.3.6 (8.3.8 installed), `@tailwindcss/vite` and `tailwindcss` ^4.3.4, Vitest, Testing Library, axe-core, TypeScript ~7.0.

**Not present**, checked in the root `node_modules` (the workspaces hoist there; `client/node_modules` holds only tool caches: `.tmp`, `.vite`, `.vite-temp`, `.vitest-cache`):
- `@radix-ui/*`, `radix-ui`, `@base-ui-components/*`;
- `clsx`, `tailwind-merge`, `class-variance-authority`, `cmdk`, `vaul`, `sonner` (the usual shadcn companions);
- `motion`, `framer-motion`, `gsap`, `three`, `recharts`, `@assistant-ui/*`.

There is no `components.json` anywhere under `client/`. **shadcn/ui and Radix are not used.**

Source imports from outside the repo (all non-test files in `client/src`): `react`, `react-dom/client`, `@supabase/supabase-js` (1 file) and `lucide-react` (6 files). Nothing else.

### 2.2 How the UI pieces are built

| Need | How it is built | Where |
|---|---|---|
| Modal | Native `<dialog>` with `showModal()`; `closedby="any"` for click-outside where supported; Escape and focus return from the platform; content mounts only while open | `client/src/components/PlaceChip.tsx:28-33, 58-85` |
| Dialog in tests | A small jsdom polyfill | `client/src/test/dialog.ts:5-7` |
| Disclosures | Native `<details>`/`<summary>`, 44 px summaries (`min-h-11`) | `ForecastPanel.tsx:141`, `SourcesPanel.tsx:21`, `AirDetails.tsx:43`, `DailyPlanSection.tsx:317`, `PlanCard.tsx:64`, `AskEntry.tsx:201`, `Ask.tsx:184` |
| Place search | Hand-built APG combobox: `role="combobox"`, `aria-activedescendant`, `role="listbox"`/`option` | `client/src/features/location/LocationSearch.tsx:147-190` |
| Buttons | Plain `<button>` with Tailwind classes; global press feedback in CSS | `index.css:180-189`, `AskEntry.tsx:22-25` |
| Chat | `useAsk` (state) + `Ask.tsx` (page) + `AskEntry.tsx` (exchange) | see 2.3 |
| Chart | Hand-drawn SVG, pure maths in `chart.ts` (80 lines), text summaries under the chart | `ForecastChart.tsx:86-213`, `chart.ts:1-30` |
| City backdrop | Inline SVG layers, token colours via `color-mix`, CSS transitions | `CitySkyline.tsx:1-80`, `skylineGeometry.ts` |
| Motion | CSS only: press, answer rise (`@starting-style`), scroll reveal (`animation-timeline: view()`), rain and cloud keyframes, 700 ms sky fade, global reduced-motion cap | `index.css:45-69, 180-225, 270-284`, `CitySkyline.tsx` (FADE constant) |
| Cycling hint | JS with a `matchMedia` reduced-motion check | `CyclingHint.tsx:8-32` |
| Tokens | `@theme static` with `--color-*: initial`, so Tailwind's default palette is removed and only our tokens exist | `index.css:26-75` |
| Translucent cards | `card-surface` utility, solid under reduced transparency | `index.css:87-100` |

### 2.3 How the chat works (the part assistant-ui would touch)

- **The shell owns the state.** `AppShell.tsx:129` calls `useAsk(place, context, resets, setContext)` and passes it to `Ask` as a prop (`Ask.tsx:51`), so Today's small box and the Ask page share one thread.
- **Reset by place.** The thread empties during render when the place or a "Delete everything" changes the key (`useAsk.ts:70-82`).
- **Limits.** 10 entries max (`useAsk.ts:51, 104`); one request at a time (`useAsk.ts:179`).
- **History rule.** A typed question carries up to 2 earlier typed questions with their card ids. Medical and failed ones are left out (`useAsk.ts:135-154`). This is the J26 D2 rule.
- **Questions back.** Answering one writes the shared household context, used by Today, My Home and Profile. It re-asks only if the answer changes the cards; otherwise a local "Noted" reply is added with no request (`useAsk.ts:196-236`).
- **Structured answers.** Each reply carries cards, sources, forecast provenance, `generatedBy` and follow-ups, and is rendered by `PlanCard` with "Model forecast", the retrieved time and "Not current" (`AskEntry.tsx:84-97, 159-239`).
- **Focus and scroll.** Focus goes to the new exchange's heading with an instant scroll. There is a second scroll when the reply lands, only if the user hasn't moved (`AskEntry.tsx:295-321`). A live `<output>` announces the status (`Ask.tsx:164`).
- **Composer.** A `<textarea>` with `field-sizing-content`. Enter sends and is ignored during IME composition. 200 characters max (`Ask.tsx:254-276`).
- **Copy.** An icon button, a live result line and a tick once copied (`AskEntry.tsx:116-138`).
- **No streaming.** `askAirAware` is one POST that returns a complete `AskAnswer` (`client/src/services/api.ts:211-216`). Streaming is out of scope in the J26 design (`docs/superpowers/specs/2026-11-28-ask-claude-grounded-design.md:59`).

### 2.4 Constraints any dependency must meet (OBSERVED)

| Constraint | Source | Effect on dependencies |
|---|---|---|
| CSP `script-src 'self'`, no `'wasm-unsafe-eval'`; `connect-src` is self plus the Supabase origin only; `img-src 'self' data:` | `client/public/_headers:4` | No CDN scripts. No remote scene or WASM fetches. WASM compilation is likely blocked without a CSP change |
| No route splitting: one JS chunk for every route | F-37 in `docs/redesign/audit/FINDINGS_REGISTER.md:75` | Any new library ships on every route, Landing and Privacy too, unless a `React.lazy` split comes first |
| Current bundle | Local `client/dist` (built 28 Nov 14:58): `index-6c3veejj.js` 579,523 B raw, **164,692 B gzip -9** (measured with `gzip -9 -c \| wc -c`). Production at audit time (F-37): 148 kB transferred, 553 kB raw | The baseline for every comparison below. These are two different builds, so they are not mixed |
| Locked tokens | `index.css:26-27`, `DESIGN.md` §3, `COMPONENT_REUSE_MAP.md` §"Why no new component library" | Any kit's colours, radii and focus rings must be rewritten to our tokens |
| "No new dependency" gate | `REDESIGN_ACCEPTANCE_CRITERIA.md:59` (G-04); `OWNER_DECISIONS.md:15`; `IMPLEMENTATION_OUTLINE.md:28` | Any install needs an explicit owner decision row |
| CSS-only motion decision | `docs/UX_AUDIT.md:393` (D5, approved 20 Nov) | Motion for React was already declined once |
| Cityscape: no runtime library or animation package without approval, no Framer Motion | `AirAware_AI_Adaptive_Cityscape_Background_Spec.md:203, 267, 413` | Rules out 3D and animation libraries for the backdrop |
| City art direction fixed as tokenised SVG | `OWNER_DECISIONS.md` H4, H5 | A 3D or Spline city would reverse an owner decision |

---

## 3. Candidate-by-candidate

**How to read the sizes.** Sizes come from the Bundlephobia API (28 Nov 2026) for the package's whole entry point, minified and gzipped. They are **upper bounds**: a tree-shaken import can be much smaller. Real impact can only be known by building a branch. npm `unpackedSize` is not used as a bundle figure. Percentages compare against the local 164.7 kB gzip baseline. Versions, licences and peer ranges come from the npm registry `/latest` endpoint, same day.

### 3.1 lucide-react: keep

- **Use case:** functional icons next to text labels. Six files import it (`AppNav.tsx:1`, `PlaceChip.tsx:1`, `AskEntry.tsx:1` (Copy, Check), `helpChoices.ts:1`, `Landing.tsx:1`, `Welcome.tsx:1`). `DESIGN_SYSTEM_PROPOSAL.md` §5 lists five of these and misses `AskEntry.tsx`'s `Copy`/`Check`.
- **Compatibility:** installed 1.66.0, ISC, React 19 peer OK. Latest is 1.83.0, but no upgrade is needed.
- **Bundle:** named ESM imports, so only the used icons ship (a few hundred bytes each; UNVERIFIED per icon).
- **Accessibility:** icons are `aria-hidden` beside a text label or an `aria-label` (`AskEntry.tsx:122-133`).
- **Install needed:** no. **Rule (RECOMMENDED):** any new icon comes from lucide; no second icon set.

### 3.2 shadcn/ui: don't install

- **Use case claimed by the master guide:** "Keep existing shadcn/ui components" (`AirAware_AI_UI_UX_Motion_3D_Claude_Code_Master_Guide.md:244, 335-336, 346, 1011, 1024`). **That premise is false for this repo** (section 2.1). Adopting shadcn would be a new system, not keeping an existing one.
- **Why existing code is enough:** every control shadcn would give us already exists natively and is pinned by tests (section 2.2). `COMPONENT_REUSE_MAP.md` §"Why no new component library" and `DESIGN_SYSTEM_PROPOSAL.md` §11 reached the same conclusion.
- **Compatibility:** the latest `shadcn` CLI is 4.23.1 (MIT, registry). From general knowledge, not re-checked this session (UNVERIFIED):
  - it supports Vite and Tailwind v4;
  - it needs a `components.json`, a path alias, `clsx`, `tailwind-merge`, `class-variance-authority` and the `radix-ui` primitives;
  - its components use token names such as `primary-foreground`, `ring` and `background`.

  OBSERVED: our `@theme` clears every colour (`index.css:27`) and defines no `*-foreground`, `ring` or `background` tokens. If the names above are right, every copied component would need rewriting, which makes it a second design system in all but name.
- **Bundle:** varies per component. Each one pulls its Radix primitive (a dialog is about 13 kB gzip upper bound, see 3.3) plus the helper libraries.
- **Licence:** MIT (GitHub API).
- **Accessibility:** good, through Radix, but it replaces platform behaviour we already test (dialog focus return, `<details>` semantics) with JS behaviour we would have to re-test, including forced colours.
- **Alternative:** the existing native elements.
- **Install needed:** no.

### 3.3 Radix UI: don't install

- **Use case:** accessible dialogs, popovers, menus, tabs and tooltips.
- **Why existing code is enough:**
  - **Dialog:** the native `<dialog>` already gives focus containment, Escape and focus return (`PlaceChip.tsx:7-9` comment).
  - **Disclosures:** native.
  - **Combobox:** already hand-built to the APG pattern.
  - **Missing widgets:** the app has no menus, tabs or toolbars, and the redesign docs propose none.
- **One small gap found (OBSERVED, `AskEntry.tsx:123-124`):** the Copy button's tooltip is the native `title` attribute. It doesn't show on keyboard focus or on touch; the `aria-label` does carry the name. **RECOMMENDED fix with no dependency:** a CSS-only label shown on `:hover` and `:focus-visible`, or the native `popover` attribute. Radix Tooltip isn't needed for one button.
- **Compatibility:** `radix-ui` 1.8.1 and `@radix-ui/react-dialog` 1.3.1 (registry), React `^19.0` peer OK. Unstyled, so no Tailwind coupling (from general knowledge, UNVERIFIED).
- **Bundle:** `@radix-ui/react-dialog` 39.5 kB min / **13.2 kB gzip** upper bound (+8 %).
- **Licence:** MIT.
- **Accessibility:** strong, WAI-ARIA patterns. But it would replace platform behaviour we already have.
- **Alternative:** native `<dialog>`, `popover`, `<details>`.
- **Install needed:** no.

### 3.4 Origin UI (now coss.com/ui): don't install; reference only

- **OBSERVED:** the guide's repo `origin-space/originui` now redirects to `cosscom/ui` ("the official design system of Cal.com"), MIT, active (GitHub API).
- **Use case:** ready-made shadcn-style application components. It overlaps shadcn, so all of 3.2's objections apply, and it adds a third party's visual identity, which the brief says not to copy.
- **Compatibility (React 19 / Vite / Tailwind v4), bundle, accessibility, dependencies:** not checked this session (UNVERIFIED).
- **Alternative:** the existing native elements.
- **Install needed:** no.

### 3.5 assistant-ui: improve the existing chat instead

The master guide asks for three options to be compared (`Master_Guide.md:375-381`). All three were checked against what `useAsk` does today (section 2.3).

**Package facts (OBSERVED, registry 28 Nov):**
- `@assistant-ui/react` 0.15.38, MIT, React `^18 || ^19` peer.
- It depends on `radix-ui`, `zustand`, `zod`, `assistant-stream`, `assistant-cloud`, `react-textarea-autosize`, `safe-content-frame` and three `@assistant-ui/*` packages.
- Bundlephobia: 931.6 kB min / **280.0 kB gzip** whole-package upper bound, which is about +170 % of today's app. Tree-shaking would cut it, by an amount we can't know without a build (UNVERIFIED).
- Version 0.x: the API can still change between minor versions.

**Runtime facts (vendor docs, WebFetch summaries, 28 Nov):**
- **LocalRuntime:** "State lives inside the runtime by default." You implement `run()`, which may return one completed result (no streaming needed). Content parts are `text`, `reasoning` and `tool-call`; structured cards would go through tool UI renderers. For an existing store, the docs point to ExternalStoreRuntime.
- **ExternalStoreRuntime:** "Bring your own … state manager." `messages` and `onNew` are required; `convertMessage` and `isRunning` are optional. Streaming is not required. It renders no UI itself: the `Thread` component is code you add to your project. Its exact styling and Radix use were not confirmed.

| | A. Improve the existing chat | B. assistant-ui LocalRuntime + adapter to `/api/v1/assistant/answer` | C. assistant-ui ExternalStoreRuntime over `useAsk` |
|---|---|---|---|
| Who owns state | `useAsk` in `AppShell` (unchanged) | The runtime. `useAsk`'s rules would have to be rebuilt around it or sit beside it, giving two sources of truth | `useAsk` (good fit in principle) |
| Reset on place / delete (`useAsk.ts:70-82`) | Kept | Must be re-implemented via `thread.reset` | Kept |
| History rule, medical filter (`useAsk.ts:135-154`) | Kept | Adapter rebuilds it from runtime messages | Kept |
| Topic chips, starters, retry, question-back answers writing household context (`useAsk.ts:178-236`) | Kept | Not modelled by `run()`; each needs custom wiring | Only `onNew` maps cleanly. Chips, retry and follow-ups stay custom handlers outside the runtime |
| Cards, provenance, "Not current", Sources and limitations | Kept (`AskEntry.tsx`, `PlanCard`) | Squeezed into tool-call parts or custom renderers | Custom renderers; we would still write the same components |
| Focus and scroll rules (`AskEntry.tsx:295-321`), live `<output>` | Kept and tested | Replaced by library behaviour; needs re-audit | Partly replaced; needs re-audit |
| Branching, edit, regenerate, thread list | Not wanted (J7: no new chat or history) | Main selling points, unused | Unused |
| Streaming | None (J26 out of scope); the guide forbids fake typing (`Master_Guide.md:381`) | Unused | Unused |
| Tokens and styling | Ours | Library components to re-tokenise | Same |
| Bundle | +0 | Up to about +280 kB gzip (upper bound) | Same |
| Test churn | Small and targeted | Large: `Ask.test.tsx`, `AskEntry.test.tsx`, `useAsk.test.ts` | Large for the UI tests |
| Risk | Lowest | Highest | Medium-high |

**Verdict (RECOMMENDED): A.** ExternalStoreRuntime is the only workable assistant-ui option, but what it gives us is a message list, an autosizing composer and an action bar. We already have all three (`Ask.tsx:254-276`, `AskEntry.tsx:116-138`). We would gain no feature and take on a 0.x API, re-tokenising and a re-audit of focus behaviour the owner has already approved.

**What A looks like (RECOMMENDED, no dependency).** Both items are new proposals from this audit, not from earlier docs, and each needs the owner's OK.
- A visible tooltip for Copy on focus and hover (3.3).
- An optional "Jump to latest" link when the user has scrolled up and a reply lands, using a plain `IntersectionObserver` on the newest article. The Ask UX spec already asks not to force-scroll someone reading older messages (`AirAware_Ask_AirAware_Assistant_Interaction_UX_Spec.md:576`), and the code honours that (`AskEntry.tsx:302-321`). This link would only add a way back down.
- The exchange rise stays CSS (`index.css:193-204`).

**assistant-ui's other fields:**
- **Accessibility:** the vendor claims accessible primitives. Not checked this session, and they would replace focus and live-region behaviour we already test.
- **Vite / Tailwind v4 fit:** not checked this session (UNVERIFIED).

**Flip condition:** an approved streaming endpoint plus persisted multi-thread history. That is a separate architecture decision under `AGENTS.md` §9 and the J26 out-of-scope list.

### 3.6 React Bits, Magic UI, Motion Primitives, Aceternity UI: reference only

All four are copy-paste galleries of decorative components, not installable design systems.

| | React Bits | Magic UI | Motion Primitives | Aceternity UI |
|---|---|---|---|---|
| Licence (OBSERVED) | **MIT + Commons Clause**: use in a product is allowed; selling or redistributing the components is not (repo `LICENSE.md`) | MIT (GitHub API) | MIT (GitHub API) | Custom "Aceternity License" (ui.aceternity.com/licence, WebFetch summary). The guide's repo URL `aceternity/aceternity-ui` returns 404 |
| Typical dependencies | Varies per component: some CSS, some Motion, GSAP or WebGL (UNVERIFIED per component) | Motion and Tailwind (UNVERIFIED) | Motion ("Motion-based React components", `Master_Guide.md:242`; repo not read) | Motion and Tailwind ("for React, Next.js, Tailwind CSS and Motion") |
| React 19 / Vite / Tailwind v4 | Not checked this session | Not checked | Not checked (the guide itself says "verify compatibility with current Motion version") | Not checked |
| Fit with AirAware | Animated text, particles and backgrounds. Both specs say to avoid particles (`Cityscape_Spec.md:148`, `DESIGN.md` §9) | Marketing hero effects | Interaction patterns | Hero effects, "too decorative for forecast screens" (the guide's own words, `Master_Guide.md:243`) |
| Accessibility | Per component; many effects animate text, which conflicts with WCAG 2.2.2 unless paused | Per component | Per component | Per component |

- **Why existing code is enough:**
  - Landing already has a scroll reveal and a static decorative skyline (`index.css:211-225`, owner G2).
  - Most of these components bring Motion (3.7), and React Bits and Aceternity carry non-standard licences.
  - Borrowed effects also pull the look toward other sites, which works against a distinctive identity.
  - The owner's guide names React Bits as the first choice for Landing effects (`Master_Guide.md:349`), so this is a judgement for the owner, not a hard rule.
- **Bundle:** each component that uses Motion brings Motion (see 3.7).
- **Alternative (RECOMMENDED):** study them for ideas only, then build any approved effect in CSS with our tokens.
- **Install needed:** no.

### 3.7 Motion for React vs CSS vs GSAP

| | CSS (current) | Motion for React | GSAP |
|---|---|---|---|
| Package (OBSERVED) | none | `motion` 14.14.0, MIT, React `^18 \|\| ^19` peer | `gsap` 3.15.1, "Standard 'no charge' license" (registry text; terms not reviewed this session) |
| Size | 0 | Bundlephobia whole-entry upper bound: 187.9 kB min / **64.3 kB gzip** (+39 %). Vendor-stated (motion.dev "reduce bundle size" page, WebFetch summary): `motion` component about 43 kB; `m` + `LazyMotion` about 5 kB initial, +24 kB `domAnimation` or +38 kB `domMax`; `useAnimate` mini 3.3 kB. These measure different things, and neither has been built here | 70.6 kB min / **27.4 kB gzip** core upper bound (+17 %), plus plugins such as ScrollTrigger |
| What the app needs (from DESIGN.md §9 and the specs) | Press, answer rise, scroll reveal, rain and clouds, sky fade, skeleton pulse: **all already done in CSS** | Exit animations, layout (FLIP) animations, gestures | Timelines and scroll stories |
| Platform cover for the "Motion-only" cases | `transition-behavior: allow-discrete` + `@starting-style` animate `<dialog>` and `[popover]` in and out. Same-document View Transitions cover simple layout moves. Browser support should be checked at build time (UNVERIFIED here); without support the change happens instantly, which is acceptable | n/a | n/a |
| Reduced motion | Global cap (`index.css:270-284`) plus `motion-safe:` | Has reduced-motion hooks and config (general knowledge, UNVERIFIED) | Manual `matchMedia` |
| Earlier decision | D5 (20 Nov): CSS only, approved | Declined in D5 | Guide: "landing-page scroll sequence only, if justified" |

**Verdict (RECOMMENDED): stay CSS-only.** Every motion in the redesign docs is a short opacity or transform change that CSS already does. **Flip condition for Motion:** an owner-approved interaction that needs coordinated exit or layout animation across React state changes, where View Transitions fall short. Even then, `m` + `LazyMotion` only, behind a route split. **GSAP:** only for an approved, scripted Landing sequence. None exists.

### 3.8 Three.js, React Three Fiber, Drei, Spline, Rive, Theatre.js: don't install

| | Three.js | R3F | Drei | Spline | Rive | Theatre.js |
|---|---|---|---|---|---|---|
| Version, licence (registry) | 0.187.0, MIT | 9.8.2, MIT | 10.7.9, MIT | `@splinetool/runtime` 2.0.225: **no licence field**; `react-spline` 4.2.0, no licence field | `@rive-app/react-canvas` 4.41.0, MIT (runtime; the editor is a hosted product) | `@theatre/core` 0.7.2, Apache-2.0; repo last pushed **Aug 2024** |
| React 19 / Vite | n/a (plain JS) | Peer `react >=19 <19.4`: fits 19.3.1 but **caps a future React 19.4 upgrade**. Also lists expo and react-native peers | Peer React `^19`, R3F `^9` | `react-spline` peers: `react: *` and `next >=14.2` | Peer up to `^19.0` | n/a |
| Size (upper bound, gzip) | 185.7 kB (+113 %) | 57.7 kB + three | 521.5 kB whole package (tree-shakes heavily, UNVERIFIED) | 282.1 kB runtime | 95.0 kB JS; a separate WASM runtime is likely (UNVERIFIED) | 31.4 kB |

For R3F's expo and react-native peers and Spline's `next` peer, `peerDependenciesMeta` was not checked, so it isn't known whether they are optional.
| CSP (`_headers:4`) | No change for core; Draco/Basis decoders use WASM (UNVERIFIED) | Same as three | Same | Fetches scenes from Spline's servers (UNVERIFIED this session), so `connect-src` would block it | Loads a WASM runtime (by default from a CDN, UNVERIFIED this session); `script-src 'self'` without `'wasm-unsafe-eval'` likely blocks it | n/a |
| Accessibility | A `<canvas>` has no semantics; it needs a text equivalent, reduced-motion and low-GPU fallbacks | Same | Same | Same | Same | Same |

- **Why existing code is enough:** the owner decided the city on 24-26 Nov (H4, H5): a tokenised SVG with three air looks, weather-driven clouds and rain, and a 700 ms fade. The cityscape spec forbids particles and fast motion and asks for CSS-based, low-cost motion (`Cityscape_Spec.md:143-151, 203`).
- **Data-integrity risk:** a richer 3D city invites smog or particle visuals that would imply measured pollution. The rules forbid inferring pollution from weather or showing it as observed.
- **Alternative (RECOMMENDED):** improve depth inside the existing SVG (layers and token mixes), as H4 already plans.
- **Install needed:** no. A 3D prototype, if ever wanted, belongs in a throwaway file under `docs/redesign/prototypes/` with an owner decision first, never in `client/`.

### 3.9 Charts: existing SVG vs Recharts

| | Existing (`ForecastChart.tsx` + `chart.ts`) | Recharts |
|---|---|---|
| Package | none (216 + 80 lines, tested by `ForecastChart.test.tsx` and `chart.test.ts`) | 3.11.2, MIT, React `^19` peer OK, 10 dependencies |
| Size | about 0 (part of the app chunk) | 659.6 kB min / **177.1 kB gzip** upper bound (+108 %) |
| Data honesty | Gaps break the line (`chart.ts` `valueRuns`). A lone hour shows as a dot. No limit line, because India's limits are 24-hour averages (`ForecastChart.tsx:10-12`). The marker says "At load", never "now" (`:169-175`). The unit only shows if the provider sent it (`:56`) | Each of these would need re-implementing and re-testing in Recharts props |
| Accessibility | `role="img"` + `aria-label`, plus visible text summaries for both pollutants (`:86-88, 210-213`). Line style, not colour, separates the series, with a legend (`:13-26, 192-209`) | Recharts 3 has an `accessibilityLayer` for keyboard tooltips (UNVERIFIED for this version) |
| Responsiveness | Container queries set tick density (`:33-36, 76`) | A JS-measured responsive wrapper (general knowledge, UNVERIFIED) |

| Exact figures | Already shipped: a closed `<details>` "Hourly forecast (N hours)" holds a captioned, keyboard-scrollable table with units, sticky headers and a no-value mark (`ForecastPanel.tsx:141-190`). This covers the "exact value on hover" need that chart tooltips usually meet | Tooltips only, unless a table is also built |

**Verdict (RECOMMENDED): keep the existing chart.** The guide agrees: "don't add a second chart library" (`Master_Guide.md:350`).

---

## 4. Where this doc disagrees with existing docs

| Doc says | Code or newer decision says | Resolution here |
|---|---|---|
| Master guide: "the existing AirAware project already uses shadcn-style components", "Keep existing shadcn/ui + Radix" (`Master_Guide.md:244, 335-336, 346, 1011, 1024`) | No shadcn, Radix or `components.json` (section 2.1) | **The guide's premise is wrong for this repo.** Its own rule, "do not … create a second design system simply to adopt a component library" (`:340`), then argues against adding them |
| Master guide: "Landing page effects: React Bits first choice" (`:349`) | Owner G2: a static decorative skyline on Landing; the team brief: don't copy other sites' code | Reference only |
| Master guide: Motion "Level 2" for chat entry, modals, card expand (`:537-543`) | D5 (20 Nov) CSS only; the chat entry is already CSS (`index.css:193-204`) | CSS stays; Motion only on the flip condition in 3.7 |
| `DESIGN_SYSTEM_PROPOSAL.md` §11: "Frosted panels, `backdrop-filter`: rejected" | J22 (27 Nov) approved `card-surface` with an 8 px blur (`index.css:87-100`) | Not a dependency question. Noted so later docs cite J22, not §11 |
| `DESIGN_SYSTEM_PROPOSAL.md` §5: lucide used in five files | Six: `AskEntry.tsx:1` adds `Copy` and `Check` (J25) | Use the list in 3.1 |
| `COMPONENT_REUSE_MAP.md`: dialog at `PlaceChip.tsx:47-71` | Now `PlaceChip.tsx:58-85` | Use current line numbers |

This doc is consistent with: `REDESIGN_ACCEPTANCE_CRITERIA.md` G-04, `OWNER_DECISIONS.md` principles, H4, H5, J7 and J26, `UX_AUDIT.md` D5, and the cityscape spec's no-library rules.

---

## 5. If the owner ever approves a dependency

These are gates, not a plan. Nothing here is approved.

1. Add an owner decision row naming the package, exact version and use case (G-04 changes from "empty diff" to "this one package").
2. Route-split first (F-37), so the library loads only where it's used.
3. Build on a branch and record the real gzip delta against the 164.7 kB local baseline. Bundlephobia upper bounds don't count as measurements.
4. Re-run axe on every page, keyboard and focus checks, forced colours, reduced motion and reduced transparency, at 320×640, 390×844, 768×1024, 1280×720 and 1440×900.
5. Check the CSP (`client/public/_headers`). Any change to it is its own security decision.
6. Re-check data labels: "Model forecast", "Not current", units, timestamps and sources all stay visible. No banned words appear in library defaults (for example, empty-state or toast copy).
