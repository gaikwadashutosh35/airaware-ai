import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

const SAVED = 'Saved on this browser.';
const UNAVAILABLE =
  "Saving isn't available right now. Your answers are still on screen.";
const NOTE =
  'Saved on this browser only. Clearing your browser data or switching devices loses it.';

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
  // Review Focus 2.
  it('loading with no session creates no account', async () => {
    const fetchSpy = routeFetch(() => ok(null));
    render(<HouseholdPreferencesForm />);
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());
    expect(session.tokenForSave).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(NOTE)).toBeDefined();
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
    expect(JSON.parse(put?.[1]?.body as string)).toEqual({
      routine: { outdoorExercise: true },
    });
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

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete my saved data' }),
    );
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
        "Your saved answers couldn't be loaded right now.",
      ),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete my saved data' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(
      await screen.findByText('Nothing was deleted. Try again in a moment.'),
    ).toBeDefined();
    expect(session.forgetSession).not.toHaveBeenCalled();
    expect(screen.queryByText('Deleted. Nothing is saved now.')).toBeNull();
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

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete my saved data' }),
    );
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

  it('saving not set up disables the buttons', () => {
    session.available = false;
    routeFetch(() => ok(null));
    render(<HouseholdPreferencesForm />);
    expect(saveButton()).toHaveProperty('disabled', true);
    expect(
      screen.getByRole('button', { name: 'Delete my saved data' }),
    ).toHaveProperty('disabled', true);
    expect(screen.getByRole('status').textContent).toBe(
      "Saving isn't set up on this site.",
    );
  });

  it('the form has no axe violations', async () => {
    routeFetch(() => ok(null));
    const { container } = render(<HouseholdPreferencesForm />);
    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());
    await expectNoAxeViolations(container);
  });
});
