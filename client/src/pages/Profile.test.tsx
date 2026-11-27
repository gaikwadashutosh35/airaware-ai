import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Profile } from './Profile.tsx';

const session = vi.hoisted(() => ({
  currentToken: vi.fn<() => Promise<string | null>>(),
  tokenForSave: vi.fn<() => Promise<string>>(),
}));

vi.mock('../lib/supabase.ts', () => ({
  savingAvailable: true,
  currentToken: () => session.currentToken(),
  tokenForSave: () => session.tokenForSave(),
  forgetSession: () => Promise.resolve(),
}));

const place = { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 };

function setup(remembered: typeof place | null) {
  render(
    <Profile
      formKey={0}
      context={{}}
      onContextChange={() => {}}
      onLoaded={() => {}}
      remembered={remembered}
      onForget={() => Promise.resolve()}
      onDeleted={() => {}}
      listVersion={0}
      onPlanDeleted={() => {}}
    />,
  );
}

const h2 = (name: string) => screen.getByRole('heading', { level: 2, name });
const NAMES = [
  'Your place',
  'Your household (optional)',
  'Saved plans',
  'Your data',
];

beforeEach(() => {
  session.currentToken.mockResolvedValue(null);
  session.tokenForSave.mockResolvedValue('tok');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('Profile', () => {
  // MP-04: place when present, the form, Saved plans, then Your data.
  it('orders its sections in the DOM', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    const order = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(order).toEqual(NAMES);
  });

  it('its cards are see-through', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    for (const name of ['Your place', 'Your data']) {
      const card = h2(name).closest('section, div[class*="rounded-lg"]')!;
      expect(card.className).toContain('card-surface');
      expect(card.className).not.toContain('bg-surface-light');
    }
  });

  it('has no "Your place" section until a place is remembered', async () => {
    setup(null);
    await screen.findByText(/^No saved plans yet/);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(NAMES.slice(1));
  });

  // From lg the form spans the full width; "Saved plans" and "Your data"
  // sit side by side beneath it (Your place, when shown, spans the width).
  it('puts the form across the top and the two cards side by side from lg', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    const cell = (name: string) => {
      let el: HTMLElement | null = h2(name);
      while (el && !/\blg:col-(start|span)-\d\b/.test(el.className)) {
        el = el.parentElement;
      }
      return el?.className.match(/\blg:col-(?:start|span)-\d\b/)?.[0];
    };
    expect(cell('Your place')).toBe('lg:col-span-2');
    expect(cell('Your household (optional)')).toBe('lg:col-span-2');
    expect(cell('Saved plans')).toBe('lg:col-start-1');
    expect(cell('Your data')).toBe('lg:col-start-2');
    const grid = h2('Your data').closest('[class*="lg:grid-cols-2"]');
    expect(grid?.className).not.toContain('lg:grid-rows');
  });

  // Each question group: one column, two from md, three from lg.
  it('lays each question group in columns from md', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    const groups = document.querySelectorAll('form fieldset');
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group.className).toContain('md:grid-cols-2');
      expect(group.className).toContain('lg:grid-cols-3');
    }
  });

  // Selects in a row line up even when one label wraps to two lines.
  it('aligns the fields of each question group to the row bottom from md', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    const groups = document.querySelectorAll('form fieldset');
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group.className).toContain('md:items-end');
    }
  });

  it('opening the page creates no account', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    expect(session.tokenForSave).not.toHaveBeenCalled();
  });
});
