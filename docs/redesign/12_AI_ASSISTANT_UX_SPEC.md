# 12 · Ask AirAware: assistant UX spec

**Date:** 28 Nov 2026. This is a read-only proposal. No code, config or existing doc was changed, and no question was sent to the live assistant.

## Baseline

- **Code:** the local tree at commit `b0c4278`. It includes J26: Claude Haiku answers typed questions, with the rules answer as fallback (`OWNER_DECISIONS.md:200`).
- **Production:** on 28 Nov the live site still showed the pre-J26 intro, "Answers come from AirAware's rules and today's forecast." (`docs/redesign/audit/screenshots/redesign-2026-11-28/current/ask-1440.jpg`). The local intro reads "Claude (Anthropic) reads your question…" (`client/src/features/ask/ask.ts:56-57`). **J26 is built locally and not deployed.** Wherever this doc says "server today", it means the local build.

## Labels

- **OBSERVED:** seen in code, a doc or a capture, with a citation.
- **RECOMMENDED:** a proposal. Every new string needs the owner's approval first (CP-04, `REDESIGN_ACCEPTANCE_CRITERIA.md:310`).

## Scope

- **Builds on:** the current server (`POST /api/v1/assistant/answer`, J26, its checks and its rules fallback) and the current `useAsk` hook.
- **Rows in doc 11:** A1–A25.

## assistant-ui

assistant-ui is not specified here. 08 §3.5 recommends option A: improve the existing chat and add no dependency. That would change only with an approved streaming endpoint plus stored, multi-thread history (08 §3.5, flip condition).

---

## 1. How Ask works today (OBSERVED)

### 1.1 Request path

1. **Client.** `useAsk` lives in `AppShell` (`AppShell.tsx:129`). It sends one request at a time (`useAsk.ts:178-181`).
   - A typed question, a starter or a "You could also ask" button sends `{question}`.
   - A topic chip sends `{topic}` (`Ask.tsx:98-101`).
   - A typed question also carries up to 2 earlier typed questions with their card ids. Medical and failed ones are left out (`useAsk.ts:135-154`).
2. **Route.** `routes/assistant.ts:22-48` checks the body with zod (question 1–200 characters, history at most 2; `ask.ts:32-47`). Then it calls `classify()`.
   - A medical question never reaches Claude. Earlier questions are re-checked for medical words too.
3. **Asker** (`services/recommendations/ask.ts:267-378`):
   - It gets the forecast. A failure means the air is `unknown`, not an error.
   - It runs `assessAir` (the 24-hour check) and builds the household's rule candidates.
   - **Topic chip, no Claude key, or a medical question:** the rules answer. Up to 3 cards for the topic. Gemini (the plan writer) may write the summary, which then passes the VERDICT check (`ask.ts:311-334`).
   - **Typed question with Claude configured:** the Ask writer gets:
     - the 24-hour check;
     - the eligible cards (titles, texts, reasons);
     - the forecast's provider, kind and limitations;
     - the question;
     - the earlier questions with their card titles (`ask.ts:339-360`).
   - It receives no place, no coordinates, no raw household answers, no weather, no fire data and no hourly values (`planOutput.ts:53-79`; J26 D3).
4. **Checks on Claude's output** (`askOutput.ts:48-86`):
   - 20–300 characters;
   - Latin script only;
   - at most 3 unique card ids, all eligible;
   - no number that is not in the input;
   - no banned word (`planOutput.ts:127-154`);
   - no yes/no verdict (`askOutput.ts:16-17`).
   - Any failure, timeout or exhausted cap returns the rules answer, with no Gemini call (`ask.ts:361`).
   - If Claude says `out_of_scope`, the fixed out-of-scope answer is shown and **Claude's text is thrown away** (`ask.ts:363-364`).
5. **Response** (`AskAnswer`, `contracts.ts:300-315`): `topic`, `cards`, `summary`, `generatedBy`, `air`, `forecast` (provider, sourceUrl, dataKind, modelResolution, retrievedAt, limitations), `notices`, `sources`, `safetyNote`, `followUps`.
   - **The response never contains the question.**

### 1.2 Limits (13 §2)

- **Claude:** 200 Ask calls per UTC day **per instance**, a 10 s timeout and no retries.
- **Rate limit:** one 10-per-minute-per-IP limiter shared by Ask, daily plans and saved plans.
- **Starters count:** starters are typed questions, so each one is a Claude call.

### 1.3 Client state (`useAsk.ts`)

- In memory only, oldest first, at most 10 entries (`:51`).
- The thread survives switching tabs, because `AppShell` owns it.
- It empties on reload, on a new place, and on "Delete everything" (`:70-82`).
- A reply that comes back for an old place is dropped (`:88-99`).
- Questions back (household questions) are answered locally. Their answers update the answers on screen for the whole app (`:196-236`).

---

## 2. Principles: what we borrow from ChatGPT, and what we don't

