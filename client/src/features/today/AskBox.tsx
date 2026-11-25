import { useId, useRef, useState } from 'react';
import { navigate } from '../../lib/navigation.ts';

const STARTERS = [
  'Can I go for a morning walk today?',
  'Is it a good idea to open my windows?',
  'How can I improve my indoor air?',
];

// "Ask AirAware anything": the question goes to Ask in memory, never into
// the address, so it cannot reach browser history or server logs (§7.4).
export function AskBox({ onAsk }: { onAsk: (question: string) => void }) {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const inputId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-rule bg-surface-light p-5 sm:p-6"
    >
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
        Ask AirAware anything
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const asked = question.trim();
          if (!asked) return;
          onAsk(asked);
          navigate('/app/ask');
          // The box hides with Today: focus the page it opened.
          document.getElementById('main')?.focus();
        }}
        className="flex flex-col gap-1"
      >
        <label htmlFor={inputId} className="font-medium">
          Ask about your air, home or day
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            required
            maxLength={200}
            enterKeyHint="send"
            autoComplete="off"
            className="min-h-12 min-w-0 flex-[1_1_10rem] rounded-md border border-text-dark bg-surface-light px-3 text-text-dark"
          />
          <button
            type="submit"
            className="min-h-12 rounded-md bg-primary px-4 font-semibold text-text-dark"
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
                inputRef.current?.focus();
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
