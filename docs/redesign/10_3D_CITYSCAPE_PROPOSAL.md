# 10 · Cityscape: 2.5D and 3D proposal

**Status:** read-only proposal, 28 Nov 2026. Nothing has been built or installed. **No 3D prototype was built or measured.** §4 is a desk evaluation.

**Labels used in this doc**

| Label | Meaning |
|---|---|
| **OBSERVED (code)** | Local working tree, commit b0c4278, cited as `file:line`. |
| **OBSERVED (live)** | The 28 Nov probe of https://airaware-ai.netlify.app (Today for Pune at 390×844 and 1440×900). The script is `C:/Users/Ashutosh/AppData/Local/Temp/claude/5f56e6022b99d9b4/526cd9ef-a7c8-4b28-b2da-f59162db31c3/scratchpad/redesign/motion-probe.mjs`, with its output in `motion-probe.json` in the same folder. |
| **OBSERVED (screenshot)** | `docs/redesign/audit/screenshots/redesign-2026-11-28/current/today-1440.jpg`. |
| **RECOMMENDED** | A proposal. Each one needs an owner decision. |
| **UNVERIFIED** | Not checked this session. |

**Companion doc:** motion rules and IDs (E1–E14, C1–C15) are in `09_MOTION_DESIGN_SPEC.md`.

**Status of the snippets:** none has been checked against `modern-web-guidance`.

---

## 0. Recommendation in one paragraph

*Naming note: Phases 1–3 here are cityscape phases only. Phase 1 maps to doc 14's R8; Phase 3 is under 14 §4 "Later". P1–P9 here are not doc 11's P1–P9.*

**Phase 1: 2.5D, SVG only.** Deepen the existing layered SVG city (P1, P2, optionally P4). It adds no JavaScript, makes no request, adds no image and changes no data input.

**Phase 2: conditional.** Do P3 (a composite-only crossfade) only if a phone recording shows jank. Do P5 (Landing-only parallax) and P9 (a Landing explainer) only if the owner wants them.

**No real-time 3D in the app.** Three reasons:
1. The city is decorative and `aria-hidden`, so 3D adds no understanding.
2. At desktop widths the content cards cover most of the band (`today-1440.jpg`).
3. Today has 10 blurred cards laid out (live probe). A WebGL canvas behind them would force every visible card to re-blur on each rendered frame, up to roughly one viewport of pixels per frame. That cost was not measured.

**A 3D Landing hero is the only 3D worth prototyping, and only later.** It would be a throwaway under `docs/redesign/prototypes/`, built after Phase 1 ships, behind the gates and budgets in §5–6.

---

## 1. What exists (OBSERVED)

### 1.1 Layer stack: `client/src/features/air-quality/CitySkyline.tsx`

| Order (back to front) | Layer | Lines | What it draws | What drives it |
|---|---|---|---|---|
| 0 | Root | `:101-102`, `:156-161` | A fixed, full-screen, `-z-10`, `pointer-events-none` box that is `aria-hidden`. Hidden under forced colours | — |
| 1 | `sky` | `:162-178` | A two-stop vertical gradient. The top stop mutes under overcast | `scene.air`; `clouds === 3` |
| 2 | `upper` | `:180-240` | The sun glow (radial gradient, opacity per look; larger when hot), the overcast cloud deck, and 0–3 clouds that settle once | `glow`, `heat`, `clouds` |
| 3 | `city` → far row | `:241-246` | One outline path at opacity 0.36, tonal in `--city-hue` | `scene.air` (hue) |
| 4 | `veil-far` | `:247-251` | An HTML veil masked to fade in from the top. Opacity 0.05 within, 0.42 above, 0 unknown | `scene.air` |
| 5 | Middle row and its details | `:252-264` | 20 buildings at 0.4, plus light details at 0.2 | `scene.air` (hue) |
| 6 | `veil-mid` | `:265-269` | Opacity 0.2 only when above, otherwise 0 (always mounted so it can fade) | `scene.air` |
| 7 | Near row, tanks, windows | `:270-286` | Shop-houses and tanks at 0.9. Windows at 0.3, hidden below `sm` | `scene.air` (hue) |
| 8 | Heat shimmer | `:287-299` | A 14 % warning-colour strip at the ground line | `heat` |
| 9 | Rain | `:301-335` | A patterned full-screen layer, always mounted, `invisible` when dry. Falls 4.8 s once | `rain` |
| — | Loading silhouette | `:128-151` | The far and near rows only, flat neutral, no motion | `scene === null` |

