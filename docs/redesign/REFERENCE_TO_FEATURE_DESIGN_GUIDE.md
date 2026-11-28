# AirAware AI — Reference-to-Feature Design & Claude Code Implementation Guide

> Saved from the owner's brief on 28 Nov 2026. Owner rulings on it: J28 in `docs/redesign/OWNER_DECISIONS.md` (reuse docs 01–15, doc 14 build order, SVG skyline kept, J7 kept, CSS-only motion, new Landing headline, Learn on Landing). Where this guide and J28 differ, J28 wins.

**Purpose:** One working brief for redesigning the existing AirAware AI product using selected patterns from the supplied reference websites, the project's UX audit, and the uploaded UI/UX, animation, motion and 3D skills directory.

**How to use:** Copy this file to `docs/redesign/REFERENCE_TO_FEATURE_DESIGN_GUIDE.md` in the existing AirAware repository, then use the Claude Code master prompt in Section 18.

**Important:** This is a design and planning brief, not proof that every referenced feature is already implemented or that every skill/library is installed. Claude must inspect the live site, repository, package manifest, actual skills and current API contracts before proposing changes.

---

## 1. Product goal

Make AirAware AI a **personal air-quality companion** that helps people:

1. Understand the available outdoor air-quality forecast for their selected city.
2. Ask natural-language questions about the forecast, home and daily routine.
3. Receive clear, explainable suggestions.
4. Find practical indoor-air guidance.
5. Build a useful daily routine from the available forecast and approved rules.
6. Learn how environmental data is sourced and what it can—and cannot—say.

The experience should combine:

- the clarity of a well-designed environmental dashboard;
- the familiarity of a modern AI conversation interface;
- helpful daily planning;
- practical home guidance;
- transparent sources and limitations;
- a distinctive AirAware cityscape identity.

The product should not become a generic chatbot, a raw data portal, or a visually impressive but difficult-to-use showcase.

## 2. Rules for using references

Use the reference websites to study information architecture, interaction patterns, visual hierarchy, content presentation and feature ideas. Do **not** copy their branding, source code, assets, exact page designs, numerical claims or data methodology.

For each proposed adaptation, Claude must record:

- the reference and exact page/section inspected;
- the observed pattern (not an assumption);
- the user problem it solves;
- the AirAware feature that could use it;
- the component or interaction needed;
- data/API dependencies;
- risks, accessibility and performance considerations;
- whether it is an existing capability, a UI-only change, or new product functionality.

A reference feature is not automatically suitable for AirAware. Only adopt patterns that fit AirAware's verified data sources, product rules and user needs.

---

## 3. Reference websites and what to study

### 3.1 SaafSaans — family-oriented air-awareness reference

**Website:** https://saafsaans-382086946715.asia-south1.run.app/

The page title surfaced as **“SaafSaans: your family's smog plan”**. Automated text extraction did not expose readable page content during the latest review, so the details below are inspection tasks and design hypotheses—not confirmed descriptions of its current implementation.

Ask Claude to inspect the site in a real browser and capture:

- how it introduces a family-focused value proposition;
- whether and how it builds a household/day plan;
- how it handles family routines and household preferences;
- how it presents indoor-air guidance;
- how it explains the reason for each recommendation;
- how it displays assumptions, source data and limitations;
- how the layout behaves on mobile.

**AirAware adaptation to evaluate:** a short optional household setup and a daily plan that turns the available forecast into relevant, practical actions. Do not collect sensitive health details or imply that the product diagnoses or treats health conditions.

### 3.2 Alternate AirAware AI deployment — grounded assistant and connected features

**Website:** https://airaware-ai-nine.vercel.app/

The currently readable page describes a product with a dashboard, AI assistant, daily plan, indoor guidance, commute comparison, insights, source/methodology information and an explanation of how context is passed to the assistant.

Patterns worth studying:

- **Traceable context:** the experience explains that the assistant's answer is tied to server-fetched context for the selected city.
- **Missing-data honesty:** it says unavailable fields should remain unavailable rather than being filled with plausible guesses.
- **Conversational assistant:** a question is shown with a natural-language answer and a visible “Grounding for this answer” area.
- **Daily plan:** activities are organized by parts of the day, with reasons attached to suggestions.
- **Indoor guidance:** the page explicitly distinguishes outdoor readings from indoor measurements.
- **Commute comparison:** transport modes are compared with stated assumptions rather than presenting a silent estimate.
- **Insights:** available historical pollutant trends are shown with units and data-kind labels.
- **Responsible AI and methodology:** the product explains what it will not do and where information comes from.

**Important differences:** this alternate deployment displays US/CPCB index concepts and its own CPCB estimate methodology. Do not copy those calculations, classifications or claims into the current AirAware application. Use the interface patterns only unless a separate, researched methodology is explicitly approved and implemented.

### 3.3 UrbanAir AI — information architecture and environmental education

**Website:** https://urban-air-ai.vercel.app/ai

The accessible page exposed a broad navigation and resource structure:

- Discover;
- Cities;
- Insights;
- AI Advisor;
- Learn;
- SDG 11;
- Responsible AI;
- Sources;
- Air Quality 101;
- How It Works.

