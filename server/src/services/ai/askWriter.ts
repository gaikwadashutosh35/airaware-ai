// Asks Claude to answer one typed question and accepts only an answer that
// passes every check. One try, no cache: each question is different. Logs the
// failure category, never the question or the model's text.
import {
  askOutputSchema,
  checkAskOutput,
  type AskOutput,
  type AskWriterInput,
  type GenerateAsk,
} from './askOutput.ts';

export type AskWriter = (
  input: AskWriterInput,
  eligibleIds: ReadonlySet<string>,
  now: Date,
) => Promise<{ output: AskOutput; model: string } | null>;

const TRANSPORT =
  /^(?:timeout|network|refusal|max_tokens|empty response|http \d{3})$/;

export function createAskWriter(deps: {
  generate: GenerateAsk;
  model: string;
  callsPerDay?: number;
}): AskWriter {
  const callsPerDay = deps.callsPerDay ?? 200;
  // ponytail: per server instance; total spend is this times the number of
  // function instances.
  const budget = { day: '', calls: 0 };

  return async (input, eligibleIds, now) => {
    const fail = (category: string): null => {
      console.error(`Claude ask failed: ${category}`);
      return null;
    };

    const day = now.toISOString().slice(0, 10);
    if (day !== budget.day) {
      budget.day = day;
      budget.calls = 0;
    }
    if (budget.calls >= callsPerDay) return fail('daily limit');
    budget.calls++;

    let text: string;
    try {
      text = await deps.generate(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      return fail(TRANSPORT.test(message) ? message : 'unexpected');
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return fail('invalid json');
    }

    const parsed = askOutputSchema.safeParse(json);
    if (!parsed.success) return fail('schema');

    const failure = checkAskOutput(parsed.data, input, eligibleIds);
    return failure ? fail(failure) : { output: parsed.data, model: deps.model };
  };
}