| Borrow (RECOMMENDED) | Don't borrow (rule or decision) |
|---|---|
| A centred reading column with the composer pinned at the bottom. Already built: J15, J17, J25 | Streaming or a typing effect. The server returns finished answers, and checks run on the whole output (master guide §8.3; 13 §5) |
| A welcome state with a few starters. Built | Stored chat history, a sidebar or a thread list (J7; `routes/assistant.ts:9-11`) |
| Your message as a right-aligned bubble; the reply as plain text with a small "AirAware" label. Built (`AskEntry.tsx:336-357`) | Regenerate, edit-and-resend, or a model picker. No server support, and J7 |
| An always-visible actions row under each answer (Copy). Built | Attachments, voice or images (Ask UX spec §11) |
| "Jump to latest" when scrolled up (A8) | AI-written follow-up suggestions or clarifying questions (J26: follow-ups stay non-AI) |
| Short answer first, detail on demand | Free-form advice. Advice comes only from approved rule and guide cards |

---

## 3. Screen anatomy

Gates AK-01 to AK-24 stay. The order follows `Ask.tsx:122-303`.

| # | Part | Now (OBSERVED) | Change (RECOMMENDED) |
|---|---|---|---|
| 1 | H1 "Ask AirAware" and intro | Built. The intro will read the J26 line once deployed | Keep |
| 2 | Context line | One sentence: "Using: the {place} model forecast, retrieved {time} · x of 10 household questions answered · Edit". "· Not current" is added after 60 minutes, and "forecast unavailable right now" on failure (`Ask.tsx:128-161`) | **A1:** the same strings as small chips. **Not current** uses the solid `warning` fill (B10). The Edit link gets a 44 px target (**A5**; it measures 25×17 now) |
| 3 | Welcome card | "How can I help you today?" until the first question, 4 starters, and "More topics" holding the 6 chips and the 5th starter (`Ask.tsx:175-197`) | See §4. After the first question the card stays as one compact row of chips, so the thread is the focus |
| 4 | Conversation region | One surface with a rule line between exchanges; a region named "Conversation" (J6, J25) | Keep. The answer layout is in §6 |
| 5 | Composer | Textarea, 200 characters, grows to about 4 lines. Enter sends; Shift+Enter adds a line. Send is disabled while empty or thinking. The credit line sits inside (J8, J16) | See §10 |
| 6 | No-place state | Place search and "Use my location" in a card (`Ask.tsx:166-170`) | Keep. Location is used only when the person asks for it |

Phone and desktop behaviour (pinning, scroll padding, safe area) stays exactly as J9, J10 and J17 set it.

---

## 4. Welcome screen

**Now (OBSERVED)** (`current/ask-1440.jpg`):
- H1, intro, context line;
- "How can I help you today?";
- 4 starters as stacked pill buttons;
- "More topics";
- the composer.

**RECOMMENDED:**

1. **Starter wording that does not invite a verdict (A3).** Two of the current starters ask for a yes/no that the assistant must never give.

   | Now (`ask.ts:26-40`) | Proposed | Keyword route (checked with `classify()`) |
   |---|---|---|
   | Can I go for a morning walk today? | What should I know before a morning walk today? | outdoors |
   | Is it a good idea to open my windows? | What should I check before opening my windows? | windows |
   | How can I improve my indoor air? | (keep) | indoor |
   | How can I reduce pollution while commuting? | (keep) | commuting |
   | What should I consider for my children's outdoor activities? (5th, under More topics) | (keep) | family |

   Rewording a starter also changes "You could also ask", which reuses the starters (`ask.ts:93-106`).

2. **A "How AirAware answers" disclosure (R7, A11).** A closed `<details>` in the welcome card, below "More topics". Never under the composer (J5). Copy is in §15. *Cross-doc note (critic): 06 §7 and 07 put R7 on `/privacy` with a link from Ask, and 11 L3 on Landing. One location is the owner's choice (14 D12).*

3. **Layout.** Starters wrap as chips on wide screens and stack on phones. Each stays at least 44 px tall.

---

## 5. Contextual suggestions (A9)

**Rule:** the client only **chooses which approved starters show**. It never writes new ones.

**Inputs the client already has:**
- the shell's forecast check (`forecast.airCheck.level`, `contracts.ts:188`);
- freshness (`updatedAt`);
- the household answers (`context`).

**Owner choice:** starters are typed questions, so each one uses the Claude cap. Sending starters as `{topic}` instead would save the cap, but the answer would then be the topic answer rather than an answer to the starter's own wording.

| Condition | First 4 shown (from the approved list) | Why |
|---|---|---|
| Within the limit | walk · windows · indoor · commuting | Same as today |
| Above the limit | walk · windows · indoor · children (if `includesChildren`), else commuting | Lead with what changes on a day above the limit |
| Air unknown (forecast failed) | indoor · commuting · children · walk | Lead with topics that don't depend on the forecast. The chip says "forecast unavailable right now" |
| Not current | Same as the level it last had | The "Not current" chip is shown. No starter claims freshness |
| `commuteMode` is `work_from_home` | Replace commuting with children (or with the habits candidate below, once approved) | Don't suggest what doesn't apply |