The AI Advisor workspace itself displayed a loading message during inspection; therefore its full conversation interface was not verified.

Patterns worth studying:

- a product navigation that separates discovery, insights, AI and learning;
- educational material that helps users understand pollution concepts;
- a dedicated responsible-AI explanation;
- a sources/methodology area;
- links between city data and the AI experience.

**AirAware adaptation to evaluate:** an accessible “Learn” or “Air quality basics” area, a concise “How AirAware works” section, and an easy-to-find “Sources and limitations” panel. These could initially be sections within existing pages rather than new top-level routes.

### 3.4 Reference inspection status

| Reference | What was readable in the latest web review | What Claude must verify in browser |
|---|---|---|
| SaafSaans | Page title only; no readable text extracted | All actual screens, family onboarding, planner, recommendations, mobile flow |
| Alternate AirAware AI | Landing copy, feature descriptions, assistant example, context panel, plan, indoor section, commute comparison, insights and source explanation | Interactive assistant, actual API behaviour, loading/error states, responsive layout |
| UrbanAir AI | Navigation, resource structure, Responsible AI, Sources, Learn and “AI Advisor” loading placeholder | Complete AI Advisor screen and actual interactions |
| Current AirAware Netlify | URL is known, but rendered content was not exposed by the latest web extraction | Use Playwright against live site and local repo; capture every accessible route and state |

Do not claim an interaction has been reviewed unless it was actually operated in the browser.

---

## 4. Recommended AirAware information architecture

Start with a compact structure. Avoid creating many top-level pages before validating that users need them.

| Destination | User need | Initial scope |
|---|---|---|
| **Today** | “What does the forecast mean, and what should I consider?” | Plain-language verdict, forecast context, one recommendation, Why, shortcuts and collapsed details |
| **Ask AirAware** | “Can I ask a question in my own words?” | Guided starter topics, free-text questions, grounded responses, source/context and follow-ups |
| **Daily Plan** | “Help me arrange my day.” | Morning, afternoon, evening and night plan using supported rules and available forecast times |
| **My Home** | “What can I do indoors?” | Cooking smoke, ventilation, dust/cleaning and filtration guidance |
| **Better Habits** | “What everyday changes can I make?” | Sustainable habits and transport/energy guidance only where source-backed |
| **Insights** *(later)* | “What has changed over time?” | Historical trends only where suitable historical data is available |
| **Learn / How it works** *(can start as sections)* | “How does this work and what does the data mean?” | Air-quality basics, data source, forecast-vs-observation explanation, limitations |
| **My Profile** | “What have I saved, and what preferences are stored?” | Optional household preferences, saved plans and privacy controls |

**Navigation recommendation:** preserve the current five primary destinations if they already exist: Today, Ask AirAware, My Home, Better Habits and My Profile. Add Daily Plan as a view from Today first. Add Insights and Learn only after the core navigation is verified and tested.

---

## 5. Feature-to-reference adaptation matrix

| AirAware feature | Reference pattern to study | Recommended AirAware experience | Proposed UI components | Priority |
|---|---|---|---|---|
| Landing page | Alternate AirAware hero and UrbanAir discovery/resources | Explain user benefit before technical architecture; location search and two clear CTAs | `HeroSection`, `LocationSearch`, `PrimaryCTA`, `FeaturePreview`, `HowItWorks`, `SourcesPreview` | High |
| Today dashboard | Alternate AirAware traceability/dashboard; existing AirAware UX audit | Answer-first layout: plain-language forecast verdict, provenance, weather, one recommendation, Why | `AirReadout`, `ForecastContextLine`, `WeatherStrip`, `RecommendationCard`, `WhyPanel`, `AirQualityDetails` | Critical |
| AI assistant | Alternate AirAware contextual answer and grounding panel; UrbanAir AI Advisor concept | Chat UI with starter questions, conversational replies, structured cards and a visible data-context/source panel | `AssistantThread`, `Message`, `Composer`, `PromptSuggestions`, `GroundingPanel`, `SourceList`, `FollowUpChips` | Critical |
| Daily Plan | Alternate AirAware day arranged around the reading; SaafSaans family-plan concept to inspect | Time-based routine with reason and source attached to each suggestion | `DailyPlanTimeline`, `TimeSlot`, `PlanActionCard`, `PlanExplanation` | High |
| My Home | Alternate AirAware indoor guidance | Outdoor forecast may inform guidance, but never imply that indoor air is measured | `IndoorGuidanceGroup`, `VentilationCard`, `CookingSmokeCard`, `FiltrationCard`, `OutdoorContextNotice` | High |
| Better Habits | Alternate AirAware commute comparison; SaafSaans concept to inspect | Practical, qualitative suggestions first; optional calculator only with validated factors and assumptions | `HabitCategory`, `TransportModeSelector`, `AssumptionPanel`, `ImpactComparison` | Medium |
| Insights | Alternate AirAware historical trend; UrbanAir Insights navigation | Explain trends with units, dates, data type and gaps | `TrendChart`, `RangeSelector`, `ChartSummary`, `DataAvailabilityNotice` | Later |
| Learn / How it works | UrbanAir Learn, Responsible AI and Sources navigation | Plain-language education and source/methodology information | `LearningArticle`, `GlossaryTerm`, `MethodologyPanel`, `LimitationsList` | Medium |
| My Profile | Existing AirAware privacy approach; family setup pattern to inspect in SaafSaans | Optional preferences, saved plans, “remember on this device” consent and simple deletion | `PreferenceForm`, `SavedPlansList`, `PrivacyControls`, `DeleteDataDialog` | High |

