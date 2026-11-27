import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFirmsFires, FIRMS_SOURCES } from './firms.ts';

// 10:30 UTC on 27 Nov; Pune is 18.52, 73.86.
const NOW = new Date('2026-11-27T10:30:00.000Z');
const HEADER =
  'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight';
const row = (
  lat: number,
  lon: number,
  date: string,
  time: string,
  confidence = 'n',
) =>
  `${lat},${lon},330.1,0.4,0.37,${date},${time},N20,VIIRS,${confidence},2.0NRT,290.2,4.1,D`;
const csv = (...rows: string[]) => [HEADER, ...rows].join('\n') + '\n';

let fetchSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

// Each source answers with its own text, in FIRMS_SOURCES order.
function reply(...bodies: Array<string | number>) {
  fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input as string | URL);
    const i = FIRMS_SOURCES.findIndex((s) => url.includes(`/${s}/`));
    const body = bodies[i] ?? csv();
    return typeof body === 'number'
      ? new Response('error', { status: body })
      : new Response(body, { headers: { 'content-type': 'text/csv' } });
  });
}

describe('createFirmsFires', () => {
  it("asks FIRMS' fixed host once per satellite for a box around the place", async () => {
    reply();
    await createFirmsFires('test-key')(18.52, 73.86, NOW);
    const urls = fetchSpy.mock.calls.map(
      ([u]: unknown[]) => new URL(String(u)),
    );
    expect(urls).toHaveLength(2);
    for (const [i, url] of urls.entries()) {
      expect(url.origin).toBe('https://firms.modaps.eosdis.nasa.gov');
      const [, api, area, format, key, source, box, days] =
        url.pathname.split('/');
      expect([api, area, format, key, days]).toEqual([
        'api',
        'area',
        'csv',
        'test-key',
        '2',
      ]);
      expect(source).toBe(FIRMS_SOURCES[i]);
      const [west, south, east, north] = box!.split(',').map(Number);
      // About 50 km each way: 0.45° of latitude, a little more of longitude.
      expect(north! - 18.52).toBeCloseTo(0.449, 2);
      expect(18.52 - south!).toBeCloseTo(0.449, 2);
      expect(east! - 73.86).toBeGreaterThan(0.449);
      expect(73.86 - west!).toBeCloseTo(east! - 73.86, 5);
    }
  });

  it('counts hotspots within 50 km and 24 hours, with the nearest and latest', async () => {
    reply(
      csv(
        row(18.6, 73.9, '2026-11-27', '0815'), // ~10 km, 2 h ago
        row(18.9, 73.86, '2026-11-26', '2045'), // ~42 km, ~14 h ago
        row(19.2, 73.86, '2026-11-27', '0815'), // ~76 km: outside
        row(18.6, 73.9, '2026-11-26', '0900'), // 25.5 h ago: too old
      ),
      csv(row(18.55, 73.87, '2026-11-27', '0904')), // ~3.5 km, 1.4 h ago
    );
    const fires = await createFirmsFires('k')(18.52, 73.86, NOW);
    expect(fires).toMatchObject({
      status: 'available',
      dataKind: 'satellite_detection',
      count: 3,
      radiusKm: 50,
      windowHours: 24,
      latestAt: '2026-11-27T09:04:00.000Z',
      retrievedAt: NOW.toISOString(),
      provider: 'NASA FIRMS',
    });
    expect(fires.status === 'available' && fires.nearestKm).toBeCloseTo(3.5, 0);
  });

  it('leaves out low-confidence detections (often sun glint or roofs)', async () => {
    reply(
      csv(
        row(18.6, 73.9, '2026-11-27', '0815', 'l'),
        row(18.6, 73.9, '2026-11-27', '0815', 'h'),
      ),
    );
    const fires = await createFirmsFires('k')(18.52, 73.86, NOW);
    expect(fires.status === 'available' && fires.count).toBe(1);
  });

  it('reports none found as zero, with no nearest or latest', async () => {
    reply();
    expect(await createFirmsFires('k')(18.52, 73.86, NOW)).toMatchObject({
      status: 'available',
      count: 0,
      nearestKm: null,
      latestAt: null,
    });
  });

  it('is unavailable, never a partial count, when any satellite fails', async () => {
    reply(csv(row(18.6, 73.9, '2026-11-27', '0815')), 500);
    expect(await createFirmsFires('k')(18.52, 73.86, NOW)).toEqual({
      status: 'unavailable',
    });
  });

  it('is unavailable when FIRMS answers with something other than its CSV', async () => {
    reply('Invalid MAP_KEY.', 'Invalid MAP_KEY.');
    expect(await createFirmsFires('k')(18.52, 73.86, NOW)).toEqual({
      status: 'unavailable',
    });
  });

  it('caches a place for 30 minutes, but never an unavailable answer', async () => {
    const fires = createFirmsFires('k');
    reply(500, 500);
    await fires(18.52, 73.86, NOW);
    reply();
    // The failed answer was not cached: this call asked again.
    expect((await fires(18.52, 73.86, NOW)).status).toBe('available');
    expect(fetchSpy.mock.calls.length).toBe(4);
    const after = fetchSpy.mock.calls.length;
    await fires(18.52, 73.86, new Date(NOW.getTime() + 29 * 60_000));
    expect(fetchSpy.mock.calls.length).toBe(after);
    await fires(18.52, 73.86, new Date(NOW.getTime() + 31 * 60_000));
    expect(fetchSpy.mock.calls.length).toBe(after + 2);
  });

  // Review: a changed cell format must not read as "no fires".
  it('is unavailable when any row cannot be read', async () => {
    reply(
      csv(
        row(18.6, 73.9, '2026-11-27', '0815'),
        row(18.6, 73.9, '27/11/2026', '08:15'),
      ),
    );
    expect(await createFirmsFires('k')(18.52, 73.86, NOW)).toEqual({
      status: 'unavailable',
    });
  });

  // Review: a box cut at ±180° would miss fires across the date line.
  it('is unavailable, asking nothing, where the box crosses the date line', async () => {
    reply();
    expect(await createFirmsFires('k')(-16.8, 179.9, NOW)).toEqual({
      status: 'unavailable',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never logs the key', async () => {
    const log = vi.spyOn(console, 'error');
    reply(500, 'nonsense');
    await createFirmsFires('secret-map-key')(18.52, 73.86, NOW);
    fetchSpy.mockRejectedValue(new Error('offline'));
    await createFirmsFires('secret-map-key')(18.52, 73.86, NOW);
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret-map-key');
  });
});
