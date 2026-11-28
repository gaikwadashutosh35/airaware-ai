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
import { FIELDS, fieldId } from '../daily-plan/householdFields.ts';
import { mergedLimitations } from '../today/today.ts';
import { ASK_COPY } from './ask.ts';
import { AskEntry, StarterButtons } from './AskEntry.tsx';
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

describe('StarterButtons', () => {
  // E5: a control's edge is the muted text colour, for 3:1 against the card.
  it('draws each starter with the control border', () => {
    render(
      <StarterButtons
        questions={[{ question: 'Is it a good day to walk?' }]}
        busy={false}
        onStarter={() => {}}
      />,
    );

    const starter = screen.getByRole('button');
    expect(starter.classList.contains('border-text-dark-muted')).toBe(true);
    expect(starter.classList.contains('border-rule')).toBe(false);
  });
});

describe('AskEntry', () => {
  it('an AI answer: heading, summary, made-by, based-on, cards, safety note', async () => {
    const { container } = show(ready(aiAskFixture));

    expect(heading()).toBeTruthy();
    expect(screen.getByText(aiAskFixture.summary!)).toBeTruthy();
    expect(screen.getByText('Made with AI')).toBeTruthy();
    expect(screen.getByText(/^Based on: /).textContent).toBe(
      `Based on: Forecast above India's 24-hour limit · Model forecast · Open-Meteo · retrieved ${UPDATED}`,
    );
    const cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards.map((h) => h.textContent)).toEqual(
      aiAskFixture.cards.map((c) => c.title),
    );
    expect(screen.getAllByText('Why?')).toHaveLength(3);
    expect(screen.getByText(SAFETY)).toBeTruthy();
    expect(container.textContent).not.toMatch(/not current/i);
    await expectNoAxeViolations(container);
  });

  it("Open-Meteo links to the answer's source, and the line reads as before", () => {
    show(ready(aiAskFixture));

    const link = screen.getByRole('link', { name: 'Open-Meteo' });
    expect(link.getAttribute('href')).toBe(aiAskFixture.forecast!.sourceUrl);
    expect(screen.getByText(/^Based on: /).textContent).toBe(
      `Based on: Forecast above India's 24-hour limit · Model forecast · Open-Meteo · retrieved ${UPDATED}`,
    );
  });

  it("'Sources and limitations' starts closed and lists the forecast's limitations", async () => {
    const { container } = show(ready(aiAskFixture));

    const summary = screen.getByText('Sources and limitations');
    expect(summary.tagName).toBe('SUMMARY');
    expect(summary.closest('details')!.open).toBe(false);
    // The same list as Today's "Sources and limitations".
    const lines = mergedLimitations(aiAskFixture.forecast!.limitations);
    expect(lines.length).toBeGreaterThan(
      aiAskFixture.forecast!.limitations.length,
    );
    for (const line of lines) expect(screen.getByText(line)).toBeTruthy();
    await expectNoAxeViolations(container);
  });

  it('with no forecast: the verdict alone, no link, no sources section', () => {
    show(ready({ ...aiAskFixture, forecast: null }));

    expect(screen.queryByRole('link', { name: 'Open-Meteo' })).toBeNull();
    expect(screen.queryByText('Sources and limitations')).toBeNull();
  });

  it('"Not current" stays outside "Sources and limitations"', () => {
    show(ready(aiAskFixture), { now: minutesLater(61) });

    expect(screen.getByText(/not current/i).closest('details')).toBeNull();
  });

  // Ask UX audit (27 Nov): Ask has no Reload button, so its banner does not
  // tell people to reload.
  it('the stale banner on Ask gives no Reload instruction it cannot keep', () => {
    show(ready(aiAskFixture), { now: minutesLater(61) });
    expect(
      screen.getByText('Not current: retrieved more than an hour ago.'),
    ).toBeTruthy();
    expect(screen.queryByText(/reload/i)).toBeNull();
  });

  // I2: "Not current" sits next to the time, before the shut section.
  it('in a stale answer the banner comes before "Sources and limitations"', () => {
    show(ready(aiAskFixture), { now: minutesLater(61) });

    const banner = screen.getByText(/not current/i);
    const details = screen
      .getByText('Sources and limitations')
      .closest('details')!;
    expect(
      banner.compareDocumentPosition(details) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('the question bubble keeps line breaks', () => {
    show(ready(aiAskFixture, 'a\nb'));

    expect(
      screen
        .getByRole('heading', { level: 2 })
        .classList.contains('whitespace-pre-line'),
    ).toBe(true);
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
    expect(screen.getByText(/^Today: /).textContent).toBe(
      `Today: Forecast above India's 24-hour limit · Model forecast · Open-Meteo · retrieved ${UPDATED}`,
    );
    expect(
      screen.getByRole('link', { name: 'Open-Meteo' }).getAttribute('href'),
    ).toBe(medicalAskFixture.forecast!.sourceUrl);
    expect(screen.queryByText('Sources and limitations')).toBeNull();
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

  // AK-20: the answer grows below the short placeholder, so the exchange
  // scrolls to the top once more when it lands, if focus is still on it.
  describe('when the reply lands', () => {
    const props = {
      now: minutesLater(5),
      focus: true,
      busy: false,
      newest: true,
      pending: null,
      onRetry: () => {},
      onTopic: () => {},
      onStarter: () => {},
      onAnswerFollowUp: () => {},
      onSkipFollowUp: () => {},
    };
    const landed = (
      moveFocus: boolean,
      reply = ready(aiAskFixture),
      scrollAway = false,
    ) => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      const view = render(
        <AskEntry entry={entry({ status: 'thinking' })} {...props} />,
      );
      expect(scroll).toHaveBeenCalledTimes(1);
      const box = document.createElement('textarea');
      if (moveFocus) {
        document.body.append(box);
        box.focus();
      }
      // A reader scrolls up to an older answer while the reply is coming.
      if (scrollAway) window.scrollY = 400;
      view.rerender(<AskEntry entry={reply} {...props} />);
      box.remove();
      return scroll;
    };
    afterEach(() => {
      window.scrollY = 0;
    });

    it('scrolls again, once, while focus is on the heading', () => {
      const scroll = landed(false);
      expect(scroll).toHaveBeenCalledTimes(2);
      expect(scroll).toHaveBeenLastCalledWith({ block: 'start' });
      expect(scroll.mock.contexts[1]).toBe(heading().closest('article'));
    });

    it('scrolls again when an error lands too', () => {
      const scroll = landed(
        false,
        entry({
          status: 'error',
          error: new ApiError(
            500,
            'INTERNAL_ERROR',
            'Unexpected server error.',
          ),
        }),
      );
      expect(scroll).toHaveBeenCalledTimes(2);
    });

    it('does not scroll again when focus has moved', () => {
      expect(landed(true)).toHaveBeenCalledTimes(1);
    });

    it('does not scroll again when the reader scrolled away', () => {
      expect(landed(false, ready(aiAskFixture), true)).toHaveBeenCalledTimes(1);
    });
  });

  it('an answer has no panel of its own', () => {
    show(ready(aiAskFixture));
    const reply = screen.getByText('Made with AI').parentElement!;
    for (const cls of ['rounded-lg', 'border', 'p-5'])
      expect(reply.classList.contains(cls)).toBe(false);
  });

  it('its cards are flat', () => {
    const { container } = show(ready(aiAskFixture));
    const cards = container.querySelectorAll('article article');
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.classList.contains('border-t')).toBe(true);
      expect(card.classList.contains('rounded-lg')).toBe(false);
    }
  });

  it('Skip and Try again move focus without scrolling', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const field = FIELDS[0]!;
    const props = {
      now: minutesLater(5),
      focus: false,
      busy: false,
      newest: true,
      onRetry: () => {},
      onTopic: () => {},
      onStarter: () => {},
      onAnswerFollowUp: () => {},
      onSkipFollowUp: () => {},
    };
    const open = ready(aiAskFixture);
    const view = render(
      <AskEntry
        {...props}
        entry={open}
        pending={{ entryId: 1, field, changes: [] }}
      />,
    );
    fireEvent.click(button(ASK_COPY.skip));
    view.rerender(
      <AskEntry
        {...props}
        entry={{
          ...open,
          followUp: { field: fieldId(field), outcome: 'skipped' },
        }}
        pending={null}
      />,
    );
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect((focus.mock.contexts.at(-1) as HTMLElement).textContent).toBe(
      ASK_COPY.skipped,
    );
    cleanup();

    focus.mockClear();
    show(
      entry({
        status: 'error',
        error: new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error.'),
      }),
    );
    fireEvent.click(button('Try again'));
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockRestore();
  });

  it('its topic buttons rest while another answer is coming', () => {
    show(ready(outOfScopeAskFixture), { busy: true });

    expect(button('Indoor air').disabled).toBe(true);
  });
});

