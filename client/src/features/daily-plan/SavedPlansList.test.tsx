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
  currentToken: vi.fn<() => Promise<string | null>>(),
}));

vi.mock('../../lib/supabase.ts', () => ({
  savingAvailable: true,
  currentToken: () => session.currentToken(),
  tokenForSave: () => Promise.resolve('tok'),
  forgetSession: () => Promise.resolve(),
}));

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
  session.currentToken.mockResolvedValue('tok');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('SavedPlansList', () => {
  it('shows nothing and fetches nothing without a session', async () => {
    session.currentToken.mockResolvedValue(null);
    const spy = routeFetch(() => ok([]));
    const { container } = renderList();

    await waitFor(() => expect(session.currentToken).toHaveBeenCalled());

    expect(container.textContent).toBe('');
    expect(spy).not.toHaveBeenCalled();
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

    expect(await screen.findByText('No saved plans yet.')).toBeDefined();
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
