import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../test/axe.ts';
import { AppNav } from './AppNav.tsx';

const ITEMS = [
  ['Today', 'Today', '/app'],
  ['Ask AirAware', 'Ask', '/app/ask'],
  ['My Home', 'Home', '/app/home'],
  ['Better Habits', 'Habits', '/app/habits'],
  ['My Profile', 'Profile', '/app/profile'],
] as const;

describe('AppNav', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('marks the current page', () => {
    render(<AppNav page="profile" />);

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.getAttribute('href'))).toEqual([
      '/app/profile',
    ]);
    // Not colour alone: a ring on desktop, an underline in forced colours.
    expect(current[0]!.className).toContain('md:aria-[current=page]:shadow-');
    expect(current[0]!.className).toContain(
      'forced-colors:aria-[current=page]:underline',
    );
  });

  it('names each item by its label', async () => {
    const { container } = render(<AppNav page="today" />);

    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const [name, short, href] of ITEMS) {
      const link = screen.getByRole('link', { name });
      expect(link.getAttribute('href')).toBe(href);
      // The short phone label is part of the accessible name (WCAG 2.5.3).
      expect(link.textContent).toContain(short);
      expect(name).toContain(short);
      expect(nav.contains(link)).toBe(true);
    }
    await expectNoAxeViolations(container);
  });

  // Final review, Important 4: at 1024 px, long places wrapped the labels.
  it('labels never wrap', () => {
    render(<AppNav page="today" />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.classList.contains('whitespace-nowrap')).toBe(true);
    }
  });

  // F-38: the bar clears the notch and the home indicator, with a 0 fallback.
  it('the bar pads for the safe areas on three sides', () => {
    render(<AppNav page="today" />);
    const bar = screen.getByRole('navigation', { name: 'Main' }).className;
    for (const side of ['left', 'right', 'bottom']) {
      expect(bar).toContain(`env(safe-area-inset-${side},0px)`);
    }
    expect(bar).not.toContain('max(');
  });

  it('navigates in place, keeping the place in the address', () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    window.history.pushState({}, '', '/app?place=Pune&lat=18.52&lon=73.86');
    render(<AppNav page="today" />);

    const click = fireEvent.click(
      screen.getByRole('link', { name: 'My Home' }),
    );

    expect(click).toBe(false); // default (a page load) prevented
    expect(window.location.pathname).toBe('/app/home');
    expect(window.location.search).toBe('?place=Pune&lat=18.52&lon=73.86');
  });
});
