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
  }) as HTMLInputElement;
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

    expect(input().maxLength).toBe(200);
    expect(input().getAttribute('enterkeyhint')).toBe('send');
    expect(input().getAttribute('autocomplete')).toBe('off');
    expect(input().required).toBe(true);
    expect(input().hasAttribute('name')).toBe(false);
    expect(button('Send')).toBeTruthy();
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
  it('with a place: title, intro, Using line, question box, topics, 3 starters, More questions, thread', async () => {
    const { container } = show();
    typeAndSend('First question');
    await answer(aiAskFixture);

    const h1 = screen.getByRole('heading', { level: 1 });
    const intro = screen.getByText(ASK_COPY.intro);
    const using = screen.getByText(/^Using:/);
    const order = [
      h1,
      intro,
      using,
      input(),
      button('Outdoor activities'),
      button('Can I go for a morning walk today?'),
      button('How can I improve my indoor air?'),
      screen.getByText(ASK_COPY.moreQuestions),
      heading('First question'),
    ];
    order.slice(1).forEach((el, i) => {
      expect(before(order[i]!, el)).toBe(true);
    });
    expect(container.textContent).not.toContain(greeting(NOW));
    expect(container.textContent).not.toContain("I'm AirAware");
    await expectNoAxeViolations(container);
  });

  it('three starters show, two wait under "More questions" and rest while thinking', () => {
    show();
    const summary = screen.getByText(ASK_COPY.moreQuestions);
    const details = summary.closest('details')!;
    expect(summary.tagName).toBe('SUMMARY');
    const outside = within(document.body)
      .getAllByRole('button')
      .filter((b) => b.textContent?.endsWith('?') && !details.contains(b));
    expect(outside).toHaveLength(3);
    const hidden = within(details).getAllByRole('button');
    expect(hidden.map((b) => b.textContent)).toEqual([
      "What should I consider for my children's outdoor activities?",
      'How can I reduce pollution while commuting?',
    ]);

    typeAndSend(QUESTION);
    for (const b of hidden)
      expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it('the intro shows without a place too', () => {
    show({ place: null });

    expect(screen.getByText(ASK_COPY.intro)).toBeTruthy();
  });

  it('the thread reads oldest first, after the question box', async () => {
    show();

    typeAndSend('First question');
    await answer(aiAskFixture);
    typeAndSend('Second question');
    await answer(aiAskFixture);

    expect(before(input(), heading('First question'))).toBe(true);
    expect(before(heading('First question'), heading('Second question'))).toBe(
      true,
    );
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

  it('answering shows "You answered: Yes." and a new reply at the end', async () => {
    const { container } = show({ context: {} });
    fireEvent.click(button('Outdoor activities'));
    await answer(offering);

    fireEvent.click(within(question()).getByRole('button', { name: 'Yes' }));

    expect(screen.getByText('You answered: Yes.')).toBeTruthy();
    expect(
      screen.queryByRole('group', { name: 'Do you exercise outdoors?' }),
    ).toBeNull();
    expect(sentBody(1)).toMatchObject({ topic: 'outdoors' });
    const reply = heading(
      'Yes',
      'Your answer to "Do you exercise outdoors?": ',
    );
    expect(document.activeElement).toBe(reply);
    expect(before(heading('Outdoor activities'), reply)).toBe(true);
    await answer(rulesAskFixture);
    await expectNoAxeViolations(container);
  });

  it('an answer that changes nothing is noted in the status line', async () => {
    show({ context: {} });
    fireEvent.click(button('Outdoor activities'));
    await answer(offering);

    fireEvent.click(within(question()).getByRole('button', { name: 'No' }));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(status()).toBe(ASK_COPY.noted);
    const reply = heading(
      'No',
      'Your answer to "Do you exercise outdoors?": ',
    ).closest('article')!;
    expect(within(reply).getByText(ASK_COPY.noted)).toBeTruthy();
  });

  // Deferred minor: the thread never ends with nothing to tap.
  it('after "Noted", the suggestions follow the note', async () => {
    const { container } = show({ context: {} });
    fireEvent.click(button('Outdoor activities'));
    await answer(offering);

    fireEvent.click(within(question()).getByRole('button', { name: 'No' }));

    const note = heading(
      'No',
      'Your answer to "Do you exercise outdoors?": ',
    ).closest('article')!;
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
