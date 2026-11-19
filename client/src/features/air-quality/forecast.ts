import type {
  ForecastSeries,
  Pollutant,
} from '../../../../shared/contracts.ts';

export type ForecastHour = ForecastSeries['hours'][number];

const HOUR_MS = 60 * 60 * 1000;

// The hour containing `now`; otherwise the first hour, whose own time is
// always shown next to its values.
export function hourForNow(
  series: ForecastSeries,
  now: Date,
): ForecastHour | undefined {
  const t = now.getTime();
  return (
    series.hours.find((hour) => {
      const start = Date.parse(hour.time);
      return start <= t && t < start + HOUR_MS;
    }) ?? series.hours[0]
  );
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

// Browser-local time with its zone name, so the time is never ambiguous.
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

// Like formatTime, with the date: for times that can be days old (saved
// plans) or two days ahead (forecast peaks).
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export const POLLUTANTS: ReadonlyArray<{
  key: Pollutant;
  short: string;
  name: string;
}> = [
  { key: 'PM2_5', short: 'PM2.5', name: 'Fine particles' },
  { key: 'PM10', short: 'PM10', name: 'Coarse particles' },
  { key: 'NO2', short: 'NO₂', name: 'Nitrogen dioxide' },
  { key: 'SO2', short: 'SO₂', name: 'Sulphur dioxide' },
  { key: 'O3', short: 'O₃', name: 'Ozone' },
  { key: 'CO', short: 'CO', name: 'Carbon monoxide' },
];
