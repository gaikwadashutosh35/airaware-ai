import { useEffect, useId, useRef, useState } from 'react';
import type {
  HouseholdContext,
  SavedPlace,
  SavedPlan,
  SavedPreferences,
} from '../../../shared/contracts.ts';
import { formatDateTime } from '../features/air-quality/forecast.ts';
import { HouseholdPreferencesForm } from '../features/daily-plan/HouseholdPreferencesForm.tsx';
import { PlanView } from '../features/daily-plan/PlanView.tsx';
import { SavedPlansList } from '../features/daily-plan/SavedPlansList.tsx';

const FORGET_FAILED = 'Nothing was changed. Try again in a moment.';

// My Profile: the household answers, the remembered place and saved plans.
// The shell keeps the answers, so they survive leaving this page unsaved.
// A saved plan opens here, below the list, as a snapshot (spec §7.7).
export function Profile({
  formKey,
  context,
  onContextChange,
  onLoaded,
  remembered,
  onForget,
  onDeleted,
  listVersion,
  onPlanDeleted,
}: {
  // Bumped after Welcome, so the form shows its answers.
  formKey: number;
  context: HouseholdContext;
  onContextChange: (context: HouseholdContext) => void;
  onLoaded: (saved: SavedPreferences | null) => void;
  remembered: SavedPlace | null;
  onForget: () => Promise<void>;
  onDeleted: () => void;
  listVersion: number;
  onPlanDeleted: (id: string) => void;
}) {
  const placeHeadingId = useId();
  const placeHeadingRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState('');
  const [opened, setOpened] = useState<SavedPlan | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // The plan opens below the list: take focus there, so it is never lost.
  useEffect(() => {
    if (opened) bannerRef.current?.focus();
  }, [opened]);

  function close() {
    const id = opened?.id;
    setOpened(null);
    // Back to the Open button that showed it.
    [...(listRef.current?.querySelectorAll<HTMLElement>('[data-open]') ?? [])]
      .find((button) => button.dataset.open === id)
      ?.focus();
  }

  async function forget() {
    setStatus('');
    try {
      await onForget();
      setStatus('This place is no longer remembered.');
      placeHeadingRef.current?.focus();
    } catch {
      setStatus(FORGET_FAILED);
    }
  }

  return (
    <>
      <h1
        data-part="title-block"
        className="text-3xl font-semibold tracking-tight"
      >
        My Profile
      </h1>
      <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr] lg:items-start">
        {(remembered || status) && (
          <section
            aria-labelledby={placeHeadingId}
            className="flex flex-col items-start gap-3 rounded-lg border border-rule bg-surface-light p-5 sm:p-6 lg:col-start-2"
          >
            <h2
              id={placeHeadingId}
              ref={placeHeadingRef}
              tabIndex={-1}
              className="text-xl font-semibold"
            >
              Your place
            </h2>
            {remembered && (
              <>
                <p>Remembered place: {remembered.label}</p>
                <button
                  type="button"
                  onClick={() => void forget()}
                  className="min-h-11 rounded-md border border-text-dark px-4"
                >
                  Forget this place
                </button>
              </>
            )}
            <output className="block min-h-6">{status}</output>
          </section>
        )}
        <HouseholdPreferencesForm
          key={formKey}
          initial={context}
          onChange={onContextChange}
          onLoaded={onLoaded}
          skipLoad={formKey > 0}
          version={listVersion}
          onDeleted={() => {
            setOpened(null);
            onDeleted();
          }}
        >
          <div
            ref={listRef}
            className="flex min-w-0 flex-col gap-6 lg:col-start-2"
          >
            <SavedPlansList
              version={listVersion}
              onOpen={setOpened}
              onDeleted={(id) => {
                setOpened((current) => (current?.id === id ? null : current));
                onPlanDeleted(id);
              }}
            />
            {opened && (
              <div className="flex flex-col gap-4 rounded-lg border border-rule bg-surface-light p-5 sm:p-6">
                <div
                  ref={bannerRef}
                  tabIndex={-1}
                  className="flex flex-col items-start gap-3 border-l-4 border-text-dark pl-4"
                >
                  <p className="font-semibold">
                    Saved plan from {formatDateTime(opened.savedAt)}. This is a
                    snapshot, not current air information.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="min-h-11 rounded-md border border-text-dark px-4"
                  >
                    Close
                  </button>
                </div>
                <PlanView plan={opened.plan} snapshot />
              </div>
            )}
          </div>
        </HouseholdPreferencesForm>
      </div>
    </>
  );
}
