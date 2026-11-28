# Ask AirAware chat redesign: Phase 1 (read-only inspection and proposal)

**Date:** 26 Nov 2026. **Input:** the owner's spec `AirAware_Ask_AirAware_Chat_UI_Redesign_Spec.md` (repo root, untracked; not moved or committed). **Status:** approved by the owner on 26 Nov 2026 ("Approve as recommended"): D-1 to D-8 as recommended in section 4. No source, test, dependency, contract or schema change was made in Phase 1. **Built (not committed)** on 26 Nov 2026 per `docs/superpowers/plans/2026-11-26-ask-chat-redesign.md`.

## 1. In one paragraph

Ask is already most of a guided chat. It keeps an in-memory thread (up to 10 exchanges, oldest first), shows the question as a navy bubble on the right, and gives an answer with "Made with AI" or "Made by our rules", a "Based on … Model forecast · Open-Meteo · retrieved" line, up to three cards with "Why?", a question back (Yes / No / Skip), "You could also ask", a thinking state, an error with "Try again", and a "Not current" warning. What the spec adds is mostly layout and feel: the composer pinned at the bottom, a multiline box, one calmer chat surface instead of a card per answer, and the real source link and limitations. The decisions that need the owner are in section 4. Each "yes" there replaces an earlier owner ruling, named in that row.

## 2. What the current backend cannot do (spec §11 step 10)

1. **The AI never reads the typed words, and there is no memory between messages.** Each message is matched by fixed word lists to one of six topics (outdoor activities, windows, indoor air, family, commuting, better habits), or to the medical or out-of-scope reply. Only that topic and the validated forecast reach the AI. This is the owner's guided-chat ruling of 21 Nov (`docs/superpowers/specs/2026-11-21-ask-guided-chat-design.md`), and the published Privacy page promises it: questions are "not saved, not logged and not sent to Gemini or Claude". So a chat layout must not suggest the assistant remembers or understands earlier wording. *Amended (28 Nov): typed questions now go to Claude, and the client sends up to 2 earlier questions (J26, ADR-008).*
2. **The AI summary is not a reply to the question.** It describes the day for this household, and the server drops any summary that starts with yes or no or calls something a good or bad idea. A "direct answer" can therefore never be a yes or no.
3. **No forecast-explanation topic.** The spec's "Today's forecast — Explain the air forecast for today" would return the outdoor-activities cards, not an explanation.
4. **No hourly data in Ask answers.** "How does the forecast change later today?" can't be answered; the answer carries only the 24-hour check.
5. **No "explain PM2.5" topic.** "Can you explain PM2.5?" gets the out-of-scope reply.
6. **No feedback endpoint or storage.** A helpful / not helpful control would need a new endpoint and storage, which the spec forbids.
7. **No conversation history.** Saving conversations would break the Privacy page promise and the guided-chat ruling ("the conversation is stored or logged" is an anti-goal).
8. **No streaming.** The spec says not to add it.

**A trap with free text:** starters are sent as text and matched by those word lists. Two of the spec's four starter sentences ("What should I consider before going out?" and "What are some practical sustainable changes?") land in the off-topic reply. A verifier checked this by running the server's `classify()` locally, with no network. Any new starter must send a topic id, as the topic chips already do, or reuse words the matcher knows.

## 3. Gap analysis (spec vs today)

"UI" means a client change with today's API and data.

