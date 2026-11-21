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
  context,
}: {
  place: Place | null;
  updatedAt: string | null;
  context: HouseholdContext;
}) {
  const ask = useAsk(place, context, 0, () => {});
  return (
    <Ask
      place={place}
      updatedAt={updatedAt}
      context={context}
      now={NOW}
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
  context = three,
} = {}) {
  return render(
    <Harness place={place} updatedAt={updatedAt} context={context} />,
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
      `Using: the Pune, Maharashtra model forecast, updated ${UPDATED} · 3 of 10 answers · Edit`,
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
      context: {},
    });

    expect(container.textContent).toContain(
      'Using: the model forecast near you (approximate) · 0 of 10 answers · Edit',
    );
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

  // Guided chat (Task 4).
  it('opens with a greeting that holds the topics and starters', async () => {
    const { container } = show();

    const hello = screen.getByText(
      `${greeting(NOW)}. ${ASK_COPY.greetingTail}`,
    );
    expect(before(hello, button('Indoor air'))).toBe(true);
    expect(
      before(
        button('Indoor air'),
        button('Can I go for a morning walk today?'),
      ),
    ).toBe(true);
    expect(before(button('Can I go for a morning walk today?'), input())).toBe(
      true,
    );
    await expectNoAxeViolations(container);
  });

  it('the thread reads oldest first, then the question box', async () => {
    show();

    typeAndSend('First question');
    await answer(aiAskFixture);
    typeAndSend('Second question');
    await answer(aiAskFixture);

    expect(before(heading('First question'), heading('Second question'))).toBe(
      true,
    );
    expect(before(heading('Second question'), input())).toBe(true);
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
    const reply = heading('Yes', 'You answered: ');
    expect(document.activeElement).toBe(reply);
    expect(before(heading('Outdoor activities'), reply)).toBe(true);
    expect(before(reply, input())).toBe(true);
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
    const reply = heading('No', 'You answered: ').closest('article')!;
    expect(within(reply).getByText(ASK_COPY.noted)).toBeTruthy();
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
