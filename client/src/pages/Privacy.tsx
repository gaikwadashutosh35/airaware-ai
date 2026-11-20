import type { ReactNode } from 'react';
import { Attribution } from '../components/Attribution.tsx';

// Plain-language summary of PRIVACY.md "as built". Keep the two in step.
function Part({ title, items }: { title: string; items: ReactNode[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5">
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
      <header className="border-b border-rule">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center px-4 sm:px-6">
          <a href="/" className="text-lg font-semibold">
            AirAware AI
          </a>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
          <p className="max-w-prose text-text-dark-muted">
            AirAware AI is built to need as little about you as possible. This
            is what goes where.
          </p>
        </div>
        <Part
          title="What stays in your browser"
          items={[
            'Your household answers stay on this page until you press "Save my answers".',
            'No account exists until you press a save button. Then this browser keeps a sign-in session in its local storage.',
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
            'Neither receives the place name, coordinates or your account.',
          ]}
        />
        <Part
          title="What Supabase stores"
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
            'Clearing your browser data loses access to your saved data but does not delete it. Unused accounts are not removed automatically yet.',
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

export default Privacy;
