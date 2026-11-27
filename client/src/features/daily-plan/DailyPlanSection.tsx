import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AirAssessment,
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
import { topRecommendation } from '../today/today.ts';
import { NOT_SET_UP } from './HouseholdPreferencesForm.tsx';
import { PlanCard } from './PlanCard.tsx';
import { PlanView } from './PlanView.tsx';
import {
  NO_AIR,
  NO_CARD,
  PLAN_STALE,
  planAirLine,
  type PlanReport,
} from './planDisplay.ts';

const LOADING = 'Building your plan. This can take up to 30 seconds.';
const READY = 'Your plan is ready.';
const BUILD_FAILED = 'Something went wrong building your plan.';
const SAVED = 'Saved to your anonymous account. This is the plan as saved.';
// F-01: the save note, for a plan rather than answers.
const SAVE_PLAN_NOTE =
  "Saving creates an anonymous account (no email or name). Your plan is stored on AirAware's database host, and this browser keeps the sign-in. Delete it any time in My Profile. Clearing this browser's data loses access but does not delete it.";
const LIMIT = 'You can keep up to 20 saved plans. Delete one to save another.';
const SAVE_FAILED = "Saving isn't available right now.";
const RATE_LIMITED = 'Too many requests. Try again in a minute.';

function saveFailure(error: unknown): string {
  if (!(error instanceof ApiError)) return SAVE_FAILED;
  if (error.status === 409) return LIMIT;
  return error.code === 'RATE_LIMITED' ? RATE_LIMITED : SAVE_FAILED;
}

interface Built {
  plan: DailyPlan;
  // The stale check's fallback when the plan has no forecast.
  builtAt: Date;
  // The answers it was built with, to notice later changes.
  builtWith: string;
  // Sent again unchanged by "Save plan".
  body: PlanBody;
  // The saved plan's id, once the server saved it.
  savedId: string | null;
}

type Status =
  { kind: 'idle' } | { kind: 'building' } | { kind: 'error'; error: ApiError };

// Outlined, like "Not now": with the full day open, Send stays Today's one
// teal-filled control (G-05; owner, 27 Nov).
const saveClass =
  'min-h-11 rounded-md border border-text-dark px-4 font-medium text-text-dark disabled:opacity-60';