// Ask UX spec (owner, 27 Nov): who is answering, the answer first and
// biggest, and a real Copy control.
describe('AskEntry answer UX', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('labels the reply "AirAware" and makes its first sentence the biggest text', () => {
    show(ready(aiAskFixture));
    const label = screen.getByText(ASK_COPY.assistant);
    const lead = screen.getByText(aiAskFixture.summary!);
    expect(lead.className).toContain('text-lg');
    expect(heading().className).not.toContain('text-lg');
    expect(
      label.compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('Copy copies the answer with its cards, source and note, and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    show(ready(aiAskFixture));
    fireEvent.click(button(ASK_COPY.copy));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0]![0] as string;
    expect(text.startsWith(aiAskFixture.summary!)).toBe(true);
    expect(text).toContain(aiAskFixture.cards[0]!.title);
    expect(text).toContain('Model forecast');
    expect(text).toContain(SAFETY);
    expect(await screen.findByText(ASK_COPY.copied)).toBeTruthy();
    expect(button(ASK_COPY.copy).className).toContain('min-h-11');
    // "Copied" takes the tooltip's place, so nothing covers it.
    expect(document.querySelector('[data-part="copy-tip"]')).toBeNull();
  });

  // Owner (27 Nov): an icon, not the words; its name stays for screen
  // readers and as a tooltip, and a 44 px target. R1 A4: the tooltip shows
  // on hover and on keyboard focus (a title shows on hover only).
  it('Copy is an icon button with its name and a tooltip', async () => {
    const { container } = show(ready(aiAskFixture));
    const copy = button(ASK_COPY.copy);
    expect(copy.textContent).toBe('');
    expect(copy.getAttribute('title')).toBeNull();
    expect(copy.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(copy.className).toContain('min-w-11');
    const tip = copy.parentElement!.querySelector('[data-part="copy-tip"]')!;
    // The name already says it: the tooltip is not read a second time.
    expect(tip.textContent).toBe(ASK_COPY.copy);
    expect(tip.getAttribute('aria-hidden')).toBe('true');
    expect(copy.classList.contains('peer')).toBe(true);
    for (const shown of [
      'hidden',
      'group-hover:block',
      'peer-focus-visible:block',
    ]) {
      expect(tip.classList.contains(shown)).toBe(true);
    }
    await expectNoAxeViolations(container);
  });

  it('says when copying fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    show(ready(aiAskFixture));
    fireEvent.click(button(ASK_COPY.copy));
    expect(await screen.findByText(ASK_COPY.copyFailed)).toBeTruthy();
  });

  it('a thinking or failed reply has no Copy', () => {
    show(entry({ status: 'thinking', answer: undefined }));
    expect(screen.queryByRole('button', { name: ASK_COPY.copy })).toBeNull();
  });

  it('the off-topic reply names every topic, Commuting too, with a full stop', () => {
    show(ready(outOfScopeAskFixture, 'What is the capital of India?'));
    expect(ASK_COPY.outOfScope).toContain('commuting');
    expect(ASK_COPY.outOfScope.endsWith('.')).toBe(true);
    expect(screen.getByText(ASK_COPY.outOfScope)).toBeTruthy();
  });

  it('has no axe violations with the new controls', async () => {
    const { container } = show(ready(aiAskFixture));
    await expectNoAxeViolations(container);
  });
});
