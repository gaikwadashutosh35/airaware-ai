import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { HouseholdPreferencesForm } from './HouseholdPreferencesForm.tsx';

const session = vi.hoisted(() => ({
  available: true,
  currentToken: vi.fn<() => Promise<string | null>>(),
  tokenForSave: vi.fn<() => Promise<string>>(),
  forgetSession: vi.fn<() => Promise<void>>(),
}));

vi.mock('../../lib/supabase.ts', () => ({
  get savingAvailable() {
    return session.available;
  },
  currentToken: () => session.currentToken(),
  tokenForSave: () => session.tokenForSave(),
  forgetSession: () => session.forgetSession(),
}));

const SAVED = 'Saved to your anonymous account.';
const UNAVAILABLE =
  "Saving isn't available right now. Your answers are still on screen.";
const RATE_LIMITED =
  'Too many requests. Try again in a minute. Your answers are still on screen.';
const NOTE =
  "Saving creates an anonymous account (no email or name). Your answers are stored on AirAware's database host, and this browser keeps the sign-in. Delete them any time in My Profile. Clearing this browser's data loses access but does not delete them.";

type Responder = (method: string, path: string) => Response;

function routeFetch(respond: Responder) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const path = typeof input === 'string' ? input : '';
    return Promise.resolve(respond(init?.method ?? 'GET', path));
  });
}

const ok = (data: unknown) => Response.json({ data });
const saveButton = () =>
  screen.getByRole('button', { name: 'Save my answers' });
const deleteButton = () =>
  screen.findByRole('button', { name: 'Delete my saved data' });
const LINE = 'Saving creates an anonymous account (no email or name).';

