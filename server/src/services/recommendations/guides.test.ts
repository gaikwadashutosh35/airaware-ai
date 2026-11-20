// The guide library (decision G1 A). Its wording and sources are fixed by
// docs/superpowers/specs/2026-11-20-guide-library.md.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  GuideCard,
  GuideTopic,
  SourceReferenceId,
} from '../../../../shared/contracts.ts';
import { ASK_GUIDES, guideSet } from './guides.ts';
import { SAFETY_NOTE } from './plan.ts';
import { RULE_IDS, SOURCE_REFERENCES, buildCandidates } from './rules.ts';

const SPEC = new URL(
  '../../../../docs/superpowers/specs/2026-11-20-guide-library.md',
  import.meta.url,
);
const TICK = String.fromCharCode(96);

interface SpecCard {
  id: string;
  twin?: string;
  // The fields the spec says repeat the rule's own words.
  ownFields: string[];
  fields: Record<string, string>;
}

// The library spec's cards: a bold, backticked guide id line, then its
// "- **Field:** value" lines.
function specCards(): Map<string, SpecCard> {
  const cards = new Map<string, SpecCard>();
  const head = new RegExp(`^\\*\\*${TICK}(guide\\.[a-z-]+)${TICK}\\*\\*(.*)$`);
  const twin = new RegExp(`twin ${TICK}([a-z.-]+)${TICK}`);
  let current: SpecCard | null = null;
  for (const line of readFileSync(SPEC, 'utf8').split(/\r?\n/)) {
    const card = head.exec(line);
    if (card) {
      current = {
        id: card[1]!,
        twin: twin.exec(card[2]!)?.[1],
        ownFields:
          /the rule's own ([a-z ]+)\)/
            .exec(card[2]!)?.[1]
            ?.split(' ')
            .filter((word) => word !== 'and') ?? [],
        fields: {},
      };
      cards.set(current.id, current);
      continue;
    }
    if (line.startsWith('#') || line.startsWith('---')) current = null;
    const field =
      /^- \*\*(Title|Text|Why it matters|Caveat|Sources):\*\* (.*)$/.exec(line);
    if (current && field) current.fields[field[1]!] = field[2]!;
  }
  return cards;
}

const elevatedAir: AirAssessment = {
  level: 'elevated',
  windowStart: '2026-11-19T00:00:00.000Z',
  checks: [
    { pollutant: 'PM2_5', status: 'above_limit', average24h: 75, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 80, limit: 100 },
  ],
};

const cardsOf = (topic: GuideTopic): GuideCard[] =>
  guideSet(topic).groups.flatMap((group) => group.cards);
const allCards = (): GuideCard[] => [
  ...cardsOf('home'),
  ...cardsOf('habits'),
  ...ASK_GUIDES,
];

