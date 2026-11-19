# Design System: AirAware AI
**Project ID:** (set in Stitch)

Source of truth: the live tokens in `client/src/index.css` and the rules in `DESIGN.md`. This file restates them in Stitch's format.

## 1. Visual Theme & Atmosphere

Calm, precise and trustworthy, like a good weather instrument, not a marketing splash. Two moods share one system:
- **Landing page (dark, atmospheric):** a deep night-blue stage with one teal accent. It leads with the real forecast readout and its source line, so the first thing a visitor sees is evidence.
- **The app (light, working):** a soft off-white surface with dark ink. It is dense enough to read a whole day's plan at once, and quiet enough that warnings stand out.

Restraint is the signature: flat surfaces, thin rules, no gradients, no glow, no drop shadows, no stock imagery. Every number on screen carries its source, unit and time, because the product's promise is "see why, every time".

## 2. Color Palette & Roles

- **Night Ink** `#080F1C`: the landing page's base background.
- **Deep Harbour** `#101C2B`: dark panels and bands on the landing page.
- **Mist White** `#F5F8FA`: the app's page background and light panels.
- **Signal Teal** `#39D5C2`: the one primary accent, for main actions and key highlights on dark surfaces.
- **Clear Sky Blue** `#64A9FF`: informational accents, and the focus ring on dark surfaces.
- **Frost Text** `#F4F7FA`: text on dark surfaces.
- **Slate Ink** `#182435`: text, borders of controls, and the selected state on light surfaces.
- **Muted Fog** `#A9B7C8`: secondary text on dark surfaces.
- **Muted Slate** `#4A5A6E`: secondary text and dashed outlines on light surfaces.
- **Hairline Grey** `#D3DCE6`: dividers and card outlines on light surfaces.
- **Night Rule** `#22344A`: dividers on dark surfaces.
- **Focus Blue** `#1F6FD6`: the 2 px keyboard focus ring on light surfaces.
- **Amber Caution** `#F5B84B`: warnings, for example air above the limit.
- **Coral Alert** `#F06B72`: severe status and errors.
- **Leaf Green** `#3BAA82`: success, for example "Saved".

A colour is never the only signal: every status also has words, and an icon or label where it helps.

## 3. Typography Rules

- **Family:** Inter, falling back to the system sans. One family only; no display face, because the Content Security Policy blocks third-party font files.
- **Weights:** semibold (600) for headings and key figures; medium (500) for buttons and labels; regular for body. No bold-heavy headlines.
- **Scale:**
  - display 48 px for the landing hero and the headline PM2.5 figure;
  - 36 px and 30 px for page and section titles;
  - 24 px for section headings (H2);
  - 18–20 px for subheads;
  - 16 px for body;
  - 14 px (the most used size) for supporting text, sources and table cells;
  - 12 px for captions only.
- **Rhythm:** line-height 1.55 for body. Headings use balanced wrapping and paragraphs use pretty wrapping. No all-caps tracking.

## 4. Component Stylings

* **Buttons:** at least 44 px tall. Gently rounded corners (6 px). The standard button is a quiet outline: a 1 px Slate Ink border, Slate Ink text and 16 px side padding. The single primary action on a dark surface may use a Signal Teal fill. Focus is a visible 2 px ring, offset by 2 px. Buttons never rely on colour alone to show state.
* **Cards and containers:** a card is used only for a real, independent object, such as a plan action or a saved plan.
  - Shape: 8 px corners, a 1 px Hairline Grey outline, 20 px padding (32 px on wider screens), no shadow.
  - Example cards are labelled "Example from our rules", with a dashed Muted Slate outline.
* **Inputs and forms:** 44 px tall, 6 px corners, 1 px Slate Ink border on Mist White, 12 px side padding. Labels sit above the fields as visible text, never placeholder-only. Search results show as a list whose selected row inverts to Slate Ink with Mist White text.
* **Data readouts:** a large figure (PM2.5 in µg/m³), then its unit, then one line naming the source and the retrieval time. Readouts with a status show it in words ("Above the 24-hour limit"), with an Amber Caution or Coral Alert marker beside them.
* **Tables:** 14 px text with thin Hairline Grey row rules. They scroll sideways inside their own box on phones and never widen the page.
* **Dividers:** thin 1 px rules (Hairline Grey on light, Night Rule on dark), never heavy bars.

## 5. Layout Principles

- **Widths:** page content tops out around 1150 px; reading text is held to about 65 characters. The layout works from 320 px wide upward, and the page never scrolls sideways.
- **Spacing:** a 4 px base. 12 px is the everyday gap between related items, 4–8 px within a group, 20–32 px inside cards, and generous space between page sections.
- **Phones:** a single column, with tap targets of at least 44 px and nothing hidden behind hover.
- **Wide screens:** the dashboard uses a grid, with the readout and today's plan side by side when there is room.
- **Order on the app screen:** where you are → what the air is doing (with source and time) → what to do today → why → saved plans.
- **Motion:** minimal and functional. Every animation respects reduced motion.

## 6. AirAware rules every screen must keep

1. **Data labels stay as they are:** "Model forecast" (Open-Meteo, CAMS), "official observation" and "demo" are never merged or reworded. Show "CPCB data unavailable" honestly.
2. **Stale or missing data looks stale or missing,** never current.
3. **Who made the plan:** each plan says whether it was "Made with AI (model, prompt)" or "Made by our rules".
4. **No reassurance words:** never "safe", "healthy", "clean air" or "risk-free". No medical advice.
5. **Location:** it is used only after the "Use my location" button is pressed, and place search always stays available.
6. **Pages:** `/` (landing), `/app` (dashboard: place search, air readout, 48-hour forecast, household questions, today's plan, saved plans) and `/privacy`.
