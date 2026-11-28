import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
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
  ApiError,
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
  "Saving creates an anonymous account (no email or name). Your answers are stored on AirAware's database host, and this browser keeps the sign-in. Delete them any time in My Profile. Clearing this browser's data loses access but does not delete them.";
// The note's first sentence, kept beside Save.
const SAVE_LINE = 'Saving creates an anonymous account (no email or name).';
export const NOT_SET_UP = "Saving isn't set up on this site.";
const SAVED = 'Saved to your anonymous account.';
const UNAVAILABLE =
  "Saving isn't available right now. Your answers are still on screen.";
const RATE_LIMITED =
  'Too many requests. Try again in a minute. Your answers are still on screen.';
const LOAD_FAILED =
  "Your saved answers couldn't be loaded right now. Saving is off until you reload the page.";
const DELETED = 'Deleted. Nothing is saved now.';
const DELETE_FAILED = 'Nothing was deleted. Try again in a moment.';

export function HouseholdPreferencesForm({
  initial,
  onChange,
  onDeleted,
  onLoaded,
  skipLoad = false,
  version = 0,
  children,
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
  // Bumped after a save elsewhere or a delete: the session is checked again.
  version?: number;
  // Rendered between the form and "Your data", so Profile can lay the
  // sections out in two columns without the delete logic leaving this file.
  children?: ReactNode;
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
  // Answers given elsewhere (Ask AirAware's questions back) join the form,
  // so Save keeps them and a late load never undoes them. The shell already
  // has them: no onChange.
  useEffect(() => {
    const incoming = Object.entries(toAnswers(initial ?? {})).filter(
      ([, value]) => value,
    );
    if (incoming.every(([id, value]) => answersRef.current[id] === value)) {
      return;
    }
    const next = { ...answersRef.current, ...Object.fromEntries(incoming) };
    answersRef.current = next;
    setAnswersState(next);
  }, [initial]);
  const [status, setStatus] = useState(savingAvailable ? '' : NOT_SET_UP);
  const [busy, setBusy] = useState(false);
  // Saving now would overwrite answers that never arrived.
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Delete shows only when there may be something to delete: a session, or a
  // session check that failed. The check never creates an account.
  const [canDelete, setCanDelete] = useState(false);
  const [dataStatus, setDataStatus] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const dataId = useId();
  const lineId = useId();
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
        setLoadFailed(true);
        onLoadedRef.current?.(null);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!savingAvailable) return;
    let active = true;
    currentToken().then(
      (token) => {
        if (!active) return;
        setCanDelete(token !== null);
        // A new session means "Deleted" is no longer true; right after a
        // delete there is none, so that message survives this re-check.
        if (token) setDataStatus('');
      },
      () => {
        if (active) setCanDelete(true);
      },
    );
    return () => {
      active = false;
    };
  }, [version]);

  // The confirming step takes focus, on its safe choice.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    setDataStatus('');
    try {
      const token = await tokenForSave();
      // The account exists from here, even if the save below fails.
      setCanDelete(true);
      await savePreferences(token, { context: toContext(answers) });
      setStatus(SAVED);
    } catch (error) {
      setStatus(
        error instanceof ApiError && error.code === 'RATE_LIMITED'
          ? RATE_LIMITED
          : UNAVAILABLE,
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteEverything() {
    loadRef.current?.abort();
    setBusy(true);
    setDataStatus('');
    try {
      const token = await currentToken();
      if (token) await deleteAccount(token);
      await forgetSession();
      setAnswers({});
      setConfirming(false);
      setCanDelete(false);
      setLoadFailed(false);
      setStatus('');
      setDataStatus(DELETED);
      onDeleted?.();
    } catch {
      setDataStatus(DELETE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  const disabled = !savingAvailable || busy || loadFailed;
  const buttonClass =
    'min-h-11 rounded-md border border-text-dark px-4 disabled:opacity-60';
  const panel =
    'flex flex-col gap-4 rounded-lg border border-rule card-surface p-5 sm:p-6';

  return (
    <>
      <section aria-labelledby={headingId} className={`${panel} lg:col-span-2`}>
        <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
          Your household (optional)
        </h2>
        <p className="max-w-prose text-text-dark-muted">
          Answers make the daily plan fit your routine and home. Every question
          is optional, and none asks about health conditions.
        </p>
        <form
          onSubmit={(event) => void save(event)}
          className="flex flex-col gap-6"
        >
          {GROUPS.map(([group, legend]) => (
            <fieldset
              key={group}
              className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-end md:gap-x-6 lg:grid-cols-3"
            >
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
          <p id={lineId} className="text-sm">
            {SAVE_LINE}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={disabled}
              aria-describedby={`${lineId} ${noteId}`}
              className={buttonClass}
            >
              Save my answers
            </button>
          </div>
        </form>
        <output className="block min-h-6 text-sm">{status}</output>
      </section>
      {children}
      <section aria-labelledby={dataId} className={`${panel} lg:col-start-2`}>
        <h2 id={dataId} className="text-2xl font-semibold tracking-tight">
          Your data
        </h2>
        <p id={noteId} className="text-sm">
          {SAVE_NOTE}
        </p>
        {savingAvailable && canDelete && (
          <>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
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
          </>
        )}
        <output className="block min-h-6 text-sm">{dataStatus}</output>
      </section>
    </>
  );
}
