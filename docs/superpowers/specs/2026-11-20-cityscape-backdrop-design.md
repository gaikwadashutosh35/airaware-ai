# Cityscape Backdrop: Design

**Status:** approved by the owner on 20 Nov 2026 ("Approve"), with the calls marked "my call" and the builder-check answers in §5.1–§5.3 and §5.6.
**Owner's direction (20 Nov 2026):**
- "I want background should automatic change not a particular section."
- "Every app page, the air mood should follow you everywhere."
- Approach: "Solid cards".

**Builds on:** `2026-11-20-adaptive-cityscape-design.md` (the looks, the weather layers, motion and data rules are unchanged).

## 1. Why

The adaptive cityscape works, but it lives in one band at the top of Today's card. The owner wants it to be the background of the app itself, so the air mood follows the person onto every page: Today, Ask, My Home, Better Habits, My Profile and onboarding.

## 2. What this overrides

| Earlier rule | Where | Now |
|---|---|---|
| "Gentle tonal shifts rather than changing the entire page background" | Owner's brief, line 108 | The whole app background changes with the forecast. The tones stay gentle (same colours as today). |
| A band of about 150–220 px | Brief, line 160 | The city keeps today's band height (128 px, 176 px from 640 px wide) but now sits at the bottom of the screen, and the sky fills the screen. |
| No "decorative full-screen hero on the Today page" | Brief, line 175 | The scene is full-screen, but it sits behind the content as a backdrop, not as a hero that pushes content down. |
| "The scene behind the text" was rejected | Cityscape design §3; weather-scene anti-goal "text placed on top of the scene" | Text never rests on the city or fog. Only each page's title block (§5.3) sits on the sky, in `text-dark`, with contrast checked against everything that can pass behind it. |

## 3. Goals, non-goals, anti-goals

**Goals:**
1. One scene sits behind every `/app/*` page and changes on its own with the forecast for the chosen place.
2. Every word stays as readable as today, in every look.
3. Moving between pages never redraws, refetches or replays the scene.
4. At 320×640, Today's verdict moves up by the removed band's 128 px.

**Non-goals:**
- New looks, thresholds or data. `scene.ts` and its rules stay exactly as they are.
- The landing page (`/`) and Privacy (`/privacy`): they keep their own backgrounds.
- A night sky (still ruling 5: night only removes the glow).
- New motion, parallax or scroll-linked effects.

**Anti-goals** (failures even if it works):
- Any text resting on a building or fog, or any text below the title block resting on the scene at all.
- A mood shown with no word saying it comes from a model forecast (§5.5).
- Frosted or see-through cards (rejected approach), or any `backdrop-filter`.
- A dark or alarming full-screen look.
- Any new request to the server.

## 4. Approaches

| Approach | Verdict | Why |
|---|---|---|
| **Solid cards:** a fixed scene behind every page; cards and text blocks get a solid surface | **Chosen by the owner** | Contrast stays exactly as today; no heavy effects; the mood shows in the sky above each page's title, between cards, in the side margins and at the end of each page. |
| See-through (frosted) cards | Rejected | Contrast must be re-proven for every card in every look; blur stutters on older phones; the brief warns against art that reduces contrast. |
| A scene band at the top of every page | Dropped | Still "a particular section". |
| Only the page colour changes; the city stays in Today's card | Dropped | Same reason. |

## 5. Design

### 5.1 Where the scene sits

- **One backdrop in `AppShell`,** rendered once for every `/app/*` page. It stays mounted when the page changes, so it never redraws, refetches or replays its motion on navigation.
- **Fixed to the screen, behind everything.** It takes no layout space, is `aria-hidden`, cannot take focus and lets clicks pass through.
- **Layers (top of screen to bottom):**
  1. **Sky:** today's sky gradient, stretched over the whole screen, in the look the forecast gives (within, above, unknown).
  2. **Glow:** top right of the screen, by day only, on the same rules as today.
  3. **Clouds and cloud deck:** across the top part of the screen, same counts and rules.
  4. **City:** today's far, middle and near rows, tanks, windows and veils, in a band pinned to the bottom of the screen.
     - On phones (under 768 px) it sits directly above the bottom bar: 56 px plus the safe-area inset.
     - From 768 px it sits at the very bottom.
     - **Height:** 128 px, 176 px from 640 px wide, and never more than 20 % of the screen's height (my call: on a 640×320 landscape phone the title would otherwise rest on the city).
  5. **Rain:** over the whole screen, behind the content, on the same rule and timing as today.
  6. **Fog and heat shimmer:** as today, at the base of the city band only (my call: a full-screen fog wash at 0.6 opacity would turn the sky nearly white and hide the "above" mood, and fog and high pollution often come on the same days).
