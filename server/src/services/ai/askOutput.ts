import { z } from 'zod';
import type { AskTopic } from '../../../../shared/contracts.ts';
import { checkTexts, type PlanWriterInput } from './planOutput.ts';

export const ASK_TOPICS = [
  'outdoors',
  'windows',
  'indoor',
  'family',
  'commuting',
  'habits',
] as const satisfies readonly AskTopic[];

// An Ask summary must never read as a yes or no on safety (spec §7.4). The
// plan's own checks already refuse "safe", "healthy" and numbers.
export const VERDICT =
  /(?:^\s*(?:yes|no)\b)|\bgo ahead\b|\b(fine|ok|okay|alright) to\b|\b(good|bad) idea\b/i;

export interface AskWriterInput extends PlanWriterInput {
  forecast: {
    provider: string;
    dataKind: string;
    limitations: string[];
  } | null;
  question: string;
  earlier: Array<{ question: string; cards: string[] }>;
}

export interface AskOutput {
  scope: 'answered' | 'out_of_scope';
  answer: string;
  topic: AskTopic;
  cardIds: string[];
}

export const askOutputSchema: z.ZodType<AskOutput> = z.object({
  scope: z.enum(['answered', 'out_of_scope']),
  answer: z.string(),
  topic: z.enum(ASK_TOPICS),
  cardIds: z.array(z.string()),
});

export const ASK_OUTPUT_JSON_SCHEMA: object = z.toJSONSchema(askOutputSchema);

export type AskCheckFailure =
  'length' | 'ids' | 'numbers' | 'wording' | 'verdict';

export function checkAskOutput(
  output: AskOutput,
  input: AskWriterInput,
  eligibleIds: ReadonlySet<string>,
): AskCheckFailure | null {
  if (output.scope === 'out_of_scope') return null;

  if (output.answer.length < 20 || output.answer.length > 300) return 'length';

  // The English-only wording checks cannot read other scripts. Mu is allowed
  // for the unit in "μg/m³".
  if (
    /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}μµ]/u.test(
      output.answer,
    )
  ) {
    return 'wording';
  }

  const ids = output.cardIds;
  if (
    new Set(ids).size !== ids.length ||
    ids.length > 3 ||
    ids.some((id) => !eligibleIds.has(id))
  ) {
    return 'ids';
  }

  // values() reads every key, so the forecast's limitations count as known
  // and the question does not.
  const failure = checkTexts([output.answer], {
    air: input.air,
    candidates: input.candidates,
    forecast: input.forecast,
  } as PlanWriterInput);
  if (failure) return failure;

  return VERDICT.test(output.answer) ? 'verdict' : null;
}

export type GenerateAsk = (input: AskWriterInput) => Promise<string>;
