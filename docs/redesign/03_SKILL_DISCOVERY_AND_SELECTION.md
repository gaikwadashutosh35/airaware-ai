# 03 · Skill discovery and selection

**Date:** 28 Nov 2026. **Status:** read-only proposal for the owner. Nothing was installed, changed or run against the app.

**How to read this:**
- **OBSERVED** means I saw it on disk, in a doc, or in a public repo record. Each one has a path, a `file:line` or a URL.
- **RECOMMENDED** is my proposal. It waits for the owner's yes.
- "Installed" means a `SKILL.md` exists on this machine. It does not mean the skill can run now (see §3).

**Method (OBSERVED):**
- I listed `.claude/skills/` in the project, `C:/Users/Ashutosh/.claude/skills/`, `C:/Users/Ashutosh/.agents/skills/` and every `SKILL.md` under `C:/Users/Ashutosh/.claude/plugins/cache/`.
- I read the install records `C:/Users/Ashutosh/.agents/.skill-lock.json`, `C:/Users/Ashutosh/.claude/plugins/installed_plugins.json` and `C:/Users/Ashutosh/.claude/plugins/known_marketplaces.json`.
- I read each candidate's `SKILL.md`: in full for `airaware-ui`, and the frontmatter, hard rules and section headings for the rest (§7 lists what was skimmed).
- For skills that are not installed, I checked the public repo and its licence with read-only GitHub API calls (`api.github.com/repos/<owner>/<repo>`) on 28 Nov 2026.
- No skill was invoked with the Skill tool, and nothing was installed.

---

## 1. Summary

1. **`airaware-ui` is the entry point for every UI change, and it requires `modern-web-guidance` before any HTML, CSS or client JS** (OBSERVED: `.claude/skills/airaware-ui/SKILL.md:15`; `docs/UI_SKILLS_AND_REDESIGN.md:17`; `AirAware_Ask_AirAware_Assistant_Interaction_UX_Spec.md:715`).
2. **`modern-web-guidance` is installed but cannot run in this phase.** Its workflow is `npx -y modern-web-guidance@latest search …`, which downloads an npm package that is not in `node_modules`. The read-only gate forbids that download. It ran in an earlier stage (`docs/redesign/DESIGN_CONCEPTS.md:196`). **RECOMMENDED:** the owner approves that `npx` call once per implementation phase.
3. **No runtime animation or 3D library is installed.** gsap, three, `@react-three/fiber`, `@react-three/drei`, motion and framer-motion are all absent from `node_modules`.
   - The earlier decisions were made on the principle of "no new dependency" (`OWNER_DECISIONS.md:15`) and "art direction only, no PNG" (H4).
   - The cityscape spec allows a runtime library only "unless separately approved" (`AirAware_AI_Adaptive_Cityscape_Background_Spec.md:203`), and it rules out Framer Motion (`:267, :413`).
   - **No such approval exists.** So the GSAP, Three.js/R3F and web-animation skill packs are **not installed and not recommended now**.
   - **What would change this:** the owner approves a specific 3D or timeline scene and its dependency. Then the matching skill pack is scanned with `skillspector` before install.
4. **Never use Hallmark.** It is installed, but the brief needs the owner's approval for it, and its own description refuses existing designs unless named. `airaware-ui` says the same.
5. **"taste" and `design-taste-frontend` are the same skill** (lock file: `Leonxlnx/taste-skill`, `skills/taste-skill/SKILL.md`). It targets company and landing pages and was already set aside once for breaking the token rule (`DESIGN_CONCEPTS.md:197`).
6. **At most three skills are loaded at any one time.** In code phases that is `airaware-ui`, `modern-web-guidance` and one specialist, swapped rather than stacked (§5).

---

## 2. The matrix

**Abbreviations:**
- **Proj** = `C:/Code/Projects/AirAwareAI/AirAware_AI_Challenge06_Extended_Project_Kit/.claude/skills/`
- **User** = `C:/Users/Ashutosh/.claude/skills/`
- **Plug** = `C:/Users/Ashutosh/.claude/plugins/cache/`

