import { useId } from 'react';
import type {
  ForecastData,
  PollutantCheck,
} from '../../../../shared/contracts.ts';
import { CitySkyline } from './CitySkyline.tsx';
import { formatDateTime, formatTime, hourForNow } from './forecast.ts';
import { hazeLevel } from './haze.ts';

const SHORT = { PM2_5: 'PM2.5', PM10: 'PM10' } as const;

// The 24-hour check in words. The limit's unit is the series' own (the
// check only runs on μg/m³ data), so no unit is ever retyped here.
function checkText(check: PollutantCheck, unit: string): string {
  const name = SHORT[check.pollutant];
  if (check.status === 'unknown' || check.average24h === null) {
    return `${name}: 24-hour average not available`;
  }
  const side = check.status === 'above_limit' ? 'above' : 'within';
  return `${name} 24-hour average ${check.average24h} ${unit}, ${side} the ${check.limit} ${unit} limit`;
}

function Marker({ above }: { above: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 inline-flex size-5 flex-none items-center justify-center rounded-full ${
        above ? 'bg-warning' : 'bg-rule'
      }`}
    >
      <svg viewBox="0 0 16 16" className="size-3 fill-text-dark">
        {above ? (
          <path d="M7 3h2v6H7zM7 11h2v2H7z" />
        ) : (
          <path d="M7 7h2v6H7zM7 3h2v2H7z" />
        )}
      </svg>
    </span>
  );
}

// The dashboard's lead: this hour's PM2.5 (a model forecast, never an AQI),
// the server's 24-hour check in words, the source, and a skyline whose haze
// follows that check.
export function AirReadout({
  data,
  now,
  stale,
}: {
  data: ForecastData;
  // When the forecast loaded: picks the hour shown.
  now: Date;
  // Retrieved more than an hour ago, by the running clock.
  stale: boolean;
}) {
  const headingId = useId();
  const hour = hourForNow(data, now);
  const pm25 = hour?.values.PM2_5;
  const unit = data.units.PM2_5 ?? '';

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-lg border border-rule"
    >
      <CitySkyline level={hazeLevel(data.airCheck)} />
      <div className="flex flex-col gap-4 p-5 sm:p-8">
        <div className="flex flex-col gap-1">
          <h3 id={headingId} className="text-xl font-semibold">
            Model forecast
          </h3>
          {hour && (
            <p className="text-sm text-text-dark-muted">
              Values for {formatTime(hour.time)}
            </p>
          )}
        </div>
        {/* Read before the figure: stale data is never shown as current. */}
        {stale && (
          <p className="font-semibold">
            Retrieved more than an hour ago. Reload for the latest forecast.
          </p>
        )}

        {/* A model without PM2.5 has no headline figure, never a blank one. */}
        {data.units.PM2_5 && (
          <p
            data-testid="readout-pm25"
            data-lead
            className="flex flex-wrap items-baseline gap-x-3"
          >
            <span className="text-2xl font-semibold">PM2.5</span>
            {pm25 == null ? (
              <span className="text-2xl font-semibold">No value</span>
            ) : (
              <>
                <span className="text-6xl font-semibold tracking-tight tabular-nums">
                  {pm25}
                </span>
                <span className="text-sm text-text-dark-muted">{unit}</span>
              </>
            )}
          </p>
        )}

        {data.airCheck.checks.every((c) => c.status === 'unknown') && (
          <p className="font-medium">Air information unavailable</p>
        )}
        {data.airCheck.windowStart && (
          <p className="text-sm text-text-dark-muted">
            Model forecast for the next 24 hours from{' '}
            {formatDateTime(data.airCheck.windowStart)}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {data.airCheck.checks.map((check) => (
            <li key={check.pollutant} className="flex gap-2">
              <Marker above={check.status === 'above_limit'} />
              <span>
                {checkText(check, data.units[check.pollutant] ?? unit)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-1 border-t border-rule pt-4 text-sm text-text-dark-muted">
          <p>
            {data.provider}, {data.modelResolution}.
          </p>
          <p>
            Model run time not reported by the provider. Retrieved{' '}
            {formatTime(data.retrievedAt)}.
          </p>
        </div>
      </div>
    </section>
  );
}
