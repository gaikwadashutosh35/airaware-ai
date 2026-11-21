// The contract between the app and Gemini for the daily plan, and the
// checks every answer must pass before anyone sees it.
import { z } from 'zod';
import type {
  AirAssessment,
  LimitStatus,
  PlanPeriod,
  RecommendationCandidate,
} from '../../../../shared/contracts.ts';

export interface PlanWriterInput {
  air: {
    level: AirAssessment['level'];
    checks: Array<{
      pollutant: 'PM2.5' | 'PM10';
      status: LimitStatus;
      average24h: number | null;
      limit: number;
    }>;
  };
  candidates: Array<
    Pick<
      RecommendationCandidate,
      'id' | 'section' | 'priority' | 'title' | 'text' | 'reason'
    >
  >;
}

export interface PlanOutput {
  summary: string;
  featured: Array<{ id: string; period: PlanPeriod; forYou: string }>;
}

const PERIODS = [
  'morning',
  'commute',
  'daytime',
  'evening',
  'home',
] as const satisfies readonly PlanPeriod[];

export const planOutputSchema: z.ZodType<PlanOutput> = z.object({
  summary: z.string(),
  featured: z.array(
    z.object({ id: z.string(), period: z.enum(PERIODS), forYou: z.string() }),
  ),
});

export const PLAN_OUTPUT_JSON_SCHEMA: object = z.toJSONSchema(planOutputSchema);

export type CheckFailure = 'length' | 'ids' | 'numbers' | 'wording';

// Only what Gemini needs: no window time, place, coordinates or raw answers.
export function toWriterInput(
  air: AirAssessment,
  candidates: RecommendationCandidate[],
): PlanWriterInput {
  return {
    air: {
      level: air.level,
      checks: air.checks.map((c) => ({
        pollutant: c.pollutant === 'PM2_5' ? 'PM2.5' : 'PM10',
        status: c.status,
        average24h: c.average24h,
        limit: c.limit,
      })),
    },
    candidates: candidates.map(
      ({ id, section, priority, title, text, reason }) => ({
        id,
        section,
        priority,
        title,
        text,
        reason,
      }),
    ),
  };
}

// A number (digits or a number word), with any time, distance or clock
// unit that follows it, so "60 minutes" is not accepted just because the
// limit 60 appears in the input. "24-hour" and "24 hours" compare equal.
const NUMBER =
  /(?:\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|twice|double|triple|thrice|half|quarter|dozen)\b|\d+(?:\.\d+)?)(?:[\s-]*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?|days?|km|kilomet(?:re|er)s?|met(?:re|er)s?|am|pm)\b)?/gi;
const UNITS: Array<[RegExp, string]> = [
  [/(minute|min)s?$/, 'min'],
  [/(hour|hr)s?$/, 'h'],
  [/(second|sec)s?$/, 's'],
  [/days?$/, 'd'],
  [/(kilomet(re|er)s?|km)$/, 'km'],
  [/met(re|er)s?$/, 'm'],
];

function numberTokens(text: string): string[] {
  return (text.match(NUMBER) ?? []).map((raw) =>
    UNITS.reduce(
      (token, [unit, short]) => token.replace(unit, short),
      raw.toLowerCase().replace(/[\s-]/g, ''),
    ),
  );
}

const BANNED = [
  /\b(un)?safe(r|st|ly|ty)?\b/i,
  /guarantee/i,
  /health(y|ier|iest|ful)/i,
  /risk[- ]free/i,
  /\bno risk\b/i,
  /diagnos/i,
  /\btreat/i,
  /\bcure/i,
  /medic/i,
  /prescri/i,
  /symptom/i,
  /asthma/i,
  /\bcopd\b/i,
  /inhaler/i,
  /\baqi\b/i,
  /air quality index/i,
  // Named conditions ("conditions" alone stays: "Check local conditions").
  /\b(lung|heart|respirat|allerg|bronch|pregnan|disease|illness)/i,
  /breathing (problem|difficult|trouble)|trouble breathing/i,
  // Reassurance: within the limit is not clean or free of risk.
  /\b(low|little|minimal) risk\b|\bclean air\b|\bair is clean\b/i,
  /\b(good|bad) air\b|\bgood day\b|air quality is good/i,
  /https?:|www\./i,
  /always (open|close)/i,
  /(open|close) all (the )?windows/i,
  /%/,
];

export function checkPlanOutput(
  output: PlanOutput,
  input: PlanWriterInput,
): CheckFailure | null {
  const texts = [output.summary, ...output.featured.map((f) => f.forYou)];

  if (
    output.summary.length < 20 ||
    output.summary.length > 300 ||
    output.featured.some((f) => f.forYou.length < 10 || f.forYou.length > 200)
  ) {
    return 'length';
  }

  const actionIds = new Set(
    input.candidates.filter((c) => c.section !== 'notice').map((c) => c.id),
  );
  const ids = output.featured.map((f) => f.id);
  const highIds = input.candidates
    .filter((c) => c.section !== 'notice' && c.priority === 'high')
    .map((c) => c.id);
  if (
    ids.length < 1 ||
    ids.length > 8 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !actionIds.has(id)) ||
    highIds.some((id) => !ids.includes(id))
  ) {
    return 'ids';
  }

  const known = new Set(numberTokens(JSON.stringify(input)));
  if (texts.some((t) => numberTokens(t).some((n) => !known.has(n)))) {
    return 'numbers';
  }

  if (texts.some((t) => BANNED.some((re) => re.test(t)))) return 'wording';

  return null;
}
