# Ask AirAware guided chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ask AirAware becomes a guided chat. It greets you, keeps the conversation oldest-first, asks one question back when your answer would change today's cards, and suggests what to ask next. Answers given in the chat count everywhere.

**Architecture:**
- **Server:** it adds `followUps` to every Ask answer, computed from the rules only, with no AI call.
- **Client:**
  - `useAsk` becomes a thread: oldest first, with local "Noted" replies, answering and skipping a question back, and writing answers to the shell's household context;
  - `Ask.tsx` and `AskEntry.tsx` render the greeting, the bubbles, the question back and the suggestions;
  - My Profile's form follows the shell's answers.
- **What stays unchanged:** the AI input, the typed question's path and the request shape.

**Tech Stack:** TypeScript strict, React 19, Vite 8, Tailwind v4, Express 5, Zod 4, Vitest + Testing Library + jsdom, Playwright, oxlint, Prettier.

**Spec:** `docs/superpowers/specs/2026-11-21-ask-guided-chat-design.md` (approved 21 Nov 2026).

## Global Constraints

**What the AI and the server see:**
- The AI never reads typed text. `toWriterInput(air, candidates)` stays the only AI input, and a typed question still only picks a topic in `classify`. *Amended (28 Nov): a typed question now reaches the Ask writer, Claude (J26, ADR-008).*
- No logging, storing or caching of questions, conversation or household answers.

**Wording and labels:**
- Data rules: keep "Model forecast", "Not current", the "Based on: … · Model forecast · updated …" line, the cards with "Why?" and the safety note exactly as they are.
- Never "safe", "healthy", "clean air", "good air", "bad air", or "AQI" (except the existing approved disclaimers). No yes or no on safety. No invented number.
- Exact new copy (`ASK_COPY` keys in `client/src/features/ask/ask.ts`):
  - `greetingTail`: "I'm AirAware. Ask me about your day, your home or your commute." (shown after `greeting(now)` + ". ")
  - `followUpIntro`: "One question so I can be more specific:"
  - `followUpNote`: "This changes your answers for this visit. To keep them, save in My Profile."
  - `skip`: "Skip"
  - `answeredLine(label)`: "You answered: {label}."
  - `skipped`: "Skipped. You can answer it in My Profile any time."
  - `noted`: "Noted. That doesn't change today's advice."
  - `alsoAsk`: "You could also ask:"
  - visually hidden heading prefixes: "You asked: " and "You answered: "
- `householdNeeds.mayBeMoreSensitive` is never a question back.

**Limits:**
- At most 10 exchanges per thread, the oldest dropped first. The greeting is not an exchange and is never dropped.
- Every request is one hit on the shared 10-a-minute plan limit, so no request is sent for an answer that changes nothing.

**Accessibility and layout:**
- WCAG 2.2 AA, 44 px targets (`min-h-11`), one live region, focus to the new reply's heading.
- Colours only from `DESIGN.md` tokens. Motion only under `motion-safe`.

**Process:**
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- One branch (`main`), and no push without the owner's yes.

## Review Focus

1. **A fast double tap:** an answer button is tapped twice, or "Send" is pressed while a re-ask is still thinking. Expected: one request, one new exchange (`thinking` disables everything). *Pinned in Task 3.*
2. **A late saved-answers load:** the load arrives after an answer given in the chat. Expected: the chat answer stays, and Today's plan becomes able to build (`loaded` turns true). *Pinned in Task 2.*
3. **A new place mid-thread:** the place changes while a question back is waiting. Expected: the thread and skips empty, and an old reply never lands. *Pinned in Task 3.*
4. **The same question answered in My Profile** while it waits in Ask. Expected: the question back disappears without a reload. *Pinned in Task 4.*
5. **Unknown air** (provider down). Expected: `followUps` computed against unknown air offers only questions whose answers change cards without air (for example `home.kitchenExhaust`). Nothing above-limit-only is offered. *Pinned in Task 1.*

---

### Task 1: The server offers follow-ups

**Files:**
- Modify: `shared/contracts.ts` (add `FollowUp`; `AskAnswer.followUps`).
- Modify: `server/src/services/recommendations/ask.ts` (add `FOLLOW_UPS`, `FIELD_VALUES`, `withAnswer`, `followUpsFor`; set `followUps` in `createAsker`).
- Modify: `client/src/test/askFixtures.ts` (`followUps: []` on every fixture).
- Modify: `API.md` (document `followUps` on the answer).
- Test: `server/src/services/recommendations/ask.test.ts`.