describe('guide library', () => {
  it('home groups come in order', () => {
    expect(guideSet('home').groups.map((g) => g.heading)).toEqual([
      'Cooking and smoke',
      'Ventilation',
      'Dust and cleaning',
      'Indoor habits',
      'Filtration',
      'Near a busy road',
    ]);
  });

  it('habits groups come in order', () => {
    expect(guideSet('habits').groups.map((g) => g.heading)).toEqual([
      'Daily commuting and vehicle idling',
      'Waste',
      'Cooking',
      'Energy use',
    ]);
  });

  it('has the reviewed 17 cards, in order', () => {
    expect(cardsOf('home').map((c) => c.id)).toEqual([
      'guide.kitchen-exhaust',
      'guide.cleaner-fuel',
      'guide.ventilate-sources',
      'guide.damp-cleaning',
      'guide.smoke-sources',
      'guide.purifier',
      'guide.busy-road',
    ]);
    expect(cardsOf('habits').map((c) => c.id)).toEqual([
      'guide.no-idling',
      'guide.no-open-burning',
      'guide.cleaner-fuel',
      'guide.star-label',
      'guide.fans-and-ac',
      'guide.lights-off',
    ]);
    expect(ASK_GUIDES.map((c) => c.id)).toEqual([
      'guide.check-forecast',
      'guide.away-from-traffic',
      'guide.children',
      'guide.older-sensitive',
      'guide.school-run',
    ]);
    expect(new Set(allCards().map((c) => c.id)).size).toBe(17);
  });

  it('every guide card cites a known source', () => {
    for (const card of allCards()) {
      expect(card.sourceIds.length, card.id).toBeGreaterThan(0);
      for (const id of card.sourceIds) {
        expect(SOURCE_REFERENCES[id], `${card.id}: ${id}`).toBeDefined();
      }
    }
  });

  it('cards are general guidance', () => {
    for (const card of allCards()) {
      expect(card.evidenceType, card.id).toBe('general_suggestion');
      expect(card.inputsUsed, card.id).toEqual([]);
      expect(card.priority, card.id).toBe('medium');
      expect(card.reason, card.id).not.toMatch(/\byou said\b/i);
    }
  });

  it('no guide card uses banned words or a savings figure', () => {
    const banned =
      /\bsafe|healthy|clean air|good air|bad air|\bAQI\b|%|per cent|\bkg\b|tonne/i;
    for (const card of allCards()) {
      for (const words of [card.title, card.text, card.reason, card.caveat]) {
        expect(words ?? '', card.id).not.toMatch(banned);
      }
    }
  });

  it('guide ids are unique, start with guide. and never clash with rule ids', () => {
    const byId = new Map<string, GuideCard>();
    for (const card of allCards()) {
      expect(card.id).toMatch(/^guide\./);
      expect(RULE_IDS).not.toContain(card.id);
      // The same id is the same card (one is shared by two topics).
      expect(byId.get(card.id) ?? card, card.id).toBe(card);
      byId.set(card.id, card);
    }
    for (const topic of ['home', 'habits'] as const) {
      const ids = cardsOf(topic).map((c) => c.id);
      expect(new Set(ids).size, topic).toBe(ids.length);
    }
  });

  it('the cleaner-fuel card is shared by both topics', () => {
    const home = cardsOf('home').find((c) => c.id === 'guide.cleaner-fuel');
    const habits = cardsOf('habits').find((c) => c.id === 'guide.cleaner-fuel');
    expect(home).toBeDefined();
    expect(habits).toBe(home);
  });

  it('personalRuleId names a real rule', () => {
    const twins = allCards().filter((c) => c.personalRuleId);
    expect(twins.length).toBeGreaterThan(0);
    for (const card of twins) {
      expect(RULE_IDS, card.id).toContain(card.personalRuleId);
    }
  });

  it('sources list only cited ones', () => {
    for (const topic of ['home', 'habits'] as const) {
      const set = guideSet(topic);
      const cited = new Set(cardsOf(topic).flatMap((c) => c.sourceIds));
      expect(set.sources.map((s) => s.id).sort()).toEqual([...cited].sort());
      for (const source of set.sources) {
        expect(source).toEqual({
          id: source.id,
          ...SOURCE_REFERENCES[source.id as SourceReferenceId],
        });
      }
    }
  });

  it('carries the safety note', () => {
    expect(guideSet('home').safetyNote).toBe(SAFETY_NOTE);
    expect(guideSet('habits').safetyNote).toBe(SAFETY_NOTE);
  });

  it('keeps the reviewed wording', () => {
    const card = (id: string) => allCards().find((c) => c.id === id)!;
    expect(card('guide.damp-cleaning')).toMatchObject({
      section: 'indoor',
      title: 'Clean with a damp cloth or mop',
      text: 'Dust surfaces with a damp cloth and mop floors instead of sweeping them dry.',
      reason: 'Dry sweeping and dusting lift settled dust back into the air.',
      sourceIds: ['epa-indoor-pm', 'mohfw-air-advisory-2025'],
    });
    expect(card('guide.fans-and-ac')).toMatchObject({
      section: 'swap',
      title: 'Use fans first, and keep the AC at 24 °C',
    });
    expect(card('guide.older-sensitive').text).toBe(
      "On days above the limit, India's health advisory asks older adults and people who may be more sensitive to avoid prolonged or strenuous exertion outdoors.",
    );
  });

  // DATA_GOVERNANCE §8: the library spec fixes the wording; the code must
  // match it, card by card.
  it('every card matches the library spec word for word', () => {
    const spec = specCards();
    const cards = [...new Map(allCards().map((c) => [c.id, c])).values()];
    expect([...spec.keys()].sort()).toEqual(cards.map((c) => c.id).sort());
    for (const card of cards) {
      const written = spec.get(card.id)!;
      expect(
        {
          title: card.title,
          text: card.text,
          reason: card.reason,
          caveat: card.caveat,
          sources: card.sourceIds.map((id) => TICK + id + TICK).join(', '),
          twin: card.personalRuleId,
        },
        card.id,
      ).toEqual({
        title: written.fields['Title'],
        text: written.fields['Text'],
        reason: written.fields['Why it matters'],
        caveat: written.fields['Caveat'],
        sources: written.fields['Sources'],
        twin: written.twin,
      });
    }
  });

  it("twins that reuse the rule's words match the rule", () => {
    const rules = buildCandidates(
      { home: { nearBusyRoad: 'yes' }, routine: { schoolCommute: true } },
      elevatedAir,
    );
    const reused = [...specCards().values()].filter((c) => c.ownFields.length);
    expect(reused.map((c) => c.id).sort()).toEqual([
      'guide.busy-road',
      'guide.no-open-burning',
      'guide.school-run',
      'guide.smoke-sources',
    ]);
    for (const written of reused) {
      const card = allCards().find((c) => c.id === written.id)!;
      const rule = rules.find((r) => r.id === written.twin);
      expect(rule, written.id).toBeDefined();
      for (const field of written.ownFields) {
        const key = field as 'title' | 'text' | 'reason';
        expect(card[key], `${written.id} ${key}`).toBe(rule![key]);
      }
    }
  });
});
