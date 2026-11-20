import { Check } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { AskAnswer, AskTopic } from '../../../../shared/contracts.ts';
import { ErrorState } from '../../components/States.tsx';
import { isOlderThan } from '../../lib/clock.ts';
import { StaleBanner } from '../air-quality/AirReadout.tsx';
import { PlanCard } from '../daily-plan/PlanCard.tsx';
import { verdictFrom } from '../today/today.ts';
import { ASK_COPY, TOPICS, clockTime, shortAnswer } from './ask.ts';
import type { AskEntry as Entry } from './useAsk.ts';

const MUTED = 'text-sm text-text-dark-muted';

// The six topics. On the page the latest answer's topic is pressed (a tick,
// never colour alone); in an out-of-scope answer they are plain buttons.
export function TopicChips({
  pressed,
  busy,
  onTopic,
}: {
  // Omitted: buttons with no pressed state.
  pressed?: AskTopic | null;
  busy: boolean;
  onTopic: (topic: AskTopic, label: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {TOPICS.map(({ id, label }) => (
        <li key={id}>
          <button
            type="button"
            aria-pressed={pressed === undefined ? undefined : pressed === id}
            disabled={busy}
            onClick={() => onTopic(id, label)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-text-dark-muted px-4 aria-pressed:border-text-dark aria-pressed:bg-text-dark aria-pressed:text-surface-light disabled:opacity-60"
          >
            {pressed === id && <Check aria-hidden="true" className="size-4" />}
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}

// "{verdict} · Model forecast · updated {time}": never without its kind, and
// no time when the server had no forecast.
function airLine(answer: AskAnswer): string {
  const updated = answer.forecast
    ? ` · updated ${clockTime(answer.forecast.retrievedAt)}`
    : '';
  return `${verdictFrom(answer.air).title} · Model forecast${updated}`;
}

function Answer({
  answer,
  now,
  busy,
  onTopic,
}: {
  answer: AskAnswer;
  now: Date;
  busy: boolean;
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
        <p className={MUTED}>{`Today: ${airLine(answer)}`}</p>
        {stale && <StaleBanner />}
        <p className={MUTED}>{answer.safetyNote}</p>
      </>
    );
  }
  const { caveat } = verdictFrom(answer.air);
  return (
    <>
      <p>{shortAnswer(answer)}</p>
      <p className={MUTED}>
        {answer.generatedBy === 'ai' ? 'Made with AI' : 'Made by our rules'}
      </p>
      <p className={MUTED}>{`Based on: ${airLine(answer)}`}</p>
      {caveat && <p className={MUTED}>{caveat}</p>}
      {stale && <StaleBanner />}
      <div className="grid gap-4 md:grid-cols-2">
        {answer.cards.slice(0, 3).map((candidate) => (
          <PlanCard
            key={candidate.id}
            item={{ candidate, period: null, forYou: null, compact: false }}
            sources={answer.sources}
            level={3}
          />
        ))}
      </div>
      <p className={MUTED}>{answer.safetyNote}</p>
    </>
  );
}

// One question and its answer. The heading takes focus when the answer is
// new, and again after "Try again" (the error card goes away).
export function AskEntry({
  entry,
  now,
  focus,
  busy,
  onRetry,
  onTopic,
}: {
  entry: Entry;
  now: Date;
  focus: boolean;
  // Another answer is on its way.
  busy: boolean;
  onRetry: (id: number) => void;
  onTopic: (topic: AskTopic, label: string) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (focus) headingRef.current?.focus();
  }, [focus]);

  return (
    <article
      aria-labelledby={headingId}
      aria-busy={entry.status === 'thinking'}
      className="ask-answer flex flex-col gap-3 rounded-lg border border-rule bg-surface-light p-5 sm:p-6"
    >
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight"
      >
        {entry.echo}
      </h2>
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
            // The card goes away: keep focus on this answer.
            headingRef.current?.focus();
          }}
        />
      )}
      {entry.status === 'ready' && entry.answer && (
        <Answer answer={entry.answer} now={now} busy={busy} onTopic={onTopic} />
      )}
    </article>
  );
}
