import { useEffect, useRef, useState } from 'react';
import type { HouseholdContext, SavedPlan } from '../../../shared/contracts.ts';
import { Attribution } from '../components/Attribution.tsx';
import { ErrorState, Loading } from '../components/States.tsx';
import { ForecastPanel } from '../features/air-quality/ForecastPanel.tsx';
import { ObservationPanel } from '../features/air-quality/ObservationPanel.tsx';
import { SourcesPanel } from '../features/air-quality/SourcesPanel.tsx';
import { useRequest } from '../features/air-quality/useRequest.ts';
import { DailyPlanSection } from '../features/daily-plan/DailyPlanSection.tsx';
import { HouseholdPreferencesForm } from '../features/daily-plan/HouseholdPreferencesForm.tsx';
import { SavedPlansList } from '../features/daily-plan/SavedPlansList.tsx';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import {
  placeFromSearch,
  placeToSearch,
  type Place,
} from '../features/location/place.ts';
import { UseMyLocation } from '../features/location/UseMyLocation.tsx';
import { isOlderThan, useNow } from '../lib/clock.ts';
import { getForecast, getSources } from '../services/api.ts';

function Dashboard() {
  // A searched place may arrive in the address (from the landing page or a
  // shared link).
  const [place, setPlace] = useState<Place | null>(() =>
    placeFromSearch(window.location.search),
  );
  // Running clock for stale checks.
  const now = useNow();
  // The household answers on screen, saved or not.
  const [context, setContext] = useState<HouseholdContext>({});
  // Bumped by "Delete everything": the plan area starts afresh.
  const [resets, setResets] = useState(0);
  // A saved plan opened from the list, shown as a snapshot.
  const [opened, setOpened] = useState<SavedPlan | null>(null);
  // Bumped after a save or a delete: the saved list loads again.
  const [listVersion, setListVersion] = useState(0);
  // The last plan deleted from the list, so the plan area stops calling
  // that plan saved.
  const [deletedPlanId, setDeletedPlanId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusResult = useRef(false);
  // True only while a device-location request is still wanted.
  const awaitingLocation = useRef(false);
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

  // After the user picks a place, move focus to the result so keyboard and
  // screen-reader users land on it; a place from the address keeps focus put.
  useEffect(() => {
    if (place && focusResult.current) {
      focusResult.current = false;
      headingRef.current?.focus();
    }
  }, [place]);

  // Searched places go in the address; a device location never does.
  function choose(next: Place, inAddress: boolean) {
    awaitingLocation.current = false;
    focusResult.current = true;
    setPlace(next);
    setOpened(null);
    window.history.replaceState(
      null,
      '',
      inAddress ? `/app?${placeToSearch(next)}` : '/app',
    );
  }

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
          <LocationSearch onSelect={(next) => choose(next, true)} />
          <UseMyLocation
            onLocateStart={() => {
              awaitingLocation.current = true;
            }}
            onLocate={(next) => {
              // A place picked since the click wins over a late answer.
              if (awaitingLocation.current) choose(next, false);
            }}
          />
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
            <p className="text-sm text-text-dark-muted">
              Forecast location: {place.latitude.toFixed(2)},{' '}
              {place.longitude.toFixed(2)}
            </p>
            <ObservationPanel note={cpcb?.limitations[0]} />
            {forecast.state.status === 'ready' ? (
              <ForecastPanel
                series={forecast.state.data.series}
                now={forecast.state.data.loadedAt}
                stale={isOlderThan(
                  forecast.state.data.series.retrievedAt,
                  now,
                  60,
                )}
              />
            ) : forecast.state.status === 'error' ? (
              <ErrorState
                error={forecast.state.error}
                onRetry={forecast.retry}
              />
            ) : (
              <Loading label="Loading forecast" />
            )}
          </div>
        ) : (
          <p className="max-w-prose text-text-dark-muted">
            Search for a place or use your location to see its air-quality
            forecast.
          </p>
        )}
        <HouseholdPreferencesForm
          onChange={setContext}
          onDeleted={() => {
            setResets((n) => n + 1);
            setOpened(null);
            setListVersion((n) => n + 1);
          }}
        />
        <DailyPlanSection
          // A new place, or deleting saved data, starts the plan area afresh.
          key={`${place?.label}|${forecastKey}#${resets}`}
          place={place}
          context={context}
          now={now}
          onSaved={() => setListVersion((n) => n + 1)}
          opened={opened}
          onBackToToday={() => setOpened(null)}
          deletedPlanId={deletedPlanId}
        />
        <SavedPlansList
          version={listVersion}
          onOpen={setOpened}
          onDeleted={(id) => {
            setDeletedPlanId(id);
            setOpened((current) => (current?.id === id ? null : current));
          }}
        />
        <SourcesPanel
          sources={sources.state.status === 'ready' ? sources.state.data : null}
          forecastLimitations={
            forecast.state.status === 'ready'
              ? forecast.state.data.series.limitations
              : []
          }
        />
      </main>
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-text-dark-muted sm:px-6">
          <Attribution />
          <a href="/privacy" className="underline">
            Privacy
          </a>
        </div>
      </footer>
    </>
  );
}

export default Dashboard;
