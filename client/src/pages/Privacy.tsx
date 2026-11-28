import type { ReactNode } from 'react';
import { Attribution } from '../components/Attribution.tsx';

// Plain-language summary of PRIVACY.md "as built". Keep the two in step.
function Part({ title, items }: { title: string; items: ReactNode[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <ul className="max-w-prose flex list-disc flex-col gap-2 pl-5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Privacy() {
  return (
    <>
      <title>Privacy | AirAware AI</title>
      <header className="on-dark bg-bg text-text">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))]">
          <a
            href="/"
            className="inline-flex min-h-11 items-center text-lg font-semibold"
          >
            AirAware AI
          </a>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] py-8 sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] sm:py-12">
        <div className="flex flex-col gap-3">
          <a
            href="/app"
            className="inline-flex min-h-11 items-center self-start underline"
          >
            Back to AirAware
          </a>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
          <p className="max-w-prose text-text-dark-muted">
            AirAware AI is built to need as little about you as possible. This
            is what goes where.
          </p>
        </div>
        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-surface-light p-5 sm:p-6">
          <h2 className="text-2xl font-semibold tracking-tight">In short</h2>
          <ul className="max-w-prose flex list-disc flex-col gap-2 pl-5">
            <li>
              Nothing is stored until you press &quot;Save my answers&quot; or
              &quot;Save plan&quot;, or tick &quot;Remember on this
              device&quot;.
            </li>
            <li>AirAware AI has no analytics, tracking or advertising.</li>
            <li>
              &quot;Delete my saved data&quot; removes your account, saved
              answers and saved plans; Supabase’s own logs may keep your IP
              address.
            </li>
          </ul>
        </section>
        <Part
          title="What stays in your browser"
          items={[
            'Your household answers stay on this page until you press "Save my answers" or tick "Remember on this device".',
            'No account exists until you press a save button or tick "Remember on this device". Then this browser keeps a sign-in session in its local storage.',
          ]}
        />
        <Part
          title="What Open-Meteo receives"
          items={[
            'Our server, not your browser, asks Open-Meteo for forecasts and place searches.',
            'It sends the text you search for, and the place’s coordinates rounded to 2 decimal places (about 1 km).',
            'Your device location is asked for only when you press "Use my location", and it is rounded the same way before it leaves your browser.',
          ]}
        />
        <Part
          title="What the AI writers receive"
          items={[
            "When AI personalisation is on, our server sends the 24-hour forecast check and the text of the suggestions our rules picked for you to Google's Gemini, and to Anthropic's Claude, only when Gemini gives no usable answer.",
            'Those suggestions’ reasons can mention your answers, for example "You said you exercise outdoors".',
            "For a typed Ask question, only Anthropic's Claude is used: it gets your question, up to two earlier questions from this visit, the forecast check and the suggestion text.",
            'Neither receives the place name, coordinates or your account.',
          ]}
        />
        <Part
          title="What happens to your questions"
          items={[
            "Questions you type in Ask AirAware go to our server and on to Anthropic's Claude, which writes the answer.",
            "We don't save or log them, and never send them to Gemini. Anthropic's published policy is to delete API data within 30 days (longer only to enforce its usage policy or by law) and not to train on it by default.",
            'Your Ask answers stay on this page for this visit only.',
          ]}
        />
        <Part
          title="What Supabase (our database host) stores"
          items={[
            'Only after you press "Save my answers" or "Save plan", or tick "Remember on this device", in Supabase’s South Asia (Mumbai) region.',
            'An anonymous account, with no email, name or password.',
            'Your saved answers, and your saved plans with the place name you chose.',
            'If you tick "Remember on this device": your answers and the city or area you searched for, with its coordinates rounded to about 1 km.',
            'A place found with "Use my location" is never saved.',
            'Supabase’s sign-in service stores your IP address and browser type with the session. Supabase’s own logs may also record your IP address, and those entries are not removed when you delete your data.',
            'The project owner and Supabase, as the host, can access the database.',
          ]}
        />
        <Part
          title="How to delete"
          items={[
            '"Delete my saved data" removes your account, saved answers and saved plans.',
            '"Forget this place" in My Profile removes a remembered place.',
            'You can delete single plans from the saved plans list.',
            'Clearing your browser data loses access to your saved data but does not delete it. A nightly job deletes anonymous accounts that have not been used for 30 days, together with their saved answers and plans.',
          ]}
        />
        <Part
          title="No analytics"
          items={[
            'AirAware AI has no analytics, tracking or advertising.',
            'Our server logs never contain your answers, place names, plans, tokens or account ids.',
          ]}
        />
        <p className="text-sm text-text-dark-muted">
          This page describes how the app works. It is not legal advice.
        </p>
      </main>
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] py-8 text-sm text-text-dark-muted sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))]">
          <Attribution />
          <a
            href="/privacy"
            className="inline-flex min-h-11 items-center self-start underline"
          >
            Privacy
          </a>
        </div>
      </footer>
    </>
  );
}

export default Privacy;
