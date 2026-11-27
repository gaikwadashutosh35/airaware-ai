import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AskAnswer, HouseholdContext } from '../../../shared/contracts.ts';
import { ASK_COPY } from '../features/ask/ask.ts';
import { useAsk } from '../features/ask/useAsk.ts';
import { NEAR_YOU, type Place } from '../features/location/place.ts';
import { greeting } from '../features/today/today.ts';
import {
  aiAskFixture,
  medicalAskFixture,
  rulesAskFixture,
} from '../test/askFixtures.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import { Ask } from './Ask.tsx';

const pune: Place = {
  label: 'Pune, Maharashtra',
  latitude: 18.52,
  longitude: 73.86,
};
const UPDATED_AT = '2026-11-17T17:05:00.000Z';
const UPDATED = new Date(UPDATED_AT).toLocaleTimeString([], {
  hour: 'numeric',
  minute: '2-digit',
});
const NOW = new Date('2026-11-17T17:10:00.000Z');
const three: HouseholdContext = {
  routine: { outdoorExercise: true, commuteMode: 'car' },
  home: { airPurifier: true },
};
const QUESTION = 'Will the smog lift by evening?';

function Harness({
  place,
  updatedAt,
  forecastLoading,
  context,
  now,
}: {
  place: Place | null;
  updatedAt: string | null;
  forecastLoading: boolean;
  context: HouseholdContext;
  now: Date;
}) {
  const ask = useAsk(place, context, 0, () => {});
  return (
    <Ask
      place={place}
      updatedAt={updatedAt}
      forecastLoading={forecastLoading}
      context={context}
      now={now}
      ask={ask}
      onChoosePlace={() => {}}
      onLocateStart={() => {}}
      onLocate={() => {}}
    />
  );
}

function show({
  place = pune as Place | null,
  updatedAt = UPDATED_AT as string | null,
  forecastLoading = false,
  context = three,
  now = NOW,
} = {}) {
  return render(
    <Harness
      place={place}
      updatedAt={updatedAt}
      forecastLoading={forecastLoading}
      context={context}
      now={now}
    />,
  );
}

// Each fetch waits until the test answers it.
let replies: Array<(res: Response) => void>;
let fetchSpy: ReturnType<typeof vi.spyOn>;
const answer = (data: unknown) =>
  act(async () => replies.shift()!(Response.json({ data })));
const fail = () =>
  act(async () =>
    replies.shift()!(
      Response.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Unexpected server error.',
          },
        },
        { status: 500 },
      ),
    ),
  );
const sentBody = (call: number) =>
  JSON.parse(fetchSpy.mock.calls[call]![1]!.body as string) as Record<
    string,
    unknown
  >;
const status = () => document.querySelector('output')!.textContent;
const input = () =>
  screen.getByRole('textbox', {
    name: ASK_COPY.inputLabel,
  }) as HTMLTextAreaElement;
const button = (name: string) =>
  screen.getByRole('button', { name }) as HTMLButtonElement;
const heading = (name: string, said = 'You asked: ') =>
  screen.getByRole('heading', { level: 2, name: `${said}${name}` });
// An outdoors answer offering "Do you exercise outdoors?" (only Yes changes it).
const offering: AskAnswer = {
  ...rulesAskFixture,
  followUps: [{ field: 'routine.outdoorExercise', changes: ['yes'] }],
};
const question = () =>
  screen.getByRole('group', { name: 'Do you exercise outdoors?' });
const before = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
function typeAndSend(question: string) {
  fireEvent.change(input(), { target: { value: question } });
  fireEvent.click(button('Send'));
}

