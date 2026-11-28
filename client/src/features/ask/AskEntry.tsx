import { Check, Copy } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { AskAnswer, AskTopic } from '../../../../shared/contracts.ts';
import { ErrorState } from '../../components/States.tsx';
import { isOlderThan } from '../../lib/clock.ts';
import { StaleBanner } from '../air-quality/AirReadout.tsx';
import { PlanCard } from '../daily-plan/PlanCard.tsx';
import { fieldId } from '../daily-plan/householdFields.ts';
import { mergedLimitations, verdictFrom } from '../today/today.ts';
import {
  ASK_COPY,
  TOPICS,
  clockTime,
  shortAnswer,
  suggestionsFor,
  type PendingFollowUp,
} from './ask.ts';
import { SHOWN_CARDS, type AskEntry as Entry } from './useAsk.ts';

const MUTED = 'text-sm text-text-dark-muted';

const CHIP =
  'inline-flex min-h-11 items-center rounded-full border border-text-dark-muted px-4 disabled:opacity-60';
const STARTER =
  'min-h-11 rounded-full border border-text-dark-muted px-4 text-left text-sm disabled:opacity-60';

// The six topics, as plain buttons: the thread already shows what was asked.
export function TopicChips({
  busy,
  onTopic,
}: {
  busy: boolean;
  onTopic: (topic: AskTopic, label: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {TOPICS.map(({ id, label }) => (
        <li key={id}>
          <button
            type="button"
            disabled={busy}
            onClick={() => onTopic(id, label)}
            className={CHIP}
          >
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}

// Starter questions as buttons: the Ask page's, and "You could also ask:".
export function StarterButtons({
  questions,
  busy,
  onStarter,
}: {
  questions: Array<{ question: string }>;
  busy: boolean;
  onStarter: (question: string) => void;
}) {
  return (
    <ul className="flex flex-col items-start gap-2">
      {questions.map(({ question }) => (
        <li key={question}>
          <button
            type="button"
            disabled={busy}
            onClick={() => onStarter(question)}
            className={STARTER}
          >
            {question}
          </button>
        </li>
      ))}
    </ul>
  );
}

// "{verdict} · Model forecast · Open-Meteo · retrieved {time}", Open-Meteo
// linking to the answer's source; with no forecast, the verdict alone: no
// kind, provider or time to show.
function AirLine({ answer }: { answer: AskAnswer }) {
  const { title } = verdictFrom(answer.air);
  const { forecast } = answer;
  if (!forecast) return <>{title}</>;
  return (
    <>
      {`${title} · Model forecast · `}
      <a href={forecast.sourceUrl} className="underline">
        Open-Meteo
      </a>
      {` · retrieved ${clockTime(forecast.retrievedAt)}`}
    </>
  );
}

// The text "Copy answer" puts on the clipboard: what the reply says, its
// cards, what it was based on and the note (Ask UX spec §11, owner 27 Nov).
function answerText(answer: AskAnswer, shown: string[]): string {
  const { title } = verdictFrom(answer.air);
  const based = answer.forecast
    ? `Based on: ${title} · Model forecast · ${answer.forecast.provider} · retrieved ${clockTime(answer.forecast.retrievedAt)}`
    : `Based on: ${title}`;
  const cards = answer.cards
    .filter((c) => !shown.includes(c.id))
    .slice(0, SHOWN_CARDS)
    .map((c) => `- ${c.title}: ${c.text}`);
  return [shortAnswer(answer), ...cards, based, answer.safetyNote].join('\n');
}

// A real Copy control, an icon (owner, 27 Nov) named "Copy answer" for
// screen readers and as a tooltip; its result is said in a live region, and
// the icon turns to a tick once copied.
// The tooltip (R1 A4) is CSS only: shown on hover and on keyboard focus, in
// the empty space right of the button, 8 px clear of the focus ring, so it
// covers nothing; the result replaces it. aria-hidden: the name says it.
function CopyAnswer({ text }: { text: string }) {
  const [result, setResult] = useState('');
  const Icon = result === ASK_COPY.copied ? Check : Copy;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="group relative">
        <button
          type="button"
          aria-label={ASK_COPY.copy}
          onClick={() => {
            navigator.clipboard
              .writeText(text)
              .then(() => setResult(ASK_COPY.copied))
              .catch(() => setResult(ASK_COPY.copyFailed));
          }}
          className="peer inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-dark-muted hover:bg-text-dark/5 hover:text-text-dark"
        >
          <Icon aria-hidden="true" className="size-5" />
        </button>
        {!result && (
          <span
            aria-hidden="true"
            data-part="copy-tip"
            className="absolute top-1/2 left-full hidden -translate-y-1/2 pl-2 group-hover:block peer-focus-visible:block"
          >
            <span className="block rounded-md bg-text-dark px-2 py-1 text-sm whitespace-nowrap text-surface-light">
              {ASK_COPY.copy}
            </span>
          </span>
        )}
      </div>
      <output className={MUTED}>{result}</output>
    </div>
  );
}

function Answer({
  answer,
  now,
  busy,
  repeat,
  shown = [],
  onTopic,
}: {
  answer: AskAnswer;
  now: Date;
  busy: boolean;
  // The previous answer said the same context lines: leave them out
  // (owner, 27 Nov). "Not current" still shows.
  repeat: boolean;
  // Cards already shown above (an answer to a question back): left out and
  // named as still applying (owner, 27 Nov).
  shown?: string[];
  onTopic: (topic: AskTopic, label: string) => void;
}) {
  const stale =
    answer.forecast !== null &&
    isOlderThan(answer.forecast.retrievedAt, now, 60);

  if (answer.topic === 'out_of_scope') {
    return (
      <>
        <p>{ASK_COPY.outOfScope}</p>
        <TopicChips busy={busy} onTopic={onTopic} />
      </>
    );
  }
  if (answer.topic === 'medical') {
    return (
      <>
        <p>{ASK_COPY.medical}</p>
        <p className={MUTED}>
          Today: <AirLine answer={answer} />
        </p>
        {stale && <StaleBanner />}
        <p className={MUTED}>{answer.safetyNote}</p>
        {/* J32 (owner, 28 Nov): a way on to an air topic. */}
        <TopicChips busy={busy} onTopic={onTopic} />
      </>
    );
  }
  const { caveat } = verdictFrom(answer.air);
  return (
    <>
      {/* The answer first and biggest (Ask UX spec §14). */}
      <p className="text-lg">{shortAnswer(answer)}</p>
      {!repeat && (
        <>
          <p className={MUTED}>
            {answer.generatedBy === 'ai' ? 'Made with AI' : 'Made by our rules'}
          </p>
          <p className={MUTED}>
            Based on: <AirLine answer={answer} />
          </p>
          {caveat && <p className={MUTED}>{caveat}</p>}
        </>
      )}
      {stale && <StaleBanner />}
      {answer.forecast && !repeat && (
        <details className={MUTED}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
            Sources and limitations
          </summary>
          <ul className="list-disc pl-5">
            {mergedLimitations(answer.forecast.limitations).map(
              (limitation) => (
                <li key={limitation}>{limitation}</li>
              ),
            )}
          </ul>
        </details>
      )}
      <div className="flex flex-col gap-3">
        {answer.cards
          .filter((c) => !shown.includes(c.id))
          .slice(0, SHOWN_CARDS)
          .map((candidate) => (
            <PlanCard
              key={candidate.id}
              item={{ candidate, period: null, forYou: null, compact: false }}
              sources={answer.sources}
              level={3}
              flat
            />
          ))}
      </div>
      {answer.cards.some((c) => shown.includes(c.id)) && (
        <p className={MUTED}>
          {`${ASK_COPY.stillApplies} ${answer.cards
            .filter((c) => shown.includes(c.id))
            .map((c) => c.title)
            .join('; ')}.`}
        </p>
      )}
      {!repeat && <p className={MUTED}>{answer.safetyNote}</p>}
      <CopyAnswer text={answerText(answer, shown)} />
    </>
  );
}

// One exchange: your message, then AirAware's reply. Your message's heading
// takes focus when the reply is new, and again after "Try again" (the error
// card goes away). Only the newest reply carries the question back and the
// suggestions.
export function AskEntry({
  entry,
  now,
  focus,
  busy,
  newest,
  repeat = false,
  shown,
  pending,
  onRetry,
  onTopic,
  onStarter,
  onAnswerFollowUp,
  onSkipFollowUp,
}: {
  entry: Entry;
  now: Date;
  focus: boolean;
  // Another answer is on its way.
  busy: boolean;
  newest: boolean;
  // The answer before said the same context lines (see contextKey).
  repeat?: boolean;
  // Cards it may name as still applying: only those still shown above
  // (shownAbove); defaults to the entry's own list.
  shown?: string[];
  // The question back, when it belongs to this reply.
  pending: PendingFollowUp | null;
  onRetry: (id: number) => void;
  onTopic: (topic: AskTopic, label: string) => void;
  onStarter: (question: string) => void;
  onAnswerFollowUp: (field: string, value: string, label: string) => void;
  onSkipFollowUp: (field: string) => void;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const outcomeRef = useRef<HTMLParagraphElement>(null);
  // Set by Skip: the skipped line takes focus once it shows.
  const focusOutcome = useRef(false);
  const headingId = useId();
  const answer = entry.status === 'ready' ? entry.answer : undefined;
  // A topic answer's topic, or the one a "Noted" reply follows.
  const topic =
    answer && answer.topic !== 'medical' && answer.topic !== 'out_of_scope'
      ? answer.topic
      : (entry.topic ?? null);

  // Where the page stood when this exchange was scrolled to (or retried).
  const scrolledTo = useRef<number | null>(null);
  useEffect(() => {
    if (!focus) return;
    // Instant: no smooth scroll to wait for, so focus never races it.
    articleRef.current?.scrollIntoView({ block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
    scrolledTo.current = window.scrollY;
  }, [focus]);
  // AK-20: the reply grows below the short placeholder, past the pinned Ask
  // box. When it lands, scroll to the top once more (no new focus), but only
  // if focus is still on it and the page has not moved: a reply never yanks
  // someone who scrolled away to read an older answer.
  const thinking = entry.status === 'thinking';
  const wasThinking = useRef(thinking);
  useEffect(() => {
    if (thinking && !wasThinking.current) scrolledTo.current = window.scrollY;
    if (
      wasThinking.current &&
      !thinking &&
      focus &&
      document.activeElement === headingRef.current &&
      scrolledTo.current !== null &&
      Math.abs(window.scrollY - scrolledTo.current) <= 2
    ) {
      articleRef.current?.scrollIntoView({ block: 'start' });
    }
    wasThinking.current = thinking;
  }, [thinking, focus]);
  useEffect(() => {
    if (entry.followUp && focusOutcome.current) {
      focusOutcome.current = false;
      outcomeRef.current?.focus({ preventScroll: true });
    }
  }, [entry.followUp]);

  return (
    <article
      ref={articleRef}
      aria-labelledby={headingId}
      aria-busy={entry.status === 'thinking'}
      className="ask-answer flex flex-col gap-3"
    >
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-br-sm border border-transparent bg-text-dark px-4 py-3 text-base font-semibold text-surface-light"
      >
        <span className="sr-only">
          {entry.said === 'asked'
            ? ASK_COPY.askedPrefix
            : ASK_COPY.answeredPrefix}
        </span>{' '}
        {/* An answer to a question back shows the question with it (owner,
            27 Nov): "Is your home near a busy road? Yes". */}
        {entry.said === 'answered' && entry.about
          ? `${entry.about} ${entry.echo}`
          : entry.echo}
      </h2>
      <div className="flex flex-col gap-3">
        {/* Who answers (Ask UX spec §14), small and once per reply. */}
        <p className="text-xs font-semibold tracking-wide text-text-dark-muted uppercase">
          {ASK_COPY.assistant}
        </p>
        {entry.note && <p>{entry.note}</p>}
        {entry.status === 'thinking' && (
          <>
            <p className="text-text-dark-muted">{ASK_COPY.thinking}</p>
            <div
              aria-hidden="true"
              className="h-4 w-3/4 animate-pulse rounded bg-text-dark/10 motion-reduce:animate-none"
            />
          </>
        )}
        {entry.status === 'error' && entry.error && (
          <ErrorState
            error={entry.error}
            title={ASK_COPY.errorTitle}
            fallback={ASK_COPY.errorFallback}
            onRetry={() => {
              onRetry(entry.id);
              // The card goes away: keep focus on this exchange.
              headingRef.current?.focus({ preventScroll: true });
            }}
          />
        )}
        {answer && (
          <Answer
            answer={answer}
            now={now}
            busy={busy}
            repeat={repeat}
            shown={shown ?? entry.shown}
            onTopic={onTopic}
          />
        )}
        {pending && (
          <div className="flex flex-col gap-2 border-t border-rule pt-3">
            <p className={MUTED}>{ASK_COPY.followUpIntro}</p>
            <fieldset>
              <legend className="font-semibold">{pending.field.label}</legend>
              <ul className="mt-2 flex flex-wrap gap-2">
                {(
                  pending.field.options ?? [
                    ['yes', 'Yes'],
                    ['no', 'No'],
                  ]
                ).map(([value, label]) => (
                  <li key={value}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onAnswerFollowUp(fieldId(pending.field), value, label)
                      }
                      className={CHIP}
                    >
                      {label}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      focusOutcome.current = true;
                      onSkipFollowUp(fieldId(pending.field));
                    }}
                    className={CHIP}
                  >
                    {ASK_COPY.skip}
                  </button>
                </li>
              </ul>
            </fieldset>
            <p className={MUTED}>{ASK_COPY.followUpNote}</p>
          </div>
        )}
        {/* An answer shows as your own message below (owner, 27 Nov), so
            only Skip leaves a line here. */}
        {entry.followUp?.outcome === 'skipped' && (
          <p ref={outcomeRef} tabIndex={-1} className={MUTED}>
            {ASK_COPY.skipped}
          </p>
        )}
        {newest && topic && (
          <div className="flex flex-col gap-2 border-t border-rule pt-3">
            <p className="text-sm font-medium">{ASK_COPY.alsoAsk}</p>
            <StarterButtons
              questions={suggestionsFor(topic)}
              busy={busy}
              onStarter={onStarter}
            />
          </div>
        )}
      </div>
    </article>
  );
}
