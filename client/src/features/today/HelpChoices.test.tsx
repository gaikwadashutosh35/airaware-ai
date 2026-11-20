import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { HelpChoices } from './HelpChoices.tsx';

const choice = (name: string) =>
  screen.getByRole('link', { name: new RegExp(`^${name}`) });

beforeEach(() => {
  window.history.replaceState(null, '', '/app?place=Pune');
});
afterEach(cleanup);

describe('HelpChoices', () => {
  it('help choices go to their pages', () => {
    const onAsk = vi.fn();
    render(<HelpChoices onAsk={onAsk} />);
    const cases = [
      ['Outdoor activities', '/app/ask', 'outdoors'],
      ['My home', '/app/home', null],
      ['My family', '/app/ask', 'family'],
      ['Greener habits', '/app/habits', null],
    ] as const;

    for (const [name, path, topic] of cases) {
      onAsk.mockClear();
      expect(choice(name).getAttribute('href')).toBe(path);
      fireEvent.click(choice(name));

      expect(window.location.pathname).toBe(path);
      // The topic stays in memory: the address keeps only the place.
      expect(window.location.search).toBe('?place=Pune');
      if (topic) expect(onAsk).toHaveBeenCalledWith(topic);
      else expect(onAsk).not.toHaveBeenCalled();
    }
  });

  it('gives each choice its line and passes axe', async () => {
    const { container } = render(<HelpChoices onAsk={vi.fn()} />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'What would you like help with?',
      }),
    ).toBeDefined();
    for (const line of [
      'Walks, exercise, commutes',
      'Cooking, windows, purifiers',
      'Children, older adults, school runs',
      'Small swaps that cut smoke and exhaust',
    ]) {
      expect(screen.getByText(line)).toBeDefined();
    }
    await expectNoAxeViolations(container);
  });
});