There is no habits starter in `STARTERS` today (`ask.ts:26-40`). Any rule that uses one waits for the candidate below to be approved.

**Candidates from the question bank (each needs CP-04):**
- "How can I reduce cooking smoke at home?" (indoor)
- "What small habits can I start today?" (habits)
- "What does the forecast mean for my commute?" (commuting)

"Is this a live reading from a monitoring station?" should wait until J26 is deployed or A19 is built. When Claude is unavailable, its keyword route is out of scope, so it would get the off-topic line (§13).

---

## 6. Answer anatomy: structured rule-card responses

### 6.1 What renders now (OBSERVED, `AskEntry.tsx:140-240`)

1. The answer: `summary`, else the verdict's approved explanation (`ask.ts:162-164`).
2. "Made with AI" or "Made by our rules".
3. "Based on: {verdict} · Model forecast · Open-Meteo · retrieved {time}".
4. The caveat.
5. The stale banner.
6. "Sources and limitations", closed.
7. Up to 3 cards, each a flat `PlanCard` with a "Why?" disclosure.
8. "Also still applies (see above)".
9. The safety note.
10. Copy.

Lines 2–4, 6 and 9 show only on the first answer, and again when they change (J23, `contextKey`). "Not current" always shows.

### 6.2 Proposed order (RECOMMENDED, A2)

It uses the same fields and adds no server change.

| # | Block | Field | Note |
|---|---|---|---|
| 1 | "AirAware" label | fixed | Built |
| 2 | **The answer**, the largest text | `summary`, or `verdictFrom(air).explanation` | Built. Claude writes 1–3 short sentences |
| 3 | **Provenance chips**, in one wrapped row | `generatedBy` → "Made with AI" or "Made by our rules"; `verdictFrom(air).title`; "Model forecast · Open-Meteo" (link: `forecast.sourceUrl`); "retrieved {clockTime(forecast.retrievedAt)}" | The same strings as now, kept next to the answer (Ask UX spec §11). With `forecast: null`, show the verdict title alone (AK-09) |
| 4 | **"Not current" banner**, when stale | `isOlderThan(forecast.retrievedAt, now, 60)` | Always shown, never folded away. It stays above the composer's top (AK-20) |
| 5 | **"What you could do"**: up to 3 cards | `cards` (household rules first, then guides), leaving out cards shown above (J24) | Cards come only from the server. Each keeps "Why?" (§7). An AI answer may have 0 cards, and then this block is absent |
| 6 | "Also still applies (see above): …" | `shown` | Built |
| 7 | Caveat and safety note, once (J23) | `verdictFrom(air).caveat`, `safetyNote` | Moved after the cards, so the answer and the actions come first. Both remain visible |
| 8 | "Sources and limitations" (closed) | `forecast.limitations` merged (`mergedLimitations`) | Built (J11). Holds only limitations, never "Model forecast" or "Not current" |
| 9 | Actions row | Copy (and feedback, if approved; §11) | Copy's text already includes the answer, cards, "Based on" and the note (`AskEntry.tsx:101-111`) |
| 10 | Question back (one at a time) | `followUps`, rules-only (`askTopics.ts:229-249`) | Built (§8) |
| 11 | "You could also ask:" | `suggestionsFor(topic)` from fixed starters | Built (§8) |

**Mapping to the question bank's response format** (`AirAware_AI_Assistant_Question_Bank.md:229-238`):

| Bank part | Blocks |
|---|---|
| Direct answer | 2 |
| What this means | 2 and 7 |
| What you can do | 5 |
| Why this suggestion | each card's "Why?" |
| Source and freshness | 3, 4 and 8 |
| Next question | 10 and 11 |

No empty source field is ever shown. Absent fields are left out (`AirLine`, `AskEntry.tsx:84-97`).

---

## 7. Why, source and methodology

| Level | Contents | Status |
|---|---|---|
| **Per card: "Why?"** | `reason`; "Based on" (`evidenceType`: a data rule or a general suggestion); `inputsUsed` as labels; `caveat`; source links from `sources` filtered by `sourceIds` (`PlanCard.tsx:61-115`) | Built. Keep the single label "Why?" (E1, F-23) |
| **Per answer: "Sources and limitations"** | The forecast's limitations, merged with the app's (`limitations.ts`) | Built (J11) |
| **Per visit: "How AirAware answers"** (R7, A11) | The rules decide which suggestions fit; Claude words the answer and picks up to 3 cards; what is sent (J26 D2); what is never sent; what it won't do (diagnose, compute an index, promise outcomes). Links to Privacy | RECOMMENDED. It must match the **deployed** server, so it ships with or after J26. Copy is in §15 |
| **Data questions** ("Is this a CPCB observation?") | Today Claude answers these when it is available. The rules fallback cannot (§13) | A19 (backend) |

---

## 8. Follow-ups

There are three kinds. All exist; none is AI-generated (J26).

