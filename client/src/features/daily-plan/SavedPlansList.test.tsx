import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedPlanSummary } from '../../../../shared/contracts.ts';
import { formatDateTime } from '../air-quality/forecast.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { rulesPlanFixture } from '../../test/planFixtures.ts';
import { SavedPlansList } from './SavedPlansList.tsx';

const session = vi.hoisted(() => ({
  available: true,
  currentToken: vi.fn<() => Promise<string | null>>(),
  tokenForSave: vi.fn<() => Promise<string>>(),
}));

vi.mock('../../lib/supabase.ts', () => ({
  get savingAvailable() {
    return session.available;
  },
  currentToken: () => session.currentToken(),
  tokenForSave: () => session.tokenForSave(),
  forgetSession: () => Promise.resolve(),
}));

const EMPTY =
  'No saved plans yet. Use Save plan under See your full day on Today.';
const older: SavedPlanSummary = {
  id: 'p-old',
  savedAt: '2026-11-17T10:00:00.000Z',
  placeLabel: 'Delhi',
};
const newer: SavedPlanSummary = {
  id: 'p-new',
  savedAt: '2026-11-18T10:40:00.000Z',
  placeLabel: 'Pune, Maharashtra',
};

type Responder = (method: string, path: string) => Response;

function routeFetch(respond: Responder) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input, init) =>
      Promise.resolve(
        respond(init?.method ?? 'GET', typeof input === 'string' ? input : ''),
      ),
    );
}

const ok = (data: unknown) => Response.json({ data });
const failure = (status: number, code: string) =>
  Response.json({ error: { code, message: 'x' } }, { status });

function renderList(version = 0) {
  const onOpen = vi.fn();
  const onDeleted = vi.fn();
  const utils = render(
    <SavedPlansList version={version} onOpen={onOpen} onDeleted={onDeleted} />,
  );
  return { ...utils, onOpen, onDeleted };
}

const rows = () =>
  within(screen.getByRole('list', { name: 'Saved plans' })).getAllByRole(
    'listitem',
  );