beforeEach(() => {
  session.available = true;
  session.currentToken.mockResolvedValue(null);
  session.tokenForSave.mockResolvedValue('tok');
  session.forgetSession.mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('HouseholdPreferencesForm', () => {
  // Guided chat (Task 2): an answer given in Ask AirAware reaches My Profile.
  const exercise = () =>
    screen.getByLabelText<HTMLSelectElement>('Do you exercise outdoors?');
  const commute = () =>
    screen.getByLabelText<HTMLSelectElement>(
      'How do you usually travel to work or college?',
    );

  it('an answer given elsewhere shows in the form', async () => {
    routeFetch(() => ok(null));
    const { rerender } = render(<HouseholdPreferencesForm initial={{}} />);
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());

    rerender(
      <HouseholdPreferencesForm
        initial={{ routine: { outdoorExercise: true } }}
      />,
    );
    expect(exercise().value).toBe('yes');
  });

  it('Save keeps an answer given elsewhere', async () => {
    const fetchSpy = routeFetch((method) =>
      method === 'PUT'
        ? ok({ context: {}, updatedAt: '2026-11-18T10:00:00.000Z' })
        : ok(null),
    );
    const { rerender } = render(<HouseholdPreferencesForm initial={{}} />);
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());
    rerender(
      <HouseholdPreferencesForm
        initial={{ routine: { outdoorExercise: true } }}
      />,
    );

    fireEvent.click(saveButton());
    expect(await screen.findByText(SAVED)).toBeDefined();
    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(put?.[1]?.body as string)).toEqual({
      context: { routine: { outdoorExercise: true } },
    });
  });

  // Review Focus 2.
  it('a late saved-answers load does not undo an answer given elsewhere', async () => {
    session.currentToken.mockResolvedValue('tok');
    let reply!: (response: Response) => void;
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        () => new Promise<Response>((resolve) => (reply = resolve)),
      );
    const onChange = vi.fn();
    const onLoaded = vi.fn();
    const form = (initial: object) => (
      <HouseholdPreferencesForm
        initial={initial}
        onChange={onChange}
        onLoaded={onLoaded}
      />
    );
    const { rerender } = render(form({}));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    rerender(form({ routine: { outdoorExercise: true } }));
    reply(
      ok({
        context: { routine: { outdoorExercise: false, commuteMode: 'car' } },
        updatedAt: '2026-11-18T10:00:00.000Z',
      }),
    );
    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));

    expect(exercise().value).toBe('yes');
    expect(commute().value).toBe('car');
    expect(onChange.mock.lastCall?.[0]).toEqual({
      routine: { outdoorExercise: true, commuteMode: 'car' },
    });
  });

  it('a change from the form itself is not echoed back', async () => {
    routeFetch(() => ok(null));
    const onChange = vi.fn();
    const { rerender } = render(
      <HouseholdPreferencesForm initial={{}} onChange={onChange} />,
    );
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());

    fireEvent.change(exercise(), { target: { value: 'yes' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender(
      <HouseholdPreferencesForm
        initial={onChange.mock.lastCall?.[0]}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(exercise().value).toBe('yes');
  });

  it('the form starts from the answers it is given', async () => {
    routeFetch(() => ok(null));
    render(
      <HouseholdPreferencesForm
        initial={{
          home: { airPurifier: true },
          routine: { commuteMode: 'car' },
        }}
      />,
    );
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());

    expect(
      (
        screen.getByLabelText(
          'Do you have an air purifier?',
        ) as HTMLSelectElement
      ).value,
    ).toBe('yes');
    expect(
      (
        screen.getByLabelText(
          'How do you usually travel to work or college?',
        ) as HTMLSelectElement
      ).value,
    ).toBe('car');
  });

  // Review Focus 2.
  it('loading with no session creates no account', async () => {
    const fetchSpy = routeFetch(() => ok(null));
    render(<HouseholdPreferencesForm />);
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());
    expect(session.tokenForSave).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(NOTE)).toBeDefined();
    // Nothing is saved: nothing to delete.
    expect(
      screen.queryByRole('button', { name: 'Delete my saved data' }),
    ).toBeNull();
  });

  it('shows Delete for an existing session, and never creates one to check', async () => {
    session.currentToken.mockResolvedValue('tok');
    routeFetch(() => ok(null));
    render(<HouseholdPreferencesForm />);
    expect(await deleteButton()).toBeDefined();
    expect(session.tokenForSave).not.toHaveBeenCalled();
  });

  it('shows Delete again after a save creates a session', async () => {
    routeFetch((method) =>
      method === 'PUT'
        ? ok({ context: {}, updatedAt: '2026-11-18T10:00:00.000Z' })
        : ok(null),
    );
    render(<HouseholdPreferencesForm />);
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: 'Delete my saved data' }),
    ).toBeNull();
    fireEvent.click(saveButton());
    expect(await screen.findByText(SAVED)).toBeDefined();
    expect(await deleteButton()).toBeDefined();
  });

  it("puts the note's first sentence by Save and the full note in Your data", () => {
    routeFetch(() => ok(null));
    render(<HouseholdPreferencesForm />);
    const line = screen.getByText(LINE);
    const note = screen.getByText(NOTE);
    expect(line).not.toBe(note);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your data' }),
    ).toBeDefined();
    expect(saveButton().getAttribute('aria-describedby')).toBe(
      `${line.id} ${note.id}`,
    );
    expect(
      screen.getByRole('region', { name: 'Your data' }).contains(note),
    ).toBe(true);
  });

  // Review Focus 2.
  it('an existing session loads saved answers', async () => {
    session.currentToken.mockResolvedValue('tok');
    routeFetch(() =>
      ok({
        context: { routine: { commuteMode: 'car' } },
        updatedAt: '2026-11-18T10:00:00.000Z',
      }),
    );
    render(<HouseholdPreferencesForm />);
    const commute = screen.getByLabelText<HTMLSelectElement>(
      'How do you usually travel to work or college?',
    );
    await waitFor(() => expect(commute.value).toBe('car'));
    expect(session.tokenForSave).not.toHaveBeenCalled();
  });

  it('saving sends the answers and says saved', async () => {
    const fetchSpy = routeFetch((method) =>
      method === 'PUT'
        ? ok({ context: {}, updatedAt: '2026-11-18T10:00:00.000Z' })
        : ok(null),
    );
    render(<HouseholdPreferencesForm />);
    fireEvent.change(screen.getByLabelText('Do you exercise outdoors?'), {
      target: { value: 'yes' },
    });
    fireEvent.click(saveButton());
    expect(await screen.findByText(SAVED)).toBeDefined();
    expect(session.tokenForSave).toHaveBeenCalledTimes(1);
    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[0]).toBe('/api/v1/profile/preferences');
    // Only the answers: a remembered place is left as it is (Phase 5).
    expect(JSON.parse(put?.[1]?.body as string)).toEqual({
      context: { routine: { outdoorExercise: true } },
    });
  });

  it('reports what it loaded', async () => {
    session.currentToken.mockResolvedValue('tok');
    const saved = {
      context: { home: { airPurifier: true } },
      place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
      updatedAt: '2026-11-18T10:00:00.000Z',
    };
    routeFetch(() => ok(saved));
    const onLoaded = vi.fn();
    render(<HouseholdPreferencesForm onLoaded={onLoaded} />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(saved));
    expect(onLoaded).toHaveBeenCalledTimes(1);
  });

  it('reports null with no session', async () => {
    routeFetch(() => ok(null));
    const onLoaded = vi.fn();
    render(<HouseholdPreferencesForm onLoaded={onLoaded} />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(null));
  });

  it('reports null when the load fails', async () => {
    session.currentToken.mockResolvedValue('tok');
    routeFetch(() =>
      Response.json(
        { error: { code: 'SAVE_UNAVAILABLE', message: 'Not now.' } },
        { status: 503 },
      ),
    );
    const onLoaded = vi.fn();
    render(<HouseholdPreferencesForm onLoaded={onLoaded} />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(null));
  });

  // A save after a failed load would overwrite answers that never arrived.
  it('turns Save off when the saved answers fail to load', async () => {
    session.currentToken.mockResolvedValue('tok');
    routeFetch(() =>
      Response.json(
        { error: { code: 'SAVE_UNAVAILABLE', message: 'Not now.' } },
        { status: 503 },
      ),
    );
    render(<HouseholdPreferencesForm />);
    expect(
      await screen.findByText(
        "Your saved answers couldn't be loaded right now. Saving is off until you reload the page.",
      ),
    ).toBeDefined();
    expect(saveButton()).toHaveProperty('disabled', true);
  });

  // Review Focus 1.
  it('a failed save keeps the answers and never says saved', async () => {
    routeFetch(() =>
      Response.json(
        {
          error: {
            code: 'SAVE_UNAVAILABLE',
            message: 'Saving is not available right now.',
          },
        },
        { status: 503 },
      ),
    );
    render(<HouseholdPreferencesForm />);
    const exercise = screen.getByLabelText<HTMLSelectElement>(
      'Do you exercise outdoors?',
    );
    fireEvent.change(exercise, { target: { value: 'yes' } });
    fireEvent.click(saveButton());
    expect(await screen.findByText(UNAVAILABLE)).toBeDefined();
    expect(exercise.value).toBe('yes');
    expect(screen.queryByText(SAVED)).toBeNull();
  });

  it('a rate-limited save says so and keeps the answers', async () => {
    routeFetch(() =>
      Response.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
        { status: 429 },
      ),
    );
    render(<HouseholdPreferencesForm />);
    const exercise = screen.getByLabelText<HTMLSelectElement>(
      'Do you exercise outdoors?',
    );
    fireEvent.change(exercise, { target: { value: 'yes' } });
    fireEvent.click(saveButton());
    expect(await screen.findByText(RATE_LIMITED)).toBeDefined();
    expect(exercise.value).toBe('yes');
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(screen.queryByText(SAVED)).toBeNull();
  });

  it('deleting needs a confirming step', async () => {
    session.currentToken.mockResolvedValue('tok');
    const fetchSpy = routeFetch((method) =>
      method === 'DELETE'
        ? new Response(null, { status: 204 })
        : ok({
            context: { home: { airPurifier: true } },
            updatedAt: '2026-11-18T10:00:00.000Z',
          }),
    );
    render(<HouseholdPreferencesForm />);
    const purifier = screen.getByLabelText<HTMLSelectElement>(
      'Do you have an air purifier?',
    );
    await waitFor(() => expect(purifier.value).toBe('yes'));
    const before = fetchSpy.mock.calls.length;

    fireEvent.click(await deleteButton());
    expect(fetchSpy.mock.calls.length).toBe(before);

    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(
      await screen.findByText('Deleted. Nothing is saved now.'),
    ).toBeDefined();
    const del = fetchSpy.mock.calls.find(
      ([, init]) => init?.method === 'DELETE',
    );
    expect(del?.[0]).toBe('/api/v1/account');
    expect(session.forgetSession).toHaveBeenCalledTimes(1);
    expect(purifier.value).toBe('');
  });

  // Final review #1: a session that can't be checked is never "nothing saved".
  it('a delete that cannot check the session claims nothing', async () => {
    session.currentToken.mockRejectedValue(new Error('refresh failed'));
    routeFetch(() => new Response(null, { status: 204 }));
    render(<HouseholdPreferencesForm />);
    // The page's own load fails the same way first.
    expect(
      await screen.findByText(
        "Your saved answers couldn't be loaded right now. Saving is off until you reload the page.",
      ),
    ).toBeDefined();
    fireEvent.click(await deleteButton());
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(
      await screen.findByText('Nothing was deleted. Try again in a moment.'),
    ).toBeDefined();
    expect(session.forgetSession).not.toHaveBeenCalled();
    expect(screen.queryByText('Deleted. Nothing is saved now.')).toBeNull();
  });

  // Phase 6 deferred #9 / Phase 8 review: a slow load never overwrites
  // answers the person already changed.
  // Phase 8 final review #1: merge, never skip — the person's own changes
  // win, and every other saved answer still arrives.
  it('merges saved answers under answers changed before they arrived', async () => {
    session.currentToken.mockResolvedValue('tok');
    let reply: (response: Response) => void = () => {};
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          reply = resolve;
        }),
    );
    render(<HouseholdPreferencesForm />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const exercise = screen.getByLabelText<HTMLSelectElement>(
      'Do you exercise outdoors?',
    );
    const purifier = screen.getByLabelText<HTMLSelectElement>(
      'Do you have an air purifier?',
    );
    fireEvent.change(exercise, { target: { value: 'yes' } });

    reply(
      ok({
        context: {
          routine: { outdoorExercise: false },
          home: { airPurifier: true },
        },
        updatedAt: '2026-11-18T10:00:00.000Z',
      }),
    );

    await waitFor(() => expect(purifier.value).toBe('yes'));
    expect(exercise.value).toBe('yes');
  });

  // Phase 8 final review #4: answers deleted while still loading must not
  // come back (a Save would store them again).
  it('a delete before saved answers arrive never brings them back', async () => {
    session.currentToken.mockResolvedValue('tok');
    let reply: (response: Response) => void = () => {};
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_input, init) =>
        init?.method === 'DELETE'
          ? Promise.resolve(new Response(null, { status: 204 }))
          : new Promise<Response>((resolve) => {
              reply = resolve;
            }),
      );
    render(<HouseholdPreferencesForm />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    fireEvent.click(await deleteButton());
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(
      await screen.findByText('Deleted. Nothing is saved now.'),
    ).toBeDefined();
    reply(
      ok({
        context: { home: { airPurifier: true } },
        updatedAt: '2026-11-18T10:00:00.000Z',
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(
      screen.getByLabelText<HTMLSelectElement>('Do you have an air purifier?')
        .value,
    ).toBe('');
  });

  it('reports answers as they change', () => {
    routeFetch(() => ok(null));
    const onChange = vi.fn();
    render(<HouseholdPreferencesForm onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Do you have an air purifier?'), {
      target: { value: 'yes' },
    });

    expect(onChange).toHaveBeenLastCalledWith({ home: { airPurifier: true } });
  });

  it('reports loaded saved answers', async () => {
    session.currentToken.mockResolvedValue('tok');
    routeFetch(() =>
      ok({
        context: { routine: { commuteMode: 'car' } },
        updatedAt: '2026-11-18T10:00:00.000Z',
      }),
    );
    const onChange = vi.fn();
    render(<HouseholdPreferencesForm onChange={onChange} />);

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        routine: { commuteMode: 'car' },
      }),
    );
  });

  it('reports a finished delete only', async () => {
    session.currentToken.mockResolvedValue('tok');
    let deleteStatus = 500;
    routeFetch((method) =>
      method === 'DELETE'
        ? deleteStatus === 204
          ? new Response(null, { status: 204 })
          : Response.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Failed.' } },
              { status: 500 },
            )
        : ok(null),
    );
    const onChange = vi.fn();
    const onDeleted = vi.fn();
    render(
      <HouseholdPreferencesForm onChange={onChange} onDeleted={onDeleted} />,
    );
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());

    fireEvent.click(await deleteButton());
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(
      await screen.findByText('Nothing was deleted. Try again in a moment.'),
    ).toBeDefined();
    expect(onDeleted).not.toHaveBeenCalled();

    deleteStatus = 204;
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(
      await screen.findByText('Deleted. Nothing is saved now.'),
    ).toBeDefined();
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('saving not set up disables Save and shows no Delete', () => {
    session.available = false;
    session.currentToken.mockResolvedValue('tok');
    routeFetch(() => ok(null));
    render(<HouseholdPreferencesForm />);
    expect(saveButton()).toHaveProperty('disabled', true);
    expect(
      screen.queryByRole('button', { name: 'Delete my saved data' }),
    ).toBeNull();
    expect(
      within(
        screen.getByRole('region', { name: 'Your household (optional)' }),
      ).getByRole('status').textContent,
    ).toBe("Saving isn't set up on this site.");
  });

  // The delete result's live region is on the page before it has text.
  it('keeps the Your data status region mounted, empty until a delete', () => {
    routeFetch(() => ok(null));
    render(<HouseholdPreferencesForm />);
    const region = screen.getByRole('region', { name: 'Your data' });
    expect(within(region).getByRole('status').textContent).toBe('');
  });

  it('a save after a delete clears "Deleted. Nothing is saved now."', async () => {
    session.currentToken.mockResolvedValue('tok');
    routeFetch((method) =>
      method === 'DELETE'
        ? new Response(null, { status: 204 })
        : ok({ context: {}, updatedAt: '2026-11-18T10:00:00.000Z' }),
    );
    render(<HouseholdPreferencesForm />);
    fireEvent.click(await deleteButton());
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    await screen.findByText('Deleted. Nothing is saved now.');
    session.currentToken.mockResolvedValue(null);

    fireEvent.click(saveButton());
    expect(await screen.findByText(SAVED)).toBeDefined();
    expect(screen.queryByText('Deleted. Nothing is saved now.')).toBeNull();
  });

  it('shows Delete when a first save makes the account but the save fails', async () => {
    routeFetch((method) =>
      method === 'PUT'
        ? Response.json({ error: { code: 'X', message: 'x' } }, { status: 500 })
        : ok(null),
    );
    render(<HouseholdPreferencesForm />);
    fireEvent.click(saveButton());
    expect(await screen.findByText(UNAVAILABLE)).toBeDefined();
    expect(await deleteButton()).toBeDefined();
  });

  it('the outlined buttons dim when disabled', () => {
    session.available = false;
    routeFetch(() => ok(null));
    render(<HouseholdPreferencesForm />);
    expect(saveButton().className).toContain('disabled:opacity-60');
  });

  it('the form has no axe violations', async () => {
    routeFetch(() => ok(null));
    const { container } = render(<HouseholdPreferencesForm />);
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());
    await expectNoAxeViolations(container);
  });
});
