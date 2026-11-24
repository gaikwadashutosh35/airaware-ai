import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AskAnswer } from '../../../../shared/contracts.ts';
import { ApiError } from '../../services/api.ts';
import {
  aiAskFixture,
  medicalAskFixture,
  outOfScopeAskFixture,
  rulesAskFixture,
  unknownAirAskFixture,
} from '../../test/askFixtures.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { ASK_COPY } from './ask.ts';
import { AskEntry } from './AskEntry.tsx';
import type { AskEntry as Entry } from './useAsk.ts';

const RETRIEVED = new Date('2026-11-17T17:05:00.000Z');
const minutesLater = (minutes: number) =>
  new Date(RETRIEVED.getTime() + minutes * 60_000);
const UPDATED = RETRIEVED.toLocaleTimeString([], {
  hour: 'numeric',
  minute: '2-digit',
});
const SAFETY =
  'General information only, not medical advice. Follow local public-health advisories.';
const ECHO = 'Can I go for a morning walk today?';
const place = { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 };

function entry(patch: Partial<Entry>): Entry {
  return {
    id: 1,
    echo: ECHO,
    said: 'asked',
    request: { question: ECHO, place },
    status: 'ready',
    ...patch,
  };
}
const ready = (answer: AskAnswer, echo = ECHO) =>
  entry({ echo, answer, status: 'ready' });
const heading = (name = ECHO) =>
  screen.getByRole('heading', { level: 2, name: `You asked: ${name}` });
const button = (name: string) =>
  screen.getByRole('button', { name }) as HTMLButtonElement;

function show(
  item: Entry,
  { now = minutesLater(5), focus = false, busy = false } = {},
) {
  const onRetry = vi.fn();
  const onTopic = vi.fn();
  const view = render(
    <AskEntry
      entry={item}
      now={now}
      focus={focus}
      busy={busy}
      newest
      pending={null}
      onRetry={onRetry}
      onTopic={onTopic}
      onStarter={() => {}}
      onAnswerFollowUp={() => {}}
      onSkipFollowUp={() => {}}
    />,
  );
  return { ...view, onRetry, onTopic };
}

beforeEach(() => {
  // jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe('AskEntry', () => {
  it('an AI answer: heading, summary, made-by, based-on, cards, safety note', async () => {
    const { container } = show(ready(aiAskFixture));

    expect(heading()).toBeTruthy();
    expect(screen.getByText(aiAskFixture.summary!)).toBeTruthy();
    expect(screen.getByText('Made with AI')).toBeTruthy();
    expect(
      screen.getByText(
        `Based on: Forecast above India's 24-hour limit · Model forecast · Open-Meteo · retrieved ${UPDATED}`,
      ),
    ).toBeTruthy();
    const cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards.map((h) => h.textContent)).toEqual(
      aiAskFixture.cards.map((c) => c.title),
    );
    expect(screen.getAllByText('Why?')).toHaveLength(3);
    expect(screen.getByText(SAFETY)).toBeTruthy();
    expect(container.textContent).not.toMatch(/not current/i);
    await expectNoAxeViolations(container);
  });

  it("a rules answer: the verdict's explanation, made by our rules", () => {
    show(ready(rulesAskFixture));

    expect(
      screen.getByText(
        'Fine particles (PM2.5) are forecast above the national daily limit for the next 24 hours.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Made by our rules')).toBeTruthy();
  });

  it('"Not current" once the forecast is over an hour old', () => {
    show(ready(aiAskFixture), { now: minutesLater(59) });
    expect(screen.queryByText(/not current/i)).toBeNull();
    cleanup();

    show(ready(aiAskFixture), { now: minutesLater(61) });
    expect(screen.getByText(/not current/i)).toBeTruthy();
  });

  it('no forecast: only the unavailable verdict, no kind, provider or time', () => {
    const { container } = show(ready(unknownAirAskFixture));

    expect(
      screen.getByText('Based on: Air information unavailable', {
        exact: true,
      }),
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(
      /Model forecast|Open-Meteo|retrieved/,
    );
  });

  it('a medical question with no forecast: Today has only the verdict', () => {
    const { container } = show(
      ready(
        { ...medicalAskFixture, forecast: null, air: unknownAirAskFixture.air },
        'Should I change my inhaler dose?',
      ),
    );

    expect(
      screen.getByText('Today: Air information unavailable', { exact: true }),
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(
      /Model forecast|Open-Meteo|retrieved/,
    );
  });

  it('a medical question: the refusal and today, no cards', async () => {
    const { container } = show(
      ready(medicalAskFixture, 'Should I change my inhaler dose?'),
    );

    expect(screen.getByText(ASK_COPY.medical)).toBeTruthy();
    expect(
      screen.getByText(
        `Today: Forecast above India's 24-hour limit · Model forecast · Open-Meteo · retrieved ${UPDATED}`,
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Why?')).toBeNull();
    expect(screen.queryByText('Made with AI')).toBeNull();
    expect(screen.getByText(SAFETY)).toBeTruthy();
    await expectNoAxeViolations(container);
  });

  it('an out-of-scope question: what Ask can help with, and the topics', async () => {
    const { container, onTopic } = show(
      ready(outOfScopeAskFixture, 'What is the capital of India?'),
    );

    expect(screen.getByText(ASK_COPY.outOfScope)).toBeTruthy();
    expect(screen.queryByText('Why?')).toBeNull();
    fireEvent.click(button('Indoor air'));
    expect(onTopic).toHaveBeenCalledWith('indoor', 'Indoor air');
    await expectNoAxeViolations(container);
  });

  it('thinking', async () => {
    const { container } = show(entry({ status: 'thinking' }));

    expect(screen.getByText(ASK_COPY.thinking)).toBeTruthy();
    await expectNoAxeViolations(container);
  });

  it('an error: Try again retries and keeps focus on the answer', async () => {
    const { container, onRetry } = show(
      entry({
        status: 'error',
        error: new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error.'),
      }),
    );

    expect(
      screen.getByRole('heading', { name: ASK_COPY.errorTitle }),
    ).toBeTruthy();
    expect(screen.getByText(ASK_COPY.errorFallback)).toBeTruthy();
    await expectNoAxeViolations(container);
    fireEvent.click(button('Try again'));
    expect(onRetry).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(heading());
  });

  it('too many requests says so', () => {
    show(
      entry({
        status: 'error',
        error: new ApiError(
          429,
          'RATE_LIMITED',
          'Too many requests. Try again in a minute.',
        ),
      }),
    );

    expect(
      screen.getByText('Too many requests. Try again in a minute.'),
    ).toBeTruthy();
  });

  it('a new answer takes focus', () => {
    show(entry({ status: 'thinking' }), { focus: true });

    expect(document.activeElement).toBe(heading());
  });

  // F-04 / AK-05: the exchange scrolls to the top at once, then focus follows
  // without a second scroll.
  it('a new exchange scrolls to the top, then focuses without scrolling', () => {
    const calls: string[] = [];
    const scroll = vi.fn(() => calls.push('scroll'));
    Element.prototype.scrollIntoView = scroll;
    const focus = vi
      .spyOn(HTMLElement.prototype, 'focus')
      .mockImplementation(() => void calls.push('focus'));

    show(entry({ status: 'thinking' }), { focus: true });

    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    expect(scroll.mock.contexts[0]).toBe(heading().closest('article'));
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(calls).toEqual(['scroll', 'focus']);
    focus.mockRestore();
  });

  it('its topic buttons rest while another answer is coming', () => {
    show(ready(outOfScopeAskFixture), { busy: true });

    expect(button('Indoor air').disabled).toBe(true);
  });
});
