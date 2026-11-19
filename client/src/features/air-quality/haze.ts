import type { AirAssessment } from '../../../../shared/contracts.ts';

// 0 = no data (neutral), 1 = light haze ... 5 = severe. Never a clear sky.
export type HazeLevel = 0 | 1 | 2 | 3 | 4 | 5;

// The skyline's haze from the server's 24-hour air check: the larger known
// ratio of average to limit. Upper bounds are inclusive, so level 3 or more
// appears exactly when a check is above its limit (above = greater than).
export function hazeLevel(check: AirAssessment): HazeLevel {
  if (check.level === 'unknown') return 0;
  const ratio = Math.max(
    ...check.checks.map((c) =>
      c.average24h === null ? 0 : c.average24h / c.limit,
    ),
  );
  if (ratio <= 0.5) return 1;
  if (ratio <= 1) return 2;
  if (ratio <= 1.5) return 3;
  if (ratio <= 2) return 4;
  return 5;
}