beforeEach(() => {
  session.available = true;
  session.currentToken.mockResolvedValue('tok');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('SavedPlansList', () => {
  it('says saving is not set up, and fetches nothing, when it is not', () => {
    session.available = false;
    const spy = routeFetch(() => ok([]));
    renderList();

    expect(screen.getByRole('heading', { name: 'Saved plans' })).toBeDefined();
    expect(screen.getByText("Saving isn't set up on this site.")).toBeDefined();
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows the heading and the empty line, and fetches nothing, without a session', async () => {
    session.currentToken.mockResolvedValue(null);
    const spy = routeFetch(() => ok([]));
    renderList();

    expect(
      await screen.findByRole('heading', { name: 'Saved plans' }),
    ).toBeDefined();
    expect(await screen.findByText(EMPTY)).toBeDefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps the section and the empty line after the last plan goes', async () => {
    let listed = [newer];
    routeFetch((method, path) => {
      if (method === 'DELETE') {
        listed = [];
        return new Response(null, { status: 204 });
      }
      return ok(path === '/api/v1/plans' ? listed : null);
    });
    renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));
    expect(await screen.findByText(EMPTY)).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Saved plans' })).toBeDefined();
  });

  // M2 (J30 D4): the destructive choice is in the danger ink, so it looks
  // different from Cancel beside it.
  it('"Delete plan" uses the danger ink; Cancel does not', async () => {
    routeFetch(() => ok([newer]));
    renderList();
    await screen.findByRole('list', { name: 'Saved plans' });
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    const danger = screen.getByRole('button', { name: 'Delete plan' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(danger.className).toContain('text-danger-ink');
    expect(danger.className).toContain('border-danger-ink');
    expect(danger.className).not.toContain('border-text-dark');
    expect(cancel.className).not.toContain('danger');
  });

  it('shows the empty line again once the session is gone', async () => {
    routeFetch(() => ok([newer]));
    const { rerender } = renderList(0);
    await screen.findByRole('list', { name: 'Saved plans' });
    session.currentToken.mockResolvedValue(null);
    rerender(
      <SavedPlansList version={1} onOpen={vi.fn()} onDeleted={vi.fn()} />,
    );
    expect(await screen.findByText(EMPTY)).toBeDefined();
  });

  it('dims its outlined buttons when disabled', async () => {
    routeFetch(() => ok([newer]));
    renderList();
    expect(
      (await screen.findByRole('button', { name: /^Open/ })).className,
    ).toContain('disabled:opacity-60');
  });

  it('lists saved plans newest first with local times', async () => {
    routeFetch(() => ok([older, newer]));
    renderList();

    expect(
      await screen.findByRole('heading', { name: 'Saved plans' }),
    ).toBeDefined();
    const [first, second] = rows();
    expect(first.textContent).toContain('Pune, Maharashtra');
    expect(first.textContent).toContain(
      `Saved ${formatDateTime(newer.savedAt)}`,
    );
    expect(second.textContent).toContain('Delhi');
  });

  it('says when there are none', async () => {
    routeFetch(() => ok([]));
    renderList();

    expect(await screen.findByText(EMPTY)).toBeDefined();
  });

  it('says when the list could not load', async () => {
    routeFetch(() => failure(503, 'SAVE_UNAVAILABLE'));
    renderList();
    expect(
      await screen.findByText("Your saved plans couldn't be loaded right now."),
    ).toBeDefined();
    cleanup();

    session.currentToken.mockRejectedValue(new Error('refresh failed'));
    renderList();
    expect(
      await screen.findByText("Your saved plans couldn't be loaded right now."),
    ).toBeDefined();
  });

  it('Try again after a failed load reloads the list once', async () => {
    let calls = 0;
    const spy = routeFetch(() => {
      calls += 1;
      return calls === 1 ? failure(503, 'SAVE_UNAVAILABLE') : ok([newer]);
    });
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Pune, Maharashtra')).toBeDefined();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Saved plans' }),
    );
  });

  it('Try again with no session makes no request and creates none', async () => {
    session.currentToken
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValue(null);
    const spy = routeFetch(() => ok([]));
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(EMPTY)).toBeDefined();
    expect(spy).not.toHaveBeenCalled();
    expect(session.tokenForSave).not.toHaveBeenCalled();
  });

  it('opens a saved plan', async () => {
    const saved = {
      id: 'p-new',
      savedAt: newer.savedAt,
      plan: rulesPlanFixture,
    };
    const spy = routeFetch((_method, path) =>
      path === '/api/v1/plans/p-new' ? ok(saved) : ok([older, newer]),
    );
    const { onOpen } = renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    fireEvent.click(within(rows()[0]).getByRole('button', { name: /^Open/ }));

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(saved));
    const call = spy.mock.calls.find(
      ([input]) => input === '/api/v1/plans/p-new',
    );
    expect(new Headers(call?.[1]?.headers).get('Authorization')).toBe(
      'Bearer tok',
    );
  });

  it('says when a saved plan could not be opened', async () => {
    routeFetch((_method, path) =>
      path === '/api/v1/plans' ? ok([newer]) : failure(404, 'NOT_FOUND'),
    );
    const { onOpen } = renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    fireEvent.click(screen.getByRole('button', { name: /^Open/ }));

    expect(
      await screen.findByText("This saved plan couldn't be opened right now."),
    ).toBeDefined();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('says when opening a saved plan was rate-limited', async () => {
    routeFetch((_method, path) =>
      path === '/api/v1/plans' ? ok([newer]) : failure(429, 'RATE_LIMITED'),
    );
    const { onOpen } = renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    fireEvent.click(screen.getByRole('button', { name: /^Open/ }));

    expect(
      await screen.findByText('Too many requests. Try again in a minute.'),
    ).toBeDefined();
    expect(
      screen.queryByText("This saved plan couldn't be opened right now."),
    ).toBeNull();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('deletes one plan after a confirmation', async () => {
    let listed = [older, newer];
    const spy = routeFetch((method, path) => {
      if (method === 'DELETE') {
        listed = [older];
        return new Response(null, { status: 204 });
      }
      return ok(path === '/api/v1/plans' ? listed : null);
    });
    const { onDeleted } = renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    fireEvent.click(within(rows()[0]).getByRole('button', { name: /^Delete/ }));
    expect(spy.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(
      false,
    );
    expect(
      screen.getByText("Delete this saved plan? It can't be undone."),
    ).toBeDefined();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Cancel' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('p-new'));
    await waitFor(() => expect(rows()).toHaveLength(1));
    const del = spy.mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(del?.[0]).toBe('/api/v1/plans/p-new');
  });

  // Phase 8 review: say it worked, take the row away at once, and keep
  // keyboard focus in the list.
  it('confirms a single delete and keeps focus in the list', async () => {
    let listed = [older, newer];
    routeFetch((method, path) => {
      if (method === 'DELETE') {
        listed = [older];
        return new Response(null, { status: 204 });
      }
      return ok(path === '/api/v1/plans' ? listed : null);
    });
    renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    fireEvent.click(within(rows()[0]).getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));

    expect(await screen.findByText('Saved plan deleted.')).toBeDefined();
    expect(rows()).toHaveLength(1);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Saved plans' }),
    );
  });

  it('keeps the row when a delete fails', async () => {
    routeFetch((method) =>
      method === 'DELETE' ? failure(503, 'SAVE_UNAVAILABLE') : ok([newer]),
    );
    const { onDeleted } = renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));

    expect(
      await screen.findByText('Nothing was deleted. Try again in a moment.'),
    ).toBeDefined();
    expect(rows()).toHaveLength(1);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('keeps the row and says so when a delete is rate-limited', async () => {
    routeFetch((method) =>
      method === 'DELETE' ? failure(429, 'RATE_LIMITED') : ok([newer]),
    );
    const { onDeleted } = renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));

    expect(
      await screen.findByText(
        'Too many requests, so nothing was deleted. Try again in a minute.',
      ),
    ).toBeDefined();
    expect(
      screen.queryByText('Nothing was deleted. Try again in a moment.'),
    ).toBeNull();
    expect(rows()).toHaveLength(1);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('reloads when the version changes', async () => {
    let listed = [older];
    routeFetch(() => ok(listed));
    const { rerender } = renderList(0);
    await screen.findByRole('heading', { name: 'Saved plans' });
    expect(rows()).toHaveLength(1);

    listed = [older, newer];
    rerender(
      <SavedPlansList version={1} onOpen={vi.fn()} onDeleted={vi.fn()} />,
    );

    await waitFor(() => expect(rows()).toHaveLength(2));
  });

  it('handles 20 saved plans and long labels', async () => {
    const label = 'L'.repeat(120);
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      savedAt: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
      placeLabel: i === 0 ? label : `Place ${i}`,
    }));
    routeFetch(() => ok(many));
    renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    expect(rows()).toHaveLength(20);
    expect(screen.getByText(label)).toBeDefined();
  });

  it('passes axe', async () => {
    routeFetch(() => ok([older, newer]));
    const { container } = renderList();
    await screen.findByRole('heading', { name: 'Saved plans' });

    await expectNoAxeViolations(container);
  });
});
