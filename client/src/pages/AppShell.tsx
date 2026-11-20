import { useEffect, useRef, useState } from 'react';
import type { HouseholdContext, SavedPlan } from '../../../shared/contracts.ts';
import { AppNav } from '../components/AppNav.tsx';
import { PlaceChip } from '../components/PlaceChip.tsx';
import { Attribution } from '../components/Attribution.tsx';
import { ErrorState, Loading } from '../components/States.tsx';
import { AirReadout } from '../features/air-quality/AirReadout.tsx';
import { ForecastPanel } from '../features/air-quality/ForecastPanel.tsx';
import { ObservationPanel } from '../features/air-quality/ObservationPanel.tsx';
import { SourcesPanel } from '../features/air-quality/SourcesPanel.tsx';
import { useRequest } from '../features/air-quality/useRequest.ts';
import { DailyPlanSection } from '../features/daily-plan/DailyPlanSection.tsx';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import {
  placeFromSearch,
  placeToSearch,
  type Place,
} from '../features/location/place.ts';
import { UseMyLocation } from '../features/location/UseMyLocation.tsx';
import { isOlderThan, useNow } from '../lib/clock.ts';
import { appPage, navigate, usePath } from '../lib/navigation.ts';
import { getForecast, getSources } from '../services/api.ts';
import { Placeholder } from './Placeholder.tsx';
import { Profile } from './Profile.tsx';

const TITLES = {
  welcome: 'Welcome',
  ask: 'Ask AirAware',
  home: 'My Home',
  habits: 'Better Habits',
  profile: 'My Profile',
} as const;

function AppShell() {
  const page = appPage(usePath());
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
  // The place search, focused by the place bar's "Change place".
  const searchRef = useRef<HTMLInputElement>(null);
  const focusResult = useRef(false);
  // True only while a device-location request is still wanted.
  const awaitingLocation = useRef(false);
  // The place chip's dialog; Today's "Change place" opens it too.
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
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
  function locateStart() {
    awaitingLocation.current = true;
  }

  function locate(next: Place) {
    // A place picked since the click wins over a late answer.
    if (awaitingLocation.current) choose(next, false);
  }

  function choose(next: Place, inAddress: boolean) {
    awaitingLocation.current = false;
    focusResult.current = true;
    setPlaceDialogOpen(false);
    setPlace(next);
    setOpened(null);
    window.history.replaceState(
      null,
      '',
      inAddress
        ? `${window.location.pathname}?${placeToSearch(next)}`
        : window.location.pathname,
    );
  }

  const cpcb =
    sources.state.status === 'ready'
      ? sources.state.data.find((source) => source.id === 'cpcb')
      : undefined;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-20 focus:rounded-md focus:bg-surface-light focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <header className="on-dark bg-bg text-text">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <a href="/" className="text-lg font-semibold">
            AirAware AI
          </a>
          <AppNav page={page} />
          <PlaceChip
            label={place?.label}
            open={placeDialogOpen}
            onOpenChange={setPlaceDialogOpen}
            onChoose={(next) => choose(next, true)}
            onLocateStart={locateStart}
            onLocate={locate}
          />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12"
      >
        {page === 'profile' ? (
          <Profile
            context={context}
            onContextChange={setContext}
            onDeleted={() => {
              setResets((n) => n + 1);
              setOpened(null);
              setListVersion((n) => n + 1);
            }}
            listVersion={listVersion}
            onOpen={(plan) => {
              // Today shows a saved plan as a snapshot (Phase 6 moves it here).
              setOpened(plan);
              navigate('/app');
            }}
            onPlanDeleted={(id) => {
              setDeletedPlanId(id);
              setOpened((current) => (current?.id === id ? null : current));
            }}
          />
        ) : page !== 'today' ? (
          <Placeholder title={TITLES[page]} />
        ) : (
          <>
            <title>Air-quality dashboard | AirAware AI</title>
            <h1 className="text-3xl font-semibold tracking-tight">
              Air quality near you
            </h1>
            {/* Once a place is set, the place chip's dialog changes it. */}
            {!place && (
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <LocationSearch
                  inputRef={searchRef}
                  onSelect={(next) => choose(next, true)}
                />
                <UseMyLocation onLocateStart={locateStart} onLocate={locate} />
              </div>
            )}

            {/* Air on the left, the plan on the right from lg; one column (air
            first) below it. */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
              <div className="flex min-w-0 flex-col gap-6">
                {place ? (
                  <>
                    <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule p-4 sm:p-5">
                      <div className="flex min-w-0 flex-col gap-1">
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
                      </div>
                      <button
                        type="button"
                        onClick={() => setPlaceDialogOpen(true)}
                        className="min-h-11 rounded-md border border-text-dark px-4"
                      >
                        Change place
                      </button>
                    </section>
                    {forecast.state.status === 'ready' ? (
                      <>
                        <AirReadout
                          data={forecast.state.data.series}
                          now={forecast.state.data.loadedAt}
                          stale={isOlderThan(
                            forecast.state.data.series.retrievedAt,
                            now,
                            60,
                          )}
                        />
                        <ForecastPanel
                          data={forecast.state.data.series}
                          now={forecast.state.data.loadedAt}
                        />
                      </>
                    ) : forecast.state.status === 'error' ? (
                      <ErrorState
                        error={forecast.state.error}
                        onRetry={() => {
                          // The card unmounts on retry; keep focus on the place.
                          forecast.retry();
                          headingRef.current?.focus();
                        }}
                        title="We couldn't load the forecast"
                      />
                    ) : (
                      <Loading label="Loading forecast" band />
                    )}
                    <ObservationPanel note={cpcb?.limitations[0]} />
                  </>
                ) : (
                  <div className="flex flex-col items-start gap-4 rounded-lg border border-rule p-6">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="size-6 fill-text-dark-muted"
                    >
                      <path d="M10 1a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm3.5 3.5-2 5-5 2 2-5zM10 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
                    </svg>
                    <p className="max-w-prose text-text-dark-muted">
                      Search for a place or use your location to see its
                      air-quality forecast.
                    </p>
                    <button
                      type="button"
                      onClick={() => searchRef.current?.focus()}
                      className="min-h-11 rounded-md border border-text-dark px-4"
                    >
                      Search for a place
                    </button>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-6">
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
                <SourcesPanel
                  sources={
                    sources.state.status === 'ready' ? sources.state.data : null
                  }
                  forecastLimitations={
                    forecast.state.status === 'ready'
                      ? forecast.state.data.series.limitations
                      : []
                  }
                />
              </div>
            </div>
          </>
        )}
      </main>
      {/* Bottom padding on phones keeps the footer clear of the nav bar. */}
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-8 pb-24 text-sm text-text-dark-muted sm:px-6 md:pb-8">
          <Attribution />
          <a href="/privacy" className="underline">
            Privacy
          </a>
        </div>
      </footer>
    </>
  );
}

export default AppShell;
