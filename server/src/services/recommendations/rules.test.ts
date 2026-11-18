import { describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  HouseholdContext,
  RecommendationCandidate,
} from '../../../../shared/contracts.ts';
import { SOURCE_REFERENCES, buildCandidates } from './rules.ts';

const elevated: AirAssessment = {
  level: 'elevated',
  checks: [
    { pollutant: 'PM2_5', status: 'above_limit', average24h: 72.4, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 80, limit: 100 },
  ],
};
const within: AirAssessment = {
  level: 'not_elevated',
  checks: [
    { pollutant: 'PM2_5', status: 'within_limit', average24h: 41.2, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 63.5, limit: 100 },
  ],
};
const unknown: AirAssessment = {
  level: 'unknown',
  checks: [
    { pollutant: 'PM2_5', status: 'unknown', average24h: null, limit: 60 },
    { pollutant: 'PM10', status: 'unknown', average24h: null, limit: 100 },
  ],
};
const full: HouseholdContext = {
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
const AIR_IDS = [
  'air.elevated',
  'air.within-limit',
  'exercise.indoor-alternative',
  'commute.lower-traffic',
  'school.less-roadside-waiting',
  'household.extra-caution',
  'indoor.ventilation-tradeoff',
  'indoor.purifier',
];
const ELEVATED_NO_DETAILS = [
  'air.elevated',
  'indoor.ventilation-tradeoff',
  'indoor.smoke-sources',
  'swap.no-open-burning',
];
const ids = (list: RecommendationCandidate[]) => list.map((c) => c.id);
const byId = (list: RecommendationCandidate[], id: string) =>
  list.find((c) => c.id === id);
const withChecks = (
  pm25: AirAssessment['checks'][number],
  pm10: AirAssessment['checks'][number],
): AirAssessment => ({ level: 'elevated', checks: [pm25, pm10] });
const allRuns = () =>
  [full, {}].flatMap((context) =>
    [elevated, within, unknown].flatMap((air) => buildCandidates(context, air)),
  );

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('buildCandidates', () => {
  it('unknown air with no details gives only evergreen advice', () => {
    expect(ids(buildCandidates({}, unknown))).toEqual([
      'data.unavailable',
      'indoor.smoke-sources',
      'swap.no-open-burning',
    ]);
  });

  it('elevated air with no details', () => {
    expect(ids(buildCandidates({}, elevated))).toEqual(ELEVATED_NO_DETAILS);
  });

  it('within-limit air with no details', () => {
    expect(ids(buildCandidates({}, within))).toEqual([
      'air.within-limit',
      'indoor.smoke-sources',
      'swap.no-open-burning',
    ]);
  });

  it('full details and elevated air, in registry order', () => {
    expect(ids(buildCandidates(full, elevated))).toEqual([
      'air.elevated',
      'exercise.indoor-alternative',
      'commute.lower-traffic',
      'school.less-roadside-waiting',
      'household.extra-caution',
      'indoor.ventilation-tradeoff',
      'indoor.purifier',
      'indoor.cooking-ventilate',
      'indoor.cleaner-fuel',
      'indoor.smoke-sources',
      'home.busy-road',
      'swap.fewer-car-trips',
      'swap.no-open-burning',
    ]);
  });

  it('elevated notice text', () => {
    expect(byId(buildCandidates({}, elevated), 'air.elevated')?.text).toBe(
      'The 24-hour model forecast average is above the national limit for PM2.5 (72.4 μg/m³, limit 60).',
    );
    const both = withChecks(elevated.checks[0]!, {
      pollutant: 'PM10',
      status: 'above_limit',
      average24h: 120,
      limit: 100,
    });
    expect(byId(buildCandidates({}, both), 'air.elevated')?.text).toBe(
      'The 24-hour model forecast average is above the national limit for PM2.5 (72.4 μg/m³, limit 60) and PM10 (120.0 μg/m³, limit 100).',
    );
  });

  it('elevated notice lists only the pollutants above', () => {
    const pm10Only = withChecks(within.checks[0]!, {
      pollutant: 'PM10',
      status: 'above_limit',
      average24h: 120,
      limit: 100,
    });

    expect(byId(buildCandidates({}, pm10Only), 'air.elevated')?.text).toBe(
      'The 24-hour model forecast average is above the national limit for PM10 (120.0 μg/m³, limit 100).',
    );
  });

  it('within-limit notice text', () => {
    const notice = byId(buildCandidates({}, within), 'air.within-limit');

    expect(notice?.text).toBe(
      'The 24-hour model forecast averages are PM2.5 41.2 μg/m³ (limit 60) and PM10 63.5 μg/m³ (limit 100).',
    );
    expect(notice?.caveat).toMatch(
      /^Being within the national limit does not mean the air is clean or free of risk\./,
    );
  });

  it('commuter scenario', () => {
    const list = buildCandidates(
      { routine: { commuteMode: 'two_wheeler', outdoorExercise: true } },
      elevated,
    );

    expect(ids(list)).toEqual(
      expect.arrayContaining([
        'exercise.indoor-alternative',
        'commute.lower-traffic',
        'swap.fewer-car-trips',
      ]),
    );
    expect(byId(list, 'commute.lower-traffic')?.reason).toBe(
      'You travel by two-wheeler close to traffic, and the forecast is above the national 24-hour limit.',
    );
    expect(byId(list, 'swap.fewer-car-trips')?.reason).toBe(
      'You said you get around by two-wheeler.',
    );
  });

  it('car commute gets the swap but not the route advice', () => {
    const car = buildCandidates({ routine: { commuteMode: 'car' } }, elevated);
    expect(ids(car)).not.toContain('commute.lower-traffic');
    expect(byId(car, 'swap.fewer-car-trips')?.reason).toBe(
      'You said you get around by car.',
    );

    const bus = ids(
      buildCandidates(
        { routine: { commuteMode: 'public_transport' } },
        elevated,
      ),
    );
    expect(bus).not.toContain('commute.lower-traffic');
    expect(bus).not.toContain('swap.fewer-car-trips');
  });

  it('parent scenario', () => {
    const list = buildCandidates(
      {
        routine: { schoolCommute: true },
        householdNeeds: { includesChildren: true },
      },
      elevated,
    );
    const caution = byId(list, 'household.extra-caution');

    expect(ids(list)).toContain('school.less-roadside-waiting');
    expect(caution?.reason).toBe(
      'You said your household includes children, and the forecast is above the national 24-hour limit.',
    );
    expect(caution?.inputsUsed).toEqual([
      'householdNeeds.includesChildren',
      'air.level',
    ]);
  });

  it('extra caution names every group', () => {
    const list = buildCandidates(
      {
        householdNeeds: {
          includesChildren: true,
          includesOlderAdults: true,
          mayBeMoreSensitive: true,
        },
      },
      elevated,
    );

    expect(byId(list, 'household.extra-caution')?.reason).toBe(
      'You said your household includes children, older adults and someone who may be more sensitive to air pollution, and the forecast is above the national 24-hour limit.',
    );
  });

  it('indoor scenario', () => {
    const lpg = ids(
      buildCandidates(
        {
          home: { cookingFuel: 'lpg', kitchenExhaust: true, airPurifier: true },
        },
        elevated,
      ),
    );
    expect(lpg).toEqual(
      expect.arrayContaining([
        'indoor.ventilation-tradeoff',
        'indoor.purifier',
        'indoor.cooking-exhaust',
      ]),
    );
    expect(lpg).not.toContain('indoor.cooking-ventilate');
    expect(lpg).not.toContain('indoor.cleaner-fuel');

    expect(
      ids(buildCandidates({ home: { kitchenExhaust: false } }, elevated)),
    ).toContain('indoor.cooking-ventilate');
    const noAnswer = ids(buildCandidates({ home: {} }, elevated));
    expect(noAnswer).not.toContain('indoor.cooking-exhaust');
    expect(noAnswer).not.toContain('indoor.cooking-ventilate');
    expect(
      ids(buildCandidates({ home: { cookingFuel: 'biomass' } }, elevated)),
    ).toContain('indoor.cleaner-fuel');
  });

  it('busy road scenario', () => {
    const road = byId(
      buildCandidates({ home: { nearBusyRoad: 'yes' } }, elevated),
      'home.busy-road',
    );
    expect(road?.caveat).toContain('45 km');

    for (const answer of ['no', 'unknown'] as const) {
      expect(
        ids(buildCandidates({ home: { nearBusyRoad: answer } }, elevated)),
      ).not.toContain('home.busy-road');
    }
  });

  it('unknown data gives no air advice', () => {
    const list = ids(buildCandidates(full, unknown));

    expect(list[0]).toBe('data.unavailable');
    for (const id of AIR_IDS) expect(list).not.toContain(id);
    expect(list).toContain('exercise.check-conditions');
  });

  it('forecast caveat on every air candidate', () => {
    for (const air of [elevated, within]) {
      for (const candidate of buildCandidates(full, air)) {
        if (candidate.sourceIds.includes('open-meteo')) {
          expect(candidate.evidenceType).toBe('data_driven_rule');
          expect(candidate.sourceIds).toEqual([
            'open-meteo',
            'cpcb-naaqs-2009',
          ]);
          if (candidate.id.startsWith('air.')) {
            expect(candidate.caveat).toContain('not the CPCB National AQI');
          }
        } else {
          expect(candidate.evidenceType).toBe('general_suggestion');
          expect(candidate.sourceIds).toEqual([]);
        }
      }
    }
  });

  it('sensitive household scenario', () => {
    const caution = byId(
      buildCandidates(
        { householdNeeds: { mayBeMoreSensitive: true } },
        elevated,
      ),
      'household.extra-caution',
    );

    expect(caution?.reason).toContain(
      'someone who may be more sensitive to air pollution',
    );
    expect(caution?.caveat).toBe(
      'General information only, not medical advice.',
    );
  });

  it('exercise advice follows the air', () => {
    const context: HouseholdContext = { routine: { outdoorExercise: true } };

    const high = ids(buildCandidates(context, elevated));
    expect(high).toContain('exercise.indoor-alternative');
    expect(high).not.toContain('exercise.check-conditions');
    for (const air of [within, unknown]) {
      const list = ids(buildCandidates(context, air));
      expect(list).toContain('exercise.check-conditions');
      expect(list).not.toContain('exercise.indoor-alternative');
    }
  });

  it('false flags add nothing', () => {
    const context: HouseholdContext = {
      routine: { outdoorExercise: false, schoolCommute: false },
      home: { airPurifier: false },
      householdNeeds: {
        includesChildren: false,
        includesOlderAdults: false,
        mayBeMoreSensitive: false,
      },
    };

    expect(ids(buildCandidates(context, elevated))).toEqual(
      ELEVATED_NO_DETAILS,
    );
  });

  it('no banned wording', () => {
    const banned = [
      /\bsafe(ly|ty)?\b/i,
      /guarantee/i,
      /healthy/i,
      /diagnos/i,
      /medicat/i,
      /\btreat/i,
      /always (open|close)/i,
      /(open|close) all (the )?windows/i,
      /%/,
    ];
    for (const candidate of allRuns()) {
      const copy = [
        candidate.title,
        candidate.text,
        candidate.reason,
        candidate.caveat ?? '',
      ];
      for (const line of copy) {
        for (const pattern of banned) expect(line).not.toMatch(pattern);
      }
    }
  });

  it('measurements only in the air notices', () => {
    for (const candidate of allRuns()) {
      const copy = [
        candidate.title,
        candidate.text,
        candidate.reason,
        candidate.caveat ?? '',
      ].join(' ');
      if (!candidate.id.startsWith('air.')) expect(copy).not.toMatch(/\d\s*μg/);
    }
  });

  it('ids are unique and sources are known', () => {
    const list = buildCandidates(full, elevated);

    expect(new Set(ids(list)).size).toBe(list.length);
    for (const candidate of list) {
      for (const id of candidate.sourceIds) {
        expect(Object.keys(SOURCE_REFERENCES)).toContain(id);
      }
    }
  });

  it('same input, same output, inputs untouched', () => {
    const context = deepFreeze(structuredClone(full));
    const air = deepFreeze(structuredClone(elevated));

    const first = buildCandidates(context, air);
    const second = buildCandidates(context, air);

    expect(second).toEqual(first);
  });
});
