import { useId } from 'react';
import type {
  ForecastData,
  PollutantCheck,
} from '../../../../shared/contracts.ts';
import { ForecastChart } from './ForecastChart.tsx';
import { formatTime, hourForNow, POLLUTANTS } from './forecast.ts';

const NO_VALUE = 'No value';

// The 24-hour check as a short status. Only PM2.5 and PM10 have one: India's
// NAAQS 24-hour limits, compared by the server. Never an AQI category.
function checkWord(check: PollutantCheck | undefined): string {
  if (!check) return 'Not assessed';
  if (check.status === 'above_limit') return 'Above the limit';
  if (check.status === 'within_limit') return 'Within the limit';
  return 'Not enough data';
}

// "Your city, the next two days": the 48-hour chart, this hour's values
// with the 24-hour check, and every hour in a table. The headline figure and
// the source line live in AirReadout.
export function ForecastPanel({
  data,
  now,
}: {
  data: ForecastData;
  // When the forecast loaded: picks the hour shown.
  now: Date;
}) {
  const headingId = useId();
  const captionId = useId();
  const hour = hourForNow(data, now);
  const shown = POLLUTANTS.filter((pollutant) => data.units[pollutant.key]);
  const hasMissing =
    hour !== undefined &&
    shown.some((pollutant) => hour.values[pollutant.key] == null);

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-5 rounded-lg border border-rule p-5 sm:p-8"
    >
      <h3 id={headingId} className="text-xl font-semibold">
        Your city, the next two days
      </h3>

      <ForecastChart series={data} loadedAt={now} />

      {hour ? (
        <section
          aria-labelledby={captionId}
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable table region must be keyboard-focusable (WCAG 2.1.1; axe scrollable-region-focusable).
          tabIndex={0} // NOSONAR: the same WCAG 2.1.1 reason as the oxlint line above.
          className="overflow-x-auto"
        >
          <table className="w-full border-collapse text-sm tabular-nums">
            <caption
              id={captionId}
              className="pb-2 text-left font-medium text-text-dark"
            >
              Pollutants at {formatTime(hour.time)}, with the 24-hour check
            </caption>
            <thead>
              <tr className="border-b border-text-dark">
                <th
                  scope="col"
                  className="py-2 pr-2 sm:pr-4 text-left font-medium"
                >
                  Pollutant
                </th>
                <th
                  scope="col"
                  className="py-2 pr-2 sm:pr-4 text-right font-medium whitespace-nowrap"
                >
                  This hour
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  24-hour check
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((pollutant) => {
                const value = hour.values[pollutant.key];
                const check = data.airCheck.checks.find(
                  (c) => c.pollutant === pollutant.key,
                );
                return (
                  <tr
                    key={pollutant.key}
                    data-testid={`metric-${pollutant.key}`}
                    className="border-b border-rule"
                  >
                    <th
                      scope="row"
                      className="py-2 pr-2 sm:pr-4 text-left font-normal"
                    >
                      <span className="font-semibold">{pollutant.short}</span>{' '}
                      <span className="text-text-dark-muted">
                        {pollutant.name}
                      </span>
                    </th>
                    <td className="py-2 pr-2 sm:pr-4 text-right whitespace-nowrap">
                      {value == null ? (
                        NO_VALUE
                      ) : (
                        <>
                          {value}{' '}
                          <span className="text-text-dark-muted">
                            {data.units[pollutant.key]}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-2 text-right">{checkWord(check)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hasMissing && (
            <p className="mt-2 text-sm text-text-dark-muted">
              {NO_VALUE} means the model returned nothing for that pollutant at
              this hour.
            </p>
          )}
        </section>
      ) : (
        <p>The provider returned no forecast hours for this place.</p>
      )}

      {/* The forecast's limitations show once, in "Sources and limitations". */}
      <details className="group">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">
          Hourly forecast ({data.hours.length} hours)
        </summary>
        <section
          aria-label="Hourly forecast table"
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable table region must be keyboard-focusable (WCAG 2.1.1; axe scrollable-region-focusable).
          tabIndex={0} // NOSONAR: the same WCAG 2.1.1 reason as the oxlint line above.
          className="mt-2 overflow-x-auto"
        >
          <table className="w-full border-collapse text-sm tabular-nums">
            <caption className="pb-2 text-left text-text-dark-muted">
              Hourly model forecast from {data.provider}
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
                    {pollutant.short} ({data.units[pollutant.key]})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.hours.map((row) => (
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
