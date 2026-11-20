import { describe, expect, it } from 'vitest';
import {
  aiAskFixture,
  rulesAskFixture,
  unknownAirAskFixture,
} from '../../test/askFixtures.ts';
import {
  ASK_COPY,
  STARTERS,
  TOPICS,
  answeredCount,
  shortAnswer,
  startersFor,
} from './ask.ts';

describe('Ask wording', () => {
  it('the topic chips, in order', () => {
    expect(TOPICS).toEqual([
      { id: 'outdoors', label: 'Outdoor activities' },
      { id: 'windows', label: 'Windows and ventilation' },
      { id: 'indoor', label: 'Indoor air' },
      { id: 'family', label: 'My family' },
      { id: 'commuting', label: 'Commuting' },
      { id: 'habits', label: 'Greener habits' },
    ]);
  });

  it('the starters, each with its topic', () => {
    expect(STARTERS).toEqual([
      { question: 'Can I go for a morning walk today?', topic: 'outdoors' },
      { question: 'Is it a good idea to open my windows?', topic: 'windows' },
      { question: 'How can I improve my indoor air?', topic: 'indoor' },
      {
        question:
          "What should I consider for my children's outdoor activities?",
        topic: 'family',
      },
      {
        question: 'How can I reduce pollution while commuting?',
        topic: 'commuting',
      },
    ]);
  });

  it("the current topic's starters come first", () => {
    expect(startersFor('family').map((s) => s.topic)).toEqual([
      'family',
      'outdoors',
      'windows',
      'indoor',
      'commuting',
    ]);
    expect(startersFor(null)).toEqual(STARTERS);
    expect(startersFor('habits')).toEqual(STARTERS);
  });

  it('the fixed sentences, word for word', () => {
    expect(ASK_COPY).toEqual({
      heading: 'Ask AirAware',
      inputLabel: 'Ask about your air, home or day',
      send: 'Send',
      thinking: 'AirAware is thinking…',
      medical:
        "I can't give medical advice. For health concerns, please talk to a doctor.",
      outOfScope:
        'I can help with outdoor plans, windows and ventilation, indoor air, family and greener habits',
      errorTitle: "We couldn't answer that",
      errorFallback: 'Something went wrong answering your question.',
      tryAgain: 'Try again',
    });
  });

  it('no fixed Ask string says safe, healthy, clean air or AQI', () => {
    const strings = [
      ...Object.values(ASK_COPY),
      ...TOPICS.map((t) => t.label),
      ...STARTERS.map((s) => s.question),
    ];
    for (const text of strings) {
      expect(text).not.toMatch(/\bsafe|healthy|clean air|\baqi\b/i);
    }
  });
});

describe('answeredCount', () => {
  it('counts the household answers given, out of 10', () => {
    expect(answeredCount({})).toBe(0);
    expect(
      answeredCount({
        routine: { outdoorExercise: true, commuteMode: 'car' },
        home: { airPurifier: true, kitchenExhaust: false },
      }),
    ).toBe(4);
  });

  it('"No" and "Not sure" are answers', () => {
    expect(
      answeredCount({
        routine: {
          commuteMode: 'work_from_home',
          outdoorExercise: false,
          schoolCommute: false,
        },
        home: {
          nearBusyRoad: 'unknown',
          cookingFuel: 'prefer_not_to_say',
          kitchenExhaust: false,
          airPurifier: false,
        },
        householdNeeds: {
          includesChildren: false,
          includesOlderAdults: false,
          mayBeMoreSensitive: false,
        },
      }),
    ).toBe(10);
  });
});

describe('shortAnswer', () => {
  it('the AI summary when there is one', () => {
    expect(shortAnswer(aiAskFixture)).toBe(aiAskFixture.summary);
  });

  it("else the verdict's explanation", () => {
    expect(shortAnswer(rulesAskFixture)).toBe(
      'Fine particles (PM2.5) are forecast above the national daily limit for the next 24 hours.',
    );
    expect(shortAnswer(unknownAirAskFixture)).toBe(
      "We could not get a complete 24-hour forecast for this place, so there's no advice about today's air. The suggestions below apply on any day.",
    );
  });
});
