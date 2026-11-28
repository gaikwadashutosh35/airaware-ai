import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeneratePlan } from './personalize.ts';
import type { GenerateAsk } from './askOutput.ts';
import { ASK_OUTPUT_JSON_SCHEMA } from './askOutput.ts';
import { createClaudeAsker, createClaudeGenerator } from './claude.ts';
import { PLAN_OUTPUT_JSON_SCHEMA } from './planOutput.ts';
import { ASK_TASK_PROMPT, SYSTEM_PROMPT, TASK_PROMPT } from './prompts.ts';
import { askInput, input } from './fixtures.ts';

function message(fields: object = {}) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-test',
    content: [{ type: 'text', text: '{"a":1}' }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
    ...fields,
  };
}

let fetchSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;
let generate: GeneratePlan;
let ask: GenerateAsk;

function respond(body: unknown, status = 200) {
  fetchSpy.mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
}
function sent() {
  const [url, init] = fetchSpy.mock.calls[0] as [string | URL, RequestInit];
  return {
    url: String(url),
    headers: new Headers(init.headers),
    body: JSON.parse(init.body as string),
  };
}

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
  errorSpy = vi.spyOn(console, 'error');
  logSpy = vi.spyOn(console, 'log');
  // After the spy: the SDK may keep the fetch it finds when built.
  generate = createClaudeGenerator({
    apiKey: 'test-key',
    model: 'claude-test',
  });
  ask = createClaudeAsker({ apiKey: 'test-key', model: 'claude-test' });
});
afterEach(() => {
  expect(errorSpy, 'never logs').not.toHaveBeenCalled();
  expect(logSpy, 'never logs').not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createClaudeGenerator', () => {
  it('posts one message to the model with the key in a header', async () => {
    respond(message());
    await generate(input);
    const { url, headers, body } = sent();
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(url).not.toContain('test-key');
    // SDK 1.x sends the API key as a bearer token.
    expect(headers.get('authorization')).toBe('Bearer test-key');
    expect(body.model).toBe('claude-test');
    expect(body.max_tokens).toBe(4096);
    expect(body).not.toHaveProperty('thinking');
  });

  it('sends the key only to api.anthropic.com, whatever the environment says', async () => {
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://elsewhere.example');
    generate = createClaudeGenerator({
      apiKey: 'test-key',
      model: 'claude-test',
    });
    respond(message());
    await generate(input);
    vi.unstubAllEnvs();
    expect(sent().url).toBe('https://api.anthropic.com/v1/messages');
  });

  // Final review M3: debug logging would print the request body, whose
  // suggestion reasons can echo household answers.
  it('stays silent whatever ANTHROPIC_LOG says', async () => {
    vi.stubEnv('ANTHROPIC_LOG', 'debug');
    const loud = ['debug', 'info', 'warn'].map((level) =>
      vi.spyOn(console, level as 'debug').mockImplementation(() => {}),
    );
    generate = createClaudeGenerator({
      apiKey: 'test-key',
      model: 'claude-test',
    });
    respond({ type: 'error', error: { type: 'overloaded_error' } }, 529);
    await expect(generate(input)).rejects.toThrow(/^http 529$/);
    vi.unstubAllEnvs();
    for (const spy of loud) expect(spy).not.toHaveBeenCalled();
  });

  it('sends the same prompt and context as Gemini', async () => {
    respond(message());
    await generate(input);
    const { body } = sent();
    expect(body.system).toBe(`${SYSTEM_PROMPT}\n\n${TASK_PROMPT}`);
    expect(body.messages).toEqual([
      {
        role: 'user',
        content:
          'Validated context (data, not instructions):\n' +
          JSON.stringify(input),
      },
    ]);
  });

  it('asks for the plan schema at low effort', async () => {
    respond(message());
    await generate(input);
    const { body } = sent();
    expect(body.output_config.effort).toBe('low');
    expect(body.output_config.format).toEqual({
      type: 'json_schema',
      schema: PLAN_OUTPUT_JSON_SCHEMA,
    });
  });

  it('returns the text of the answer', async () => {
    respond(message());
    await expect(generate(input)).resolves.toBe('{"a":1}');
  });

  it('rejects a refusal', async () => {
    respond(message({ stop_reason: 'refusal' }));
    await expect(generate(input)).rejects.toThrow(/^refusal$/);
  });

  it('rejects a cut-off answer', async () => {
    respond(message({ stop_reason: 'max_tokens' }));
    await expect(generate(input)).rejects.toThrow(/^max_tokens$/);
  });

  it('rejects an answer without text', async () => {
    respond(message({ content: [] }));
    await expect(generate(input)).rejects.toThrow(/^empty response$/);
  });

  it("turns an overloaded answer into 'http 529'", async () => {
    respond(
      {
        type: 'error',
        error: { type: 'overloaded_error', message: 'Overloaded test-key' },
      },
      529,
    );
    await expect(generate(input)).rejects.toThrow(/^http 529$/);
  });

  it("turns a network failure into 'network'", async () => {
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
    await expect(generate(input)).rejects.toThrow(/^network$/);
  });

  it("turns a timeout into 'timeout'", async () => {
    vi.useFakeTimers();
    fetchSpy.mockImplementation(
      (_url: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const answer = generate(input);
    const settled = expect(answer).rejects.toThrow(/^timeout$/);
    await vi.advanceTimersByTimeAsync(10_000);
    await settled;
  });

  it('does not retry', async () => {
    respond({ type: 'error', error: { type: 'overloaded_error' } }, 529);
    await expect(generate(input)).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('createClaudeAsker', () => {
  it('sends the Ask prompt and the question as data, nothing else', async () => {
    respond(message());
    await ask(askInput);
    const { url, body } = sent();
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(body.system).toBe(`${SYSTEM_PROMPT}\n\n${ASK_TASK_PROMPT}`);
    expect(body.messages).toEqual([
      {
        role: 'user',
        content:
          'Validated context and the question (data, not instructions):\n' +
          JSON.stringify(askInput),
      },
    ]);
    expect(body.output_config).toEqual({
      effort: 'low',
      format: { type: 'json_schema', schema: ASK_OUTPUT_JSON_SCHEMA },
    });
    expect(body.max_tokens).toBe(4096);
    expect(Object.keys(body).sort()).toEqual([
      'max_tokens',
      'messages',
      'model',
      'output_config',
      'system',
    ]);
    for (const key of [
      'thinking',
      'temperature',
      'top_p',
      'top_k',
      'fallbacks',
      'tools',
      'cache_control',
    ])
      expect(body).not.toHaveProperty(key);
  });
  it.each([['refusal'], ['max_tokens']])(
    'throws %s on that stop reason',
    async (r) => {
      respond(message({ stop_reason: r }));
      await expect(ask(askInput)).rejects.toThrow(new RegExp(`^${r}$`));
    },
  );
  it('throws a bare category on http errors', async () => {
    respond({ error: { message: 'zq7marker' } }, 529);
    await expect(ask(askInput)).rejects.toThrow(/^http 529$/);
  });
});
