import { describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  AskTopic,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import { TOPIC_CARDS, chooseCards } from './ask.ts';
import { ASK_GUIDES, guideSet } from './guides.ts';
import { RULE_IDS, buildCandidates } from './rules.ts';

const TOPICS: AskTopic[] = [
  'outdoors',
  'windows',
  'indoor',
  'family',
  'commuting',
  'habits',
];

function air(level: 'elevated' | 'not_elevated'): AirAssessment {
  const above = level === 'elevated';
  return {
    level,
    windowStart: '2026-11-19T00:00:00.000Z',
    checks: [
      {
        pollutant: 'PM2_5',
        status: above ? 'above_limit' : 'within_limit',
        average24h: above ? 75 : 40,
        limit: 60,
      },
      {
        pollutant: 'PM10',
        status: 'within_limit',
        average24h: 80,
        limit: 100,
      },
    ],
  };
}

const FULL: HouseholdContext = {
  routine: { commuteMode: 'car', outdoorExercise: true, schoolCommute: true },
  home: {
    nearBusyRoad: 'yes',
    cookingFuel: 'biomass',
    kitchenExhaust: false,
    airPurifier: true,
  },
  householdNeeds: {
    includesChildren: true,
    includesOlderAdults: true,
    mayBeMoreSensitive: true,
  },
};

const libraryIds = new Set(
  [
    ...ASK_GUIDES,
    ...guideSet('home').groups.flatMap((g) => g.cards),
    ...guideSet('habits').groups.flatMap((g) => g.cards),
  ].map((c) => c.id),
);

const pick = (
  topic: AskTopic,
  context: HouseholdContext,
  level: 'elevated' | 'not_elevated',
) => chooseCards(topic, buildCandidates(context, air(level)), context);

describe('chooseCards', () => {
  it('every card id exists, and every Ask guide is used', () => {
    for (const topic of TOPICS) {
      for (const id of TOPIC_CARDS[topic].rules) {
        expect(RULE_IDS, `${topic}: ${id}`).toContain(id);
      }
      for (const id of TOPIC_CARDS[topic].guides) {
        expect(libraryIds.has(id), `${topic}: ${id}`).toBe(true);
      }
    }
    const used = new Set(TOPICS.flatMap((t) => TOPIC_CARDS[t].guides));
    for (const card of ASK_GUIDES)
      expect(used.has(card.id), card.id).toBe(true);
  });

  it('no answers, within the limits: the right cards per topic', () => {
    const ids = (topic: AskTopic) =>
      pick(topic, {}, 'not_elevated').map((c) => c.id);
    expect(ids('outdoors')).toEqual([
      'guide.check-forecast',
      'guide.away-from-traffic',
    ]);
    expect(ids('windows')).toEqual(['guide.ventilate-sources']);
    expect(ids('indoor')).toEqual([
      'indoor.smoke-sources',
      'guide.kitchen-exhaust',
      'guide.cleaner-fuel',
    ]);
    expect(ids('family')).toEqual([
      'guide.children',
      'guide.older-sensitive',
      'guide.school-run',
    ]);
    expect(ids('commuting')).toEqual([
      'guide.away-from-traffic',
      'guide.no-idling',
      'guide.school-run',
    ]);
    expect(ids('habits')).toEqual([
      'swap.no-open-burning',
      'guide.no-idling',
      'guide.cleaner-fuel',
    ]);
  });

  it('full answers above the limit: at most 3, by priority, yours first', () => {
    const order = { high: 0, medium: 1, low: 2 };
    for (const topic of TOPICS) {
      const cards = pick(topic, FULL, 'elevated');
      expect(cards.length, topic).toBeGreaterThan(0);
      expect(cards.length, topic).toBeLessThanOrEqual(3);
      const personal = cards.filter((c) => !c.id.startsWith('guide.'));
      const guides = cards.filter((c) => c.id.startsWith('guide.'));
      expect(cards, topic).toEqual([...personal, ...guides]);
      const ranks = personal.map((c) => order[c.priority]);
      expect(ranks, topic).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it('a guide is hidden beside its twin, and never contradicts an answer', () => {
    // commute.lower-traffic fires for a walker above the limit.
    const walker: HouseholdContext = { routine: { commuteMode: 'walk' } };
    const outdoors = pick('outdoors', walker, 'elevated').map((c) => c.id);
    expect(outdoors).toContain('commute.lower-traffic');
    expect(outdoors).not.toContain('guide.away-from-traffic');

    const noExhaust: HouseholdContext = { home: { kitchenExhaust: false } };
    expect(
      pick('indoor', noExhaust, 'not_elevated').map((c) => c.id),
    ).not.toContain('guide.kitchen-exhaust');
  });

  it('busy road needs a yes', () => {
    const yes: HouseholdContext = { home: { nearBusyRoad: 'yes' } };
    // The rule answers personally; without a yes nothing about it shows.
    expect(pick('windows', yes, 'not_elevated').map((c) => c.id)).toContain(
      'home.busy-road',
    );
    for (const topic of TOPICS) {
      expect(
        pick(topic, {}, 'elevated').map((c) => c.id),
        topic,
      ).not.toContain('guide.busy-road');
    }
  });

  it('never a notice, and the cards are unchanged', () => {
    for (const topic of TOPICS) {
      for (const level of ['elevated', 'not_elevated'] as const) {
        for (const card of pick(topic, FULL, level)) {
          expect(card.section, `${topic} ${card.id}`).not.toBe('notice');
        }
      }
    }
    const fromLibrary = pick('family', {}, 'not_elevated');
    expect(fromLibrary[0]).toBe(
      ASK_GUIDES.find((c) => c.id === 'guide.children'),
    );
  });
});
