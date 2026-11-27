import type { WeatherNow } from '../../../../shared/contracts.ts';

const MISSING = '—';
const HEADINGS = ['Yesterday', 'Today', 'Tomorrow'];
const CELL = 'px-0.5 py-2 text-left align-top break-words';
// A value never parts from its unit.
const NB = ' ';

const whole = (n: number) => String(Math.round(n));
// The compass point a wind comes from, to the nearest of eight.
const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const point = (deg: number) => POINTS[((Math.round(deg / 45) % 8) + 8) % 8]!;
// An older server leaves the newer fields out: shown as missing.
const shown = (n: number | null | undefined, unit: string) =>
  n == null ? MISSING : `${whole(n)}${NB}${unit}`;

// Yesterday, today and tomorrow from Open-Meteo's model: the same local hour
// each day, then the day's range and rain. A value the provider left out
// shows as a dash. Renders nothing when the three days are not there.
export function WeatherCompare({
  weather,
  now,
}: {
  weather: WeatherNow | null;
  now: Date;
}) {
  // An older server sends no `days`.
  if (weather?.days?.length !== 3) return null;
  // The middle column must be the place's date now, or "Yesterday" is wrong
  // (near local midnight the forecast is up to an hour old).
  const localDate = new Date(now.getTime() + weather.utcOffsetSeconds * 1000)
    .toISOString()
    .slice(0, 10);
  if (weather.days[1].date !== localDate) return null;
  // The hour in the place's own time, whatever the device's zone is.
  const hour = new Date(
    Date.parse(weather.time) + weather.utcOffsetSeconds * 1000,
  ).toLocaleTimeString([], {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  });
  const rows: [string, string[]][] = [
    [
      `At ${hour}`,
      weather.days.map(({ atHour: { temperatureC: t, cloudCoverPct: c } }) =>
        t === null && c === null
          ? MISSING
          : [
              t === null ? MISSING : `${whole(t)}${NB}°C`,
              c === null ? MISSING : `${whole(c)}${NB}% cloud`,
            ].join(', '),
      ),
    ],
    // The same hour as the row above.
    [
      'Feels like',
      weather.days.map(({ atHour }) => shown(atHour.feelsLikeC, '°C')),
    ],
    [
      'Humidity',
      weather.days.map(({ atHour }) => shown(atHour.humidityPct, '%')),
    ],
    [
      'Wind',
      weather.days.map(({ atHour: { windKmh: v, windFromDeg: d } }) =>
        v == null
          ? MISSING
          : `${shown(v, 'km/h')}${d == null ? '' : ` ${point(d)}`}`,
      ),
    ],
    [
      'Min–max',
      weather.days.map(({ minC, maxC }) =>
        minC === null || maxC === null
          ? MISSING
          : `${whole(minC)}–${whole(maxC)}${NB}°C`,
      ),
    ],
    [
      'Rain',
      weather.days.map(({ precipitationMm: mm }) =>
        mm === null ? MISSING : `${mm.toFixed(1)}${NB}mm`,
      ),
    ],
    // The server sends none for yesterday: a chance is a forecast.
    [
      'Chance of rain',
      weather.days.map(({ rainChancePct }) => shown(rainChancePct, '%')),
    ],
  ];

  return (
    <section className="rounded-lg border border-rule card-surface p-4 sm:p-6">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          {/* Wider on phones, with the row labels at the column headings'
              size there, so no label or heading breaks inside a word. */}
          <col className="w-[24%] sm:w-[17%]" />
        </colgroup>
        <caption className="pb-2 text-left font-semibold">
          Weather · Open-Meteo model data
        </caption>
        <thead>
          <tr className="border-b border-rule">
            <th scope="col">
              <span className="sr-only">Weather</span>
            </th>
            {HEADINGS.map((heading) => (
              <th
                key={heading}
                scope="col"
                className={`${CELL} text-xs font-semibold`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, cells]) => (
            <tr key={label} className="border-b border-rule last:border-b-0">
              <th
                scope="row"
                className={`${CELL} text-xs font-semibold sm:text-sm`}
              >
                {label}
              </th>
              {cells.map((cell, i) => (
                <td key={HEADINGS[i]} className={CELL}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-2 text-sm text-text-dark-muted">
        Yesterday is past model data, not station measurements.
      </p>
    </section>
  );
}
