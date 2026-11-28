import { describe, expect, it } from 'vitest';
import {
  ASK_OUTPUT_JSON_SCHEMA,
  checkAskOutput,
  type AskOutput,
} from './askOutput.ts';
import { askInput } from './fixtures.ts';

const eligible = new Set(
  askInput.candidates.filter((c) => c.section !== 'notice').map((c) => c.id),
);
const first = [...eligible][0] as string;
const ok: AskOutput = {
  scope: 'answered',
  answer:
    'Particle levels are forecast above the limit, so keep smoke indoors low.',
  topic: 'indoor',
  cardIds: [first],
};

describe('checkAskOutput', () => {
  it('accepts a grounded answer', () =>
    expect(checkAskOutput(ok, askInput, eligible)).toBeNull());
  it('accepts out_of_scope whatever else it says', () =>
    expect(
      checkAskOutput(
        { ...ok, scope: 'out_of_scope', answer: '', cardIds: ['x'] },
        askInput,
        eligible,
      ),
    ).toBeNull());
  it.each([
    [{ answer: 'Too short.' }, 'length'],
    [{ answer: 'x'.repeat(301) }, 'length'],
    [{ cardIds: ['not.sent'] }, 'ids'],
    [{ cardIds: [first, first] }, 'ids'],
    [{ cardIds: [...eligible].slice(0, 4) }, 'ids'],
    [{ answer: 'At 500 it is still within the limit for today.' }, 'numbers'],
    [{ answer: 'The air is safe for a morning walk today.' }, 'wording'],
    [{ answer: 'Yes, go ahead and open the windows today.' }, 'verdict'],
  ])('rejects %o as %s', (change, failure) =>
    expect(checkAskOutput({ ...ok, ...change }, askInput, eligible)).toBe(
      failure,
    ),
  );
  it('has at least 4 eligible cards for the ids case', () =>
    expect(eligible.size).toBeGreaterThanOrEqual(4));
  it('sends no limits on the wire', () =>
    expect(JSON.stringify(ASK_OUTPUT_JSON_SCHEMA)).not.toMatch(
      /minItems|maxItems|minLength|maxLength/,
    ));
});
