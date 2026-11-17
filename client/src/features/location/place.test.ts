import { describe, expect, it } from 'vitest';
import { placeFromPosition, placeFromResult } from './place.ts';

describe('place', () => {
  it('rounds a device position to about 1 km', () => {
    expect(placeFromPosition(18.519571, 73.855347)).toEqual({
      label: 'Near you (approximate)',
      latitude: 18.52,
      longitude: 73.86,
    });
  });

  it('labels a search result with its state when known', () => {
    const result = {
      id: 1259229,
      name: 'Pune',
      admin1: 'Maharashtra',
      country: 'India',
      latitude: 18.51957,
      longitude: 73.85535,
      timezone: 'Asia/Kolkata',
    };

    expect(placeFromResult(result)).toEqual({
      label: 'Pune, Maharashtra',
      latitude: 18.51957,
      longitude: 73.85535,
    });
    expect(placeFromResult({ ...result, admin1: undefined }).label).toBe(
      'Pune',
    );
  });
});
