// Assembles the daily plan. Every piece of advice is the rules' own
// candidate; Gemini's part (if any) only picks, orders, times and adds.
import type {
  AirAssessment,
  DailyPlan,
  RecommendationCandidate,
  SourceReferenceId,
} from '../../../../shared/contracts.ts';
import type { ModelForecast } from '../air-data/openMeteo.ts';
import type { PlanOutput } from '../ai/planOutput.ts';
import { SOURCE_REFERENCES } from './rules.ts';

export const SAFETY_NOTE =
  'General information only, not medical advice. Follow local public-health advisories.';

export function buildPlan(input: {
  label: string;
  air: AirAssessment;
  forecast: ModelForecast | null;
  candidates: RecommendationCandidate[];
  ai: { output: PlanOutput; model: string; promptVersion: string } | null;
}): DailyPlan {
  const { label, air, forecast, candidates, ai } = input;
  const notices = candidates.filter((c) => c.section === 'notice');
  const actions = candidates.filter((c) => c.section !== 'notice');

  const featured = ai
    ? ai.output.featured.flatMap(({ id, period, forYou }) => {
        const candidate = actions.find((c) => c.id === id);
        return candidate ? [{ candidate, period, forYou }] : [];
      })
    : actions.map((candidate) => ({ candidate, period: null, forYou: null }));
  const featuredIds = new Set(featured.map((f) => f.candidate.id));

  const cited = new Set(candidates.flatMap((c) => c.sourceIds));
  const sources = (Object.keys(SOURCE_REFERENCES) as SourceReferenceId[])
    .filter((id) => cited.has(id))
    .map((id) => ({ id, ...SOURCE_REFERENCES[id] }));

  return {
    generatedBy: ai ? 'ai' : 'rules',
    model: ai?.model ?? null,
    promptVersion: ai?.promptVersion ?? null,
    summary: ai?.output.summary ?? null,
    place: { label },
    air,
    forecast: forecast && {
      provider: forecast.provider,
      sourceUrl: forecast.sourceUrl,
      dataKind: forecast.dataKind,
      modelResolution: forecast.modelResolution,
      retrievedAt: forecast.retrievedAt,
      limitations: forecast.limitations,
    },
    notices,
    featured,
    more: actions.filter((c) => !featuredIds.has(c.id)),
    sources,
    safetyNote: SAFETY_NOTE,
  };
}
