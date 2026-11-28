import { describe, expect, it } from 'vitest';
import type { PlanOutput } from './planOutput.ts';
import {
  PLAN_OUTPUT_JSON_SCHEMA,
  checkPlanOutput,
  checkTexts,
} from './planOutput.ts';
import { candidates, input, valid } from './fixtures.ts';

function withSummary(summary: string): PlanOutput {
  return { ...valid(), summary };
}
function withIds(ids: string[]): PlanOutput {
  const base = valid().featured[0]!;
  return { ...valid(), featured: ids.map((id) => ({ ...base, id })) };
}
const highIds = valid().featured.map((f) => f.id);

describe('toWriterInput', () => {
  it('toWriterInput drops times and labels pollutants', () => {
    expect(input.air).not.toHaveProperty('windowStart');
    expect(input.air.checks.map((c) => c.pollutant)).toEqual(['PM2.5', 'PM10']);
    for (const c of input.candidates) {
      expect(Object.keys(c).sort()).toEqual([
        'id',
        'priority',
        'reason',
        'section',
        'text',
        'title',
      ]);
    }
    expect(input.candidates).toHaveLength(candidates.length);
  });
});

describe('checkTexts', () => {
  it('passes known numbers and plain words', () => {
    expect(
      checkTexts(['Fine particles are within the 24-hour limit.'], input),
    ).toBeNull();
  });
  it('rejects a number not in the input', () => {
    expect(checkTexts(['It will reach 500 today.'], input)).toBe('numbers');
  });
  it('rejects banned wording', () => {
    expect(checkTexts(['The air is safe.'], input)).toBe('wording');
  });
});