1. **Question back.** One household question at a time, offered only when its answer would change today's cards. It is computed by the rules (`followUpsFor`, `askTopics.ts:229-249`) and shown on the newest reply only (`pendingFollowUp`, `ask.ts:118-146`). "May be more sensitive" is never asked here. Answers go into the answers on screen, with the note "This changes your answers for this visit. To keep them, save in My Profile." Keep as built.
2. **"You could also ask:".** Starters for neighbouring topics (`ask.ts:93-106`). Keep, with the reworded starters from §4.
3. **A typed follow-up** ("Why do you recommend that?"). Claude gets up to 2 earlier typed questions and their card titles, plus every eligible card's reason, so it can explain.
   - **Gap (OBSERVED):** an answer to a topic chip is never sent as history, so a follow-up after a chip has no context (`useAsk.ts:137-154`).
   - **A25 (RECOMMENDED, owner decision under J26 D2):** send the chip label as the earlier question.
   - When Claude is unavailable, the follow-up gets the off-topic line (§13).

---

## 9. In-visit history (no storage)

**OBSERVED:**
- Memory only, 10 entries, kept while switching tabs.
- Cleared by reload, a place change or "Delete everything".
- Nothing is written to localStorage, Supabase or logs (`routes/assistant.ts:9-11`; Ask UX spec §12).

**RECOMMENDED:**
- **A13:** one muted line under the conversation region's first answer: "This conversation stays on this page. It clears when you reload or choose another place." It does not promise memory the server lacks.
- **A14 "Start over" (owner decision; J7 currently says no):** a text button in the welcome card that empties the thread through a new reset in `useAsk`. Nothing is sent. If it is not approved, the copy above tells people how a thread ends.
- **Never:** a sidebar, titles, search, or "Continue where you left off".

---

## 10. Composer

**OBSERVED (J8, J12, J17; `Ask.tsx:226-300`):**
- A multiline textarea that grows to about 4 lines and then scrolls.
- Enter sends; Shift+Enter adds a line; IME composition is respected.
- `enterKeyHint="send"`.
- 200 characters.
- Send is disabled while empty or thinking.
- A failed question comes back to an empty box.
- The fixed placeholder "Ask about your air, home or daily routine…".
- Pinned on phones from the start, and from md up after the first question.

**RECOMMENDED:**
- **A12:** from 160 characters, show "{n} characters left" in a polite live region, so `maxLength` doesn't stop typing silently.
- **Keep:** the visible label "Ask about your air, home or day" and the Send text button (at least 48 px tall).
- **Don't add:** a microphone, attachments, or a model or mode switch.

---

## 11. Copy and feedback controls

### Copy (OBSERVED, J25)

- An icon button named "Copy answer". It turns into a tick once copied.
- "Copied", or "Couldn't copy. Select the text to copy it instead.", in a live region.
- **A4:** add a visible label on `:hover` and `:focus-visible`, using CSS or the native `popover`. The `title` attribute alone doesn't show on keyboard focus or touch (08 §3.3).

### Feedback (not built)

**J7 rules it out "in this pass".** The Ask UX spec §11 allows feedback only with a real handler and a privacy plan.

| Option | What it is | Verdict |
|---|---|---|
| F0 | No feedback (today) | Default until the owner decides |
| F1 | Thumbs that only show a thank-you line and send nothing | **Rejected.** An inert control (Ask UX spec §11) |
| F2 (A15) | "Useful" and "Not useful" (icon buttons, 44 px, `aria-pressed`) that POST `{useful, topic, generatedBy, cardIds, promptVersion}` to a new rate-limited route. **No question text, place or household answers.** Results are kept as aggregate counts. "Not useful" also shows the topic chips and "Try rephrasing". This needs a new route, a Privacy page and `PRIVACY.md` update, and an owner decision | Later, backend |

---

## 12. States

