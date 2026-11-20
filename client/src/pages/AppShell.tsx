import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type {
  DailyPlan,
  HouseholdContext,
  PreferencesUpdate,
  SavedPlace,
  SavedPreferences,
} from '../../../shared/contracts.ts';
import { AppNav } from '../components/AppNav.tsx';
import { PlaceChip } from '../components/PlaceChip.tsx';
import { Attribution } from '../components/Attribution.tsx';
import { ErrorState, Loading } from '../components/States.tsx';
import { useRequest } from '../features/air-quality/useRequest.ts';
import { DailyPlanSection } from '../features/daily-plan/DailyPlanSection.tsx';
import {
  NEAR_YOU,
  placeFromSearch,
  placeToSearch,
  type Place,
} from '../features/location/place.ts';
import { isOlderThan, useNow } from '../lib/clock.ts';
import { appPage, navigate, usePath } from '../lib/navigation.ts';
import { currentToken, tokenForSave } from '../lib/supabase.ts';
import { getForecast, getSources, savePreferences } from '../services/api.ts';
import { MyHome } from './MyHome.tsx';
import { Placeholder } from './Placeholder.tsx';
import { Profile } from './Profile.tsx';
import { Welcome } from './Welcome.tsx';
import { AirDetails } from '../features/today/AirDetails.tsx';
import { AskBox } from '../features/today/AskBox.tsx';
import { HelpChoices } from '../features/today/HelpChoices.tsx';
import { TodayLead } from '../features/today/TodayLead.tsx';
import { greeting, type AskIntent } from '../features/today/today.ts';

// What is saved for a remembered place: label and 2-decimal coordinates.
function toSaved(place: Place): SavedPlace {
  return {
    label: place.label,
    latitude: Number(place.latitude.toFixed(2)),
    longitude: Number(place.longitude.toFixed(2)),
  };
}

const TITLES = {
  today: 'Today',
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
  // Bumped after a save or a delete: the saved list loads again.
  const [listVersion, setListVersion] = useState(0);
  // The last plan deleted from the list, so the plan area stops calling
  // that plan saved.
  const [deletedPlanId, setDeletedPlanId] = useState<string | null>(null);
  // The plan on Today, for My Home's "Today, for your home".
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusResult = useRef(false);
  // A help topic or typed question for Ask (Phase 7 reads it). In memory
  // only: never in the address.
  const askIntent = useRef<AskIntent | null>(null);
  // True only while a device-location request is still wanted.
  const awaitingLocation = useRef(false);
  // The place chip's dialog.
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
    if (page === 'today' && !place && loaded) {
      navigate('/app/welcome', { replace: true });
    }
  }, [page, place, loaded]);
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
  // An hour after it loaded (device clock), Today reloads the forecast, as
  // the plan rebuilds then too, so the verdict and the recommendation rest on
  // the same data. A failed load waits for "Try again".
  const forecastDue =
    page === 'today' &&
    forecast.state.status === 'ready' &&
    isOlderThan(forecast.state.data.loadedAt.toISOString(), now, 60);
  const reloadForecast = useEffectEvent(() => forecast.retry());
  useEffect(() => {
    if (forecastDue) reloadForecast();
  }, [forecastDue]);

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
              setListVersion((n) => n + 1);
              setRemembered(null);
            }}
            listVersion={listVersion}
            onPlanDeleted={setDeletedPlanId}
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
        {page === 'home' && <MyHome plan={todayPlan} context={context} />}
        {page === 'ask' || page === 'habits' ? (
          <Placeholder title={TITLES[page]} />
        ) : null}
        <div hidden={page !== 'today'} className="contents">
          <div className="flex flex-col gap-1">
            {place && <p className="text-text-dark-muted">{greeting(now)}</p>}
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl font-semibold tracking-tight"
            >
              {place
                ? place.label === NEAR_YOU
                  ? 'Today near you (approximate)'
                  : `Today in ${place.label}`
                : 'Today'}
            </h1>
          </div>
          {/* No place yet: saved answers are checked, then Welcome opens. */}
          {!place && <Loading label="Loading your place" />}

          {/* Air on the left, the plan on the right from lg; one column (air
            first) below it. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
            <div className="flex min-w-0 flex-col gap-6">
              {place ? (
                <>
                  {forecast.state.status === 'ready' ? (
                    <>
                      <TodayLead
                        data={forecast.state.data.series}
                        stale={isOlderThan(
                          forecast.state.data.series.retrievedAt,
                          now,
                          60,
                        )}
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
                      level={2}
                    />
                  ) : (
                    <Loading label="Loading forecast" band />
                  )}
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
                // Not before saved answers load, or a returning user's
                // plan is built twice, first without them.
                active={(page === 'today' || page === 'home') && loaded}
                onSaved={() => setListVersion((n) => n + 1)}
                onPlan={setTodayPlan}
                deletedPlanId={deletedPlanId}
              />
            </div>
          </div>
          {/* After the verdict and recommendation: Today answers "How is my
            air?" first, even on a 320×640 phone. */}
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
          {place && (
            <>
              <HelpChoices
                onAsk={(topic) => {
                  askIntent.current = { topic };
                }}
              />
              <AskBox
                onAsk={(question) => {
                  askIntent.current = { question };
                }}
              />
              <AirDetails
                data={
                  forecast.state.status === 'ready'
                    ? forecast.state.data.series
                    : null
                }
                loadedAt={
                  forecast.state.status === 'ready'
                    ? forecast.state.data.loadedAt
                    : now
                }
                place={place}
                sources={
                  sources.state.status === 'ready' ? sources.state.data : null
                }
                cpcbNote={cpcb?.limitations[0]}
              />
            </>
          )}
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
