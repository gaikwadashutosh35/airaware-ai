import { ArrowDown, ArrowRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import todayShot from '../assets/today-phone.jpg';
import { Attribution } from '../components/Attribution.tsx';
import { PlanCard } from '../features/daily-plan/PlanCard.tsx';
import { SKYLINE } from '../features/air-quality/skylineGeometry.ts';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import { placeToSearch, type Place } from '../features/location/place.ts';
import { CHOICES } from '../features/today/helpChoices.ts';
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

const SECTION =
  'reveal mx-auto max-w-6xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] py-6 sm:pl-[max(2rem,env(safe-area-inset-left,0px))] sm:pr-[max(2rem,env(safe-area-inset-right,0px))] sm:py-10 lg:py-12';
const H2 = 'text-3xl font-semibold tracking-tight sm:text-5xl';

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

// "01"…: a decorative chapter or step number, hidden from screen readers so
// headings read cleanly.
function Ordinal({ n }: { n: number }) {
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

// A real rule card with its label read first, so an example is never read as
// today's air.
function ExampleCard({
  example,
  level,
}: {
  example: LandingExample;
  level: 3 | 4;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="text-sm text-text-muted">
        {example.caption}
      </figcaption>
      <div className="on-light rounded-xl bg-surface-light p-4 text-text-dark sm:p-6 [&>article]:border-t-0 [&>article]:pt-0">
        <PlanCard
          item={{
            candidate: example.candidate,
            forYou: null,
            period: null,
            compact: false,
          }}
          sources={LANDING_SOURCES}
          level={level}
          openWhy={example.openWhy}
        />
      </div>
    </figure>
  );
}

// One story chapter: a short claim (its paragraphs), beside the thing that
// backs it when there is one, with an optional action after both.
function Chapter({
  number,
  flip = false,
  heading,
  paragraphs,
  after,
  children,
}: {
  number: number;
  flip?: boolean;
  heading: string;
  paragraphs: string[];
  after?: ReactNode;
  children?: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={`${SECTION} grid items-center gap-5 lg:gap-x-16 ${children ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`}
    >
      <div className={`flex flex-col gap-3 ${flip ? 'lg:order-2' : ''}`}>
        <Ordinal n={number} />
        <h2 id={headingId} className={H2}>
          {heading}
        </h2>
        {paragraphs.map((text) => (
          <p
            key={text}
            className="max-w-[38ch] text-lg text-text-muted sm:text-xl"
          >
            {text}
          </p>
        ))}
      </div>
      {children}
      {after && <div className="lg:order-3 lg:col-span-2">{after}</div>}
    </section>
  );
}

// A still, decorative city along the hero's bottom: the backdrop's own
// shapes (skylineGeometry.ts), cropped to the street and its roofs. No
// data-air, no motion; the words carry the meaning.
function HeroSkyline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 60 800 100"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full sm:h-20"
    >
      <path d={SKYLINE.far} className="fill-surface" />
      <g className="fill-elevated">
        {[...SKYLINE.near, ...SKYLINE.tanks].map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

function Landing() {
  const helpId = useId();
  const homeHabitsId = useId();
  const worksId = useId();
  const closingId = useId();
  // The examples in their file order: the plan's text joins Explainable AI
  // (its card is not shown), then the home and habits cards.
  const [plan, home, habits, explainable] = LANDING_EXAMPLES as [
    LandingExample,
    LandingExample,
    LandingExample,
    LandingExample,
  ];
  return (
    <div className="on-dark min-h-dvh bg-bg text-text">
      <title>AirAware AI: hourly air-quality forecasts for Indian cities</title>
      <header>
        <div className="mx-auto flex min-h-16 max-w-6xl items-center pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-[max(2rem,env(safe-area-inset-left,0px))] sm:pr-[max(2rem,env(safe-area-inset-right,0px))]">
          <a
            href="/"
            className="inline-flex min-h-11 items-center text-lg font-semibold"
          >
            AirAware AI
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <HeroSkyline />
          <div className="relative mx-auto grid max-w-6xl items-start gap-6 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-4 pb-16 sm:pl-[max(2rem,env(safe-area-inset-left,0px))] sm:pr-[max(2rem,env(safe-area-inset-right,0px))] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:pt-6 lg:pb-20">
            <div className="flex flex-col gap-5">
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
                <LocationSearch
                  onSelect={openDashboard}
                  offersLocation={false}
                  submitLabel="Search"
                />
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
                A past screenshot of Today for Pune, 22 Nov 2026. Open the app
                for current values.
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
          </div>
        </section>

        <Chapter
          number={1}
          heading="Understand your air"
          paragraphs={[
            "One sentence tells you how today's forecast compares with India's 24-hour limits, labelled Model forecast with the time it was retrieved. Every number, unit and source is one tap away, under Air quality details.",
          ]}
        />

        <section
          aria-labelledby={helpId}
          className={`${SECTION} flex flex-col gap-6`}
        >
          <h2 id={helpId} className={H2}>
            What AirAware helps with
          </h2>
          {/* The same four choices as Today's, here as plain text. */}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHOICES.map(({ title, line }) => (
              <li
                key={title}
                className="flex flex-col gap-1 rounded-xl border border-rule-dark bg-surface p-4"
              >
                <span className="text-xl font-semibold">{title}</span>
                <span className="text-text-muted">{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <Chapter
          number={2}
          flip
          heading={explainable.heading}
          paragraphs={[explainable.text, plan.text]}
          after={<ActionLink />}
        >
          <ExampleCard example={explainable} level={3} />
        </Chapter>

        <section
          aria-labelledby={homeHabitsId}
          className={`${SECTION} flex flex-col gap-8`}
        >
          <div className="flex flex-col gap-3">
            <Ordinal n={3} />
            <h2 id={homeHabitsId} className={H2}>
              My Home and Better Habits
            </h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            {[home, habits].map((example) => (
              <div
                key={example.heading}
                className="flex min-w-0 flex-col gap-4"
              >
                <h3 className="text-3xl font-semibold tracking-tight">
                  {example.heading}
                </h3>
                <p className="max-w-[38ch] text-lg text-text-muted sm:text-xl">
                  {example.text}
                </p>
                <ExampleCard example={example} level={4} />
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby={worksId}
          className={`${SECTION} flex flex-col gap-8`}
        >
          <div className="flex flex-col gap-3">
            <h2 id={worksId} className={H2}>
              How AirAware works
            </h2>
            <p className="text-xl text-text-muted">
              Forecasts for the next 48 hours, hour by hour.
            </p>
          </div>
          <ol
            aria-label="How a forecast reaches you"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex flex-col gap-2 rounded-xl border border-rule-dark bg-surface p-5"
              >
                <div className="flex items-center gap-2">
                  {/* The flow from the step before: down while the cards
                      stack, right once they sit in a row, none in the 2×2
                      grid between. */}
                  {i > 0 && (
                    <>
                      <ArrowDown
                        aria-hidden="true"
                        className="size-5 text-primary md:hidden"
                      />
                      <ArrowRight
                        aria-hidden="true"
                        className="hidden size-5 text-primary lg:block"
                      />
                    </>
                  )}
                  <Ordinal n={i + 1} />
                </div>
                <h3 className="text-xl font-semibold sm:text-2xl">
                  {step.title}
                </h3>
                <p className="text-lg text-text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby={closingId}
          className={`${SECTION} flex flex-col gap-6`}
        >
          <h2 id={closingId} className={H2}>
            Your city, the next two days
          </h2>
          <div className="flex flex-col gap-4">
            <p className="max-w-[28ch] text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Forecasts are model estimates, not station measurements, and not
              the CPCB National AQI.
            </p>
            <p className="text-lg text-text-muted">
              Official CPCB observations are not connected yet.
            </p>
          </div>
          <ActionLink />
        </section>
      </main>

      <footer className="border-t border-rule-dark">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] py-12 text-sm text-text-muted sm:pl-[max(2rem,env(safe-area-inset-left,0px))] sm:pr-[max(2rem,env(safe-area-inset-right,0px))]">
          <p className="text-base font-semibold text-text">AirAware AI</p>
          <Attribution />
          <a
            href="/privacy"
            className="inline-flex min-h-11 items-center self-start underline"
          >
            Privacy
          </a>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