---

## 6. Screen-by-screen design requirements

### 6.1 Landing page

**Goal:** a first-time visitor understands AirAware in a few seconds and can check a city without reading a technical explanation first.

Recommended structure:

1. Hero: “Understand your air. Make better everyday choices.”
2. City search with a visible action button.
3. Primary CTA: “Check My Air”.
4. Secondary CTA: “Meet Your Assistant”.
5. Preview of Today and the AI assistant.
6. Benefits: daily guidance, indoor-air help, better habits.
7. “How AirAware works” with a short numbered flow.
8. Data sources, forecast/observation distinction and limitations.
9. Final CTA and footer.

Avoid placing model-provider plumbing, grid resolution and long limitation lists in the opening hero.

### 6.2 Today dashboard

**Goal:** answer three questions immediately: what does the forecast say, what does it mean, and what can I consider doing?

Default view:

- selected place chip;
- time-of-day greeting without needing the user's name;
- AirAware cityscape illustration;
- largest text is the plain-language verdict derived from existing server state;
- “Model forecast” provenance, provider and timestamp;
- visible stale-data warning when applicable;
- one short caveat;
- top daily recommendation;
- expandable “Why this recommendation?” with reason, inputs, rule/source and caveat;
- links to Ask AirAware, My Home and Better Habits;
- collapsed “Air quality details” for technical values, chart, units, data method, provider notes and limitations.

Do not duplicate the same caveat and forecast statement in multiple cards.

### 6.3 Ask AirAware

**Goal:** familiar chat interaction without sacrificing data transparency.

Welcome state:

- “How can I help you today?”
- selected place/context indicator;
- starter prompts: Today’s forecast, Outdoor activities, My home, Commute, Explain PM2.5, Better habits;
- message composer with clear send action;
- short statement that answers use available forecast/rule context.

Conversation state:

- user messages aligned consistently;
- assistant response in readable paragraphs;
- structured recommendation cards where useful;
- “Why?” details;
- “What this answer used” data context;
- source and timestamp;
- meaningful follow-up chips;
- copy/feedback actions;
- loading, failure and unavailable-data states.

A chat interface must not create the impression of live measurements when the underlying values are model forecasts.

### 6.4 Daily Plan

Organize suggestions by actual time window and supported forecast periods. Each suggestion must have a reason. Clearly distinguish a suggestion from a guarantee or safety instruction. Do not create a false precision window if the available data does not support it.

### 6.5 My Home

Organize guidance by:

- cooking and smoke at source;
- ventilation and windows;
- dust and cleaning;
- filtration and purifier use;
- other supported household actions.

Show a visible note where necessary: outdoor forecast values are not indoor measurements. Avoid a blanket instruction to open or close windows without supporting context.

### 6.6 Better Habits

Use practical actions and plain language. Separate personal exposure guidance from environmental emissions impact. A numerical emissions calculator is a separate feature requiring verified factors, methodology, units, assumptions and tests.

### 6.7 Insights

Only show historical charts if the current API or another approved source provides an adequate history. Include a text summary, units, period, provider, data kind and missing-data explanation. Do not present a forecast series as measured history.

### 6.8 Learn and Sources

Add plain-language explainers for PM2.5, PM10, forecast vs observation, model limitations, the app's 24-hour check, source provenance and responsible AI. Put detailed licenses and methodology in a secondary panel rather than the default Today view.

---

## 7. Component library recommendations

### 7.1 Recommended foundation

Use the existing stack first. If the repository still uses React, TypeScript, Tailwind and shadcn/ui, continue with those conventions rather than replacing them.

| Component/library | Use in AirAware | Recommendation |
|---|---|---|
| **shadcn/ui** — https://ui.shadcn.com/ | Buttons, inputs, dialogs, sheets, tabs, accordions, tooltips, forms and design-system primitives | Primary component foundation if already present |
| **Radix UI** — https://www.radix-ui.com/primitives | Accessible behaviour underneath custom UI components | Use through shadcn or existing integration; avoid duplicate primitives |
| **assistant-ui** — https://www.assistant-ui.com/ | Chat thread, messages, composer, suggestions and runtime adapters | Evaluate for Ask AirAware; keep existing API/backend via a custom adapter/runtime |
| **Lucide** — https://lucide.dev/ | Consistent icons | Use existing icon package if already installed |
| **Recharts** — https://recharts.org/ | Hourly pollutant and trend visualizations | Use only if no existing chart system fits and data is available |
| **React Bits** — https://reactbits.dev/ | Selected visual components, backgrounds or micro-interactions | Use sparingly; copy only specific components after review |
| **Magic UI** — https://magicui.design/ | Landing-page effects and selected animated blocks | Optional; not a replacement for the app component foundation |
| **Motion Primitives** — https://motion-primitives.com/ | Small motion-oriented UI patterns | Optional; avoid overlapping animation packages |
| **Origin UI** — https://originui.com/ | Ready-made application patterns | Evaluate only if it fills a real component gap |