**Repository provenance:**
- "lock" = the source recorded in `.agents/.skill-lock.json`.
- "marketplace" = the source in `known_marketplaces.json`.
- "name match" = the skill folder names match the public repo's folder list, but no install record links them, so the link is inferred.
- Licences come from the GitHub API unless a local `LICENSE` is cited.

**Phases** are defined in §4 (A–F). They map to the master guide's Phases 1–4. P-numbers point to the earlier outline, which is already built (§4).

**Which columns are which:**
- **OBSERVED:** Repository, Purpose and Installation status.
- **RECOMMENDED:** Why AirAware needs it, Recommended phase and Overlap.

### 2.1 Core workflow and visual direction

| Skill | Repository | Purpose | Why AirAware needs it | Installation status | Recommended phase | Overlap |
|---|---|---|---|---|---|---|
| `airaware-ui` | This repo (project-authored) | The project's UI workflow: read `DESIGN.md` and the rules, load `modern-web-guidance`, screenshot at 320 and 1280, audit with the matching skill, report, fix test-first, prove | The only skill that knows AirAware's tokens, data-label rules and Done checklist. It routes to every other UI skill | Installed: Proj`airaware-ui/SKILL.md` | All (A–F), always first | None. It is the router |
| `modern-web-guidance` | `GoogleChrome/modern-web-guidance` (marketplace). Local `LICENSE` in plugin folder | Searches current platform guidance (dialogs, container queries, view transitions, CWV, forms, accessibility) before code is written | Required by `airaware-ui` before any HTML/CSS/JS. Protects against old patterns in the shell, Ask box and safe-area work | Installed: Plug`googlechrome/modern-web-guidance/1.0.0/skills/modern-web-guidance/SKILL.md`. **Runs `npx -y modern-web-guidance@latest`, and that package is not in `node_modules`** | B–F, whenever code or prototype HTML is written | Partial with `ui-ux-pro-max` stack data. This one wins on platform APIs |
| `design-taste-frontend` ("taste") | `Leonxlnx/taste-skill` @ `f6b7657` (lock). MIT | Anti-generic art direction for **company, landing and product websites**: copy voice, hero, dealt moments, photo stand-ins, browser gate | Only the Landing page (P7) is the kind of page it targets. The five app tabs are not | Installed: User`design-taste-frontend/`. **Registers a Stop hook that runs `node scripts/gate.mjs` and may write `.taste-skill/`** | D (Landing) only, and only if `frontend-design` falls short | High with `frontend-design`, `hallmark`, `impeccable` and `ui-ux-pro-max --design-system`. Pick one |
| `frontend-design` | `anthropics/claude-plugins-official`. Apache-2.0 (local `LICENSE.txt`) | Distinctive, subject-grounded visual direction and typography. Warns against generated-page tells. No scripts or hooks | A lighter direction pass for Landing and the Direction A refinements. Its "motion only when it answers an action" rule fits AirAware | Installed: Plug`claude-plugins-official/frontend-design/1.1.1/skills/frontend-design/SKILL.md` | B (critique of Direction A), D (Landing) | Same as above. **RECOMMENDED** as the single direction skill |
| `impeccable` | `pbakaus/impeccable`. Apache-2.0 | 24 commands to steer, critique, audit and polish, plus a slop detector | Critique after a direction exists (master guide §7) | **Not installed.** Its README says: install with `npx impeccable install`, a binary downloads to `~/.impeccable/bin/`, it fetches directions from impeccable.style, telemetry is on by default, and live mode can run the `claude` CLI with permission checks off | Not recommended now | High with `emil-design-eng`, `frontend-design` and `21st-ui-review`, all installed |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` (name match). MIT | Local, searchable UX rules (141), palettes, fonts, stacks, GSAP presets, Python search script | A second-opinion UX checklist. It found nine items in P11 (`STAGE5_REPORT.md:72-80`) | Installed: Proj`ui-ux-pro-max/` (git-excluded, `.prettierignore`). **The owner approved it "for this pass only"** (`STAGE5_REPORT.md:74`). Its commands use `${CLAUDE_PLUGIN_ROOT}`, which is unverified for a project install, so call `scripts/search.py` by its full path | F, read-only `--domain ux` queries, only with a fresh yes. **Never `--design-system --persist`**, which writes a second token system | High with `accessibility`, `frontend-design` and `modern-web-guidance` |
| `hallmark` | `Nutlope/hallmark` (name match; no lock entry). MIT (local `LICENSE`) | Design for new pages. `redesign` and `audit` verbs run only when the user names Hallmark | **Owner approval required. Never use** in this redesign | Installed: User`hallmark/`. Writes `.hallmark/preflight.json` and runs `sloplint.mjs` | None | High with every direction skill |

### 2.2 Implementation, phone and data views

| Skill | Repository | Purpose | Why AirAware needs it | Installation status | Recommended phase | Overlap |
|---|---|---|---|---|---|---|
| `mobile-native` | `emilkowalski/skills` (name match). MIT | Phone fixes: sticky hover, tap flash, `dvh`, input zoom, safe areas, long-press, test on hardware | The five tabs, bottom bar, Ask box and keyboard are phone-first, at 320×640 and 390×844 | Installed: User`mobile-native/SKILL.md` | C (P2–P6), E | Low. Partial with `apple-design` |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` → `skills/react-best-practices`. The SKILL.md says MIT; the repo-level licence is null | React and Next.js performance: waterfalls, bundle, server, re-renders | Little value here. AirAware is a Vite + React 19 SPA (`client/package.json`). The server, `next/dynamic` and RSC rules don't apply | **Not installed** | Not recommended | Partial with `ui-ux-pro-max` (`data/react-performance.csv`) |
| `dataviz` | Session built-in skill (no public repo checked) | Chart, stat tile and table method, with an accessible palette and light/dark | The PM2.5 chart and the weather comparison table (J20). It must keep units, sources and "Model forecast" labels | Listed in this session's skills. **No folder found on disk. Unverified** | C (Today, P3) when the chart or table changes | Partial with `ui-ux-pro-max` charts.csv |
| `21st` (`21st-ui-explore` / `-build` / `-review`) | `21st-dev/claude-code-plugin` (marketplace). Licence unverified | Component ideas and UI review from 21st.dev | Optional source of ideas only | Installed: Plug`21st/21st/0.4.1/skills/`. The MCP needs `/mcp` sign-in, and any component it suggests is a new dependency, which needs a yes (`airaware-ui` table) | Not recommended now | High with `frontend-design` and `emil-design-eng` |
| `superdesign` | `anthropics/claude-plugins-official` plugin. Licence unverified | Cloud design canvas run through `npx @superdesign/cli`. `superdesign init` writes `.superdesign/init/` | Not needed. It appears to send code context to an outside service (inferred from the cloud canvas and `init` design, not verified) | Installed: Plug`claude-plugins-official/superdesign/0.6.0/`. The CLI is not in `node_modules` | Not recommended | High with `prototype` |
| `prototype` | `emilkowalski/skills` (name match). MIT | Several divergent variants behind a picker | Good for comparing variants of one component, such as the verdict card, if the owner asks | Installed: User`prototype/`. **`disable-model-invocation: true`, so the owner must type `/prototype`.** Use its standalone branch under `docs/redesign/prototypes/`, not the in-app `/prototypes/` route | B, on the owner's command | Partial with `superdesign` and `21st-ui-explore` |
| `pick-ui-library` | `emilkowalski/skills` (name match). MIT | Opinionated library picks | Only if the owner opens the dependency question | Installed: User`pick-ui-library/`. Owner-invoked only | None by default | None |

