import { useId, useRef, useState } from 'react';
import type {
  HouseholdContext,
  SavedPlace,
  SavedPlan,
  SavedPreferences,
} from '../../../shared/contracts.ts';
import { HouseholdPreferencesForm } from '../features/daily-plan/HouseholdPreferencesForm.tsx';
import { SavedPlansList } from '../features/daily-plan/SavedPlansList.tsx';

const FORGET_FAILED = 'Nothing was changed. Try again in a moment.';

// My Profile: the household answers, the remembered place and saved plans.
// The shell keeps the answers, so they survive leaving this page unsaved.
export function Profile({
  formKey,
  context,
  onContextChange,
  onLoaded,
  remembered,
  onForget,
  onDeleted,
  listVersion,
  onOpen,
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
  onOpen: (plan: SavedPlan) => void;
  onPlanDeleted: (id: string) => void;
}) {
  const placeHeadingId = useId();
  const placeHeadingRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState('');

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
      <h1 className="text-3xl font-semibold tracking-tight">My Profile</h1>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <HouseholdPreferencesForm
          key={formKey}
          initial={context}
          onChange={onContextChange}
          onLoaded={onLoaded}
          skipLoad={formKey > 0}
          onDeleted={onDeleted}
        />
        <div className="flex flex-col gap-6">
          {(remembered || status) && (
            <section
              aria-labelledby={placeHeadingId}
              className="flex flex-col items-start gap-3 rounded-lg border border-rule p-5 sm:p-6"
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
          <SavedPlansList
            version={listVersion}
            onOpen={onOpen}
            onDeleted={onPlanDeleted}
          />
        </div>
      </div>
    </>
  );
}
