# Ask AirAware chat redesign (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Ask AirAware feel like a familiar chat: the thread in one calm surface, a multiline question box pinned to the bottom of the screen, and the answer's real source link and limitations. Do it with today's API and the approved copy.

**Architecture:** Client only. `Ask.tsx` changes order and the box: topics, then the thread, then the box. The box becomes an auto-growing `<textarea>` in a form that is `position: sticky` at the bottom when the screen is at least 30.2rem tall (the same threshold as the city, D7). `AskEntry.tsx` drops its per-answer panel, since one shared surface holds the thread, and links Open-Meteo. `PlanCard.tsx` gets an Ask-only flat look.

**Tech Stack:** React 19, Tailwind v4 (tokens in `client/src/index.css`), Vitest + Testing Library + axe (`client/src/test/axe.ts`), Playwright (`e2e/`, desktop + Pixel 7).

**Spec:** `docs/redesign/ASK_CHAT_PHASE1.md` (approved 26 Nov 2026, D-1 to D-8 as recommended). The owner's source spec is `AirAware_Ask_AirAware_Chat_UI_Redesign_Spec.md` at the repo root (untracked; read it, never move or commit it).

## Global Constraints

- Client only. No change to `server/`, `shared/contracts.ts`, `package.json` or any dependency, and no change to rate limits, CSP, headers or the Today `AskBox`.
- **No new copy.** Keep these strings exactly as they are:
  - `ASK_COPY` (label "Ask about your air, home or day", "Send", the intro, the error and thinking lines), the 6 `TOPICS` and the 5 `STARTERS` (first 3 shown, 2 under "More questions", D1);
  - "Why?", "Made with AI" / "Made by our rules";
  - "Based on: {verdict} · Model forecast · Open-Meteo · retrieved {time}" (D4), "Not current", and the server's safety note.
  - The only label reused from elsewhere is Today's approved "Sources and limitations" (`client/src/features/air-quality/SourcesPanel.tsx:17`).
- The question box keeps `maxLength={200}` (server Zod max), `required`, `enterKeyHint="send"`, `autoComplete="off"` and no `name`. Its text is at least 16 px. Every control is at least 44×44 px.
- Colours, radii and spacing come from the existing tokens and classes only.
- Every visible word outside the title block sits on an opaque surface (`e2e/backdrop.spec.ts`, DESIGN.md "Readability").
- Keep the `ask-answer` class on each exchange's `<article>`; many e2e locators use it.
- The box is pinned only `@media (min-height: 30.2rem)`. Below that it sits in the page after the thread, which covers short screens and very large browser text.
- Every `focus()` call this plan touches passes `{ preventScroll: true }`.
- No lint suppressions (`oxlint --type-aware --deny-warnings`). If a rule fires, change the code.
- Data rules (AGENTS.md §5–6): "Model forecast" and "Not current" stay visible and are never inside a collapsed section. No yes/no answers. No invented values.
- e2e runs only the stubbed specs (firstscreen, responsive, keyboard, failures, copy, backdrop, scene, ask, landing). Never `journey`, `pages` or `onboarding`. Never set `E2E_BASE_URL`. Every `/api` request in a new test is stubbed or blocked.
- **Do not commit.** The owner commits. Leave every change in the working tree. Never `git add -A` or `git stash`.

## Review Focus

1. **IME typing (Hindi or Marathi transliteration, Japanese):** Enter that confirms a composed word must not send. Pinned in Task 1 (`Enter while composing sends nothing`).
2. **A reply arriving while the person reads an older answer** must not yank the page; only a new send scrolls. Pinned in Task 2 (`a reply that arrives later does not scroll again`).
3. **A 200-character unbroken string** (a pasted URL) must wrap inside the box at 320 px with no sideways page scroll. Pinned in Task 4 (`AC-07`).
4. **Very large browser text** (Chromium default font 32 px) must unpin the box, so it never covers half the screen. Pinned in Task 4 (`AC-06`).
5. **Typing again after a send, before the failure lands:** the restore must not overwrite the new text. Pinned in Task 1 (`new typing after a failure is never overwritten`).

---

