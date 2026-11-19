// Pure maths for the hand-drawn forecast chart. Coordinates are in a
// 0–100 box (y = 0 at the top); the component stretches the box to fit.
import { formatDateTime, POLLUTANTS, type ForecastHour } from './forecast.ts';

const HOUR_MS = 60 * 60 * 1000;

// Smallest 1, 2 or 5 × 10ⁿ at or above `max`; 10 when there is no data.
export function niceCeiling(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 10;
  const step = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map((m) => m * step).find((v) => v >= max) ?? 10 * step;
}

// One run of points per stretch of hours with values; a missing hour ends a
// run, so the line breaks there instead of joining across the gap.
export function valueRuns(
  values: ReadonlyArray<number | null | undefined>,
  yMax: number,
): Array<Array<{ x: number; y: number }>> {
  const n = values.length;
  const runs: Array<Array<{ x: number; y: number }>> = [];
  let run: Array<{ x: number; y: number }> = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    run.push({
      x: n === 1 ? 50 : (i * 100) / (n - 1),
      y: 100 - (v * 100) / yMax,
    });
  });
  if (run.length) runs.push(run);
  return runs;
}

export function tickIndexes(count: number, every = 6): number[] {
  const ticks: number[] = [];
  for (let i = 0; i < count; i += every) ticks.push(i);
  return ticks;
}

// The hour that contains `at`, or null; never a fallback hour, so the
// "At load" marker is only drawn where it is true.
export function markerIndex(
  times: ReadonlyArray<string>,
  at: Date,
): number | null {
  const t = at.getTime();
  const index = times.findIndex((time) => {
    const start = Date.parse(time);
    return start <= t && t < start + HOUR_MS;
  });
  return index === -1 ? null : index;
}

// The chart's text alternative: range, time of the highest value, gaps.
export function summarize(
  hours: ReadonlyArray<ForecastHour>,
  pollutant: 'PM2_5' | 'PM10',
  unit: string,
): string {
  const short = POLLUTANTS.find((p) => p.key === pollutant)?.short ?? pollutant;
  const values = hours.map((hour) => hour.values[pollutant] ?? null);
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return `No ${short} values in this forecast.`;

  const min = Math.min(...present);
  const max = Math.max(...present);
  const peak = hours[values.indexOf(max)];
  const n = hours.length;
  const missing = n - present.length;
  const span = `${n} hour${n === 1 ? '' : 's'}`;
  return (
    `${short} ranges from ${min} to ${max}${unit ? ` ${unit}` : ''} over the next ${span}` +
    (peak ? `, highest around ${formatDateTime(peak.time)}.` : '.') +
    (missing ? ` No value for ${missing} of ${span}.` : '')
  );
}