describe('checkPlanOutput', () => {
  it('a valid answer passes', () => {
    expect(checkPlanOutput(valid(), input)).toBeNull();
  });

  it('summary length', () => {
    expect(checkPlanOutput(withSummary('a'.repeat(19)), input)).toBe('length');
    expect(checkPlanOutput(withSummary('a'.repeat(301)), input)).toBe('length');
    const short = valid();
    short.featured[0]!.forYou = 'a'.repeat(9);
    expect(checkPlanOutput(short, input)).toBe('length');
  });

  it('ids must match exactly', () => {
    const ids = highIds.map((id) =>
      id === 'commute.lower-traffic' ? 'Commute.lower-traffic ' : id,
    );
    expect(checkPlanOutput(withIds(ids), input)).toBe('ids');
  });

  it('ids must be candidates, unique, non-notice, 1 to 8', () => {
    const extras = [
      'indoor.purifier',
      'indoor.cooking-ventilate',
      'indoor.cleaner-fuel',
      'indoor.smoke-sources',
    ];
    expect(
      checkPlanOutput(withIds([...highIds, 'exercise.run-faster']), input),
    ).toBe('ids');
    expect(checkPlanOutput(withIds([...highIds, highIds[0]!]), input)).toBe(
      'ids',
    );
    expect(checkPlanOutput(withIds([...highIds, 'air.elevated']), input)).toBe(
      'ids',
    );
    expect(checkPlanOutput(withIds([]), input)).toBe('ids');
    expect(checkPlanOutput(withIds([...highIds, ...extras]), input)).toBe(
      'ids',
    );
    expect(
      checkPlanOutput(withIds([...highIds, ...extras.slice(0, 3)]), input),
    ).toBeNull();
  });

  it('every high-priority action is featured', () => {
    const ids = highIds.filter((id) => id !== 'household.extra-caution');
    expect(checkPlanOutput(withIds(ids), input)).toBe('ids');
  });

  it('numbers must come from the input', () => {
    const base = valid().summary;
    expect(
      checkPlanOutput(
        withSummary(`${base} PM2.5 averages 72.4 over 24-hour.`),
        input,
      ),
    ).toBeNull();
    expect(checkPlanOutput(withSummary(`${base} About 15 more.`), input)).toBe(
      'numbers',
    );
    const hours = valid();
    hours.featured[0]!.forYou = 'Keep outdoor time under 3 hours today.';
    expect(checkPlanOutput(hours, input)).toBe('numbers');
  });

  it('banned wording', () => {
    const banned = [
      'safe',
      'Safety',
      'guaranteed',
      'healthy',
      'risk-free',
      'no risk',
      'diagnosis',
      'treatment',
      'cure',
      'medical',
      'prescribed',
      'symptoms',
      'asthma',
      'COPD',
      'inhaler',
      'AQI',
      'https://x.y',
      'www.x.y',
      'always open',
      'close all windows',
      '%',
    ];
    for (const word of banned) {
      expect(
        checkPlanOutput(withSummary(`${valid().summary} ${word}`), input),
        word,
      ).toBe('wording');
    }
  });

  // Final review I1: safety, health and condition wording the first list missed.
  it('banned wording covers comparatives, conditions and the AQI name', () => {
    const banned = [
      'Indoor exercise is the safer choice.',
      'Home is the safest place.',
      'Outdoor air is unsafe.',
      'A healthier day starts indoors.',
      'Children with breathing problems should stay in.',
      'Anyone with trouble breathing should rest.',
      'Anyone with lung or heart conditions should rest.',
      'This matters for respiratory comfort.',
      'People with allergies should take care.',
      'Bronchitis can flare up.',
      'Pregnant members should rest.',
      'Heart disease is a concern.',
      'Avoid illness today.',
      'Above the air quality index limit.',
    ];
    for (const sentence of banned) {
      expect(
        checkPlanOutput(withSummary(`${valid().summary} ${sentence}`), input),
        sentence,
      ).toBe('wording');
    }
  });

  // Final review I2: a within-limit day is not clean or free of risk.
  it('banned wording covers reassurance about the air', () => {
    const banned = [
      'Risk is low risk today.',
      'There is little risk today.',
      'Minimal risk for outdoor plans.',
      'Enjoy the clean air.',
      'The air is clean today.',
      'It is a good day for a run.',
      'Good air all day.',
      'Air quality is good today.',
      // Phase 10 final review: the same rule bans "bad air".
      'Expect bad air in the evening.',
    ];
    for (const sentence of banned) {
      expect(
        checkPlanOutput(withSummary(`${valid().summary} ${sentence}`), input),
        sentence,
      ).toBe('wording');
    }
  });

  it('legitimate echoes of the rules still pass', () => {
    expect(
      checkPlanOutput(
        withSummary(
          'Check local conditions and follow local public-health advisories over the next 24 hours.',
        ),
        input,
      ),
    ).toBeNull();
  });

  // Final review I3: numbers written as words, or reused with a new unit.
  it('number words and units must come from the input', () => {
    const summaries = [
      `${valid().summary} PM2.5 is nearly twice the national limit.`,
      `${valid().summary} Keep outdoor time under 60 minutes.`,
      `${valid().summary} Go out before 10am.`,
      `${valid().summary} Stay within 5 km of home.`,
    ];
    for (const summary of summaries) {
      expect(checkPlanOutput(withSummary(summary), input), summary).toBe(
        'numbers',
      );
    }
    const twoHours = valid();
    twoHours.featured[0]!.forYou = 'Keep outdoor time to about two hours.';
    expect(checkPlanOutput(twoHours, input)).toBe('numbers');
  });

  // The word list stopped at fifty: teens, sixty to ninety, large numbers,
  // fractions, zero and "doubled" or "halved" slipped through.
  it('number words beyond fifty, large numbers and fractions must come from the input', () => {
    const summaries = [
      `${valid().summary} PM2.5 is about sixty today.`,
      `${valid().summary} Keep outdoor time under fifteen minutes.`,
      `${valid().summary} PM10 is near eighty.`,
      `${valid().summary} Seventy is close to the limit.`,
      `${valid().summary} Ninety minutes indoors is enough.`,
      `${valid().summary} Thirteen hours above the limit.`,
      `${valid().summary} Nineteen hours above the limit.`,
      `${valid().summary} Thousands of particles per breath.`,
      `${valid().summary} Expect zero haze tonight.`,
      `${valid().summary} Millions of fine particles drift indoors.`,
      `${valid().summary} Billions of particles are in the air.`,
      `${valid().summary} Over a lakh vehicles pass busy roads.`,
      `${valid().summary} Crores of people live near roads.`,
      `${valid().summary} PM2.5 is about a fifth above the limit.`,
      `${valid().summary} A third of the limit is left.`,
      `${valid().summary} Levels doubled overnight.`,
      `${valid().summary} Doubling the time indoors helps.`,
      `${valid().summary} Levels tripled since morning.`,
      `${valid().summary} Exposure halved indoors.`,
    ];
    for (const summary of summaries) {
      expect(checkPlanOutput(withSummary(summary), input), summary).toBe(
        'numbers',
      );
    }
  });

  // Field names and labels are not numbers: average24h, PM2.5, PM10 and
  // two-wheeler let 24, 2.5, 10 and "two" through in any sentence.
  it('numbers from field names and labels must still come from the data', () => {
    const summaries = [
      `${valid().summary} PM2.5 is about 24 today.`,
      `${valid().summary} Levels are 2.5 times the limit.`,
      `${valid().summary} Indoors is 10 times better.`,
      `${valid().summary} Make two short trips instead.`,
    ];
    for (const summary of summaries) {
      expect(checkPlanOutput(withSummary(summary), input), summary).toBe(
        'numbers',
      );
    }
  });

  it('pollutant names and the two-wheeler label still pass', () => {
    expect(
      checkPlanOutput(
        withSummary(
          `${valid().summary} PM2.5, PM 2.5 and PM10 matter for your two-wheeler commute.`,
        ),
        input,
      ),
    ).toBeNull();
  });

  // "About an hour" and "a couple of hours" are numbers in words.
  it('article and "couple" durations must come from the input', () => {
    const summaries = [
      `${valid().summary} Keep outdoor time to about an hour.`,
      `${valid().summary} A couple of hours indoors helps.`,
      `${valid().summary} Wait a minute before opening windows.`,
      `${valid().summary} Stay a kilometre from busy roads.`,
      `${valid().summary} Spend an extra hour indoors today.`,
    ];
    for (const summary of summaries) {
      expect(checkPlanOutput(withSummary(summary), input), summary).toBe(
        'numbers',
      );
    }
  });

  // Review of the change above: spellings it wrongly rejected.
  it('spelling variants of names and durations still pass', () => {
    const summaries = [
      `${valid().summary} The 24h average for PM2.5 is above the limit.`,
      `${valid().summary} The 24-h forecast for PM2.5 is above the limit.`,
      `${valid().summary} The 24‑hour PM2.5 forecast is above the limit.`,
      `${valid().summary} Take a second look at the forecast first.`,
      `${valid().summary} A second-hand purifier can still help.`,
      `${valid().summary} PM-2.5 and PM-10 are the particles to watch.`,
      `${valid().summary} Fine particles (PM2.5/10) are the ones to watch.`,
      `${valid().summary} The main concern today is PM2.5.`,
      `${valid().summary} On a two-wheeled commute, a quieter route helps.`,
      `${valid().summary} If you ride on two wheels, a quieter route helps.`,
      `${valid().summary} Your two‑wheeler commute is the most exposed.`,
      `${valid().summary} Above the limit of 60 — days like this call for less time out.`,
      `${valid().summary} The main concern is PM2.5 — hours near roads add up.`,
      `${valid().summary} The main concern is PM2.5 – hours near roads add up.`,
    ];
    for (const summary of summaries) {
      expect(checkPlanOutput(withSummary(summary), input), summary).toBeNull();
    }
  });

  it('a pollutant name does not hide a number or unit after it', () => {
    const summaries = [
      `${valid().summary} Levels of PM 10.60 are expected.`,
      `${valid().summary} Keep outdoor time under PM10 minutes.`,
    ];
    for (const summary of summaries) {
      expect(checkPlanOutput(withSummary(summary), input), summary).toBe(
        'numbers',
      );
    }
  });

  // The limits 60 and 100 are always in the input: without these units
  // "100 m" read as the PM10 limit.
  it('distances and longer spans must come from the input', () => {
    const summaries = [
      `${valid().summary} Wait 100 m back from the kerb.`,
      `${valid().summary} Stand 100 ft back from the road.`,
      `${valid().summary} Stand 100 feet back from the road.`,
      `${valid().summary} Stay a mile away from busy roads.`,
      `${valid().summary} This has gone on for 60 years.`,
    ];
    for (const summary of summaries) {
      expect(checkPlanOutput(withSummary(summary), input), summary).toBe(
        'numbers',
      );
    }
  });

  it('"hourly" and "a day" are not durations', () => {
    expect(
      checkPlanOutput(
        withSummary(
          `${valid().summary} Check the hourly forecast on a day like this.`,
        ),
        input,
      ),
    ).toBeNull();
  });
});

describe('PLAN_OUTPUT_JSON_SCHEMA', () => {
  it('the JSON schema has the three fields', () => {
    const schema = PLAN_OUTPUT_JSON_SCHEMA as {
      properties: {
        summary: unknown;
        featured: { items: { properties: { period: { enum: string[] } } } };
      };
    };
    expect(schema.properties.summary).toBeDefined();
    expect(schema.properties.featured.items.properties.period.enum).toEqual([
      'morning',
      'commute',
      'daytime',
      'evening',
      'home',
    ]);
  });
});