**Three depth planes plus two veils.** The veils are atmospheric perspective tied only to the 24-hour check. The cityscape spec asks for "at least three depth planes" (spec §3.2), and this build already has them.

### 1.2 Inputs: `client/src/features/air-quality/scene.ts`

**The look comes only from the server's check.**
- `airCheck.level` maps to within, above or unknown (`:12-18`).
- There are no averages, ratios or thresholds of the app's own (`:10-11`).

**Weather drives everything else.** These are weather drawings, not air ones:

| Weather value | Drawing | Lines |
|---|---|---|
| Cloud cover <20 / <50 / <80 / ≥80 % | 0–3 clouds | `:38-42` |
| Rain ≥ 0.2 mm | Rain layer | `:35` |
| Temperature ≥ 35 °C and no rain | Heat | `:36,56` |
| Known day, known sky and air, no rain or overcast | Glow | `:60-66` |

**Limits on the weather drawings:**
- No fog (`:21-23`).
- Weather older than 120 minutes is not drawn (`:83`).

**The footer says where the look comes from (`:105-113`).**
- The live text is "Background: model forecast for Pune, Maharashtra. Within the limit." (`today-1440.jpg`).
- So the look is never the only sign of the level.

### 1.3 Geometry and size

**Geometry (`skylineGeometry.ts`).** This is variant B, "Mixed street" (owner, 22 Nov), drawn in an 800×160 box on ground line y = 160 (`:1-7`):
- the far row as one outline;
- 20 middle buildings;
- 15 near shop-houses;
- 10 tanks on 9 buildings;
- no landmark.

The source is brief-finish §5.1 (`docs/superpowers/specs/2026-11-22-cityscape-brief-finish-design.md:73-97`). I read only the first 60 lines of `skylineGeometry.ts`, so these building counts come from the design doc, not from counting the code.

**Live DOM (OBSERVED, live, both widths):** 115 elements, 6 `<svg>`, 75 `<path>` and 7,761 characters of path data. The root is `position: fixed` at the full viewport size.

**Band size (H5, `CitySkyline.tsx:104-105`):**
- `min(16rem,32vh)` on phones;
- `min(24rem,40vh)` from `sm`;
- drawn 1.74× wider from `md`;
- hidden below 33.3rem of height.

**JS and CSS in the live bundle (OBSERVED, live).** `index-Dg6rzCu3.js` is 157,970 B transferred and 578,183 B decoded. CSS is 9,515 B transferred and 47,771 B decoded. The backdrop is a few kB of that and has no separate chunk.

**Two other bundle baselines, kept separate on purpose:**
- local `client/dist`, 164,692 B gzip -9 (doc 08, measured by that author);
- 148 kB transferred at audit time (F-37, cited in doc 08).

### 1.4 Motion today

| Motion | Duration and trigger | Source |
|---|---|---|
| Clouds settle | 16 px over 4.8 s, once | 09 E5 |
| Rain | 4.8 s, once | 09 E6 |
| Air look fades | 700 ms, on a same-place level change | 09 E7 (paint properties) |
| Everything above under reduced motion | Nothing moves (verified live) | 09 E14 |

**What has no motion:** the buildings and the heat strip.

**When motion plays:** on a place's first draw only, never on a page change.

### 1.5 What it looks like

**OBSERVED, screenshot `today-1440.jpg`: the "within" look with 1 cloud and the glow.**
- At 1440 the city shows in the left and right gutters, and faintly through the 85 % cards.
- The two columns of cards cover the middle of the band.

**Elsewhere:** `today-390.jpg` was described by the live-capture teammate and not opened by me.

**Not seen rendered this session:**
- the above, unknown, rain, heat and overcast looks;
- dark mode;
- forced colours.

**Older captures:** `.playwright-mcp/cityscape/*.png` are dated 20 Nov, before variant B (22 Nov) and H4/H5 (24–26 Nov), so they show an older drawing. They are not evidence of the current looks.

### 1.6 Assets folder and Landing

