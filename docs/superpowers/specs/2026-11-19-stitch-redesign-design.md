# UI redesign from the Stitch exports, with a hazy skyline (design)

Status: draft for the owner's approval (2026-11-19).

**Owner choices so far:**
- Use Stitch manually, with the exports in `stitch_design_system_implementation/`. They are git-ignored and serve as visual reference only.
- The app (`/app`) stays light; the landing page stays dark.
- The hazy skyline goes in both places: a fixed example on the landing page and a live one in the app readout.
- Build order: dashboard first, then the landing page, then the states.
- Skip Unslop.

Every phase follows `.claude/skills/airaware-ui/SKILL.md`.

## Intent

The app works and is honest, but it looks plain. Stitch produced a clearer visual direction:
- a big, legible readout;
- grouped cards;
- a two-column desktop dashboard;
- plan cards with period tags.

The owner also wants people to **see** the air before reading a number, through a city skyline that gets hazier as the air gets worse, like real smog photos.

Success means judges get a polished, readable app in which every number and label is still the real, sourced one.

## Goals

**Phase A: dashboard (`/app`)**
1. **Desktop layout (lg, 1024 px and up):** two columns.
   - Left: the place bar, the air readout, "Your city, the next two days" (chart and pollutant table), and the CPCB panel.
   - Right: "Your daily plan" (household questions, buttons, the plan) and "Sources and limitations".
   - Below lg everything is one column in that order: plan after air, then saved plans, then sources.
2. **Place bar card:** the place label, a "Change" action that focuses the search, and "Use my location". The search box stays reachable on phones.
3. **Air readout card:**
   - **This hour's PM2.5**, the big figure, with its unit from the provider and the label "Model forecast".
   - **The 24-hour air check**, stated separately in words, for example "24-hour average 72 µg/m³, above the 60 µg/m³ limit". It shows a marker that isn't colour alone, and covers PM10 too.
   - **The source line:** provider, model, retrieval time, and stale wording when stale.
   - **The live skyline** (below).
4. **Chart:** restyled in Stitch's look, an area under the PM2.5 line and calmer axes. It keeps PM10, the legend and **no limit line**, because India's limits are 24-hour averages and the chart shows hourly values (Phase 7 decision).
5. **Pollutant table:** the six pollutants at this hour, each with the provider's unit.
   - A "24-hour check" column appears **only for PM2.5 and PM10**, worded "Above the limit" or "Within the limit" from the air check.
   - The other four show "Not assessed". There are no "Good" or "Moderate" labels.
6. **CPCB panel:** restyled. The wording stays the server's own limitation text.
7. **Plan view** (`PlanView`, `PlanCard`, `SavedPlansList`), restyled to the Stitch phone export:
   - a summary card with the made-by line;
   - an Air notice card with a short word tag;
   - "Your day" cards with a **period chip** (the existing period names, e.g. Morning, Commute, Daytime, Evening, At home), the rule's title, the "For you" line and the collapsible "Why?";
   - "Save plan" as the primary action and "Delete my saved data" as a quiet one;
   - Saved plans as a list.
   - **No clock times,** and the advice text stays exactly the rules' text.

**Phase B: landing (`/`)**
1. A split hero: headline, subline, search, and "Use my location".
2. **The example card:** the hero shows a fresh **screenshot** of the new `/app` readout, captured from the live site after Phase A ships. It is labelled "A past screenshot of the dashboard for Pune, <date>" and replaces today's screenshot. Real data, no fixture, and no pinned clock.
3. **The skyline:** a decorative skyline sits behind the hero at a fixed level 3, with no number or status attached.
4. The 4 chapter cards get numbers and small labels. Their example text stays identical to the rules, which a server test already enforces.
5. "Where every number comes from" becomes 3 numbered cards.
6. The limits band, and a footer with Privacy and the attribution.

**Phase C: states**
1. A skeleton for loading.
2. An error state: "We couldn't load the forecast" and "Try again", with no internal details.
3. A stale-data banner whose words say it is not current.
4. A no-place prompt with search and "Use my location".

