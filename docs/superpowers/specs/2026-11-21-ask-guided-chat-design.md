# Ask AirAware as a guided chat — design

**Status:** approved by the owner, 21 Nov 2026.
**Decided with the owner (21 Nov):**
- A guided chat. The AI never reads what people type, so decision D1 (`2026-11-20-assistant-redesign-design.md` §4) and the Ask paragraph in `PRIVACY.md` stand unchanged. *Amended (28 Nov): J26 and ADR-008 replace this. A typed question now reaches Claude, and `PRIVACY.md` was rewritten. Follow-up questions are still never AI-written.*
- An answer given in the chat counts everywhere: Today's plan, My Home and My Profile.
**Marked "my call":** decisions the owner has not made. Each one is open to correction.

## 1. Intent

The owner asked to "make Ask AirAware interactive with the user like a personal assistant".

Today Ask works like a search box with a results list:
- You tap a topic or type a question.
- One answer appears above the earlier ones.
- It never talks back, never asks you anything, and never suggests what to ask next.

The goal is that Ask feels like an assistant you talk with:
- it greets you;
- it answers in a conversation;
- it asks you one question back when your answer would change its advice;
- it suggests what to ask next.

All of this keeps the safety and privacy rules the app already has.

## 2. Goals, non-goals, anti-goals

**Goals:**
1. **A conversation thread:**
   - oldest message first, newest at the bottom;
   - your messages on one side, AirAware's replies on the other;
   - the question box under the thread.
2. **A greeting:** an empty thread opens with one message from AirAware, made of fixed text. It holds the topic chips and the starter questions.
3. **Asking back:**
   - After a topic answer, AirAware may ask one household question, but only when it is unanswered and its answer would change that topic's advice.
   - The question uses tap answers.
   - Answering it updates the answers on screen and asks the same topic again, so the next reply is more personal.
4. **Suggestions:** every topic answer ends with 2 or 3 questions to ask next, taken from the existing starters.
5. **Nothing that exists is lost.** These all stay exactly as they are:
   - "Made with AI"/"Made by our rules";
   - the "Based on: … · Model forecast · updated …" line;
   - "Not current";
   - up to three cards with "Why?";
   - the safety note;
   - the medical and out-of-scope replies;
   - the memory for this visit only;
   - one screen-reader status line;
   - focus moving to the new reply.

**Non-goals:**
- Open chat, or the AI reading typed text.
- Voice.
- Saving or syncing the conversation.
- New rule cards, new guide cards or a new AI prompt.
- A breaking API change. The answer only gains one field, `followUps` (§5.2), and the request is unchanged.
- A composer fixed to the bottom of the screen. *My call:* on phones it would sit between the keyboard and the fixed bottom bar, a known source of layout bugs. It can come later.

**Anti-goals.** Each of these is a failure even if the screen works:
- The AI sees typed text, or the conversation is stored or logged. *Amended (28 Nov): Claude now sees a typed question and up to 2 earlier ones (J26). Storing or logging the conversation stays out of scope.*
- A yes or no on safety, or an invented number.
- More than one question back per reply.
- Asking a question again that the person skipped during this visit.
- Asking anything that reads as medical. *My call:* "Might someone at home be more sensitive to air pollution?" is never asked back. It stays on My Profile only.
- Hiding "Model forecast" or "Not current".

## 3. Constraints

- **Data and AI rules:** `AGENTS.md` §5–7 and `.claude/rules/air-data.md`. The AI input stays exactly as it is today: the air checks plus the rule cards' fixed text (`toWriterInput`). *Amended (28 Nov): for a typed question Claude also gets the question, up to 2 earlier ones and the forecast's provenance (J26).*
- **Privacy:**
  - The typed question still only picks a topic on the server, and it is then dropped. *Amended (28 Nov): a typed question that is not medical now goes to Claude too (J26).*
  - Answers given in the chat are the same household answers My Profile edits. They are sent as `householdContext`, as today.
  - The conversation lives in memory for the visit (at most 10 exchanges) and is gone after a reload, a new place or "Delete my saved data".
