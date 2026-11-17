import { useEffect, useRef, useState } from 'react';
import { ErrorState, Loading } from '../components/States.tsx';
import { ForecastPanel } from '../features/air-quality/ForecastPanel.tsx';
import { ObservationPanel } from '../features/air-quality/ObservationPanel.tsx';
import { SourcesPanel } from '../features/air-quality/SourcesPanel.tsx';
import { useRequest } from '../features/air-quality/useRequest.ts';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import type { Place } from '../features/location/place.ts';
import { UseMyLocation } from '../features/location/UseMyLocation.tsx';
import { getForecast, getSources } from '../services/api.ts';

function Dashboard() {
  const [place, setPlace] = useState<Place | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sources = useRequest('sources', (signal) => getSources(signal));
  // Keyed by the coordinates actually sent (2 decimals).
  const forecastKey = place
    ? `${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`
    : null;
  // `loadedAt` picks the "now" hour; captured on load so render stays pure.
  const forecast = useRequest(forecastKey, async (signal) => ({
    series: await getForecast(place!.latitude, place!.longitude, signal),
    loadedAt: new Date(),
  }));

  // Move focus to the result so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (place) headingRef.current?.focus();
  }, [place]);

  const cpcb =
    sources.state.status === 'ready'
      ? sources.state.data.find((source) => source.id === 'cpcb')
      : undefined;

  return (
    <>
      <title>Air-quality dashboard | AirAware AI</title>
      <header className="border-b border-rule">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center px-4 sm:px-6">
          <a href="/" className="text-lg font-semibold">
            AirAware AI
          </a>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Air quality near you
        </h1>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <LocationSearch onSelect={setPlace} />
          <UseMyLocation onLocate={setPlace} />
        </div>

        {place ? (
          <div className="flex flex-col gap-6">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight"
            >
              Air quality: {place.label}
            </h2>
            <ObservationPanel note={cpcb?.limitations[0]} />
            {forecast.state.status === 'ready' ? (
              <ForecastPanel
                series={forecast.state.data.series}
                now={forecast.state.data.loadedAt}
              />
            ) : forecast.state.status === 'error' ? (
              <ErrorState
                error={forecast.state.error}
                onRetry={forecast.retry}
              />
            ) : (
              <Loading label="Loading forecast" />
            )}
            {sources.state.status === 'ready' && (
              <SourcesPanel sources={sources.state.data} />
            )}
          </div>
        ) : (
          <p className="max-w-prose text-text-dark-muted">
            Search for a place or use your location to see its air-quality
            forecast.
          </p>
        )}
      </main>
    </>
  );
}

export default Dashboard;
