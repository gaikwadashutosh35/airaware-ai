import { useId } from 'react';
import type { ForecastData } from '../../../../shared/contracts.ts';
import { StaleBanner } from '../air-quality/AirReadout.tsx';
import { weatherLine } from '../air-quality/forecast.ts';
import { CitySkyline } from '../air-quality/CitySkyline.tsx';
import { sceneFromConditions } from '../air-quality/scene.ts';
import { LEVEL_TAG } from '../daily-plan/planDisplay.ts';
import { verdictFrom } from './today.ts';

// Today's lead: the scene, then the forecast in one sentence with its kind,
// source and time. Numbers live in "Air quality details".
export function TodayLead({
  data,
  stale,
}: {
  data: ForecastData;
  // Retrieved more than an hour ago, by the running clock.
  stale: boolean;
}) {
  const headingId = useId();
  const verdict = verdictFrom(data.airCheck);
  const updated = new Date(data.retrievedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-lg border border-rule"
    >
      <CitySkyline scene={sceneFromConditions(data.airCheck, data.weather)} />
      <p className="border-b border-rule px-5 py-2 text-sm text-text-dark-muted sm:px-8">
        {weatherLine(data.weather)}
      </p>
      <div className="flex flex-col gap-3 p-5 sm:p-8">
        <h2
          id={headingId}
          className="text-3xl font-semibold tracking-tight text-balance"
        >
          {verdict.title}
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-dark-muted">
          <span className="rounded-full border border-text-dark px-2 py-0.5 font-semibold text-text-dark">
            {LEVEL_TAG[data.airCheck.level]}
          </span>
          Model forecast · Open-Meteo · updated {updated}
        </p>
        {stale && <StaleBanner />}
        <p>{verdict.explanation}</p>
        {verdict.caveat && (
          <p className="text-sm text-text-dark-muted">{verdict.caveat}</p>
        )}
      </div>
    </section>
  );
}
