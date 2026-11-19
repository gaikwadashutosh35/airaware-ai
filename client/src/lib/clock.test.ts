import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isOlderThan, useNow } from './clock.ts';

const now = new Date('2026-11-19T12:00:00Z');

describe('isOlderThan', () => {
  it('is older only past the limit', () => {
    expect(isOlderThan('2026-11-19T10:59:00Z', now, 60)).toBe(true);
    expect(isOlderThan('2026-11-19T11:00:00Z', now, 60)).toBe(false);
    expect(isOlderThan('2026-11-19T11:30:00Z', now, 60)).toBe(false);
    expect(isOlderThan('2026-11-19T13:00:00Z', now, 60)).toBe(false);
  });

  it('treats an unreadable time as old, never current', () => {
    expect(isOlderThan('not a time', now, 60)).toBe(true);
  });
});

describe('useNow', () => {
  function setVisibility(state: DocumentVisibilityState) {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('ticks every minute', () => {
    const { result } = renderHook(() => useNow());
    expect(result.current).toEqual(now);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current).toEqual(new Date(now.getTime() + 60_000));
  });

  // Review Focus 5: a tab hidden for hours must not wait for the next tick.
  it('updates at once when the tab is shown again', () => {
    const { result } = renderHook(() => useNow());
    const later = new Date(now.getTime() + 3 * 60 * 60_000);
    vi.setSystemTime(later);

    act(() => {
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toEqual(later);
  });

  it('stops ticking after unmount', () => {
    const { unmount } = renderHook(() => useNow());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
