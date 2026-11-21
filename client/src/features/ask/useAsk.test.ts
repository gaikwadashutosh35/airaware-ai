import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HouseholdContext } from '../../../../shared/contracts.ts';
import { ApiError } from '../../services/api.ts';
import type { AskAnswer } from '../../../../shared/contracts.ts';
import { aiAskFixture, rulesAskFixture } from '../../test/askFixtures.ts';
import { ASK_COPY } from './ask.ts';
import type { Place } from '../location/place.ts';
import { useAsk } from './useAsk.ts';

const pune: Place = {
  label: 'Pune, Maharashtra',
  latitude: 18.5196,
  longitude: 73.8553,
};
const mumbai: Place = { label: 'Mumbai', latitude: 19.08, longitude: 72.88 };
const context: HouseholdContext = { routine: { outdoorExercise: true } };
const QUESTION = 'Can I go for a morning walk today?';

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
  JSON.parse(fetchSpy.mock.calls[call]![1]!.body as string) as unknown;

const onContextChange = vi.fn();
function setup(place: Place | null = pune, resets = 0) {
  return renderHook(
    (props) => useAsk(props.place, context, props.resets, onContextChange),
    { initialProps: { place, resets } },
  );
}

// An answer offering "Do you exercise outdoors?", where only Yes changes it.
const offering: AskAnswer = {
  ...rulesAskFixture,
  followUps: [{ field: 'routine.outdoorExercise', changes: ['yes'] }],
};
// A thread with one topic answer that offers the question.
async function offered() {
  const hook = renderHook(() => useAsk(pune, {}, 0, onContextChange));
  act(() =>
    hook.result.current.send({ topic: 'outdoors' }, 'Outdoor activities'),
  );
  await answer(offering);
  return hook;
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
  vi.restoreAllMocks();
  onContextChange.mockReset();
});

