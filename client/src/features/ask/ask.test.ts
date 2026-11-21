import { describe, expect, it } from 'vitest';
import type { AskAnswer } from '../../../../shared/contracts.ts';
import {
  aiAskFixture,
  medicalAskFixture,
  rulesAskFixture,
  unknownAirAskFixture,
} from '../../test/askFixtures.ts';
import {
  ASK_COPY,
  STARTERS,
  TOPICS,
  answeredCount,
  answeredLine,
  pendingFollowUp,
  shortAnswer,
  startersFor,
  suggestionsFor,
} from './ask.ts';
import type { AskEntry } from './useAsk.ts';

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
      greetingTail:
        "I'm AirAware. Ask me about your day, your home or your commute.",
      followUpIntro: 'One question so I can be more specific:',
      followUpNote:
        'This changes your answers for this visit. To keep them, save in My Profile.',
      skip: 'Skip',
      skipped: 'Skipped. You can answer it in My Profile any time.',
      noted: "Noted. That doesn't change today's advice.",
      alsoAsk: 'You could also ask:',
      askedPrefix: 'You asked:',
      answeredPrefix: 'You answered:',
    });
    expect(answeredLine('Yes')).toBe('You answered: Yes.');
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

// Guided chat (Task 3).
describe('suggestionsFor', () => {
  it('suggestions follow the topic map and never repeat the topic', () => {
    expect(suggestionsFor('outdoors').map((s) => s.question)).toEqual([
      'How can I reduce pollution while commuting?',
      "What should I consider for my children's outdoor activities?",
      'Is it a good idea to open my windows?',
    ]);
    expect(suggestionsFor('habits').map((s) => s.question)).toEqual([
      'How can I reduce pollution while commuting?',
      'How can I improve my indoor air?',
    ]);
    for (const { id } of TOPICS) {
      const shown = suggestionsFor(id);
      expect(shown.length, id).toBeGreaterThanOrEqual(2);
      expect(
        shown.every((s) => s.topic !== id),
        id,
      ).toBe(true);
    }
  });
});

describe('pendingFollowUp', () => {
  const offering: AskAnswer = {
    ...rulesAskFixture,
    followUps: [
      { field: 'routine.outdoorExercise', changes: ['yes'] },
      { field: 'routine.commuteMode', changes: ['walk'] },
    ],
  };
  const entry = (
    id: number,
    answer: AskAnswer,
    more: Partial<AskEntry> = {},
  ): AskEntry => ({
    id,
    echo: 'q',
    said: 'asked',
    request: null,
    status: 'ready',
    answer,
    ...more,
  });
  const field = (
    entries: AskEntry[],
    context = {},
    skipped = new Set<string>(),
  ) => pendingFollowUp(entries, context, skipped)?.field.key ?? null;

  it('a question back comes only from the newest topic answer', () => {
    expect(pendingFollowUp([entry(1, offering)], {}, new Set())).toMatchObject({
      entryId: 1,
      field: { label: 'Do you exercise outdoors?' },
      changes: ['yes'],
    });
    expect(field([entry(1, offering), entry(2, rulesAskFixture)])).toBeNull();
    expect(
      field([
        entry(1, { ...medicalAskFixture, followUps: offering.followUps }),
      ]),
    ).toBeNull();
    expect(field([entry(1, offering, { status: 'thinking' })])).toBeNull();
    expect(
      field([
        entry(1, offering, {
          followUp: { field: 'routine.outdoorExercise', outcome: 'skipped' },
        }),
      ]),
    ).toBeNull();
  });

  it('skips a skipped, answered or unknown question for the next one', () => {
    const one = [entry(1, offering)];
    expect(field(one, {}, new Set(['routine.outdoorExercise']))).toBe(
      'commuteMode',
    );
    expect(field(one, { routine: { outdoorExercise: false } })).toBe(
      'commuteMode',
    );
    expect(
      field([
        entry(1, {
          ...offering,
          followUps: [
            { field: 'home.nope', changes: ['yes'] },
            offering.followUps[1]!,
          ],
        }),
      ]),
    ).toBe('commuteMode');
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
