import type { ForecastSeries } from '../../../../shared/contracts.ts';
import {
  markerIndex,
  niceCeiling,
  summarize,
  tickIndexes,
  valueRuns,
} from './chart.ts';

// PM2.5 solid and dark, PM10 dashed and lighter: the line style and the
// legend carry the difference, never colour alone. No limit line: India's
// limits are 24-hour averages, and the plan's air check compares them.
const LINES = [
  {
    key: 'PM2_5',
    legend: 'PM2.5 (solid line)',
    className: 'stroke-text-dark',
    dash: undefined,
  },
  {
    key: 'PM10',
    legend: 'PM10 (dashed line)',
    className: 'stroke-text-dark-muted',
    dash: '6 4',
  },
] as const;

const tickFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
});

// Labels at the edges align to the edge instead of hanging off it.
function labelAlign(x: number): string {
  if (x < 8) return '';
  return x > 92 ? '-translate-x-full' : '-translate-x-1/2';
}

export function ForecastChart({
  series,
  loadedAt,
}: {
  series: ForecastSeries;
  // The marker shows the hour the forecast loaded, labelled as such, so the
  // chart never claims to know the current hour.
  loadedAt: Date;
}) {
  const { hours } = series;
  // Nothing to draw, and never a unit the provider did not send.
  if (hours.length === 0) return null;
  const unit = series.units.PM2_5 ?? series.units.PM10 ?? '';
  const yMax = niceCeiling(
    Math.max(
      0,
      ...hours.flatMap((hour) => [
        hour.values.PM2_5 ?? 0,
        hour.values.PM10 ?? 0,
      ]),
    ),
  );
  const xOf = (i: number) =>
    hours.length === 1 ? 50 : (i * 100) / (hours.length - 1);
  const marker = markerIndex(
    hours.map((hour) => hour.time),
    loadedAt,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="flex shrink-0 flex-col justify-between pb-6 text-xs whitespace-nowrap text-text-dark-muted tabular-nums">
          <span>
            {yMax}
            {unit && ` ${unit}`}
          </span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <svg
            role="img"
            aria-label="PM2.5 and PM10 forecast chart"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="block h-48 w-full overflow-visible"
          >
            {[0, 50, 100].map((y) => (
              <line
                key={y}
                x1={0}
                x2={100}
                y1={y}
                y2={y}
                className="stroke-rule"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {marker !== null && (
              <line
                x1={xOf(marker)}
                x2={xOf(marker)}
                y1={0}
                y2={100}
                className="stroke-text-dark-muted"
                strokeWidth={1}
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {/* A soft area under PM2.5, the headline pollutant. */}
            {valueRuns(
              hours.map((hour) => hour.values.PM2_5),
              yMax,
            )
              .filter((run) => run.length > 1)
              .map((run) => (
                <polygon
                  key={`area-${run[0]?.x}`}
                  data-part="area"
                  points={`${run[0]?.x},100 ${run.map((p) => `${p.x},${p.y}`).join(' ')} ${run[run.length - 1]?.x},100`}
                  className="fill-primary"
                  opacity={0.18}
                />
              ))}
            {LINES.map((line) =>
              valueRuns(
                hours.map((hour) => hour.values[line.key]),
                yMax,
              ).map((run) => {
                const shared = {
                  'data-pollutant': line.key,
                  className: line.className,
                  vectorEffect: 'non-scaling-stroke',
                } as const;
                const first = run[0];
                // A lone hour between gaps is a dot, not an invisible line.
                return run.length === 1 && first ? (
                  <line
                    key={`${line.key}-${first.x}`}
                    {...shared}
                    x1={first.x}
                    x2={first.x}
                    y1={first.y}
                    y2={first.y}
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                ) : (
                  <polyline
                    key={`${line.key}-${first?.x}`}
                    {...shared}
                    points={run.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray={line.dash}
                    strokeLinejoin="round"
                  />
                );
              }),
            )}
          </svg>
          {marker !== null && (
            <span
              className={`absolute top-0 bg-surface-light px-1 text-xs text-text-dark-muted ${labelAlign(xOf(marker))}`}
              style={{ left: `${xOf(marker)}%` }}
            >
              At load
            </span>
          )}
          <div aria-hidden="true" className="relative h-6 text-xs">
            {tickIndexes(hours.length).map((i) => (
              <span
                key={i}
                // Every 24 hours on a phone, every 6 on wider screens.
                className={`absolute top-1 whitespace-nowrap text-text-dark-muted ${labelAlign(xOf(i))} ${i % 24 ? 'max-sm:hidden' : ''}`}
                style={{ left: `${xOf(i)}%` }}
              >
                {tickFormat.format(new Date(hours[i].time))}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {LINES.map((line) => (
          <li key={line.key} className="flex items-center gap-2">
            <svg aria-hidden="true" width="24" height="8" viewBox="0 0 24 8">
              <line
                x1={0}
                x2={24}
                y1={4}
                y2={4}
                className={line.className}
                strokeWidth={2}
                strokeDasharray={line.dash}
              />
            </svg>
            {line.legend}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 text-sm">
        <p>{summarize(hours, 'PM2_5', unit)}</p>
        <p>{summarize(hours, 'PM10', unit)}</p>
      </div>
    </div>
  );
}