**`AirAware_Cityscape_Background_Assets/` (OBSERVED, code):**
- three named PNGs (within, above, unavailable), 152–165 KB each, measured at **2048×1152**. The folder's README says 1648×928, which does not match the files;
- three unnamed PNGs of 1.55–1.65 MB each.

**H4 (`OWNER_DECISIONS.md:151`):** these are art direction only, no PNG is shipped, and the image's origin is unconfirmed.

**Landing:** `HeroSkyline` (`Landing.tsx:160-179`) reuses the far and near rows as a still, dark strip along the hero's bottom edge. G2 (`OWNER_DECISIONS.md:131`) approved it as static.

---

## 2. What the city is for

The page's words carry the meaning. The city is atmosphere, and a glanceable echo of the verdict that sits right next to it. So "better" means:

1. **Feels like a place.** More depth and light, with no new meaning.
2. **Never competes with the verdict.**
   - Title contrast stays ≥ 4.5:1 (`e2e/backdrop.spec.ts:127-155`).
   - The 85 % card floor holds over the darkest city pixel (`index.css:77-86`).
3. **Never invents data.** Air drives only the hue, the veils and the glow strength. Weather drives only clouds, rain, heat and the glow's presence. Nothing depicts smoke, plumes or a concentration (cityscape spec §4.3, §7).
4. **Costs nothing on a phone.**
   - No continuous motion.
   - No extra request.
   - No JavaScript beyond today's.

---

## 3. 2.5D proposals (RECOMMENDED unless noted)

**Rules for every row here:**
- Use only existing tokens through `color-mix`.
- Keep the backdrop `aria-hidden`.
- Keep the H5 band sizes. **Cross-doc note (critic, 28 Nov):** doc 05's Direction A proposes a lower band (min(14rem,28vh) / min(20rem,34vh)) and quieter rows (opacity .30/.32/.72 against the shipped .36/.40/.90). That runs the opposite way to P1 here and to H5's "big city" intent. Doc 14 R8 schedules both under owner decision D7. Pick one direction before R8; the team recommendation (05 §9.2) is to keep H5 and do P1/P2.
- Keep the 5 s rule and replay only on first draw.
- Keep the anti-goals: no landmark, smoke, signage, people, fog or particles.

**Status values:** P1 and P2 are the recommended set; Cond. means "only if a device recording shows a problem".

