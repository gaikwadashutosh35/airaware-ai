import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGoogleReverseGeocoder } from './reverseGeocode.ts';

// A trimmed Google Geocoding reply for 18.52, 73.86 with result_type=locality.
const PUNE = {
  status: 'OK',
  results: [
    {
      address_components: [
        {
          long_name: 'Pune',
          short_name: 'Pune',
          types: ['locality', 'political'],
        },
        {
          long_name: 'Maharashtra',
          short_name: 'MH',
          types: ['administrative_area_level_1', 'political'],
        },
      ],
      formatted_address: 'Pune, Maharashtra, India',
    },
  ],
};

let fetchSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const reply = (json: unknown, status = 200) =>
  fetchSpy.mockResolvedValue(Response.json(json, { status }));

describe('createGoogleReverseGeocoder', () => {
  it("asks Google's fixed host for the locality at the rounded point", async () => {
    reply(PUNE);
    await createGoogleReverseGeocoder('test-key')(18.52, 73.86);
    const url = new URL(String(fetchSpy.mock.calls[0]![0]));
    expect(url.origin + url.pathname).toBe(
      'https://maps.googleapis.com/maps/api/geocode/json',
    );
    expect(url.searchParams.get('latlng')).toBe('18.52,73.86');
    expect(url.searchParams.get('result_type')).toBe('locality');
    expect(url.searchParams.get('language')).toBe('en');
    expect(url.searchParams.get('key')).toBe('test-key');
  });

  it('returns the locality name', async () => {
    reply(PUNE);
    expect(await createGoogleReverseGeocoder('k')(18.52, 73.86)).toBe('Pune');
  });

  it('returns null when Google finds no locality', async () => {
    reply({ status: 'ZERO_RESULTS', results: [] });
    expect(await createGoogleReverseGeocoder('k')(0, 0)).toBeNull();
  });

  it('returns null, never throws, when the key is refused or Google fails', async () => {
    reply({ status: 'REQUEST_DENIED', results: [], error_message: 'bad key' });
    expect(await createGoogleReverseGeocoder('k')(18.52, 73.86)).toBeNull();
    reply({ error: true }, 500);
    expect(await createGoogleReverseGeocoder('k')(18.52, 73.86)).toBeNull();
    fetchSpy.mockRejectedValue(new Error('offline'));
    expect(await createGoogleReverseGeocoder('k')(18.52, 73.86)).toBeNull();
  });

  it('never logs the key', async () => {
    const log = vi.spyOn(console, 'error');
    reply({ status: 'REQUEST_DENIED', results: [] });
    await createGoogleReverseGeocoder('secret-key-123')(18.52, 73.86);
    reply({ error: true }, 500);
    await createGoogleReverseGeocoder('secret-key-123')(18.52, 73.86);
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret-key-123');
  });

  it('returns null for an implausibly long name', async () => {
    reply({
      status: 'OK',
      results: [
        {
          address_components: [
            { long_name: 'x'.repeat(81), types: ['locality'] },
          ],
        },
      ],
    });
    expect(await createGoogleReverseGeocoder('k')(1, 1)).toBeNull();
  });
});
