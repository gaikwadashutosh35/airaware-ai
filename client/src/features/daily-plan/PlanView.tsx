import { useId, type ReactNode } from 'react';
import type { DailyPlan } from '../../../../shared/contracts.ts';
import { formatDateTime } from '../air-quality/forecast.ts';
import { PlanCard } from './PlanCard.tsx';
import { checkText, groupPlan, madeByLine, LEVEL_TAG } from './planDisplay.ts';

const MODEL_LINE =
  'Model forecast for an area about 45 km wide. Not a station measurement and not the CPCB AQI.';
const NO_AIR = 'Air information is unavailable for this plan.';
const emptyTopic = (day: string) =>
  `No suggestions in this area for your answers ${day}.`;

function Part({
  title,
  tag,
  children,
}: {
  title: string;
  // A short word label beside the heading (the Air notice's status).
  tag?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={id} className="text-xl font-semibold">
          {title}
        </h3>
        {tag && (
          <span className="rounded-md border border-text-dark px-2 py-0.5 text-sm font-medium">
            {tag}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

// A daily plan as the server built it: the air notice always first, then
// the air check, "Your day" (AI plans only) and the three topics.
export function PlanView({
  plan,
  snapshot = false,
}: {
  plan: DailyPlan;
  // A saved plan: its labels say "that day", never "today".
  snapshot?: boolean;
}) {
  const { yourDay, topics } = groupPlan(plan);
  const { air, forecast } = plan;

  return (
    <div className="flex flex-col gap-6">
      {/* A saved plan can be for another place than the one on screen. */}
      <div className="flex flex-col gap-2 rounded-lg border border-rule p-5">
        <p className="text-lg font-semibold break-words">
          Plan for {plan.place.label}
        </p>
        {plan.generatedBy === 'ai' && plan.summary && (
          <p className="text-lg">{plan.summary}</p>
        )}
        <p className="text-sm text-text-dark-muted">{madeByLine(plan)}</p>
      </div>

      {plan.notices.length > 0 && (
        <Part title="Air notice" tag={LEVEL_TAG[plan.air.level]}>
          {plan.notices.map((candidate) => (
            <PlanCard
              key={candidate.id}
              item={{ candidate, forYou: null, period: null, compact: false }}
              sources={plan.sources}
              level={4}
              snapshot={snapshot}
              notice
            />
          ))}
        </Part>
      )}

      <Part title="Air check">
        <p>
          {air.windowStart
            ? `Next 24 hours from ${formatDateTime(air.windowStart)}`
            : 'No complete 24-hour forecast window'}
        </p>
        <ul className="flex flex-col gap-1">
          {air.checks.map((check) => (
            <li key={check.pollutant}>{checkText(check)}</li>
          ))}
        </ul>
        {forecast ? (
          <>
            <p className="text-sm">{MODEL_LINE}</p>
            <p className="text-sm text-text-dark-muted">
              Open-Meteo model forecast, retrieved{' '}
              {formatDateTime(forecast.retrievedAt)}
            </p>
          </>
        ) : (
          <p className="text-sm">{NO_AIR}</p>
        )}
      </Part>

      {yourDay.length > 0 && (
        <Part title="Your day">
          {yourDay.map((group) => (
            <div key={group.period} className="flex flex-col gap-3">
              <h4 className="self-start rounded-full border border-rule px-3 py-1 text-sm font-semibold">
                {group.label}
              </h4>
              {group.items.map((item) => (
                <PlanCard
                  key={item.candidate.id}
                  item={item}
                  sources={plan.sources}
                  level={5}
                  snapshot={snapshot}
                />
              ))}
            </div>
          ))}
        </Part>
      )}

      {topics.map((topic) => (
        <Part key={topic.section} title={topic.heading}>
          {topic.items.length ? (
            topic.items.map((item) => (
              <PlanCard
                key={item.candidate.id}
                item={item}
                sources={plan.sources}
                level={4}
                snapshot={snapshot}
              />
            ))
          ) : (
            <p className="text-sm">
              {emptyTopic(snapshot ? 'that day' : 'today')}
            </p>
          )}
        </Part>
      ))}

      <p className="text-sm">{plan.safetyNote}</p>
    </div>
  );
}