| ID | Change | Why | Data-integrity check | Motion | Perf | Test churn | Status |
|---|---|---|---|---|---|---|---|
| P1 | **Light depth, no new layers.** Widen the tonal step from far to near: far 10 %, mid 14 %, near 35 % `text-dark-muted` today (`CitySkyline.tsx:64-69`); try about 6 / 16 / 40 %. Add one static **horizon light band**: a soft vertical gradient in the sky's bottom colour behind the far row, so the far row separates from the sky | The owner found buildings hard to see (H5). Depth through light, not detail | The colours still come only from `--city-hue` and the sky per look. No new state | None (it is part of the existing 700 ms fade) | +1 rect at most; static | `CitySkyline.test.tsx` colour assertions; e2e title contrast and card-floor re-measure | **REC** |
| P2 | **Cloud depth.** Give each cloud a scale and opacity by slot (the back cloud smaller and lighter). Settle distance by slot: back 8 px, front 16 px. Same 4.8 s, once | Parallax depth with no scroll and no loop | Count still from cloud cover only (`scene.ts:38-42`) | Once, 4.8 s, transform only | None | `CitySkyline.test.tsx:257-258` (drift class) | **REC** |
| P3 | **Composite-only air fade.** One sky and veil layer per look (within, above, unknown), crossfading by opacity, replacing the `stop-color` / `fill` / `background-color` transitions | Rule 3 in doc 09 | Same mapping | 700 ms opacity | Removes the expected full-screen repaint during the fade, but adds 2 full-screen layers and DOM | `CitySkyline.test.tsx:276-294`; DESIGN.md §9 line 180; CS-09 | **Cond.** Only if a recording on a mid-range Android shows dropped frames in the 700 ms fade. None measured |
| P4 | **First scene fades in** over the silhouette (opacity, 300 ms) | Removes the pop when the forecast lands (2.7–3.3 s after load, live) | Silhouette is neutral; no stale look under a new place | Once per place | One full-screen opacity transition | `CitySkyline.tsx:128-151` structure; `scene.spec` | **Optional** (09 C11) |
| P5 | **Scroll parallax, Landing hero only.** The `HeroSkyline` far row moves ≤ 12 px against the near row through a CSS `animation-timeline: scroll()`, only under `no-preference` and where supported | Depth on the one page meant to impress | Landing is not data; nothing changes meaning | Scroll-linked; stops when scrolling stops | Compositor-driven where supported (UNVERIFIED per browser) | `Landing.test.tsx:409-418` area; `landing.spec.ts` reduced-motion check | **Optional; reverses G2 ("static")**, so owner decision |
| P5b | Same parallax on app pages | — | — | — | Cards already re-blur on scroll; parallax adds little cost but a vestibular risk on data pages | — | **No.** Cityscape spec §5.2 and DESIGN.md §9 |
| P6 | **Night look** when `isDay === false`: deeper sky tokens, lit windows | More "real" | Weather-driven, so it is allowed | None | None | Big: the title block text and focus colour assume a pale sky (`index.css:263-268`), so contrast work across all pages | **No, not now** |
| P7 | **PNG layers** from the assets folder | Richer painting | The images match the three looks, but their origin is unconfirmed (H4) | — | 152–165 KB per look (×3) against 7.8 KB of path data. Adds image requests, which brief-finish §3 lists as an anti-goal, and the cityscape spec §9 says "do not add a large raster" | New tests; CSP is fine (`img-src 'self'`) | **No.** Reverses H4; owner decision only |
| P8 | Phone detail (windows hidden below `sm`) | Legibility | — | — | — | — | **Keep** |
| P9 | **Landing explainer for UNDERSTAND.** A static row of three small panels of the same skyline in the within, above and unknown looks, with a caption such as "Illustration. The app's background follows the forecast's 24-hour check. The words on each page carry the result." | Teaches what the sky means before the person reaches Today | Labelled as an illustration; no values; no colour-only meaning | None (still) | 3 small inline SVGs reusing `SKYLINE` | New Landing test; copy needs the owner's OK (CP-04) | **Optional**; owner and copy approval |

**What P1 + P2 cost (estimate, not measured):** about 2–5 extra SVG elements, under 0.5 kB of CSS, 0 JS, 0 requests.

---

## 4. Real-time 3D: desk evaluation

**Nothing here was built or run.**
- **Sizes:** Bundlephobia whole-package gzip upper bounds from `08_COMPONENT_LIBRARY_DECISIONS.md`.
- **CSP:** the CSP is `client/public/_headers:4` (`script-src 'self'`, `img-src 'self' data:`, `connect-src 'self'` plus Supabase, no `wasm-unsafe-eval`).
- **Installed?** None of these packages is installed.

