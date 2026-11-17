import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../services/api.ts';

export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: ApiError };

// Runs `load` whenever `key` changes (null = nothing to load). A new key
// aborts the previous request, and an aborted request never updates state,
// so an old place's data can never appear under a new place. Idle and
// loading are derived from the key, so no state is set synchronously.
export function useRequest<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
): { state: RequestState<T>; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{
    token: string;
    state: RequestState<T>;
  } | null>(null);
  const loadRef = useRef(load);
  const token = key === null ? null : `${key}#${attempt}`;

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (token === null) return;
    const controller = new AbortController();
    loadRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setSettled({ token, state: { status: 'ready', data } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({
          token,
          state: {
            status: 'error',
            error:
              error instanceof ApiError
                ? error
                : new ApiError(
                    0,
                    'UNEXPECTED_RESPONSE',
                    'Unexpected response from the server.',
                  ),
          },
        });
      },
    );
    return () => controller.abort();
  }, [token]);

  const state: RequestState<T> =
    token === null
      ? { status: 'idle' }
      : settled?.token === token
        ? settled.state
        : { status: 'loading' };

  return { state, retry: () => setAttempt((n) => n + 1) };
}