**Do not install all libraries.** Claude should inspect package.json and the current components first, then recommend the smallest set that solves a specific gap.

### 7.2 Suggested AirAware component inventory

**Application shell**

- `AppShell`
- `DesktopTopNavigation`
- `MobileBottomNavigation`
- `LocationChip`
- `PageContainer`
- `SectionHeader`

**Today and forecast**

- `CitySkyline`
- `AirReadout`
- `ForecastProvenance`
- `StaleDataBanner`
- `WeatherSummary`
- `RecommendationCard`
- `WhyThisRecommendation`
- `AirQualityDetails`
- `PollutantTable`
- `ForecastChart`
- `SourcesAndLimitations`

**Assistant**

- `AskAirAwarePage`
- `ConversationSidebar` (only if conversation history is supported and useful)
- `AssistantThread`
- `UserMessage`
- `AssistantMessage`
- `MessageComposer`
- `StarterPromptGrid`
- `FollowUpSuggestions`
- `GroundingPanel`
- `SourceCitationList`
- `AssistantFeedback`
- `AssistantErrorState`

**Planning and home**

- `DailyPlanTimeline`
- `PlanTimeSlot`
- `PlanActionCard`
- `IndoorGuidanceSection`
- `CookingSmokeCard`
- `VentilationGuidanceCard`
- `DustAndCleaningCard`
- `FiltrationGuidanceCard`

**Habits and learning**

- `HabitCategorySection`
- `TransportOptions`
- `AssumptionsPanel`
- `LearningCard`
- `GlossaryDrawer`
- `MethodologyPanel`

**Profile and privacy**

- `HouseholdPreferenceSteps`
- `SavedPlansList`
- `RememberPlaceConsent`
- `DeleteMyDataDialog`

This is a proposed inventory, not a command to create every component. Reuse and extend current equivalents.

---

## 8. Component selection for Ask AirAware

Before installing assistant-ui, inspect the existing chat implementation and compare these approaches:

| Option | Advantages | Risks / checks | When to choose |
|---|---|---|---|
| Improve current custom chat | Least change; preserves existing API and styling | More custom work for scroll, accessibility, streaming, message states | Prefer if the current chat is already substantial and well tested |
| assistant-ui with custom runtime/adapter | Ready-made chat interaction primitives; backend can remain separate | Check current API compatibility, bundle, theming, message schema, server response and streaming support | Choose if it meaningfully reduces UI implementation effort |
| Build with shadcn/Radix | Maximum visual and behaviour control | Must implement message history, scroll, keyboard, error/loading and accessibility correctly | Choose if assistant-ui conflicts with architecture or introduces excessive complexity |

**Assistant response structure:**

1. A direct answer in natural language.
2. One or more actionable suggestions from approved rules.
3. “Why this suggestion?” with its inputs and limitations.
4. “What this answer used” showing selected place, data type, provider and timestamp.
5. Useful follow-up questions.

Do not show a fake citation or unsupported source. If the rule engine or forecast data does not support the question, the assistant must say what it cannot determine and offer a relevant supported alternative.

---

## 9. Motion and interaction design references

### 9.1 Reference libraries

| Reference | Useful for | AirAware use |
|---|---|---|
| **Emil Kowalski skills** — https://github.com/emilkowalski/skills | Interaction quality, timing, transitions and motion craft | Buttons, menus, dialogs, assistant feedback and polish |
| **Motion for React** — https://motion.dev/ | Layout transitions, gestures, presence and interaction animation | Assistant message entrance, prompt selection, drawers and light layout changes |
| **GSAP** — https://gsap.com/ | Complex timeline and scroll choreography | Optional landing-page storytelling only; not routine dashboard UI |
| **GSAP Skills** — https://github.com/greensock/gsap-skills | Agent guidance for GSAP workflows | Use only when GSAP is approved and complex sequences are justified |
| **Web Animation Skills** — https://github.com/iart-ai/web-animation-skills | SVG, micro-interaction and web-animation workflows | Cityscape and icon motion exploration |
| **Rive** — https://rive.app/ | State-driven interactive vector animation | Optional assistant mascot or onboarding illustration |
| **LottieFiles** — https://lottiefiles.com/ | Lightweight vector animation assets | Optional empty/loading/education illustrations; check asset licence |
| **Lenis** — https://lenis.darkroom.engineering/ | Smooth scrolling | Not recommended by default; native scrolling is more predictable and accessible |

### 9.2 Motion language

- Use CSS for ordinary hover, active, focus, accordion and simple crossfade states.
- Use one primary React animation runtime if actual layout/gesture animation is needed.
- Use GSAP only for an intentional multi-step timeline or scroll sequence.
- Do not combine Motion and GSAP for the same simple interaction.
- Do not animate every card as it enters the viewport.
- Avoid infinite decorative loops behind important text.

