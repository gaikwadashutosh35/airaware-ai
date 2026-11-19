import type { ForecastSeries } from '../../../../shared/contracts.ts';
import { ForecastChart } from './ForecastChart.tsx';
import { formatTime, hourForNow, POLLUTANTS } from './forecast.ts';

const NO_VALUE = 'No value';

export function ForecastPanel({
  series,
  now,
  stale = false,
}: {
  series: ForecastSeries;
  // When the forecast loaded: picks the hour shown, which never changes on
  // its own.
  now: Date;
  // Retrieved more than an hour ago, by the running clock.
  stale?: boolean;
}) {
  const hour = hourForNow(series, now);
  const shown = POLLUTANTS.filter((pollutant) => series.units[pollutant.key]);
  const hasMissing =
    hour !== undefined &&
    shown.some((pollutant) => hour.values[pollutant.key] == null);

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-rule p-5 sm:p-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold">Model forecast</h3>
        <p className="text-sm text-text-dark-muted">
          {series.provider}, {series.modelResolution}.
        </p>
        <p className="text-sm text-text-dark-muted">
          Model run time not reported by the provider. Retrieved{' '}
          {formatTime(series.retrievedAt)}.
        </p>
        {stale && (
          <p className="font-semibold">
            Retrieved more than an hour ago. Reload for the latest forecast.
          </p>
        )}
      </div>

      {hour ? (
        <div className="flex flex-col gap-3">
          <p className="font-medium">Values for {formatTime(hour.time)}</p>
          <dl className="grid grid-cols-2 border-t border-rule sm:grid-cols-5">
            {shown.map((pollutant) => {
              const value = hour.values[pollutant.key];
              // PM2.5 leads: the headline figure, never an AQI.
              const lead = pollutant.key === 'PM2_5';
              return (
                <div
                  key={pollutant.key}
                  data-testid={`metric-${pollutant.key}`}
                  data-lead={lead || undefined}
                  className={
                    lead
                      ? 'col-span-full flex flex-col gap-1 border-b border-rule py-6'
                      : 'flex flex-col gap-1 border-b border-rule py-4 pr-4'
                  }
                >
                  <dt className="text-sm text-text-dark-muted">
                    {pollutant.short} ({pollutant.name})
                  </dt>
                  <dd
                    className={
                      lead
                        ? 'text-6xl font-semibold tracking-tight tabular-nums'
                        : 'text-2xl font-semibold tabular-nums'
                    }
                  >
                    {value == null ? (
                      NO_VALUE
                    ) : (
                      <>
                        {value}
                        <span className="ml-1 text-sm font-normal text-text-dark-muted">
                          {series.units[pollutant.key]}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {hasMissing && (
            <p className="text-sm text-text-dark-muted">
              {NO_VALUE} means the model returned nothing for that pollutant at
              this hour.
            </p>
          )}
        </div>
      ) : (
        <p>The provider returned no forecast hours for this place.</p>
      )}

      <ForecastChart series={series} loadedAt={now} />

      <div className="flex flex-col gap-2">
        <h4 className="font-semibold">Limitations</h4>
        <ul className="list-disc pl-5 text-sm">
          {series.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>

      <details className="group">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">
          Hourly forecast ({series.hours.length} hours)
        </summary>
        <section
          aria-label="Hourly forecast table"
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable table region must be keyboard-focusable (WCAG 2.1.1; axe scrollable-region-focusable).
          tabIndex={0}
          className="mt-2 overflow-x-auto"
        >
          <table className="w-full border-collapse text-sm tabular-nums">
            <caption className="pb-2 text-left text-text-dark-muted">
              Hourly model forecast from {series.provider}
            </caption>
            <thead>
              <tr className="border-b border-text-dark">
                <th
                  scope="col"
                  className="py-2 pr-4 text-left font-medium whitespace-nowrap"
                >
                  Time
                </th>
                {shown.map((pollutant) => (
                  <th
                    key={pollutant.key}
                    scope="col"
                    className="py-2 pl-4 text-right font-medium whitespace-nowrap"
                  >
                    {pollutant.short} ({series.units[pollutant.key]})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.hours.map((row) => (
                <tr key={row.time} className="border-b border-rule">
                  <th
                    scope="row"
                    className="py-2 pr-4 text-left font-normal whitespace-nowrap"
                  >
                    {formatTime(row.time)}
                  </th>
                  {shown.map((pollutant) => (
                    <td key={pollutant.key} className="py-2 pl-4 text-right">
                      {row.values[pollutant.key] ?? NO_VALUE}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </details>
    </section>
  );
}
