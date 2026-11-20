import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type {
  HouseholdContext,
  SavedPreferences,
} from '../../../../shared/contracts.ts';
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

// Shared with "Save plan".
export const SAVE_NOTE =
  'Saved on this browser only. Clearing your browser data or switching devices loses it.';
export const NOT_SET_UP = "Saving isn't set up on this site.";
const SAVED = 'Saved on this browser.';
const UNAVAILABLE =
  "Saving isn't available right now. Your answers are still on screen.";
const LOAD_FAILED = "Your saved answers couldn't be loaded right now.";
const DELETED = 'Deleted. Nothing is saved now.';
const DELETE_FAILED = 'Nothing was deleted. Try again in a moment.';

export function HouseholdPreferencesForm({
  initial,
  onChange,
  onDeleted,
  onLoaded,
  skipLoad = false,
}: {
  // Answers already given this visit, so leaving the page keeps them.
  initial?: HouseholdContext;
  // The answers on screen, saved or not: the daily plan uses them.
  onChange?: (context: HouseholdContext) => void;
  // After "Delete everything" succeeded.
  onDeleted?: () => void;
  // Once, after the first load attempt: what was saved, or null (saving not
  // set up, no session, nothing saved, or the load failed).
  onLoaded?: (saved: SavedPreferences | null) => void;
  // The answers in `initial` are already the latest (after Welcome): no
  // reload, which would merge saved answers back over cleared ones.
  skipLoad?: boolean;
} = {}) {
  // Answered questions only: a blank would hide a saved answer in the merge.
  const [answers, setAnswersState] = useState<Answers>(() =>
    Object.fromEntries(
      Object.entries(toAnswers(initial ?? {})).filter(([, value]) => value),
    ),
  );
  const onChangeRef = useRef(onChange);
  const onLoadedRef = useRef(onLoaded);
  // Read once, when the form mounts (a new key remounts it).
  const skipLoadRef = useRef(skipLoad);
  // The answers on screen, for merging a late load under them.
  const answersRef = useRef<Answers>(answers);
  // The saved-answers load, cancelled by "Delete everything".
  const loadRef = useRef<AbortController | null>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
    onLoadedRef.current = onLoaded;
  });
  function setAnswers(next: Answers) {
    answersRef.current = next;
    setAnswersState(next);
    onChangeRef.current?.(toContext(next));
  }
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
    if (skipLoadRef.current) return;
    if (!savingAvailable) {
      onLoadedRef.current?.(null);
      return;
    }
    const controller = new AbortController();
    loadRef.current = controller;
    currentToken()
      .then((token) =>
        token ? getPreferences(token, controller.signal) : null,
      )
      .then((saved) => {
        if (controller.signal.aborted) return;
        // A late load fills in saved answers but never undoes one the
        // person already changed; a delete meanwhile cancels it.
        if (saved) {
          setAnswers({ ...toAnswers(saved.context), ...answersRef.current });
        }
        onLoadedRef.current?.(saved ?? null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus(LOAD_FAILED);
        onLoadedRef.current?.(null);
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
      await savePreferences(token, { context: toContext(answers) });
      setStatus(SAVED);
    } catch {
      setStatus(UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  async function deleteEverything() {
    loadRef.current?.abort();
    setBusy(true);
    try {
      const token = await currentToken();
      if (token) await deleteAccount(token);
      await forgetSession();
      setAnswers({});
      setConfirming(false);
      setStatus(DELETED);
      onDeleted?.();
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
      className="flex flex-col gap-4 rounded-lg border border-rule bg-surface-light p-5 sm:p-6"
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
                    onChange={(event) => {
                      setAnswers({
                        ...answers,
                        [fieldId(field)]: event.target.value,
                      });
                    }}
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
          {SAVE_NOTE}
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