### 2.3 Motion, 3D and the cityscape

| Skill | Repository | Purpose | Why AirAware needs it | Installation status | Recommended phase | Overlap |
|---|---|---|---|---|---|---|
| `emil-design-eng` | `emilkowalski/skills` (name match). MIT | Polish and press feedback, plus the motion decision framework (should it animate, purpose, easing, duration) | The polish critique for "looks generic". It was used in the UX audit (`UI_SKILLS_AND_REDESIGN.md:14`) | Installed: User`emil-design-eng/SKILL.md` | A, B, E | Medium with `apple-design`, `frontend-design` and `animate` |
| `review-animations` | `emilkowalski/skills` (name match). MIT | Strict review of motion code against ten standards | Reviews any motion diff (cityscape drift, panel entrances) | Installed: User`review-animations/`. **Owner-invoked only (`disable-model-invocation: true`)** | E, on the owner's command | High with `improve-animations` |
| `improve-animations` | `emilkowalski/skills` (name match). MIT | Read-only, codebase-wide motion audit plus self-contained plans | A motion roadmap before Phase E | Installed: User`improve-animations/`. Its Phase 2 fans out subagents (`SKILL.md:63`), so run it single-agent while subagents are off | E (start) | High with `review-animations` and `find-animation-opportunities` |
| `animate` | `emilkowalski/skills` (name match). MIT | Builds one animation in decision order | New CSS-only motion, if approved | Installed: User`animate/` | E | Medium with `emil-design-eng` |
| `animation-performance` | `emilkowalski/skills` (name match). MIT | Frame budget, composite-only properties, blur cost, `will-change` | The 8 px backdrop blur on `card-surface` (J22) and the SVG skyline on low-end phones | Installed: User`animation-performance/` | E, F, only if jank is measured | Low |
| `find-animation-opportunities` | `emilkowalski/skills` (name match). MIT | Read-only: proposes motion and rejects the rest | Optional | Installed: User`find-animation-opportunities/` | E (optional) | High with `improve-animations` |
| `remove-animations` | `emilkowalski/skills` (name match). MIT | Removes motion only | If the app feels slow | Installed: User`remove-animations/` | E (only if needed) | Opposite of `find-animation-opportunities` |
| `apple-design` | `emilkowalski/skills` (name match). MIT | Springs, gestures, materials, type | Not needed. AirAware has no gesture or sheet work planned | Installed: User`apple-design/` | None | Overlaps `emil-design-eng` and `mobile-native` |
| `animation-vocabulary` | `emilkowalski/skills` (name match). MIT | Names a motion effect | Not needed | Installed: User`animation-vocabulary/` | None | — |
| Web animation skills | `iart-ai/web-animation-skills`. MIT | GSAP, SVG, Lottie, page transitions, 60 fps | Not needed. There is no GSAP or Lottie runtime, and the cityscape is CSS/SVG by spec | **Not installed** | Not recommended | Covered by the installed Emil motion set |
| GSAP skills | `greensock/gsap-skills`. MIT (the skill). The GSAP runtime has its own licence (unverified) | GSAP timelines and scroll | Not needed now. gsap is not in `node_modules`, and adding it needs a separate owner yes (`airaware-ui` step 5; cityscape spec `:203`). No such yes exists | **Not installed** | Not recommended now | `ui-ux-pro-max` already has 17 GSAP presets |
| Three.js skills | `wolffe/three.js-skills`. MIT | Geometry, shaders, particles | Only if the owner approves a real 3D scene and its dependency. H4 currently says art direction only | **Not installed** | Not recommended now | `ui-ux-pro-max` `data/stacks/threejs.csv` |
| Three.js / R3F skill pack | `freshtechbro/claudedesignskills`. MIT. Last push 2025-11-20 | 3D, GSAP and R3F workflows | Same as above. three and `@react-three/fiber` are not installed | **Not installed** | Not recommended now | — |

