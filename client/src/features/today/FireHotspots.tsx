import { useEffect, useId, useRef } from 'react';
import type { FireSummary } from '../../../../shared/contracts.ts';
import { Loading } from '../../components/States.tsx';
import { isOlderThan } from '../../lib/clock.ts';
import { getFires } from '../../services/api.ts';
import { useRequest } from '../air-quality/useRequest.ts';
import { clockTime } from '../ask/ask.ts';
import type { Place } from '../location/place.ts';

const UNAVAILABLE = 'Fire hotspot data is unavailable right now.';
const NOTE =
  'A hotspot is a heat signal seen from space, not proof that smoke reaches you.';
// The server caches 30 minutes, so this keeps the card under an hour old.
const REFRESH_MS = 30 * 60_000;

function summaryLine(
  fires: Extract<FireSummary, { status: 'available' }>,
  now: Date,
): string {
  const where = `within ${fires.radiusKm} km in the last ${fires.windowHours} hours`;
  if (fires.count === 0) return `No fire hotspots were detected ${where}.`;
  const nearest =
    fires.nearestKm === null
      ? ''
      : ` The nearest is ${fires.nearestKm < 1 ? 'less than 1' : Math.round(fires.nearestKm)} km away;`;
  // Up to 24 hours old: name the day when it is not today (device time).
  const day =
    fires.latestAt &&
    new Date(fires.latestAt).toDateString() !== now.toDateString()
      ? 'yesterday '
      : '';
  const latest = fires.latestAt
    ? ` the latest was seen ${day}at ${clockTime(fires.latestAt)}.`
    : '';
  return `NASA satellites detected ${fires.count} fire ${fires.count === 1 ? 'hotspot' : 'hotspots'} ${where}.${nearest}${latest}`;
}

// NASA FIRMS fire hotspots near the place (owner, 27 Nov): satellite
// detections, never an air-quality reading, and never shown as zero when
// FIRMS fails. Hidden when the server has no FIRMS key. Refreshes every 30
// minutes on the device's own timer, keeping its numbers while it does.
export function FireHotspots({
  place,
  now,
}: {
  place: Place | null;
  now: Date;
}) {
  const headingId = useId();
  const { state, retry, previous } = useRequest(
    place ? `${place.latitude},${place.longitude}` : null,
    (signal) => getFires(place!.latitude, place!.longitude, signal),
  );
  const retryRef = useRef(retry);
  useEffect(() => {
    retryRef.current = retry;
  });
  useEffect(() => {
    const timer = setInterval(() => retryRef.current(), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // While a refresh loads, the answer it will replace.
  const data = state.status === 'ready' ? state.data : previous;
  if (state.status === 'idle') return null;
  if (data?.status === 'not_configured') return null;

  const fires = data?.status === 'available' ? data : null;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-lg border border-rule card-surface p-4 sm:p-6"
    >
      <h2 id={headingId} className="text-lg font-semibold">
        Fire hotspots nearby
      </h2>
      {state.status === 'loading' && !data ? (
        // As tall as the ready card, so nothing below moves.
        <Loading label="Checking for fire hotspots…" className="min-h-[6rem]" />
      ) : fires ? (
        <>
          <p>{summaryLine(fires, now)}</p>
          <p className="text-sm text-text-dark-muted">
            {`Satellite detections · ${fires.provider} · retrieved ${clockTime(fires.retrievedAt)}${isOlderThan(fires.retrievedAt, now, 60) ? ' · Not current' : ''}`}
          </p>
          <p className="text-sm text-text-dark-muted">{NOTE}</p>
        </>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p>{UNAVAILABLE}</p>
          <button
            type="button"
            onClick={retry}
            disabled={state.status === 'loading'}
            className="min-h-11 rounded-md border border-text-dark px-4 disabled:opacity-60"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
