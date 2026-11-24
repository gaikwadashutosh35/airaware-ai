import { useId } from 'react';
import type { ForecastData } from '../../../../shared/contracts.ts';
import { StaleBanner } from '../air-quality/AirReadout.tsx';
import { weatherLine } from '../air-quality/forecast.ts';
import { LEVEL_TAG } from '../daily-plan/planDisplay.ts';
import { verdictFrom } from './today.ts';

const PULSE =
  'animate-pulse rounded bg-text-dark/10 motion-reduce:animate-none';

// Today's lead: this hour's weather in words (the app backdrop draws it),
// then the forecast in one sentence with its kind, source and time. Numbers
// live in "Air quality details".
export function TodayLead({
  data,
  stale,
  onReload,
}: {
  data: ForecastData;
  // Retrieved more than an hour ago, by the running clock.
  stale: boolean;
  // Offered inside the stale banner, when given.
  onReload?: () => void;
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
      className="overflow-hidden rounded-lg border border-rule bg-surface-light"
    >
      <p className="border-b border-rule px-4 py-2 text-sm text-text-dark-muted sm:px-8">
        {weatherLine(data.weather)}
      </p>
      <div className="flex flex-col gap-2 p-4 sm:gap-3 sm:p-8">
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
          Model forecast · Open-Meteo · retrieved {updated}
        </p>
        {stale && <StaleBanner onReload={onReload} />}
        {/* Within the limit the card is short: the sentence moves into
            "Air quality details" (B1). */}
        {data.airCheck.level !== 'not_elevated' && <p>{verdict.explanation}</p>}
        {verdict.caveat && (
          <p className="text-sm text-text-dark-muted">{verdict.caveat}</p>
        )}
      </div>
    </section>
  );
}

// The forecast's placeholder: the same card, so nothing below moves when the
// forecast lands. Its minimum height is the within-limit card's, measured for
// Pune at 320, 360, 390, 640, 768, 1024 and 1280 wide, in rem so it grows with
// enlarged text.
export function TodayLeadLoading() {
  return (
    <section
      aria-busy="true"
      className="min-h-[22.8rem] overflow-hidden rounded-lg border border-rule bg-surface-light min-[360px]:min-h-[19.3rem] min-[390px]:min-h-[18.1rem] sm:min-h-[14.3rem] md:min-h-[13.1rem] lg:min-h-[16.6rem] xl:min-h-[14.3rem]"
    >
      <p className="border-b border-rule px-4 py-2 text-sm text-text-dark-muted sm:px-8">
        Loading forecast…
      </p>
      <div className="flex flex-col gap-2 p-4 sm:gap-3 sm:p-8">
        <div aria-hidden="true" className={`h-9 w-3/4 ${PULSE}`} />
        <div aria-hidden="true" className={`h-6 w-1/2 ${PULSE}`} />
        <div aria-hidden="true" className={`h-5 w-full ${PULSE}`} />
      </div>
    </section>
  );
}