| State | Trigger (OBSERVED) | UI now (OBSERVED) | Change (RECOMMENDED) |
|---|---|---|---|
| No place | `place === null` | Place search and "Use my location" (`Ask.tsx:166-170`) | Keep |
| Forecast loading | `forecastLoading` | The context line reserves the time's width invisibly (`Ask.tsx:133-140`) | Keep in chip form |
| Forecast failed | `!updatedAt && !forecastLoading` | "forecast unavailable right now" in the context line; answers still come with air `unknown` | Starters lead with indoor topics (§5) |
| Not current | `isOlderThan(updatedAt, now, 60)` | "· Not current" on the line; `StaleBanner` in each stale answer | Chip with a solid `warning` fill; banner unchanged |
| Empty thread | `entries.length === 0` | "How can I help you today?" and starters | §4 |
| Thinking | `status: 'thinking'` | "AirAware is thinking…" plus a pulse bar (static under reduced motion); a status `<output>`; Send and chips disabled; `aria-busy` on the article | After about 8 s, add the static line "Still working on it. Answers can take a few seconds." A topic answer can wait on Gemini (10 s, up to 2 tries) and then Claude (13 §2) |
| Answer: AI | `generatedBy: 'ai'` | "Made with AI" | Chip (§6) |
| Answer: rules (no key, failed checks, timeout, cap reached) | `generatedBy: 'rules'` | "Made by our rules" | Reuse the approved plan line "Made by our rules. AI personalisation is unavailable right now." (`planDisplay.ts:102`). The client cannot tell why AI was not used, and this line claims nothing more |
| AI answer with 0 cards | `cards: []` | Answer, provenance, note; no question back | Keep. "You could also ask" still follows the topic |
| Air unknown | `air.level` unknown, `forecast: null` | Verdict "Air information unavailable"; no "Model forecast" claim (AK-09) | Keep |
| Medical | `topic: 'medical'` (no AI call) | "I can't give medical advice. For health concerns, please talk to a doctor." plus "Today:" air line, stale banner, note (`AskEntry.tsx:171-182`) | **A6:** add the existing out-of-scope sentence and the topic chips, so the person has a way forward. Reuses `ASK_COPY.outOfScope`; no new string |
| Out of scope (keywords, or Claude says so) | `topic: 'out_of_scope'` | "I can help with outdoor plans, windows and ventilation, indoor air, family, commuting and better habits." plus chips | **A7:** add a pointer for questions about the data (copy in §15) |
| Refusal inside scope ("Can you guarantee…", "Is it safe…") | Claude treats these as in scope (`prompts.ts:68`); the checks ban "safe", "guarantee" and verdicts | A normal answer that declines to promise and explains what to consider, with cards and provenance. In the rules fallback, the topic's cards with the verdict explanation | Keep. Copy pattern in §15.3 ("I can't promise how any outing will turn out…") |
| Error: rate limited | `RATE_LIMITED` | Alert card "We couldn't answer that", "Too many requests. Try again in a minute.", "Try again" (`States.tsx:34-81`) | Keep. No automatic retry |
| Error: network | `NETWORK_ERROR` | "Could not reach AirAware. Check your connection." | Keep |
| Error: other | other codes | "Something went wrong answering your question." | Keep. The typed text returns to the box (`Ask.tsx:74-81`) |
| Place changed mid-answer | key change | The thread empties and the late reply is dropped (`useAsk.ts:79-99`) | Keep |
| Question back | `pendingFollowUp` | Fieldset with options plus Skip, and the note | Keep |
| Answer that changes nothing | `changes` excludes the value | "Noted. That doesn't change this answer." | Keep |
| Copy failed | clipboard rejects | "Couldn't copy. Select the text to copy it instead." | Keep |

An empty successful reply cannot happen: the server always returns `cards`, a summary or the verdict explanation, and the checks reject answers under 20 characters.

---

## 13. Intent handling against the question bank

### 13.1 How routing works

- **Keyword route (`classify()`):** for a typed question it decides only two things:
  - the medical gate;
  - the topic used **when Claude is absent or fails**.
- **With Claude available:** every non-medical typed question goes to Claude, including those the keywords call out of scope (J26 D1). Claude picks the topic and the cards.

### 13.2 Keyword route results

**Method:** the repo's own `classify()` was run with Node on every question in the bank. `checkAskOutput`, `VERDICT` and `BANNED` were run on the copy examples in §15, not on the bank questions. The scripts live outside the repo, in the session scratchpad (`redesign/classify-bank.mjs`, `check-ask.mjs`, output in `classify-out.txt`). No Claude call was made, so the Claude column describes the code path, not an observed answer.

| Bank section | Questions | Keyword route results (OBSERVED, run) |
|---|---|---|
| §1 welcome | 8 | outdoors 4, indoor 2, windows 1, commuting 1 |
| §2 understanding the forecast | 16 | outdoors 12, **out of scope 4** ("What does the PM2.5 number mean?", "difference between PM2.5 and PM10", "How might tomorrow compare", "Is this a live reading from a monitoring station?") |
| §3 outdoor activities | 10 | outdoors 7, family 1, commuting 1, out of scope 1 |
| §4 commute | 9 | commuting 8, habits 1 (idling) |
| §5 windows and ventilation | 10 | windows 7, indoor 2, outdoors 1 |
| §6 cooking smoke | 10 | indoor 10 |
| §7 dust and filtration | 12 | indoor 9, windows 1, **out of scope 2** (vacuuming, HEPA) |
| §8 weather | 8 | outdoors 7, out of scope 1 |
| §9 household and plans | 10 | **out of scope 8**, indoor 2 |
| §10 habits | 10 | habits 4, indoor 1, commuting 1, family 1, outdoors 1, out of scope 2 |
| §11 follow-ups | 12 | **out of scope 9**, outdoors 2, indoor 1 |
| §12 sources and uncertainty | 12 | outdoors 6, **out of scope 5**, indoor 1 |
| §13 unsupported or sensitive | 10 | medical 4, outdoors 4, family 1, indoor 1 |
| §14 errors and edge cases | 10 | out of scope 5, outdoors 4, indoor 1 |
| **Total** | **147** | **37 out of scope (25 %)**, 4 medical |

### 13.3 What this means

