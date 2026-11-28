import { useRef, useState } from 'react';
import type {
  AskAnswer,
  AskRequest,
  AskTopic,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import { ApiError, askAirAware } from '../../services/api.ts';
import {
  FIELDS,
  fieldId,
  toAnswers,
  toContext,
} from '../daily-plan/householdFields.ts';
import type { Place } from '../location/place.ts';
import { ASK_COPY } from './ask.ts';

export type AskQuery = { question: string } | { topic: AskTopic };

export interface AskEntry {
  id: number;
  // Your message: the question typed, the chip's label, or the answer tapped.
  echo: string;
  said: 'asked' | 'answered';
  // The question an answer replies to: its heading names it.
  about?: string;
  // null: a local reply ("Noted…"); nothing was sent.
  request: AskRequest | null;
  status: 'thinking' | 'ready' | 'error';
  answer?: AskAnswer;
  error?: ApiError;
  // A local reply's text.
  note?: string;
  // A local reply's topic: its "You could also ask:" follows it.
  topic?: AskTopic;
  // What became of this reply's question back.
  followUp?: {
    field: string;
    outcome: 'answered' | 'skipped';
    label?: string;
  };
  // A reply to an answer to a question back: the cards already shown in the
  // reply(s) it updates. It shows only new cards and names these as still
  // applying, so nothing repeats (owner, 27 Nov).
  shown?: string[];
}

// What a reply shows: at most 3 cards, leaving out those shown above it.
export const SHOWN_CARDS = 3;

const MAX_ENTRIES = 10;

interface Thread {
  key: string | null;
  entries: AskEntry[];
  // Questions back skipped this visit.
  skipped: ReadonlySet<string>;
}

// Ask's conversation for this visit (guided chat): in memory only, oldest
// first, one request at a time. A new place or "Delete everything" starts
// afresh. Answers to questions back go to the answers on screen, so Today's
// plan, My Home and My Profile use them too.
export function useAsk(
  place: Place | null,
  context: HouseholdContext,
  resets: number,
  onContextChange: (next: HouseholdContext) => void,
) {
  const key = place
    ? `${resets}|${place.label}|${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`
    : null;
  const empty = (k: string | null): Thread => ({
    key: k,
    entries: [],
    skipped: new Set(),
  });
  const [state, setState] = useState<Thread>(() => empty(key));
  // A new key empties the thread during render, so the old place's answers
  // never show, even for one frame, and never come back.
  if (state.key !== key) setState(empty(key));
  const thread = state.key === key ? state : empty(key);
  const { entries, skipped } = thread;
  const thinking = entries.some((e) => e.status === 'thinking');
  const lastId = useRef(0);

  // A reply for an old key, or an entry no longer listed, is dropped.
  function update(sentKey: string, id: number, patch: Partial<AskEntry>) {
    setState((s) =>
      s.key === sentKey
        ? {
            ...s,
            entries: s.entries.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          }
        : s,
    );
  }

  function append(entry: AskEntry) {
    setState((s) =>
      s.key === key
        ? { ...s, entries: [...s.entries, entry].slice(-MAX_ENTRIES) }
        : { ...empty(key), entries: [entry] },
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

  // With the answers given: a re-ask after a question back carries the new
  // answer, not the one from this render.
  function sendWith(
    query: AskQuery,
    echo: string,
    said: AskEntry['said'],
    answers: HouseholdContext,
    about?: string,
    shown?: string[],
  ) {
    if (!place || !key) return;
    // A typed question carries up to 2 earlier ones (not medical, not failed)
    // so a follow-up makes sense. Topic requests and re-asks carry none.
    const history =
      'question' in query
        ? entries
            .filter(
              (e) =>
                e.said === 'asked' &&
                e.status === 'ready' &&
                e.request &&
                'question' in e.request &&
                e.answer &&
                e.answer.topic !== 'medical',
            )
            .slice(-2)
            .map((e) => ({
              question: (e.request as { question: string }).question,
              cardIds: e.answer!.cards.slice(0, 3).map((c) => c.id),
            }))
        : [];
    const request: AskRequest = {
      ...query,
      ...(history.length && { history }),
      place: {
        label: place.label,
        latitude: Number(place.latitude.toFixed(2)),
        longitude: Number(place.longitude.toFixed(2)),
      },
      householdContext: answers,
    };
    const entry: AskEntry = {
      id: ++lastId.current,
      echo,
      said,
      about,
      request,
      status: 'thinking',
      ...(shown && { shown }),
    };
    append(entry);
    void run(key, entry.id, request);
  }

  function send(query: AskQuery, echo: string) {
    if (thinking) return;
    sendWith(query, echo, 'asked', context);
  }

  // Sends the entry's own body again.
  function retry(id: number) {
    const entry = entries.find((e) => e.id === id);
    if (!key || !entry?.request || entry.status !== 'error' || thinking) {
      return;
    }
    update(key, id, { status: 'thinking', error: undefined });
    void run(key, id, entry.request);
  }

  // Answers the question back on reply `entryId`: the answer joins the
  // answers on screen; the topic is asked again only when the answer changes
  // its cards, else AirAware notes it without a request.
  function answerFollowUp(
    entryId: number,
    field: string,
    value: string,
    label: string,
  ) {
    const entry = entries.find((e) => e.id === entryId);
    const answer = entry?.answer;
    if (!key || thinking || !entry || entry.followUp || !answer) return;
    if (answer.topic === 'medical' || answer.topic === 'out_of_scope') return;
    const next = toContext({ ...toAnswers(context), [field]: value });
    const about = FIELDS.find((f) => fieldId(f) === field)?.label;
    onContextChange(next);
    const changes =
      // An older server (a rollback) sends none.
      (answer.followUps ?? []).find((f) => f.field === field)?.changes ?? [];
    update(key, entryId, { followUp: { field, outcome: 'answered', label } });
    if (changes.includes(value)) {
      // Every card on screen above for this topic: this reply's own, and
      // those of the replies it updated in turn.
      const shown = [
        ...(entry.shown ?? []),
        ...answer.cards
          .filter((c) => !entry.shown?.includes(c.id))
          .slice(0, SHOWN_CARDS)
          .map((c) => c.id),
      ];
      sendWith({ topic: answer.topic }, label, 'answered', next, about, shown);
    } else {
      append({
        id: ++lastId.current,
        echo: label,
        said: 'answered',
        about,
        request: null,
        status: 'ready',
        note: ASK_COPY.noted,
        topic: answer.topic,
      });
    }
  }

  function skipFollowUp(entryId: number, field: string) {
    if (!key || thinking) return;
    setState((s) =>
      s.key === key
        ? {
            ...s,
            skipped: new Set([...s.skipped, field]),
            entries: s.entries.map((e) =>
              e.id === entryId && !e.followUp
                ? { ...e, followUp: { field, outcome: 'skipped' } }
                : e,
            ),
          }
        : s,
    );
  }

  return {
    entries,
    thinking,
    skipped,
    send,
    retry,
    answerFollowUp,
    skipFollowUp,
  };
}
