import { useId, useRef, useState } from 'react';
import { CyclingHint } from '../ask/CyclingHint.tsx';
import { navigate } from '../../lib/navigation.ts';

const STARTERS = [
  'What should I consider before a morning walk today?',
  'When does it make sense to open my windows?',
  'How can I improve my indoor air?',
];

// "Ask AirAware anything": the question goes to Ask in memory, never into
// the address, so it cannot reach browser history or server logs (§7.4). It
// goes on to Claude only after the server's checks.
export function AskBox({
  onAsk,
  active,
  started,
  busy = false,
}: {
  onAsk: (question: string) => void;
  // Today is the page on screen (the box stays mounted, hidden, on others).
  active: boolean;
  // A question has been asked: the hint stops looping.
  started: boolean;
  // An Ask answer is on its way: Ask would ignore a new question, so the box
  // rests rather than leave Today with it (Ask UX audit, 27 Nov).
  busy?: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const inputId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-rule card-surface p-5 sm:p-6"
    >
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
        Ask AirAware anything
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const asked = question.trim();
          if (!asked || busy) return;
          onAsk(asked);
          setQuestion('');
          navigate('/app/ask');
          // The box hides with Today: focus the page it opened.
          document.getElementById('main')?.focus({ preventScroll: true });
        }}
        className="flex flex-col gap-1"
      >
        <label htmlFor={inputId} className="font-medium">
          Ask about your air, home or day
        </label>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-[1_1_10rem]">
            <CyclingHint
              show={active && !focused && question === ''}
              still={started}
            />
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              required
              maxLength={200}
              enterKeyHint="send"
              autoComplete="off"
              className="block min-h-12 w-full rounded-md border border-text-dark bg-surface-light px-3 text-text-dark"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 rounded-md bg-primary px-4 font-semibold text-text-dark disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
      <ul className="flex flex-wrap gap-2">
        {STARTERS.map((starter) => (
          <li key={starter}>
            <button
              type="button"
              onClick={() => {
                setQuestion(starter);
                inputRef.current?.focus({ preventScroll: true });
              }}
              className="min-h-11 rounded-full border border-text-dark-muted px-4 text-left text-sm"
            >
              {starter}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