- **With Claude deployed:** the 37 still reach Claude, which may answer them. They include follow-ups, data questions and household questions.
- **When Claude is unavailable, fails a check, times out or hits the cap:** those 37 get the fixed off-topic line.
- **Production today (INFERRED):** `askTopics.ts` has no diff against `origin/main` (checked with `git diff origin/main`), so if production serves `origin/main`, its pre-J26 server routes typed questions by these same keywords. Whether production serves exactly `origin/main` was not verified.
- **Misroutes in the fallback (OBSERVED, run):**

  | Question | Keyword route |
  |---|---|
  | "Do you have a monitoring station near my home?" | indoor ("home") |
  | "How can I reduce unnecessary energy use at home?" | indoor, not habits |
  | "What can my family do to avoid unnecessary idling?" | family |
  | "Is this an official CPCB observation?" | out of scope |
  | "Why can't you give me an AQI number?" | outdoors: outdoor cards that don't answer the question |
- **Medical gate:** the 4 medical questions in §13 are caught by keywords. A symptom question without a listed word reaches Claude, which must say `out_of_scope`. The person then sees the general off-topic line, not the doctor line, because Claude's text is discarded (`ask.ts:363-364`). Fixing that needs backend work (A18).

### 13.4 The evaluation set of 20, by question

**Columns:**
- **Keyword route:** OBSERVED (run).
- **Claude path:** what the code sends and allows (OBSERVED code). The answer itself is not observed.
- **Context lacks:** what Claude's input does not contain.