### 2.4 Testing, accessibility and discovery

| Skill | Repository | Purpose | Why AirAware needs it | Installation status | Recommended phase | Overlap |
|---|---|---|---|---|---|---|
| `break-ui` | `emilkowalski/skills` (name match). MIT | Worst-case data (long names, zero or many items, extreme numbers) behind a dev-only toggle | Long place names, long Ask questions and answers, 20 saved plans, stale and error states. It was used for the Plan screen and dashboard on 19 Nov (`UI_SKILLS_AND_REDESIGN.md:13`) | Installed: User`break-ui/` (+ `CATALOG.md`). Its toggle lives in source (Hard Rule 4, dev-only), which Stage 0 refused (`audit/LIVE_SITE_AUDIT.md:84-96`) | A (catalog only, worst cases through the e2e fixtures), C, F | Low |
| `accessibility` | `addyosmani/web-quality-skills` @ `afa8da9` (lock). MIT (frontmatter) | WCAG 2.2 audit workflow: Lighthouse, accessibility tree, keyboard | Keyboard, visible focus, 200 % text, names and roles across the five tabs | Installed: User`accessibility/SKILL.md`. Lighthouse is not installed (`LIVE_SITE_AUDIT.md`) | F | Partial with `ui-ux-pro-max` priority 1 and `21st-ui-review` |
| Playwright | Plugin `playwright@claude-plugins-official` (marketplace); `@playwright/test` | Browser automation for screenshots at the five sizes; e2e | The `desktop` and `phone` projects (`e2e/playwright.config.ts:20-21`) and screenshot evidence | **A tool, not a skill: no SKILL.md.** `@playwright/test` 1.65.1 is in `node_modules` (root `package.json`). The plugin's MCP starts with `npx @playwright/mcp@latest` | A–F (tool) | — |
| axe-core | `dequelabs/axe-core` (unverified here) | Automated accessibility rules | Required on every page (`airaware-ui` Done list) | **Library, not a skill.** `axe-core` 4.14.0 is a devDependency (`client/package.json`), used by `client/src/test/axe.ts` and `e2e/axe.ts`. Colour contrast is checked only in the browser (`client/src/test/axe.ts:4`) | C–F (tool) | — |
| `find-skills` | `vercel-labs/skills` (lock) | Finds skills and installs them with `npx skills add` | Only to name candidates. **Never to install** | Installed: User`find-skills/SKILL.md` | None by default | — |
| `skillspector` | `NVIDIA/skillspector` | Security scan of a skill before trusting it | **RECOMMENDED** gate: scan any skill before the owner approves installing it | Installed: User`skillspector/` | Before any future install | — |