beforeEach(() => {
  // jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
  replies = [];
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        replies.push(resolve);
      }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Ask page', () => {
  it('one H1 and the context line, with Edit to My Profile', async () => {
    const { container } = show();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Ask AirAware' }),
    ).toBeTruthy();
    expect(container.textContent).toContain(
      `Using: the Pune, Maharashtra model forecast, retrieved ${UPDATED} · 3 of 10 household questions answered · Edit`,
    );
    expect(
      screen
        .getByRole('link', { name: 'Edit your answers in My Profile' })
        .getAttribute('href'),
    ).toBe('/app/profile');
    await expectNoAxeViolations(container);
  });

  it('a device place, and no time while the forecast is not ready', () => {
    const { container } = show({
      place: { ...pune, label: NEAR_YOU },
      updatedAt: null,
      forecastLoading: true,
      context: {},
    });

    const using = [...container.querySelectorAll('p')].find((p) =>
      p.textContent?.startsWith('Using:'),
    )!;
    expect(using.textContent).toMatch(
      /^Using: the model forecast near you \(approximate\).* · 0 of 10 household questions answered · Edit$/,
    );
    // Only an invisible, hidden-from-readers reserve stands where the time goes.
    expect(
      using.querySelector('span.invisible')!.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('a failed forecast leaves no blank reserve in the line', () => {
    const { container } = show({ updatedAt: null, forecastLoading: false });

    expect(container.querySelector('span.invisible')).toBeNull();
  });

  it('without a place, the place search comes first', () => {
    const { container } = show({ place: null });

    expect(
      screen.getByLabelText('Search for a city or area in India'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Indoor air' })).toBeNull();
    expect(container.textContent).not.toContain('Using:');
  });

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
  // Owner (27 Nov, Ask UX spec §11): a fixed placeholder replaces the
  // cycling hint on Ask.
  it('the empty box shows a fixed placeholder, no cycling hint', async () => {
    const { container } = show();
    expect(input().getAttribute('placeholder')).toBe(ASK_COPY.placeholder);
    expect(
      input().parentElement!.querySelector('[aria-hidden="true"]'),
    ).toBeNull();
    await expectNoAxeViolations(container);
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
    fireEvent.click(
      screen.getByRole('link', { name: 'Edit your answers in My Profile' }),
    );
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('a topic chip asks that topic at once', async () => {
    show();

    fireEvent.click(button('Indoor air'));
    await answer(aiAskFixture);

    expect(sentBody(0)).toMatchObject({ topic: 'indoor' });
    expect(sentBody(0)).not.toHaveProperty('question');
    expect(button('Indoor air').hasAttribute('aria-pressed')).toBe(false);
    expect(heading('Indoor air')).toBeTruthy();
  });

  // Guided chat (Task 4), reordered by redesign P4 (AK-02, AK-03).
  // Ask UX spec (owner, 27 Nov): welcome, 4 starters, More topics, a narrow
  // column, then the conversation and the box.
  it('with a place: title, intro, Using line, welcome, 4 starters, More topics, thread, then the box', async () => {
    const { container } = show();
    const order = [
      screen.getByRole('heading', { level: 1 }),
      screen.getByText(ASK_COPY.intro),
      screen.getByText(/^Using:/),
      screen.getByText(ASK_COPY.welcome),
      button('Can I go for a morning walk today?'),
      button('How can I reduce pollution while commuting?'),
      screen.getByText(ASK_COPY.moreTopics),
      input(),
    ];
    order.slice(1).forEach((el, i) => {
      expect(before(order[i]!, el)).toBe(true);
    });
    typeAndSend('First question');
    await answer(aiAskFixture);
    expect(
      before(screen.getByText(ASK_COPY.moreTopics), heading('First question')),
    ).toBe(true);
    expect(before(heading('First question'), input())).toBe(true);
    expect(container.textContent).not.toContain(greeting(NOW));
    await expectNoAxeViolations(container);
  });

  it('the welcome line shows until the first question', async () => {
    show();
    expect(screen.getByText(ASK_COPY.welcome)).toBeTruthy();
    typeAndSend(QUESTION);
    await answer(aiAskFixture);
    expect(screen.queryByText(ASK_COPY.welcome)).toBeNull();
  });

  it('four starters show; the topics and the last starter wait under "More topics"', () => {
    show();
    const summary = screen.getByText(ASK_COPY.moreTopics);
    const details = summary.closest('details')!;
    expect(summary.tagName).toBe('SUMMARY');
    expect(details.open).toBe(false);
    const outside = within(document.body)
      .getAllByRole('button')
      .filter((b) => b.textContent?.endsWith('?') && !details.contains(b));
    expect(outside.map((b) => b.textContent)).toEqual([
      'Can I go for a morning walk today?',
      'Is it a good idea to open my windows?',
      'How can I improve my indoor air?',
      'How can I reduce pollution while commuting?',
    ]);
    const hidden = within(details).getAllByRole('button');
    expect(hidden.map((b) => b.textContent)).toEqual([
      'Outdoor activities',
      'Windows and ventilation',
      'Indoor air',
      'My family',
      'Commuting',
      'Better habits',
      "What should I consider for my children's outdoor activities?",
    ]);

    typeAndSend(QUESTION);
    for (const b of hidden)
      expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it('the conversation is a narrow, centred, labelled region', async () => {
    const { container } = show();
    // A centred 56rem (896 px) column, narrower than the other tabs (owner,
    // 27 Nov: "shorter is good for UI").
    const column = (container.firstElementChild as HTMLElement).className;
    expect(column).toContain('mx-auto');
    expect(column).toContain('max-w-4xl');
    typeAndSend(QUESTION);
    await answer(aiAskFixture);
    expect(
      screen.getByRole('region', { name: ASK_COPY.conversation }),
    ).toBeTruthy();
  });

  it('says when the forecast is unavailable on the Using line', () => {
    show({ updatedAt: null, forecastLoading: false });
    expect(screen.getByText(/^Using:/).textContent).toContain(
      `, ${ASK_COPY.forecastUnavailable}`,
    );
  });

  it('the intro shows without a place too', () => {
    show({ place: null });

    expect(screen.getByText(ASK_COPY.intro)).toBeTruthy();
  });

  it('the thread reads oldest first, before the question box', async () => {
    show();

    typeAndSend('First question');
    await answer(aiAskFixture);
    typeAndSend('Second question');
    await answer(aiAskFixture);

    expect(before(heading('Second question'), input())).toBe(true);
    expect(before(heading('First question'), heading('Second question'))).toBe(
      true,
    );
  });

  it('one surface holds the whole thread, and none shows before the first question', async () => {
    const { container } = show();
    expect(container.querySelector('[data-part="ask-thread"]')).toBeNull();
    typeAndSend('First question');
    await answer(aiAskFixture);
    typeAndSend('Second question');
    await answer(aiAskFixture);
    const thread = container.querySelector('[data-part="ask-thread"]')!;
    expect(thread.className).toContain('card-surface');
    expect(thread.className).not.toContain('bg-surface-light');
    expect(thread.querySelectorAll('article.ask-answer')).toHaveLength(2);
  });

  // Owner (27 Nov): who made it, what it used and the notes show once, not
  // under every answer; they come back whenever any of them changes.
  it('shows the answer context once, and again only when it changes', async () => {
    show();
    const count = (text: string) => screen.queryAllByText(text).length;
    const basedOn = () => screen.queryAllByText(/^Based on:/).length;

    typeAndSend('First question');
    await answer(aiAskFixture);
    typeAndSend('Second question');
    await answer(aiAskFixture);
    // The same context twice: shown under the first answer only.
    expect(count('Made with AI')).toBe(1);
    expect(basedOn()).toBe(1);
    expect(count(aiAskFixture.safetyNote)).toBe(1);
    expect(count('Sources and limitations')).toBe(1);
    // Both answers keep their own advice.
    expect(
      document.querySelectorAll('article.ask-answer h3').length,
    ).toBeGreaterThan(1);

    typeAndSend('Third question');
    await answer(rulesAskFixture);
    // A rules answer after AI ones: its own label and context show again.
    expect(count('Made by our rules')).toBe(1);
    expect(basedOn()).toBe(2);
  });

  it('the column is centred', () => {
    const { container } = show();
    expect((container.firstElementChild as HTMLElement).className).toContain(
      'mx-auto',
    );
  });

  it('a one-line credit sits in the box, with both links', async () => {
    const { container } = show();
    const panel = container.querySelector('[data-part="ask-composer-panel"]')!;
    const credit = panel.querySelector('[data-part="ask-credit"]')!;
    expect(credit.textContent).toBe(
      'Forecasts: Open-Meteo.com (CC BY 4.0), based on CAMS · Privacy',
    );
    expect(credit.className).toContain('text-xs');
    expect(credit.className).toContain('text-text-dark-muted');
    expect(
      within(credit as HTMLElement)
        .getByRole('link', { name: 'Open-Meteo.com' })
        .getAttribute('href'),
    ).toBe('https://open-meteo.com/');
    expect(
      within(credit as HTMLElement)
        .getByRole('link', { name: 'Privacy' })
        .getAttribute('href'),
    ).toBe('/privacy');
    await expectNoAxeViolations(container);
  });

  it('phones pin the box from the start; md and up pin after the first question', async () => {
    const { container } = show();
    const form = input().closest('form')!;
    for (const cls of [
      'max-md:z-[1]',
      'max-md:[@media(min-height:30.2rem)]:sticky',
      'max-md:[@media(min-height:30.2rem)]:bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]',
    ])
      expect(form.className).toContain(cls);
    expect(form.className).not.toMatch(
      /(^|\s)\[@media\(min-height:30\.2rem\)\]:sticky/,
    );
    expect(form.className).not.toMatch(/(^|\s)z-\[1\]/);
    expect(form.hasAttribute('data-pinned')).toBe(false);
    typeAndSend(QUESTION);
    await answer(aiAskFixture);
    expect(form.className).toMatch(
      /(^|\s)\[@media\(min-height:30\.2rem\)\]:sticky/,
    );
    expect(form.hasAttribute('data-pinned')).toBe(true);
    expect((container.firstElementChild as HTMLElement).className).toContain(
      'md:gap-4',
    );
  });

  it('the question box pins to the bottom only on screens 30.2rem tall or more', async () => {
    show();
    typeAndSend(QUESTION);
    await answer(aiAskFixture);
    const form = input().closest('form')!;
    expect(form.dataset.part).toBe('ask-composer');
    expect(form.className).toContain('[@media(min-height:30.2rem)]:sticky');
    // Not a token: no shadow utility.
    expect(form.className).not.toContain('shadow');
    for (const cls of [
      '[@media(min-height:30.2rem)]:bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]',
      'md:[@media(min-height:30.2rem)]:bottom-0',
    ])
      expect(form.className).toContain(cls);
    // The tray look moves to the panel and is applied by a scroll-state query.
    for (const cls of [
      'rounded-b-none',
      'border-b-0',
      'bg-surface-light',
      'card-surface',
    ])
      expect(form.className).not.toContain(cls);
    const panel = form.querySelector('[data-part="ask-composer-panel"]')!;
    for (const cls of ['rounded-lg', 'border', 'card-surface'])
      expect(panel.className).toContain(cls);
    expect(panel.className).not.toContain('bg-surface-light');
    expect(input().className).toContain('bg-surface-light');
    expect(panel.className).not.toContain('shadow');
    expect(panel.contains(input())).toBe(true);
  });

  // F1 (AK-20): once, when it lands with focus still on the heading, so the
  // grown answer is not left under the pinned box. Never more than once.
  it('a reply that arrives later scrolls once more, no more', async () => {
    show();
    typeAndSend(QUESTION);
    const scrolls = () =>
      (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls
        .length;
    const calls = scrolls();
    await answer(aiAskFixture);
    expect(scrolls()).toBe(calls + 1);
  });

  it('"Not current" joins the Using line once the forecast is over an hour old', () => {
    const at = (minutes: number) =>
      new Date(new Date(UPDATED_AT).getTime() + minutes * 60_000);

    const { container } = show({ now: at(59) });
    expect(container.textContent).not.toContain('Not current');
    cleanup();

    const late = show({ now: at(61) });
    expect(late.container.textContent).toContain(
      `retrieved ${UPDATED} · Not current · 3 of 10 household questions answered · Edit`,
    );
  });

  it("a question back offers the field's own options and Skip", async () => {
    const { container } = show({ context: {} });

    fireEvent.click(button('Outdoor activities'));
    await answer(offering);

    const group = question();
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Yes', 'No', ASK_COPY.skip]);
    expect(screen.getByText(ASK_COPY.followUpIntro)).toBeTruthy();
    expect(screen.getByText(ASK_COPY.followUpNote)).toBeTruthy();
    await expectNoAxeViolations(container);
  });

  // Owner (27 Nov): question, response, question, response. An answer to a
  // question back is your own message (with its question), the updated
  // reply follows it, and the reply it updates folds.
  const replies_ = () => document.querySelectorAll('article.ask-answer');
  const answered = (text: string) => heading(text, 'You answered: ');

  it('answering is your message, and the new reply repeats no card', async () => {
    const { container } = show({ context: {} });
    fireEvent.click(button('Outdoor activities'));
    await answer(offering);

    fireEvent.click(within(question()).getByRole('button', { name: 'Yes' }));

    expect(
      screen.queryByRole('group', { name: 'Do you exercise outdoors?' }),
    ).toBeNull();
    expect(sentBody(1)).toMatchObject({
      topic: 'outdoors',
      householdContext: { routine: { outdoorExercise: true } },
    });
    const mine = answered('Do you exercise outdoors? Yes');
    expect(document.activeElement).toBe(mine);
    expect(before(heading('Outdoor activities'), mine)).toBe(true);
    await answer(rulesAskFixture);
    expect(replies_()).toHaveLength(2);
    // The new reply repeats no card shown above; it names them instead, and
    // the earlier reply stays open (owner, 27 Nov).
    const titles = (a: Element) =>
      [...a.querySelectorAll('h3')].map((h) => h.textContent);
    const earlier = heading('Outdoor activities').closest('article')!;
    const latest = mine.closest('article')!;
    const above = titles(earlier);
    expect(above.length).toBeGreaterThan(0);
    expect(titles(latest).filter((t) => above.includes(t))).toEqual([]);
    expect(
      within(latest).getByText(
        new RegExp(`^${ASK_COPY.stillApplies.replace(/[()]/g, '\\$&')} `),
      ),
    ).toBeTruthy();
    expect(earlier.querySelector('details[open]')).toBeNull();
    expect(screen.queryByText(/Earlier answer/)).toBeNull();
    // No "You answered" line repeats the message.
    expect(screen.queryByText('You answered: Yes.')).toBeNull();
    await expectNoAxeViolations(container);
  });

  it('an answer that changes nothing is noted in a reply of its own', async () => {
    show({ context: {} });
    fireEvent.click(button('Outdoor activities'));
    await answer(offering);

    fireEvent.click(within(question()).getByRole('button', { name: 'No' }));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(status()).toBe(ASK_COPY.noted);
    const reply = answered('Do you exercise outdoors? No').closest('article')!;
    expect(within(reply).getByText(ASK_COPY.noted)).toBeTruthy();
    // Nothing changed, so no card is named as still applying.
    expect(
      screen.queryByText(
        new RegExp(ASK_COPY.stillApplies.replace(/[()]/g, '\\$&')),
      ),
    ).toBeNull();
  });

  // Deferred minor: the thread never ends with nothing to tap.
  it('after "Noted", the suggestions follow the note', async () => {
    const { container } = show({ context: {} });
    fireEvent.click(button('Outdoor activities'));
    await answer(offering);

    fireEvent.click(within(question()).getByRole('button', { name: 'No' }));

    const note = answered('Do you exercise outdoors? No').closest('article')!;
    expect(within(note).getByText(ASK_COPY.alsoAsk)).toBeTruthy();
    expect(
      within(note).getByRole('button', {
        name: 'How can I reduce pollution while commuting?',
      }),
    ).toBeTruthy();
    const earlier = heading('Outdoor activities').closest('article')!;
    expect(within(earlier).queryByText(ASK_COPY.alsoAsk)).toBeNull();
    await expectNoAxeViolations(container);
  });
  it('Skip shows the skipped line and takes focus', async () => {
    const { container } = show({ context: {} });
    fireEvent.click(button('Outdoor activities'));
    await answer(offering);

    fireEvent.click(
      within(question()).getByRole('button', { name: ASK_COPY.skip }),
    );

    expect(document.activeElement).toBe(screen.getByText(ASK_COPY.skipped));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations(container);
  });

  it('suggestions follow the newest topic answer', async () => {
    show();
    fireEvent.click(button('Outdoor activities'));
    await answer(rulesAskFixture);

    const reply = heading('Outdoor activities').closest('article')!;
    expect(within(reply).getByText(ASK_COPY.alsoAsk)).toBeTruthy();
    expect(
      within(reply)
        .getAllByRole('button')
        .map((b) => b.textContent)
        .filter((name) => name?.endsWith('?')),
    ).toEqual([
      'How can I reduce pollution while commuting?',
      "What should I consider for my children's outdoor activities?",
      'Is it a good idea to open my windows?',
    ]);

    typeAndSend(QUESTION);
    await answer(aiAskFixture);
    expect(within(reply).queryByText(ASK_COPY.alsoAsk)).toBeNull();
  });

  it('a starter asks its question at once', () => {
    show();

    fireEvent.click(button('How can I reduce pollution while commuting?'));

    expect(sentBody(0)).toMatchObject({
      question: 'How can I reduce pollution while commuting?',
    });
  });

  it('a typed question: focus, the status line, then the answer', async () => {
    const { container } = show();

    typeAndSend(QUESTION);

    expect(sentBody(0)).toMatchObject({ question: QUESTION });
    expect(input().value).toBe('');
    expect(document.activeElement).toBe(heading(QUESTION));
    expect(status()).toBe(ASK_COPY.thinking);
    // One request at a time: everything waits for this answer.
    for (const name of [
      'Send',
      'Indoor air',
      'How can I improve my indoor air?',
    ]) {
      expect(button(name).disabled).toBe(true);
    }
    await expectNoAxeViolations(container);

    await answer(aiAskFixture);

    expect(status()).toBe(`Answer ready. ${aiAskFixture.summary}`);
    expect(button('Send').disabled).toBe(true);
    fireEvent.change(input(), { target: { value: 'Next' } });
    expect(button('Send').disabled).toBe(false);
    await expectNoAxeViolations(container);
  });

  it('a medical answer says so in the status line', async () => {
    show();

    typeAndSend('Should I change my inhaler dose?');
    await answer(medicalAskFixture);

    expect(status()).toBe(ASK_COPY.medical);
  });

  it('Try again sends the same body and keeps focus on the answer', async () => {
    const { container } = show();

    typeAndSend(QUESTION);
    await fail();
    await expectNoAxeViolations(container);
    fireEvent.click(button('Try again'));

    expect(sentBody(1)).toEqual(sentBody(0));
    expect(document.activeElement).toBe(heading(QUESTION));
  });
});
