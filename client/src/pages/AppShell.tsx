import { useEffect, useRef, useState } from 'react';
import type {
  HouseholdContext,
  PreferencesUpdate,
  SavedPlace,
  SavedPlan,
  SavedPreferences,
} from '../../../shared/contracts.ts';
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
import {
  placeFromSearch,
  placeToSearch,
  type Place,
} from '../features/location/place.ts';
import { isOlderThan, useNow } from '../lib/clock.ts';
import { appPage, navigate, usePath } from '../lib/navigation.ts';
import { currentToken, tokenForSave } from '../lib/supabase.ts';
import { getForecast, getSources, savePreferences } from '../services/api.ts';
import { Placeholder } from './Placeholder.tsx';
import { Profile } from './Profile.tsx';
import { Welcome } from './Welcome.tsx';

// What is saved for a remembered place: label and 2-decimal coordinates.
function toSaved(place: Place): SavedPlace {
  return {
    label: place.label,
    latitude: Number(place.latitude.toFixed(2)),
    longitude: Number(place.longitude.toFixed(2)),
  };
}

const TITLES = {
  today: 'Air-quality dashboard',
  welcome: 'Welcome',
  ask: 'Ask AirAware',
  home: 'My Home',
  habits: 'Better Habits',
  profile: 'My Profile',
} as const;

function AppShell() {
  const path = usePath();
  const page = appPage(path);
  // A searched place may arrive in the address (from the landing page or a
  // shared link).
  const [place, setPlace] = useState<Place | null>(() =>
    placeFromSearch(window.location.search),
  );
  // The address query for the place shown ('' for none or a device
  // location). Back and Forward land on older entries, so it is put back.
  const [placeQuery, setPlaceQuery] = useState(() =>
    placeFromSearch(window.location.search) ? window.location.search : '',
  );
  useEffect(() => {
    function sync() {
      if (window.location.search !== placeQuery) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + placeQuery,
        );
      }
    }
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [placeQuery]);
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
  // The place chip's dialog; Today's "Change place" opens it too.
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  // Onboarding (D2): the form's first load of saved answers has finished;
  // the searched place remembered on this device; a key that remounts the
  // form with Welcome's answers; the Today invite, dismissed for the visit.
  const [loaded, setLoaded] = useState(false);
  const [remembered, setRemembered] = useState<SavedPlace | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [inviteDismissed, setInviteDismissed] = useState(false);

  // Today with no place: once saved answers are checked, Welcome opens.
  useEffect(() => {
    if (page === 'today' && !place && !opened && loaded) {
      navigate('/app/welcome', { replace: true });
    }
  }, [page, place, opened, loaded]);
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
    if (place && focusResult.current && page === 'today') {
      focusResult.current = false;
      headingRef.current?.focus();
    }
  }, [place, page]);

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
    const query = inAddress ? `?${placeToSearch(next)}` : '';
    setPlaceQuery(query);
    window.history.replaceState(null, '', window.location.pathname + query);
    // A remembered place follows a new searched one; never a device location.
    if (remembered && inAddress) void rememberPlace(next);
  }

  // The form's first load: a remembered place opens Today directly.
  function restore(saved: SavedPreferences | null) {
    setLoaded(true);
    setRemembered(saved?.place ?? null);
    if (saved?.place && !place) {
      const query = `?${placeToSearch(saved.place)}`;
      setPlace(saved.place);
      setPlaceQuery(query);
      window.history.replaceState(null, '', window.location.pathname + query);
    }
  }

  async function rememberPlace(next: Place) {
    try {
      const token = await currentToken();
      if (!token) return;
      const saved = toSaved(next);
      await savePreferences(token, { place: saved });
      setRemembered(saved);
    } catch {
      // The old place stays remembered; nothing else depends on it.
    }
  }

  async function forgetPlace() {
    const token = await currentToken();
    if (token) await savePreferences(token, { place: null });
    setRemembered(null);
  }

  // Rejects when the save fails, so Welcome can say so.
  async function finishWelcome({
    context: next,
    remember,
  }: {
    context: HouseholdContext;
    remember: boolean;
  }) {
    if (remember) {
      const update: PreferencesUpdate = { context: next };
      if (place && placeQuery) update.place = toSaved(place);
      await savePreferences(await tokenForSave(), update);
      if (update.place) setRemembered(update.place);
    }
    setContext(next);
    setFormKey((key) => key + 1);
    // Today's place heading takes focus once it shows.
    focusResult.current = true;
    navigate('/app');
  }

  const cpcb =
    sources.state.status === 'ready'
      ? sources.state.data.find((source) => source.id === 'cpcb')
      : undefined;

  return (
    <>
      <title>{`${TITLES[page]} | AirAware AI`}</title>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-20 focus:rounded-md focus:bg-surface-light focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <header className="on-dark bg-bg text-text">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <a
            href="/"
            className="shrink-0 text-lg font-semibold whitespace-nowrap"
          >
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
        {/* Today and My Profile stay mounted, hidden when not shown, so a built
            plan, a build in flight and unsaved answers survive moving pages. */}
        <div hidden={page !== 'profile'} className="contents">
          <Profile
            formKey={formKey}
            context={context}
            onContextChange={setContext}
            onLoaded={restore}
            remembered={remembered}
            onForget={forgetPlace}
            onDeleted={() => {
              setResets((n) => n + 1);
              setOpened(null);
              setListVersion((n) => n + 1);
              setRemembered(null);
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
        </div>
        {page === 'welcome' && !loaded && (
          <Loading label="Loading your place" />
        )}
        {/* Welcome waits for saved answers, so it starts from them. */}
        {page === 'welcome' && loaded && (
          <Welcome
            place={place}
            placeIsSearched={placeQuery !== ''}
            context={context}
            onChoosePlace={(next) => choose(next, true)}
            onLocateStart={locateStart}
            onLocate={locate}
            onFinish={finishWelcome}
          />
        )}
        {page !== 'today' && page !== 'profile' && page !== 'welcome' && (
          <Placeholder title={TITLES[page]} />
        )}
        <div hidden={page !== 'today'} className="contents">
          <h1 className="text-3xl font-semibold tracking-tight">
            Air quality near you
          </h1>
          {/* No place yet: saved answers are checked, then Welcome opens. */}
          {!place && !opened && <Loading label="Loading your place" />}
          {place && Object.keys(context).length === 0 && !inviteDismissed && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rule p-4">
              <a
                href="/app/welcome"
                onClick={(event) => {
                  event.preventDefault();
                  navigate('/app/welcome');
                }}
                className="press inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-bg"
              >
                Make it personal: 2 quick questions
              </a>
              <button
                type="button"
                onClick={() => setInviteDismissed(true)}
                className="min-h-11 rounded-md border border-text-dark px-4"
              >
                Not now
              </button>
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
              ) : null}
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
        </div>
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
