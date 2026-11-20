import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRequest } from './useRequest.ts';

// A load the test settles by hand, one promise per call.
function loads() {
  const pending: Array<{
    resolve: (value: string) => void;
    reject: (error: unknown) => void;
  }> = [];
  const load = () =>
    new Promise<string>((resolve, reject) => {
      pending.push({ resolve, reject });
    });
  return { load, pending };
}

describe('useRequest', () => {
  it('a retry for the same key keeps the previous data while it loads', async () => {
    const { load, pending } = loads();
    const { result } = renderHook(() => useRequest('k1', load));
    await act(async () => pending[0]!.resolve('A'));
    expect(result.current.state).toEqual({ status: 'ready', data: 'A' });

    act(() => result.current.retry());
    expect(result.current.state.status).toBe('loading');
    expect(result.current.previous).toBe('A');

    await act(async () => pending[1]!.resolve('B'));
    expect(result.current.state).toEqual({ status: 'ready', data: 'B' });
    expect(result.current.previous).toBeNull();
  });

  it('a new key has no previous data', async () => {
    const { load, pending } = loads();
    const { result, rerender } = renderHook(
      ({ key }) => useRequest(key, load),
      { initialProps: { key: 'k1' } },
    );
    await act(async () => pending[0]!.resolve('A'));

    rerender({ key: 'k2' });
    expect(result.current.state.status).toBe('loading');
    expect(result.current.previous).toBeNull();
  });

  it('a failed retry has no previous data', async () => {
    const { load, pending } = loads();
    const { result } = renderHook(() => useRequest('k1', load));
    await act(async () => pending[0]!.resolve('A'));

    act(() => result.current.retry());
    await act(async () => pending[1]!.reject(new Error('down')));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.previous).toBeNull();
  });
});