### Task 1: The question box (textarea, keys, empty, restore on error)

**Files:**
- Modify: `client/src/pages/Ask.tsx` (the `<form>` at lines 127–160; the Edit link's `focus()` at line 107)
- Modify: `client/src/index.css` (`touch-action: manipulation` list, about lines 97–104)
- Test: `client/src/pages/Ask.test.tsx`, `client/src/styles.test.ts`

**Interfaces:**
- Consumes: `ask.send(query, echo)`, `ask.thinking`, and `ask.entries`, where each entry has `id`, `status`, and `request: AskRequest | null` (`client/src/features/ask/useAsk.ts:19-42`).
- Produces: the box is a `<textarea>` whose role and name are unchanged (`getByRole('textbox', { name: 'Ask about your air, home or day' })`). Task 2 moves this form.

- [ ] **Step 1: Write the failing tests** in `Ask.test.tsx`. Change the `input()` helper's cast to `HTMLTextAreaElement`, and update or add:

```ts
it('the question box', () => {
  show();
  expect(input().tagName).toBe('TEXTAREA');
  expect(input().rows).toBe(1);
  expect(input().maxLength).toBe(200);
  expect(input().getAttribute('enterkeyhint')).toBe('send');
  expect(input().getAttribute('autocomplete')).toBe('off');
  expect(input().required).toBe(true);
  expect(input().hasAttribute('name')).toBe(false);
  expect(button('Send')).toBeTruthy();
});
it('Send waits for words: disabled when empty or only spaces', () => {
  show();
  expect(button('Send').disabled).toBe(true);
  fireEvent.change(input(), { target: { value: '   ' } });
  expect(button('Send').disabled).toBe(true);
  fireEvent.change(input(), { target: { value: 'Hi' } });
  expect(button('Send').disabled).toBe(false);
});
it('Enter sends; Shift+Enter does not', () => {
  show();
  fireEvent.change(input(), { target: { value: QUESTION } });
  fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true });
  expect(fetchSpy).not.toHaveBeenCalled();
  fireEvent.keyDown(input(), { key: 'Enter' });
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(sentBody(0)).toMatchObject({ question: QUESTION });
});
it('Enter while composing sends nothing', () => {
  show();
  fireEvent.change(input(), { target: { value: QUESTION } });
  fireEvent.keyDown(input(), { key: 'Enter', isComposing: true });
  fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 });
  expect(fetchSpy).not.toHaveBeenCalled();
});
it('Enter while thinking sends nothing and keeps the text', () => {
  show();
  typeAndSend(QUESTION);
  fireEvent.change(input(), { target: { value: 'Second' } });
  fireEvent.keyDown(input(), { key: 'Enter' });
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(input().value).toBe('Second');
});
it('a failed question comes back to the box', async () => {
  show();
  typeAndSend(QUESTION);
  expect(input().value).toBe('');
  await fail();
  expect(input().value).toBe(QUESTION);
});
it('new typing after a failure is never overwritten', async () => {
  show();
  typeAndSend(QUESTION);
  fireEvent.change(input(), { target: { value: 'Other' } });
  await fail();
  expect(input().value).toBe('Other');
});
it('a Try again that works empties the box it refilled', async () => {
  show();
  typeAndSend(QUESTION);
  await fail();
  fireEvent.click(button('Try again'));
  await answer(aiAskFixture);
  expect(input().value).toBe('');
});
it('Edit focuses the page without scrolling', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  render(<div id="main" tabIndex={-1} />);
  show();
  fireEvent.click(screen.getByRole('link', { name: 'Edit your answers in My Profile' }));
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
```

In `a typed question: focus, the status line, then the answer` (line 457), replace `expect(button('Send').disabled).toBe(false)` with: Send disabled (the box is empty), then `fireEvent.change(input(), { target: { value: 'Next' } })`, then Send enabled.

In `styles.test.ts`, pin `textarea` in the `touch-action: manipulation` selector list, the same way the cursor rule is pinned.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -w client -- src/pages/Ask.test.tsx src/styles.test.ts`
Expected: FAIL (tagName INPUT, Send enabled when empty, no Enter handling, box not refilled, `focus()` without options, no `textarea` in the rule).

- [ ] **Step 3: Implement in `Ask.tsx`**
  - **The textarea.** Use `<textarea rows={1} …>` with the same attributes as today. Classes: the existing ones plus `field-sizing-content resize-none overflow-y-auto py-3 max-h-[calc(4lh+1.5rem)]`. It grows to about 4 lines, then scrolls; browsers without `field-sizing` keep one fixed row that scrolls, which is the accepted fallback. Never use `overflow-hidden`: the e2e `clippedText` helper flags it. Change the row to `items-end` so Send stays beside the last line.
  - **Send.** Set `disabled={ask.thinking || !question.trim()}`.
  - **`onKeyDown`.** Ignore anything other than Enter without Shift. Otherwise call `preventDefault()`. Return if `event.nativeEvent.isComposing || event.keyCode === 229`. Otherwise, if not thinking and the text is not blank, call `event.currentTarget.form?.requestSubmit()`. If lint flags `keyCode` as deprecated, use the `compositionend` `event.timeStamp` 50 ms window from the `ime-safe-enter-submit` guide instead.
  - **Restore on error.** Remember the text of the last send from this box. When the newest entry turns `error` and its `request` is `{ question: that text }`, put the text back only if the box is empty. When that entry later turns `ready` and the box still holds exactly that text, empty the box. Use React's "adjust state while rendering" pattern if lint rejects `setState` inside an effect.
  - **Edit link.** Line 107 becomes `focus({ preventScroll: true })`.

In `index.css`, add `textarea` to the `touch-action: manipulation` list.

- [ ] **Step 4: Run them and watch them pass**

Run: `npm test -w client -- src/pages/Ask.test.tsx src/styles.test.ts`
Expected: PASS (all, including the untouched Ask tests).

---

### Task 2: Chat layout (topics, thread in one surface, pinned box last)

**Files:**
- Modify: `client/src/pages/Ask.tsx` (the order inside the `place` branch, about lines 126–197)
- Modify: `client/src/features/ask/AskEntry.tsx` (the panel at line 228; `focus()` at lines 202 and 247)
- Modify: `client/src/features/daily-plan/PlanCard.tsx` (new `flat` prop)
- Modify: `client/src/index.css` (scroll padding under the pinned box)
- Test: `client/src/pages/Ask.test.tsx`, `client/src/features/ask/AskEntry.test.tsx`, `client/src/features/daily-plan/PlanCard.test.tsx`, `client/src/styles.test.ts`

**Interfaces:**
- Consumes: Task 1's form, unchanged inside.
- Produces:
  - `PlanCard` gains `flat?: boolean` (default `false`). When true, the article is `flex flex-col gap-2 border-t border-rule pt-3`, with no rounded box and no `p-4`.
  - The composer form gains `data-part="ask-composer"`.
  - The thread surface is `<div data-part="ask-thread">`, rendered only when there are entries.

- [ ] **Step 1: Write the failing tests**

In `Ask.test.tsx`, rename and reorder the order test (line 229), and update the thread-order test:

```ts
it('with a place: title, intro, Using line, topics, 3 starters, More questions, thread, then the question box', async () => {
  // order: h1, intro, using, button('Outdoor activities'),
  // button('Can I go for a morning walk today?'), button('How can I improve my indoor air?'),
  // moreQuestions summary, heading('First question'), input()  (keep the greeting and axe checks)
});
it('the thread reads oldest first, before the question box', async () => {
  // First then Second; before(heading('Second question'), input()) is true
});
it('one surface holds the whole thread, and none shows before the first question', async () => {
  const { container } = show();
  expect(container.querySelector('[data-part="ask-thread"]')).toBeNull();
  typeAndSend('First question'); await answer(aiAskFixture);
  typeAndSend('Second question'); await answer(aiAskFixture);
  const thread = container.querySelector('[data-part="ask-thread"]')!;
  expect(thread.className).toContain('bg-surface-light');
  expect(thread.querySelectorAll('article.ask-answer')).toHaveLength(2);
});
it('the question box pins to the bottom only on screens 30.2rem tall or more', () => {
  show();
  const form = input().closest('form')!;
  expect(form.dataset.part).toBe('ask-composer');
  expect(form.className).toContain('[@media(min-height:30.2rem)]:sticky');
  expect(form.className).toContain('bg-surface-light');
});
it('a reply that arrives later does not scroll again', async () => {
  show();
  typeAndSend(QUESTION);
  const calls = (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length;
  await answer(aiAskFixture);
  expect((Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
});
```

In `AskEntry.test.tsx`:
- `an answer has no panel of its own`: the article's reply wrapper has no `rounded-lg`, `border` or `p-5`.
- `its cards are flat`: each card article has `border-t` and no `rounded-lg`.
- `Skip and Try again move focus without scrolling`: spy on `HTMLElement.prototype.focus`, trigger Skip and then Try again, and expect `{ preventScroll: true }` on both calls.

In `PlanCard.test.tsx`: `a flat card drops its box`, with `flat` → `border-t`, no `rounded-lg`, no `p-4`; without it, as today.

In `styles.test.ts`, pin this rule:

```css
@media (min-height: 30.2rem) {
  html:has([data-part='ask-composer']) {
    scroll-padding-bottom: calc(12rem + env(safe-area-inset-bottom, 0px));
  }
}
@media (min-height: 30.2rem) and (width < 48rem) {
  html:has([data-part='ask-composer']) {
    scroll-padding-bottom: calc(16rem + env(safe-area-inset-bottom, 0px));
  }
}
```

The numbers: the tallest box (4 lines plus label and padding, about 11.5rem) plus the 3.5rem phone bar and a gap. Task 4 measures it, and these values change if the measurement says so.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -w client -- src/pages/Ask.test.tsx src/features/ask/AskEntry.test.tsx src/features/daily-plan/PlanCard.test.tsx src/styles.test.ts`
Expected: FAIL (old order, no thread surface, no `data-part`, panel classes, no `flat`, `focus()` without options, no CSS rule). `a reply that arrives later does not scroll again` pins today's behaviour (the focus effect runs once per new exchange), so it may already pass. It is a regression pin for Review Focus 2, not a red test.

- [ ] **Step 3: Implement**
  - **`Ask.tsx`, inside the `place` branch.** The order is: the topics-and-starters panel (unchanged), then `<div data-part="ask-thread">` (only when `ask.entries.length > 0`), then the form.
  - **The thread surface.** Classes: `flex flex-col gap-6 rounded-lg border border-rule bg-surface-light p-5 sm:p-6 [&>article+article]:border-t [&>article+article]:border-rule [&>article+article]:pt-6`, so each exchange after the first gets a top rule with no prop.
  - **The form.** Add `data-part="ask-composer"` and these classes: `z-[1] [@media(min-height:30.2rem)]:sticky [@media(min-height:30.2rem)]:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:[@media(min-height:30.2rem)]:bottom-4`. Keep its opaque `bg-surface-light` panel and add `shadow-sm`. The 4rem is the 3.5rem bar plus a 0.5rem gap. Sticky (not fixed) keeps it in the flow, so at the page end it rests after the thread and the footer is never covered.
  - **`AskEntry.tsx` line 228.** The reply wrapper becomes `flex flex-col gap-3` (drop `rounded-lg border border-rule bg-surface-light p-5 sm:p-6`). The cards grid (line 134) becomes `flex flex-col gap-3`, and each card gets `flat`. Lines 202 and 247 become `focus({ preventScroll: true })`.
  - **`PlanCard.tsx`.** Add `flat`.
  - **`index.css`.** Add the rule above inside `@layer base`, next to the existing scroll-padding rule.

- [ ] **Step 4: Run them and watch them pass**

Run: `npm test -w client`
Expected: PASS (whole client suite; Today, My Home and Landing PlanCards unchanged).

---

### Task 3: Source link and "Sources and limitations" on each answer

**Files:**
- Modify: `client/src/features/ask/AskEntry.tsx` (`airLine` at lines 82–89; its use in `Answer` at lines 118 and 131)
- Test: `client/src/features/ask/AskEntry.test.tsx`

**Interfaces:**
- Consumes: `answer.forecast` (`provider`, `sourceUrl`, `retrievedAt`, `limitations: string[]`, or `null`).
- Produces: `function AirLine({ answer }: { answer: AskAnswer }): JSX.Element` replaces the string `airLine`. Its text content is the same string as today.

- [ ] **Step 1: Write the failing tests** in `AskEntry.test.tsx`:

```ts
it('Open-Meteo links to the answer\'s source, and the line reads as before', () => {
  // render a ready aiAskFixture entry
  const link = screen.getByRole('link', { name: 'Open-Meteo' });
  expect(link.getAttribute('href')).toBe(aiAskFixture.forecast!.sourceUrl);
  expect(screen.getByText(/^Based on: /).textContent).toBe(
    `Based on: ${verdictFrom(aiAskFixture.air).title} · Model forecast · Open-Meteo · retrieved ${clockTime(aiAskFixture.forecast!.retrievedAt)}`,
  );
});
it('"Sources and limitations" starts closed and lists the forecast\'s limitations', () => {
  const summary = screen.getByText('Sources and limitations');
  expect(summary.tagName).toBe('SUMMARY');
  expect(summary.closest('details')!.open).toBe(false);
  for (const line of aiAskFixture.forecast!.limitations)
    expect(screen.getByText(line)).toBeTruthy();
});
it('with no forecast: the verdict alone, no link, no sources section', () => {
  // render { ...aiAskFixture, forecast: null }
  expect(screen.queryByRole('link', { name: 'Open-Meteo' })).toBeNull();
  expect(screen.queryByText('Sources and limitations')).toBeNull();
});
it('the medical reply\'s "Today:" line links Open-Meteo too', () => { /* medicalAskFixture */ });
it('"Not current" stays outside "Sources and limitations"', () => {
  // stale entry: StaleBanner text not inside any <details>
});
```

Also run `expectNoAxeViolations` on the rendered answer. Once "Open-Meteo" is a link, Testing Library's `getByText` sees only an element's own text nodes. So any existing test in `AskEntry.test.tsx` or `Ask.test.tsx` that matches the whole "Based on: …" or "Today: …" string with `getByText` must find the element by its start (`/^Based on: /`) and compare `textContent`. Playwright's `getByText` reads descendants and needs no change.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -w client -- src/features/ask/AskEntry.test.tsx`
Expected: FAIL (no link, no details).

- [ ] **Step 3: Implement `AirLine`** with the same text as today, rendering "Open-Meteo" as `<a href={answer.forecast.sourceUrl} className="underline">`. Directly under the "Based on" line (topic answers only), add `<details>` with `<summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Sources and limitations</summary>` and a `<ul>` of `answer.forecast.limitations`. Render it only when `answer.forecast` is set. `StaleBanner`, the caveat and "Made with AI / by our rules" stay where they are, outside the details.

- [ ] **Step 4: Run them and watch them pass**

Run: `npm test -w client -- src/features/ask/AskEntry.test.tsx`
Expected: PASS.

---

### Task 4: e2e gates (AK-04 rewritten, new pinned-box checks)

**Files:**
- Modify: `e2e/firstscreen.spec.ts` (the Ask section, lines 599–780; the helpers `ask()`, `questionInput()`, `barTop()`, `bottomOf()`, and the CDP large-text pattern used by `openBar` in the same file)
- Test: the same file. No new spec file.

**Interfaces:**
- Consumes: `[data-part="ask-composer"]`, `[data-part="ask-thread"]`, `article.ask-answer`, the textbox name.
- Produces: new tests `AC-01` to `AC-08` and an updated AK-04. Everything else is unchanged.

- [ ] **Step 1: Write the tests.** Each one uses the existing `ask()` helper (every `/api` request stubbed). At 320×640, 390×844, 768×1024 and 1280×720 unless a test says otherwise:
  - **AK-04/05 (change):** `limit` becomes the smaller of the old limit and the composer's top when it is pinned (`getComputedStyle(form).position === 'sticky'`). The other assertions stay.
  - **AC-01:** the box is inside the screen, with its bottom at or above `barTop` on phones and at or above the height on desktop, and its top above 0. Its computed position is `sticky` at every size.
  - **AC-02:** after a starter answer, focus the heading, then press Tab up to 15 times. While a focused element is inside `[data-part="ask-thread"]`, its top is above the composer's top (WCAG 2.4.11).
  - **AC-03:** fill 200 characters of `'word '`. The box's height is more than 48 and at most its computed `max-height`; `scrollHeight > clientHeight`; computed `overflow-y` is `auto`. Log the tallest height; Task 2's padding must be at least that plus the bar.
  - **AC-04:** count POSTs to `/api/v1/assistant/answer`. Enter on an empty box: 0. Text plus Shift+Enter: 0, and the value contains `\n`. Enter: 1.
  - **AC-05:** a double click on Send makes exactly 1 POST.
  - **AC-06 (390×844, 1280×720):** with Chromium's default font at 32 px (CDP `Page.setFontSizes`, as `openBar` does), the form's computed position is `static`, and the page is not wider than the screen.
  - **AC-07 (320×640):** fill `'a'.repeat(200)`; the page is not wider than the screen, using the existing overflow helper.
  - **AC-08 (keyboard emulation, 390×480):** focus the box; it is fully inside the viewport. Log that this is emulation, not a real keyboard.

- [ ] **Step 2: Build and run the changed spec** (the webServer builds the client)

Run: `npx playwright test --config e2e/playwright.config.ts firstscreen.spec.ts`
Expected: PASS, desktop and phone. If AC-02 or AC-03 shows the padding is short, raise the Task 2 values and their `styles.test.ts` pin together.

- [ ] **Step 3: Run the nine stubbed specs**

Run (background, about 10–15 minutes): `npx playwright test --config e2e/playwright.config.ts firstscreen responsive keyboard failures copy backdrop scene ask landing`
Expected: 0 failed. Read every failure; fix the cause, never the assertion, unless the assertion pins the old order (AK-02) or the old box.

---

### Task 5: Docs, rulings, full gate and review

**Files:**
- Modify: `docs/redesign/OWNER_DECISIONS.md`. Add a section "J. Ask chat (26 Nov 2026)" with J1–J8 = D-1 to D-8 as approved, each naming what it replaces (AK-02 order, AK-04 limit, DESIGN.md "each answer is a solid panel").
- Modify: `docs/redesign/REDESIGN_ACCEPTANCE_CRITERIA.md`. New AK-02 order: H1, intro, Using line, chips, starters, thread, question box. New AK-04: the answer's first line starts above the pinned box. Add AC-01 to AC-08.
- Modify: `DESIGN.md` (the Ask page, the AskEntry and PlanCard lines, responsive guards), `ACCESSIBILITY.md` (a new "Ask chat (2026-11-26)" section: textarea and keys, IME, pinned box and scroll padding, 30.2rem unpinning, what needs a real phone), `CHANGELOG.md` (an entry under Changed), and `docs/redesign/ASK_CHAT_PHASE1.md` (status: built, pointing to this plan).

- [ ] **Step 1: Write the docs.** Use plain words and real numbers from the Task 4 logs.
- [ ] **Step 2: Run the full gate**

Run: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
Expected: all pass. Record server and client test counts and the script size.

- [ ] **Step 3: Independent review.** Use the `security-reviewer` agent (Opus) on the working-tree diff, covering:
  - data labels: "Model forecast" and "Not current" visible and never collapsed;
  - the IME guard and duplicate sends;
  - focus and scroll;
  - the pinned box covering content;
  - no new copy, and no server or contract change.

  Fix Critical and Important findings test-first, then re-run the gate.
- [ ] **Step 4: Before-and-after screenshots.** Re-run `C:\Users\Ashutosh\AppData\Local\Temp\claude\04831a48b8c01fbf\8aba605c-f22e-47de-9791-a4b5ffa9abb5\scratchpad\ask-phase1\capture.mjs` (stubs everything; the web dev server is on 5174) into a new `shots-after` folder, and compare with `shots/`.
- [ ] **Step 5: Stop.** Report the changed files, every gate result, and what needs the owner's phone (typing with the keyboard open on Android and iOS, sending, scrolling back). Do not commit; the owner decides.