Suggested initial timings (validate in the running app):

| Interaction | Suggested duration |
|---|---:|
| Button press feedback | 100–160 ms |
| Hover/focus surface transition | 120–180 ms |
| Tooltip/popover | 140–200 ms |
| Small panel expand/collapse | 180–240 ms |
| Assistant message entrance | 160–240 ms |
| Cityscape crossfade | 400–700 ms |

Respect `prefers-reduced-motion`. In reduced-motion mode, remove non-essential movement and use immediate or opacity-only state changes. Keep information and function available without animation.

### 9.3 Suggested AirAware interactions

- Button press feedback and clear disabled/loading states.
- Location chip opens a compact location picker.
- “Why?” expands inline or in a drawer without losing scroll position.
- Assistant messages appear without shifting earlier messages unnecessarily.
- Prompt chips populate the composer or submit a predefined prompt with a clear state.
- Cityscape images crossfade only when the verified application state changes.
- Forecast chart reveals values on keyboard and pointer interaction.
- Navigation shows active state using both text/icon treatment and more than colour alone.

---

## 10. 3D, cityscape and illustrative references

### 10.1 3D repositories and tools

| Reference | Purpose | AirAware recommendation |
|---|---|---|
| **Three.js** — https://threejs.org/ and https://github.com/mrdoob/three.js | WebGL 3D engine | Advanced option, not required for initial redesign |
| **React Three Fiber** — https://r3f.docs.pmnd.rs/ and https://github.com/pmndrs/react-three-fiber | React renderer for Three.js | Use only if an interactive 3D city scene provides meaningful value |
| **Drei** — https://drei.docs.pmnd.rs/ and https://github.com/pmndrs/drei | Helpers for React Three Fiber | Add only with R3F |
| **Spline** — https://spline.design/ | Visual 3D scene authoring | Prototype a small hero scene; assess embed/runtime and mobile cost |
| **Theatre.js** — https://theatrejs.com/ and https://github.com/theatre-js/theatre | Visual animation choreography | Optional for an authored landing-page sequence, not dashboard interactions |
| **Babylon.js** — https://www.babylonjs.com/ and https://github.com/BabylonJS/Babylon.js | Full-featured 3D engine | Likely unnecessary unless the project becomes an interactive 3D experience |
| **PixiJS** — https://pixijs.com/ and https://github.com/pixijs/pixijs | 2D GPU-accelerated rendering | Optional for complex 2D city/particle scenes if SVG/CSS is insufficient |
| **Blender** — https://www.blender.org/ | Create/render 3D source assets | Good for producing static city assets without a live 3D runtime |
| **PlayCanvas** — https://playcanvas.com/ and https://github.com/playcanvas/engine | Interactive 3D engine | Alternative to evaluate, not to combine by default |

### 10.2 Recommended cityscape approach

**Stage 1 — Use the existing assets.**

Keep the supplied cityscape background variants. Use CSS/SVG overlays for atmospheric depth, subtle cloud movement and crossfades. This is the lowest-risk route and is likely enough for the current application.

**Stage 2 — Improve the illustration.**

Consider layered SVG or transparent PNG assets for foreground, midground and distant buildings. Add only subtle movement and ensure the main data content remains readable.

**Stage 3 — Prototype 3D only if justified.**

Create a separate prototype using Spline or React Three Fiber. Compare its real performance and usability against the static/2D scene before deciding whether to ship it.

3D requirements:

- lazy-load the scene;
- provide a static image fallback;
- do not block the Today dashboard while loading;
- test on a mid-range mobile device;
- respect reduced motion;
- keep text and controls outside the canvas where possible;
- measure bundle and runtime cost;
- do not use simulated haze as an environmental measurement.

### 10.3 Air-quality background state mapping

Use only existing verified AirAware state:

- Forecast within the existing 24-hour comparison limits: use the supplied clearer-sky image.
- Forecast above those limits: use the supplied more muted/hazy image.
- Unavailable data: use neutral unavailable image.
- Stale data: preserve the valid last-known state if the existing app does so, and keep the “Not current” warning visible.
- Loading: use a neutral placeholder, not a positive or negative scene.

Weather controls weather visuals; the existing air-quality state controls the atmosphere. Never infer pollution from clouds, rain, sunshine or temperature.

---

## 11. Skills directory: what to use and when

The uploaded `UI_UX_Animation_Motion_3D_Skills_Directory.md` is a catalogue of candidate resources. It is **not proof that each skill is installed**. Claude must check installed skill directories and read the actual `SKILL.md` before using a skill.

### 11.1 UI/UX and visual design skills

