import { describe, expect, it } from 'vitest';
import type {
  AskAnswer,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
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
  answerPrefix,
  pendingFollowUp,
  shortAnswer,
  shownAbove,
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
      { id: 'habits', label: 'Better habits' },
    ]);
  });

  it('the starters, each with its topic', () => {
    expect(STARTERS).toEqual([
      { question: 'Can I go for a morning walk today?', topic: 'outdoors' },
      { question: 'Is it a good idea to open my windows?', topic: 'windows' },
      { question: 'How can I improve my indoor air?', topic: 'indoor' },
      // The first 4 show on Ask (owner, 27 Nov); the 5th waits under More
      // topics.
      {
        question: 'How can I reduce pollution while commuting?',
        topic: 'commuting',
      },
      {
        question:
          "What should I consider for my children's outdoor activities?",
        topic: 'family',
      },
    ]);
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
        'I can help with outdoor plans, windows and ventilation, indoor air, family, commuting and better habits.',
      errorTitle: "We couldn't answer that",
      errorFallback: 'Something went wrong answering your question.',
      tryAgain: 'Try again',
      intro: "Answers come from AirAware's rules and today's forecast.",
      // Ask UX spec (owner, 27 Nov).
      welcome: 'How can I help you today?',
      moreTopics: 'More topics',
      placeholder: 'Ask about your air, home or daily routine…',
      conversation: 'Conversation',
      forecastUnavailable: 'forecast unavailable right now',
      assistant: 'AirAware',
      copy: 'Copy answer',
      copied: 'Copied',
      copyFailed: "Couldn't copy. Select the text to copy it instead.",
      followUpIntro: 'One question so I can be more specific:',
      followUpNote:
        'This changes your answers for this visit. To keep them, save in My Profile.',
      skip: 'Skip',
      skipped: 'Skipped. You can answer it in My Profile any time.',
      noted: "Noted. That doesn't change this answer.",
      stillApplies: 'Also still applies (see above):',
      alsoAsk: 'You could also ask:',
      askedPrefix: 'You asked:',
      answeredPrefix: 'You answered:',
    });
    expect(answeredLine('Yes')).toBe('You answered: Yes.');
    // Final review: an answer's heading names its question (WCAG 2.4.6).
    expect(answerPrefix('Do you exercise outdoors?')).toBe(
      'Your answer to "Do you exercise outdoors?":',
    );
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
// Review of the audit: "Also still applies (see above)" may only name cards
// still on screen above; the thread keeps the newest 10 replies.
describe('shownAbove', () => {
  const reply = (id: number, cards: string[], shown?: string[]): AskEntry => ({
    id,
    echo: 'q',
    said: 'asked',
    request: null,
    status: 'ready',
    answer: {
      ...rulesAskFixture,
      cards: cards.map((cardId) => ({
        ...rulesAskFixture.cards[0]!,
        id: cardId,
      })),
    },
    ...(shown && { shown }),
  });

  it('keeps only cards a reply above still shows', () => {
    const map = shownAbove([
      reply(1, ['a', 'b']),
      reply(2, ['a', 'b', 'c'], ['a', 'b']),
    ]);
    expect(map.get(2)).toEqual(['a', 'b']);
  });

  it('drops cards whose reply is no longer in the thread', () => {
    // Reply 1 (cards a, b) has gone: nothing above shows them.
    const map = shownAbove([reply(2, ['a', 'b', 'c'], ['a', 'b'])]);
    expect(map.get(2)).toEqual([]);
  });

  it('follows a chain: the second update knows the first update’s cards', () => {
    const map = shownAbove([
      reply(1, ['a']),
      reply(2, ['a', 'b'], ['a']),
      reply(3, ['a', 'b', 'c'], ['a', 'b']),
    ]);
    expect(map.get(3)).toEqual(['a', 'b']);
  });
});

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

  // Final review: a rollback can pair a new tab with an older server.
  it('an answer without followUps offers nothing and does not throw', () => {
    const old: Partial<AskAnswer> = { ...offering };
    delete old.followUps;
    expect(
      pendingFollowUp([entry(1, old as AskAnswer)], {}, new Set()),
    ).toBeNull();
  });

  // Deferred minor: never asked back, even if a server offered it (Profile only).
  it('never asks "may be more sensitive"', () => {
    expect(
      field([
        entry(1, {
          ...offering,
          followUps: [
            { field: 'householdNeeds.mayBeMoreSensitive', changes: ['yes'] },
            offering.followUps[1]!,
          ],
        }),
      ]),
    ).toBe('commuteMode');
  });

  // Deferred minor: answers changed elsewhere (My Profile) since this reply,
  // so its offers were worked out against old answers: the question goes.
  it('a question back goes once the answers change elsewhere', () => {
    const place = { label: 'Pune', latitude: 18.52, longitude: 73.86 };
    const asked = (householdContext: HouseholdContext) =>
      entry(1, offering, {
        request: { topic: 'outdoors', place, householdContext },
      });
    expect(field([asked({})], {})).toBe('outdoorExercise');
    expect(
      field([asked({})], { routine: { outdoorExercise: false } }),
    ).toBeNull();
    expect(field([asked({})], { home: { airPurifier: true } })).toBeNull();
    const purifier = { home: { airPurifier: true } };
    expect(field([asked(purifier)], purifier)).toBe('outdoorExercise');
  });

  it('skips a skipped or unknown question for the next one', () => {
    const one = [entry(1, offering)];
    expect(field(one, {}, new Set(['routine.outdoorExercise']))).toBe(
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