**Interfaces:**
- Produces, in `shared/contracts.ts`:
  ```ts
  export interface FollowUp { field: string; changes: string[] }
  ```
  - `field` is a My Profile field id such as `'routine.outdoorExercise'`.
  - `changes` holds answer strings as My Profile uses them: `'yes'`/`'no'` for a yes/no field, else the option value.
- Produces: `AskAnswer` gains `followUps: FollowUp[]`, which is `[]` for medical and out of scope.
- Produces in `ask.ts`:
  - `FOLLOW_UPS: Record<AskTopic, readonly string[]>`, the table in spec §5.2 (Windows: `home.nearBusyRoad`, `home.kitchenExhaust`).
  - `FIELD_VALUES: Record<string, readonly string[] | 'boolean'>`, the answer values for every field in `FOLLOW_UPS`.
  - `withAnswer(context: HouseholdContext, field: string, value: string): HouseholdContext`. For a `'boolean'` field, `'yes'` becomes `true` and `'no'` becomes `false`.
  - `followUpsFor(topic: AskTopic, context: HouseholdContext, air: AirAssessment): FollowUp[]`, in `FOLLOW_UPS` order:
    - fields already answered in `context` are skipped;
    - a value counts as a change when `chooseCards(topic, buildCandidates(next, air), next)` ids differ from those for `context`;
    - entries with no changes are dropped.

- [ ] **Step 1: Write the failing tests** in `ask.test.ts` (use the file's `air(level)` helper, plus an unknown-level `AirAssessment` like `rules.test.ts`'s `unknown`). Each `it` is named below.

  `'every follow-up can change its topic's cards from no answers'`: for every `[topic, fields]` of `FOLLOW_UPS` and every field, some air level (`elevated` or `not_elevated`) gives a `followUpsFor(topic, {}, air)` entry for that field.

  `'children and older adults are offered only above the limit'`:
  ```ts
  const fields = (a: AirAssessment) => followUpsFor('family', {}, a).map((f) => f.field);
  expect(fields(air('elevated'))).toEqual(expect.arrayContaining(['householdNeeds.includesChildren', 'householdNeeds.includesOlderAdults']));
  expect(fields(air('not_elevated'))).not.toContain('householdNeeds.includesChildren');
  ```

  `'a kitchen without an exhaust changes Indoor air'`: the `home.kitchenExhaust` entry of `followUpsFor('indoor', {}, air('not_elevated'))` has `changes` containing `'no'`.

  `'a rule hidden by the three-card cap is not a change'`: `followUpsFor('indoor', { home: { cookingFuel: 'biomass', kitchenExhaust: true, airPurifier: true } }, air('elevated'))` has no `home.nearBusyRoad` entry. If the cards for that context are not three before busy road, rule on another full-cap context and record it.

  `'answered questions are left out'`: `followUpsFor('outdoors', { routine: { outdoorExercise: true } }, air('elevated'))` has no `routine.outdoorExercise` entry.

  `'unknown air offers only questions that change cards without air'`: `followUpsFor('family', {}, unknownAir)` is `[]`, and `followUpsFor('indoor', {}, unknownAir)` includes `home.kitchenExhaust`.

  `'follow-up values are My Profile's options and valid answers'`:
  - import `FIELDS, fieldId` from `../../../../client/src/features/daily-plan/householdFields.ts`;
  - every `FOLLOW_UPS` field exists in `FIELDS`;
  - `FIELD_VALUES[id]` equals the field's option values, or is `'boolean'` exactly when the field has no options;
  - `householdContextSchema.parse(withAnswer({}, id, v))` succeeds for every value;
  - no topic lists `householdNeeds.mayBeMoreSensitive`.

  `'medical and out-of-scope answers offer no follow-ups'`: `createAsker` answers for `'medical'` and `'out_of_scope'` have `followUps: []`.

  `'a topic answer carries its follow-ups'`: a `createAsker` answer for `'outdoors'` with `{}` context on an elevated forecast has a `followUps` entry for `routine.outdoorExercise` whose `changes` include `'yes'`.

- [ ] **Step 2: Run the tests to see them fail.**
  - Run: `npx vitest run --root server src/services/recommendations/ask.test.ts`
  - Expected: FAIL (`followUpsFor` / `FOLLOW_UPS` not exported; `followUps` undefined).

- [ ] **Step 3: Implement** the exports above in `ask.ts`, add `followUps` to `createAsker`'s return (`answered ? followUpsFor(topic, householdContext, air) : []`), and add `FollowUp` and `followUps` to `shared/contracts.ts`. Then:
  - add `followUps: []` to every fixture in `client/src/test/askFixtures.ts`;
  - document `followUps` in `API.md`'s Ask answer section.