| Criterion | A. Current SVG | B. 2.5D SVG + CSS (P1–P4) | C. Spline embed | D. Three.js (vanilla) | E. R3F + Drei | F. Offline 3D (Blender) to stills or SVG layers |
|---|---|---|---|---|---|---|
| Adds to understanding | Echo of the verdict; words carry meaning | Same, with more depth | None beyond B | None beyond B | None beyond B | None beyond B |
| Data-integrity risk | Low (tested mapping) | Low (same mapping) | Medium: richer scenes invite haze or smoke effects that read as measured | Same as C | Same as C | Low if limited to three looks |
| Added JS (gzip upper bound) | 0 | 0 | `@splinetool/runtime` 282.1 kB | `three` 185.7 kB (tree-shaking lowers this; not measured) | `three` + `@react-three/fiber` 57.7 kB + `@react-three/drei` 521.5 kB (whole package; only used helpers ship) | 0 (images instead) |
| Extra requests | 0 | 0 | Runtime plus a `.splinecode` scene; remote by default unless self-hosted (UNVERIFIED) | A model file (`.glb`) | Same as D | 1 image per look, or 0 if traced to SVG |
| CSP change | No | No | Likely `connect-src` for a remote scene; WASM needs unknown (UNVERIFIED) | Probably none for bundled code; `blob:` in `img-src` if a glTF embeds textures (UNVERIFIED) | Same as D | No |
| Mobile GPU | Trivial (static SVG) | Trivial | WebGL scene behind **10 `backdrop-filter` cards**: each rendered frame forces the visible cards to re-blur, up to about one viewport (0.33 Mpx at 390, 1.3 Mpx at 1440, plus nested overlap). The page-wide sum is 1.43 / 2.15 Mpx, but only what is on screen is re-blurred. Cost not measured. The main risk | Same | Same | Trivial |
| Battery | Nothing after 5 s | Nothing after 5 s | A render loop. Even "on demand" renders on scroll and resize | Can render on demand; still GPU memory resident | `frameloop="demand"` possible; same residency | None |
| Accessibility | `aria-hidden`; still under reduce; hidden in forced colours | Same | Canvas needs `aria-hidden`; no forced-colours behaviour by default; must not be focusable | Same | Same | Same as A |
| Reduced motion | Still (verified) | Still | Must not create the scene at all, poster only | Same | Same | Still |
| First paint | Inline with the app; no gap | Same | Needs a poster to avoid a blank; lazy | Same | Same | Same as A |
| React 19.3 fit | — | — | Wrapper package has no licence field (doc 08) | Fine | R3F 9.8.2 peer `>=19 <19.4` blocks a React 19.4 upgrade (doc 08) | — |
| Owner decisions it touches | H4, H5 | Fits H4/H5 (tokens, SVG) | Reverses H4; D5 spirit; G-04; doc 08 "don't install"; cityscape spec §7 item 8 | Same | Same | H4 (images); P7 concerns |
| Maintenance | Tested, owned | Same files | Proprietary editor; scene outside the repo | Hand-written scene code, shaders | Larger API surface; the skill packs are not installed (doc 03) | Asset pipeline outside the repo |

**Honest reading:**

**3D does not help anyone understand their air.**
- The answer is a sentence, a level tag and a source line.
- The city is hidden from assistive technology, and covered by cards at desktop widths.
- On a phone, the band sits under the content as the person scrolls.

**3D costs about 186–765 kB gzip of upper-bound JS.** That covers C to E: Three.js alone 185.7 kB, Spline 282.1 kB, R3F + Drei with Three.js 764.9 kB. These are whole-package figures; tree-shaking lowers them, but by an unmeasured amount. Today the whole app ships 158 kB transferred (live).

**It collides with the frosted cards (J22).**

**Where 3D could ever earn its place:**
1. **A Landing hero:** marketing, not data. It would be prototyped only if the owner wants a "wow" moment after Phase 1.
2. **A My Home "house cutaway"** showing how indoor air moves. It must be clearly illustrative and content-reviewed (master guide §11, `…Master_Guide.md:619`). That is a separate feature, not the cityscape.

**Where 3D should never go:** behind any data screen, or full-screen on a phone (master guide `:626-627`).

---

## 5. Recommendation and phases