| # | Question | Keyword route | Claude path | Context lacks | Status |
|---|---|---|---|---|---|
| 1 | How is the air forecast for my city today? | outdoors | The 24-hour check plus limitations | — | Supported |
| 2 | Can you explain today's forecast in simple words? | outdoors | Same | — | Supported |
| 3 | What should I consider before going for a walk today? | outdoors | Outdoor cards | — | Supported |
| 4 | What time would be a better option for outdoor exercise today? | outdoors | Must say hourly data is missing and point to Air quality details (`prompts.ts:72`) | Hourly values | Needs A17 (backend); timeline P3 on Today |
| 5 | What does PM2.5 mean? | **out of scope** | In scope as general guidance; particle sizes in words only (`prompts.ts:71`) | — | Supported with Claude. **Fallback misroutes** |
| 6 | How does today's forecast compare with yesterday? | outdoors | Must say it doesn't have yesterday | Past air data | Needs I2 (data) |
| 7 | Should I open my windows right now? | windows | Window cards; "depends" framing | "Right now" (hourly) | Supported without timing |
| 8 | How can I reduce cooking smoke? | indoor | Cooking cards | — | Supported |
| 9 | How can I reduce dust in my bedroom? | indoor | Dust guide cards | — | Supported |
| 10 | What should I look for when choosing an air purifier? | indoor | Filtration guide cards; no product or sizing advice | A sizing method | Supported (qualitative) |
| 11 | What does today's forecast mean for my commute? | commuting | Commute cards | — | Supported |
| 12 | How can I reduce unnecessary vehicle idling? | habits | `guide.no-idling` | — | Supported |
| 13 | What small habits can I start today? | habits | Habit guide cards | — | Supported |
| 14 | Why do you recommend that? | **out of scope** | Earlier typed questions plus card titles; all eligible cards' reasons | History after a **topic chip** (A25) | Supported after a typed question. **Fallback misroutes** |
| 15 | Is this an official CPCB observation? | **out of scope** | The prompt's own example answer (`prompts.ts:73`) | — | Supported with Claude. **Fallback misroutes** (A19) |
| 16 | Why can't you give me an AQI number? | outdoors | Must not write "AQI"; says "not an official index" (`prompts.ts:70`) | — | Supported with Claude. The fallback gives outdoor cards (A19) |
| 17 | Why does the app say "Not current"? | **out of scope** | No retrieval time in the input, and clock times are banned (`prompts.ts:75`); can explain in general | The retrieval time (the answer's own chip and banner show it) | Partly. **Fallback misroutes** |
| 18 | Can you still help if the forecast is unavailable? | outdoors | With air `unknown` it must say so; indoor cards stay eligible | — | Supported |
| 19 | Can you diagnose my cough from the air forecast? | medical | No AI call; fixed doctor line | — | Supported |
| 20 | Can you guarantee that it is safe for my child to play outside? | family | In scope: explain what to consider, never promise (`prompts.ts:68`); checks ban "safe" and "guarantee" | — | Supported |

### 13.5 Gaps across the bank (INFERRED from the prompt and input, not observed)

- **Account, saving and privacy questions** (bank §9.3–9.6, §14.2–14.3) count as "how AirAware works" in the prompt, but Claude gets no facts about accounts or saving. It could describe app behaviour wrongly, and no check catches that.
  - **A19:** send these to a fixed answer, or have the prompt point to the Privacy page.
- **Weather questions** (§8): Claude has no weather data and must not infer air from weather (`prompts.ts:76`). General answers only. Weather context would be A16 (backend).
- **Tomorrow:** no forecast for tomorrow's window is assessed. That needs I3 (backend).

---

## 14. What the server supports today, and what needs backend work

| Capability | Local build (`b0c4278`) | Production (28 Nov) | Needs |
|---|---|---|---|
| Typed question answered by Claude from rule cards, with checks | Yes (J26) | **No.** Pre-J26 intro seen (`current/ask-1440.jpg`) | Deploy (owner, I5), plus an Anthropic spend limit |
| Topic chips: rules plus Gemini wording | Yes | Not exercised (the flow predates J26 in code; no answer was rendered live) | — |
| Up to 2 earlier typed questions as context | Yes | Not exercised | — |
| Medical gate with no AI call | Yes | Not exercised (`askTopics.ts` has no diff against `origin/main`) | — |
| Rules fallback on any Claude failure | Yes | n/a | — |
| Questions back (household) | Yes | Not exercised | — |
| Provenance, "Not current", sources and limitations per answer | Yes (client) | Not exercised (no answer rendered live; the context line was seen) | — |
| Copy answer | Yes (client) | Not exercised | — |
| Contextual starters, "Ask about this", "Jump to latest", character hint, chips, "How AirAware answers" | Client only | — | Frontend work only (A1, A8–A13) |
| Chip exchanges as history | Client change only | — | Owner decision (A25) |
| Feedback | No | No | **Backend** (A15) |
| Tailored refusals and a doctor line for unlisted symptoms | No (Claude's text discarded) | No | **Backend** (A18) |
| Fixed data and app answers in the fallback | No | No | **Backend** (A19) |
| Weather, fire or hourly context in answers | No (J26 D3) | No | **Backend** (A16, A17) |
| Yesterday or history | No | No | **Data** (I1, I2) |
| Streaming, stored conversations, other languages | No | No | Deferred (A21, A22, A24) |

---

## 15. Copy examples

### 15.1 How they were checked

Every string was run through the repo's own checks:
- `copy.spec.ts` banned words: safe, healthy, clean air, good air, bad air;
- its AQI rule;
- `VERDICT` (`askOutput.ts:16-17`).

The illustrative AI answers were also run through `checkAskOutput` with the test fixture input (`server/src/services/ai/fixtures.ts`: an above-limit check and the full household). All of them returned PASS.

These AI answers are **illustrative only: they show the style, and none is real Claude output.** The AI examples avoid digits on purpose, because the numbers check only accepts numbers that appear in the input. That is why they say "daily limits" rather than "24-hour limits".

### 15.2 Fixed UI strings (new; each needs CP-04)

| Where | String | Checks |
|---|---|---|
| History note (A13) | This conversation stays on this page. It clears when you reload or choose another place. | pass |
| Start over (A14, if approved) | Start over | pass |
| Character hint (A12) | 20 characters left | pass |
| Long wait | Still working on it. Answers can take a few seconds. | pass |
| Rules answer label (reused, not new) | Made by our rules. AI personalisation is unavailable right now. | pass (`planDisplay.ts:102`) |
| Out-of-scope pointer (A7) | Questions about the forecast itself: see Air quality details on Today. | pass (no AQI, no verdict) |
| How AirAware answers (R7) | AirAware's rules decide which suggestions fit today's forecast and your answers. Claude (Anthropic) explains them in plain words and picks up to three. It gets the suggestions our rules picked, not your place or your household answers. | pass. True to `planOutput.ts:53-79` |
| What Claude saw (R5) | Sent with your question: the 24-hour check, the suggestions AirAware's rules allow for your household, the forecast's source and limitations, and up to two earlier questions from this visit. | pass. Matches `ask.ts:343-357` |
| Jump link (A8) | Jump to latest answer | pass |
| Ask about this (A10) | Ask about this | pass |
| Feedback (A15, if approved) | Was this answer useful? / Useful / Not useful / Sorry it missed. Try rephrasing, or pick a topic below. | pass |
| Index explainer (fixed UI only) | We don't calculate an AQI. AirAware compares the model forecast with India's 24-hour limits. | Passes `copy.spec.ts` (the allowed phrase). **It would fail the AI check** (`BANNED` has `\baqi\b`), so it may appear only as fixed UI text, never in Claude's output |

### 15.3 Illustrative AI answers

Each passes `checkAskOutput`, `copy.spec.ts` and `VERDICT`. They show tone only; Claude writes the real text.

| Question | Illustrative answer |
|---|---|
| Walk, within the limit | Today's model forecast is within India's daily limits for fine and coarse particles. That does not make it free of risk, so a route away from heavy traffic is worth considering. |
| Walk, above the limit | Today's model forecast is above India's daily limits. You could keep the walk shorter, choose a quieter route, or move it indoors. The suggestions below explain why. |
| Windows, above | It depends on what is happening inside as well as outside. With the forecast above India's daily limits, consider airing rooms briefly after cooking rather than for long stretches. |
| Air unknown | Air information is unavailable right now, so I can't say how today's forecast compares with India's limits. The indoor suggestions below do not depend on the forecast. |
| Best hour | I don't have hourly values in this answer. Open Air quality details on Today to see how the model forecast changes through the day. |
| Guarantee for a child | I can't promise how any outing will turn out. Here is what the model forecast and AirAware's outdoor suggestions say to consider before you go. |
| CO₂ saving | AirAware can't calculate an emissions saving for that change. These commuting suggestions are the ones it supports, with the reasons behind them. |
| CPCB? | This is a model forecast from Open-Meteo, not an official CPCB observation or a station reading. AirAware gives no official index number. |
| Rain and air | Weather alone doesn't tell you about particle levels, so I won't read the air from rain or clouds. The model forecast is the place to look. |
| Why that? | That suggestion fits because you travel close to traffic and the forecast is above the limit. Open Why? on the card to see its source. |

### 15.4 Patterns to avoid

Each of these fails a check or a rule.

| Pattern | Why it fails |
|---|---|
| "Yes, go ahead…" or "No, …" | VERDICT |
| "It's fine to…" | VERDICT |
| "Good idea to…" | VERDICT |
| "safe" or "unsafe" | BANNED and `copy.spec.ts` |
| "clean air" | BANNED and `copy.spec.ts` |
| "low risk" | BANNED |
| "AQI" in Claude's text | BANNED |
| "PM2.5 is 72 µg/m³" when 72 isn't in the input | Numbers check |
| "Rain has cleared the air" | Weather inference (`prompts.ts:76`) |
| "Measured" or "live" for model data | Data rules |

---

## 16. Accessibility and performance (keep, plus)

**Keep:**
- **Focus and scroll:** the newest exchange's heading takes focus with `preventScroll`. Late replies never yank someone who has scrolled away (`AskEntry.tsx:295-321`).
- **Announcements:** the status `<output>` announces "Answer ready. {answer}".
- **Gates AK-01 to AK-24:** pinning, 200 % text, keyboard emulation and "Not current" above the box.

**RECOMMENDED additions:**
- **Targets:** every new chip and button is at least 44 px.
- **Live regions:** the character hint and the long-wait line use polite live regions and never steal focus.
- **Reduced motion:** the answer rise (`index.css:193-204`) and any chip transitions stop under reduced motion.
- **No new dependency:** bundle cost is +0 (08 §3.5). Ask code moves into its own chunk only with route splitting (L6).

## 17. Acceptance checks for the RECOMMENDED changes

**Ask UX:**
- Starters and chips show only approved strings.
- `copy.spec.ts` passes on every new state: medical with chips, out-of-scope with the pointer, the long wait, the history note.
- With `forecast: null`, no chip says "Model forecast" (AK-09).
- "Not current" is visible without opening anything in every stale answer (AK-20, DI-05).
- No new request is fired by:
  - "Ask about this" (it fills the box only);
  - "Start over";
  - "Jump to latest";
  - the contextual starter choice.
- The "What Claude saw" copy matches `ask.ts:343-357` at deploy time. A unit test pins the string next to the server fields.
- Axe passes, keyboard order works and no element overflows at 320×640, 390×844, 768×1024, 1280×720 and 1440×900.

**Production checks after the J26 deploy (owner, not run here):**
- Run the 20-question evaluation set live, with Claude on and with Claude forced off.
- Confirm the misroutes in §13.3 are as predicted.

## 18. Owner decisions this spec needs

| # | Decision | Options |
|---|---|---|
| O1 | Deploy J26 (and set the Anthropic spend limit) | Yes or not yet. R5, R7 and A11 wait on it |
| O2 | Reworded starters (§4) | Approve or edit |
| O3 | J7: feedback, "Start over" | Keep J7 (F0, no Start over), or approve A14 and/or A15 (backend plus Privacy) |
| O4 | A25: chip exchanges as history | Approve or keep J26 D2 as written |
| O5 | A19: fixed data and app answers in the fallback, plus a Privacy pointer in the prompt (prompt version bump) | Approve for the backend phase or defer |
| O6 | Starters as `{question}` (Claude, uses the cap) or `{topic}` (no Claude) | Keep as is or change |
| O7 | Each new string in §15.2 | CP-04 |

## 19. Not verified

- **No live Ask questions.** No question was sent to production or to a local server. Claude-path behaviour is read from code and the prompt. The illustrative answers are not real outputs.
- **Production J26 status** is inferred from the intro string in one capture. Production server behaviour (keys, caps, Gemini topic wording) was not exercised.
- **Answer states not viewed live:** thinking, ready, error and question back. The descriptions come from code and tests.
- **Wait time** before "Still working on it" is a proposal. No real latency was measured for Ask.
- **`askEval.live.test.ts` was not run.** Its results are unknown.
- **The fallback misroutes** come from running `classify()` locally; they were not seen in the UI.
- **Not opened for this doc:**
  - `04_EXISTING_COMPONENT_INVENTORY.md`;
  - `07_SCREEN_WIREFRAMES.md`;
  - `AirAware_Ask_AirAware_Chat_UI_Redesign_Spec.md`;
  - Ask UX spec §14–§20, read by heading only.
- **Today's entry points into Ask** (`AskBox.tsx`, `HelpChoices.tsx`) were not read. This spec covers the Ask page only.