**The hazy skyline (Phase A for live, Phase B for the example)**
- **Drawing:** an inline SVG of an Indian city skyline, with flat building shapes, a low sun disc, and 2–3 haze bands drawn in front of and between the building rows. No photos and no raster files.
- **Haze level** comes from the server's air check, using the larger of the PM2.5 and PM10 ratios (24-hour average divided by the limit):

  | Ratio | Level | Look |
  |---|---|---|
  | below 0.5 | 1 | light haze |
  | 0.5–1 | 2 | moderate |
  | 1–1.5 | 3 | heavy |
  | 1.5–2 | 4 | very heavy |
  | 2 or more | 5 | severe |
  | air level `unknown` | — | neutral: flat grey, no sun, and the words "Air information unavailable" |

  The sky is never fully clear: level 1 still has haze.

  *Amended (cityscape, 20 Nov 2026):* the five ratio levels are replaced by three looks taken straight from `airCheck.level` (within, above, unknown), so the scene makes no classification of its own. Within keeps a minimal veil on the far row. See `2026-11-20-adaptive-cityscape-design.md`.
- **How the haze is drawn:** the far buildings fade first, then the nearer ones, and the sun dims. This is done with opacity on flat token-colour fills; blur filters are optional and must stay cheap.
- **Accessibility:** the skyline is decorative (`aria-hidden`), and the readout's words carry the meaning. If anything drifts, it stops under `prefers-reduced-motion`. Text over or beside it keeps a contrast of 4.5:1 or better.
- **Size:** a few kB of SVG, with no new dependency.

## Non-goals

- Anything Stitch showed that the app doesn't have:
  - nav tabs (Analytics, Sensor Network, Forecast Models);
  - the bottom nav (Live AQI, Map, Sensors, Profile);
  - an account icon, a Terms page, or "Frequently checked" city chips;
  - stations, wind and ppb units.
- An AQI of any kind, or per-pollutant category labels.
- A dark app theme, new routes, or new API features beyond the air-check field below.
- Copying Stitch's HTML.

## Anti-goals (a failure even if it looks good)

- An invented number, status, time, station or advice line appears, or the rules' advice text changes.
- An hourly value sits next to a 24-hour limit as if the two were comparable.
- A status is shown by colour alone, or reassuring wording appears ("safe", "healthy", "clean air").
- An external font, CDN script or icon font loads. The CSP blocks them, and pages would silently break.
- Existing behaviour regresses: focus moves, URL handling, save and delete, stale checks, or any of the 16 e2e tests.

## Constraints

- **Design tokens:** only `client/src/index.css` tokens and `DESIGN.md`. Stitch's own palette (`atmospheric_intelligence/DESIGN.md`) is not adopted.
- **Icons:** inline SVG components (a handful: pin, location, warning, info, clock, chevron). No icon font and no new package.
- **Every phase passes the `airaware-ui` Done checklist:** tests, typecheck, lint, format; browser at 320 and 1280 px; tap targets of 44 px or more; keyboard; axe; reduced motion; `npm run e2e`.
- **Owner approvals:** each phase is pushed only with the owner's yes, and each push costs about 15 Netlify credits.

## Approaches

1. **Rebuild in our React components, using the exports as a visual reference (chosen).** This keeps the data, tests, CSP and accessibility work, and takes Stitch's layout and styling.
2. **Paste Stitch's HTML.** Rejected:
   - it loads Tailwind from a CDN, Google Fonts and Material Symbols, all of which the CSP blocks;
   - it is full of invented content;
   - it would discard the tested components.
3. **Re-prompt Stitch with stricter rules first.** Not needed: the exports are already good enough as a visual reference, and the content rules are applied in code.

## My calls (owner can override)

1. **Where the 24-hour check comes from.**
   - The forecast response (`GET /api/v1/air-quality/forecast`) gains a **required** `airCheck`: the server's existing `assessAir()` result for the same series and time. Its level is `unknown` when the data is insufficient.
   - The client never re-derives limits.
   - `API.md` and the shared contract are updated, with tests.
2. **Haze thresholds:** the five ratio bands above.
   - When one pollutant's check is unknown, the haze uses the ratio that is known.
   - The haze goes neutral only when the air level is `unknown`.
3. **The landing example** is a refreshed real screenshot (Phase B item 2), not a fixture.
4. **No "Frequently checked" city chips.** They would be a new feature; the owner can ask for them.
5. **Rules-only plans** keep today's topic grouping, restyled. "Your day" cards with period chips appear only on AI plans, as now. Chip labels come from the code's existing period names ("At home", not "Home").
6. **Air notice tags:** "Above the limit" (`elevated`), "Within the limit" (`not_elevated`) and "No data" (`unknown`). These are factual words, not reassurance.
7. **The search box stays visible.** "Change" moves focus to it. The e2e tests must still pass. A selector may change only where visible text or structure changed, and the same behaviour must still be asserted.

## Left to the builder

- Exact spacing and type sizes within the `DESIGN.md` scale.
- The SVG skyline's shapes.
- How components split.
- Test names.
