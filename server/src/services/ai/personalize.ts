// Asks the model for its part of the plan and accepts only an answer
// that passes every check. Logs the failure category, never the text.
import {
  checkPlanOutput,
  planOutputSchema,
  type PlanOutput,
  type PlanWriterInput,
} from './planOutput.ts';

export type GeneratePlan = (input: PlanWriterInput) => Promise<string>;

function fail(category: string): null {
  console.error(`Gemini plan failed: ${category}`);
  return null;
}

export async function personalize(
  input: PlanWriterInput,
  generate: GeneratePlan,
): Promise<PlanOutput | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      text = await generate(input);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'unknown');
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      fail('invalid json');
      continue;
    }

    const parsed = planOutputSchema.safeParse(json);
    if (!parsed.success) {
      fail('schema');
      continue;
    }

    const failure = checkPlanOutput(parsed.data, input);
    return failure ? fail(failure) : parsed.data;
  }
  return null;
}
