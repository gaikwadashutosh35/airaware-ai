import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  currentToken,
  forgetSession,
  savingAvailable,
  tokenForSave,
} from '../../lib/supabase.ts';
import {
  deleteAccount,
  getPreferences,
  savePreferences,
} from '../../services/api.ts';
import {
  FIELDS,
  GROUPS,
  fieldId,
  toAnswers,
  toContext,
  type Answers,
} from './householdFields.ts';

const NOTE =
  'Saved on this browser only. Clearing your browser data or switching devices loses it.';
const SAVED = 'Saved on this browser.';
const UNAVAILABLE =
  "Saving isn't available right now. Your answers are still on screen.";
const NOT_SET_UP = "Saving isn't set up on this site.";
const LOAD_FAILED = "Your saved answers couldn't be loaded right now.";
const DELETED = 'Deleted. Nothing is saved now.';
const DELETE_FAILED = 'Nothing was deleted. Try again in a moment.';

export function HouseholdPreferencesForm() {
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState(savingAvailable ? '' : NOT_SET_UP);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const noteId = useId();
  const idPrefix = useId();

  // Saved answers load only for an existing session: opening the page never
  // creates an account.
  useEffect(() => {
    if (!savingAvailable) return;
    const controller = new AbortController();
    currentToken()
      .then((token) =>
        token ? getPreferences(token, controller.signal) : null,
      )
      .then((saved) => {
        if (saved) setAnswers(toAnswers(saved.context));
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus(LOAD_FAILED);
      });
    return () => controller.abort();
  }, []);

  // The confirming step takes focus, on its safe choice.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const token = await tokenForSave();
      await savePreferences(token, toContext(answers));
      setStatus(SAVED);
    } catch {
      setStatus(UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  async function deleteEverything() {
    setBusy(true);
    try {
      const token = await currentToken();
      if (token) await deleteAccount(token);
      await forgetSession();
      setAnswers({});
      setConfirming(false);
      setStatus(DELETED);
    } catch {
      setStatus(DELETE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  const disabled = !savingAvailable || busy;
  const buttonClass = 'min-h-11 rounded-md border border-text-dark px-4';

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-lg border border-rule p-5 sm:p-6"
    >
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
        Your household (optional)
      </h2>
      <p className="max-w-prose text-text-dark-muted">
        Answers make the daily plan fit your routine and home. Every question is
        optional, and none asks about health conditions.
      </p>
      <form
        onSubmit={(event) => void save(event)}
        className="flex flex-col gap-6"
      >
        {GROUPS.map(([group, legend]) => (
          <fieldset key={group} className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">{legend}</legend>
            {FIELDS.filter((field) => field.group === group).map((field) => {
              const id = `${idPrefix}-${fieldId(field)}`;
              return (
                <div key={id} className="flex flex-col gap-1">
                  <label htmlFor={id}>{field.label}</label>
                  <select
                    id={id}
                    value={answers[fieldId(field)] ?? ''}
                    onChange={(event) =>
                      setAnswers({
                        ...answers,
                        [fieldId(field)]: event.target.value,
                      })
                    }
                    className="min-h-11 max-w-sm rounded-md border border-text-dark bg-surface-light px-3 text-text-dark"
                  >
                    <option value="">Not answered</option>
                    {(
                      field.options ?? [
                        ['yes', 'Yes'],
                        ['no', 'No'],
                      ]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </fieldset>
        ))}
        <p id={noteId} className="text-sm">
          {NOTE}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={disabled}
            aria-describedby={noteId}
            className={buttonClass}
          >
            Save my answers
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setConfirming(true)}
            className={buttonClass}
          >
            Delete my saved data
          </button>
        </div>
        {confirming && (
          <fieldset className="flex flex-col gap-3 rounded-md border border-text-dark p-4">
            <legend className="px-1">
              This deletes your saved answers and plans from AirAware. It
              can&apos;t be undone.
            </legend>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteEverything()}
                className={buttonClass}
              >
                Delete everything
              </button>
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setConfirming(false)}
                className={buttonClass}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        )}
      </form>
      <output className="block min-h-6 text-sm">{status}</output>
    </section>
  );
}
