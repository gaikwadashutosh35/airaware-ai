import { useEffect, useId, useRef, useState } from 'react';
import type {
  SavedPlan,
  SavedPlanSummary,
} from '../../../../shared/contracts.ts';
import { currentToken, savingAvailable } from '../../lib/supabase.ts';
import { deletePlan, getPlan, listPlans } from '../../services/api.ts';
import { formatDateTime } from '../air-quality/forecast.ts';

const EMPTY = 'No saved plans yet.';
const LOAD_FAILED = "Your saved plans couldn't be loaded right now.";
const OPEN_FAILED = "This saved plan couldn't be opened right now.";
const DELETE_FAILED = 'Nothing was deleted. Try again in a moment.';
const DELETED = 'Saved plan deleted.';

type State =
  | { kind: 'hidden' }
  | { kind: 'error' }
  | { kind: 'ready'; plans: SavedPlanSummary[] };

// Each action asks for the session again, so an expired token is refreshed
// rather than reused. No session means nothing to act on.
async function token(): Promise<string> {
  const value = await currentToken();
  if (!value) throw new Error('No session.');
  return value;
}

const buttonClass = 'min-h-11 rounded-md border border-text-dark px-4';

// This browser's saved plans. Shown only for an existing session: listing
// never creates an account.
export function SavedPlansList({
  version,
  onOpen,
  onDeleted,
}: {
  // Bumped after a save or "Delete everything": load the list again.
  version: number;
  onOpen: (saved: SavedPlan) => void;
  onDeleted: (id: string) => void;
}) {
  const [state, setState] = useState<State>({ kind: 'hidden' });
  const [reloads, setReloads] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (!savingAvailable) return;
    let active = true;
    currentToken()
      .then(async (value) => {
        const plans = value ? await listPlans(value) : null;
        if (!active) return;
        setState(
          plans
            ? {
                kind: 'ready',
                plans: [...plans].sort(
                  (a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt),
                ),
              }
            : { kind: 'hidden' },
        );
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [version, reloads]);

  // The confirming step takes focus, on its safe choice.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  async function open(id: string) {
    setMessage('');
    try {
      onOpen(await getPlan(await token(), id));
    } catch {
      setMessage(OPEN_FAILED);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setMessage('');
    try {
      await deletePlan(await token(), id);
      setConfirming(null);
      // The row goes at once, and focus stays in the list instead of
      // falling to the page when its button disappears.
      setState((current) =>
        current.kind === 'ready'
          ? { kind: 'ready', plans: current.plans.filter((p) => p.id !== id) }
          : current,
      );
      setMessage(DELETED);
      headingRef.current?.focus();
      onDeleted(id);
      setReloads((n) => n + 1);
    } catch {
      setMessage(DELETE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === 'hidden') return null;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-lg border border-rule p-5 sm:p-6"
    >
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight"
      >
        Saved plans
      </h2>
      {state.kind === 'error' ? (
        <p>{LOAD_FAILED}</p>
      ) : state.plans.length === 0 ? (
        <p>{EMPTY}</p>
      ) : (
        <ul aria-labelledby={headingId} className="flex flex-col gap-3">
          {state.plans.map((plan) => {
            const saved = `saved ${formatDateTime(plan.savedAt)}`;
            return (
              <li
                key={plan.id}
                className="flex flex-col gap-3 border-b border-rule pb-3"
              >
                <div className="flex min-w-0 flex-col">
                  <p className="font-medium break-words">{plan.placeLabel}</p>
                  <p className="text-sm text-text-dark-muted">
                    Saved {formatDateTime(plan.savedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    data-open={plan.id}
                    onClick={() => void open(plan.id)}
                    className={buttonClass}
                  >
                    Open
                    <span className="sr-only">
                      {' '}
                      plan for {plan.placeLabel}, {saved}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming(plan.id)}
                    className={buttonClass}
                  >
                    Delete
                    <span className="sr-only">
                      {' '}
                      plan for {plan.placeLabel}, {saved}
                    </span>
                  </button>
                </div>
                {confirming === plan.id && (
                  <fieldset className="flex flex-col gap-3 rounded-md border border-text-dark p-4">
                    <legend className="px-1">
                      Delete this saved plan? It can&apos;t be undone.
                    </legend>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(plan.id)}
                        className={buttonClass}
                      >
                        Delete plan
                      </button>
                      <button
                        ref={cancelRef}
                        type="button"
                        onClick={() => setConfirming(null)}
                        className={buttonClass}
                      >
                        Cancel
                      </button>
                    </div>
                  </fieldset>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <output className="block min-h-6 text-sm">{message}</output>
    </section>
  );
}