### 2.5 Process skills (not counted toward the cap)

| Skill | Repository | Purpose | Installation status | Phase |
|---|---|---|---|---|
| `superpowers` (brainstorming, test-driven-development, verification-before-completion, writing-plans) | `anthropics/claude-plugins-official` | The default engineering workflow (`AGENTS.md:23, 29, 31`) | Installed: Plug`claude-plugins-official/superpowers/7.0.2/` | All |
| `model-task-router` | This repo | Chooses a subagent and model per task (`IMPLEMENTATION_OUTLINE.md:29`). It has no UI content | Installed: Proj`model-task-router/` | Planning |

The other installed skills (SEO, PostHog, Firecrawl, egm, archify, write-swift, animate-expo and others) have no UI role in this redesign.

---

## 3. Installed is not the same as runnable now

These skills run code from outside the repo. Under the current gate (no `npx` for packages missing from `node_modules`, no installs), they cannot run in this phase.

| Skill / tool | What it runs | Status in this phase |
|---|---|---|
| `modern-web-guidance` | `npx -y modern-web-guidance@latest` | **Not run.** Needs the owner's yes per implementation phase |
| `superdesign` | `npx @superdesign/cli` plus a cloud service | Not run. Not recommended |
| `find-skills` | `npx skills find` / `add` | Not run. Never used for installs |
| Playwright plugin MCP | `npx @playwright/mcp@latest` | Not used here. The local `@playwright/test` works without a download |
| `impeccable` (not installed) | `npx impeccable install`, a binary download, telemetry | Not recommended |
| `design-taste-frontend` | Stop hook `node gate.mjs` (local) and may write `.taste-skill/` | Allowed in principle, but writes outside `docs/redesign/` |
| `hallmark` | `node sloplint.mjs` and writes `.hallmark/` | Never use |

