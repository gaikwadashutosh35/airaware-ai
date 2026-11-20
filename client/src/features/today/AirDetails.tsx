import { useId } from 'react';
import type { ForecastData, SourceInfo } from '../../../../shared/contracts.ts';
import { AirReadout } from '../air-quality/AirReadout.tsx';
import { ForecastPanel } from '../air-quality/ForecastPanel.tsx';
import { SourcesPanel } from '../air-quality/SourcesPanel.tsx';
import type { Place } from '../location/place.ts';

const SHORT = { PM2_5: 'PM2.5', PM10: 'PM10' } as const;

// "Air quality details" (§7.3): every number, unit and source behind the
// verdict, closed until asked for. Opened often, so no animation.
export function AirDetails({
  data,
  loadedAt,
  place,
  sources,
  cpcbNote,
}: {
  // null while the forecast loads or after it failed.
  data: ForecastData | null;
  // When the forecast loaded: picks the hour shown.
  loadedAt: Date;
  place: Place;
  // null while loading or after a failure.
  sources: SourceInfo[] | null;
  // The CPCB source's own limitation, once the source list loaded.
  cpcbNote?: string;
}) {
  const headingId = useId();
  const methodId = useId();
  // India's limits as the server's check used them, never retyped.
  const limits = data?.airCheck.checks
    .map((check) => `${check.limit} μg/m³ for ${SHORT[check.pollutant]}`)
    .join(' and ');

  return (
    <div>
      {/* The outline's heading. Not inside <summary>: JAWS and TalkBack expose
          summary as a button and drop headings in it. */}
      <h2 id={headingId} className="sr-only">
        Air quality details
      </h2>
      <details className="rounded-lg border border-rule">
        <summary className="min-h-11 cursor-pointer px-5 py-3 text-lg font-semibold sm:px-6">
          Air quality details
        </summary>
        <div className="flex flex-col gap-6 border-t border-rule p-5 sm:p-6">
          {data && (
            <>
              <p className="text-sm">
                {`Forecast location: ${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)}`}
              </p>
              <AirReadout data={data} now={loadedAt} />
              <ForecastPanel data={data} now={loadedAt} />
            </>
          )}
          <div className="flex flex-col gap-1">
            <p>Official CPCB observations are not connected yet.</p>
            {cpcbNote && (
              <p className="text-sm text-text-dark-muted">{cpcbNote}</p>
            )}
          </div>
          {data && (
            <section aria-labelledby={methodId} className="flex flex-col gap-2">
              <h3 id={methodId} className="text-xl font-semibold">
                How the 24-hour check works
              </h3>
              <p>
                {`India's 24-hour limits are ${limits}. We compare the model forecast's 24-hour averages with them. We don't calculate an AQI.`}
              </p>
            </section>
          )}
          <SourcesPanel
            sources={sources}
            forecastLimitations={data?.limitations ?? []}
          />
        </div>
      </details>
    </div>
  );
}