- **Rate limit:**
  - The plan limit is 10 a minute per IP, shared by plan, save and Ask.
  - Each reply, including the one after a question back, is one request.
  - Going over shows the existing rate-limit error with "Try again".
- **Accessibility:**
  - WCAG 2.2 AA;
  - 44 px targets;
  - a keyboard path through every control, including the questions back;
  - one live region;
  - reduced motion respected.
- **Phones:** works at 320 px with the fixed bottom bar, and with 200% text.
- **Copy:** none of the banned words ("safe", "healthy", "clean air", "good air", "bad air", "AQI"); `e2e/copy.spec.ts` covers the new states.

## 4. Approaches

| Question | Chosen | Rejected, and why |
|---|---|---|
| Does the AI read typed text? | No: a guided chat (owner, 21 Nov). *Amended (28 Nov, J26): yes, Claude reads typed questions; follow-ups stay non-AI.* | Open chat: it reverses D1 and `PRIVACY.md`, adds prompt-injection and medical risk, and is about 2 more days |
| Thread order | Oldest first, newest at the bottom; focus moves to the new reply's heading | Newest first, as today: it reads as a results list, not a conversation |
| How AirAware asks back | The existing My Profile questions. The server offers one only when one of its answers would change today's cards (§5.2). *My call*, after the builder check. | A fixed list on the client: many questions change nothing on a day within the limits, and each one would cost a request for the same reply. AI-written questions: free text that can't be checked against the rules. |
| Where a chat answer goes | Everywhere (owner, 21 Nov). It goes into the answers on screen, and My Profile's form follows them (§5.6). It stays unsaved until My Profile's Save. | Answers kept only inside Ask: the assistant and the rest of the app would disagree about the person |

## 5. Design

### 5.1 The thread

```text
Ask AirAware
Using: the Pune model forecast, updated 11:04 · 3 of 10 answers · Edit

  ┌ AirAware ───────────────────────────────────┐
  │ Good morning. I'm AirAware. Ask me about     │
  │ your day, your home or your commute.         │
  │ [Outdoor activities] [Windows…] [Indoor air] │
  │ [My family] [Commuting] [Greener habits]     │
  │ (Can I go for a morning walk today?)         │
  │ (Is it a good idea to open my windows?) …    │
  └─────────────────────────────────────────────┘
              ┌ You ───────────────────────────┐
              │ Can I go for a morning walk?   │
              └────────────────────────────────┘
  ┌ AirAware ───────────────────────────────────┐
  │ {short answer}                               │
  │ Made by our rules                            │
  │ Based on: {verdict} · Model forecast · …     │
  │ [card] [card]   (each with "Why?")           │
  │ General information only, not medical …      │
  │ One question so I can be more specific:      │
  │ Do you exercise outdoors?  [Yes] [No] [Skip] │
  │ This changes your answers for this visit.    │
  │ To keep them, save in My Profile.            │
  │ You could also ask:                          │
  │ (How can I reduce pollution while commuting?)│
  └─────────────────────────────────────────────┘
Ask about your air, home or day  [_____________] [Send]
```

- **The top panel goes:** the current panel above the answers (chips, starters and the box) is removed. The chips and starters move into the greeting, and the box moves under the thread.
- **The greeting:** the greeting word is the existing "Good morning/afternoon/evening" logic from Today's H1. It is always the first message, and stays at the top of the thread.
- **Your message:**
  - it shows the question typed, the chip's label, or the answer you tapped;
  - its heading keeps today's behaviour: the new reply's heading takes focus;
  - a visually hidden "You asked:" or "You answered:" starts each heading.
- **The pressed-chip tick:** *My call:* it goes, because the thread already shows what was asked.
- **Limits and resets:**
  - At most 10 exchanges. The oldest is dropped from the top; the greeting is never dropped.
  - A new place empties the thread, as today.

### 5.2 Asking back

*My call, after the builder check:* the server decides which questions can change the advice, because only the server knows the rules, today's air and the three-card cap.

