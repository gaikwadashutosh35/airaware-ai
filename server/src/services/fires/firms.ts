import type { FireSummary } from '../../../../shared/contracts.ts';
import { createTtlCache } from '../air-data/cache.ts';

// NASA FIRMS active-fire detections (owner, 27 Nov). Fixed host, so no
// configuration can redirect it. Suomi NPP stopped on 2 Nov 2026 and MODIS
// Terra stops on 1 Dec 2026, so the two VIIRS satellites still flying.
const BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
export const FIRMS_SOURCES = ['VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT'] as const;
export const FIRMS_SOURCE_URL = 'https://firms.modaps.eosdis.nasa.gov/';
const RADIUS_KM = 50;
const WINDOW_HOURS = 24;
const KM_PER_DEGREE = 111.32;
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const HOUR_MS = 3_600_000;

export const FIRE_LIMITATIONS = [
  'A hotspot is a satellite pixel (about 375 m) flagged as holding a fire or another heat source, such as a factory roof; it is not proof that smoke reaches you.',
  'Detections arrive up to about 3 hours after a satellite pass, and clouds or a missed pass can hide fires.',
  'Low-confidence detections are left out.',
];

export type Fires = (
  latitude: number,
  longitude: number,
  now: Date,
) => Promise<FireSummary>;

interface Detection {
  latitude: number;
  longitude: number;
  at: number;
}

// One satellite's detections for the box, or null on any failure. Only the
// host is logged: the path holds the key.
async function detections(url: URL): Promise<Detection[] | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [header, ...rows] = (await res.text()).trim().split(/\r?\n/);
    const names = header?.split(',') ?? [];
    const col = (name: string) => names.indexOf(name);
    const [lat, lon, date, time, conf] = [
      col('latitude'),
      col('longitude'),
      col('acq_date'),
      col('acq_time'),
      col('confidence'),
    ];
    // A refused key or a changed format answers with other text.
    if ([lat, lon, date, time, conf].some((i) => i < 0)) {
      throw new Error('unexpected response');
    }
    const found: Detection[] = [];
    for (const line of rows) {
      const cells = line.split(',');
      // Low confidence ('l'): often sun glint or bright roofs.
      if (/^l/i.test(cells[conf] ?? '')) continue;
      const hhmm = (cells[time] ?? '').padStart(4, '0');
      // FIRMS acquisition times are UTC.
      const at = Date.parse(
        `${cells[date]}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00Z`,
      );
      const point = {
        latitude: Number(cells[lat]),
        longitude: Number(cells[lon]),
        at,
      };
      // A row that cannot be read (a changed format) makes the answer
      // unavailable: skipping it could turn fires into "none detected".
      if (!Object.values(point).every(Number.isFinite)) {
        throw new Error('unreadable row');
      }
      found.push(point);
    }
    return found;
  } catch (cause) {
    console.error(`Provider request to ${url.host} failed:`, String(cause));
    return null;
  }
}

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Fire hotspots within 50 km of a place (2-decimal coordinates) in the last
// 24 hours, cached 30 minutes per place. Any failed satellite makes the
// answer unavailable, never a smaller count, and that is not cached.
export function createFirmsFires(mapKey: string): Fires {
  const cache = createTtlCache<FireSummary>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);
  return async (latitude, longitude, now) => {
    const key = `${latitude},${longitude}`;
    const cached = cache.get(key, now.getTime());
    if (cached) return cached;

    const dLat = RADIUS_KM / KM_PER_DEGREE;
    const dLon =
      RADIUS_KM /
      (KM_PER_DEGREE * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));
    // ponytail: a box past ±180° (the date line, or near a pole) would need a
    // second request; such places get "unavailable" rather than a partial
    // count. The app serves India, far from both.
    if (longitude - dLon < -180 || longitude + dLon > 180) {
      return { status: 'unavailable' };
    }
    const box = [
      Math.max(longitude - dLon, -180),
      Math.max(latitude - dLat, -90),
      Math.min(longitude + dLon, 180),
      Math.min(latitude + dLat, 90),
    ]
      .map((n) => n.toFixed(4))
      .join(',');
    // Two UTC days cover the last 24 hours.
    const all = await Promise.all(
      FIRMS_SOURCES.map((source) =>
        detections(
          new URL(
            `${BASE_URL}/${encodeURIComponent(mapKey)}/${source}/${box}/2`,
          ),
        ),
      ),
    );
    if (all.some((list) => list === null)) return { status: 'unavailable' };

    const place = { latitude, longitude };
    const since = now.getTime() - WINDOW_HOURS * HOUR_MS;
    const near = all
      .flat()
      .filter((d): d is Detection => d !== null)
      .filter((d) => d.at >= since && d.at <= now.getTime() + HOUR_MS)
      .map((d) => ({ ...d, km: distanceKm(place, d) }))
      .filter((d) => d.km <= RADIUS_KM);
    const summary: FireSummary = {
      status: 'available',
      dataKind: 'satellite_detection',
      count: near.length,
      nearestKm: near.length
        ? Math.round(Math.min(...near.map((d) => d.km)) * 10) / 10
        : null,
      latestAt: near.length
        ? new Date(Math.max(...near.map((d) => d.at))).toISOString()
        : null,
      radiusKm: RADIUS_KM,
      windowHours: WINDOW_HOURS,
      retrievedAt: now.toISOString(),
      provider: 'NASA FIRMS',
      sourceUrl: FIRMS_SOURCE_URL,
      limitations: FIRE_LIMITATIONS,
    };
    cache.set(key, summary, now.getTime());
    return summary;
  };
}
