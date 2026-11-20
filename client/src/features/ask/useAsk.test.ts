import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HouseholdContext } from '../../../../shared/contracts.ts';
import { ApiError } from '../../services/api.ts';
import { aiAskFixture, rulesAskFixture } from '../../test/askFixtures.ts';
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

function setup(place: Place | null = pune, resets = 0) {
  return renderHook((props) => useAsk(props.place, context, props.resets), {
    initialProps: { place, resets },
  });
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

  it('keeps the newest 10, newest first', async () => {
    const { result } = setup();

    for (let i = 1; i <= 11; i++) {
      act(() => result.current.send({ topic: 'indoor' }, `q${i}`));
      await answer(aiAskFixture);
    }

    expect(result.current.entries.map((e) => e.echo)).toEqual(
      Array.from({ length: 10 }, (_, i) => `q${11 - i}`),
    );
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