| Skill/repository | Link | Best use | Recommendation |
|---|---|---|---|
| Anthropic Skills | https://github.com/anthropics/skills | Frontend design guidance and agent workflows | Inspect relevant skill; do not install entire collection |
| Hallmark | https://github.com/nutlope/hallmark | UI/UX critique and redesign | Project note says use only if owner explicitly names/approves it; keep optional |
| Impeccable | https://github.com/pbakaus/impeccable | Visual polish, design critique and accessibility | Candidate for a design review; check overlap and current instructions |
| UI UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | Design system guidance, typography, palettes and UI patterns | Useful for initial design-system proposal; don't let it override existing tokens blindly |
| Taste | https://github.com/Leonxlnx/taste-skill | Creative direction and art direction | Useful for two visual concepts and moodboards |
| Emil Kowalski Skills | https://github.com/emilkowalski/skills | Design engineering and interaction polish | Recommended for interaction/motion phase; some project use already recorded |
| Ibelick UI Skills | https://github.com/ibelick/ui-skills | UI quality and accessibility | Optional targeted review |
| Frontend Skills Stack | https://github.com/JaimeJunr/claude-code-frontend-skills | Combined frontend workflows | Inspect for overlap; do not install as a duplicate of several individual skills |
| `airaware-ui` | Project-local skill | AirAware-specific patterns and workflow | Prefer it for project conventions |
| `design-taste-frontend` / `frontend-design` | Check current installed skills | Visual direction and interface quality | Candidate; verify availability before use |
| `mobile-native` | Check current installed skills | Mobile layout and touch interaction | Previously recorded as used; reuse if still installed |
| `modern-web-guidance` | https://github.com/GoogleChrome/modern-web-guidance | Browser and modern web best practices | Required by the recorded `airaware-ui` workflow before HTML/CSS/client JS work |
| `break-ui` | Check current installed skills | Edge cases and responsive stress tests | Use during review and QA |

### 11.2 Animation and motion skills

| Skill/repository | Link | Best use | Recommendation |
|---|---|---|---|
| GSAP Skills | https://github.com/greensock/gsap-skills | GSAP timelines, scroll and advanced animation | Only for complex landing-page sequences |
| Web Animation Skills | https://github.com/iart-ai/web-animation-skills | SVG, micro-interaction and web animation | Optional for the cityscape/motion design phase |
| Meng To Skills | https://github.com/MengTo/Skills | Creative interactions and visual effects | Inspiration/specialist reference; inspect for relevant task |
| Motion Skills | https://github.com/iart-ai/motion-skills | Motion graphics and animation workflows | Optional specialist reference |
| Emil design engineering | https://github.com/emilkowalski/skills | Timing, transitions and interaction quality | Preferred first for routine interface polish |

### 11.3 3D skills

| Skill/repository | Link | Best use | Recommendation |
|---|---|---|---|
| Claude Design Skillstack | https://github.com/freshtechbro/claudedesignskills | 3D, GSAP, R3F and creative workflows | Inspect only the relevant skill; verify dependencies and overlap |
| Three.js Skills | https://github.com/wolffe/three.js-skills | Geometry, shader and Three.js workflows | Only if a 3D prototype is approved |

### 11.4 Quality skills and tools

- Google Chrome Modern Web Guidance: https://github.com/GoogleChrome/modern-web-guidance
- UI/UX Audit Skill: https://github.com/EnchStyle/ui-ux-audit-skill
- Playwright: https://playwright.dev/ and https://github.com/microsoft/playwright
- axe-core: https://github.com/dequelabs/axe-core

### 11.5 Recommended small skill packs

Do not activate everything at once. Use task-specific packs:

| Task | Suggested pack |
|---|---|
| Initial product audit | `airaware-ui` + `modern-web-guidance` + `break-ui` |
| Visual direction | `airaware-ui` + `Taste` or `design-taste-frontend` + `modern-web-guidance` |
| Frontend implementation | `airaware-ui` + `modern-web-guidance` + `mobile-native` |
| Ask AirAware polish | `airaware-ui` + `modern-web-guidance` + `emil-design-eng` |
| Complex landing animation | `modern-web-guidance` + relevant GSAP skill + `emil-design-eng` |
| 3D prototype | `modern-web-guidance` + Three.js skill + relevant R3F/3D guidance |
| Final QA | `break-ui` + `modern-web-guidance` + Playwright/axe tooling |

**Project-specific instruction:** The previous skills note says Hallmark should only be used again if the owner names it. Do not invoke it automatically from this guide.

---

## 12. Repository, documentation and component references

### UI foundations and components

- shadcn/ui: https://github.com/shadcn-ui/ui
- Radix UI Primitives: https://github.com/radix-ui/primitives
- assistant-ui: https://github.com/assistant-ui/assistant-ui
- React Bits: https://github.com/DavidHDev/react-bits
- Magic UI: https://github.com/magicuidesign/magicui
- Motion Primitives: https://github.com/ibelick/motion-primitives
- Aceternity UI: https://github.com/aceternity/aceternity-ui
- Origin UI: https://github.com/origin-space/originui

### Motion and animation

- Motion: https://github.com/motiondivision/motion
- GSAP: https://gsap.com/
- Theatre.js: https://github.com/theatre-js/theatre
- Rive: https://rive.app/
- LottieFiles: https://lottiefiles.com/
- Lenis: https://lenis.darkroom.engineering/

### 3D and graphics

