import { useId } from 'react';
import type {
  GuideCard,
  GuideGroup,
  GuideSet,
} from '../../../../shared/contracts.ts';
import { PlanCard } from '../daily-plan/PlanCard.tsx';

// The guide library's groups: each with its heading at `level` and its cards
// one level below, then the safety note. A group left empty by `hide` goes.
export function GuideGroups({
  set,
  level,
  hide = () => false,
}: {
  set: GuideSet;
  // 3 under My Home's "Ways to improve indoor air", 2 on Better Habits.
  level: 2 | 3;
  hide?: (card: GuideCard) => boolean;
}) {
  const groups = set.groups
    .map((group) => ({
      ...group,
      cards: group.cards.filter((card) => !hide(card)),
    }))
    .filter((group) => group.cards.length > 0);

  return (
    // F-25: the cards flow in as many 20rem columns as fit; a group with
    // several cards takes as many of them as it has cards. DOM order is the
    // visual order, so nothing is reordered.
    <div className="@container grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-x-4 gap-y-8">
      {groups.map((group) => (
        <Group
          key={group.id}
          group={group}
          level={level}
          sources={set.sources}
        />
      ))}
      <p className="col-span-full text-sm">{set.safetyNote}</p>
    </div>
  );
}

function Group({
  group,
  level,
  sources,
}: {
  group: GuideGroup;
  level: 2 | 3;
  sources: GuideSet['sources'];
}) {
  const id = useId();
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section
      aria-labelledby={id}
      className={`grid grid-cols-subgrid grid-rows-[auto_1fr] gap-y-3 ${
        group.cards.length > 1 ? '@min-[41rem]:col-span-2' : ''
      } ${group.cards.length > 2 ? '@min-[62rem]:col-span-3' : ''}`}
    >
      <Heading
        id={id}
        className={`col-span-full ${
          level === 2
            ? 'text-2xl font-semibold tracking-tight'
            : 'text-xl font-semibold'
        }`}
      >
        {group.heading}
      </Heading>
      {group.cards.map((card) => (
        <PlanCard
          key={card.id}
          item={{
            candidate: card,
            forYou: null,
            period: null,
            compact: false,
          }}
          sources={sources}
          level={level === 2 ? 3 : 4}
        />
      ))}
    </section>
  );
}