describe('useAsk', () => {
  it('a send shows a thinking entry that becomes the answer', async () => {
    const { result } = setup();

    act(() => result.current.send({ question: QUESTION }, QUESTION));

    expect(result.current.thinking).toBe(true);
    expect(result.current.entries).toMatchObject([
      { echo: QUESTION, status: 'thinking' },
    ]);
    await answer(aiAskFixture);
    expect(result.current.thinking).toBe(false);
    expect(result.current.entries).toMatchObject([
      { echo: QUESTION, status: 'ready', answer: aiAskFixture },
    ]);
  });

  it('sends 2-decimal coordinates and the answers on screen', async () => {
    const { result } = setup();

    act(() => result.current.send({ question: QUESTION }, QUESTION));
    await answer(aiAskFixture);
    act(() => result.current.send({ topic: 'family' }, 'My family'));

    const place = {
      label: 'Pune, Maharashtra',
      latitude: 18.52,
      longitude: 73.86,
    };
    expect(fetchSpy.mock.calls[0]![0]).toBe('/api/v1/assistant/answer');
    expect(sentBody(0)).toEqual({
      question: QUESTION,
      place,
      householdContext: context,
    });
    expect(sentBody(1)).toEqual({
      topic: 'family',
      place,
      householdContext: context,
    });
  });

  it('a failure becomes an error entry; Try again resends the same body', async () => {
    const { result } = setup();

    act(() => result.current.send({ question: QUESTION }, QUESTION));
    await fail();
    const [entry] = result.current.entries;
    expect(entry).toMatchObject({ status: 'error' });
    expect(entry!.error).toBeInstanceOf(ApiError);

    act(() => result.current.retry(entry!.id));
    expect(result.current.entries).toMatchObject([{ status: 'thinking' }]);
    await answer(rulesAskFixture);

    expect(sentBody(1)).toEqual(sentBody(0));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]).toMatchObject({
      status: 'ready',
      answer: rulesAskFixture,
    });
    expect(result.current.entries[0]!.error).toBeUndefined();
  });

  it('one request at a time', () => {
    const { result } = setup();

    act(() => result.current.send({ question: QUESTION }, QUESTION));
    act(() => result.current.send({ topic: 'family' }, 'My family'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.entries).toHaveLength(1);
  });

  it('the thread is oldest first and keeps the newest 10', async () => {
    const { result } = setup();

    for (let i = 1; i <= 11; i++) {
      act(() => result.current.send({ topic: 'indoor' }, `q${i}`));
      await answer(aiAskFixture);
    }

    expect(result.current.entries.map((e) => e.echo)).toEqual(
      Array.from({ length: 10 }, (_, i) => `q${i + 2}`),
    );
  });

  it('an answer that changes the cards sets the field and asks the topic again', async () => {
    const { result } = await offered();
    const first = result.current.entries[0]!;

    act(() =>
      result.current.answerFollowUp(
        first.id,
        'routine.outdoorExercise',
        'yes',
        'Yes',
      ),
    );

    expect(onContextChange).toHaveBeenCalledWith({
      routine: { outdoorExercise: true },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(sentBody(1)).toMatchObject({
      topic: 'outdoors',
      householdContext: { routine: { outdoorExercise: true } },
    });
    expect(result.current.entries).toMatchObject([
      {
        id: first.id,
        followUp: {
          field: 'routine.outdoorExercise',
          outcome: 'answered',
          label: 'Yes',
        },
      },
      {
        echo: 'Yes',
        said: 'answered',
        about: 'Do you exercise outdoors?',
        status: 'thinking',
      },
    ]);
  });

  it('an answer that changes nothing sets the field and sends nothing', async () => {
    const { result } = await offered();
    const first = result.current.entries[0]!;

    act(() =>
      result.current.answerFollowUp(
        first.id,
        'routine.outdoorExercise',
        'no',
        'No',
      ),
    );

    expect(onContextChange).toHaveBeenCalledWith({
      routine: { outdoorExercise: false },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.entries[1]).toMatchObject({
      echo: 'No',
      said: 'answered',
      about: 'Do you exercise outdoors?',
      request: null,
      status: 'ready',
      note: ASK_COPY.noted,
    });
  });

  // Final review: an answer from an older server has no followUps.
  it('an answer without followUps is noted, not a crash', async () => {
    const { result } = renderHook(() => useAsk(pune, {}, 0, onContextChange));
    act(() => result.current.send({ topic: 'outdoors' }, 'Outdoor activities'));
    const old: Partial<AskAnswer> = { ...offering };
    delete old.followUps;
    await answer(old);

    act(() =>
      result.current.answerFollowUp(
        result.current.entries[0]!.id,
        'routine.outdoorExercise',
        'yes',
        'Yes',
      ),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.entries[1]).toMatchObject({ note: ASK_COPY.noted });
  });

  it('Skip sends nothing and is remembered for the visit', async () => {
    const { result } = await offered();
    const first = result.current.entries[0]!;

    act(() => result.current.skipFollowUp(first.id, 'routine.outdoorExercise'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(onContextChange).not.toHaveBeenCalled();
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]!.followUp).toEqual({
      field: 'routine.outdoorExercise',
      outcome: 'skipped',
    });
    expect(result.current.skipped.has('routine.outdoorExercise')).toBe(true);
  });

  // Review Focus 1.
  it('while thinking, a second answer or send is ignored', async () => {
    const { result } = await offered();
    const id = result.current.entries[0]!.id;

    act(() =>
      result.current.answerFollowUp(
        id,
        'routine.outdoorExercise',
        'yes',
        'Yes',
      ),
    );
    act(() =>
      result.current.answerFollowUp(
        id,
        'routine.outdoorExercise',
        'yes',
        'Yes',
      ),
    );
    act(() => result.current.send({ topic: 'family' }, 'My family'));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current.entries).toHaveLength(2);
  });

  // Review Focus 3.
  it('a new place empties the thread and the skips', async () => {
    const { result, rerender } = setup();
    act(() => result.current.send({ topic: 'outdoors' }, 'Outdoor activities'));
    await answer(offering);
    act(() =>
      result.current.skipFollowUp(
        result.current.entries[0]!.id,
        'routine.outdoorExercise',
      ),
    );

    rerender({ place: mumbai, resets: 0 });

    expect(result.current.entries).toEqual([]);
    expect(result.current.skipped.size).toBe(0);
  });

  it('a new place empties the list and drops a late reply', async () => {
    const { result, rerender } = setup();
    act(() => result.current.send({ question: QUESTION }, QUESTION));

    rerender({ place: mumbai, resets: 0 });
    expect(result.current.entries).toEqual([]);
    expect(result.current.thinking).toBe(false);

    await answer(aiAskFixture);
    expect(result.current.entries).toEqual([]);
    // Back to the first place: its old answers do not come back.
    rerender({ place: pune, resets: 0 });
    expect(result.current.entries).toEqual([]);
  });

  it('"Delete everything" empties the list', async () => {
    const { result, rerender } = setup();
    act(() => result.current.send({ question: QUESTION }, QUESTION));
    await answer(aiAskFixture);

    rerender({ place: pune, resets: 1 });

    expect(result.current.entries).toEqual([]);
  });

  it('no place, no request', () => {
    const { result } = setup(null);

    act(() => result.current.send({ question: QUESTION }, QUESTION));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('never writes to browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = setup();

    act(() => result.current.send({ question: QUESTION }, QUESTION));
    await fail();
    act(() => result.current.retry(result.current.entries[0]!.id));
    await answer(aiAskFixture);

    expect(setItem).not.toHaveBeenCalled();
  });
});
