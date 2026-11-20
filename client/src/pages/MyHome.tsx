import { useId, useRef } from 'react';
import type { GuideCard, HouseholdContext } from '../../../shared/contracts.ts';
import { ErrorState, Loading } from '../components/States.tsx';
import { useRequest } from '../features/air-quality/useRequest.ts';
import { PlanCard } from '../features/daily-plan/PlanCard.tsx';
import {
  groupPlan,
  PLAN_STALE,
  type PlanReport,
} from '../features/daily-plan/planDisplay.ts';
import { GuideGroups } from '../features/guides/GuideGroups.tsx';
import { getGuides } from '../services/api.ts';

// My Home (spec §7.5): today's indoor cards from the plan, then the guide
// library's ways to improve indoor air. A guide card whose rule today's plan
// already shows is hidden, so the same advice never appears twice.
export function MyHome({
  today,
  context,
}: {
  // Today's plan area: building, failed, or the current plan.
  today: PlanReport;
  // The answers on screen, saved or not.
  context: HouseholdContext;
}) {
  const guides = useRequest('guides:home', (signal) =>
    getGuides('home', signal),
  );
  const todayId = useId();
  const waysId = useId();
  const todayRef = useRef<HTMLHeadingElement>(null);
  const waysRef = useRef<HTMLHeadingElement>(null);

  const plan = today.kind === 'ready' ? today.plan : null;
  // Full cards: an AI plan's "Your day" repeats have no place here.
  const cards = plan
    ? (groupPlan(plan)
        .topics.find((topic) => topic.section === 'indoor')
        ?.items.map((item) => ({ ...item, compact: false })) ?? [])
    : [];
  const shown = new Set(cards.map((item) => item.candidate.id));
  const hide = (card: GuideCard) =>
    (card.personalRuleId !== undefined && shown.has(card.personalRuleId)) ||
    (card.id === 'guide.busy-road' && context.home?.nearBusyRoad !== 'yes') ||
    // Never contradict an answer: no exhaust, no "use the exhaust".
    (card.id === 'guide.kitchen-exhaust' &&
      context.home?.kitchenExhaust === false);
  const showToday =
    today.kind === 'building' ||
    today.kind === 'error' ||
    today.kind === 'stale' ||
    cards.length > 0;
  // The plan builds on its own and can land later: say so politely.
  const announce =
    today.kind === 'building'
      ? "Finding today's suggestions…"
      : today.kind === 'stale'
        ? PLAN_STALE
        : cards.length > 0
          ? "Today's suggestions are ready."
          : '';

  return (
    <>
      <h1
        data-part="title-block"
        className="text-3xl font-semibold tracking-tight"
      >
        My Home
      </h1>
      <output className="sr-only">{announce}</output>
      {showToday && (
        <section
          aria-labelledby={todayId}
          className="flex flex-col gap-3 rounded-lg border border-rule bg-surface-light p-5 sm:p-6"
        >
          <h2
            id={todayId}
            ref={todayRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight"
          >
            Today, for your home
          </h2>
          {today.kind === 'building' && (
            <Loading label="Finding today's suggestions…" />
          )}
          {/* Never a stale plan as today's: say why there are no cards. */}
          {today.kind === 'stale' && <p>{PLAN_STALE}</p>}
          {today.kind === 'error' && (
            <ErrorState
              error={today.error}
              onRetry={() => {
                today.retry();
                // The button goes with the card: keep focus here.
                todayRef.current?.focus();
              }}
              title="We couldn't get today's suggestions"
              fallback="Something went wrong building your plan."
            />
          )}
          {plan && cards.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {cards.map((item) => (
                  <PlanCard
                    key={item.candidate.id}
                    item={item}
                    sources={plan.sources}
                    level={3}
                    whyLabel="Why it matters"
                  />
                ))}
              </div>
              {/* As on Today: who made it, and the safety note, even when
                  the guides below fail to load. */}
              <p className="text-sm text-text-dark-muted">
                {`${plan.generatedBy === 'ai' ? 'Made with AI' : 'Made by our rules'}. ${plan.safetyNote}`}
              </p>
            </>
          )}
        </section>
      )}
      <section
        aria-labelledby={waysId}
        className="flex flex-col gap-6 rounded-lg border border-rule bg-surface-light p-5 sm:p-6"
      >
        <h2
          id={waysId}
          ref={waysRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight"
        >
          Ways to improve indoor air
        </h2>
        {guides.state.status === 'ready' ? (
          <GuideGroups set={guides.state.data} level={3} hide={hide} />
        ) : guides.state.status === 'error' ? (
          <ErrorState
            error={guides.state.error}
            onRetry={() => {
              guides.retry();
              // The button goes with the card: keep focus on the section.
              waysRef.current?.focus();
            }}
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