// "Your recommendation for today": the plan's top card, with the full day
// folded below. It builds by itself while Today or My Home is shown, from the chosen
// place and the answers on screen: when there is no plan yet, the answers
// changed, or the plan is over an hour old (D3). Building never creates an
// account; only "Save plan" does. The dashboard
// remounts this section for a new place, so an old place's plan (or a late
// reply for it) never shows under a new one.
export function DailyPlanSection({
  place,
  context,
  now,
  active,
  verdictLevel,
  forecastCurrent,
  onSaved,
  onPlan,
  deletedPlanId = null,
}: {
  place: Place | null;
  context: HouseholdContext;
  // The running clock, for the stale check.
  now: Date;
  // True while Today or My Home is shown: the plan builds only then.
  active: boolean;
  // The level of the verdict on screen, null when none is shown. The plan
  // names the air it used when there is none or it is another level.
  verdictLevel: AirAssessment['level'] | null;
  // The forecast is ready and not over an hour old: after a failed build, the
  // page says it still holds.
  forecastCurrent: boolean;
  onSaved: () => void;
  // What this area shows (nothing, building, an error with a retry, a stale
  // plan or the current one): My Home mirrors it.
  onPlan?: (report: PlanReport) => void;
  // The last plan deleted from the list: if it is the one saved here, the
  // plan on screen is no longer saved.
  deletedPlanId?: string | null;
}) {
  const [built, setBuilt] = useState<Built | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  // The one live region: building, ready, and save results.
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
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
    setMessage(LOADING);
    try {
      const plan = await buildDailyPlan(body, controller.signal);
      if (controller.signal.aborted) return;
      setBuilt({ plan, builtAt: new Date(), builtWith, body, savedId: null });
      setStatus({ kind: 'idle' });
      setMessage(READY);
    } catch (error) {
      if (controller.signal.aborted) return;
      // ErrorState is an alert of its own.
      setMessage('');
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
    setMessage('');
    try {
      const token = await tokenForSave();
      const saved = await savePlan(token, built.body);
      // Show what the server saved, which can differ from what was shown.
      setBuilt({
        ...built,
        plan: saved.plan,
        // The device's clock, like `now`: the hour counts from the save.
        builtAt: new Date(),
        savedId: saved.id,
      });
      setMessage(SAVED);
      onSaved();
    } catch (error) {
      setMessage(saveFailure(error));
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
  // Measured on the device's own clock, so a wrong clock cannot loop.
  const due =
    active &&
    place !== null &&
    status.kind === 'idle' &&
    !saving &&
    (built === null ||
      JSON.stringify(context) !== built.builtWith ||
      isOlderThan(built.builtAt.toISOString(), now, 60));
  // A stable "build again" for My Home's Try again.
  const buildRef = useRef(build);
  useEffect(() => {
    buildRef.current = build;
  });
  const retry = useCallback(() => void buildRef.current(), []);
  // What this area shows, for My Home: never a plan Today hides, and
  // nothing once the forecast behind it is stale.
  const report = useMemo((): PlanReport => {
    if (status.kind === 'building') return { kind: 'building' };
    if (status.kind === 'error') {
      return { kind: 'error', error: status.error, retry };
    }
    if (!built) return { kind: 'none' };
    return stale ? { kind: 'stale' } : { kind: 'ready', plan: built.plan };
  }, [status, built, stale, retry]);
  const sendReport = useEffectEvent((next: PlanReport) => onPlan?.(next));
  useEffect(() => {
    sendReport(report);
  }, [report]);
  const startBuild = useEffectEvent(() => void build());
  useEffect(() => {
    if (!due) return;
    // A tick later, so React's development double-run sends one request.
    const timer = setTimeout(() => startBuild(), 0);
    return () => clearTimeout(timer);
  }, [due]);
  const topItem = built ? topRecommendation(built.plan) : null;
  // No answers, nothing to say "for you" about (B2).
  const top =
    topItem && Object.keys(context).length === 0
      ? { ...topItem, forYou: null }
      : topItem;
  // Saved, and not deleted since: only then may the page say so.
  const isSaved = built?.savedId != null && built.savedId !== deletedPlanId;
  const shown = message === SAVED && !isSaved ? '' : message;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-rule card-surface p-4 sm:gap-4 sm:p-6"
    >
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold tracking-tight sm:text-2xl"
      >
        Your recommendation for today
      </h2>
      {!place && <p className="text-sm">Choose a place first.</p>}
      {/* Only "ready" is for screen readers alone: the rest is read too. */}
      <output className={shown === READY ? 'sr-only' : 'block min-h-6 text-sm'}>
        {shown}
      </output>
      {/* Also in the tick before the first build starts, so the page below
          does not jump when the build begins. */}
      {(status.kind === 'building' ||
        (place !== null && status.kind === 'idle' && built === null)) && (
        <Loading
          label="Finding your recommendation…"
          // As tall as the ready plan (the rules plan, measured at 320, 360,
          // 390, 640, 1024 and 1280 wide), so nothing below moves. The full
          // day starts open (owner, 27 Nov): + its 60svh scroll box.
          className="min-h-[calc(24.6rem+60svh)] min-[360px]:min-h-[calc(23.3rem+60svh)] min-[390px]:min-h-[calc(21.7rem+60svh)] sm:min-h-[calc(17rem+60svh)] lg:min-h-[calc(21.9rem+60svh)] xl:min-h-[calc(18.6rem+60svh)]"
        />
      )}
      {status.kind === 'error' && (
        <>
          <ErrorState
            error={status.error}
            onRetry={() => {
              void build();
              // "Try again" goes as the build starts: keep focus here.
              headingRef.current?.focus();
            }}
            fallback={BUILD_FAILED}
            title="We couldn't build your recommendation."
          />
          {forecastCurrent && (
            <p className="text-sm">
              Your forecast on this page is still up to date.
            </p>
          )}
        </>
      )}
      {status.kind === 'idle' && built && (
        <>
          {stale && <p className="font-semibold">{PLAN_STALE}</p>}
          {/* The full day hides the air check, so say it here. */}
          {!built.plan.forecast && <p className="font-semibold">{NO_AIR}</p>}
          {built.plan.forecast &&
            (verdictLevel === null ||
              built.plan.air.level !== verdictLevel) && (
              <p className="text-sm text-text-dark-muted">
                {planAirLine(built.plan.air, built.plan.forecast)}
              </p>
            )}
          {top ? (
            <PlanCard item={top} sources={built.plan.sources} level={3} />
          ) : (
            <p>{NO_CARD}</p>
          )}
          {/* Who made it and the safety note stay in view (audit 3.3). */}
          <p className="text-sm text-text-dark-muted">
            {`${built.plan.generatedBy === 'ai' ? 'Made with AI' : 'Made by our rules'}. ${built.plan.safetyNote}`}
          </p>
          {/* Instant open: it is opened often, so no animation. Opened, it
              scrolls in its own box, so the card does not stretch down the
              page (owner, 27 Nov). Its Why? and Save plan controls take
              keyboard focus, so no tabindex is needed to reach it. It starts
              open (owner, 27 Nov); the summary can still fold it. */}
          <details open>
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">
              See your full day
            </summary>
            {/* pl-1 pb-1: room for the 2px focus ring (offset 2px) of
                controls at the box's edge, which overflow would clip.
                relative: the sr-only labels inside are absolute, and would
                otherwise escape the clip and lengthen the page. */}
            <div className="relative flex max-h-[60svh] flex-col gap-6 overflow-y-auto pt-2 pr-2 pb-1 pl-1">
              <PlanView plan={built.plan} hideAir />
              {!isSaved && (
                <div className="flex flex-col items-start gap-2">
                  <button
                    type="button"
                    disabled={!savingAvailable || saving}
                    aria-describedby={noteId}
                    onClick={() => void save()}
                    className={saveClass}
                  >
                    Save plan
                  </button>
                  <p id={noteId} className="text-sm">
                    {savingAvailable ? SAVE_PLAN_NOTE : NOT_SET_UP}
                  </p>
                </div>
              )}
            </div>
          </details>
        </>
      )}
    </section>
  );
}
