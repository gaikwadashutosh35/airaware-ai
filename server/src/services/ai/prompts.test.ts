import { describe, expect, it } from 'vitest';
import { PROMPT_VERSION, TASK_PROMPT } from './prompts.ts';

describe('daily-plan prompt (D6)', () => {
  it('is version 3 and does not say "live" air information', () => {
    const flat = TASK_PROMPT.replace(/\s+/g, ' ');
    expect(PROMPT_VERSION).toBe('daily-plan-v3');
    expect(flat).toContain('say that air information is unavailable');
    expect(flat).not.toContain('live air');
  });
});