**Candidate questions per topic.** These are household questions from My Profile, in order:

| Topic | Candidates, in order |
|---|---|
| Outdoor activities | `routine.outdoorExercise`, `routine.commuteMode` |
| Windows and ventilation | `home.nearBusyRoad`, `home.kitchenExhaust` |
| Indoor air | `home.cookingFuel`, `home.kitchenExhaust`, `home.airPurifier`, `home.nearBusyRoad` |
| My family | `householdNeeds.includesChildren`, `householdNeeds.includesOlderAdults`, `routine.schoolCommute` |
| Commuting | `routine.commuteMode`, `routine.schoolCommute` |
| Greener habits | `routine.commuteMode`, `home.cookingFuel` |

- A server test fails if a candidate is not in the `inputsUsed` of at least one rule in that topic's `TOPIC_CARDS[topic].rules`.
- `householdNeeds.mayBeMoreSensitive` is never a candidate (§2).
- The list and each question's answer values live where the client and the server can both import them. A test checks that the values match the options in `householdFields.ts`.

**What the server adds.** Each topic answer gains `followUps`:
```ts
followUps: Array<{ field: string; changes: string[] }>;
```
- **What goes in:** every candidate that is unanswered in the request's `householdContext`, in the table's order. Each comes with the answer values that would change this answer's cards today.
- **How "changes" is worked out:** set that one value, rebuild the candidates, run `chooseCards`, and compare the card ids with this answer's.
  - This takes today's air into account: "Are there children in your home?" changes nothing on a day within the limits.
  - It also takes the three-card cap into account: a rule that fires but would not be shown changes nothing.
- **What is left out:** a candidate with no changing value.
- **Medical, out-of-scope and error replies** have no follow-ups.
- **Cost:** no AI call; this is the rules only.

**When the client shows a question back:**
- **Where:** only on the newest reply.
- **Which:** the first entry in `followUps` that is still unanswered in the answers on screen and not skipped during this visit.
- **When it goes away:**
  - Sending anything else removes it from the older reply. Ignoring it is not a skip, so it can be asked again later.
  - If that question gets answered elsewhere (My Profile), it disappears.

**What the person sees:**
- The question's label and options come from `householdFields.ts`, word for word. A yes/no question shows **Yes** and **No**. Every question also shows **Skip**.
- The note: "This changes your answers for this visit. To keep them, save in My Profile."

