import { useId } from 'react';
import todayShot from '../assets/today-phone.jpg';
import { Attribution } from '../components/Attribution.tsx';
import { PlanCard } from '../features/daily-plan/PlanCard.tsx';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import { placeToSearch, type Place } from '../features/location/place.ts';
import {
  LANDING_EXAMPLES,
  LANDING_SOURCES,
  type LandingExample,
} from './landingExamples.ts';

// The hero's search opens the dashboard for the chosen place.
function openDashboard(place: Place) {
  window.location.assign(`/app?${placeToSearch(place)}`);
}

const ACTION = 'Check My Air';
const ASSISTANT = 'Meet Your Assistant';

// The real path of a forecast value (a diagram of the actual system).
const STEPS = [
  {
    title: 'CAMS global model',
    detail: 'Copernicus runs it every 12 hours on a grid about 45 km wide.',
  },
  {
    title: 'Open-Meteo',
    detail: 'Serves its hourly PM2.5, PM10 and four gases, each with a unit.',
  },
  {
    title: 'AirAware server',
    detail:
      'Asks only for a location rounded to about 1 km and reuses each answer for 10 minutes.',
  },
  {
    title: 'Your screen',
    detail: 'Every value with its unit, its hour and the label Model forecast.',
  },
];

function ActionLink() {
  return (
    <a
      href="/app"
      className="press inline-flex min-h-12 items-center self-start rounded-full bg-primary px-6 font-semibold whitespace-nowrap text-bg transition duration-150 hover:bg-text"
    >
      {ACTION}
    </a>
  );
}

// The hero's second action: the primary link's outlined twin.
function AssistantLink() {
  return (
    <a
      href="/app/ask"
      className="press inline-flex min-h-12 items-center self-start rounded-full border border-text px-6 font-semibold whitespace-nowrap transition duration-150 hover:bg-elevated"
    >
      {ASSISTANT}
    </a>
  );
}

// One story chapter: a short claim beside the real card that backs it,
// drawn by the app's own PlanCard on a light panel, labelled as an example.
// "01"…: a decorative chapter or step number, hidden from screen readers so
// headings read cleanly.
function Number({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      data-ordinal
      className="text-sm font-semibold tracking-wide text-primary tabular-nums"
    >
      {String(n).padStart(2, '0')}
    </span>
  );
}

function Chapter({
  example,
  number,
  flip,
}: {
  example: LandingExample;
  number: number;
  flip: boolean;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-24"
    >
      <div className={`flex flex-col gap-4 ${flip ? 'lg:order-2' : ''}`}>
        <Number n={number} />
        <h2
          id={headingId}
          className="text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          {example.heading}
        </h2>
        <p className="max-w-[38ch] text-xl text-text-muted">{example.text}</p>
      </div>
      <figure className="flex min-w-0 flex-col gap-3">
        {/* The label comes first, so an example is never read as today's
            air. */}
        <figcaption className="text-sm text-text-muted">
          {example.caption}
        </figcaption>
        <div className="on-light rounded-xl bg-surface-light p-5 text-text-dark sm:p-6 [&>article]:border-t-0 [&>article]:pt-0">
          <PlanCard
            item={{
              candidate: example.candidate,
              forYou: null,
              period: null,
              compact: false,
            }}
            sources={LANDING_SOURCES}
            level={3}
            openWhy={example.openWhy}
          />
        </div>
      </figure>
    </section>
  );
}

function Landing() {
  return (
    <div className="on-dark min-h-dvh bg-bg text-text">
      <title>AirAware AI: hourly air-quality forecasts for Indian cities</title>
      <header>
        <div className="mx-auto flex min-h-16 max-w-6xl items-center px-4 sm:px-8">
          <a href="/" className="text-lg font-semibold">
            AirAware AI
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-20 sm:px-8 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:py-12">
          <div className="flex flex-col gap-6">
            <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              The air around you matters.
            </h1>
            <p className="max-w-[40ch] text-xl text-text-muted">
              Understand your city's air quality. Discover smarter daily
              routines. Make better choices for your home and community.
            </p>
            <div className="flex flex-wrap gap-3">
              <ActionLink />
              <AssistantLink />
            </div>
            <div className="flex max-w-md flex-col gap-2">
              <p className="text-sm text-text-muted">Or search a city</p>
              <LocationSearch onSelect={openDashboard} />
            </div>
          </div>
          {/* A phone screenshot at its own CSS size, so its text reads at
              1:1; the caption shares its width. */}
          <figure
            data-slot="hero"
            data-kind="product"
            className="mx-auto flex w-full max-w-[390px] flex-col gap-3"
          >
            {/* The label first, so it never sits below the fold while the
                screenshot is read as today's air. */}
            <figcaption className="text-sm text-text-muted">
              A past screenshot of Today for Pune, 20 Nov 2026. Open the app for
              current values.
            </figcaption>
            <img
              src={todayShot}
              width={390}
              height={844}
              fetchPriority="high"
              alt="Screenshot of AirAware's Today page on a phone, for Pune: the forecast verdict with its Model forecast label and the navigation bar"
              className="h-auto w-full rounded-xl outline-1 -outline-offset-1 outline-rule-dark"
            />
          </figure>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-8 lg:py-36">
          <div className="flex flex-col gap-4">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Where every number comes from
            </h2>
            <p className="text-xl text-text-muted">
              Forecasts for the next 48 hours, hour by hour.
            </p>
          </div>
          <ol
            aria-label="How a forecast reaches you"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex flex-col gap-3 rounded-xl border border-rule-dark bg-surface p-6"
              >
                <Number n={i + 1} />
                <h3 className="text-2xl font-semibold">{step.title}</h3>
                <p className="text-lg text-text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        {LANDING_EXAMPLES.map((example, i) => (
          <Chapter
            key={example.candidate.id}
            example={example}
            number={i + 1}
            flip={i % 2 === 1}
          />
        ))}

        <section className="bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-24 sm:px-8 lg:py-32">
            <p className="max-w-[28ch] text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Forecasts are model estimates, not station measurements, and not
              the CPCB National AQI.
            </p>
            <p className="text-lg text-text-muted">
              Official CPCB observations are not connected yet.
            </p>
          </div>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-24 sm:px-8 lg:py-32">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Your city, the next two days
          </h2>
          <ActionLink />
        </section>
      </main>

      <footer className="border-t border-rule-dark">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-12 text-sm text-text-muted sm:px-8">
          <p className="text-base font-semibold text-text">AirAware AI</p>
          <Attribution />
          <a href="/privacy" className="underline">
            Privacy
          </a>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
