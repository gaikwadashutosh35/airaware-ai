import type { HouseholdContext } from '../../../../shared/contracts.ts';

// The Welcome steps' choices, and how they map onto the existing household
// answers. Unticked or unchosen means unanswered, never "no".
type Routine = NonNullable<HouseholdContext['routine']>;
type Home = NonNullable<HouseholdContext['home']>;

export type DayChoice = 'office' | 'school' | 'exercise' | 'home';
export type TravelMode = Exclude<
  NonNullable<Routine['commuteMode']>,
  'work_from_home'
>;

export interface OnboardingChoices {
  days: Set<DayChoice>;
  travel: TravelMode | null;
  fuel: NonNullable<Home['cookingFuel']> | null;
  exhaust: boolean | null;
  purifier: boolean | null;
  busyRoad: NonNullable<Home['nearBusyRoad']> | null;
}

// Office commute and work from home exclude each other.
export function toggleDay(
  days: ReadonlySet<DayChoice>,
  choice: DayChoice,
): Set<DayChoice> {
  const next = new Set(days);
  if (next.has(choice)) {
    next.delete(choice);
  } else {
    next.add(choice);
    if (choice === 'office') next.delete('home');
    if (choice === 'home') next.delete('office');
  }
  return next;
}

// Replaces the routine and home answers the steps ask about; keeps the rest
// (who lives with you).
export function contextFrom(
  choices: OnboardingChoices,
  base: HouseholdContext,
): HouseholdContext {
  const routine: Routine = {};
  if (choices.days.has('home')) routine.commuteMode = 'work_from_home';
  else if (choices.days.has('office') && choices.travel) {
    routine.commuteMode = choices.travel;
  }
  if (choices.days.has('school')) routine.schoolCommute = true;
  if (choices.days.has('exercise')) routine.outdoorExercise = true;

  const home: Home = {};
  if (choices.fuel) home.cookingFuel = choices.fuel;
  if (choices.exhaust !== null) home.kitchenExhaust = choices.exhaust;
  if (choices.purifier !== null) home.airPurifier = choices.purifier;
  if (choices.busyRoad) home.nearBusyRoad = choices.busyRoad;

  const rest = { ...base };
  delete rest.routine;
  delete rest.home;
  return {
    ...rest,
    ...(Object.keys(routine).length ? { routine } : {}),
    ...(Object.keys(home).length ? { home } : {}),
  };
}

export function choicesFrom(context: HouseholdContext): OnboardingChoices {
  const routine = context.routine ?? {};
  const home = context.home ?? {};
  const days = new Set<DayChoice>();
  const mode = routine.commuteMode;
  if (mode === 'work_from_home') days.add('home');
  else if (mode) days.add('office');
  if (routine.schoolCommute) days.add('school');
  if (routine.outdoorExercise) days.add('exercise');
  return {
    days,
    travel: mode && mode !== 'work_from_home' ? mode : null,
    fuel: home.cookingFuel ?? null,
    exhaust: home.kitchenExhaust ?? null,
    purifier: home.airPurifier ?? null,
    busyRoad: home.nearBusyRoad ?? null,
  };
}
