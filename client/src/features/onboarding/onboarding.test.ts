import { describe, expect, it } from 'vitest';
import {
  choicesFrom,
  contextFrom,
  toggleDay,
  type OnboardingChoices,
} from './onboarding.ts';

const NONE: OnboardingChoices = {
  days: new Set(),
  travel: null,
  fuel: null,
  exhaust: null,
  purifier: null,
  busyRoad: null,
};

describe('onboarding answers', () => {
  it('office with Car sets commuteMode car', () => {
    const context = contextFrom(
      { ...NONE, days: new Set(['office']), travel: 'car' },
      {},
    );
    expect(context).toEqual({ routine: { commuteMode: 'car' } });
  });

  it('office without a travel choice leaves commuteMode unanswered', () => {
    expect(contextFrom({ ...NONE, days: new Set(['office']) }, {})).toEqual({});
  });

  it('work from home and office exclude each other', () => {
    const home = toggleDay(new Set(['office', 'school']), 'home');
    expect([...home].sort()).toEqual(['home', 'school']);
    expect([...toggleDay(home, 'office')].sort()).toEqual(['office', 'school']);
    expect(contextFrom({ ...NONE, days: home }, {})).toEqual({
      routine: { commuteMode: 'work_from_home', schoolCommute: true },
    });
  });

  it('unticked choices stay unanswered', () => {
    expect(contextFrom(NONE, {})).toEqual({});
    expect(
      contextFrom({ ...NONE, days: new Set(['exercise']) }, {}).routine,
    ).toEqual({ outdoorExercise: true });
  });

  it('cooking, exhaust, purifier and road map to the home answers', () => {
    expect(
      contextFrom(
        {
          ...NONE,
          fuel: 'biomass',
          exhaust: false,
          purifier: true,
          busyRoad: 'unknown',
        },
        {},
      ),
    ).toEqual({
      home: {
        cookingFuel: 'biomass',
        kitchenExhaust: false,
        airPurifier: true,
        nearBusyRoad: 'unknown',
      },
    });
  });

  it('keeps the answers the steps do not ask about', () => {
    const base = { householdNeeds: { includesChildren: true } };
    expect(contextFrom(NONE, base)).toEqual(base);
  });

  it('choicesFrom reverses contextFrom', () => {
    const choices: OnboardingChoices = {
      days: new Set(['office', 'school', 'exercise']),
      travel: 'public_transport',
      fuel: 'lpg',
      exhaust: true,
      purifier: false,
      busyRoad: 'yes',
    };
    expect(choicesFrom(contextFrom(choices, {}))).toEqual(choices);
  });
});