- [ ] **Step 4: Run the server suite and typecheck.**
  - Run: `npm test -w server && npm run typecheck`
  - Expected: PASS, with the new tests green.

- [ ] **Step 5: Commit.** Message: `feat(ask): the server offers follow-up questions that change today's cards`.

---

### Task 2: My Profile's form follows the answers on screen

**Files:**
- Modify: `client/src/features/daily-plan/HouseholdPreferencesForm.tsx`.
- Test: `client/src/features/daily-plan/HouseholdPreferencesForm.test.tsx`.

**Interfaces:**
- Consumes: the existing props (`initial`, `onChange`, `onLoaded`, `skipLoad`).
- Produces: after mount, any field answered in `initial` whose value differs from the form's answer is taken into the form's answers and into `answersRef`, so the late-load merge keeps it. This does **not** call `onChange`. A field the form has but `initial` lacks is kept. There is no new prop and no `formKey` change.

- [ ] **Step 1: Write the failing tests:**
  - `'an answer given elsewhere shows in the form'`: render with `initial={{}}`, then rerender with `initial={{ routine: { outdoorExercise: true } }}`. The "Do you exercise outdoors?" control shows Yes.
  - `'Save keeps an answer given elsewhere'`: same rerender, then Save. `savePreferences` is called with a context containing `routine: { outdoorExercise: true }`.
  - `'a late saved-answers load does not undo an answer given elsewhere'`:
    - `getPreferences` resolves *after* the rerender, with `{ context: { routine: { outdoorExercise: false, commuteMode: 'car' } } }`;
    - the form shows exercise Yes and commute Car;
    - `onChange`'s last call has `outdoorExercise: true, commuteMode: 'car'`;
    - `onLoaded` was called once.
  - `'a change from the form itself is not echoed back'`: change a field in the form. `onChange` is called once with it, and the rerender with that same context leaves the form unchanged (no second `onChange`).

- [ ] **Step 2: Run them to see them fail.**
  - Run: `npx vitest run --root client src/features/daily-plan/HouseholdPreferencesForm.test.tsx`
  - Expected: the first three FAIL (the form ignores the new `initial`).

- [ ] **Step 3: Implement** an effect on `initial`. It compares each answered field in `toAnswers(initial)` with `answersRef.current`, and if any differ it updates `answersRef.current` and the state (not `onChange`).

- [ ] **Step 4: Run the client suite.**
  - Run: `npm test -w client`
  - Expected: PASS.

- [ ] **Step 5: Commit.** Message: `feat(profile): the form follows answers given elsewhere in the app`.

---

### Task 3: `useAsk` becomes a thread with questions back

**Files:**
- Modify: `client/src/features/ask/useAsk.ts`, `client/src/features/ask/ask.ts`.
- Modify: `client/src/pages/AppShell.tsx` (only the `useAsk` call: pass `setContext`).
- Test: `client/src/features/ask/useAsk.test.ts`, `client/src/features/ask/ask.test.ts`.

**Interfaces:**
- Consumes: `FollowUp` and `AskAnswer.followUps` (Task 1).
- Produces in `useAsk.ts`:
  ```ts
  export interface AskEntry {
    id: number;
    echo: string;
    said: 'asked' | 'answered';
    request: AskRequest | null;          // null: a local reply, nothing sent
    status: 'thinking' | 'ready' | 'error';
    answer?: AskAnswer;
    error?: ApiError;
    note?: string;                        // a local reply's text (ASK_COPY.noted)
    followUp?: { field: string; outcome: 'answered' | 'skipped'; label?: string };
  }
  export function useAsk(place: Place | null, context: HouseholdContext, resets: number,
    onContextChange: (next: HouseholdContext) => void): {
    entries: AskEntry[];                  // oldest first
    thinking: boolean;
    skipped: ReadonlySet<string>;
    send: (query: AskQuery, echo: string) => void;
    retry: (id: number) => void;
    answerFollowUp: (entryId: number, field: string, value: string, label: string) => void;
    skipFollowUp: (entryId: number, field: string) => void;
  };
  ```
