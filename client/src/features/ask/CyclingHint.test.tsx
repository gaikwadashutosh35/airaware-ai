import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { STARTERS } from './ask.ts';
import { CyclingHint } from './CyclingHint.tsx';

const first = STARTERS[0]!.question;
const second = STARTERS[1]!.question;

// The listeners the component put on the media query, so a test can fire one.
let mediaListeners: Set<() => void>;
let reduceNow = false;
function reduceMotion(reduce: boolean) {
  reduceNow = reduce;
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return reduceNow && query.includes('prefers-reduced-motion');
    },
    media: query,
    addEventListener: (_: string, listener: () => void) =>
      mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      mediaListeners.delete(listener),
  }));
}

function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    value: hidden,
    configurable: true,
  });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

// Each step re-renders before the next timer is set, as a browser does.
async function tick(ms: number, step = 5) {
  for (let done = 0; done < ms; done += step) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(step, ms - done));
    });
  }
}

const hint = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"]');

describe('CyclingHint', () => {
  beforeEach(() => {
    mediaListeners = new Set();
    vi.useFakeTimers();
    reduceMotion(false);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setTabHidden(false);
  });

  it('is hidden from assistive tech and never takes the pointer', () => {
    const { container } = render(<CyclingHint show />);
    const el = hint(container);
    expect(el).not.toBeNull();
    expect(el?.className).toContain('pointer-events-none');
    expect(el?.className).toContain('truncate');
  });

  it('types the first starter, holds it, fades, then types the second', async () => {
    const { container } = render(<CyclingHint show />);
    await tick(35 * 5);
    expect(hint(container)?.textContent).toBe(first.slice(0, 5));
    await tick(35 * (first.length - 5));
    expect(hint(container)?.textContent).toBe(first);
    await tick(1600);
    expect(hint(container)?.className).toContain('opacity-0');
    await tick(300);
    expect(hint(container)?.textContent).toBe('');
    await tick(35 * second.length);
    expect(hint(container)?.textContent).toBe(second);
  });

  it('shows nothing while not shown, and restarts from the next starter', async () => {
    const { container, rerender } = render(<CyclingHint show />);
    await tick(35 * 3);
    rerender(<CyclingHint show={false} />);
    expect(hint(container)).toBeNull();
    await tick(10000);
    expect(hint(container)).toBeNull();
    rerender(<CyclingHint show />);
    await tick(35 * second.length);
    expect(hint(container)?.textContent).toBe(second);
  });

  it('under reduced motion shows the first starter, still', async () => {
    reduceMotion(true);
    const { container } = render(<CyclingHint show />);
    expect(hint(container)?.textContent).toBe(first);
    await tick(60000, 60000);
    expect(hint(container)?.textContent).toBe(first);
    expect(hint(container)?.className).not.toContain('opacity-0');
  });

  it('turning reduced motion on stops the hint live', async () => {
    const { container } = render(<CyclingHint show />);
    await tick(35 * 5);
    expect(hint(container)?.textContent).toBe(first.slice(0, 5));
    reduceMotion(true);
    await act(async () => {
      for (const listener of mediaListeners) listener();
    });
    expect(hint(container)?.textContent).toBe(first);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('with still set shows the first starter and runs no timer', async () => {
    const { container, rerender } = render(<CyclingHint show still />);
    expect(hint(container)?.textContent).toBe(first);
    expect(vi.getTimerCount()).toBe(0);
    await tick(10000, 1000);
    expect(hint(container)?.textContent).toBe(first);
    // Back to looping (a fresh conversation): it types again.
    rerender(<CyclingHint show />);
    await tick(35 * 3);
    expect(hint(container)?.textContent).toBe(first.slice(0, 3));
  });

  it('pauses on a hidden tab and carries on when it shows again', async () => {
    const { container } = render(<CyclingHint show />);
    await tick(35 * 5);
    setTabHidden(true);
    expect(vi.getTimerCount()).toBe(0);
    await tick(10000, 1000);
    expect(hint(container)?.textContent).toBe(first.slice(0, 5));
    setTabHidden(false);
    await tick(35 * 2);
    expect(hint(container)?.textContent).toBe(first.slice(0, 7));
  });

  it('unmounting stops every timer', async () => {
    const { unmount } = render(<CyclingHint show />);
    await tick(100);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('has no axe violations', async () => {
    vi.useRealTimers();
    const { container } = render(<CyclingHint show />);
    await expectNoAxeViolations(container);
  });
});
