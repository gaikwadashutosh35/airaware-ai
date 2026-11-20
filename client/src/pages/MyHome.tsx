import { useId } from 'react';
import type {
  DailyPlan,
  GuideCard,
  HouseholdContext,
} from '../../../shared/contracts.ts';
import { ErrorState, Loading } from '../components/States.tsx';
import { useRequest } from '../features/air-quality/useRequest.ts';
import { PlanCard } from '../features/daily-plan/PlanCard.tsx';
import { groupPlan } from '../features/daily-plan/planDisplay.ts';
import { GuideGroups } from '../features/guides/GuideGroups.tsx';
import { getGuides } from '../services/api.ts';

// My Home (spec §7.5): today's indoor cards from the plan, then the guide
// library's ways to improve indoor air. A guide card whose rule today's plan
// already shows is hidden, so the same advice never appears twice.
export function MyHome({
  plan,
  context,
}: {
  // The plan on Today, or null before it is built.
  plan: DailyPlan | null;
  // The answers on screen, saved or not.
  context: HouseholdContext;
}) {
  const guides = useRequest('guides:home', (signal) =>
    getGuides('home', signal),
  );
  const todayId = useId();
  const waysId = useId();

  // Full cards: an AI plan's "Your day" repeats have no place here.
  const today = plan
    ? (groupPlan(plan)
        .topics.find((topic) => topic.section === 'indoor')
        ?.items.map((item) => ({ ...item, compact: false })) ?? [])
    : [];
  const shown = new Set(today.map((item) => item.candidate.id));
  const hide = (card: GuideCard) =>
    (card.personalRuleId !== undefined && shown.has(card.personalRuleId)) ||
    (card.id === 'guide.busy-road' && context.home?.nearBusyRoad !== 'yes') ||
    // Never contradict an answer: no exhaust, no "use the exhaust".
    (card.id === 'guide.kitchen-exhaust' &&
      context.home?.kitchenExhaust === false);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">My Home</h1>
      {plan && today.length > 0 && (
        <section aria-labelledby={todayId} className="flex flex-col gap-3">
          <h2 id={todayId} className="text-2xl font-semibold tracking-tight">
            Today, for your home
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {today.map((item) => (
              <PlanCard
                key={item.candidate.id}
                item={item}
                sources={plan.sources}
                level={3}
                whyLabel="Why it matters"
              />
            ))}
          </div>
          {/* As on Today: who made it, and the safety note, even when the
              guides below fail to load. */}
          <p className="text-sm text-text-dark-muted">
            {`${plan.generatedBy === 'ai' ? 'Made with AI' : 'Made by our rules'}. ${plan.safetyNote}`}
          </p>
        </section>
      )}
      <section aria-labelledby={waysId} className="flex flex-col gap-6">
        <h2 id={waysId} className="text-2xl font-semibold tracking-tight">
          Ways to improve indoor air
        </h2>
        {guides.state.status === 'ready' ? (
          <GuideGroups set={guides.state.data} level={3} hide={hide} />
        ) : guides.state.status === 'error' ? (
          <ErrorState
            error={guides.state.error}
            onRetry={guides.retry}
            title="We couldn't load the guides"
            fallback="Something went wrong loading the guides."
          />
        ) : (
          <Loading label="Loading guides" />
        )}
      </section>
    </>
  );
}