- Produces in `ask.ts`:
  - the `ASK_COPY` keys listed in Global Constraints.
  - `suggestionsFor(topic: AskTopic): typeof STARTERS`, using this order of starter topics:
    - outdoors → commuting, family, windows
    - windows → indoor, outdoors
    - indoor → windows, family
    - family → outdoors, commuting
    - commuting → outdoors, family
    - habits → commuting, indoor
  - `export interface PendingFollowUp { entryId: number; field: HouseholdField; changes: string[] }`.
  - `pendingFollowUp(entries: AskEntry[], context: HouseholdContext, skipped: ReadonlySet<string>): PendingFollowUp | null`:
    - it looks only at the **last** entry, and only when that entry is `ready`, has a topic answer (not medical or out of scope) and has no `followUp` outcome;
    - it picks the first `answer.followUps` item whose field is unanswered in `toAnswers(context)`, is not in `skipped`, and exists in `FIELDS`.

- [ ] **Step 1: Write the failing tests:**
  - `ask.test.ts`:
    - `'suggestions follow the topic map and never repeat the topic'`: exact question lists for `outdoors` and `habits`.
    - `'a question back comes only from the newest topic answer'`:
      - the last entry with `followUps` for `routine.outdoorExercise` gives that field;
      - the same entry followed by a newer entry gives `null` for the older one;
      - a medical last entry gives `null`;
      - a skipped field moves to the next item;
      - a field answered in `context` moves to the next item;
      - an unknown field id is ignored.
  - `useAsk.test.ts`:
    - `'the thread is oldest first and keeps the newest 10'`;
    - `'an answer that changes the cards sets the field and asks the topic again'`:
      - `onContextChange` gets `routine: { outdoorExercise: true }`;
      - one POST with `topic: 'outdoors'` and that context;
      - a new entry with echo `'Yes'`, `said: 'answered'`;
      - the offering entry gets `followUp: { field, outcome: 'answered', label: 'Yes' }`.
    - `'an answer that changes nothing sets the field and sends nothing'`: no POST, and a `ready` entry with `note: ASK_COPY.noted`.
    - `'Skip sends nothing and is remembered for the visit'`;
    - `'while thinking, a second answer or send is ignored'` (Review Focus 1);
    - `'a new place empties the thread and the skips'` (Review Focus 3, extending the existing reset test).
  - Update the existing `useAsk` tests that assume newest-first.

- [ ] **Step 2: Run them to see them fail.**
  - Run: `npx vitest run --root client src/features/ask`
  - Expected: FAIL (missing exports and newest-first order).

- [ ] **Step 3: Implement** as specified. Build each request with an explicit context, so the re-ask after an answer carries the new answer, not the render-time `context`. Then:
  - compute the next context with `toContext({ ...toAnswers(context), [field]: value })`;
  - in `AppShell.tsx`, call `useAsk(place, context, resets, setContext)`.

- [ ] **Step 4: Run the client suite and typecheck.**
  - Run: `npm test -w client && npm run typecheck`
  - Expected: PASS. If `Ask.tsx` fails to compile against the new entry order, adjust only `latest` in this task (`entries.at(-1)`); the UI comes in Task 4.

- [ ] **Step 5: Commit.** Message: `feat(ask): a conversation thread with questions back and local replies`.

---

### Task 4: The chat on screen

**Files:**
- Modify: `client/src/pages/Ask.tsx`, `client/src/features/ask/AskEntry.tsx`.
- Test: `client/src/pages/Ask.test.tsx`, `client/src/features/ask/AskEntry.test.tsx`, `client/src/pages/AppShell.test.tsx`.

**Interfaces:**
- Consumes: the Task 3 hook and helpers, and `greeting(now)` from `features/today/today.ts`.
- Produces:
  - `TopicChips({ busy, onTopic })`: the `pressed` prop and the tick are removed.
  - `AskEntry` gains these props:
    - `pending: PendingFollowUp | null`
    - `onAnswerFollowUp(field: string, value: string, label: string)`
    - `onSkipFollowUp(field: string)`
    - `onStarter(question: string)`

**What the screen shows (spec §5.1–5.5):**
- **Top to bottom:** the title block (unchanged "Using:" line), the greeting, the entries oldest first, then the question form.
- **The greeting** (no heading) holds:
  - `${greeting(now)}. ${ASK_COPY.greetingTail}`;
  - `TopicChips`;
  - every starter as a button.
- **Your message:** a bubble on the end side holding `<h2>` with a visually hidden "You asked: " or "You answered: " and the echo. The h2 keeps today's focus behaviour.
- **AirAware's reply:** a bubble on the start side. It holds the existing answer content, or the note. For a topic answer it then adds, in order:
  - **the question back, while `pending` is this entry:**
    - a `role="group"` labelled by the question's label, with `followUpIntro` before it;
    - one button per option (yes/no: Yes, No), then Skip;
    - `followUpNote` under it;
  - **or the outcome line:** `answeredLine(label)` or `skipped`. After Skip, focus moves to that line;
  - **"You could also ask:"** with `suggestionsFor(topic)` as buttons.
