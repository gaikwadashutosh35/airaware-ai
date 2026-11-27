import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FireSummary } from '../../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { FireHotspots } from './FireHotspots.tsx';

const NOW = new Date('2026-11-27T10:30:00.000Z');
const pune = { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 };
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const available = (
  over: Partial<Extract<FireSummary, { status: 'available' }>> = {},
): FireSummary => ({
  status: 'available',
  dataKind: 'satellite_detection',
  count: 3,
  nearestKm: 12.4,
  latestAt: '2026-11-27T09:04:00.000Z',
  radiusKm: 50,
  windowHours: 24,
  retrievedAt: '2026-11-27T10:20:00.000Z',
  provider: 'NASA FIRMS',
  sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/',
  limitations: ['A hotspot is a satellite pixel.'],
  ...over,
});

function reply(summary: FireSummary | number) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      typeof summary === 'number'
        ? Response.json(
            { error: { code: 'INTERNAL_ERROR', message: 'x' } },
            { status: summary },
          )
        : Response.json({ data: summary }),
    );
}

async function show(now = NOW) {
  const view = render(<FireHotspots place={pune} now={now} />);
  await act(async () => {});
  return view;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FireHotspots', () => {
  it('asks for the place with 2-decimal coordinates', async () => {
    const spy = reply(available());
    await show();
    const url = new URL(String(spy.mock.calls[0]![0] as string), 'http://x');
    expect(url.pathname).toBe('/api/v1/fires/nearby');
    expect(url.searchParams.get('latitude')).toBe('18.52');
    expect(url.searchParams.get('longitude')).toBe('73.86');
  });

  it('gives the count, the nearest and the latest, with its source', async () => {
    reply(available());
    await show();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fire hotspots nearby' }),
    ).toBeDefined();
    expect(
      screen.getByText(
        `NASA satellites detected 3 fire hotspots within 50 km in the last 24 hours. The nearest is 12 km away; the latest was seen at ${time('2026-11-27T09:04:00.000Z')}.`,
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        `Satellite detections · NASA FIRMS · retrieved ${time('2026-11-27T10:20:00.000Z')}`,
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        'A hotspot is a heat signal seen from space, not proof that smoke reaches you.',
      ),
    ).toBeDefined();
  });

  it('says one hotspot in the singular', async () => {
    reply(available({ count: 1 }));
    await show();
    expect(
      screen.getByText(/^NASA satellites detected 1 fire hotspot within/),
    ).toBeDefined();
  });

  it('says when none were detected', async () => {
    reply(available({ count: 0, nearestKm: null, latestAt: null }));
    await show();
    expect(
      screen.getByText(
        'No fire hotspots were detected within 50 km in the last 24 hours.',
      ),
    ).toBeDefined();
  });

  it('says unavailable, never zero, when FIRMS or the server fails', async () => {
    reply({ status: 'unavailable' });
    const { unmount } = await show();
    expect(
      screen.getByText('Fire hotspot data is unavailable right now.'),
    ).toBeDefined();
    expect(screen.queryByText(/No fire hotspots/)).toBeNull();
    unmount();
    vi.restoreAllMocks();
    reply(500);
    await show();
    expect(
      screen.getByText('Fire hotspot data is unavailable right now.'),
    ).toBeDefined();
  });

  it('shows nothing when FIRMS is not configured', async () => {
    reply({ status: 'not_configured' });
    const { container } = await show();
    expect(container.innerHTML).toBe('');
  });

  it('marks data older than an hour as Not current', async () => {
    reply(available());
    await show(new Date('2026-11-27T11:30:00.000Z'));
    expect(screen.getByText(/· Not current$/)).toBeDefined();
  });

  // Review: a detection from the day before says so, not just a clock time.
  it('says "yesterday" for a detection from the day before', async () => {
    // Local times, so the days differ in any time zone.
    const now = new Date(2026, 10, 27, 10, 30);
    const latest = new Date(2026, 10, 26, 20, 45).toISOString();
    reply(
      available({
        latestAt: latest,
        retrievedAt: new Date(2026, 10, 27, 10, 20).toISOString(),
      }),
    );
    await show(now);
    expect(
      screen.getByText(
        new RegExp(`the latest was seen yesterday at ${time(latest)}\\.$`),
      ),
    ).toBeDefined();
  });

  // Review: an unavailable card can be retried.
  it('offers Try again when unavailable, and it asks again', async () => {
    const spy = reply({ status: 'unavailable' });
    await show();
    spy.mockResolvedValue(Response.json({ data: available() }));
    await act(async () => {
      screen.getByRole('button', { name: 'Try again' }).click();
    });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/^NASA satellites detected 3/)).toBeDefined();
  });

  // Review: the card refreshes every 30 minutes, keeping its numbers on
  // screen while it does, so it never sits at "Not current".
  it('refreshes every 30 minutes without blanking', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      let resolve: (r: Response) => void = () => {};
      const spy = reply(available());
      await show();
      spy.mockImplementation(() => new Promise<Response>((r) => (resolve = r)));
      await act(async () => {
        vi.advanceTimersByTime(30 * 60_000);
      });
      expect(spy).toHaveBeenCalledTimes(2);
      // Still the old numbers while the new ones load.
      expect(screen.getByText(/^NASA satellites detected 3/)).toBeDefined();
      await act(async () =>
        resolve(Response.json({ data: available({ count: 5 }) })),
      );
      expect(screen.getByText(/^NASA satellites detected 5/)).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('has no axe violations', async () => {
    reply(available());
    const { container } = await show();
    await expectNoAxeViolations(container);
  });
});
