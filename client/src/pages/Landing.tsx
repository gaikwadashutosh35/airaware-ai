import dashboardShot from '../assets/dashboard.webp';

const ACTION = "Check your area's air quality";

const FACTS = [
  {
    term: 'Pollutants',
    detail:
      'PM2.5, PM10, nitrogen dioxide, sulphur dioxide, ozone and carbon monoxide.',
  },
  {
    term: 'Units and hours',
    detail:
      'Every value carries its unit and the hour it is for, in your time zone.',
  },
  {
    term: 'Data kind',
    detail: 'Labelled model forecast, never presented as a station reading.',
  },
  {
    term: 'Source',
    detail:
      'Open-Meteo, from the CAMS global model on a grid about 45 km wide.',
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
            <ActionLink />
          </div>
          <figure
            data-slot="hero"
            data-kind="product"
            className="flex flex-col gap-3"
          >
            <img
              src={dashboardShot}
              width={977}
              height={554}
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
              Every number shows its source
            </h2>
            <p className="text-xl text-text-muted">
              Forecasts for the next 48 hours, hour by hour.
            </p>
          </div>
          <dl className="border-t border-rule-dark">
            {FACTS.map((fact) => (
              <div
                key={fact.term}
                className="grid gap-2 border-b border-rule-dark py-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8"
              >
                <dt className="text-2xl font-semibold">{fact.term}</dt>
                <dd className="text-lg text-text-muted">{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-24 sm:px-8 lg:py-32">
            <p className="max-w-[24ch] text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
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
          <p className="max-w-[70ch]">
            Air-quality forecasts from{' '}
            <a href="https://open-meteo.com/" className="underline">
              Open-Meteo.com
            </a>{' '}
            (CC BY 4.0), based on CAMS global forecasts from the Copernicus
            Atmosphere Monitoring Service.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
