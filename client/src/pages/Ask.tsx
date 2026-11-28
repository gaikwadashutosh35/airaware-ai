import { useId, useState } from 'react';
import type { AskTopic, HouseholdContext } from '../../../shared/contracts.ts';
import {
  ASK_COPY,
  SHOWN_STARTERS,
  STARTERS,
  answeredCount,
  clockTime,
  contextKey,
  pendingFollowUp,
  shortAnswer,
  shownAbove,
} from '../features/ask/ask.ts';
import {
  AskEntry,
  StarterButtons,
  TopicChips,
} from '../features/ask/AskEntry.tsx';
import { SHOWN_CARDS, type useAsk } from '../features/ask/useAsk.ts';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import { NEAR_YOU, type Place } from '../features/location/place.ts';
import { UseMyLocation } from '../features/location/UseMyLocation.tsx';
import { isOlderThan } from '../lib/clock.ts';
import { follow } from '../lib/navigation.ts';

// Ask AirAware as a guided chat (spec 2026-11-21): the topics and starters,
// the conversation oldest first in one surface, then the question box, pinned
// to the bottom on screens tall enough: on phones from the start, from md up
// after the first question.
// Answers come from the server's rules and guide cards, worded by Claude. A
// typed question goes only into the POST body: no form name, address or storage.
export function Ask({
  place,
  updatedAt,
  forecastLoading,
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
  // True only while the forecast loads; a failed one reserves nothing.
  forecastLoading: boolean;
  // The answers on screen, saved or not.
  context: HouseholdContext;
  now: Date;
  ask: ReturnType<typeof useAsk>;
  onChoosePlace: (place: Place) => void;
  onLocateStart: () => void;
  onLocate: (place: Place) => void;
}) {
  const [question, setQuestion] = useState('');
  // The last text sent from the box, and the text put back after a failure.
  const [sent, setSent] = useState<string | null>(null);
  const [refilled, setRefilled] = useState<string | null>(null);
  const inputId = useId();
  const latest = ask.entries.at(-1);
  // Answers already here when the page opens keep focus where it is; a
  // question sent from Today on the way here (still thinking) takes it, so it
  // shows at the end of the thread and is announced.
  const [openedWith] = useState(
    latest?.status === 'thinking' ? undefined : latest?.id,
  );
  // A failed send hands its text back (only to an empty box); the retry that
  // works empties it again. Adjusted while rendering, not in an effect.
  const asked = latest?.request && 'question' in latest.request;
  const askedText = asked
    ? (latest.request as { question: string }).question
    : null;
  if (sent !== null && latest?.status === 'error' && askedText === sent) {
    if (!question) setQuestion(sent);
    setSent(null);
    setRefilled(sent);
  } else if (refilled !== null && latest?.status === 'ready') {
    if (askedText === refilled && question === refilled) setQuestion('');
    setRefilled(null);
  }
  const pending = pendingFollowUp(ask.entries, context, ask.skipped);

  const status = !latest
    ? ''
    : latest.note
      ? latest.note
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
  const askStarter = (starter: string) =>
    ask.send({ question: starter }, starter);
  // Answers whose context lines match the last answer that showed them
  // (owner, 27 Nov: "seen first, not every chat").
  const repeats = new Set<number>();
  let shownKey: string | null = null;
  for (const entry of ask.entries) {
    const key =
      entry.status === 'ready' && entry.answer
        ? contextKey(entry.answer)
        : null;
    if (key === null) continue;
    if (key === shownKey) repeats.add(entry.id);
    shownKey = key;
  }

  // "Also still applies (see above)": only cards still shown above.
  const named = shownAbove(ask.entries, SHOWN_CARDS);

  return (
    // A centred reading column, 56rem (896 px), narrower than the other tabs
    // (owner, 27 Nov: Ask UX spec §5.1, "shorter is good for UI").
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 md:gap-4">
      <div data-part="title-block" className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {ASK_COPY.heading}
        </h1>
        <p className="text-sm text-text-dark">{ASK_COPY.intro}</p>
        {place && (
          <p className="text-sm text-text-dark">
            {`Using: ${place.label === NEAR_YOU ? 'the model forecast near you (approximate)' : `the ${place.label} model forecast`}`}
            {updatedAt
              ? `, retrieved ${clockTime(updatedAt)}${isOlderThan(updatedAt, now, 60) ? ' · Not current' : ''}`
              : forecastLoading && (
                  // Holds the line's length until the forecast lands, so the
                  // words after it do not move (PF-01). Never read or shown.
                  // Same locale-aware format as the real time.
                  <span aria-hidden="true" className="invisible">
                    {`, retrieved ${clockTime(new Date(2000, 0, 1, 22, 22).toISOString())}`}
                  </span>
                )}
            {/* Loaded nothing and not loading: say so (Ask UX spec §13). */}
            {!updatedAt &&
              !forecastLoading &&
              `, ${ASK_COPY.forecastUnavailable}`}
            {` · ${answeredCount(context)} of 10 household questions answered · `}
            <a
              href="/app/profile"
              onClick={(event) => {
                // The link leaves with the page: focus the page it opened.
                if (follow(event, '/app/profile')) {
                  document
                    .getElementById('main')
                    ?.focus({ preventScroll: true });
                }
              }}
              aria-label="Edit your answers in My Profile"
              // A 44 px target from padding; the text does not move (R1 A5).
              className="-mx-2.5 px-2.5 py-3.5 font-medium text-text-dark underline"
            >
              Edit
            </a>
          </p>
        )}
      </div>
      <output className="sr-only">{status}</output>

      {!place ? (
        <div className="flex flex-col gap-6 rounded-lg border border-rule card-surface relative z-[1] p-5 sm:p-6">
          <LocationSearch onSelect={onChoosePlace} />
          <UseMyLocation onLocateStart={onLocateStart} onLocate={onLocate} />
        </div>
      ) : (
        <>
          {/* Ask UX spec §7 (owner, 27 Nov): a welcome until the first
              question, 4 starters, the topics under "More topics". */}
          <div className="flex flex-col gap-4 rounded-lg border border-rule card-surface p-5 sm:p-6">
            {ask.entries.length === 0 && (
              <p className="text-lg font-semibold">{ASK_COPY.welcome}</p>
            )}
            <StarterButtons
              questions={STARTERS.slice(0, SHOWN_STARTERS)}
              busy={ask.thinking}
              onStarter={askStarter}
            />
            <details>
              <summary className="min-h-11 cursor-pointer py-2 font-medium">
                {ASK_COPY.moreTopics}
              </summary>
              <div className="flex flex-col gap-3 pt-2">
                <TopicChips busy={ask.thinking} onTopic={askTopic} />
                <StarterButtons
                  questions={STARTERS.slice(SHOWN_STARTERS)}
                  busy={ask.thinking}
                  onStarter={askStarter}
                />
              </div>
            </details>
          </div>
          {ask.entries.length > 0 && (
            <section
              aria-label={ASK_COPY.conversation}
              data-part="ask-thread"
              className="flex flex-col gap-6 rounded-lg border border-rule card-surface p-5 sm:p-6 [&>article+article]:border-t [&>article+article]:border-rule [&>article+article]:pt-6"
            >
              {ask.entries.map((entry) => (
                <AskEntry
                  key={entry.id}
                  entry={entry}
                  now={now}
                  focus={entry === latest && entry.id !== openedWith}
                  busy={ask.thinking}
                  newest={entry === latest}
                  repeat={repeats.has(entry.id)}
                  shown={named.get(entry.id) ?? []}
                  pending={pending?.entryId === entry.id ? pending : null}
                  onRetry={ask.retry}
                  onTopic={askTopic}
                  onStarter={askStarter}
                  onAnswerFollowUp={(field, value, label) =>
                    ask.answerFollowUp(entry.id, field, value, label)
                  }
                  onSkipFollowUp={(field) => ask.skipFollowUp(entry.id, field)}
                />
              ))}
            </section>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const typed = question.trim();
              if (!typed) return;
              ask.send({ question: typed }, typed);
              setQuestion('');
              setSent(typed);
              setRefilled(null);
            }}
            data-part="ask-composer"
            data-pinned={ask.entries.length > 0 ? '' : undefined}
            className={
              ask.entries.length > 0
                ? 'z-[1] [@media(min-height:30.2rem)]:sticky [@media(min-height:30.2rem)]:bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:[@media(min-height:30.2rem)]:bottom-0'
                : 'max-md:z-[1] max-md:[@media(min-height:30.2rem)]:sticky max-md:[@media(min-height:30.2rem)]:bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]'
            }
          >
            <div
              data-part="ask-composer-panel"
              className="flex flex-col gap-1 rounded-lg border border-rule card-surface p-5 sm:p-6"
            >
              <label htmlFor={inputId} className="font-medium">
                {ASK_COPY.inputLabel}
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <div className="relative min-w-0 flex-[1_1_10rem]">
                  {/* A fixed placeholder (owner, 27 Nov: Ask UX spec §11). */}
                  <textarea
                    id={inputId}
                    rows={1}
                    value={question}
                    placeholder={ASK_COPY.placeholder}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || event.shiftKey) return;
                      event.preventDefault();
                      if (
                        event.nativeEvent.isComposing ||
                        event.keyCode === 229
                      )
                        return;
                      if (!ask.thinking && question.trim())
                        event.currentTarget.form?.requestSubmit();
                    }}
                    required
                    maxLength={200}
                    enterKeyHint="send"
                    autoComplete="off"
                    className="field-sizing-content max-h-[calc(4lh+1.5rem)] block min-h-12 w-full resize-none overflow-y-auto rounded-md border border-text-dark bg-surface-light px-3 py-3 text-text-dark placeholder:text-text-dark-muted"
                  />
                </div>
                <button
                  type="submit"
                  disabled={ask.thinking || !question.trim()}
                  className="min-h-12 rounded-md bg-primary px-4 font-semibold text-text-dark disabled:opacity-60"
                >
                  {ASK_COPY.send}
                </button>
              </div>
              {/* R1 A5: padding only into free space (3 px of the 4 px gap
                  above, as boxes snap to whole pixels; the panel's padding
                  below), so the box does not grow (AK-13) and Send and the
                  question box keep their edge. 44 px where the credit is
                  one line; where it wraps on a phone, the second line's
                  link takes the overlap, so each gets less (owner ruling
                  needed for more). relative: the next line's text does not
                  take a link's lower half. The ring sits inside the box, so
                  it stays whole on the phone bar or the window's edge. */}
              <p
                data-part="ask-credit"
                className="text-xs text-text-dark-muted"
              >
                Forecasts:{' '}
                <a
                  href="https://open-meteo.com/"
                  className="relative pt-0.75 pb-4.5 underline focus-visible:outline-offset-[-2px] sm:pb-6.5"
                >
                  Open-Meteo.com
                </a>{' '}
                (CC BY 4.0), based on CAMS ·{' '}
                <a
                  href="/privacy"
                  className="relative -mx-0.5 px-0.5 pt-0.75 pb-4.5 underline focus-visible:outline-offset-[-2px] sm:pb-6.5"
                >
                  Privacy
                </a>
              </p>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
