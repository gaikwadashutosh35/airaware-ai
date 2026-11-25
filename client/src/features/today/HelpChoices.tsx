import { useId } from 'react';
import { follow } from '../../lib/navigation.ts';
import { CHOICES, type Topic } from './helpChoices.ts';

// "What would you like help with?": four ways in. Outdoor and Family open
// Ask with their topic held in memory, never in the address.
export function HelpChoices({ onAsk }: { onAsk: (topic: Topic) => void }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-rule bg-surface-light p-5 sm:p-6"
    >
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
        What would you like help with?
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CHOICES.map(({ title, line, to, topic, Icon }) => (
          <li key={title}>
            <a
              href={to}
              onClick={(event) => {
                if (!follow(event, to)) return;
                if (topic) onAsk(topic);
                // The choice hides with Today: focus the page it opened.
                document.getElementById('main')?.focus();
              }}
              className="press flex h-full min-h-11 items-start gap-3 rounded-lg border border-text-dark-muted p-4 hover:border-text-dark"
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 flex-none" />
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-text-dark-muted">{line}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
