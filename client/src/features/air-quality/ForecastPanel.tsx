import type { ForecastSeries } from '../../../../shared/contracts.ts';
import { formatTime, hourForNow, POLLUTANTS } from './forecast.ts';

const NO_VALUE = 'No value';

export function ForecastPanel({
  series,
  now,
}: {
  series: ForecastSeries;
  now: Date;
}) {
  const hour = hourForNow(series, now);
  const shown = POLLUTANTS.filter((pollutant) => series.units[pollutant.key]);
  const hasMissing =
    hour !== undefined &&
    shown.some((pollutant) => hour.values[pollutant.key] == null);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-text-dark p-4">
      <h3 className="font-semibold">Model forecast</h3>
      <p className="text-sm">
        {series.provider}, {series.modelResolution}.
      </p>
      <p className="text-sm">
        Model run time not reported by the provider. Retrieved{' '}
        {formatTime(series.retrievedAt)}.
      </p>

      {hour ? (
        <>
          <p>Values for {formatTime(hour.time)}</p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((pollutant) => {
              const value = hour.values[pollutant.key];
              return (
                <div
                  key={pollutant.key}
                  data-testid={`metric-${pollutant.key}`}
                  className="flex flex-col"
                >
                  <dt className="text-sm">
                    {pollutant.short} ({pollutant.name})
                  </dt>
                  <dd className="text-lg font-semibold">
                    {value == null
                      ? NO_VALUE
                      : `${value} ${series.units[pollutant.key]}`}
                  </dd>
                </div>
              );
            })}
          </dl>
          {hasMissing && (
            <p className="text-sm">
              {NO_VALUE} means the model returned nothing for that pollutant at
              this hour.
            </p>
          )}
        </>
      ) : (
        <p>The provider returned no forecast hours for this place.</p>
      )}

      <h4 className="font-semibold">Limitations</h4>
      <ul className="list-disc pl-5 text-sm">
        {series.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>

      <details>
        <summary className="min-h-11 cursor-pointer">
          Hourly forecast ({series.hours.length} hours)
        </summary>
        <table className="mt-2 text-sm">
          <caption className="text-left">
            Hourly model forecast from {series.provider}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                Time
              </th>
              {shown.map((pollutant) => (
                <th key={pollutant.key} scope="col" className="text-right">
                  {pollutant.short} ({series.units[pollutant.key]})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.hours.map((row) => (
              <tr key={row.time}>
                <th scope="row" className="text-left font-normal">
                  {formatTime(row.time)}
                </th>
                {shown.map((pollutant) => (
                  <td key={pollutant.key} className="text-right">
                    {row.values[pollutant.key] ?? NO_VALUE}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
