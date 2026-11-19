import { useEffect, useId, useRef, useState } from 'react';
import type {
  DailyPlan,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import { ErrorState, Loading } from '../../components/States.tsx';
import { isOlderThan } from '../../lib/clock.ts';
import { savingAvailable, tokenForSave } from '../../lib/supabase.ts';
import {
  ApiError,
  buildDailyPlan,
  savePlan,
  type PlanBody,
} from '../../services/api.ts';
import type { Place } from '../location/place.ts';
import { NOT_SET_UP, SAVE_NOTE } from './HouseholdPreferencesForm.tsx';
import { PlanView } from './PlanView.tsx';

const LOADING = 'Building your plan. This can take up to 30 seconds.';
const BUILD_FAILED = 'Something went wrong building your plan.';
const CHANGED = 'Your answers changed. Build the plan again to use them.';
const STALE =
  'This plan was built more than an hour ago. Build it again for the latest forecast.';
const SAVED = 'Saved on this browser. This is the plan as saved.';
const LIMIT = 'You can keep up to 20 saved plans. Delete one to save another.';
const SAVE_FAILED = "Saving isn't available right now.";

interface Built {
  plan: DailyPlan;
  // The stale check's fallback when the plan has no forecast.
  builtAt: Date;
  // The answers it was built with, to notice later changes.
  builtWith: string;
  // Sent again unchanged by "Save plan".
  body: PlanBody;
  saved: boolean;
}

type Status =
  { kind: 'idle' } | { kind: 'building' } | { kind: 'error'; error: ApiError };

const buttonClass =
  'min-h-11 rounded-md border border-text-dark px-4 disabled:opacity-60';

// "Your daily plan": builds from the chosen place and the answers on screen.
// Building never creates an account; only "Save plan" does. The dashboard
// remounts this section for a new place, so an old place's plan (or a late
// reply for it) never shows under a new one.
export function DailyPlanSection({
  place,
  context,
  now,
  onSaved,
}: {
  place: Place | null;
  context: HouseholdContext;
  // The running clock, for the stale check.
  now: Date;
  onSaved: () => void;
}) {
  const [built, setBuilt] = useState<Built | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const request = useRef<AbortController | null>(null);
  const headingId = useId();
  const hintId = useId();
  const noteId = useId();

  useEffect(() => () => request.current?.abort(), []);

  async function build() {
    if (!place) return;
    const body: PlanBody = {
      place: {
        label: place.label,
        latitude: Number(place.latitude.toFixed(2)),
        longitude: Number(place.longitude.toFixed(2)),
      },
      householdContext: context,
    };
    const builtWith = JSON.stringify(context);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus({ kind: 'building' });
    setSaveStatus('');
    try {
      const plan = await buildDailyPlan(body, controller.signal);
      if (controller.signal.aborted) return;
      setBuilt({ plan, builtAt: new Date(), builtWith, body, saved: false });
      setStatus({ kind: 'idle' });
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus({
        kind: 'error',
        error:
          error instanceof ApiError
            ? error
            : new ApiError(0, 'UNEXPECTED_RESPONSE', BUILD_FAILED),
      });
    }
  }

  async function save() {
    if (!built) return;
    setSaving(true);
    setSaveStatus('');
    try {
      const token = await tokenForSave();
      const saved = await savePlan(token, built.body);
      // Show what the server saved, which can differ from what was shown.
      setBuilt({
        ...built,
        plan: saved.plan,
        builtAt: new Date(saved.savedAt),
        saved: true,
      });
      setSaveStatus(SAVED);
      onSaved();
    } catch (error) {
      setSaveStatus(
        error instanceof ApiError && error.status === 409 ? LIMIT : SAVE_FAILED,
      );
    } finally {
      setSaving(false);
    }
  }

  const stale =
    built !== null &&
    isOlderThan(
      built.plan.forecast?.retrievedAt ?? built.builtAt.toISOString(),
      now,
      60,
    );
  const changed = built !== null && JSON.stringify(context) !== built.builtWith;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-lg border border-rule p-5 sm:p-6"
    >
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
        Your daily plan
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!place || status.kind === 'building'}
          aria-describedby={place ? undefined : hintId}
          onClick={() => void build()}
          className={buttonClass}
        >
          Build my daily plan
        </button>
        {!place && (
          <p id={hintId} className="text-sm">
            Choose a place first.
          </p>
        )}
      </div>

      {status.kind === 'building' && (
        <>
          <output className="block">{LOADING}</output>
          <Loading label="Building your plan" />
        </>
      )}
      {status.kind === 'error' && (
        <ErrorState
          error={status.error}
          onRetry={() => void build()}
          fallback={BUILD_FAILED}
        />
      )}
      {status.kind === 'idle' && built && (
        <>
          {changed && <p className="font-semibold">{CHANGED}</p>}
          {stale && <p className="font-semibold">{STALE}</p>}
          <PlanView plan={built.plan} />
          {!built.saved && (
            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                disabled={!savingAvailable || saving}
                aria-describedby={noteId}
                onClick={() => void save()}
                className={buttonClass}
              >
                Save plan
              </button>
              <p id={noteId} className="text-sm">
                {savingAvailable ? SAVE_NOTE : NOT_SET_UP}
              </p>
            </div>
          )}
          <output className="block min-h-6 text-sm">{saveStatus}</output>
        </>
      )}
    </section>
  );
}
