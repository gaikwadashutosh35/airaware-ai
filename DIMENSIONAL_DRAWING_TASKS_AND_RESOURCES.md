# AirAware AI — Dimensional Drawing Tasks and Resources

## 1. Why this skill is in the project

Repository: https://github.com/enesozturk/dimensional-drawing

The `dimensional-drawing` skill creates an Apple-style monochrome technical drawing of an existing UI component. It documents:
- Width, height, and viewport placement.
- Padding and gaps.
- Corner radii and borders.
- Layer stack and shadow envelope.
- Flexible, fixed, fill, and content-sized regions.
- Responsive page or navigation layouts.

It is a **design documentation and measurement tool**, not a UI redesign tool, CSS generator, or website builder.

The primary output is a self-contained HTML file. The skill's drawing conventions are monochrome, neutral/unbranded, and variable-based. Unknown measurements must remain `[TBD]`; never invent dimensions.

## 2. Recommended AirAware tasks

Use the skill only for components whose geometry is important, reused, complex, or likely to change. Do not create a drawing for every tiny icon or text element.

### Priority 1 — Today dashboard

**Inspect:** the real React route/page and rendered child components.

**Document:**
- Main content container and maximum width.
- Desktop sidebar/top navigation relationship.
- Header and location control.
- Main air-quality summary region.
- Primary recommendation area.
- Quick-action layout and assistant entry point.
- Tablet/mobile reflow and navigation.

**Output:** `docs/design/dimensional-drawings/today-dashboard.html`

**Acceptance:** measurements come from the running app; desktop and mobile layouts are included where implemented; unknown breakpoint values remain `[TBD]`; no React/CSS source is changed during this documentation task.

### Priority 2 — Daily recommendation card

Document outer dimensions, responsive width, internal padding, stack gaps, status/priority region, recommendation slot, explanation disclosure, actions, border, radius, and shadow.

**Output:** `docs/design/dimensional-drawings/recommendation-card.html`

### Priority 3 — Ask AirAware assistant

Document conversation viewport, scroll region, header, message anatomy, suggested prompts, composer/input, send action, and responsive/mobile behavior.

**Output:** `docs/design/dimensional-drawings/assistant-panel.html`

### Priority 4 — Location selection dialog

Document dialog width and viewport placement, scrim/layer order, header/close control, search field, result rows, empty/loading/error states, and mobile sheet behavior where implemented.

**Output:** `docs/design/dimensional-drawings/location-dialog.html`

### Priority 5 — Advanced air-quality details

Document the summary/details disclosure, pollutant rows, value/unit alignment, provider/timestamp metadata, forecast-vs-observation label, data freshness, limitations, chart container, and responsive behavior.

**Output:** `docs/design/dimensional-drawings/air-quality-details.html`

### Priority 6 — My Home recommendations

Document home-context summary, categories, recommendation cards/rows, expandable rationale/caveats, and responsive stacking.

**Output:** `docs/design/dimensional-drawings/my-home-section.html`

### Priority 7 — Onboarding wizard (optional)

Document step header/progress, form groups, optional fields, skip/back/next actions, and responsive behavior.

**Output:** `docs/design/dimensional-drawings/onboarding-wizard.html`

### Optional — Drawing animation

The repository also contains `dimensional-drawing-motion`. Use it only after a static drawing is reviewed and approved. It animates the drawing sheet into a short technical film; it is not required for production UI and should not become a product dependency.

## 3. Task execution checklist

| ID | Task | Completion evidence |
|---|---|---|
| DD-00 | Inspect routes/components and choose target | Component inventory |
| DD-01 | Confirm app runs; select viewport sizes | Run command and viewport record |
| DD-02 | Inspect source and repeated component instances | Source paths and usage counts |
| DD-03 | Render with Playwright and wait for fonts/layout | Browser measurement output |
| DD-04 | Measure boxes and computed CSS | `getBoundingClientRect()` and `getComputedStyle()` |
| DD-05 | Create drawing from repository examples | Self-contained HTML |
| DD-06 | Render drawing at wide viewport | Screenshot/manual review |
| DD-07 | Fix overlap, clipping, leader lines, and formula errors | Second render |
| DD-08 | Design-owner review | Accepted/revision status |
| DD-09 | Repeat for next high-priority component | Additional drawing |
| DD-10 | Optionally animate approved drawing | MP4/artifact if requested |

**First iteration:** Do not create all seven drawings at once. Start with Today dashboard, recommendation card, assistant panel, and location dialog. Review those four before expanding scope.

## 4. Measurement procedure

The repository's skill directs the agent to inspect real source and render the component in Playwright. Follow this process:

1. Identify the actual source file and component instances.
2. Start the application using its existing development command.
3. Navigate to the target route.
4. Set explicit viewport sizes.
5. Wait for fonts and layout to settle.
6. Inspect elements using `getBoundingClientRect()`.
7. Inspect computed CSS: padding, gap, radius, border, min-height, flex-shrink, min-width.
8. Survey repeated instances so shared variables represent the design system, not one accidental example.
9. Generate the drawing.
10. Render around 1800 px wide and inspect label overlap and sheet overflow.

