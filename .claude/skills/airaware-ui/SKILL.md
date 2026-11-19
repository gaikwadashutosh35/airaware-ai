---
name: airaware-ui
description: Use when changing, fixing, polishing or reviewing anything a person sees in the AirAware client (client/src) - layout, spacing, colour, type, components, phone or touch behaviour, motion, accessibility - or when the owner says the UI or UX looks off, cramped, broken, generic or hard to use.
---

# AirAware UI/UX workflow

## Overview

Every UI change here follows one order: know the design rules, see the real screen, audit it with the skill that fits the symptom, agree the fix, fix it test-first, then prove it at two widths. The installed UI skills do the judging; this skill says which one, when, and what "done" means.

## The order (every step, every time)

1. **Read the rules.** Read `DESIGN.md` (§3 tokens, §5 layout, §8 components, §10 responsive, §13 acceptance checklist), `ACCESSIBILITY.md`, and `.claude/rules/frontend.md` + `air-data.md`. Colours, spacing and type come from the tokens in `client/src/index.css`; never invent new ones.
2. **Load `modern-web-guidance`** before writing any HTML, CSS or client JS.
3. **See it first.** Start the `api` and `web` servers from `.claude/launch.json` (built-in browser `preview_start`). Screenshot the screen at **320 px** and **1280 px** wide before touching code. Write down what is actually wrong.
4. **Audit with the skill that fits the symptom** (table below). Load only those.
5. **Report, then fix.** Tell the owner the findings and the smallest fix for each. A broad redesign, a new dependency or a new component library waits for the owner's yes (`AGENTS.md` §9).
6. **Fix test-first.** For anything testable (roles, names, labels, states, `min-h-11` tap targets, focus), change or add the component test in `client/src` first and watch it fail. Make the smallest change. Keep data-kind labels, stale/unavailable states, sources, units and timestamps exactly as they are.
7. **Prove it** (Done checklist below), then report with before/after screenshots.

## Which skill for which symptom

| Symptom | Load |
|---|---|
| Cramped, overflowing, long names/labels, empty or huge lists | `break-ui` |
| Hard to tap, zooms, wrong on a phone, notch, 100vh | `mobile-native` |
| Looks generic, "off", unpolished, inconsistent | `emil-design-eng` (critique), then `design-taste-frontend` if it needs direction |
| Motion feels wrong or is missing | `review-animations` / `improve-animations`; `animate` to build new |
| Charts | `dataviz` |
| New page or full redesign | `hallmark`, **only when the owner names it** (it refuses existing designs otherwise) |
| Component ideas from 21st.dev | `21st-ui-explore`, only after the owner has signed in via `/mcp`; any new dependency needs a yes |
| AI-looking UI clean-up (`DESIGN.md` §12) | Unslop, **only if it appears in the installed skill list**; never claim it ran otherwise |

## Done checklist (all, with real output)

- `npm test`, `npm run typecheck`, `npm run lint` (oxlint, not ESLint), `npm run format:check`.
- Browser at 320 px and 1280 px: no horizontal scroll, nothing clipped, before/after screenshots.
- Tap targets at least 44 px (`min-h-11`) on touch controls.
- Keyboard: Tab reaches every control in visual order, focus is visible, Escape closes overlays.
- The component's test calls `expectNoAxeViolations` (`client/src/test/axe.ts`).
- `prefers-reduced-motion` respected for any motion you touched.
- For layout changes, `npm run e2e` (Playwright `desktop` and `phone` projects).
- Report: what changed, which skills you actually loaded, each check and its result. Unrun checks are named as unrun.

## Common mistakes

| Mistake | Instead |
|---|---|
| Editing CSS before looking at the rendered screen | Screenshot at 320 and 1280 first |
| Checking one phone width only | 320 **and** 1280, every time |
| Hallmark on an existing screen | Only when the owner names Hallmark |
| "Unslop audit done" when it isn't installed | Say it was skipped |
| New colours, sizes or a UI library "to fix it" | Use `DESIGN.md` tokens; new libraries need a yes |
| Rewording an air-quality label to make it fit | Fix the layout; the label's wording is a data rule |
| "Looks fine" with no screenshot or axe result | Show the evidence |