**What this means for prototypes (RECOMMENDED):**
- Any HTML prototype written under `docs/redesign/prototypes/` in this read-only phase is client HTML/CSS. The `airaware-ui` rule applies to it.
- If `modern-web-guidance` has not been approved and run, mark each prototype at the top: "Not checked against modern-web-guidance".

---

## 4. Phases

**The earlier outline is already built (OBSERVED).** P0–P8 were built one phase at a time on the owner's word (`STAGE5_REPORT.md:3-21`), and P11 is reported there too.

The phases below (A–F) are for **this** redesign round. The last column is only a cross-reference: the earlier phase that last touched the same area.

| Phase | What happens | Master guide | Earlier phase, same area |
|---|---|---|---|
| A | Audit and journey map (read-only, this stage) | Phase 1 (audit) | P0 |
| B | Visual direction and prototypes, building on Direction A (approved 24 Nov) | Phase 1 (direction) | P8 |
| C | Screen work on the five destinations: Today, Ask AirAware, My Home, Better Habits, My Profile | Phase 2 | P2–P6, J-rows |
| D | Landing | Phase 2 | P7 |
| E | Motion and the cityscape backdrop | Phase 3 | P8, H4, H5; cityscape spec |
| F | Test and harden, then release on the owner's word | Phase 4 | P11 |

---

## 5. Recommended set per phase (RECOMMENDED)

### 5.1 How the cap of three is counted

- **At most three skills are loaded at any one time.** `airaware-ui` counts. So does `modern-web-guidance` whenever code or prototype HTML is written.
- In a code phase that leaves **one specialist slot**. Change specialists by unloading one before loading the next, never by stacking them.
- These are not counted: Playwright and axe-core (tools), and the `superpowers` process skills and `model-task-router`, which are the project's default workflow (`AGENTS.md:31`).

**Gate rule (OBSERVED, `airaware-ui/SKILL.md:15`):**
- `airaware-ui` requires `modern-web-guidance` before any HTML, CSS or client JS.
- In every phase that writes code, load `modern-web-guidance` and run its search **before** the first edit. That needs the owner's yes for its `npx` call (§3).
- If it is not run, the phase report says so. Never claim it ran.

### 5.2 Per-phase sets

| Phase | Slot 1 | Slot 2 | Slot 3 (one at a time) | Not used, and why |
|---|---|---|---|---|
| **A** Audit (no code) | `airaware-ui` | `emil-design-eng` (polish critique) | `break-ui`, catalog only: worst cases through the existing e2e fixtures, no toggle in source | `modern-web-guidance` (no code; not runnable without approval); direction skills (A is not a direction phase) |
| **B** Direction A refinements and prototypes | `airaware-ui` | `modern-web-guidance` | `frontend-design` for critique within the existing tokens; or `/prototype` when the owner types it | `design-taste-frontend` (its own palette and photo stand-ins break the token rule: `DESIGN_CONCEPTS.md:197`); `hallmark`; `impeccable` (not installed) |
| **C** Five destinations (P2–P6) | `airaware-ui` | `modern-web-guidance` | `mobile-native` by default. Swap to `dataviz` for the Today chart or weather table, or to `break-ui` for long lists and Ask threads (dev-only toggle, never shipped) | `vercel-react-best-practices` (not installed; mostly Next.js); `21st` (needs sign-in, new dependencies) |
| **C** · Ask | `airaware-ui` | `modern-web-guidance` | `mobile-native` (keyboard, safe area, composer), then `break-ui` (long questions and answers, stale and error states) | Ask spec §16 (`AirAware_Ask_AirAware_Assistant_Interaction_UX_Spec.md:712-719`) also lists `design-taste-frontend` and `emil-design-eng`. Under the cap those move to Phase B (direction) and Phase E (motion). See §6 |
| **D** Landing (P7) | `airaware-ui` | `modern-web-guidance` | `frontend-design`. Use `design-taste-frontend` instead only if the owner prefers it, accepting its Stop hook and `.taste-skill/` folder | `hallmark` |
| **E** Motion and cityscape | `airaware-ui` | `modern-web-guidance` | Start with `improve-animations` (single agent). Then `animate` to build CSS/SVG motion, `animation-performance` if jank is measured, and `/review-animations` when the owner types it | GSAP, Three.js, R3F and web-animation packs (no runtime installed; no owner approval for one: cityscape spec `:203`); `apple-design` |
| **F** Harden (P11) | `airaware-ui` | `break-ui` | `accessibility`. Tools: Playwright e2e (`desktop` and `phone`), axe through the existing helpers. Optional: read-only `ui-ux-pro-max` queries with a fresh yes, swapped in for `accessibility` | Once a fix is written, swap `modern-web-guidance` in for one specialist |

