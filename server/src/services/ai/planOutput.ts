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
// "An hour", "a minute" or "an extra hour" count. "A day" and "a second"
// do not: "on a day like this" and "a second look" are no durations.
const UNIT =
  'minutes?|mins?|hours?|hrs?|h|seconds?|secs?|days?|weeks?|months?|years?|yrs?|km|kilomet(?:re|er)s?|met(?:re|er)s?|miles?|mi|yards?|feet|foot|ft|am|pm|m';
const ARTICLE_UNIT =
  'minutes?|mins?|hours?|hrs?|km|kilomet(?:re|er)s?|met(?:re|er)s?|miles?';
const NUMBER = new RegExp(
  String.raw`(?:\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|(?:hundred|thousand|million|billion|lakh|crore|dozen|third|fifth|tenth)s?|twice|doubled?|doubling|tripled?|thrice|half|halved|quarter|couple(?:\s+of)?|an?(?=[\s-]+(?:(?:extra|full|whole|additional|single)[\s-]+)?(?:${ARTICLE_UNIT})\b))\b|\d+(?:\.\d+)?)(?:(?:-|\s+)?(?:${UNIT})\b)?`,
  'gi',
);
// Names, not numbers: the pollutants and the two-wheeler commute. A name
// followed by more digits or a unit is left in place to be checked.
const NAMES = new RegExp(
  String.raw`\bPM[\s-]?(?:2\.5|10)(?:\/(?:2\.5|10))?\b(?!\.?\d|(?:-|\s+)?(?:${UNIT})\b)|\btwo[\s-]?wheel(?:er|ed)?s?\b`,
  'gi',
);
const UNITS: Array<[RegExp, string]> = [
  [/(minute|min)s?$/, 'min'],
  [/(hour|hr)s?$/, 'h'],
  [/(second|sec)s?$/, 's'],
  [/days?$/, 'd'],
  [/(kilomet(re|er)s?|km)$/, 'km'],
  [/met(re|er)s?$/, 'm'],
];

function numberTokens(text: string): string[] {
  // Unicode hyphens and dashes ("24‑hour") read as "-".
  const plain = text.replace(/[‐-―]/g, '-').replace(NAMES, ' ');
  return (plain.match(NUMBER) ?? []).map((raw) =>
    UNITS.reduce(
      (token, [unit, short]) => token.replace(unit, short),
      raw.toLowerCase().replace(/[\s-]/g, ''),
    ),
  );
}

// The input's values, not its field names: "average24h" holds no number.
function values(value: unknown): string[] {
  return value !== null && typeof value === 'object'
    ? Object.values(value).flatMap(values)
    : [String(value)];
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

export function checkTexts(
  texts: string[],
  known: PlanWriterInput,
): 'numbers' | 'wording' | null {
  const knownNumbers = new Set(values(known).flatMap(numberTokens));
  if (texts.some((t) => numberTokens(t).some((n) => !knownNumbers.has(n)))) {
    return 'numbers';
  }

  if (texts.some((t) => BANNED.some((re) => re.test(t)))) return 'wording';

  return null;
}

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

  return checkTexts(texts, input);
}
