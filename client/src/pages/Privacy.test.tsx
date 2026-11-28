/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Privacy from './Privacy.tsx';

// Every heading and sentence the page had before P6, in order, minus the
// ones P6 changed (PV-05).
const UNCHANGED = [
  'Privacy',
  'AirAware AI is built to need as little about you as possible. This is what goes where.',
  'What stays in your browser',
  'Your household answers stay on this page until you press "Save my answers".',
  'What Open-Meteo receives',
  'Our server, not your browser, asks Open-Meteo for forecasts and place searches.',
  'It sends the text you search for, and the place’s coordinates rounded to 2 decimal places (about 1 km).',
  'Your device location is asked for only when you press "Use my location", and it is rounded the same way before it leaves your browser.',
  'What the AI writers receive',
  "When AI personalisation is on, our server sends the 24-hour forecast check and the text of the suggestions our rules picked for you to Google's Gemini, and to Anthropic's Claude, only when Gemini gives no usable answer.",
  'Those suggestions’ reasons can mention your answers, for example "You said you exercise outdoors".',
  "For a typed Ask question, only Anthropic's Claude is used: it gets your question, up to two earlier questions from this visit, the forecast check and the suggestion text.",
  'Neither receives the place name, coordinates or your account.',
  'What happens to your questions',
  "Questions you type in Ask AirAware go to our server and on to Anthropic's Claude, which writes the answer.",
  "We don't save or log them, and never send them to Gemini. Anthropic's published policy is to delete API data within 30 days (longer only to enforce its usage policy or by law) and not to train on it by default.",
  'Your Ask answers stay on this page for this visit only.',
  'Only after you press "Save my answers" or "Save plan", or tick "Remember on this device", in Supabase’s South Asia (Mumbai) region.',
  'An anonymous account, with no email, name or password.',
  'Your saved answers, and your saved plans with the place name you chose.',
  'If you tick "Remember on this device": your answers and the city or area you searched for, with its coordinates rounded to about 1 km.',
  'A place found with "Use my location" is never saved.',
  'Supabase’s sign-in service stores your IP address and browser type with the session. Supabase’s own logs may also record your IP address, and those entries are not removed when you delete your data.',
  'The project owner and Supabase, as the host, can access the database.',
  'How to delete',
  '"Delete my saved data" removes your account, saved answers and saved plans.',
  '"Forget this place" in My Profile removes a remembered place.',
  'You can delete single plans from the saved plans list.',
  'Clearing your browser data loses access to your saved data but does not delete it. Unused accounts are not removed automatically yet.',
  'No analytics',
  'AirAware AI has no analytics, tracking or advertising.',
  'Our server logs never contain your answers, place names, plans, tokens or account ids.',
  'This page describes how the app works. It is not legal advice.',
];
const IN_SHORT = [
  'Nothing is stored until you press "Save my answers" or "Save plan", or tick "Remember on this device".',
  'AirAware AI has no analytics, tracking or advertising.',
  '"Delete my saved data" removes your account, saved answers and saved plans; Supabase’s own logs may keep your IP address.',
];
const A9 =
  'No account exists until you press a save button or tick "Remember on this device". Then this browser keeps a sign-in session in its local storage.';
// F6 (owner, 25 Nov): the nightly cleanup runs in production, so the page
// says what PRIVACY.md says.
const OLD_RETENTION =
  'Clearing your browser data loses access to your saved data but does not delete it. Unused accounts are not removed automatically yet.';
const CLEANUP =
  'A nightly job deletes anonymous accounts that have not been used for 30 days, together with their saved answers and plans.';
const RETENTION = `Clearing your browser data loses access to your saved data but does not delete it. ${CLEANUP}`;
// P6 review (owner, 25 Nov): Remember also stores the answers.
const ANSWERS_LINE =
  'Your household answers stay on this page until you press "Save my answers" or tick "Remember on this device".';