Do not infer hidden mobile states or unrendered breakpoints. Mark unknown values `[TBD]`.

## 5. Installation — Windows PowerShell, project-scoped

Run from the AirAware repository root. This installs the skill only for this project and keeps the worked examples alongside `SKILL.md`.

```powershell
$repo = Join-Path $env:TEMP "dimensional-drawing"
$dest = Join-Path (Get-Location) ".claude\skills\dimensional-drawing"

if (Test-Path $repo) {
  Remove-Item -Recurse -Force $repo
}

git clone --depth 1 https://github.com/enesozturk/dimensional-drawing.git $repo

New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item "$repo\skills\dimensional-drawing\*" $dest -Recurse -Force

Remove-Item -Recurse -Force $repo
```

Verify:

```powershell
Test-Path ".claude\skills\dimensional-drawing\SKILL.md"
Get-ChildItem ".claude\skills\dimensional-drawing" -Recurse
```

Restart Claude Code after installing/updating the skill. Claude Code project skills use `.claude/skills/<skill-name>/SKILL.md`; the directory name becomes the invocation name.

### Optional motion skill

Only install when animated technical drawings are specifically required:

```powershell
$repo = Join-Path $env:TEMP "dimensional-drawing"
$dest = Join-Path (Get-Location) ".claude\skills\dimensional-drawing-motion"

if (-not (Test-Path $repo)) {
  git clone --depth 1 https://github.com/enesozturk/dimensional-drawing.git $repo
}

New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item "$repo\skills\dimensional-drawing-motion\*" $dest -Recurse -Force
```

The repository README says its headless motion adapter requires Node.js 18+ and FFmpeg. This is optional and not needed for the main redesign.

## 6. Resources

### Primary repository and skill instructions
- Repository: https://github.com/enesozturk/dimensional-drawing
- Main `SKILL.md`: https://raw.githubusercontent.com/enesozturk/dimensional-drawing/main/skills/dimensional-drawing/SKILL.md
- Motion `SKILL.md`: https://raw.githubusercontent.com/enesozturk/dimensional-drawing/main/skills/dimensional-drawing-motion/SKILL.md
- License: MIT, as listed in the repository. Recheck the license in the version you install.

### Worked examples
- Card drawing: https://raw.githubusercontent.com/enesozturk/dimensional-drawing/main/skills/dimensional-drawing/examples/card-sheet.html
- Dialog drawing: https://raw.githubusercontent.com/enesozturk/dimensional-drawing/main/skills/dimensional-drawing/examples/dialog-sheet.html
- Motion assets: https://github.com/enesozturk/dimensional-drawing/tree/main/assets

### Design and implementation references
- Apple's dimensional drawings: https://developer.apple.com/accessories/dimensional-drawings/
- Claude Code skills documentation: https://code.claude.com/docs/en/skills
- Playwright documentation: https://playwright.dev/docs/intro

## 7. Master task prompt

```text
Use the dimensional-drawing skill installed in
.claude/skills/dimensional-drawing/.

Project: AirAware AI.
Task: Create a dimensional drawing of [COMPONENT/ROUTE].

First inspect the real source code and identify the component
hierarchy and repeated component instances.

Run the existing application. Use Playwright to render the
actual UI at the agreed viewport sizes. Wait for fonts and layout
to stabilize. Measure actual element boxes with
getBoundingClientRect() and computed styles with
getComputedStyle().

Document real widths, heights, padding, gaps, border widths,
corner radii, layout slots, flex behavior, layer stack, shadow
envelope, viewport placement, and verifiable responsive behavior.

Follow the skill's house rules:
- monochrome grayscale only;
- neutral/unbranded drawing;
- architecture/slots rather than product copy;
- variable identifiers and formula tables;
- unknown values stay [TBD];
- one dense, legible sheet where practical.

Use the repository's card/dialog examples as the drawing kit.
Output one self-contained HTML file at the path I specify.

Do not modify React, CSS, API, or database source code during
this documentation task. Do not invent measurements.

Render the drawing at a wide viewport, inspect the screenshot,
correct label overlap and sheet overflow, and report any [TBD]
values. Include measured viewport and source component path.

Begin with the Today dashboard. Do not create all drawings
until this first sheet is reviewed.
```

## 8. Definition of done

A drawing is complete only when:
- The component exists in the real application.
- Measurements come from a rendered instance.
- Source path and viewport are recorded.
- Each dimension code appears in a variable table.
- Formulas reconcile with measured geometry.
- Unknown values remain `[TBD]`.
- Sheet is grayscale and neutral/unbranded.
- HTML is self-contained.
- Rendered sheet has no unintended label overlap or clipping.
- Design owner has reviewed it.

## 9. What this task does not do

- It does not redesign the UI.
- It does not generate production React components.
- It does not choose brand colors or typography.
- It does not prove usability or accessibility.
- It does not replace Unslop, Hallmark, accessibility testing, or browser QA.
- It does not prove responsiveness beyond the viewports actually inspected.

Use dimensional drawings as engineering/design documentation between UX decisions and implementation review.