- Three.js: https://github.com/mrdoob/three.js
- React Three Fiber: https://github.com/pmndrs/react-three-fiber
- Drei: https://github.com/pmndrs/drei
- Babylon.js: https://github.com/BabylonJS/Babylon.js
- PixiJS: https://github.com/pixijs/pixijs
- PlayCanvas: https://github.com/playcanvas/engine
- Blender: https://www.blender.org/
- Spline: https://spline.design/

### Product quality and interface guidance

- Vercel Web Interface Guidelines: https://vercel.com/design/guidelines
- Google Chrome Modern Web Guidance: https://github.com/GoogleChrome/modern-web-guidance
- Playwright: https://playwright.dev/
- axe-core: https://github.com/dequelabs/axe-core
- Lucide: https://lucide.dev/icons
- Recharts: https://recharts.org/

Before using any repository or library, check its latest README, documentation, license, compatibility, maintenance and installation requirements. Do not treat a GitHub repository link as proof that a Claude Code skill exists or is installed.

---

## 13. Visual and interaction design standards

### 13.1 Design identity

Suggested direction: **calm atmospheric environmental intelligence**.

- Preserve the existing AirAware brand and approved design tokens.
- Use a clear light application surface with strong text contrast.
- Use dark/natural atmospheric visuals selectively for the landing page and cityscape.
- Treat the skyline as a brand element, not as a data visualization.
- Use cards only for meaningful objects such as recommendations, saved plans or pollutant details.
- Prefer clean editorial sections over a stack of identical bordered cards.
- Use one strong primary action per screen.
- Keep technical definitions available but out of the default reading path.

### 13.2 Responsiveness

Review at minimum:

- 320 × 640 mobile;
- 390 × 844 mobile;
- 768 × 1024 tablet;
- 1280 × 720 desktop;
- 1440 × 900 desktop.

Mobile requirements:

- thumb-friendly navigation;
- minimum 44px touch targets where applicable;
- safe-area padding for bottom navigation;
- message composer clears the keyboard and remains usable;
- no horizontal overflow;
- charts have accessible text summaries;
- long city names wrap or truncate intentionally.

Desktop requirements:

- readable content width;
- no unnecessary sidebar if top navigation works better;
- dashboard hierarchy remains clear;
- chat messages do not stretch across the entire screen;
- no hover-only interaction.

### 13.3 Accessibility and interaction quality

Follow WCAG-aware patterns and Vercel's Web Interface Guidelines:

- keyboard-operable flows;
- visible focus rings;
- proper focus management in dialogs and sheets;
- meaningful labels and accessible names;
- mobile tap target size;
- respect browser zoom;
- do not block paste;
- preserve focus/value in hydrated inputs;
- errors appear next to relevant inputs;
- loading buttons retain a clear label and show progress;
- reduced motion support;
- sufficient contrast in all cityscape states.

---

## 14. AirAware data, AI and safety constraints

These rules override any feature idea in a reference website.

### 14.1 Data integrity

Based on the project's documented current design, Open-Meteo model forecasts are used and the app compares the appropriate forecast values against India's 24-hour limits. No official CPCB station observations are connected in that recorded state.

Claude must re-verify the current code and provider setup, but must not silently change these labels or calculations.

- Label model forecasts as model forecasts.
- Keep the “Not current” banner for stale data.
- Never represent a model forecast as a monitoring-station observation.
- Never fabricate CPCB observations.
- Do not introduce CPCB National AQI, US AQI or European AQI calculations without a separate approved and validated methodology.
- Do not infer pollutant levels from the weather or cityscape illustration.
- Keep source, timestamp, unit, data kind and limitation information.
- If data is missing, display that it is missing.

### 14.2 AI behaviour

- Server-side code owns retrieval of the approved forecast/context.
- The browser must not be trusted as the source of pollutant values.
- Match supported user intents to approved recommendation/rule cards.
- The model may explain/rephrase grounded guidance; deterministic code owns calculations and validation.
- Validate AI output with the existing schema.
- Include source, time and caveat where relevant.
- If the AI provider fails, use the approved fallback or explain the failure; do not generate plausible filler.
- Do not claim an action or booking was completed unless the application confirms it.

### 14.3 Indoor-air boundary

Do not represent outdoor readings as indoor measurements. Any indoor guidance derived from outdoor data must label that context clearly. Avoid a blanket instruction to open or close windows without appropriate data and caveats.

### 14.4 Health and safety

- No diagnosis, treatment or medication advice.
- No promises that an activity or location is safe.
- Avoid unsupported categorical wording such as “safe”, “healthy”, “clean air” or “good air”.
- Do not collect unnecessary sensitive household/health information.
- Keep preferences optional and preserve current privacy/deletion behaviour.

### 14.5 Sustainability and commute calculations

A transport comparison or emissions estimate must disclose:

- factor source;
- calculation formula;
- units;
- distance and trip assumptions;
- occupancy and mode assumptions;
- date/version of the factor where relevant;
- uncertainty and limitations.

If verified factors are not available, show qualitative trade-offs only. Do not invent savings figures.

---

## 15. Phased rollout and prioritization

