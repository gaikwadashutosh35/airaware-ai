import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appPage, navigate, usePath } from './navigation.ts';

function Probe() {
  return <p>{usePath()}</p>;
}

describe('navigation', () => {
  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('appPage maps every app path', () => {
    expect(appPage('/app')).toBe('today');
    expect(appPage('/app/')).toBe('today');
    for (const page of ['welcome', 'ask', 'home', 'habits', 'profile']) {
      expect(appPage(`/app/${page}`)).toBe(page);
    }
    expect(appPage('/app/unknown')).toBe('today');
  });

  it('navigate keeps the query and notifies', () => {
    window.history.pushState({}, '', '/app?place=Pune&lat=18.52&lon=73.86');
    render(<Probe />);

    act(() => navigate('/app/profile'));

    expect(screen.getByText('/app/profile')).toBeDefined();
    expect(window.location.search).toBe('?place=Pune&lat=18.52&lon=73.86');
  });

  // Final review, Important 3.
  it('navigate scrolls to the top', () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    window.history.pushState({}, '', '/app');

    navigate('/app/profile');

    expect(scroll).toHaveBeenCalledWith(0, 0);
    scroll.mockRestore();
  });

  it('back and forward switch pages without reloading', () => {
    window.history.pushState({}, '', '/app');
    render(<Probe />);
    act(() => navigate('/app/ask'));

    act(() => {
      window.history.pushState({}, '', '/app');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByText('/app')).toBeDefined();
  });
});