**Tapping an answer:**
1. It sets that one field in the answers on screen, the same state My Profile edits.
2. It adds your message with the tapped label.
3. The next step depends on the value:
   - **In `changes`:** it asks the same topic again. The new reply is more personal.
   - **Not in `changes`:** nothing is sent. AirAware replies "Noted. That doesn't change this answer." *(Amended in the final review: the earlier "…today's advice" was false when the answer adds a card elsewhere, for example to Today's plan.)*
4. The question's buttons are replaced by "You answered: {label}."

**Tapping Skip:**
- Nothing is sent.
- The buttons are replaced by "Skipped. You can answer it in My Profile any time."
- That question is not asked again during this visit.

**What resets:** skips last as long as the thread does, so they reset with a new place or a reload.

### 5.3 Suggestions

- **What a topic answer ends with:** "You could also ask:" and 2 or 3 starter questions, taken from the existing `STARTERS`.
- **Which starters:** not the topic just answered. The ones closest to that topic come first. The builder fixes the order in a small map and tests it.
- **What a tap does:** it sends the starter as a question, as starters do today.
- **Medical and out-of-scope replies:** they keep today's content. The out-of-scope reply keeps its topic chips.

### 5.4 States

- **Thinking, error, medical and out of scope:** they stay as today, shown as AirAware replies in the thread.
- **While a request is in flight:** the chips, starters, answers to questions back, suggestions and "Send" are disabled, as "busy" is today.
- **A reply for an old place:** it is dropped, as today.

### 5.5 Accessibility

- **Headings:** each exchange stays a section headed by your message.
- **A question back:** a `group` labelled by the question. Its buttons are at least 44 px tall.
- **Focus:**
  - focus moves to the new reply's heading, as today;
  - after Skip, focus moves to the replacement line;
  - after an answer, focus follows the new reply.
- **Bubbles:** they use `DESIGN.md` tokens only, and pass contrast in light, forced-colours and 200% text.
- **Motion:** none required. If a new message fades in, it does so only under `motion-safe`.

### 5.6 Files likely to change

- `client/src/pages/Ask.tsx` (thread layout, greeting, composer position).
- `client/src/features/ask/AskEntry.tsx` (reply bubble, question back, suggestions).
- `client/src/features/ask/useAsk.ts` (oldest-first order, skips, answering).
- `client/src/features/ask/ask.ts` (follow-up and suggestion maps, copy).
- `client/src/pages/AppShell.tsx` (passes `setContext` to Ask).
- `client/src/features/daily-plan/HouseholdPreferencesForm.tsx`: it must follow the answers on screen (owner, 21 Nov). Today it copies `initial` once, at mount, and the hidden My Profile page stays mounted. Without this change three things go wrong:
  - a chat answer would never show in My Profile;
  - My Profile's Save would drop it;
  - the next My Profile edit would overwrite it.

  Two rules for the change:
  - The form takes on any field changed elsewhere.
  - A saved-answers load that arrives late never undoes an answer given meanwhile, matching the form's existing rule.
  - Not by remounting with `formKey`: `formKey > 0` skips the saved-answers load, and a remount during the load leaves `loaded` false, so Today's plan would never build.
- `server/src/services/recommendations/ask.ts`, `shared/contracts.ts` (`followUps`), `API.md`.
- The candidate list and answer values, importable by both workspaces (for example `shared/`). The exact place is left to the builder.
- Tests and docs:
  - `Ask.test.tsx`, `AskEntry.test.tsx`, `useAsk.test.ts`;
  - the e2e specs that assume newest-first or the top panel (`responsive`, `keyboard`, `copy`);
  - `CHANGELOG.md`;
  - an amendment to §7.4 of the redesign spec.

### 5.7 Tests

- **Unit:**
  - the follow-up map: the first unanswered question, skip, and "never `mayBeMoreSensitive`";
  - `useAsk`: oldest-first order, the 10-exchange cap with the greeting kept, an answer in `changes` sets the field and re-asks, an answer not in `changes` sets the field and sends nothing ("Noted…"), Skip sends nothing, a new message retires the waiting question;
  - the Ask page: greeting, chips, suggestions, the question back and its replacement lines;
  - axe on each state.
- **Server:**
  - every candidate appears in an `inputsUsed` of its topic's rules;
  - `followUps` on a day above the limits vs within them (My family offers children and older adults only when above);
  - a value whose rule is hidden by the three-card cap is not in `changes`;
  - `home.kitchenExhaust` "No" changes Indoor air;
  - answered questions are left out;
  - medical and out-of-scope replies have none.
- **My Profile form:**
  - a field changed elsewhere shows in the form;
  - Save keeps it;
  - a late saved-answers load doesn't undo it;
  - `loaded` still turns true.
- **E2E:**
  - the keyboard walk includes a question back;
  - the 320 px checks include the thread with a question back;
  - the copy guard covers the greeting, the question back and both replacement lines;
  - one flow: ask Outdoor activities → answer "Yes" to "Do you exercise outdoors?" → the reply shows the exercise card.

## 6. Left to the builder

- Component split and file names.
- Where the shared map lives.
- Bubble styling within `DESIGN.md` tokens.
- Scrolling the new reply into view.
- The suggestion order map, within §5.3's rule.

## 7. Size

**About a day and a half:**
- the client UI;
- My Profile's form following answers given elsewhere;
- `followUps` on the server;
- the tests;
- updates to the e2e specs that assume the old layout (including `e2e/ask.spec.ts`'s pressed-chip check);
- docs.

There is no database, AI prompt or dependency change. The API change is one added field.