| Phase | Deliverable | Main outcome | Priority |
|---|---|---|---|
| 0 | Live-site and code audit | Current source of truth and issue ranking | Must do first |
| 1 | Design system and navigation | Consistent product shell | Critical |
| 2 | Today dashboard | Clear answer and top recommendation | Critical |
| 3 | Ask AirAware | Grounded conversational assistant | Critical |
| 4 | My Home and Better Habits | Discoverable, practical guidance | High |
| 5 | Daily Plan refinement | Time-based useful suggestions | High |
| 6 | Landing/onboarding improvement | Better first-time experience | High |
| 7 | Learn, sources and insights | Product education and data transparency | Medium |
| 8 | Motion and cityscape polish | Memorable but restrained brand experience | Medium |
| 9 | Optional 3D prototype | Evaluate whether 3D adds real value | Experimental |

Do not ship all features in one release. Each phase should have its own screenshots, tests and review.

---

## 16. Required deliverables before implementation

Claude should create the following under `docs/redesign/reference-review/`:

1. `01_LIVE_AIRAWARE_AUDIT.md` — current production screens, routes, states and usability findings.
2. `02_REFERENCE_WEBSITE_REVIEW.md` — observed patterns from all three references; mark unavailable pages clearly.
3. `03_FEATURE_ADAPTATION_MATRIX.md` — reference → user problem → AirAware feature → required data/API → priority.
4. `04_SKILL_SELECTION.md` — installed status, exact skill instructions read, selected skills and rejected overlaps.
5. `05_COMPONENT_LIBRARY_DECISIONS.md` — existing components vs shadcn/Radix/assistant-ui/other libraries.
6. `06_INFORMATION_ARCHITECTURE.md` — page map and user journeys.
7. `07_VISUAL_DIRECTIONS.md` — two coherent design directions and a recommendation.
8. `08_SCREEN_WIREFRAMES.md` — desktop/mobile layouts for the core screens.
9. `09_MOTION_AND_3D_PLAN.md` — proposed effects, runtime choices, reduced-motion behaviour and fallbacks.
10. `10_FEATURE_ROADMAP.md` — phased priorities and feature dependencies.
11. `11_DATA_AND_SAFETY_REVIEW.md` — what each proposed feature can truthfully display.
12. `12_ACCEPTANCE_AND_TEST_PLAN.md` — responsive, accessibility, performance and regression criteria.

Use screenshots captured from the actual browser. Do not use invented screenshot paths or claim that a page loaded if it did not.

---

## 17. Acceptance criteria

The redesign is ready for a phase review only when:

- the relevant route works on desktop and mobile;
- the main user task is clear without reading lengthy explanations;
- current AirAware functionality remains intact;
- API contracts and rate limits remain respected;
- missing/stale/error states are tested;
- source and forecast labels remain correct;
- there is no unsupported AQI, medical, safety, indoor measurement or emissions claim;
- keyboard and screen-reader interaction is usable;
- focus indicators and reduced-motion behaviour work;
- charts have text summaries;
- no horizontal overflow appears at tested viewport sizes;
- relevant unit, integration, E2E and axe checks have actually run;
- screenshots are captured from the running application;
- Claude lists files changed and reports genuine test outcomes.

---

## 18. Claude Code master prompt

The master prompt (approval-gated, Phase 0 and Phase 1 proposal only, then one approved phase at a time) was supplied with this guide in the owner's chat on 28 Nov 2026. Its requirements are covered by sections 1–17 above and by docs 01–15; the owner's rulings on it are J28.

---

## 19. Recommended first implementation sequence

1. Complete the live-site audit and reference review.
2. Approve one visual direction and information architecture.
3. Improve the application shell and navigation.
4. Redesign Today around the plain-language verdict and top recommendation.
5. Redesign Ask AirAware using the current backend and grounded context.
6. Move home guidance and better habits into discoverable screens.
7. Improve landing and onboarding.
8. Polish cityscape, motion, accessibility and performance.
9. Consider Insights and any calculator only after data availability and methodology are verified.
10. Consider 3D only after a prototype demonstrates user value and acceptable mobile performance.

**The guiding principle:** make AirAware easier to understand and more useful before making it more animated or technically complex.

---

## 20. Sources and direct links

Product references: SaafSaans (https://saafsaans-382086946715.asia-south1.run.app/), Alternate AirAware AI (https://airaware-ai-nine.vercel.app/), UrbanAir AI Advisor (https://urban-air-ai.vercel.app/ai), current AirAware (https://airaware-ai.netlify.app/). Library, motion, 3D and skill links are listed in sections 7, 9, 10, 11 and 12.

## Source review notes

The three product URLs above were opened for this guide. The alternate AirAware page exposed its feature descriptions and examples; the UrbanAir AI route exposed navigation/resources but its AI workspace remained in a loading state; SaafSaans exposed only its page title in text extraction. The current Netlify site did not expose readable rendered content to the web text extractor. Claude must therefore verify the sites in an actual browser before treating any unverified interaction as observed.

The previously supplied AirAware UX audit is a historical audit dated 20 November 2026. It must be rechecked against the current repository and deployment before implementation.