- **The same geometry, colours and thresholds** as today. Only the layout changes: the 800×160 drawing is split so the sky can fill the screen while the city keeps its proportions.

### 5.2 Which look, when

| State | Scene |
|---|---|
| No place chosen yet (onboarding, or any page before a place) | The **unknown** look with no weather: neutral grey sky, no glow, no clouds. It implies nothing about the air. |
| A new place is chosen and its first forecast is loading | Today's still silhouette (the current loading drawing), with no motion. |
| Forecast ready | `sceneFromConditions(airCheck, weather)`, as today. |
| The hourly reload for the same place | The current scene and footer line stay until the new forecast arrives, then the look updates in place (my call: otherwise the whole screen would flash to grey once an hour). The old forecast is over 60 minutes old by then, so the footer already says "Not current." |
| Forecast ready but stale (over 60 min old) | The same look, as today. The footer note says it is not current (§5.5), and Today keeps its "Not current" banner. |
| Forecast failed | The **unknown** look with no weather. |

### 5.3 Readability

- **Each section sits in one solid panel** (`bg-surface-light`, the colour behind it today), so contrast is exactly what it is now (my call). A section is a heading with its content, or a block that stands alone: a form, an Ask answer, a Welcome step's body, the error or loading state. Notes join the panel of the section they belong to: the guide safety note, "Made with AI…", the stale-plan note and the saved-plan banner. The sky shows in the gaps between panels.
- **The footer** sits on a solid surface too.
- **The title block** sits on the sky, and all of it uses `text-dark` (my call; today the small lines are `text-dark-muted`, which measures 2.4–3.0:1 against a rain streak):
  - the greeting;
  - the page's `h1`;
  - Welcome's "Step N of 3";
  - Ask's "Using: … model forecast, updated …" line.
- **The title block must pass 4.5:1** against every colour that can pass behind it, in every look:
  - each sky stop;
  - a cloud and the cloud deck;
  - the glow;
  - a rain streak.

  This is checked by a test (§6), not by eye. Fog never reaches the title block (§5.1).
- **Each page ends with open space** as tall as the city band, below the footer. Scrolling to the end shows the whole city, and no text rests on it.

### 5.4 Today

- **The band leaves `TodayLead`.** The weather line stays as the card's first row, because it is the scene's words.
- **The `band` option leaves `Loading`** in `States.tsx`. The backdrop's silhouette replaces it.

### 5.5 The forecast label (my call)

The mood on Ask, My Home, Better Habits and My Profile would otherwise show with no "Model forecast" label anywhere on the page. So the footer of every app page gets one line while a forecast is loaded:

- "Background: model forecast for {place}."
- When stale, it continues: "Not current."
- With no forecast, there is no line.

Cost if wrong: one more line in the footer.

### 5.6 Motion and performance

- **Motion:** unchanged. The clouds drift once for 4.8 s and the rain falls for 4.8 s, both off under reduced motion. They play when the backdrop first draws a place's forecast (first load, or a new place), never on page changes or the hourly reload.
- **Performance:** one inline SVG layer with no scroll handlers, no `backdrop-filter` and no raster images.

### 5.7 The landing screenshot

`client/src/assets/today-phone.jpg` shows the old band. It is recaptured from live data once this is built, with the caption's date updated if the day has changed.

## 6. Testing

- **Unit (jsdom):**
  - the backdrop shows each state in §5.2 (`data-air`, the silhouette while loading, unknown with no place or on error);
  - an hourly reload for the same place keeps the scene and footer line while loading;
  - it is `aria-hidden` with nothing focusable;
  - `TodayLead` draws no SVG;
  - `Loading` has no band;
  - the footer line appears, says "Not current." when stale, and is absent with no forecast.
- **Contrast:** a test computes each look's sky, cloud, cloud-deck, glow and rain colours and checks the title block's colour against each at 4.5:1. Values come from the real tokens, not copies.
- **e2e (desktop and phone):**
  - the backdrop is on every app page;
  - moving between pages keeps it without replaying the drift;
  - reduced motion keeps it still;
  - in a real browser, every visible text in `main` outside the title block has a solid background between it and the backdrop.
- **Axe** on every app page, in the within, above and unknown looks.
- **Screenshots:** every app page at 320×640, 390×844, 768 and 1280; the five states (within, above, unknown, stale, loading); and a 640×320 landscape phone. No sideways scroll.
- **The full gate:** unit, typecheck, lint, format, e2e.

## 7. Left to the builder

- How the SVG is split into layers, and the cloud positions over a tall screen.
- The glow's size relative to the screen.
- The footer's exact styling, as long as it is solid.
- Component and file names.