- **The status line** reads the last entry. A note entry announces its note.

- [ ] **Step 1: Write the failing tests:**
  - `Ask.test.tsx`:
    - `'opens with a greeting that holds the topics and starters'`;
    - `'the thread reads oldest first, then the question box'` (DOM order);
    - `'a question back offers the field's own options and Skip'` (the "Do you exercise outdoors?" group with Yes, No, Skip and the note);
    - `'answering shows "You answered: Yes." and a new reply at the end'`;
    - `'Skip shows the skipped line and takes focus'`;
    - `'suggestions follow a topic answer'`;
    - axe (`expectNoAxeViolations`) on the greeting, a question back and an outcome.
  - `AppShell.test.tsx`:
    - `'an answer given in Ask reaches My Profile and Today's plan'`: answer Yes in Ask. My Profile's control shows Yes, and the next daily-plan POST carries `routine: { outdoorExercise: true }`.
    - `'a question back disappears once My Profile answers it'` (Review Focus 4).
  - Update the existing tests that assume the top panel, newest-first order, `aria-pressed`, or the old heading names.

- [ ] **Step 2: Run them to see them fail.**
  - Run: `npx vitest run --root client src/pages/Ask.test.tsx src/features/ask src/pages/AppShell.test.tsx`
  - Expected: FAIL.

- [ ] **Step 3: Implement** the layout above. Bubble styling and scrolling are the builder's choice within `DESIGN.md` tokens (spec §6).

- [ ] **Step 4: Run the client suite, typecheck and lint, and look at the screen.**
  - Run: `npm test -w client && npm run typecheck && npm run lint`
  - Expected: PASS.
  - Look at `/app/ask` in the built-in browser at 320 and 1280 with a question back showing, and take a screenshot.

- [ ] **Step 5: Commit.** Message: `feat(ask): the guided chat on screen`.

---

### Task 5: End-to-end, copy and docs

**Files:**
- Modify: `e2e/ask.spec.ts`, `e2e/copy.spec.ts`, `e2e/responsive.spec.ts`, `e2e/keyboard.spec.ts` (only where it assumes the old Ask layout).
- Modify: `CHANGELOG.md`, `docs/superpowers/specs/2026-11-20-assistant-redesign-design.md` §7.4 (an *Amended* note pointing to the new spec).
- Test: the files above.

**Interfaces:**
- Consumes: `aiAskFixture` with `followUps: [{ field: 'routine.outdoorExercise', changes: ['yes'] }]` for the stubbed answer (spread it in the spec, not in the fixture file).

- [ ] **Step 1: Write or adjust the e2e tests:**
  - `ask.spec.ts`:
    - `'a question back, answered, asks again with the answer'`:
      - stub an answer offering exercise;
      - tap Yes;
      - the second POST carries `householdContext.routine.outdoorExercise === true`;
      - "You answered: Yes." shows;
      - axe passes.
    - `'an answer that changes nothing sends no request'`: `changes: ['yes']`, tap No. "Noted. That doesn't change today's advice." shows, and there is no second POST.
    - Replace the `aria-pressed` check.
  - `copy.spec.ts`: add the greeting, a question back, "You answered", "Skipped" and "Noted" states to the Ask cases.
  - `responsive.spec.ts`: the 320 "other states" include the thread with a question back (`pastTheEdge`, `clippedText`, `smallTargets` clean).
  - `keyboard.spec.ts`: the Ask walk reaches Yes, No and Skip in visual order, with a ring on each.

- [ ] **Step 2: Run the e2e suite.**
  - Run: check port 8090 is free, then `npm run e2e`
  - Expected: all pass (the previous count plus the new tests); skipped only for the desktop-only size runs.

- [ ] **Step 3: Update the docs.**
  - `CHANGELOG.md`: a "Guided chat (Ask AirAware)" entry.
  - The redesign spec §7.4: *Amended (21 Nov): see `2026-11-21-ask-guided-chat-design.md`.*

- [ ] **Step 4: Run the full gate.**
  - Run: `npm test -w server; npm test -w client; npm run typecheck; npm run lint; npm run format:check; npm run build; npm run e2e`, with each step's exit code printed.
  - Expected: every step exits 0.

- [ ] **Step 5: Commit.** Message: `test(e2e): the guided chat; docs`.