---

## 6. Conflicts with earlier docs

| Earlier doc says | This doc says | Why |
|---|---|---|
| `AGENTS.md:25`: "Initial visual design: Hallmark, if installed" | Do not use Hallmark | Brief (owner approval required), `airaware-ui` ("only when the owner names it"), and Hallmark's own description. **RECOMMENDED:** the owner updates `AGENTS.md:25` if this stays the rule |
| `AGENTS.md:26`: "UI cleanup: Unslop, if installed" | Not available | Unslop is not installed anywhere I looked. Never claim it ran |
| Master guide §7, Phase 1: "`taste` OR `design-taste-frontend`" | Prefer `frontend-design` for the app; taste only for Landing | They are one skill. It was loaded and set aside in Stage 1 (`DESIGN_CONCEPTS.md:197`) |
| Master guide §7 lists 4–5 skills per phase | Three at a time, counted as in §5.1 | The brief's cap. The master guide's own policy (`:321`) also says one direction, one implementation and one specialist |
| Master guide §7, Phase 2: `vercel-react-best-practices` | Not recommended | Not installed. Half its rules are for Next.js and servers, and AirAware is a Vite SPA |
| Master guide §7, Phase 1: `impeccable` | Not recommended now | Not installed. Install needs `npx`, it sends telemetry, and live mode runs a CLI with permission checks off. If the owner wants it later: scan it with `skillspector` first, then get a yes |
| `STAGE5_REPORT.md:74`: `ui-ux-pro-max` approved "for this pass only" | Needs a fresh yes | That approval has been used up |
| Ask spec `:717-718`: `design-taste-frontend` and `emil-design-eng` for Ask | Not loaded alongside the Ask build | The cap leaves one specialist slot. Direction work goes to Phase B and motion to Phase E. Ask's visual direction stays inside Direction A's tokens |
| Ask spec `:721`: "Do not install `frontend-design` … automatically" | `frontend-design` recommended for Phases B and D | It is **already installed** (Plug`claude-plugins-official/frontend-design/1.1.1/`), so nothing is installed. Using it still follows the owner's approval rules |

---

## 7. Not loaded or unverified

- **Read only by frontmatter, hard rules and headings, not in full:** `design-taste-frontend`, `frontend-design`, `hallmark`, `ui-ux-pro-max` (first 80 lines plus greps), `emil-design-eng`, `mobile-native`, `break-ui`, `review-animations`, `improve-animations`, `animate`, `animation-performance`, `find-animation-opportunities`, `remove-animations`, `apple-design`, `animation-vocabulary`, `prototype`, `pick-ui-library`, `accessibility`, `find-skills`, `superdesign`, the `21st` skills and `skillspector`.
- **Provenance inferred by name match only:** the Emil Kowalski set (no lock entry), `ui-ux-pro-max` and `hallmark`.
- **No local files found:** `dataviz` (listed in the session only). It is not under `~/.claude/skills/synced/` either, which holds only the Anthropic skills (docx, pdf, browser and others).
- **Licences not checked:** `21st`, `superdesign`, the GSAP runtime and axe-core's repo.
- **Taken from impeccable's public README, not run:** its install steps, telemetry and live-mode behaviour.
- **Never executed:** `modern-web-guidance`, `ui-ux-pro-max` search and every skill script.