| Phase | What | Dependencies | Gate to start | Gate to ship |
|---|---|---|---|---|
| 1 | P1 + P2 (and P4 if the owner wants it) in `CitySkyline.tsx` | None | Owner approves this doc's P1/P2 | §6 budgets 1–9 pass at 320×640, 390×844, 768×1024, 1280×720 and 1440×900. Title ≥ 4.5:1 and card floor re-measured in all three looks. Existing CitySkyline, scene, backdrop and axe tests green |
| 2 | P3 (only on a recorded fade jank); P5 and/or P9 (owner's call) | None | A device recording (P3), or an owner decision (P5 reverses G2; P9 needs copy approval) | Same, plus the Landing reduced-motion e2e |
| 3 (optional) | **3D Landing hero prototype**, throwaway, under `docs/redesign/prototypes/`, never in `client/` | `three` (preferred over R3F + Drei for size), installed only in a scratch prototype after an owner decision row; not Spline (proprietary runtime, remote scene, CSP) | Phase 1 shipped; the owner names the user goal it must beat (e.g. "people remember the brand", measured how); skill pack scanned with `skillspector` first (doc 03) | Beats the 2.5D hero on that goal **and** meets every 3D budget in §6. Then a separate owner decision to move it into `client/` behind a route split (F-37) |

**Guardrails for any 3D prototype (all required):**

**Lazy loading.** Use a dynamic `import()` only when all of these hold:
- the hero is on screen (IntersectionObserver);
- the main thread is idle;
- `prefers-reduced-motion: no-preference`;
- WebGL2 is available;
- the data saver is not on (`navigator.connection.saveData`, where present);
- `navigator.deviceMemory` is 4 or more, where present. These two APIs exist only in some browsers (UNVERIFIED).

**Static fallback.** A poster image of the same composition renders first and stays when any condition fails. The canvas fades in over it in 300 ms or less.

**No blocking.** Nothing about first paint or the CTAs waits on the scene, and the hero CTAs are usable before the chunk loads.

**Rendering.**
- Render on demand.
- Pause when off screen or when the tab is hidden.
- Cap the device pixel ratio at 1.5.
- No pointer-tracking camera.
- At most one camera move, 2 s or less, once, then still.

**Accessibility.** The canvas is `aria-hidden`, holds nothing focusable, and is removed under forced colours.

**Content.** The same anti-goals as the SVG city, and no air or pollution meaning at all, because the Landing has no forecast.

**Where it may appear.** Landing only. Never behind a `card-surface`.

---

## 6. Performance budgets (measurable)

**What the columns mean:**
- **Baseline** is OBSERVED where it says so.
- **2.5D** applies to Phases 1–2.
- **3D prototype** applies to Phase 3, and applies only if it is ever built.

**Where frame budgets are measured:** on a **real mid-range Android phone** over remote debugging, plus one iPhone if available. Headless and desktop CPU throttling do not model a weak GPU or the blur cost, so they do not count.

| # | Metric | Baseline | 2.5D budget | 3D prototype budget | How to measure |
|---|---|---|---|---|---|
| 1 | JS added to the initial load | 0 (live main JS 157,970 B transferred) | **+0 B** of JS; CSS +≤ 1 kB gzip | **+0 B** on initial load | Network panel; `vite build` output |
| 2 | Lazy 3D chunk | — | — | ≤ 200 kB gzip including the model loader; ≤ 1 MB for the model plus textures, served from the same origin | Network panel after reveal |
| 3 | Extra requests | 0 | **0** | ≤ 3, all after the `load` event, same origin, no CSP change | Network panel; `_headers` diff is empty |
| 4 | Backdrop DOM | 115 elements, 75 paths, 7,761 chars of path data (live) | ≤ 130 elements; ≤ 10,000 chars of path data | n/a (canvas) | `motion-probe.mjs`'s `backdrop()` function |
| 5 | Running CSS animations 6 s after load, content loaded (`getAnimations()` cannot see the J18 hint, which runs on JS timers and needs its own check) | Only loading pulses (live) | **0** decorative | 0 frames rendered while still; 0 when off screen or the tab is hidden | `document.getAnimations()`; Performance panel frame track |
| 6 | Under `prefers-reduced-motion: reduce` | 0 animations (live) | **0** | Canvas never created; poster only | e2e with `reducedMotion: 'reduce'` |
| 7 | Decorative motion length | ≤ 4.8 s, once per place | ≤ 5 s, once per place; fades ≤ 700 ms | Camera move ≤ 2 s, once | Code review; Animations panel |
| 8 | Frame time (scroll; the 700 ms fade; first scene) | **Not measured** | p95 ≤ 16.7 ms; ≤ 2 frames over 33 ms in the fade (also report the 8.3 ms share on 120 Hz screens) | p95 ≤ 16.7 ms while scrolling past the canvas | DevTools Performance, 3 runs, mid-range Android |
| 9 | Long tasks caused by the backdrop | Not measured | None over 50 ms | None over 50 ms after first input; total ≤ 100 ms in the first 5 s after reveal (shader compile, scene parse) | Performance panel, Long Tasks |
| 10 | Full-screen paints during the air fade | Expected with E7 (not measured) | Documented; **0** if P3 is adopted | — | Rendering → Paint flashing |
| 11 | Composited layers added | Not measured | ≤ +2 | Canvas plus poster | Layers panel |
| 12 | GPU scene limits | — | — | ≤ 30k triangles; ≤ 50 draw calls; textures ≤ 4 MB of GPU memory; DPR ≤ 1.5 | `renderer.info`; Spector.js in the prototype only |
| 13 | Time to first 3D frame after the hero is on screen | — | — | ≤ 1.5 s on a mid-range Android; poster visible meanwhile | Performance marks |
| 14 | Idle CPU (30 s on the Landing, not touching it) | Not measured | Within 5 % of today | Within 10 % of a poster-only page | Chrome Performance Monitor |
| 15 | LCP and CLS | Not measured | LCP no worse than +100 ms (median of 5 runs, same device and network); CLS from the backdrop 0 | Same; the canvas must not be the LCP element | Lighthouse / web-vitals in the prototype |
| 16 | Contrast | Card floor over pure black 4.68 / 10.38 / 3.24:1; title ≥ 4.5:1 (`index.css:77-86`; `backdrop.spec.ts`) | Re-measured over the darkest new pixel in every look; no drop below these | Same, over the poster and the canvas | Existing e2e contrast helper |
| 17 | Overflow and touch | No horizontal overflow at 320–1440 (live-capture digest) | Unchanged | Unchanged | Existing probe |

---

## 7. Where this doc meets earlier decisions

| Earlier source | What it says | This doc |
|---|---|---|
| Cityscape spec (`AirAware_AI_Adaptive_Cityscape_Background_Spec.md`): Today only, 150–220 px (§6), clouds drift 35–60 s (§5.2) | A smaller, Today-only scene with continuous drift | Shipped as a full-screen backdrop sized by H5 that settles once (owner D2a, brief-finish §3). This doc keeps the shipped decisions |
| Cityscape spec §7 item 8, §9: no runtime library, no large raster | — | Agrees. Phases 1–2 add neither; Phase 3 is a separate owner decision |
| Master guide §11 (`…Master_Guide.md:605-614`): start from the "supplied PNG/SVG/CSS layers", subtle parallax, an optional 3D Landing hero, compare Spline with R3F | — | SVG only, because PNG reverses H4. App parallax is not recommended. The 3D hero becomes a Phase 3 option, using Three.js only, not Spline, for size and CSP reasons |
| H4 (`OWNER_DECISIONS.md:151`) | Assets are art direction only | Kept (P7: No) |
| H5 (`:152`) | Band sizes | Kept |
| G2 (`:131`) | Static Landing skyline | P5 would reverse it, so it is optional and needs an owner decision |
| `08_COMPONENT_LIBRARY_DECISIONS.md` §3.8 (Three.js / R3F / Drei, Spline: don't install) | — | Agrees for `client/`. Phase 3 is the flip path doc 08 names ("an approved 3D prototype that beats the SVG on a user goal") |
| `03_SKILL_DISCOVERY_AND_SELECTION.md` ruling 8 | 3D and GSAP skill packs not recommended now | Agrees. Scan with `skillspector` only if Phase 3 is approved |
| `REDESIGN_ACCEPTANCE_CRITERIA.md` CS-09, CS-11, CS-13, AC-07 | Motion counts and the 10 spec scenarios | P1/P2 keep the counts. P4 and P5 change AC-07 and CS-13 and need those rows updated |
| Assets README | 1648 × 928 px | The files measure 2048 × 1152 (OBSERVED, `file`). Flagged; not material while H4 stands |

---

## 8. Not verified

- **Prototype:** no 3D prototype was built. Every 3D figure is a desk estimate, or a Bundlephobia whole-package upper bound taken from doc 08.
- **Spline:** how it loads scenes and what it needs from the CSP. **Rive:** its WASM needs. **glTF:** whether embedded textures need `blob:` in `img-src`. All UNVERIFIED.
- **Browser features:**
  - which browsers run `animation-timeline: scroll()` on the compositor;
  - whether `navigator.deviceMemory` and `navigator.connection.saveData` exist in each target browser.
- **Measurements:** frame times, paints, layers, idle CPU, LCP and CLS were not measured. Rows 8–15 in §6 are targets with a stated method.
- **Unseen looks:** the above, unknown, rain, heat and overcast looks, dark mode and forced colours were not seen rendered this session.
- **`today-390.jpg`:** not opened by me.
- **P1 and P2 values:** the proposed numbers (about 6 / 16 / 40 %, settle distances of 8 and 16 px) are starting points. They have not been rendered or contrast-checked.
- **Local vs live:** live serves an older build than local `main` (25 commits behind). The backdrop counts above are from live, and the code line numbers are from local.