describe('Privacy', () => {
  afterEach(cleanup);

  // P6 (PV-03, F5): the app's navy header, one way back.
  it('has the navy header with only the logo, and a way back', () => {
    const { getByRole } = render(<Privacy />);
    const header = getByRole('banner');
    expect(header.className).toContain('on-dark');
    expect(header.className).toContain('bg-bg');
    expect(header.className).toContain('text-text');
    expect(header.querySelectorAll('a, button')).toHaveLength(1);
    expect(
      within(header)
        .getByRole('link', { name: 'AirAware AI' })
        .getAttribute('href'),
    ).toBe('/');
    const back = getByRole('link', { name: 'Back to AirAware' });
    expect(back.getAttribute('href')).toBe('/app');
    expect(
      back.compareDocumentPosition(getByRole('heading', { level: 1 })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // P11 polish: side safe areas (C7) and a readable line length.
  it('clears the side safe areas and keeps lists to a readable line', () => {
    const { container } = render(<Privacy />);
    for (const el of [
      container.querySelector('header')?.firstElementChild,
      container.querySelector('main'),
      container.querySelector('footer')?.firstElementChild,
    ]) {
      for (const r of ['1rem', '1.5rem']) {
        expect(el?.className).toContain(
          `pl-[max(${r},env(safe-area-inset-left,0px))]`,
        );
        expect(el?.className).toContain(
          `pr-[max(${r},env(safe-area-inset-right,0px))]`,
        );
      }
    }
    const lists = container.querySelectorAll('main ul');
    expect(lists.length).toBeGreaterThan(3);
    for (const list of lists) expect(list.className).toContain('max-w-prose');
  });

  // P6 (PV-01, A10).
  it('has an "In short" panel with exactly three lines', () => {
    const { getByRole } = render(<Privacy />);
    const panel = getByRole('heading', {
      level: 2,
      name: 'In short',
    }).parentElement!;
    expect(
      [...panel.querySelectorAll('li')].map((li) => li.textContent),
    ).toEqual(IN_SHORT);
  });

  // P6 (PV-02, A9).
  it('glosses Supabase once, on its own section, and names Remember in the account line', () => {
    const { container, getByRole } = render(<Privacy />);
    const text = container.textContent ?? '';
    expect(text.split('our database host')).toHaveLength(2);
    expect(
      getByRole('heading', {
        level: 2,
        name: 'What Supabase (our database host) stores',
      }),
    ).toBeTruthy();
    expect(text).toContain(A9);
    expect(text).toContain(ANSWERS_LINE);
  });

  // PV-04 / F6: retention matches PRIVACY.md word for word.
  it('states the nightly cleanup, in the same words as PRIVACY.md', () => {
    const { container } = render(<Privacy />);
    const text = container.textContent ?? '';
    expect(text).toContain(RETENTION);
    expect(text).not.toContain('not removed automatically');
    expect(readFileSync('../PRIVACY.md', 'utf8')).toContain(CLEANUP);
  });

  // PV-05: nothing else changed, in the same order.
  it('keeps every other heading and sentence as it was', () => {
    const { container } = render(<Privacy />);
    const rendered = [
      ...container.querySelectorAll('main h1, main h2, main p, main li'),
    ].map((el) => el.textContent);
    const expected = [...UNCHANGED];
    expected[3] = ANSWERS_LINE;
    expected[expected.indexOf(OLD_RETENTION)] = RETENTION;
    expected.splice(16 + 1, 0, 'What Supabase (our database host) stores');
    expected.splice(4, 0, A9);
    expected.splice(2, 0, 'In short', ...IN_SHORT);
    expect(rendered).toEqual(expected);
  });

  // Phase 5: what "Remember on this device" keeps, and how to forget it.
  it('explains what Remember on this device keeps', () => {
    const { container } = render(<Privacy />);
    const text = container.textContent ?? '';

    expect(text).toContain('or tick "Remember on this device"');
    expect(text).toContain(
      'If you tick "Remember on this device": your answers and the city or area you searched for, with its coordinates rounded to about 1 km.',
    );
    expect(text).toContain(
      'A place found with "Use my location" is never saved.',
    );
    expect(text).toContain(
      '"Forget this place" in My Profile removes a remembered place.',
    );
    expect(text).not.toContain('No coordinates.');
  });

  // Phase 7, decision 4: what happens to a typed question.
  it('explains what happens to your questions', () => {
    const { container, getByRole } = render(<Privacy />);
    const text = container.textContent ?? '';

    expect(
      getByRole('heading', {
        level: 2,
        name: 'What happens to your questions',
      }),
    ).toBeTruthy();
    for (const sentence of [
      "Questions you type in Ask AirAware go to our server and on to Anthropic's Claude, which writes the answer.",
      "We don't save or log them, and never send them to Gemini. Anthropic's published policy is to delete API data within 30 days (longer only to enforce its usage policy or by law) and not to train on it by default.",
      'Your Ask answers stay on this page for this visit only.',
      "For a typed Ask question, only Anthropic's Claude is used: it gets your question, up to two earlier questions from this visit, the forecast check and the suggestion text.",
    ]) {
      expect(text).toContain(sentence);
    }
  });
});
