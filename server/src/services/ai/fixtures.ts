// Shared test fixtures for the daily-plan tests (Phase 4 shapes).
import type {
  AirAssessment,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import { buildCandidates } from '../recommendations/rules.ts';
import type { AskWriterInput } from './askOutput.ts';
import { toWriterInput, type PlanOutput } from './planOutput.ts';

export const elevated: AirAssessment = {
  level: 'elevated',
  windowStart: '2026-11-18T10:00:00.000Z',
  checks: [
    { pollutant: 'PM2_5', status: 'above_limit', average24h: 72.4, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 80, limit: 100 },
  ],
};

export const full: HouseholdContext = {
  routine: {
    commuteMode: 'two_wheeler',
    outdoorExercise: true,
    schoolCommute: true,
  },
  home: {
    nearBusyRoad: 'yes',
    cookingFuel: 'biomass',
    kitchenExhaust: false,
    airPurifier: true,
  },
  householdNeeds: {
    includesChildren: true,
    includesOlderAdults: true,
    mayBeMoreSensitive: true,
  },
};

export const candidates = buildCandidates(full, elevated);
export const input = toWriterInput(elevated, candidates);

export const askInput: AskWriterInput = {
  ...input,
  forecast: null,
  question: 'is 500 ok? zq7marker',
  earlier: [],
};

export const HIGH_IDS = candidates
  .filter((c) => c.section !== 'notice' && c.priority === 'high')
  .map((c) => c.id);

export function valid(): PlanOutput {
  return {
    summary:
      'Particle levels are forecast above the national limit, so plan indoor exercise and a quieter commute.',
    featured: HIGH_IDS.map((id) => ({
      id,
      period: 'daytime',
      forYou:
        'Your household includes children, so shorter outdoor time helps.',
    })),
  };
}
