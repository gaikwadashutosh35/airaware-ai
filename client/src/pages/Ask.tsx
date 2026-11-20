import { useId, useState } from 'react';
import type { AskTopic, HouseholdContext } from '../../../shared/contracts.ts';
import {
  ASK_COPY,
  answeredCount,
  clockTime,
  shortAnswer,
  startersFor,
} from '../features/ask/ask.ts';
import { AskEntry, TopicChips } from '../features/ask/AskEntry.tsx';
import type { useAsk } from '../features/ask/useAsk.ts';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import { NEAR_YOU, type Place } from '../features/location/place.ts';
import { UseMyLocation } from '../features/location/UseMyLocation.tsx';
import { follow } from '../lib/navigation.ts';

// Ask AirAware (spec §7.4): topics, starters and a question box; answers
// come from the server's rules and guide cards. A typed question goes only
// into the POST body: no form name, address or storage.
export function Ask({
  place,
  updatedAt,
  context,
  now,
  ask,
  onChoosePlace,
  onLocateStart,
  onLocate,
}: {
  place: Place | null;
  // The shell's forecast retrieval time; null while loading or failed.
  updatedAt: string | null;
  // The answers on screen, saved or not.
  context: HouseholdContext;
  now: Date;
  ask: ReturnType<typeof useAsk>;
  onChoosePlace: (place: Place) => void;
  onLocateStart: () => void;
  onLocate: (place: Place) => void;
}) {
  const [question, setQuestion] = useState('');
  const inputId = useId();
  const latest = ask.entries[0];
  // Answers already here when the page opens keep focus where it is.
  const [openedWith] = useState(latest?.id);
  const asked =
    latest?.answer?.topic ??
    (latest && 'topic' in latest.request ? latest.request.topic : null);
  const topic: AskTopic | null =
    asked === 'medical' || asked === 'out_of_scope' ? null : asked;

  const status = !latest
    ? ''
    : latest.status === 'thinking'
      ? ASK_COPY.thinking
      : // The error card is an alert of its own.
        latest.status === 'error' || !latest.answer
        ? ''
        : latest.answer.topic === 'medical'
          ? ASK_COPY.medical
          : latest.answer.topic === 'out_of_scope'
            ? ASK_COPY.outOfScope
            : `Answer ready. ${shortAnswer(latest.answer)}`;
  const askTopic = (id: AskTopic, label: string) =>
    ask.send({ topic: id }, label);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div data-part="title-block" className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {ASK_COPY.heading}
        </h1>
        {place && (
          <p className="text-sm text-text-dark">
            {`Using: ${place.label === NEAR_YOU ? 'the model forecast near you (approximate)' : `the ${place.label} model forecast`}${updatedAt ? `, updated ${clockTime(updatedAt)}` : ''} · ${answeredCount(context)} of 10 answers · `}
            <a
              href="/app/profile"
              onClick={(event) => {
                // The link leaves with the page: focus the page it opened.
                if (follow(event, '/app/profile')) {
                  document.getElementById('main')?.focus();
                }
              }}
              aria-label="Edit your answers in My Profile"
              className="font-medium text-text-dark underline"
            >
              Edit
            </a>
          </p>
        )}
      </div>
      <output className="sr-only">{status}</output>

      {!place ? (
        <div className="flex flex-col gap-6 rounded-lg border border-rule bg-surface-light p-5 sm:p-6">
          <LocationSearch onSelect={onChoosePlace} />
          <UseMyLocation onLocateStart={onLocateStart} onLocate={onLocate} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6 rounded-lg border border-rule bg-surface-light p-5 sm:p-6">
            <TopicChips
              pressed={topic}
              busy={ask.thinking}
              onTopic={askTopic}
            />
            <ul className="flex flex-col items-start gap-2">
              {startersFor(topic).map((starter) => (
                <li key={starter.question}>
                  <button
                    type="button"
                    disabled={ask.thinking}
                    onClick={() =>
                      ask.send({ question: starter.question }, starter.question)
                    }
                    className="min-h-11 rounded-full border border-rule px-4 text-left text-sm disabled:opacity-60"
                  >
                    {starter.question}
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const typed = question.trim();
                if (!typed) return;
                ask.send({ question: typed }, typed);
                setQuestion('');
              }}
              className="flex flex-col gap-1"
            >
              <label htmlFor={inputId} className="font-medium">
                {ASK_COPY.inputLabel}
              </label>
              <div className="flex gap-2">
                <input
                  id={inputId}
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  required
                  maxLength={200}
                  enterKeyHint="send"
                  autoComplete="off"
                  className="min-h-12 min-w-0 flex-1 rounded-md border border-text-dark bg-surface-light px-3 text-text-dark"
                />
                <button
                  type="submit"
                  disabled={ask.thinking}
                  className="min-h-12 rounded-md bg-primary px-4 font-semibold text-text-dark disabled:opacity-60"
                >
                  {ASK_COPY.send}
                </button>
              </div>
            </form>
          </div>
          {ask.entries.map((entry) => (
            <AskEntry
              key={entry.id}
              entry={entry}
              now={now}
              focus={entry === latest && entry.id !== openedWith}
              busy={ask.thinking}
              onRetry={ask.retry}
              onTopic={askTopic}
            />
          ))}
        </>
      )}
    </div>
  );
}
