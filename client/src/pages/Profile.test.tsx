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

  it('has no "Your place" section until a place is remembered', async () => {
    setup(null);
    await screen.findByText(/^No saved plans yet/);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(NAMES.slice(1));
  });

  // MP-04 / F3: from lg the form is on the left, everything else on the right.
  it('puts the form left and the rest right from lg', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    const cell = (name: string) => {
      let el: HTMLElement | null = h2(name);
      while (el && !/\blg:col-start-\d\b/.test(el.className)) {
        el = el.parentElement;
      }
      return el?.className.match(/\blg:col-start-(\d)\b/)?.[1];
    };
    expect(cell('Your household (optional)')).toBe('1');
    expect(cell('Your place')).toBe('2');
    expect(cell('Saved plans')).toBe('2');
    expect(cell('Your data')).toBe('2');
  });

  // With a place the right column has three rows beside the tall form; the
  // last row takes the spare height, so the panels do not spread apart.
  it('gives the spare height to the last right-column row', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    const grid = h2('Your place').closest('.lg\\:grid-cols-2');
    expect(grid?.className).toContain('lg:grid-rows-[auto_auto_1fr]');
  });

  it('opening the page creates no account', async () => {
    setup(place);
    await screen.findByText(/^No saved plans yet/);
    expect(session.tokenForSave).not.toHaveBeenCalled();
  });
});