| Spec | Today | Gap |
|---|---|---|
| 4.1 Header: title, supporting line | H1 "Ask AirAware", the approved intro "Answers come from AirAware's rules and today's forecast." (A12), plus a "Using: … model forecast, retrieved …" line | Spec line is new copy (decision D-3) |
| 4.1 Welcome heading and sentence | None; the greeting was removed in P4 (D3) | New copy; brings back what D3 removed (D-3) |
| 4.1 Four starter cards | 6 topic chips (send a topic) + 3 starters + 2 behind "More questions" (D1) | Restyle is UI; new sentences need D-2 |
| 4.1 Composer near the bottom, multiline, placeholder | Single-line box at the top, above chips and thread; label "Ask about your air, home or day"; no placeholder | Position (D-1); multiline is UI (keep label, keep 200 characters, add Enter / Shift+Enter) |
| 4.1 Disclosure under composer | Every answer already ends with the approved "General information only, not medical advice. Follow local public-health advisories." | Would repeat it (D-5) |
| 4.2 User bubble right, readable assistant column, composer not covering messages | Bubble exists; each answer is a bordered panel with nested cards | One shared solid surface (D-6); the backdrop rule needs opaque text backing |
| 4.2 Answer order | Short answer, made-by, Based on, caveat, Not current, cards with Why?, safety note | Data exists for every part; for AI answers the approved verdict line is also available as "what this means" |
| 4.3 Why? with reason, inputs, sources, caveat | Exists on every card (P5: one "Why?" label) | Keep |
| 4.4 Follow-ups from supported topics | "You could also ask" from the existing starters, plus the question back | Exists; spec examples PM2.5 and "later today" are unsupported (§2) |
| 4.5 Loading, no duplicates | "AirAware is thinking…" with a pulse (stopped under reduced motion), duplicate guard | Exists |
| 4.5/4.6 Keep the typed text on failure, allow editing | Box is cleared on send; Try again resends unchanged | UI gap: restore the text on error |
| §8 Send disabled when empty | Disabled only while thinking (empty blocked by `required`) | UI gap |
| 4.6 Error with retry | Exists ("We couldn't answer that", Try again) | Keep |
| 4.7 Missing place / forecast | No place: place search + "Use my location" (explicit); no forecast: answer says "Air information unavailable" | Exists; the header says nothing when the forecast failed (small UI gap, new copy) |
| 4.8 Not current | In the Using line and in every stale answer, never collapsed | Exists; must stay visible with a pinned composer |
| 4.9 New chat, clear, copy, feedback, history | None | New chat / copy are UI; feedback needs backend; history conflicts (§2) — D-7 |
| Source and freshness with real fields | Hard-coded "Open-Meteo" + time; the response also carries `sourceUrl`, `limitations`, and notices with the 24-hour averages in μg/m³ and the limit, none shown on Ask | UI: show the link and limitations (D-6) |
| §5 320 / 390 / 768 / 1280, 44 px, safe areas | All gated today for the current layout | A pinned composer needs new gates and a real-phone keyboard check |
| §6 Accessibility | One screen-reader status line, focus to the new question, axe clean, keyboard walk | Keep; three focus calls lack `preventScroll` (P11 open item) |

## 4. Owner decisions (my recommendation first)

