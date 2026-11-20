import { useRef, useState } from 'react';
import type {
  AskAnswer,
  AskRequest,
  AskTopic,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import { ApiError, askAirAware } from '../../services/api.ts';
import type { Place } from '../location/place.ts';
import { ASK_COPY } from './ask.ts';

export type AskQuery = { question: string } | { topic: AskTopic };

export interface AskEntry {
  id: number;
  // The heading: the question typed, or the chip's label.
  echo: string;
  request: AskRequest;
  status: 'thinking' | 'ready' | 'error';
  answer?: AskAnswer;
  error?: ApiError;
}

const MAX_ENTRIES = 10;

// Ask's answers for this visit (Phase 7): in memory only, newest first, one
// request at a time. A new place or "Delete everything" starts afresh.
export function useAsk(
  place: Place | null,
  context: HouseholdContext,
  resets: number,
) {
  const key = place
    ? `${resets}|${place.label}|${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`
    : null;
  const [state, setState] = useState<{
    key: string | null;
    entries: AskEntry[];
  }>({ key, entries: [] });
  // A new key empties the list during render, so the old place's answers
  // never show, even for one frame, and never come back.
  if (state.key !== key) setState({ key, entries: [] });
  const entries = state.key === key ? state.entries : [];
  const thinking = entries.some((e) => e.status === 'thinking');
  const lastId = useRef(0);

  // A reply for an old key, or an entry no longer listed, is dropped.
  function update(sentKey: string, id: number, patch: Partial<AskEntry>) {
    setState((s) =>
      s.key === sentKey
        ? {
            key: s.key,
            entries: s.entries.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          }
        : s,
    );
  }

  async function run(sentKey: string, id: number, body: AskRequest) {
    try {
      const answer = await askAirAware(body);
      update(sentKey, id, { status: 'ready', answer });
    } catch (error) {
      update(sentKey, id, {
        status: 'error',
        error:
          error instanceof ApiError
            ? error
            : new ApiError(0, 'UNEXPECTED_RESPONSE', ASK_COPY.errorFallback),
      });
    }
  }

  function send(query: AskQuery, echo: string) {
    if (!place || !key || thinking) return;
    const request: AskRequest = {
      ...query,
      place: {
        label: place.label,
        latitude: Number(place.latitude.toFixed(2)),
        longitude: Number(place.longitude.toFixed(2)),
      },
      householdContext: context,
    };
    const entry: AskEntry = {
      id: ++lastId.current,
      echo,
      request,
      status: 'thinking',
    };
    setState((s) => ({
      key,
      entries: [entry, ...(s.key === key ? s.entries : [])].slice(
        0,
        MAX_ENTRIES,
      ),
    }));
    void run(key, entry.id, request);
  }

  // Sends the entry's own body again.
  function retry(id: number) {
    const entry = entries.find((e) => e.id === id);
    if (!key || !entry || entry.status !== 'error' || thinking) return;
    update(key, id, { status: 'thinking', error: undefined });
    void run(key, id, entry.request);
  }

  return { entries, thinking, send, retry };
}
