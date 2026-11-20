import { Check } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { HouseholdContext } from '../../../shared/contracts.ts';
import { NOT_SET_UP } from '../features/daily-plan/HouseholdPreferencesForm.tsx';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import type { Place } from '../features/location/place.ts';
import { UseMyLocation } from '../features/location/UseMyLocation.tsx';
import {
  choicesFrom,
  contextFrom,
  toggleDay,
  type DayChoice,
  type OnboardingChoices,
  type TravelMode,
} from '../features/onboarding/onboarding.ts';
import { savingAvailable } from '../lib/supabase.ts';

const SAVE_FAILED =
  "Saving isn't available right now. Untick Remember to continue without saving.";

const DAYS: [DayChoice, string][] = [
  ['office', 'Office commute'],
  ['school', 'School commute'],
  ['exercise', 'Outdoor exercise'],
  ['home', 'Work from home'],
];
const TRAVEL: [TravelMode, string][] = [
  ['walk', 'Walk'],
  ['cycle', 'Cycle'],
  ['two_wheeler', 'Two-wheeler'],
  ['car', 'Car'],
  ['public_transport', 'Public transport'],
];
const FUEL: [NonNullable<OnboardingChoices['fuel']>, string][] = [
  ['lpg', 'LPG'],
  ['electric', 'Electric'],
  ['biomass', 'Wood, coal or crop waste'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer not to say'],
];
const YES_NO: [boolean, string][] = [
  [true, 'Yes'],
  [false, 'No'],
];
const ROAD: [NonNullable<OnboardingChoices['busyRoad']>, string][] = [
  ['yes', 'Yes'],
  ['no', 'No'],
  ['unknown', 'Not sure'],
];

// A native checkbox or radio styled as a chip; a tick marks the chosen state,
// so it never rests on colour alone.
function Chip({
  type,
  name,
  label,
  checked,
  disabled,
  onChange,
}: {
  type: 'checkbox' | 'radio';
  name: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-text-dark-muted px-4 has-checked:border-text-dark has-checked:bg-text-dark has-checked:text-surface-light has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <Check
        aria-hidden="true"
        className="hidden size-4 group-has-checked:inline"
      />
      {label}
    </label>
  );
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

// Three short steps; 2 and 3 can be skipped (Skip leaves that step's answers
// as they were). Steps are page state, not part of the address.
export function Welcome({
  place,
  placeIsSearched,
  context,
  onChoosePlace,
  onLocateStart,
  onLocate,
  onFinish,
}: {
  place: Place | null;
  placeIsSearched: boolean;
  context: HouseholdContext;
  onChoosePlace: (place: Place) => void;
  onLocateStart: () => void;
  onLocate: (place: Place) => void;
  // Rejects when the save failed.
  onFinish: (result: {
    context: HouseholdContext;
    remember: boolean;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(place ? 2 : 1);
  const [choices, setChoices] = useState(() => choicesFrom(context));
  const [answered, setAnswered] = useState({ day: false, home: false });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Focus follows the step, but not on first arrival.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
    moved.current = true;
  }, [step]);

  const set = (patch: Partial<OnboardingChoices>) =>
    setChoices((current) => ({ ...current, ...patch }));

  async function finish(withHome: boolean) {
    const used = { day: answered.day, home: withHome };
    const result = contextFrom(choices, context);
    // Skipped steps keep their answers as they were.
    if (!used.day) {
      delete result.routine;
      if (context.routine) result.routine = context.routine;
    }
    if (!used.home) {
      delete result.home;
      if (context.home) result.home = context.home;
    }
    setBusy(true);
    setError('');
    try {
      await onFinish({ context: result, remember });
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  const title = [
    'Where should we check air quality?',
    'What does your typical day look like?',
    'Tell us a little about your home.',
  ][step - 1];
  const button = 'min-h-11 rounded-md border border-text-dark px-4';
  const primary =
    'min-h-11 rounded-md bg-primary px-5 font-semibold text-bg disabled:opacity-60';

  return (
    <div className="flex w-full max-w-xl flex-col gap-6 md:mx-auto">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text-dark-muted">
          Step {step} of 3
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight"
        >
          {title}
        </h1>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <LocationSearch
            onSelect={(next) => {
              onChoosePlace(next);
              setStep(2);
            }}
          />
          <UseMyLocation
            onLocateStart={onLocateStart}
            onLocate={(next) => {
              onLocate(next);
              setStep(2);
            }}
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <p className="text-text-dark-muted">
            Choose any that fit. All optional.
          </p>
          <Group legend="Your day">
            {DAYS.map(([value, label]) => (
              <Chip
                key={value}
                type="checkbox"
                name="day"
                label={label}
                checked={choices.days.has(value)}
                onChange={() => set({ days: toggleDay(choices.days, value) })}
              />
            ))}
          </Group>
          {choices.days.has('office') && (
            <Group legend="How do you usually travel?">
              {TRAVEL.map(([value, label]) => (
                <Chip
                  key={value}
                  type="radio"
                  name="travel"
                  label={label}
                  checked={choices.travel === value}
                  onChange={() => set({ travel: value })}
                />
              ))}
            </Group>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <Group legend="What do you mostly cook with?">
            {FUEL.map(([value, label]) => (
              <Chip
                key={value}
                type="radio"
                name="fuel"
                label={label}
                checked={choices.fuel === value}
                onChange={() => set({ fuel: value })}
              />
            ))}
          </Group>
          <Group legend="Kitchen exhaust or chimney?">
            {YES_NO.map(([value, label]) => (
              <Chip
                key={label}
                type="radio"
                name="exhaust"
                label={label}
                checked={choices.exhaust === value}
                onChange={() => set({ exhaust: value })}
              />
            ))}
          </Group>
          <Group legend="Air purifier?">
            {YES_NO.map(([value, label]) => (
              <Chip
                key={label}
                type="radio"
                name="purifier"
                label={label}
                checked={choices.purifier === value}
                onChange={() => set({ purifier: value })}
              />
            ))}
          </Group>
          <Group legend="Near a busy road?">
            {ROAD.map(([value, label]) => (
              <Chip
                key={value}
                type="radio"
                name="road"
                label={label}
                checked={choices.busyRoad === value}
                onChange={() => set({ busyRoad: value })}
              />
            ))}
          </Group>
          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={remember}
                disabled={!savingAvailable}
                onChange={(event) => setRemember(event.target.checked)}
                className="size-5"
              />
              Remember on this device
            </label>
            <p className="text-sm text-text-dark-muted">
              {savingAvailable
                ? 'Creates an anonymous save on this device. Delete it any time in My Profile.'
                : NOT_SET_UP}
            </p>
            {remember && !placeIsSearched && (
              <p className="text-sm text-text-dark-muted">
                Your location isn't saved; only your answers are.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="font-semibold">
              {error}
            </p>
          )}
        </div>
      )}

      {step > 1 && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={button}
            onClick={() => setStep(step === 3 ? 2 : 1)}
          >
            Back
          </button>
          {step === 2 ? (
            <button
              type="button"
              className={primary}
              onClick={() => {
                setAnswered((a) => ({ ...a, day: true }));
                setStep(3);
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className={primary}
              disabled={busy}
              onClick={() => void finish(true)}
            >
              See my air
            </button>
          )}
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => (step === 2 ? setStep(3) : void finish(false))}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