| # | Decision | Recommend | What a yes replaces |
|---|---|---|---|
| D-1 | **Where the composer sits** | **Pinned at the bottom of the screen**, above the phone bar, on every state. The thread scrolls above it. On short screens or very large text it drops back into the page (the same idea as D7 for the city). This is the spec's own layout and keeps the box on the first screen, which was D3's reason. | AK-02 (order: box before chips and thread) and AK-04 (rewritten to measure against the composer top). Deadline-safe alternative: keep the box at the top and only restyle (no gate changes, about half the work). |
| D-2 | **Starter prompts** | **Keep the approved set** (6 topic chips, 3 starters, 2 behind "More questions"), restyled as compact chips. Drop "Today's forecast" (no such topic). If you want the spec's cards, use "Outdoor activities", "Indoor air", "Better habits" as topic chips (they already exist) with the spec's sentences as small print under each. | D1 "no new starter copy" (only if new sentences are approved) |
| D-3 | **Welcome heading, supporting line** | **Keep** "Ask AirAware" and the approved intro; no "How can I help you today?" (it is ChatGPT's own phrasing, and spec §3 says not to copy its text). | A12, D3 (only if approved) |
| D-4 | **Placeholder "Ask anything about your air…"** | **None.** The visible label already says what to type; "anything" overpromises six topics. | — |
| D-5 | **Disclosure under the composer** | **None.** Every answer already carries the approved safety note; spec 4.2 asks to avoid repeated disclaimers. | — |
| D-6 | **Answer look** | **One solid chat surface** for the whole thread (meets the backdrop rule: no text on the sky); answers lose their own border; cards inside Ask become a flatter list (Ask-only, Today unchanged). Link "Open-Meteo" to the answer's real `sourceUrl` and show the forecast's limitations under the Based-on line. Keep "Based on" right under the answer (D4), not last as the spec lists, so "Not current" never falls below the fold. | DESIGN.md "each answer is a solid panel" (P4) |
| D-7 | **New chat, copy, feedback, history** | **None in this pass.** Feedback needs a backend; history breaks the Privacy page; "New conversation" (an in-memory clear) and "Copy" are possible later if you want them. | — |
| D-8 | **Composer behaviour** | **Yes:** multiline box that grows to about 4 lines then scrolls; Enter sends, Shift+Enter new line; Send disabled when empty or thinking; the typed text comes back if the request fails. Keep the label and the 200-character limit. Today's small ask box stays as it is. | Ask.test.tsx expects Send enabled on an empty box |

## 5. Wireframes (recommended D-1, D-6)

Phone, 390×844, empty (D-2 kept):

```
┌──────────────────────────────────┐
│ AirAware AI            [⌖ Pune ▾]│  navy header (unchanged)
│ Ask AirAware                     │  title block on the sky (A12 intro,
│ Answers come from AirAware's …   │  Using line with "Not current"
│ Using: Pune model forecast, 9:26 │  when old)
│┌────────────────────────────────┐│  solid surface
││ (Outdoor activities) (Indoor air)│
││ (Windows and ventilation)       ││  topic chips (send a topic)
││ (My family) (Commuting)         ││
││ (Better habits)                 ││
││ Can I go for a morning walk…    ││  3 starters
││ ▸ More questions                ││
│└────────────────────────────────┘│
│┌────────────────────────────────┐│  composer, pinned
││ Ask about your air, home or day ││  visible label
││ ┌──────────────────────┐ [Send] ││  grows to ~4 lines
│└────────────────────────────────┘│
│ Today  Ask  Home  Habits  Profile│  bottom bar (unchanged)
└──────────────────────────────────┘
```

Phone, with a conversation:

```
┌──────────────────────────────────┐
│ AirAware AI            [⌖ Pune ▾]│
│┌──── one solid chat surface ────┐│  scrolls
││          ┌ Should I run the   ┐ ││  your question, right
││          └ purifier tonight?  ┘ ││
││ Particle levels are forecast … ││  short answer first
││ Made with AI                    ││
││ Based on: Above the 24-hour     ││  provenance stays here (D4)
││ limit · Model forecast ·        ││  + source link
││ Open-Meteo · retrieved 9:26     ││
││ ⚠ Not current … (when old)      ││  never collapsed
││ • Ventilate for indoor sources  ││  flatter cards, each with
││   …  ▸ Why?                     ││  "Why?"
││ General information only, …     ││  safety note
││ One question so I can be more   ││  question back (newest only)
││ specific: (Yes) (No) (Skip)     ││
││ You could also ask: (chip)(chip)││
│└────────────────────────────────┘│
│┌ [Ask about your air…    ] [Send]┐│  pinned composer
│ Today  Ask  Home  Habits  Profile│
└──────────────────────────────────┘
```

Desktop, 1280×720: the same single column (max-w-3xl, aligned with the page's left edge like every other page, D2 "one column"; no sidebar). The composer is pinned to the bottom of the window inside that column, under the header nav.

```
┌ AirAware AI  [⌖ Pune, Maharashtra ▾]   Today  Ask AirAware  My Home  … ┐
│  Ask AirAware                                                         │
│  Answers come from … · Using: Pune model forecast, retrieved 9:26      │
│  ┌───────────── chat surface (max-w-3xl) ─────────────┐               │
│  │                      ┌ Should I run the purifier… ┐│               │
│  │ Particle levels are forecast above the 24-hour …   ││               │
│  │ Made with AI · Based on: … · Open-Meteo · 9:26     ││               │
│  │ • Ventilate …  ▸ Why?   • Run your purifier … ▸ Why?│               │
│  └─────────────────────────────────────────────────────┘               │
│  ┌ Ask about your air, home or day ────────────── [Send] ┐  pinned      │
└───────────────────────────────────────────────────────────────────────┘
```

**Phone keyboard (Phase 2 decision, needs a real phone):** the page has `viewport-fit=cover` but no `interactive-widget=resizes-content`, and no `dvh` or `visualViewport` use. On Android Chrome a pinned composer can sit under the keyboard unless that viewport setting is added. It is a global tag, so it affects every page with a text box. iOS Safari handles fixed elements differently again. Playwright can only emulate this. **You must check it on your phone before it ships.** Also: with the keyboard open, the bottom bar plus the composer take much of a 640 px screen; hiding the bar while typing is a Phase 2 option. On phones the city band sits just above the bar, so the composer will cover it on Ask; the composer panel is opaque, which keeps the "no text on the scene" rule.

## 6. Files likely to change (recommended options)

No server file, contract, schema, dependency or rate limit changes.

- `client/src/pages/Ask.tsx`: order (thread, then pinned composer), textarea, restore-on-error, Send disabled when empty, `preventScroll` on its focus call.
- `client/src/features/ask/AskEntry.tsx`: one-surface look, source link and limitations, scroll and focus for a bottom composer, `preventScroll` at its two focus calls. Keep the `.ask-answer` class (many e2e locators use it).
- `client/src/features/daily-plan/PlanCard.tsx`: an Ask-only flat look (shared with Today, My Home and Landing; those stay unchanged).
- `client/src/index.css`: room for the composer in `scroll-padding-bottom` on Ask; add `textarea` to the `touch-action: manipulation` list.
- `client/src/pages/AppShell.tsx`: the end spacer and footer under a pinned composer on Ask.
- `client/index.html`: possibly `interactive-widget=resizes-content` (Phase 2 decision).
- `client/src/features/ask/ask.ts` and `useAsk.ts`: only if new copy (D-2, D-3) or "New conversation" (D-7) is approved.
- Tests: `Ask.test.tsx`, `AskEntry.test.tsx`, `e2e/firstscreen.spec.ts` (AK-02, AK-04/05, AK-10), `e2e/responsive.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/ask.spec.ts`, `e2e/backdrop.spec.ts` (must stay green).
- Docs: `DESIGN.md`, `ACCESSIBILITY.md`, `docs/redesign/OWNER_DECISIONS.md` (the new rulings), `docs/redesign/REDESIGN_ACCEPTANCE_CRITERIA.md` (AK-02, AK-04), `CHANGELOG.md`.

## 7. Test plan

**Existing tests that change on purpose:** the order test in `Ask.test.tsx`; its "Send enabled after an answer" check (D-8); AK-02 and AK-04/05 in `firstscreen.spec.ts`, where AK-04 must measure the answer's first line against the composer top, not the bar (today a pinned composer covering the answer would still pass); AK-10 (box width, Send on the same row) if Send moves inside the box. Unchanged and must stay green: all server tests (route contract, "the question reaches no log or AI", the shared 10-a-minute limit), `useAsk.test.ts` (no browser storage), `copy.spec.ts`, `backdrop.spec.ts`.

**New unit tests (written failing first):** Enter sends and Shift+Enter adds a line; Enter while thinking sends nothing (a textarea loses the form's built-in guard); whitespace never sends; Send disabled when empty; the text comes back after an error; focus calls use `preventScroll`; one status announcement per answer, not the whole thread; axe on empty, thinking, answer, error, no-place and stale states.

**New e2e checks** (every `/api` route stubbed or blocked; desktop and Pixel 7; 320×640, 390×844, 768×1024, 1280×720):
- the composer sits inside the screen, above the phone bar, and never covers the newest answer's first line;
- 44 px targets, no sideways scroll, and the box grows and then scrolls inside itself;
- a double click makes one request and an empty send makes none;
- a starter sends its topic;
- Try again after a 500 keeps the question;
- "Not current" stays visible, and there is no text on the scene;
- 200 % text, the Tab walk, and forced colours;
- a keyboard emulation (shrinking the visual viewport), reported as emulation, not proof.

**Real phone (owner, about 15 minutes):** open Ask, type with the keyboard open, send, scroll back, rotate once.

**Gate:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, the nine stubbed e2e specs. CodeQL and SonarQube only if you want them run; neither is claimed here.

## 8. Phases and time

1. **Composer** (D-1, D-8): pinned box, textarea, keys, restore on error, spacing, focus and scroll, unit tests. About 4–6 hours.
2. **Thread look** (D-6, plus D-2 if restyled): one surface, flatter cards, source link and limitations. About 3–4 hours.
3. **Gates and docs:** rewrite AK-02 and AK-04, new e2e at four sizes, full gate, independent review, docs and rulings. About 3 hours.
4. **Owner:** real-phone keyboard check, then one push (a Netlify build).

Total: about 1.5 days of work. With the 29 Nov deadline, the deadline-safe alternative in D-1 (box stays at the top) is about half that.

## 9. Found in passing (not in this plan)

- A summary that Ask's yes/no check rejects is still cached for 10 minutes, so that input stays "Made by our rules" without a new AI try (`server/src/services/recommendations/dailyPlan.ts`, `ask.ts`).
- A question sent from Today's box while Ask is still thinking is dropped silently; the page still moves to Ask (`useAsk.ts`, `AskBox.tsx`).
- No client timeout: a slow answer can sit at "thinking" for about 45 s in the worst case.
- On Ask, the "Not current" banner says "Reload for the latest forecast." but has no Reload button.
- Card caveats on Ask sit inside the closed "Why?"; the 24-hour averages with units are never shown on Ask.
- The local Gemini key returns HTTP 401 (found in the 26 Nov journey run).

## 10. Evidence and who did what

- **Before screenshots** (local dev server, every API answer a stubbed test reply, so the numbers are fixtures, not readings; 46 requests stubbed, 1 blocked): `scratchpad/ask-phase1/shots/` (`empty-*`, `answer-*`, `question-back-*` at 320×640, 390×844, 768×1024, 1280×720). No horizontal overflow at any size. Page length with one answer: 4.6 screens at 320, 3.1 at 390, 2.9 at 1280.
- **Agents:** a Phase 1 workflow of 8: four readers (client, server, design rulings, tests) on Sonnet 5.5, each checked by a skeptic on Opus 5.5. The skeptics corrected several reader claims (starters send text, not topics; a pinned composer does not break AK-01 but does break AK-02 and makes AK-04 pass falsely; the 21 Nov "no fixed composer" line was a builder's call, not an owner ruling). Two verifiers ran the server's `classify()` locally with no network.
- **Skills loaded:** airaware-ui, superpowers:brainstorming, mobile-native. Not loaded: modern-web-guidance (no code written yet; it comes first in Phase 2), emil-design-eng, hallmark (not named), Unslop (not installed).
