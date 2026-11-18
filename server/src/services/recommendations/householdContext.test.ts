import { describe, expect, it } from 'vitest';
import type { HouseholdContext } from '../../../../shared/contracts.ts';
import { householdContextSchema } from './householdContext.ts';

const full: HouseholdContext = {
  routine: {
    commuteMode: 'two_wheeler',
    outdoorExercise: true,
    schoolCommute: false,
  },
  home: {
    nearBusyRoad: 'unknown',
    cookingFuel: 'prefer_not_to_say',
    kitchenExhaust: true,
    airPurifier: false,
  },
  householdNeeds: {
    includesChildren: true,
    includesOlderAdults: false,
    mayBeMoreSensitive: true,
  },
};

describe('householdContextSchema', () => {
  it('accepts an empty object', () => {
    expect(householdContextSchema.parse({})).toEqual({});
  });

  it('accepts every field', () => {
    expect(householdContextSchema.parse(full)).toEqual(full);
  });

  it('rejects an unknown top-level field', () => {
    expect(
      householdContextSchema.safeParse({ diagnosis: 'asthma' }).success,
    ).toBe(false);
  });

  it('rejects an unknown nested field', () => {
    expect(
      householdContextSchema.safeParse({ householdNeeds: { asthma: true } })
        .success,
    ).toBe(false);
  });

  it('rejects a value outside an enum', () => {
    expect(
      householdContextSchema.safeParse({
        routine: { commuteMode: 'helicopter' },
      }).success,
    ).toBe(false);
  });

  it('rejects a non-boolean flag', () => {
    expect(
      householdContextSchema.safeParse({ home: { airPurifier: 'yes' } })
        .success,
    ).toBe(false);
  });
});
