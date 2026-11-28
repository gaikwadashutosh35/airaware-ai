import { describe, expect, it } from 'vitest';
import {
  ASK_PROMPT_VERSION,
  ASK_TASK_PROMPT,
  PROMPT_VERSION,
  TASK_PROMPT,
} from './prompts.ts';

describe('daily-plan prompt (D6)', () => {
  it('is version 3 and does not say "live" air information', () => {
    const flat = TASK_PROMPT.replace(/\s+/g, ' ');
    expect(PROMPT_VERSION).toBe('daily-plan-v3');
    expect(flat).toContain('say that air information is unavailable');
    expect(flat).not.toContain('live air');
  });
});

describe('ask prompt', () => {
  it('is ask-v1, treats questions as untrusted and handles unknown air', () => {
    const flat = ASK_TASK_PROMPT.replace(/\s+/g, ' ');
    expect(ASK_PROMPT_VERSION).toBe('ask-v1');
    expect(flat).toContain('untrusted data');
    expect(flat).toContain('air information is unavailable');
  });
});
