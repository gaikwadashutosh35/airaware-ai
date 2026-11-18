import dashboardShot from '../assets/dashboard.webp';
import { Attribution } from '../components/Attribution.tsx';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import { placeToSearch, type Place } from '../features/location/place.ts';

// The hero's search opens the dashboard for the chosen place.
function openDashboard(place: Place) {
  window.location.assign(`/app?${placeToSearch(place)}`);
}

const ACTION = "Check your area's air quality";

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
      className="inline-flex min-h-12 items-center self-start rounded-full bg-primary px-6 font-semibold whitespace-nowrap text-bg transition-colors duration-150 hover:bg-text"
    >
      {ACTION}
    </a>
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
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-20 sm:px-8 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-12">
          <div className="flex flex-col gap-6">
            <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              The air around you matters.
            </h1>
            <p className="max-w-[34ch] text-xl text-text-muted">
              Hourly pollution forecasts for Indian cities, with every source
              shown.
            </p>
            <div className="max-w-md">
              <LocationSearch onSelect={openDashboard} />
            </div>
          </div>
          <figure
            data-slot="hero"
            data-kind="product"
            className="flex flex-col gap-3"
          >
            <img
              src={dashboardShot}
              width={977}
              height={598}
              fetchPriority="high"
              alt="AirAware dashboard showing a model forecast for Pune with pollutant values, units, times and sources"
              className="h-auto w-full rounded-xl outline-1 -outline-offset-1 outline-rule-dark"
            />
            <figcaption className="text-sm text-text-muted">
              A past screenshot of the dashboard for Pune. Open the dashboard
              for current values.
            </figcaption>
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
            className="grid gap-10 [counter-reset:step] md:grid-cols-2 lg:grid-cols-4 lg:gap-8"
          >
            {STEPS.map((step) => (
              <li
                key={step.title}
                className="flex flex-col gap-3 border-t-2 border-primary pt-6 [counter-increment:step] before:text-sm before:font-semibold before:text-primary before:content-[counter(step)]"
              >
                <h3 className="text-2xl font-semibold">{step.title}</h3>
                <p className="text-lg text-text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

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
        </div>
      </footer>
    </div>
  );
}

export default Landing;
