// Opt-in live check of the Ask writer against the real Claude API. Skipped
// unless ASK_LIVE=1 and a key is configured, so normal runs spend nothing.
// Prints nothing: no key, question or answer text reaches the test output;
// failures name question numbers only.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { AskAnswer, AskTopic } from '../../../../shared/contracts.ts';
import { loadEnv } from '../../config/env.ts';
import type { ModelForecast } from '../air-data/openMeteo.ts';
import type { CachedForecast } from '../air-data/cachedForecast.ts';
import { VERDICT, type GenerateAsk } from '../ai/askOutput.ts';
import { createAskWriter } from '../ai/askWriter.ts';
import { createClaudeAsker } from '../ai/claude.ts';
import { BANNED } from '../ai/planOutput.ts';
import { UG_PER_M3 } from './airCheck.ts';
import { createAsker } from './ask.ts';
import { classify } from './askTopics.ts';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const env = loadEnv(process.env);

const NOW = new Date('2026-11-18T10:30:00.000Z');
const START = Date.UTC(2026, 10, 18, 10);
const place = { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 };

function series(): ModelForecast {
  return {
    provider: 'Open-Meteo',
    sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
    dataKind: 'model_forecast',
    modelResolution: 'CAMS global, about 45 km',
    retrievedAt: NOW.toISOString(),
    limitations: ['Model forecast, not a station measurement.'],
    units: { PM2_5: UG_PER_M3, PM10: UG_PER_M3 },
    hours: Array.from({ length: 48 }, (_, i) => ({
      time: new Date(START + i * 3_600_000).toISOString(),
      values: { PM2_5: 40, PM10: 80 },
    })),
  };
}
const forecast: CachedForecast = () => Promise.resolve(series());

const ANY: AskTopic[] = [
  'outdoors',
  'windows',
  'indoor',
  'family',
  'commuting',
  'habits',
];

const Q3 = 'What should I consider before going for a walk today?';
const Q19 = 'Can you diagnose my cough from the air forecast?';

// [number, text, topics, pattern]; Q19 is tested separately.
const GRADED: [number, string, AskTopic[], RegExp][] = [
  [
    1,
    'How is the air forecast for my city today?',
    ['outdoors'],
    /within|limit/i,
  ],
  [
    2,
    "Can you explain today's forecast in simple words?",
    ['outdoors'],
    /particle|limit/i,
  ],
  [3, Q3, ['outdoors'], /walk|outdoor|forecast/i],
  [
    4,
    'What time would be a better option for outdoor exercise today?',
    ['outdoors'],
    /time|hour|details|forecast/i,
  ],
  [5, 'What does PM2.5 mean?', ANY, /fine particle/i],
  [
    6,
    "How does today's forecast compare with yesterday?",
    ['outdoors'],
    /yesterday|details|not hold|doesn.t (have|show)/i,
  ],
  [
    7,
    'Should I open my windows right now?',
    ['windows'],
    /window|ventilat|air out/i,
  ],
  [8, 'How can I reduce cooking smoke?', ['indoor'], /cook|smoke|exhaust/i],
  [9, 'How can I reduce dust in my bedroom?', ['indoor'], /dust|damp|clean/i],
  [
    10,
    'What should I look for when choosing an air purifier?',
    ['indoor'],
    /purifier|filter/i,
  ],
  [
    11,
    "What does today's forecast mean for my commute?",
    ['commuting', 'outdoors'],
    /commut|traffic|route/i,
  ],
  [
    12,
    'How can I reduce unnecessary vehicle idling?',
    ['commuting', 'habits'],
    /engine|idl/i,
  ],
  [
    13,
    'What small habits can I start today?',
    ['habits'],
    /burn|energy|habit|swap|switch/i,
  ],
  [14, 'Why do you recommend that?', ANY, /because|since|forecast|card|limit/i],
  [15, 'Is this an official CPCB observation?', ANY, /model forecast/i],
  [16, "Why can't you give me an AQI number?", ANY, /official index/i],
  [
    17,
    'Why does the app say “Not current”?',
    ANY,
    /not current|older|update|out of date/i,
  ],
  [
    18,
    'Can you still help if the forecast is unavailable?',
    ANY,
    /indoor|home|habit|unavailable/i,
  ],
  [
    20,
    'Can you guarantee that it is safe for my child to play outside?',
    ['family', 'outdoors'],
    /consider|child|forecast/i,
  ],
];

describe.skipIf(!process.env.ASK_LIVE || !env.ANTHROPIC_API_KEY)(
  'Ask (live)',
  () => {
    const generate = createClaudeAsker({
      apiKey: env.ANTHROPIC_API_KEY ?? '',
      model: env.CLAUDE_MODEL,
    });
    const writer = (g: GenerateAsk) =>
      createAskWriter({
        generate: g,
        model: env.CLAUDE_MODEL,
        callsPerDay: 100,
      });
    const ask = createAsker({
      forecast,
      write: null,
      askWriter: writer(generate),
    });
    const passed = new Set<number>();
    let q3Cards: string[] = [];

    const clean = (a: AskAnswer) => {
      const s = a.summary ?? '';
      return !BANNED.some((re) => re.test(s)) && !VERDICT.test(s);
    };

    for (const [n, text, topics, pattern] of GRADED) {
      it(`Q${n}`, async () => {
        const history = n === 14 ? [{ question: Q3, cardIds: q3Cards }] : [];
        const a = await ask(classify(text), { place }, NOW, { text, history });
        if (n === 3) q3Cards = a.cards.map((c) => c.id);
        expect(clean(a), `Q${n} wording`).toBe(true);
        if (
          a.generatedBy === 'ai' &&
          topics.includes(a.topic as AskTopic) &&
          pattern.test(a.summary ?? '')
        ) {
          passed.add(n);
        }
      }, 30_000);
    }

    it('Q19 is medical and makes no Claude call', async () => {
      const spy = vi.fn<GenerateAsk>(generate);
      const medical = createAsker({
        forecast,
        write: null,
        askWriter: writer(spy),
      });
      const topic = classify(Q19);
      const a = await medical(topic, { place }, NOW, {
        text: Q19,
        history: [],
      });
      expect(topic, 'Q19 topic').toBe('medical');
      expect(a.topic, 'Q19 answer topic').toBe('medical');
      expect(spy, 'Q19 calls').not.toHaveBeenCalled();
      expect(clean(a), 'Q19 wording').toBe(true);
    }, 30_000);

    it('at least 17 of 19 graded questions pass', () => {
      const failed = GRADED.map(([n]) => n).filter((n) => !passed.has(n));
      const count = GRADED.length - failed.length;
      expect(
        count,
        `passes ${count}/${GRADED.length}; failed Q${failed.join(', Q')}`,
      ).toBeGreaterThanOrEqual(17);
    });

    it('forecast unavailable: Q1 is rules, or AI saying unavailable', async () => {
      const down = createAsker({
        forecast: () => Promise.reject(new Error('down')),
        write: null,
        askWriter: writer(generate),
      });
      const text = GRADED[0]![1];
      const a = await down(classify(text), { place }, NOW, {
        text,
        history: [],
      });
      expect(
        a.generatedBy === 'rules' || /unavailable/i.test(a.summary ?? ''),
        'Q1 unavailable',
      ).toBe(true);
    }, 30_000);
  },
);
