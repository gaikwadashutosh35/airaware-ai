import { useId, useRef } from 'react';
import type { GuideCard, HouseholdContext } from '../../../shared/contracts.ts';
import { ErrorState, Loading } from '../components/States.tsx';
import { useRequest } from '../features/air-quality/useRequest.ts';
import { PlanCard } from '../features/daily-plan/PlanCard.tsx';
import {
  groupPlan,
  NO_AIR,
  NO_CARD,
  PLAN_STALE,
  planAirLine,
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
  hasPlace,
}: {
  // Today's plan area: building, failed, or the current plan.
  today: PlanReport;
  // The answers on screen, saved or not.
  context: HouseholdContext;
  // A place is chosen, so today's plan is due: the section shows from the
  // first paint. Its placeholder is as tall as the plan a home with no
  // answers gets (one indoor card), so the page does not jump when it lands.
  hasPlace: boolean;
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
  const noAnswers = Object.keys(context).length === 0;
  const cards = plan
    ? (groupPlan(plan)
        .topics.find((topic) => topic.section === 'indoor')
        ?.items.map((item) => ({
          ...item,
          compact: false,
          // No answers, no "For you" line (B2).
          forYou: noAnswers ? null : item.forYou,
        })) ?? [])
    : [];
  const shown = new Set(cards.map((item) => item.candidate.id));
  const hide = (card: GuideCard) =>
    (card.personalRuleId !== undefined && shown.has(card.personalRuleId)) ||
    (card.id === 'guide.busy-road' && context.home?.nearBusyRoad !== 'yes') ||
    // Never contradict an answer: no exhaust, no "use the exhaust".
    (card.id === 'guide.kitchen-exhaust' &&
      context.home?.kitchenExhaust === false);
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
      <div data-part="title-block" className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">My Home</h1>
        <p className="text-sm text-text-dark">
          Indoor suggestions look at what you cook with and what burns inside,
          as well as the air outside.
        </p>
      </div>
      <output className="sr-only">{announce}</output>
      {hasPlace && (
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
          {(today.kind === 'none' || today.kind === 'building') && (
            <Loading
              label="Finding today's suggestions…"
              className="min-h-[25.7rem] min-[360px]:min-h-[24.2rem] min-[390px]:min-h-[22.6rem] sm:min-h-[18.6rem] md:min-h-[18.9rem] lg:min-h-[16.1rem] min-[68.125rem]:min-h-[17.6rem]"
            />
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
          {plan && cards.length === 0 && <p>{NO_CARD}</p>}
          {plan && cards.length > 0 && (
            <>
              {/* No verdict on this page: say which air the cards rest on. */}
              <p className="text-sm text-text-dark-muted">
                {plan.forecast ? planAirLine(plan.air, plan.forecast) : NO_AIR}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-4">
                {cards.map((item) => (
                  <PlanCard
                    key={item.candidate.id}
                    item={item}
                    sources={plan.sources}
                    level={3}
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
          <Loading
            label="Loading guides"
            className="min-h-[110.8rem] min-[360px]:min-h-[99.9rem] min-[390px]:min-h-[95.6rem] sm:min-h-[78.5rem] md:min-h-[63.4rem] lg:min-h-[51rem] min-[68.125rem]:min-h-[40.6rem]"
          />
        )}
      </section>
    </>
  );
}
